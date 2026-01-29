# Claude Skills Assistant

A web application where coworkers can interact with an OpenAI-powered LLM that has access to Anthropic Claude Skills via MCP (Model Context Protocol).

## Features

- 💬 **Chat Interface** - Clean, modern chat UI to interact with the AI assistant
- 🔧 **MCP Integration** - Connect to Claude Skills through the Model Context Protocol
- 📨 **Skill Requests** - Request new skills via a form that sends email notifications
- ⚡ **Real-time WebSocket** - Instant message delivery via WebSocket with polling fallback
- 🗄️ **PostgreSQL Persistence** - Conversations stored in PostgreSQL via Drizzle ORM
- 🛡️ **Rate Limiting** - Protection against abuse (100 req/min global, stricter on chat)
- 📊 **Error Monitoring** - Sentry integration for production error tracking
- 🎨 **Dark Theme** - Beautiful dark theme optimized for productivity

## Architecture

```
┌─────────────────┐   WebSocket / HTTP    ┌─────────────────┐
│  React Client   │ ◄────────────────────► │  Elysia Server  │
│  - Chat UI      │                          │  - /api/chat    │
│  - Request Form │                          │  - /ws/chat     │
└─────────────────┘                          └────────┬────────┘
                                                      │
              ┌─────────────┬───────────────┼───────────────┬─────────────┐
              │             │               │               │             │
              ▼             ▼               ▼               ▼             ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │  OpenAI API │ │  MCP Server │ │  PostgreSQL │ │ Resend API  │ │   Sentry    │
     │  (Chat LLM) │ │  (Skills)   │ │  (Storage)  │ │  (Email)    │ │  (Errors)   │
     └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React 19
- **Backend**: Elysia (Bun web framework)
- **Database**: PostgreSQL with Drizzle ORM
- **LLM**: OpenAI GPT-4o
- **Skills**: Anthropic MCP (Model Context Protocol)
- **Email**: Resend
- **Monitoring**: Sentry

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3.6 or later
- OpenAI API key
- (Optional) Resend API key for email notifications
- (Optional) MCP server for Claude Skills

### Installation

```bash
# Install dependencies
bun install

# Copy environment file and add your keys
cp .env.example .env
```

### Configuration

Edit `.env` with your credentials:

```env
# Required
OPENAI_API_KEY=sk-your-openai-api-key

# Optional - PostgreSQL database (falls back to in-memory if not set)
DATABASE_URL=postgres://user:password@localhost:5432/claude_skills

# Optional - for error monitoring
SENTRY_DSN=https://your-sentry-dsn

# Optional - for email notifications
RESEND_API_KEY=re_your-resend-api-key
EMAIL_FROM=skills@yourdomain.com

# Optional - for MCP skills
MCP_SERVER_PATH=/path/to/mcp-server
MCP_SERVER_ARGS=--optional-args
```

### Database Setup

```bash
# Push schema to database (development)
bun run db:push

# Or generate and apply migrations (production)
bun run db:generate
bun run db:migrate

# Open Drizzle Studio to browse data
bun run db:studio
```

### Development

```bash
# Build the client
bun run build

# Start the development server (with hot reload)
bun run dev
```

Open http://localhost:3000 in your browser.

### Production

```bash
# Build for production
bun run build

# Start production server
bun run start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/skills` | List available MCP skills |
| POST | `/api/chat` | Send a chat message (returns request ID) |
| GET | `/api/messages/:id` | Poll for message status |
| POST | `/api/skill-request` | Submit a skill request (sends email) |
| WS | `/ws/chat` | WebSocket for real-time chat |

## Project Structure

```
src/
├── client/                 # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   │   ├── useChat.ts      # Chat state with WebSocket
│   │   ├── useWebSocket.ts # WebSocket connection
│   │   └── usePolling.ts   # Polling fallback
│   ├── api/                # API client
│   ├── App.tsx             # Main app component
│   ├── index.tsx           # Entry point
│   └── styles.css          # Global styles
├── server/                 # Elysia backend
│   ├── app.ts              # Elysia app with routes & WebSocket
│   ├── index.ts            # Server entry with startup
│   └── sentry.ts           # Sentry error monitoring
├── services/               # Business logic
│   ├── ChatService.ts      # OpenAI chat with persistence
│   └── EmailService.ts     # Resend email sending
├── db/                     # Database layer
│   ├── schema.ts           # Drizzle table definitions
│   └── index.ts            # Database connection
├── mcp/                    # MCP integration
│   └── MCPManager.ts       # MCP client manager
└── types/                  # TypeScript types
    └── index.ts            # Shared interfaces
drizzle.config.ts           # Drizzle Kit configuration
```

## Design Patterns Used

- **Singleton**: MCPManager for single MCP connection
- **Dependency Injection**: Services receive dependencies via constructor
- **Adapter**: MCPManager adapts MCP protocol to internal interfaces
- **Observer**: WebSocket and polling hooks for state updates
- **Strategy**: Form validation and submission handling
- **Repository**: ChatService abstracts database operations
- **Graceful Degradation**: WebSocket with polling fallback, DB with in-memory fallback

## License

MIT
