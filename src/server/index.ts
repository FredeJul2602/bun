// ============================================
// Server Entry Point with Startup Orchestration
// Handles MCP auto-start and graceful shutdown
// ============================================

// Initialize Sentry before anything else
import './sentry';
import { Sentry, captureError } from './sentry';

import { app } from './app';
import { mcpManager } from '../mcp/MCPManager';
import { closeDatabaseConnection, isDatabaseAvailable } from '../db';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function startup(): Promise<void> {
  console.log('🚀 Starting Claude Skills Web Application...\n');

  // Step 1: Initialize MCP Manager (auto-starts MCP server)
  console.log('📡 Initializing MCP connection...');
  try {
    await mcpManager.initialize();
    const skills = await mcpManager.listSkills();
    console.log(`✅ MCP initialized with ${skills.length} skill(s)\n`);
    
    if (skills.length > 0) {
      console.log('Available skills:');
      skills.forEach(skill => {
        console.log(`  • ${skill.name}: ${skill.description}`);
      });
      console.log('');
    }
  } catch (error) {
    console.warn('⚠️  MCP initialization failed - continuing without skills');
    console.warn(`   Error: ${error instanceof Error ? error.message : error}\n`);
  }

  // Step 2: Check database connection
  if (isDatabaseAvailable()) {
    console.log('🗄️  Database connection available');
  } else {
    console.warn('⚠️  DATABASE_URL not set - using in-memory storage');
  }

  // Step 3: Start HTTP server
  console.log('🌐 Starting HTTP server...');
  app.listen(PORT);
  
  console.log(`
✅ Server running!

   Local:   http://localhost:${PORT}
   API:     http://localhost:${PORT}/api
   WS:      ws://localhost:${PORT}/ws/chat

📋 Endpoints:
   GET  /api/health        - Health check
   GET  /api/skills        - List available MCP skills
   POST /api/chat          - Send chat message
   GET  /api/messages/:id  - Poll message status
   POST /api/skill-request - Submit skill request
   WS   /ws/chat           - Real-time chat

🎨 Open http://localhost:${PORT} in your browser
`);
}

async function shutdown(): Promise<void> {
  console.log('\n🛑 Shutting down gracefully...');
  
  try {
    await mcpManager.shutdown();
    console.log('✅ MCP connection closed');
  } catch (error) {
    console.error('Error during MCP shutdown:', error);
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'mcp_shutdown' });
  }

  try {
    await closeDatabaseConnection();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('Error during database shutdown:', error);
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'db_shutdown' });
  }

  // Flush Sentry events before exit
  await Sentry.close(2000);

  console.log('👋 Goodbye!');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  captureError(error, { context: 'uncaughtException' });
  shutdown();
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  captureError(reason instanceof Error ? reason : new Error(String(reason)), { context: 'unhandledRejection' });
  shutdown();
});

// Start the application
startup().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
