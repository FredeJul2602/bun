// ============================================
// ChatContainer Component - Main chat layout
// Composes MessageList, MessageInput, SkillsList
// ============================================

import React, { useState, useEffect } from 'react';
import type { MCPSkill } from '../../types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { SkillsList } from './SkillsList';
import { SkillRequestForm } from './SkillRequestForm';
import { useChat } from '../hooks/useChat';
import { TTCIcon } from './TTCIcon';

const WELCOME_STORAGE_KEY = 'skills-assistant-welcome-seen';

export function ChatContainer(): React.ReactElement {
  const { messages, isLoading, error, sendMessage, clearMessages, clearError } = useChat();
  const [showSkillRequest, setShowSkillRequest] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);

  // Check localStorage for welcome banner
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(WELCOME_STORAGE_KEY);
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    setShowWelcome(false);
  };

  // Handle sending message and clearing input
  const handleSend = (message: string) => {
    sendMessage(message);
    setInputValue('');
  };

  // Handle suggestion chip click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  // Handle "Try this skill" click - generate prompt template
  const handleTrySkill = (skill: MCPSkill) => {
    const schema = skill.inputSchema as {
      properties?: Record<string, { description?: string }>;
    };
    const params = Object.entries(schema.properties || {})
      .map(([key, val]) => `${key}: [${val.description || key}]`)
      .join(', ');
    
    const prompt = params 
      ? `Use the ${skill.name} skill with ${params}`
      : `Use the ${skill.name} skill`;
    
    setInputValue(prompt);
  };

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
          {/* Welcome Banner */}
          {showWelcome && messages.length === 0 && (
            <div className="welcome-banner">
              <div className="welcome-content">
                <span className="welcome-icon">👋</span>
                <div className="welcome-text">
                  <strong>Welcome to Skills Assistant!</strong>
                  <p>I can help you with tasks using AI-powered skills. Try asking a question or explore the available skills in the sidebar.</p>
                </div>
              </div>
              <button className="welcome-dismiss" onClick={dismissWelcome}>✕</button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="error-banner">
              <span>⚠️ {error}</span>
              <button onClick={clearError}>Dismiss</button>
            </div>
          )}

          {/* Messages */}
          <MessageList 
            messages={messages} 
            isLoading={isLoading} 
            onSuggestionClick={handleSuggestionClick}
          />

          {/* Input */}
          <MessageInput 
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend} 
            disabled={isLoading}
            placeholder={isLoading ? 'Waiting for response...' : 'Ask me anything...'}
          />
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <aside className="chat-sidebar">
            <SkillsList 
              onRequestSkill={() => setShowSkillRequest(true)} 
              onTrySkill={handleTrySkill}
            />
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
