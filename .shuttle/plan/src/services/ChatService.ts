// ============================================
// Chat Service - OpenAI Integration with MCP Tools
// Follows Single Responsibility & Dependency Injection
// Supports PostgreSQL persistence via Drizzle ORM
// ============================================

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { eq, lt } from 'drizzle-orm';
import { db, isDatabaseAvailable, conversations, messages, pendingRequests } from '../db';
import { captureError } from '../server/sentry';
import type { 
  IChatService, 
  IMCPManager, 
  PendingRequest, 
  ChatMessage,
  MCPSkill 
} from '../types';

// Callback interface for real-time updates (WebSocket)
export interface ChatServiceCallbacks {
  onMessageComplete?: (requestId: string, message: ChatMessage) => void;
  onMessageError?: (requestId: string, error: string) => void;
}

export class ChatService implements IChatService {
  private openai: OpenAI;
  private mcpManager: IMCPManager;
  private callbacks: ChatServiceCallbacks;
  
  // Fallback in-memory storage when database is unavailable
  private inMemoryPendingRequests: Map<string, PendingRequest> = new Map();
  private inMemoryConversations: Map<string, ChatCompletionMessageParam[]> = new Map();

  constructor(mcpManager: IMCPManager, callbacks: ChatServiceCallbacks = {}) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({ apiKey });
    this.mcpManager = mcpManager;
    this.callbacks = callbacks;
    console.log('[Chat] ChatService initialized');
    
