# 🌌 Nexora — AI Agentic Search & Action Platform

> One platform. Every AI. Search → Action.

Nexora is a **Next-Era Agentic Engine** where users discover specialized AI agents, chat with 10+ models side-by-side, and get **Execution Blocks** (Export to Sheets, Draft Email, Analyze Code) — not just search results. All powered by LangGraph agentic loops and a unified Canvas workspace.

## ✨ Key Features

- **Multi-Model Canvas:** Compare Claude 3.5 and GPT-4o side-by-side in a single workspace.
- **Verifiable Search:** Every claim is backed by citations with real-time web verification.
- **Task Orchestration:** Auto-routes complex queries to LangGraph "Researcher" or "Analyst" agents.
- **Local-First Caching:** Next.js 16 `"use cache"` ensures lightning-fast responses for repeated queries.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** (LTS)
- **npm**, **pnpm**, or **yarn**
- [Supabase](https://supabase.com) account (free tier)
- [OpenRouter](https://openrouter.ai) API key
- [Tavily](https://tavily.com) API key (search)
- [Firecrawl](https://firecrawl.dev) API key (optional, for clean markdown scraping)
- [Vercel](https://vercel.com) account (deployment)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/nexora.git
cd nexora

# Install dependencies
npm install
# or: pnpm install

# Copy environment variables
cp .env.example .env.local
# Fill in your keys (see ENV.md in this folder for details)

# Run database migrations
npx supabase db push

# Start development server (Turbopack)
npm run dev
```

Open **http://localhost:3000**

---

## 📁 Project Structure

| Area | Path | Description |
|------|------|-------------|
| App routes | `src/app/` | `(auth)`, `(dashboard)` (chat, search, workspace, discover), `api/agent`, `api/mcp`, `proxy.ts` |
| Components | `src/components/` | `ai/`, `canvas/`, `chat/`, `layout/` |
| Lib | `src/lib/` | `ai/`, `graph/`, `db/`, `utils/` |
| Agents | `src/agents/` | `researcher.ts`, `analyst.ts`, `coder.ts` |

See **Architecture.md** (in this folder) for full details.

---

## 🏗️ System Architecture

Data flow from request to response follows an **agentic loop**: traffic is controlled by `proxy.ts`, then routed to LangGraph workflows that call search/scrape and optional cache.

```mermaid
flowchart LR
  subgraph Client
    UI[Canvas / Chat UI]
  end

  subgraph Edge
    Proxy[proxy.ts\nRate limit & route]
  end

  subgraph API
    Chat[/api/chat]
    Agent[/api/agent]
  end

  subgraph LangGraph
    Router{Router}
    Researcher[Researcher\nTavily + fact-check]
    Analyst[Analyst\nData / CSV]
    Coder[Coder\nE2B Sandbox]
  end

  subgraph Data
    Cache["use cache"\nRAG persistence]
    Tavily[Tavily API]
    Firecrawl[Firecrawl]
    OpenRouter[OpenRouter]
  end

  UI --> Proxy
  Proxy --> Chat
  Proxy --> Agent
  Chat --> OpenRouter
  Agent --> Router
  Router --> Researcher
  Router --> Analyst
  Router --> Coder
  Researcher --> Tavily
  Researcher --> Firecrawl
  Researcher --> Cache
  Analyst --> Cache
  Researcher --> OpenRouter
  Analyst --> OpenRouter
  Coder --> OpenRouter
  OpenRouter --> UI
```

*Optional:* Replace or supplement with an architecture image (e.g. `docs/architecture.png`) for design reviews or non-Mermaid viewers.

---

## 📚 Documentation (this folder)

| Doc | Description |
|-----|-------------|
| **CHANGELOG.md** | **What we've done** — auth, landing, workspace, routes, fixes (clean summary) |
| **Planning.md** | Vision, P0–P3, security, monetization, competitors |
| **Architecture.md** | System overview, data flows, folder structure |
| **ENV.md** | Environment variables |
| **MILESTONES.md** | Build phases M1–M5 |
| **DEPENDENCIES.md** | npm packages and agent skills (skills.sh) |
| **DATABASE.md** | Schema (Supabase, RLS) |
| **API.md** | Endpoint documentation |
| **AGENTS.md** | Agent registry (Researcher, Analyst, Coder) |
| **UI_COMPONENTS.md** | Component library |
| **COMPETITORS.md** | Competitor research & start simple → advance |
| **docs.html** | Browse all docs in one page (open in browser) |

---

## 🛠️ Tech Stack (2026)

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16.2+, React 19, TypeScript 5.5+ |
| **Build** | Turbopack, React Compiler |
| **Styling** | Tailwind CSS, Glassmorphism (dark default) |
| **Database** | Supabase (PostgreSQL, pgvector) |
| **AI models** | OpenRouter (10+ models: GPT-4o, Claude, o1, etc.) |
| **AI streaming** | Vercel AI SDK v4 (`streamText`, `streamObject`) |
| **Agent orchestration** | LangGraph.js (stateful workflows) |
| **Search / scrape** | Tavily API, Firecrawl (markdown) |
| **Caching** | Next.js 16 `"use cache"` (AI result persistence) |
| **Traffic / rate limit** | `proxy.ts` (Next 16 edge pattern) |
| **Deployment** | Vercel |

---

## 📄 License

MIT — Built with Nexora
