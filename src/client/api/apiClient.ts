// ============================================
// API Client - Abstraction for server communication
// Single Responsibility: HTTP communication
// ============================================

import type { 
  ChatRequest, 
  ChatResponse, 
  MCPSkill, 
  SkillRequestFormData 
} from '../../types';

const API_BASE = '/api';

class ApiClient {
  private async fetch<T>(
    endpoint: string, 
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // Chat endpoints
  async sendMessage(request: ChatRequest): Promise<{
    success: boolean;
    requestId?: string;
    conversationId?: string;
    error?: string;
  }> {
    return this.fetch('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async pollMessageStatus(requestId: string): Promise<{
    success: boolean;
    status: ChatResponse['status'] | 'not_found';
    message?: ChatResponse['message'];
    error?: string;
  }> {
    return this.fetch(`/messages/${requestId}`);
  }

  // Skills endpoints
  async getSkills(): Promise<{
    success: boolean;
    skills: MCPSkill[];
    error?: string;
  }> {
    return this.fetch('/skills');
  }

  // Skill request endpoint
  async submitSkillRequest(data: SkillRequestFormData): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.fetch('/skill-request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Health check
  async checkHealth(): Promise<{
    status: string;
    timestamp: string;
  }> {
    return this.fetch('/health');
  }
}

export const apiClient = new ApiClient();
