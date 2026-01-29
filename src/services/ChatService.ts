// ============================================
// Chat Service - OpenAI Integration with MCP Tools
// Follows Single Responsibility & Dependency Injection
// ============================================

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import type { 
  IChatService, 
  IMCPManager, 
  PendingRequest, 
  ChatMessage,
  MCPSkill 
} from '../types';

export class ChatService implements IChatService {
  private openai: OpenAI;
  private mcpManager: IMCPManager;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private conversations: Map<string, ChatCompletionMessageParam[]> = new Map();

  constructor(mcpManager: IMCPManager) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({ apiKey });
    this.mcpManager = mcpManager;
    console.log('[Chat] ChatService initialized');
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
    this.pendingRequests.set(requestId, pendingRequest);

    // Process asynchronously
    this.processAsync(requestId, conversationId, message);

    return requestId;
  }

  private async processAsync(
    requestId: string, 
    conversationId: string, 
    message: string
  ): Promise<void> {
    const request = this.pendingRequests.get(requestId);
    if (!request) return;

    try {
      request.status = 'processing';

      // Get or create conversation history
      let history = this.conversations.get(conversationId);
      if (!history) {
        history = [this.getSystemMessage()];
        this.conversations.set(conversationId, history);
      }

      // Add user message
      history.push({ role: 'user', content: message });

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
      };

      request.status = 'completed';
      request.response = chatMessage;

    } catch (error) {
      console.error('[Chat] Error processing message:', error);
      request.status = 'error';
      request.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  getRequestStatus(requestId: string): PendingRequest | undefined {
    return this.pendingRequests.get(requestId);
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
  cleanupOldRequests(maxAgeMs: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, request] of this.pendingRequests) {
      if (now - request.createdAt.getTime() > maxAgeMs) {
        this.pendingRequests.delete(id);
      }
    }
  }
}
