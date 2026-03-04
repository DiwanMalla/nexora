# 📦 Nexora — Installed Dependencies (Skills)

All packages required for the stack are installed. Add new ones with `npm install <pkg>`.

---

## Core (already in package.json)

| Package | Purpose |
|---------|---------|
| **next** | App framework (App Router, Turbopack) |
| **react**, **react-dom** | UI (React 19) |
| **ai** | Vercel AI SDK v4 — `streamText`, `streamObject`, `useChat` |
| **@openrouter/ai-sdk-provider** | OpenRouter models for AI SDK |
| **@supabase/supabase-js** | Supabase client (DB, Auth, Storage) |
| **@supabase/ssr** | Supabase in Next.js (cookies, server) |
| **zod** | Schema validation (API, AI output) |
| **lucide-react** | Icons |
| **clsx**, **tailwind-merge** | `cn()` for class names |

---

## Agents & search

| Package | Purpose |
|---------|---------|
| **@langchain/langgraph** | Stateful agent workflows (Researcher, Analyst, Coder) |
| **@langchain/core** | LangChain primitives used by LangGraph |
| **@tavily/core** | Tavily search API (Researcher agent) |
| **@mendable/firecrawl-js** | Firecrawl — clean markdown scraping (citations) |
| **@e2b/code-interpreter** | E2B sandbox for Coder agent (P1) |

---

## Payments & UI

| Package | Purpose |
|---------|---------|
| **stripe** | Stripe server SDK (Pro / Teams) |
| **@stripe/stripe-js** | Stripe client (checkout) |
| **react-markdown** | Render AI markdown (no raw HTML) |
| **remark-gfm** | GitHub Flavored Markdown (tables, etc.) |

---

## Dev

| Package | Purpose |
|---------|---------|
| **typescript** | Type checking |
| **tailwindcss**, **postcss** | Styling |
| **eslint**, **eslint-config-next** | Linting |
| **@types/node**, **@types/react**, **@types/react-dom** | Types |

---

## Central config (in repo)

- **Model ids:** `src/lib/ai/models.ts` (never hardcode in agents).
- **OpenRouter:** `src/lib/ai/providers.ts` — `getOpenRouter()` for API routes.
- **Agents:** `src/agents/researcher.ts`, `analyst.ts`, `coder.ts` (stubs).
- **Graph:** `src/lib/graph/index.ts` (LangGraph router stub).

---

## Optional (install when needed)

- **framer-motion** — Premium animations (used by **frontend-design** skill). Add when building animated UI / glassmorphism transitions.
- **@supabase/auth-helpers-next** — If you want auth helpers on top of Supabase SSR.
- **nanoid** or **uuid** — For IDs if not using Supabase defaults.
- **date-fns** — Date formatting for UI.

To add one: `npm install <package-name>`.

---

## Agent skills (skills.sh)

[Nexora uses agent skills](https://skills.sh/) from the Skills directory so Cursor (and other agents) get procedural knowledge for React, Next.js, Supabase, and the AI SDK. Installed with `npx skills add <owner/repo>`.

### Installed for Cursor

| Skill | Source | Purpose |
|-------|--------|---------|
| **ai-sdk** | vercel/ai | AI SDK (generateText, streamText, useChat, tools, providers) |
| **next-best-practices** | vercel-labs/next-skills | Next.js file conventions, RSC, async APIs, metadata, route handlers |
| **next-cache-components** | vercel-labs/next-skills | Next.js 16 cache: `use cache`, cacheLife, cacheTag, PPR |
| **vercel-react-best-practices** | vercel-labs/agent-skills | React/Next.js performance (waterfalls, bundle, server/client) |
| **vercel-composition-patterns** | vercel-labs/agent-skills | Compound components, render props, React 19 patterns |
| **web-design-guidelines** | vercel-labs/agent-skills | UI review, accessibility, UX audit |
| **supabase-postgres-best-practices** | supabase/agent-skills | Postgres queries, schema, RLS, performance |
| **tailwind-design-system** | wshobson/agents | Tailwind v4 design systems, tokens, component libraries |
| **api-design-principles** | wshobson/agents | REST/GraphQL API design, specs, standards |
| **nextjs-app-router-patterns** | wshobson/agents | Next.js 14+ App Router, RSC, streaming, data fetching |
| **typescript-advanced-types** | wshobson/agents | Advanced TypeScript types and patterns |
| **nextjs-supabase-auth** | sickn33/antigravity-awesome-skills | Next.js + Supabase auth flows and patterns |
| **find-skills** | vercel-labs/skills | Discover and install more skills from skills.sh |
| **security-best-practices** | supercent-io/skills-template | Security best practices for apps |
| **frontend-design** | anthropics/skills | React 19, Tailwind v4, Framer Motion — layout & aesthetic consistency, “Clean & Modern” (glassmorphism) |
| **thesys-c1-genui** | thesysdev/skills | Thesys C1 Generative UI — streaming LLM → React (Thinking, Citations, Action Blocks / Execution Blocks) |

### Design & UX (why these three)

| Skill | Role for Nexora |
|-------|------------------|
| **frontend-design** (Anthropic) | Gold standard for layout and aesthetic consistency. React 19, Tailwind v4, Framer Motion for premium animations; “Clean & Modern” fits the glassmorphism look. |
| **web-design-guidelines** (Vercel) | Automated design critic: spacing, typography, accessibility. Keeps Glass components accessible and aligned with current UX standards. |
| **thesys-c1-genui** (Thesys) | Agentic UI: Thinking states, Source Citations, Action Blocks. Fits Execution Blocks (buttons/actions that appear after search). |

### Add more skills

```bash
npx skills add <owner/repo> -a cursor -y
npx skills add vercel-labs/agent-skills -a cursor -s <skill-name> -y   # pick one skill
npx skills find next                                                    # search
npx skills list                                                         # list installed
```

Skills live under `.agents/skills/`. Discover more at [skills.sh](https://skills.sh/).
