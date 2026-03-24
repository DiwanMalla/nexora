# 🌌 Nexora

**Nexora** is an AI-powered **search, chat, and action platform** built for the next generation of agentic workflows.

It combines:

- **multi-model AI chat**
- **agent-based task routing**
- **web search + citation workflows**
- **workspace / canvas-style interaction**
- **developer-friendly full-stack architecture**

> **One platform. Every AI. Search → Action.**

---

## ✨ Overview

Nexora is designed as an **Agentic Search & Action Platform** where users can:

- chat with multiple AI models
- route tasks to specialized AI agents
- perform web-backed research with citations
- analyze data and structured inputs
- generate code and execution-ready outputs
- work inside a unified app experience instead of switching between tools

The project is built with a modern TypeScript stack and is structured to support future expansion into:

- AI workspaces
- execution blocks
- multi-agent orchestration
- semantic agent discovery
- subscriptions and usage tiers

---

## 🚀 Core Vision

Traditional AI apps stop at answering questions.

Nexora is built to go further:

- **Search** → find relevant information
- **Reason** → use the right model/agent for the task
- **Act** → generate useful next steps, outputs, and workflows

Examples of intended use cases:

- research and fact-checking
- side-by-side model comparisons
- code generation and debugging
- structured data analysis
- exportable AI-assisted workflows

---

## 🛠 Tech Stack

### Frontend

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion**
- **Lucide React**

### AI / Orchestration

- **OpenRouter**
- **Vercel AI SDK**
- **LangGraph**
- **Groq**
- **Tavily**
- **Firecrawl**
- **E2B Code Interpreter**

### Backend / Platform

- **Supabase**
- **Clerk**
- **Stripe**
- **Vercel**

---

## 📦 Key Features

- **Multi-model AI chat**
- **Agent-based routing**
- **Research workflows with citations**
- **Extensible architecture for search, analysis, and coding agents**
- **Modern App Router codebase**
- **Supabase-backed data layer**
- **Clerk-based authentication**
- **Stripe-ready monetization hooks**
- **Tailwind-based design system**
- **Project documentation for architecture, milestones, API, and database design**

---

## 🧠 Planned / Documented Agents

The project documentation defines several core agent roles:

### Researcher

Best for:

- deep search
- fact-checking
- citation-backed answers
- web research workflows

### Analyst

Best for:

- data summaries
- CSV-style insights
- structured analysis
- trend extraction

### Coder

Best for:

- code generation
- debugging
- sandbox execution
- implementation help

---

## 📁 Project Structure

```bash
nexora/
├── docs/                    # Product, architecture, API, environment, milestones
├── public/                  # Static assets
├── src/
│   ├── app/                 # Next.js App Router pages and API routes
│   ├── components/          # UI components
│   ├── lib/                 # Shared libraries, AI integrations, utilities
│   └── agents/              # Agent logic (researcher, analyst, coder)
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```
