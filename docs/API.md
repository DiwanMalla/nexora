# 🔌 NEXORA — API Endpoints

All API routes sit behind `proxy.ts` for rate limiting and routing. Auth is required unless noted.

---

## Chat

### `POST /api/chat`

Direct multi-model chat (streaming).

**Request body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | `Array<{ role, content }>` | Yes | Chat history (user/assistant/system) |
| `model` | string | Yes | OpenRouter model id (e.g. `openai/gpt-4o`, `anthropic/claude-3.5-sonnet`) |
| `conversationId` | string (uuid) | No | If provided, append to existing conversation |

**Response:** Streaming (e.g. `text/event-stream` or Vercel AI SDK data stream). Use `streamText().toDataStreamResponse()`.

**Validation:** Zod schema for `messages` and `model`; reject oversized payloads.

---

## Agent (LangGraph)

### `POST /api/agent`

Agentic search / task execution. Router picks Researcher, Analyst, or Coder.

**Request body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | User query or search prompt |
| `agentId` | string (uuid) | No | Prefer this agent; otherwise router decides |
| `model` | string | No | Override default model for the agent |
| `options` | object | No | e.g. `{ includeCitations: true }` |

**Response:** Streaming. Includes thinking states, citations, and suggested Execution Blocks (e.g. Export, Draft email).

**Validation:** Zod; sanitize `query`; rate limit per user via `proxy.ts`.

---

## Agents (discovery & search)

### `GET /api/agents`

List agents (featured or all). Optional filters.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `featured` | boolean | If true, only featured agents |
| `category` | string | Filter by category |
| `limit` | number | Max results (default 20) |

**Response:** `{ agents: Agent[] }`. No auth required for public listing.

---

### `GET /api/agents/search?q=...`

Semantic agent search (pgvector).

**Query params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query (embedding similarity) |
| `limit` | number | No | Default 10 |

**Response:** `{ agents: Agent[] }` ranked by similarity.

---

### `GET /api/agents/[id]`

Get one agent by id or slug.

**Response:** Single `Agent` (config, system prompt, default model). Used by chat/search to load agent context.

---

## MCP (Model Context Protocol)

### `POST /api/mcp/...`

MCP tool endpoints for agent tools. Structure TBD per MCP spec; auth and rate limiting still via `proxy.ts`.

---

## Errors and rate limits

- **401** — Unauthorized (missing or invalid auth).
- **429** — Too many requests (rate limit from `proxy.ts`).
- **400** — Bad request (validation failed).
- **500** — Server error; do not expose internal details or stack traces.

All API keys (OpenRouter, Tavily, Firecrawl) are server-side only; never returned in responses.
