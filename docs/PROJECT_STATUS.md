# Nexora — Project Status Report

> **Generated:** 10 March 2026  
> **Branch:** `main`  
> **Version:** 0.1.0

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Configuration](#4-configuration)
5. [Authentication & Middleware](#5-authentication--middleware)
6. [Routing & Pages](#6-routing--pages)
7. [Core Architecture](#7-core-architecture)
8. [AI Providers & Models](#8-ai-providers--models)
9. [Agents System](#9-agents-system)
10. [Chat System](#10-chat-system)
11. [Components Inventory](#11-components-inventory)
12. [Hooks](#12-hooks)
13. [Library Utilities](#13-library-utilities)
14. [Type System](#14-type-system)
15. [Design System & Theming](#15-design-system--theming)
16. [API Endpoints](#16-api-endpoints)
17. [What's Implemented vs Stub/Placeholder](#17-whats-implemented-vs-stubplaceholder)
18. [Known Gaps & TODOs](#18-known-gaps--todos)
19. [Dependency Summary](#19-dependency-summary)

---

## 1. Executive Summary

**Nexora** is an AI Agentic Search & Action platform built with Next.js 16, React 19, and TypeScript. The tagline is _"One platform. Every AI. Search → Action."_

The project is in **early development (v0.1.0)**. The core chat infrastructure is functional with Groq as the primary LLM provider. A polished dark-themed UI with a landing page, workspace dashboard, multiple agent views, and multi-chat comparison mode are built out. However, many features (agents, drive, inbox, execution blocks, database persistence) remain stubs or placeholders.

**What works today:**

- Full authentication flow (Clerk)
- Landing page with hero, features, agents showcase, FAQ, CTA, footer
- Workspace dashboard with sidebar navigation
- Single-model chat via Groq API with Tavily web search tool
- Cost-aware retrieval policy: Tavily is primarily used for short, search-oriented prompts; large planning queries can be handled locally to reduce API spend
- Multi-model consensus mode (parallel model calls → synthesized answer)
- Multi-chat side-by-side column comparison view
- Model selection dropdown (provider-grouped)
- Account settings modal with theme, AI preferences, competing model config
- AI Providers reference page
- Dark/light theme support via CSS custom properties

**What is stubbed/placeholder:**

- Researcher, Analyst, Coder agents (typed but return empty results)
- LangGraph integration (empty `src/lib/graph/` directory)
- Firecrawl integration (dependency installed, not wired)
- E2B code sandbox (dependency installed, not wired)
- OpenRouter provider (configured, not used in chat route)
- Supabase database (dependencies installed, no schema or queries)
- Stripe payments (dependencies installed, no integration)
- Drive, Inbox, Blog pages (placeholder text)
- Features, Pricing, Privacy, Terms pages (minimal placeholder content)
- Chat history persistence (in-memory only, no database)
- Execution Blocks (shown in UI mockup on landing page, not functional)

---

## 2. Tech Stack

| Layer                | Technology                                          | Version          |
| -------------------- | --------------------------------------------------- | ---------------- |
| **Framework**        | Next.js (App Router, Turbopack)                     | ^16.1.6          |
| **UI**               | React                                               | ^19.2.4          |
| **Language**         | TypeScript (strict mode)                            | ^5.6.0           |
| **Styling**          | Tailwind CSS + CSS custom properties                | ^3.4.0           |
| **Auth**             | Clerk (`@clerk/nextjs`)                             | ^6.39.0          |
| **AI SDK**           | Vercel AI SDK (`ai`)                                | ^6.0.116         |
| **LLM Provider**     | Groq (`@ai-sdk/groq`)                               | ^3.0.29          |
| **Alt LLM Provider** | OpenRouter (`@openrouter/ai-sdk-provider`)          | ^2.2.3           |
| **Web Search**       | Tavily (`@tavily/core`)                             | ^0.7.2           |
| **Web Scraping**     | Firecrawl (`@mendable/firecrawl-js`)                | ^4.15.1          |
| **Agent Framework**  | LangGraph (`@langchain/langgraph`)                  | ^1.2.0           |
| **Code Sandbox**     | E2B (`@e2b/code-interpreter`)                       | ^2.3.3           |
| **Database**         | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) | ^2.98.0 / ^0.9.0 |
| **Payments**         | Stripe (`stripe`, `@stripe/stripe-js`)              | ^20.4.0 / ^8.9.0 |
| **Markdown**         | react-markdown + remark-gfm                         | ^10.1.0 / ^4.0.1 |
| **Animation**        | Framer Motion                                       | ^12.34.5         |
| **Icons**            | Lucide React                                        | ^0.577.0         |
| **Validation**       | Zod                                                 | ^4.3.6           |
| **Utilities**        | clsx, tailwind-merge                                | ^2.1.1 / ^3.5.0  |

---

## 3. Folder Structure

```
nexora/
├── docs/                          # Project documentation
│   ├── AGENTS.md
│   ├── API.md
│   ├── Architecture.md
│   ├── CHANGELOG.md
│   ├── COMPETITORS.md
│   ├── DATABASE.md
│   ├── DEPENDENCIES.md
│   ├── docs.html                  # Single-page doc viewer
│   ├── ENV.md
│   ├── MILESTONES.md
│   ├── Planning.md
│   ├── PROJECT_STATUS.md          # ← This file
│   ├── Readme.md
│   └── UI_COMPONENTS.md
│
├── public/
│   └── ai-provider logo/          # Provider logos (12 images)
│       ├── AI21.png
│       ├── anthropic.png
│       ├── cohere.png
│       ├── deepseek.jpg
│       ├── google.webp
│       ├── grok.webp
│       ├── meta ai.png
│       ├── minimax.png
│       ├── mistral.webp
│       ├── moonshot.png
│       ├── openai.png
│       └── qwen.png
│
├── src/
│   ├── middleware.ts               # Clerk auth middleware (public/protected route matcher)
│   │
│   ├── agents/                     # Agent business logic (all stubs)
│   │   ├── analyst.ts              # Stub: data/CSV analysis agent
│   │   ├── coder.ts                # Stub: code generation + E2B sandbox agent
│   │   └── researcher.ts           # Stub: deep search + citations agent
│   │
│   ├── app/                        # Next.js App Router pages
│   │   ├── globals.css             # Global styles, CSS variables, typography, theming
│   │   ├── layout.tsx              # Root layout: ClerkProvider, Google Fonts, body
│   │   ├── page.tsx                # Landing page (redirects logged-in users to /workspace)
│   │   │
│   │   ├── agents/                 # Agent chat interface
│   │   │   ├── layout.tsx          # WorkspaceProvider + DashboardLayout wrapper
│   │   │   └── page.tsx            # Routes to OmniAgent or GenericAgent based on ?type=
│   │   │
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts        # POST /api/chat — Main chat endpoint (single + consensus)
│   │   │   └── groq/
│   │   │       └── models/
│   │   │           └── route.ts    # GET /api/groq/models — Proxy to Groq models API
│   │   │
│   │   ├── blog/
│   │   │   └── page.tsx            # Placeholder blog page
│   │   │
│   │   ├── docs/
│   │   │   └── page.tsx            # Documentation index page
│   │   │
│   │   ├── drive/
│   │   │   ├── layout.tsx          # DashboardLayout wrapper
│   │   │   └── page.tsx            # Placeholder "AI Drive" page
│   │   │
│   │   ├── features/
│   │   │   └── page.tsx            # Placeholder features page
│   │   │
│   │   ├── inbox/
│   │   │   ├── layout.tsx          # DashboardLayout wrapper
│   │   │   └── page.tsx            # Placeholder "AI Inbox" page
│   │   │
│   │   ├── pricing/
│   │   │   └── page.tsx            # Placeholder pricing page
│   │   │
│   │   ├── privacy/
│   │   │   └── page.tsx            # Placeholder privacy policy page
│   │   │
│   │   ├── providers/
│   │   │   ├── layout.tsx          # WorkspaceProvider + DashboardLayout wrapper
│   │   │   └── page.tsx            # AI Providers & Models reference page (fully built)
│   │   │
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/
│   │   │       └── page.tsx        # Clerk SignIn with custom dark theme styling
│   │   │
│   │   ├── sign-up/
│   │   │   └── [[...sign-up]]/
│   │   │       └── page.tsx        # Clerk SignUp with custom dark theme styling
│   │   │
│   │   ├── terms/
│   │   │   └── page.tsx            # Placeholder terms of service page
│   │   │
│   │   └── workspace/
│   │       ├── layout.tsx          # WorkspaceProvider + DashboardLayout wrapper
│   │       └── page.tsx            # Main workspace landing — CommandBar → redirects to OmniAgent
│   │
│   ├── components/
│   │   ├── agents/
│   │   │   ├── GenericAgent.tsx     # Handles AI Chat, Researcher, Coder, Analyst views
│   │   │   ├── MultiChatColumns.tsx # Side-by-side multi-model comparison view
│   │   │   └── OmniAgent.tsx        # The "best answer" agent with consensus support
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatMessages.tsx     # Conversation thread renderer (markdown, actions, loading)
│   │   │   ├── CommandBar.tsx       # Main chat input bar (textarea, toolbar, model picker)
│   │   │   ├── MessageActions.tsx   # Copy/Like/Dislike/Download action button row
│   │   │   ├── ModelDropdown.tsx    # Provider-grouped model selection dropdown
│   │   │   ├── MultiChatMode.tsx    # Alternative 3-column multi-chat layout (workspace page)
│   │   │   └── ResearchAnimation.tsx # Step-by-step loading animation during AI response
│   │   │
│   │   ├── dashboard/
│   │   │   ├── AccountSettingsModal.tsx  # Full settings modal (general, AI, memory, subscription, profile)
│   │   │   ├── DashboardLayout.tsx       # Main sidebar + content layout for authenticated pages
│   │   │   ├── ModelPreferenceModal.tsx  # Quick model selection modal
│   │   │   ├── QuickActions.tsx          # Quick action tiles (search, chat, developer, analyst, etc.)
│   │   │   ├── RecentActivity.tsx        # Recent conversations list (placeholder data)
│   │   │   └── WorkspaceProvider.tsx     # React context: selectedModel, selectedAgent, isMultiChat
│   │   │
│   │   ├── home/
│   │   │   ├── AgentsShowcase.tsx   # Agent grid by category (12 agents, 4 categories)
│   │   │   ├── CTASection.tsx       # Call-to-action section
│   │   │   ├── FAQSection.tsx       # 6-item FAQ accordion
│   │   │   ├── FeaturesSection.tsx  # Agent flow visualization + model comparison + feature grid
│   │   │   ├── Footer.tsx           # Site footer with links, social icons, branding
│   │   │   └── HeroSection.tsx      # Landing hero with product preview card
│   │   │
│   │   ├── layout/
│   │   │   ├── AuthLayout.tsx       # Auth page wrapper (aurora glow background, logo, footer)
│   │   │   ├── GlassPanel.tsx       # Reusable glass-morphism panel component
│   │   │   └── Nav.tsx              # Public site navigation bar (desktop + mobile)
│   │   │
│   │   └── ui/
│   │       ├── AgentTiles.tsx       # Agent tile grid with icons and descriptions
│   │       └── Greeting.tsx         # Brand greeting component (icon + "Nexora" + status)
│   │
│   ├── hooks/
│   │   ├── use-chat-agent.ts        # Core chat state management hook (messages, input, submit, URL sync)
│   │   ├── use-click-outside.ts     # Click-outside detection for dropdowns/modals
│   │   └── use-keyboard-shortcut.ts # Keyboard shortcut listener (e.g. Escape)
│   │
│   ├── lib/
│   │   ├── ai-providers.ts         # Full AI provider/model registry (12 providers, ~30 models)
│   │   ├── api.ts                   # Typed API client (sendChatMessage, sendMultiModelMessages)
│   │   ├── constants.ts             # Available chat models + available agents definitions
│   │   ├── settings.ts              # localStorage-based user settings (competing model IDs)
│   │   ├── styles.ts                # Shared Tailwind class constants (focus ring, icon buttons)
│   │   ├── tavily.ts                # Tavily web search wrapper (server-side)
│   │   ├── utils.ts                 # cn() utility + randomUUID()
│   │   └── ai/
│   │       └── providers.ts         # OpenRouter provider setup (lazy, server-side)
│   │   └── graph/                   # Empty — reserved for LangGraph workflows
│   │
│   └── types/
│       └── index.ts                 # Core domain types (ChatMessage, AIModel, AIAgent, etc.)
│
├── next.config.ts                   # Next.js config (turbopack enabled)
├── tailwind.config.ts               # Tailwind config (custom colors, fonts, animations, keyframes)
├── tsconfig.json                    # TypeScript config (strict, bundler resolution, @/* path alias)
├── postcss.config.mjs               # PostCSS config (tailwindcss plugin)
├── package.json                     # Dependencies + scripts
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE                          # MIT
└── README.md                        # Project overview + quick start
```

---

## 4. Configuration

### next.config.ts

- Turbopack enabled (fast dev builds).
- No additional config (no rewrites, redirects, image domains, etc.).

### tsconfig.json

- Target: ES2017, Module: ESNext, Module Resolution: bundler.
- Strict mode enabled.
- Path alias: `@/*` → `./src/*`.

### tailwind.config.ts

- Content scans `src/pages/`, `src/components/`, `src/app/`.
- Custom colors map to CSS custom properties (violet, cyan, bg, text, border, surface, accent).
- Custom fonts: `sans` (DM Sans), `display` (Syne), `mono` (JetBrains Mono).
- Custom animations: fade-in-up, fade-in, float, pulse-glow, slide-up.

### globals.css

- Full dark theme (`:root`) and light theme (`:root[data-theme="light"]`).
- Comprehensive typography scale (13px – 52px), leading, tracking variables.
- `.typography-prose` class for AI chat message rendering with hierarchical heading styles.
- Custom scrollbar styling, selection colors, focus ring removal.

---

## 5. Authentication & Middleware

**Provider:** Clerk (`@clerk/nextjs`)

**Middleware** (`src/middleware.ts`):

- Uses `clerkMiddleware` with a `createRouteMatcher` pattern.
- **Public routes** (no auth required):
  - `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/docs(.*)`, `/features`, `/pricing`, `/blog`, `/privacy`, `/terms`, `/api/webhooks(.*)`
- All other routes call `auth.protect()` (requires authentication).
- Matcher excludes static assets (\_next, images, fonts, etc.).

**Auth pages:**

- `/sign-in/[[...sign-in]]` — Clerk `<SignIn>` with custom dark theme appearance.
- `/sign-up/[[...sign-up]]` — Clerk `<SignUp>` with matching dark theme appearance.
- Both use `AuthLayout` wrapper (aurora glow background, logo, footer links).

**User info** is accessed via `useUser()` from Clerk in the dashboard sidebar.

---

## 6. Routing & Pages

### Public Pages (No auth)

| Route       | Component                         | Status                                                                                              |
| ----------- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `/`         | `page.tsx` (landing)              | **Fully built** — Hero, Features, Agents, FAQ, CTA, Footer. Redirects to `/workspace` if logged in. |
| `/features` | `features/page.tsx`               | **Placeholder** — Single paragraph + back link                                                      |
| `/pricing`  | `pricing/page.tsx`                | **Placeholder** — Free/Pro/Teams summary text                                                       |
| `/docs`     | `docs/page.tsx`                   | **Built** — Links to all doc files in repo                                                          |
| `/blog`     | `blog/page.tsx`                   | **Placeholder** — "Coming soon"                                                                     |
| `/privacy`  | `privacy/page.tsx`                | **Placeholder** — Needs full policy                                                                 |
| `/terms`    | `terms/page.tsx`                  | **Placeholder** — Needs full terms                                                                  |
| `/sign-in`  | `sign-in/[[...sign-in]]/page.tsx` | **Fully built** — Clerk SignIn with custom styling                                                  |
| `/sign-up`  | `sign-up/[[...sign-up]]/page.tsx` | **Fully built** — Clerk SignUp with custom styling                                                  |

### Protected Pages (Auth required)

| Route                     | Layout                                  | Component            | Status                                                       |
| ------------------------- | --------------------------------------- | -------------------- | ------------------------------------------------------------ |
| `/workspace`              | `WorkspaceProvider` + `DashboardLayout` | `workspace/page.tsx` | **Fully built** — CommandBar, redirects queries to OmniAgent |
| `/agents?type=omni`       | `WorkspaceProvider` + `DashboardLayout` | `OmniAgent`          | **Fully built** — Single chat with consensus                 |
| `/agents?type=aichat`     | `WorkspaceProvider` + `DashboardLayout` | `GenericAgent`       | **Fully built** — Single + multi-chat modes                  |
| `/agents?type=researcher` | `WorkspaceProvider` + `DashboardLayout` | `GenericAgent`       | **UI built**, agent logic is stub                            |
| `/agents?type=coder`      | `WorkspaceProvider` + `DashboardLayout` | `GenericAgent`       | **UI built**, agent logic is stub                            |
| `/agents?type=analyst`    | `WorkspaceProvider` + `DashboardLayout` | `GenericAgent`       | **UI built**, agent logic is stub                            |
| `/providers`              | `WorkspaceProvider` + `DashboardLayout` | `providers/page.tsx` | **Fully built** — Provider/model reference cards             |
| `/inbox`                  | `DashboardLayout`                       | `inbox/page.tsx`     | **Placeholder** — "Coming soon"                              |
| `/drive`                  | `DashboardLayout`                       | `drive/page.tsx`     | **Placeholder** — "Coming soon"                              |

---

## 7. Core Architecture

### Application Flow

```
User (Browser)
  │
  ├─ Public pages → Nav + landing/static content
  │
  └─ Authenticated pages → DashboardLayout
       │
       ├─ Sidebar (DashboardLayout)
       │   ├─ Navigation links
       │   ├─ Active agent display
       │   ├─ Model Selection button → ModelPreferenceModal
       │   ├─ Agent Switcher dropdown
       │   ├─ History dropdown (placeholder data)
       │   ├─ Compute Nodes status card
       │   └─ User profile (Clerk UserButton)
       │
       └─ Main content area
            ├─ WorkspacePage → CommandBar → redirect to /agents?type=omni
            ├─ OmniAgent → useChatAgent hook → /api/chat
            ├─ GenericAgent → useChatAgent hook → /api/chat
            │   └─ MultiChatColumns → sendMultiModelMessages → /api/chat (×N)
            └─ Other pages (providers, inbox, drive)
```

### Data Flow for Chat

```
CommandBar (user types + submits)
  → useChatAgent hook
    → getCompetingModelIds() (from localStorage)
    → sendChatMessage() (lib/api.ts)
      → POST /api/chat (route.ts)
        ├─ Single model mode:
        │   → Groq SDK generateText() with system prompt + Tavily tool
        │   → Returns { text, model }
        │
        └─ Consensus mode (2+ enabledModels):
            → Promise.all(models.map(generateText))
            → Synthesis call with all responses
            → Returns { text, model: "Model1, Model2, ..." }
  → Update messages state
  → ChatMessages renders with ReactMarkdown
```

### State Management

- **WorkspaceProvider** (React Context):
  - `selectedModel` — Currently active model ID
  - `selectedAgent` — Currently active agent type
  - `isMultiChat` — Toggle for multi-chat column mode
- **useChatAgent** (Custom Hook):
  - `messages` — Conversation history (in-memory, not persisted)
  - `input` — Current input value
  - `isLoading` — Loading state
  - URL sync for chat ID and agent type via search params
  - Auto-submit from `?q=` parameter
  - Auto-scroll on new messages
- **localStorage**:
  - `nexora.account.settings.v2` — Theme, AI prefs, competing model IDs, profile info

---

## 8. AI Providers & Models

### Provider Registry (`src/lib/ai-providers.ts`)

12 providers defined with model entries:

| Provider          | Models                                                                                                       | Has API IDs (usable)  |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | --------------------- |
| OpenAI            | GPT-5.4, GPT-5.3 Codex, GPT-4.1 Mini                                                                         | No (display only)     |
| Anthropic         | Claude 4.6 Opus, Claude 4.6 Sonnet                                                                           | No (display only)     |
| Google            | Gemini 3.1 Pro, Gemini 3.1 Flash-Lite                                                                        | No (display only)     |
| Meta              | Llama 4 Scout                                                                                                | No (display only)     |
| DeepSeek          | DeepSeek-V3.2                                                                                                | No (display only)     |
| Alibaba           | Qwen 3.5                                                                                                     | No (display only)     |
| xAI               | Grok-4.20                                                                                                    | No (display only)     |
| Mistral AI        | Mistral Large 3                                                                                              | No (display only)     |
| Z.ai              | GLM-5                                                                                                        | No (display only)     |
| Inception         | Mercury 2                                                                                                    | No (display only)     |
| Xiaomi            | MiMo-V2-Flash                                                                                                | No (display only)     |
| **Groq** (hosted) | GPT OSS 120B/20B, Llama 4 Scout, Llama 3.3 70B, Qwen3 32B, Kimi K2, Orpheus TTS, Whisper STT, ElevenLabs TTS | **Yes — API IDs set** |

### Actually Usable Chat Models (`src/lib/constants.ts`)

8 models available for chat (all via Groq):

| ID                                          | Display Name          |
| ------------------------------------------- | --------------------- |
| `llama-3.1-8b-instant`                      | Llama 3.1 8B          |
| `llama-3.3-70b-versatile`                   | Llama 3.3 70B         |
| `openai/gpt-oss-120b`                       | GPT-OSS 120B          |
| `openai/gpt-oss-20b`                        | GPT-OSS 20B           |
| `meta-llama/llama-4-scout-17b-16e-instruct` | Llama 4 Scout 17B     |
| `moonshotai/kimi-k2-instruct-0905`          | Kimi K2               |
| `qwen/qwen3-32b`                            | Qwen3-32B             |
| `openai/gpt-oss-safeguard-20b`              | GPT-OSS Safeguard 20B |

Default model: `llama-3.3-70b-versatile`

### OpenRouter (`src/lib/ai/providers.ts`)

- Configured but **not used** in the chat route.
- Reads `OPENROUTER_API_KEY` from env.
- Ready for integration when needed for non-Groq models.

---

## 9. Agents System

### Defined Agents (`src/lib/constants.ts`)

| ID           | Name       | Icon      | Status                                                    |
| ------------ | ---------- | --------- | --------------------------------------------------------- |
| `omni`       | Omni Agent | Bot       | **Functional** — Uses selected model + optional consensus |
| `aichat`     | AI Chat    | Sparkles  | **Functional** — Single/multi-chat modes                  |
| `researcher` | Researcher | Search    | **Stub** — Types defined, returns empty                   |
| `coder`      | Developer  | Code2     | **Stub** — Types defined, returns empty                   |
| `analyst`    | Analyst    | BarChart3 | **Stub** — Types defined, returns empty                   |

### Agent Implementation Files

**`src/agents/researcher.ts`**

- Types: `ResearcherInput`, `ResearcherOutput` (with sources, citations, suggested actions)
- `runResearcher()` — Stub, returns empty content/sources
- Planned: LangGraph + Tavily + Firecrawl integration

**`src/agents/analyst.ts`**

- Types: `AnalystInput`, `AnalystOutput` (with tables, suggested actions)
- `runAnalyst()` — Stub, returns empty content
- Planned: LangGraph + cached/uploaded data

**`src/agents/coder.ts`**

- Types: `CoderInput`, `CoderOutput` (with code blocks, run results)
- `runCoder()` — Stub, returns empty content
- Planned: LangGraph + E2B sandbox

### Agent Routing (`src/app/agents/page.tsx`)

```
?type=omni      → OmniAgent component
?type=aichat    → GenericAgent component
?type=researcher → GenericAgent component (same UI, different label)
?type=coder     → GenericAgent component (same UI, different label)
?type=analyst   → GenericAgent component (same UI, different label)
```

Currently all non-omni agents use the same GenericAgent → same `/api/chat` endpoint. The agent type only affects the UI label; no agent-specific logic runs.

---

## 10. Chat System

### Chat Endpoint (`POST /api/chat`)

- **Runtime:** Edge
- **Provider:** Groq (via `@ai-sdk/groq`)
- **System prompt:** Identifies as "Nexora" + discloses model name
- **Tool:** Tavily web search (for factual queries)

**Single Mode:** Uses `generateText()` with the selected model + Tavily search tool.

**Consensus Mode:** When `enabledModels` has 2+ IDs:

1. Runs all models in parallel via `Promise.all`
2. Collects responses
3. Sends a synthesis prompt to the first model asking it to produce one agreed response
4. Returns the consensus text

### Multi-Chat Columns (`MultiChatColumns.tsx`)

- Sends the same prompt to all 8 available models in parallel
- Each model's response displayed in its own column
- Columns can be toggled on/off
- Each column has its own model header with logo, name, link, and enable toggle
- Responses rendered with ReactMarkdown + MessageActions

### Research Animation (`ResearchAnimation.tsx`)

While waiting for a response, shows a 5-step animated pipeline:

1. Query Analysis
2. Web Search
3. Deep Analysis
4. Fact Checking
5. Researcher (synthesize)

Steps progress at 2.5-second intervals.

---

## 11. Components Inventory

### Agents (3 components)

| Component          | Lines | Purpose                                                                   |
| ------------------ | ----- | ------------------------------------------------------------------------- |
| `GenericAgent`     | ~120  | Handles AI Chat + all specialist agent views, single + multi-chat routing |
| `OmniAgent`        | ~100  | Dedicated "best answer" agent with consensus mode                         |
| `MultiChatColumns` | ~350  | Side-by-side multi-model comparison with per-column controls              |

### Chat (6 components)

| Component           | Lines | Purpose                                                             |
| ------------------- | ----- | ------------------------------------------------------------------- |
| `ChatMessages`      | ~110  | Conversation thread renderer with user/assistant message formatting |
| `CommandBar`        | ~200  | Main input bar (textarea, toolbar, model picker, multi-chat toggle) |
| `MessageActions`    | ~40   | Copy/Like/Dislike/Download buttons for messages                     |
| `ModelDropdown`     | ~160  | Provider-grouped model selection picker                             |
| `MultiChatMode`     | ~180  | Alternative 3-column layout used on workspace page                  |
| `ResearchAnimation` | ~120  | Step-by-step loading animation                                      |

### Dashboard (6 components)

| Component              | Lines | Purpose                                                               |
| ---------------------- | ----- | --------------------------------------------------------------------- |
| `DashboardLayout`      | ~340  | Full sidebar + main area layout with navigation, modals, user section |
| `WorkspaceProvider`    | ~50   | React context for selected model, agent, multi-chat state             |
| `AccountSettingsModal` | ~300+ | Full settings modal (general, AI, memory, subscription, profile tabs) |
| `ModelPreferenceModal` | ~100  | Quick model selection overlay                                         |
| `QuickActions`         | ~100  | Quick action tiles grid                                               |
| `RecentActivity`       | ~100  | Recent conversations list (hardcoded placeholder data)                |

### Home (6 components)

| Component         | Lines | Purpose                                                        |
| ----------------- | ----- | -------------------------------------------------------------- |
| `HeroSection`     | ~200  | Landing hero with text, CTA buttons, product preview card      |
| `FeaturesSection` | ~300  | Agent flow pipeline + model comparison + feature grid sections |
| `AgentsShowcase`  | ~170  | 12 agents in 4 categories with stats                           |
| `FAQSection`      | ~120  | 6-item accordion FAQ                                           |
| `CTASection`      | ~80   | Final call-to-action section                                   |
| `Footer`          | ~150  | Site footer with links, socials, watermark                     |

### Layout (3 components)

| Component    | Purpose                                                     |
| ------------ | ----------------------------------------------------------- |
| `Nav`        | Public site navigation (desktop + mobile, Clerk auth state) |
| `AuthLayout` | Auth page wrapper (aurora background, logo, footer)         |
| `GlassPanel` | Reusable glass-morphism container                           |

### UI (2 components)

| Component    | Purpose                                  |
| ------------ | ---------------------------------------- |
| `AgentTiles` | Agent tile grid for discovery/workspace  |
| `Greeting`   | Brand greeting with icon and status text |

---

## 12. Hooks

| Hook                  | File                       | Purpose                                                                                                                               |
| --------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `useChatAgent`        | `use-chat-agent.ts`        | Core chat state management: messages, input, loading, URL sync, auto-submit from `?q=`, auto-scroll, single/consensus chat submission |
| `useClickOutside`     | `use-click-outside.ts`     | Detects clicks outside a ref element, used for dropdown dismissal                                                                     |
| `useKeyboardShortcut` | `use-keyboard-shortcut.ts` | Listens for specific key events (e.g. Escape to close modals)                                                                         |

---

## 13. Library Utilities

| File              | Exports                                                                                                                                            | Purpose                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `ai-providers.ts` | `AI_PROVIDERS`, `getAllModels()`, `getModelsByProvider()`, `getProviderGroups()`, `findModel()`, `getModelNameByApiId()`, `getMultiModeSections()` | Full provider/model registry with grouped browsing and lookup utilities |
| `api.ts`          | `sendChatMessage()`, `sendMultiModelMessages()`                                                                                                    | Typed fetch wrappers for the chat API                                   |
| `constants.ts`    | `AVAILABLE_MODELS`, `AVAILABLE_AGENTS`                                                                                                             | Runtime-available chat models and agent definitions                     |
| `settings.ts`     | `getCompetingModelIds()`                                                                                                                           | Reads competing model IDs from localStorage for consensus mode          |
| `styles.ts`       | `FOCUS_RING`, `ICON_BUTTON`, `ICON_ACTION_BUTTON`                                                                                                  | Shared Tailwind class strings for consistency                           |
| `tavily.ts`       | `tavilySearch()`                                                                                                                                   | Server-side Tavily web search wrapper (advanced depth, 5 results)       |
| `utils.ts`        | `cn()`, `randomUUID()`                                                                                                                             | Class merge utility + UUID generation with crypto fallback              |
| `ai/providers.ts` | `getOpenRouter()`                                                                                                                                  | Lazy OpenRouter provider factory (reads `OPENROUTER_API_KEY`)           |

---

## 14. Type System

All types in `src/types/index.ts`:

```typescript
// Chat
ChatMessage       { id, role, content, model? }
ChatAPIResponse   { text?, model?, error?, details? }
ChatAPIRequest    { model, messages, enabledModels? }

// AI Models & Agents
AIModel           { id, name, provider }
AIAgent           { id, name, icon }
AGENT_TYPE_LABELS { omni, aichat, researcher, coder, analyst } (Record)

// Multi-Chat
MultiChatRound    { user, responses[] }
MultiChatResponse { model, content, loading? }
```

Additional types in `ai-providers.ts`:

```typescript
AIModelEntry      { name, apiId?, keyAdvantage, capability? }
AIProviderGroup   { name, models[] }
AIProvider        { id, name, models?, groups? }
MultiModeSection  { providerName, groupName?, models[] }
```

---

## 15. Design System & Theming

### Theme Variables

The application uses CSS custom properties for full dark/light theme support:

**Dark theme (default):**

- Background: `#111111` with elevated/card variants
- Text: White with muted (`#888`) and dim (`#555`) variants
- Accent: Violet (`#7c3aed`) and Cyan (`#06b6d4`)
- Borders: `rgba(255,255,255,0.1)`
- Surfaces: `rgba(255,255,255,0.04)` and `0.08`

**Light theme** (`[data-theme="light"]`):

- Background: `#f5f7fb` with white elevated
- Text: `#0f172a` with slate muted/dim
- Same violet/cyan accents (slightly adjusted)

### Fonts

| Variable         | Font           | Usage                     |
| ---------------- | -------------- | ------------------------- |
| `--font-display` | Syne           | Headlines, branding       |
| `--font-body`    | DM Sans        | Body text, UI             |
| `--font-mono`    | JetBrains Mono | Code blocks, model badges |

### Typography Scale

10 size levels from `13px` to `52px` via CSS variables, with 5 line-height and 3 letter-spacing options.

### Animations

5 custom Tailwind animations: fade-in-up, fade-in, float, pulse-glow, slide-up.

---

## 16. API Endpoints

| Method | Path               | Runtime | Purpose                                                    | Status         |
| ------ | ------------------ | ------- | ---------------------------------------------------------- | -------------- |
| `POST` | `/api/chat`        | Edge    | Chat completion (single + consensus mode) with Tavily tool | **Functional** |
| `GET`  | `/api/groq/models` | Node    | Proxy to Groq models list API                              | **Functional** |

### Environment Variables Required

| Variable              | Used In                           | Purpose                                      |
| --------------------- | --------------------------------- | -------------------------------------------- |
| `GROQ_API_KEY`        | `/api/chat`, `/api/groq/models`   | Groq LLM API authentication                  |
| `TAVILY_API_KEY`      | `lib/tavily.ts` (via `/api/chat`) | Web search tool                              |
| `OPENROUTER_API_KEY`  | `lib/ai/providers.ts`             | OpenRouter provider (not yet used in routes) |
| `NEXT_PUBLIC_CLERK_*` | Clerk SDK                         | Authentication configuration                 |
| Supabase keys         | Not yet used                      | Database (planned)                           |
| Stripe keys           | Not yet used                      | Payments (planned)                           |

---

## 17. What's Implemented vs Stub/Placeholder

### Fully Implemented

- [x] Clerk authentication (sign-in, sign-up, middleware, protected routes)
- [x] Landing page (hero, features pipeline, model comparison, agents showcase, FAQ, CTA, footer)
- [x] Dashboard sidebar layout with navigation, agent switcher, model selector, history, user profile
- [x] Chat with Groq models (single model mode)
- [x] Consensus chat mode (2+ models → synthesized answer)
- [x] Multi-chat side-by-side columns (all 8 models in parallel)
- [x] Tavily web search as AI tool
- [x] Model selection dropdown (provider-grouped)
- [x] Account settings modal (theme, AI prefs, competing models, profile)
- [x] Model preference modal
- [x] Research loading animation
- [x] Message actions (copy to clipboard)
- [x] Dark/light theme system
- [x] Responsive design (mobile sidebar collapse, mobile nav)
- [x] AI Providers reference page
- [x] URL-based chat state (chat ID, agent type, initial query via `?q=`)

### Stub / Not Yet Implemented

- [ ] **Researcher agent** — Types defined, `runResearcher()` returns empty
- [ ] **Analyst agent** — Types defined, `runAnalyst()` returns empty
- [ ] **Coder agent** — Types defined, `runCoder()` returns empty
- [ ] **LangGraph workflows** — `src/lib/graph/` directory is empty
- [ ] **Firecrawl web scraping** — Dependency installed, not integrated
- [ ] **E2B code sandbox** — Dependency installed, not integrated
- [ ] **OpenRouter integration** — Provider configured, not used in chat route
- [ ] **Supabase database** — Dependencies installed, no schema/queries/persistence
- [ ] **Chat history persistence** — All messages are in-memory only
- [ ] **Stripe payments** — Dependencies installed, no integration
- [ ] **AI Inbox** — Placeholder page
- [ ] **AI Drive** — Placeholder page
- [ ] **Blog** — Placeholder page
- [ ] **Features page** — Minimal placeholder
- [ ] **Pricing page** — Summary text only, no interactive plans
- [ ] **Privacy Policy** — Placeholder
- [ ] **Terms of Service** — Placeholder
- [ ] **Execution Blocks** — Shown in landing page mockup, not functional
- [ ] **Like/Dislike feedback** — Buttons exist, no backend handler
- [ ] **Download message** — Button exists, no handler
- [ ] **Voice input** — Mic button exists, no integration
- [ ] **File attachment** — Paperclip button exists, no handler
- [ ] **Global search** — Globe button exists, no handler
- [ ] **Recent activity** — Hardcoded placeholder data, no real history
- [ ] **Chat history** — Sidebar history dropdown has hardcoded items
- [ ] **Custom agent builder** — Mentioned in FAQ as P2 roadmap

---

## 18. Known Gaps & TODOs

### Architecture

1. **No database layer** — All chat state is ephemeral (in-memory). Supabase deps installed but unused.
2. **No server-side state** — Every page load starts fresh. No persistent conversations.
3. **Agent routing is cosmetic** — All agents (researcher, coder, analyst) use the same generic chat endpoint. No specialized agent logic runs.
4. **`src/lib/graph/` is empty** — LangGraph is imported but has no workflow definitions.
5. **Inbox layout missing `WorkspaceProvider`** — Unlike agents/workspace/providers, the inbox layout doesn't wrap with `WorkspaceProvider`, which may cause context errors if workspace features are added.
6. **Drive layout missing `WorkspaceProvider`** — Same issue as inbox.

### UI/UX

7. **Two multi-chat implementations** — `MultiChatMode.tsx` (workspace page) and `MultiChatColumns.tsx` (agents page) are separate implementations with different designs. Should be consolidated.
8. **Hardcoded recent activity** — `RecentActivity.tsx` has 3 hardcoded items, not connected to real data.
9. **Hardcoded history** — `DashboardLayout` sidebar has 3 hardcoded history items.
10. **User initials hardcoded** — `ChatMessages.tsx` uses "DM" for user avatar instead of deriving from Clerk user.
11. **Placeholder pages** — Features, Pricing, Blog, Privacy, Terms need real content.

### API

12. **No rate limiting** — Chat endpoint has no request throttling.
13. **No input validation** — Request body parsing trusts client input format.
14. **No streaming** — Uses `generateText()` (blocking) instead of `streamText()` (streaming). Response appears all at once.
15. **Edge runtime limitations** — Chat route runs on Edge; may limit some Node.js features if needed later.

### Security

16. **No CSRF protection** beyond what Clerk provides.
17. **Tavily API key sent via body** — The Tavily wrapper sends the API key in the POST body as `api_key` field (this is Tavily's required format, but notable).

---

## 19. Dependency Summary

### Production Dependencies (20)

| Package                         | Purpose                | Actually Used                                                       |
| ------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| `@ai-sdk/groq`                  | Groq LLM integration   | **Yes** — chat route                                                |
| `@ai-sdk/react`                 | React hooks for AI SDK | Imported but not directly used (uses custom `useChatAgent` instead) |
| `@clerk/nextjs`                 | Authentication         | **Yes**                                                             |
| `@e2b/code-interpreter`         | Code sandbox           | **No** — installed for Coder agent (stub)                           |
| `@langchain/core`               | LangChain core         | **No** — installed for agent framework (empty graph/)               |
| `@langchain/langgraph`          | Agent workflow graphs  | **No** — installed for agent framework (empty graph/)               |
| `@mendable/firecrawl-js`        | Web scraping           | **No** — installed for Researcher agent (stub)                      |
| `@openrouter/ai-sdk-provider`   | Multi-model routing    | Provider configured, **not used in routes**                         |
| `@stripe/stripe-js`             | Stripe client          | **No** — installed for payments (not implemented)                   |
| `@supabase/ssr`                 | Supabase SSR           | **No** — installed for database (not implemented)                   |
| `@supabase/supabase-js`         | Supabase client        | **No** — installed for database (not implemented)                   |
| `@tavily/core`                  | Web search             | **Yes** — used as AI tool in chat                                   |
| `ai`                            | Vercel AI SDK          | **Yes** — `generateText`, `tool`                                    |
| `clsx`                          | Class utility          | **Yes** — via `cn()`                                                |
| `framer-motion`                 | Animations             | **Yes** — landing page sections                                     |
| `lucide-react`                  | Icons                  | **Yes** — throughout UI                                             |
| `next`                          | Framework              | **Yes**                                                             |
| `react` + `react-dom`           | UI library             | **Yes**                                                             |
| `react-markdown` + `remark-gfm` | Markdown rendering     | **Yes** — chat messages                                             |
| `stripe`                        | Stripe server          | **No** — not implemented                                            |
| `tailwind-merge`                | Tailwind class merging | **Yes** — via `cn()`                                                |
| `zod`                           | Schema validation      | **Yes** — tool input schema in chat route                           |

### Dev Dependencies (7)

`@types/node`, `@types/react`, `@types/react-dom`, `eslint`, `eslint-config-next`, `postcss`, `tailwindcss`, `typescript`

### Unused Dependencies

6 packages installed but not actively used: `@e2b/code-interpreter`, `@langchain/core`, `@langchain/langgraph`, `@mendable/firecrawl-js`, `@stripe/stripe-js`, `stripe`, `@supabase/ssr`, `@supabase/supabase-js`. These are pre-installed for planned features.

---

_This document reflects the codebase state as of 10 March 2026 on the `main` branch._
