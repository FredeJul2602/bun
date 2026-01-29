// ============================================
// Shared TypeScript Types
// Following Interface Segregation Principle
// ============================================

// Chat Message Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  skillExecution?: SkillExecution;
}

export interface SkillExecution {
  skillName: string;
  input: Record<string, unknown>;
  output: unknown;
  executedAt: Date;
}

// Chat Request/Response Types
export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: ChatMessage;
  error?: string;
}

// MCP Skill Types
export interface MCPSkill {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface SkillExecutionRequest {
  skillName: string;
  input: Record<string, unknown>;
}

export interface SkillExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

// Skill Request Form Types
export interface SkillRequestFormData {
  skillName: string;
  description: string;
  exampleInputs: string;
  exampleOutputs: string;
  useCase: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requesterName: string;
  requesterEmail: string;
}

// Conversation State
export interface Conversation {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Request Status for Polling
export interface PendingRequest {
  id: string;
  status: ChatResponse['status'];
  conversationId: string;
  userMessage: string;
  response?: ChatMessage;
  error?: string;
  createdAt: Date;
}

// Service Interfaces (Dependency Inversion Principle)
export interface IChatService {
  processMessage(conversationId: string, message: string): Promise<string>;
  getRequestStatus(requestId: string): PendingRequest | undefined;
}

export interface IMCPManager {
  initialize(): Promise<void>;
  listSkills(): Promise<MCPSkill[]>;
  executeSkill(name: string, input: Record<string, unknown>): Promise<SkillExecutionResult>;
  shutdown(): Promise<void>;
}

export interface IEmailService {
  sendSkillRequest(data: SkillRequestFormData): Promise<boolean>;
}
