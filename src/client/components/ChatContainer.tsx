// ============================================
// ChatContainer Component - Main chat layout
// Composes MessageList, MessageInput, SkillsList
// ============================================

import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { SkillsList } from './SkillsList';
import { SkillRequestForm } from './SkillRequestForm';
import { useChat } from '../hooks/useChat';
import { TTCIcon } from './TTCIcon';

export function ChatContainer(): React.ReactElement {
  const { messages, isLoading, error, sendMessage, clearMessages, clearError } = useChat();
  const [showSkillRequest, setShowSkillRequest] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <div className="header-left">
          <div className="header-logo">
            <TTCIcon size={32} />
            <div className="header-text">
              <h1>Skills Assistant</h1>
              <span className="subtitle">the tech collective</span>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="button small secondary"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? 'Hide' : 'Show'} Skills
          </button>
          <button 
            className="button small secondary"
            onClick={clearMessages}
            disabled={messages.length === 0}
          >
            Clear Chat
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="chat-main">
        {/* Chat Area */}
        <div className="chat-area">
          {/* Error Banner */}
          {error && (
            <div className="error-banner">
              <span>⚠️ {error}</span>
              <button onClick={clearError}>Dismiss</button>
            </div>
          )}

          {/* Messages */}
          <MessageList messages={messages} isLoading={isLoading} />

          {/* Input */}
          <MessageInput 
            onSend={sendMessage} 
            disabled={isLoading}
            placeholder={isLoading ? 'Waiting for response...' : 'Ask me anything...'}
          />
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <aside className="chat-sidebar">
            <SkillsList onRequestSkill={() => setShowSkillRequest(true)} />
          </aside>
        )}
      </div>

      {/* Skill Request Modal */}
      {showSkillRequest && (
        <SkillRequestForm 
          onClose={() => setShowSkillRequest(false)}
          onSuccess={() => console.log('Skill request submitted!')}
        />
      )}
    </div>
  );
}
