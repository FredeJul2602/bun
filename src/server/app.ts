// ============================================
// Elysia HTTP Server - API Endpoints
// Clean architecture with dependency injection
// ============================================

import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { mcpManager } from '../mcp/MCPManager';
import { ChatService } from '../services/ChatService';
import { emailService } from '../services/EmailService';
import type { ChatRequest, SkillRequestFormData } from '../types';

// Initialize services with dependency injection
const chatService = new ChatService(mcpManager);

// Create Elysia app
const app = new Elysia()
  .use(cors())
  .use(staticPlugin({
    assets: 'dist/client',
    prefix: '/',
  }))
  
  // Health check endpoint
  .get('/api/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  // List available MCP skills
  .get('/api/skills', async () => {
    try {
      const skills = await mcpManager.listSkills();
      return { success: true, skills };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to list skills',
        skills: [] 
      };
    }
  })

  // Submit chat message (returns request ID for polling)
  .post('/api/chat', async ({ body }) => {
    try {
      const { message, conversationId } = body as ChatRequest;
      
      if (!message?.trim()) {
        return { success: false, error: 'Message is required' };
      }

      const convId = conversationId || `conv_${Date.now()}`;
      const requestId = await chatService.processMessage(convId, message);

      return {
        success: true,
        requestId,
        conversationId: convId,
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process message' 
      };
    }
  }, {
    body: t.Object({
      message: t.String(),
      conversationId: t.Optional(t.String()),
    }),
  })

  // Poll for message status (3 second intervals on client)
  .get('/api/messages/:requestId', ({ params }) => {
    const { requestId } = params;
    const request = chatService.getRequestStatus(requestId);

    if (!request) {
      return { 
        success: false, 
        error: 'Request not found',
        status: 'not_found' as const,
      };
    }

    return {
      success: true,
      status: request.status,
      message: request.response,
      error: request.error,
    };
  }, {
    params: t.Object({
      requestId: t.String(),
    }),
  })

  // Submit skill request (sends email)
  .post('/api/skill-request', async ({ body }) => {
    try {
      const data = body as SkillRequestFormData;

      // Validate required fields
      if (!data.skillName?.trim() || !data.description?.trim()) {
        return { success: false, error: 'Skill name and description are required' };
      }

      if (!data.requesterName?.trim() || !data.requesterEmail?.trim()) {
        return { success: false, error: 'Requester name and email are required' };
      }

      const sent = await emailService.sendSkillRequest(data);

      return {
        success: sent,
        message: sent 
          ? 'Skill request submitted successfully!' 
          : 'Failed to send request',
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to submit request' 
      };
    }
  }, {
    body: t.Object({
      skillName: t.String(),
      description: t.String(),
      exampleInputs: t.String(),
      exampleOutputs: t.String(),
      useCase: t.String(),
      priority: t.Union([
        t.Literal('low'),
        t.Literal('medium'),
        t.Literal('high'),
        t.Literal('critical'),
      ]),
      requesterName: t.String(),
      requesterEmail: t.String(),
    }),
  })

  // Serve index.html for client-side routing
  .get('/', () => Bun.file('dist/client/index.html'))
  .get('/*', async ({ path }) => {
    // Serve static files or fall back to index.html for SPA routing
    const file = Bun.file(`dist/client${path}`);
    const exists = await file.exists();
    return exists ? file : Bun.file('dist/client/index.html');
  });

export { app };
