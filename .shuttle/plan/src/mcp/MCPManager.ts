// ============================================
// MCP Manager - Singleton Pattern with Auto-start
// Manages local MCP server connection lifecycle
// ============================================

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { IMCPManager, MCPSkill, SkillExecutionResult } from '../types';

export class MCPManager implements IMCPManager {
  private static instance: MCPManager | null = null;
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isInitialized = false;
  private skills: MCPSkill[] = [];

  private constructor() {}

  // Singleton access
  static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[MCP] Already initialized');
      return;
    }

    const mcpServerPath = process.env.MCP_SERVER_PATH;
    const mcpServerArgs = process.env.MCP_SERVER_ARGS?.split(' ') || [];

    if (!mcpServerPath) {
      console.warn('[MCP] MCP_SERVER_PATH not set - running without MCP skills');
      this.isInitialized = true;
      return;
    }

    try {
      console.log(`[MCP] Starting MCP server: ${mcpServerPath}`);
      
      // Create transport that auto-starts the MCP server process
      this.transport = new StdioClientTransport({
        command: mcpServerPath,
        args: mcpServerArgs,
      });

      // Create MCP client
      this.client = new Client(
        {
          name: 'claude-skills-webapp',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // Connect to the MCP server
      await this.client.connect(this.transport);
      console.log('[MCP] Connected to MCP server');

      // Fetch available skills/tools
      await this.refreshSkills();
      
      this.isInitialized = true;
      console.log(`[MCP] Initialized with ${this.skills.length} skills`);
    } catch (error) {
      console.error('[MCP] Failed to initialize:', error);
      // Don't throw - allow app to run without MCP
      this.isInitialized = true;
    }
  }

  private async refreshSkills(): Promise<void> {
    if (!this.client) {
      this.skills = [];
      return;
    }

    try {
      const toolsResult = await this.client.listTools();
      this.skills = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema as Record<string, unknown>,
      }));
    } catch (error) {
      console.error('[MCP] Failed to list tools:', error);
      this.skills = [];
    }
  }

  async listSkills(): Promise<MCPSkill[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.skills;
  }

  async executeSkill(name: string, input: Record<string, unknown>): Promise<SkillExecutionResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'MCP client not connected',
      };
    }

    try {
      console.log(`[MCP] Executing skill: ${name}`);
      const result = await this.client.callTool({
        name,
        arguments: input,
      });

      return {
        success: true,
        output: result.content,
      };
    } catch (error) {
      console.error(`[MCP] Skill execution failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async shutdown(): Promise<void> {
    console.log('[MCP] Shutting down...');
    
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        console.error('[MCP] Error closing client:', error);
      }
      this.client = null;
    }

    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        console.error('[MCP] Error closing transport:', error);
      }
      this.transport = null;
    }

    this.isInitialized = false;
    console.log('[MCP] Shutdown complete');
  }
}

// Export singleton instance
export const mcpManager = MCPManager.getInstance();
