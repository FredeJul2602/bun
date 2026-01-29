// ============================================
// Server Entry Point with Startup Orchestration
// Handles MCP auto-start and graceful shutdown
// ============================================

import { app } from './app';
import { mcpManager } from '../mcp/MCPManager';

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

  // Step 2: Start HTTP server
  console.log('🌐 Starting HTTP server...');
  app.listen(PORT);
  
  console.log(`
✅ Server running!

   Local:   http://localhost:${PORT}
   API:     http://localhost:${PORT}/api

📋 Endpoints:
   GET  /api/health        - Health check
   GET  /api/skills        - List available MCP skills
   POST /api/chat          - Send chat message
   GET  /api/messages/:id  - Poll message status
   POST /api/skill-request - Submit skill request

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
  }

  console.log('👋 Goodbye!');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  shutdown();
});

// Start the application
startup().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
