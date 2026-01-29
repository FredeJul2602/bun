# Claude Skills Assistant

A web application where coworkers can interact with an OpenAI-powered LLM that has access to Anthropic Claude Skills via MCP (Model Context Protocol).

## Features

- 💬 **Chat Interface** - Clean, modern chat UI to interact with the AI assistant
- 🔧 **MCP Integration** - Connect to Claude Skills through the Model Context Protocol
- 📨 **Skill Requests** - Request new skills via a form that sends email notifications
- ⚡ **Real-time Updates** - 3-second polling for chat responses
- 🎨 **Dark Theme** - Beautiful dark theme optimized for productivity

## Architecture

```
┌─────────────────┐     HTTP (3s poll)     ┌─────────────────┐
│  React Client   │ ◄──────────────────────► │  Elysia Server  │
│  - Chat UI      │                          │  - /api/chat    │
│  - Request Form │                          │  - /api/skills  │
└─────────────────┘                          └────────┬────────┘
                                                      │
                              ┌───────────────────────┼───────────────────────┐
                              │                       │                       │
                              ▼                       ▼                       ▼
                     ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                     │  OpenAI API     │    │  MCP Server     │    │  Resend API     │
                     │  (Chat LLM)     │    │  (Claude Skills)│    │  (Email)        │
                     └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React 19
- **Backend**: Elysia (Bun web framework)
- **LLM**: OpenAI GPT-4o
- **Skills**: Anthropic MCP (Model Context Protocol)
- **Email**: Resend

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

# Optional - for email notifications
RESEND_API_KEY=re_your-resend-api-key
EMAIL_FROM=skills@yourdomain.com

# Optional - for MCP skills
MCP_SERVER_PATH=/path/to/mcp-server
MCP_SERVER_ARGS=--optional-args
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

## Project Structure

```
src/
├── client/                 # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   ├── api/                # API client
│   ├── App.tsx             # Main app component
│   ├── index.tsx           # Entry point
│   └── styles.css          # Global styles
├── server/                 # Elysia backend
│   ├── app.ts              # Elysia app with routes
│   └── index.ts            # Server entry with startup
├── services/               # Business logic
│   ├── ChatService.ts      # OpenAI chat handling
│   └── EmailService.ts     # Resend email sending
├── mcp/                    # MCP integration
│   └── MCPManager.ts       # MCP client manager
└── types/                  # TypeScript types
    └── index.ts            # Shared interfaces
```

## Design Patterns Used

- **Singleton**: MCPManager for single MCP connection
- **Dependency Injection**: Services receive dependencies via constructor
- **Adapter**: MCPManager adapts MCP protocol to internal interfaces
- **Observer**: Polling hooks for state updates
- **Strategy**: Form validation and submission handling

## License

MIT