    if (isDatabaseAvailable()) {
      console.log('[Chat] Using PostgreSQL for persistence');
    } else {
      console.log('[Chat] Using in-memory storage (no DATABASE_URL)');
    }
  }

  async processMessage(conversationId: string, message: string): Promise<string> {
    const requestId = this.generateRequestId();
    
    // Create pending request
    const pendingRequest: PendingRequest = {
      id: requestId,
      status: 'pending',
      conversationId,
      userMessage: message,
      createdAt: new Date(),
    };

    // Store pending request
    if (db) {
      try {
        // Ensure conversation exists
        await this.ensureConversationExists(conversationId);
        
        await db.insert(pendingRequests).values({
          id: requestId,
          status: 'pending',
          conversationId,
          userMessage: message,
        });
      } catch (error) {
        captureError(error instanceof Error ? error : new Error(String(error)), { context: 'db_insert_pending_request' });
        // Fall back to in-memory
        this.inMemoryPendingRequests.set(requestId, pendingRequest);
      }
    } else {
      this.inMemoryPendingRequests.set(requestId, pendingRequest);
    }

    // Process asynchronously
    this.processAsync(requestId, conversationId, message);

    return requestId;
  }

  private async ensureConversationExists(conversationId: string): Promise<void> {
    if (!db) return;

    try {
      const existing = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
      });

      if (!existing) {
        await db.insert(conversations).values({
          id: conversationId,
        });
      }
    } catch (error) {
      // If it's a UUID format error, the conversationId might be in old format
      // Try creating with a new UUID
      if (String(error).includes('invalid input syntax for type uuid')) {
        console.log('[Chat] Legacy conversationId format, creating new UUID');
      }
      // For other errors, throw
      throw error;
    }
  }

  private async processAsync(
    requestId: string, 
    conversationId: string, 
    message: string
  ): Promise<void> {
    try {
      // Update status to processing
      await this.updateRequestStatus(requestId, 'processing');

      // Get or create conversation history
      const history = await this.getConversationHistory(conversationId);

      // Add user message
      history.push({ role: 'user', content: message });

      // Save user message to database
      if (db) {
        try {
          await db.insert(messages).values({
            conversationId,
            role: 'user',
            content: message,
          });
        } catch (error) {
          captureError(error instanceof Error ? error : new Error(String(error)), { context: 'db_insert_user_message' });
        }
      }

      // Get available MCP skills as tools
      const tools = await this.getMCPToolsForOpenAI();

      // Call OpenAI
      let response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: history,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
      });

      let assistantMessage = response.choices[0]?.message;
      if (!assistantMessage) {
        throw new Error('No response from OpenAI');
      }

      // Handle tool calls (MCP skill executions)
      let skillExecution = null;
      while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Add assistant message with tool calls
        history.push(assistantMessage);

        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.type !== 'function') continue;
          
          const skillName = toolCall.function.name;
          const skillInput = JSON.parse(toolCall.function.arguments);

          console.log(`[Chat] Executing MCP skill: ${skillName}`);
          const result = await this.mcpManager.executeSkill(skillName, skillInput);

          // Track skill execution for the response
          skillExecution = {
            skillName,
            input: skillInput,
            output: result.success ? result.output : { error: result.error },
            executedAt: new Date().toISOString(),
          };

          // Add tool result to history
          history.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result.success ? result.output : { error: result.error }),
          });
        }

        // Get next response
        response = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: history,
          tools,
          tool_choice: 'auto',
        });

        const nextMessage = response.choices[0]?.message;
        if (!nextMessage) {
          throw new Error('No response from OpenAI');
        }
        assistantMessage = nextMessage;
      }

      // Add final assistant message to history
      history.push(assistantMessage);

      // Create response message
      const chatMessage: ChatMessage = {
        id: this.generateRequestId(),
        role: 'assistant',
        content: assistantMessage.content || '',
        timestamp: new Date(),
        skillExecution: skillExecution ? {
          skillName: skillExecution.skillName,
          input: skillExecution.input,
          output: skillExecution.output,
          executedAt: new Date(skillExecution.executedAt),
        } : undefined,
      };

      // Save assistant message to database
      let responseMessageId: string | undefined;
      if (db) {
        try {
          const [inserted] = await db.insert(messages).values({
            conversationId,
            role: 'assistant',
            content: chatMessage.content,
            skillExecution: skillExecution,
          }).returning({ id: messages.id });
          responseMessageId = inserted?.id;

          // Update conversation timestamp
          await db.update(conversations)
            .set({ updatedAt: new Date() })
            .where(eq(conversations.id, conversationId));
        } catch (error) {
          captureError(error instanceof Error ? error : new Error(String(error)), { context: 'db_insert_assistant_message' });
        }
      }

      // Update in-memory history
      this.inMemoryConversations.set(conversationId, history);

      // Mark request as completed
      await this.completeRequest(requestId, chatMessage, responseMessageId);

      // Notify via callback (for WebSocket)
      if (this.callbacks.onMessageComplete) {
        this.callbacks.onMessageComplete(requestId, chatMessage);
      }

    } catch (error) {
      console.error('[Chat] Error processing message:', error);
      captureError(error instanceof Error ? error : new Error(String(error)), { 
        context: 'chat_process_async',
        requestId,
        conversationId,
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.failRequest(requestId, errorMessage);

      // Notify via callback (for WebSocket)
      if (this.callbacks.onMessageError) {
        this.callbacks.onMessageError(requestId, errorMessage);
      }
    }
  }

  private async getConversationHistory(conversationId: string): Promise<ChatCompletionMessageParam[]> {
    // Try to get from database first
    if (db) {
      try {
        const dbMessages = await db.query.messages.findMany({
          where: eq(messages.conversationId, conversationId),
          orderBy: (messages, { asc }) => [asc(messages.timestamp)],
        });

        if (dbMessages.length > 0) {
          const history: ChatCompletionMessageParam[] = [this.getSystemMessage()];
          for (const msg of dbMessages) {
            history.push({
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content,
            });
          }
          return history;
        }
      } catch (error) {
        captureError(error instanceof Error ? error : new Error(String(error)), { context: 'db_get_conversation_history' });
      }
    }

    // Fall back to in-memory
    let history = this.inMemoryConversations.get(conversationId);
    if (!history) {
      history = [this.getSystemMessage()];
      this.inMemoryConversations.set(conversationId, history);
    }
    return history;
  }

  private async updateRequestStatus(requestId: string, status: PendingRequest['status']): Promise<void> {
    if (db) {
      try {
        await db.update(pendingRequests)
          .set({ status })
          .where(eq(pendingRequests.id, requestId));
      } catch (error) {
        captureError(error instanceof Error ? error : new Error(String(error)), { context: 'db_update_request_status' });
      }
    }

    // Also update in-memory
    const request = this.inMemoryPendingRequests.get(requestId);
    if (request) {
      request.status = status;
    }
  }

  private async completeRequest(requestId: string, response: ChatMessage, responseMessageId?: string): Promise<void> {
    if (db) {
      try {
        await db.update(pendingRequests)
          .set({ 
            status: 'completed',
            responseId: responseMessageId,
          })
          .where(eq(pendingRequests.id, requestId));
      } catch (error) {
        captureError(error instanceof Error ? error : new Error(String(error)), { context: 'db_complete_request' });
      }
    }

    // Also update in-memory
    const request = this.inMemoryPendingRequests.get(requestId);
    if (request) {
      request.status = 'completed';
      request.response = response;
    }
  }

  private async failRequest(requestId: string, error: string): Promise<void> {
    if (db) {
      try {
        await db.update(pendingRequests)
          .set({ 
            status: 'error',
            error,
          })
          .where(eq(pendingRequests.id, requestId));
      } catch (err) {
        captureError(err instanceof Error ? err : new Error(String(err)), { context: 'db_fail_request' });
      }
    }

    // Also update in-memory
    const request = this.inMemoryPendingRequests.get(requestId);
    if (request) {
      request.status = 'error';
      request.error = error;
    }
  }

  getRequestStatus(requestId: string): PendingRequest | undefined {
    // First check in-memory (always has latest state)
    const inMemory = this.inMemoryPendingRequests.get(requestId);
    if (inMemory) {
      return inMemory;
    }

    // For database requests, we need to query synchronously is not possible
    // So we return undefined and let the polling retry
    // The WebSocket path doesn't use this method
    return undefined;
  }

  // Async version for when we can await
  async getRequestStatusAsync(requestId: string): Promise<PendingRequest | undefined> {
    // First check in-memory
    const inMemory = this.inMemoryPendingRequests.get(requestId);
    if (inMemory) {
      return inMemory;
    }

    // Check database
    if (db) {
      try {
        const dbRequest = await db.query.pendingRequests.findFirst({
          where: eq(pendingRequests.id, requestId),
          with: {
            response: true,
          },
        });

        if (dbRequest) {
          const result: PendingRequest = {
            id: dbRequest.id,
            status: dbRequest.status as PendingRequest['status'],
            conversationId: dbRequest.conversationId,
            userMessage: dbRequest.userMessage,
            createdAt: dbRequest.createdAt,
            error: dbRequest.error || undefined,
          };

          // If completed, add response message
          if (dbRequest.response) {
            const skillExec = dbRequest.response.skillExecution;
            result.response = {
              id: dbRequest.response.id,
              role: 'assistant',
              content: dbRequest.response.content,
              timestamp: dbRequest.response.timestamp,
              skillExecution: skillExec ? {
                skillName: skillExec.skillName,
                input: skillExec.input,
                output: skillExec.output,
                executedAt: new Date(skillExec.executedAt),
              } : undefined,
            };
          }

          // Cache in memory for subsequent sync access
          this.inMemoryPendingRequests.set(requestId, result);
          return result;
        }
      } catch (error) {
        captureError(error instanceof Error ? error : new Error(String(error)), { context: 'db_get_request_status' });
      }
    }

    return undefined;
  }

  private async getMCPToolsForOpenAI(): Promise<ChatCompletionTool[]> {
    const skills = await this.mcpManager.listSkills();
    
    return skills.map((skill: MCPSkill) => ({
      type: 'function' as const,
      function: {
        name: skill.name,
        description: skill.description,
        parameters: skill.inputSchema,
      },
    }));
  }

  private getSystemMessage(): ChatCompletionMessageParam {
    return {
      role: 'system',
      content: `You are a helpful AI assistant with access to Claude Skills through MCP (Model Context Protocol). 

You can use various tools/skills to help users accomplish tasks. When a user asks for something that could benefit from a skill, use the appropriate tool.

Be concise, helpful, and professional. If you use a skill, explain what you did and present the results clearly.

Available capabilities depend on the MCP server configuration. If no tools are available, let the user know they can request new skills using the "Request Skill" feature.`,
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Cleanup old requests (call periodically)
  async cleanupOldRequests(maxAgeMs: number = 30 * 60 * 1000): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxAgeMs);

    // Cleanup database
    if (db) {
      try {
        await db.delete(pendingRequests)
          .where(lt(pendingRequests.createdAt, cutoffTime));
        console.log('[Chat] Cleaned up old pending requests from database');
      } catch (error) {
        captureError(error instanceof Error ? error : new Error(String(error)), { context: 'db_cleanup_requests' });
      }
    }

    // Cleanup in-memory
    const now = Date.now();
    for (const [id, request] of this.inMemoryPendingRequests) {
      if (now - request.createdAt.getTime() > maxAgeMs) {
        this.inMemoryPendingRequests.delete(id);
      }
    }
  }
}
