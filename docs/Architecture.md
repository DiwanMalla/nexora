# 🏗️ NEXORA — Technical Architecture

Technical reference for the Nexora stack. Aligns with [.cursorrule](../.cursorrule), [Readme](Readme.md), and [Planning](Planning.md) (including [Privacy & Security](Planning.md#-privacy-security--cybersecurity-top-priority)).

---

## System Overview

```
[User Browser]
       ↓
[Vercel Edge Network]
       ↓
[Next.js 16 App Router]  ← React 19, Turbopack, React Compiler
       ↓
[proxy.ts]  ← Rate limiting, request routing (no AI logic in legacy middleware)
       ↓
[API Routes / Server Actions]
       ↓
┌──────────────────────────────────────────────────────────────────┐
│  LangGraph (orchestration)  →  Researcher / Analyst / Coder      │
│  Tavily (search) · Firecrawl (scrape) · "use cache" (RAG)        │
└──────────────────────────────────────────────────────────────────┘
       ↓
[OpenRouter]  →  GPT-4o / Claude / o1 / Gemini / DeepSeek / ...
[Supabase]    →  PostgreSQL + pgvector + Auth + Storage (RLS)
[Stripe]      →  Payments + Webhooks
```

**No Upstash Redis in core path:** rate limiting and AI-side routing live in `proxy.ts`; RAG/AI result persistence uses Next.js 16 `"use cache"`.

---

## High-Level Data Flow (Agentic Loop)

Request path is controlled at the edge, then routed to either direct chat or LangGraph agent workflows.

```mermaid
flowchart LR
  subgraph Client
    UI[Canvas / Chat UI]
  end
  subgraph Edge
    Proxy[proxy.ts]
  end
  subgraph API
    Chat[/api/chat]
    Agent[/api/agent]
  end
  subgraph LangGraph
    Router{Router}
    R[Researcher]
    A[Analyst]
    C[Coder]
  end
  subgraph Data
    Cache["use cache"]
    Tavily[Tavily]
    Firecrawl[Firecrawl]
    OR[OpenRouter]
  end
  UI --> Proxy --> Chat
  Proxy --> Agent --> Router
  Router --> R --> Tavily
  R --> Firecrawl
  R --> Cache
  Router --> A --> Cache
  Router --> C
  R --> OR
  A --> OR
  C --> OR
  OR --> UI
```

See [Readme — System Architecture](Readme.md#-system-architecture) for the full diagram.

---

## Key Architectural Decisions

### 1. Why Next.js 16 App Router?

- Full-stack in one repo; Server Components reduce client JS.
- **Turbopack** for fast dev; **React Compiler** for optimized runtime.
- API routes handle AI streaming; deploy to Vercel in seconds.
- **`"use cache"`** for fine-grained, stable caching of AI/RAG results (no `unstable_cache`).

### 2. Why `proxy.ts` instead of legacy `middleware.ts` for AI?

- Next 16 pattern: edge traffic controller for rate limiting and routing.
- Keeps AI logic (and heavy work) out of middleware; middleware stays thin and fast.
- Single place to enforce limits and route to `/api/chat` vs `/api/agent`.

### 3. Why LangGraph?

- **Stateful agent workflows:** multi-step reasoning, fact-checking, self-correction.
- Clear separation: Researcher (Tavily + Firecrawl + citations), Analyst (data/CSV), Coder (E2B).
- Router node can send complex queries to the right agent; simple chat can bypass agents and hit OpenRouter directly.

### 4. Why OpenRouter?

- One API key for 100+ models.
- Automatic fallback if a model is down; cost tracking per model.
- No need to manage multiple provider keys; works with Vercel AI SDK v4.

### 5. Why Tavily + Firecrawl?

- **Tavily:** search API for agentic, citation-backed answers.
- **Firecrawl:** clean markdown scraping for reliable source content.
- Together they power verifiable search and Execution Blocks (Search-to-Action).

### 6. Why `"use cache"` instead of Redis for AI results?

- Next.js 16 stable caching; no extra infra for RAG/result persistence.
- Fine-grained cache keys per query/context; reduces redundant Tavily/OpenRouter calls.
- Rate limiting and abuse protection remain in `proxy.ts` (edge), not in a cache layer.

### 7. Why Supabase?

- Built-in Auth; PostgreSQL + **pgvector** for semantic agent search.
- **Row Level Security (RLS)** for data protection and privacy-by-design.
- Real-time subscriptions for future features; storage for user uploads.

### 8. Why Vercel AI SDK v4?

- `streamText` / `streamObject`; no manual SSE setup.
- `useChat` and related hooks for state; works with OpenRouter and LangGraph.
- Supports all OpenRouter models and streaming UX (e.g. citations, thinking states).

---

## Data Flows

### Chat (direct)

1. User types in Chat UI (client).
2. `useChat` sends POST to `/api/chat`.
3. `proxy.ts` enforces rate limit and forwards.
4. API route validates auth, builds messages, calls OpenRouter via `streamText`.
5. Response streams back token-by-token.
6. On completion: persist message in Supabase; deduct credits.

### Agentic search (LangGraph)

1. User submits query (e.g. from search or chat).
2. Request goes through `proxy.ts` → `/api/agent`.
3. LangGraph router decides: Researcher / Analyst / Coder (or direct model).
4. **Researcher:** Tavily search → optional Firecrawl for content → `"use cache"` for repeated queries → LLM with citations → Execution Blocks (e.g. Export, Draft email).
5. **Analyst:** Uses cached or uploaded data; CSV/analysis path.
6. **Coder:** E2B sandbox execution when needed.
7. Streamed response (with thinking states and citations) back to client; result and sources persisted as needed.

### Agent discovery

1. User visits `/discover`.
2. Server component fetches featured agents from Supabase.
3. Search (with debounce) hits `/api/agents/search`.
4. pgvector semantic similarity returns ranked agents.
5. User selects agent → e.g. `/chat?agent=id` or search with that agent; chat/search loads agent config (model, system prompt) and runs flow above.

---

## Folder Structure (Reference)

| Area | Path | Purpose |
|------|------|---------|
| App | `src/app/(auth)/` | Auth flows (sign-in, sign-up) |
| App | `src/app/(dashboard)/` | Chat, search, workspace, discover |
| App | `src/app/api/agent/` | LangGraph execution endpoints |
| App | `src/app/api/mcp/` | Model Context Protocol tools |
| App | `src/app/proxy.ts` | Edge rate limiting and routing |
| Components | `src/components/ai/` | Streaming text, citations, source cards |
| Components | `src/components/canvas/` | Artifact editor and preview |
| Components | `src/components/chat/` | Model selectors, prompt inputs |
| Components | `src/components/layout/` | Command-K, sidebar, glassmorphism |
| Lib | `src/lib/ai/` | OpenRouter and Vercel AI SDK providers |
| Lib | `src/lib/graph/` | LangGraph nodes and state |
| Lib | `src/lib/db/` | Supabase and pgvector clients |
| Lib | `src/lib/utils/` | Token counters, formatting |
| Agents | `src/agents/researcher.ts` | Deep search and fact-checking |
| Agents | `src/agents/analyst.ts` | Data and CSV processing |
| Agents | `src/agents/coder.ts` | E2B sandbox execution |

---

## Security Model

Aligned with [Planning — Privacy, Security & Cybersecurity](Planning.md#-privacy-security--cybersecurity-top-priority).

- **Edge:** `proxy.ts` for rate limiting and routing; no AI logic in legacy middleware.
- **Auth:** All protected routes use Supabase (or chosen) Auth; secure sessions and logout.
- **Data:** Row Level Security on all Supabase tables; users only see their own data.
- **Secrets:** API keys (OpenRouter, Tavily, Firecrawl, Stripe) **server-side only**; never in client or logs.
- **Validation:** Input sanitization and validation (e.g. Zod) on all API payloads; guard against injection.
- **Logging:** No PII or full prompts in logs; IDs, timestamps, and error codes only.
- **Transport:** HTTPS only; secure cookie flags (`Secure`, `HttpOnly`, `SameSite`).
- **Dependencies:** Regular `npm audit`; address high/critical CVEs before release.

---

## Performance Targets

- **First Contentful Paint:** &lt; 1.5 s  
- **Time to First Token (streaming):** &lt; 800 ms  
- **Agent search (pgvector):** &lt; 300 ms  
- **Lighthouse score:** &gt; 90  

Where possible, use `"use cache"` for RAG and repeated agent results to avoid redundant API calls and improve perceived performance.
