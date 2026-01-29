// ============================================
// MessageList Component - Display chat messages
// Follows Single Responsibility Principle
// ============================================

import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types';
import { TTCIcon, TTCIconLight } from './TTCIcon';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps): React.ReactElement {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="message-list-empty">
        <div className="empty-state">
          <TTCIcon size={64} className="empty-icon-svg" />
          <h3>Start a conversation</h3>
          <p>Ask a question or request help with a task. The AI assistant can use Claude Skills to help you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps): React.ReactElement {
  const isUser = message.role === 'user';
  
  return (
    <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-avatar">
        {isUser ? <TTCIconLight size={24} /> : <TTCIcon size={24} />}
      </div>
      <div className="message-content">
        <div className="message-text">
          {formatMessageContent(message.content)}
        </div>
        {message.skillExecution && (
          <div className="skill-execution">
            <div className="skill-header">
              <TTCIcon size={16} />
              <span className="skill-name">{message.skillExecution.skillName}</span>
            </div>
            <pre className="skill-output">
              {JSON.stringify(message.skillExecution.output, null, 2)}
            </pre>
          </div>
        )}
        <div className="message-time">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator(): React.ReactElement {
  return (
    <div className="message-bubble assistant typing">
      <div className="message-avatar">
        <TTCIcon size={24} />
      </div>
      <div className="message-content">
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}

function formatMessageContent(content: string): React.ReactNode {
  // Simple markdown-like formatting
  const parts = content.split(/(`[^`]+`)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
