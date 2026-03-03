# 🌌 Nexora

**AI Agentic Search & Action Platform** — One platform. Every AI. Search → Action.

All planning and technical documentation live in the **`docs/`** folder.

---

## 📚 Documentation

| What | Where |
|------|--------|
| **Full product readme** | [docs/Readme.md](docs/Readme.md) |
| **Browse all docs in one page** | Open [docs/docs.html](docs/docs.html) in your browser |
| **Planning** (vision, P0–P3, security) | [docs/Planning.md](docs/Planning.md) |
| **Architecture** (stack, data flows) | [docs/Architecture.md](docs/Architecture.md) |
| **Environment variables** | [docs/ENV.md](docs/ENV.md) |
| **Build milestones** (M1–M5) | [docs/MILESTONES.md](docs/MILESTONES.md) |
| **Database schema** | [docs/DATABASE.md](docs/DATABASE.md) |
| **API endpoints** | [docs/API.md](docs/API.md) |
| **Agents** (Researcher, Analyst, Coder) | [docs/AGENTS.md](docs/AGENTS.md) |
| **UI components** | [docs/UI_COMPONENTS.md](docs/UI_COMPONENTS.md) |
| **Competitors** (positioning, start simple → advance) | [docs/COMPETITORS.md](docs/COMPETITORS.md) |

---

## 🚀 Quick start

```bash
cp .env.example .env.local   # Fill in keys (see docs/ENV.md)
npm install
npx supabase db push          # If using Supabase
npm run dev
```

Open **http://localhost:3000**

---

## 🛠️ Stack

Next.js 15 · React 19 · TypeScript · Supabase · OpenRouter · Vercel AI SDK v4 · LangGraph · Tavily · Firecrawl · Vercel.

See [docs/Readme.md](docs/Readme.md) and [docs/Architecture.md](docs/Architecture.md) for full details.
