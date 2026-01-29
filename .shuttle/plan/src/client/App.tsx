// ============================================
// Main App Component
// ============================================

import React from 'react';
import { ChatContainer } from './components';

export function App(): React.ReactElement {
  return (
    <React.StrictMode>
      <ChatContainer />
    </React.StrictMode>
  );
}
