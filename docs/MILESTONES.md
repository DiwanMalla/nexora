# 🗺️ NEXORA — Build Milestones

Phased build plan aligned with [Planning](Planning.md). Ship often; no scope creep.

---

## M1 — Foundation (Weeks 1–2)

- [ ] Next.js 16 app with Turbopack, TypeScript, Tailwind
- [ ] Supabase project + Auth (Google + email), RLS baseline
- [ ] `proxy.ts` skeleton (rate limit + route to API)
- [ ] `/api/chat` with OpenRouter + Vercel AI SDK v4 streaming
- [ ] Basic chat UI + model selector (3–5 models)
- [ ] Conversation save to Supabase (per user)
- [ ] ENV and secrets server-side only; no PII in logs

**Exit:** User can sign in, chat with a model, and see history.

---

## M2 — Agentic search & core agents (Weeks 3–4)

- [ ] Tavily integration; `"use cache"` for RAG/results
- [ ] LangGraph router + Researcher agent (search → citations → Execution Block)
- [ ] `/api/agent` endpoint; optional Firecrawl for scrape
- [ ] Search UI with citations and 1–2 "Next step" actions
- [ ] Analyst agent (data/CSV path, cached data)
- [ ] Agent discovery page + featured agents from DB
- [ ] Input validation (Zod) on all API payloads

**Exit:** User can run agentic search, see citations, and use Execution Blocks.

---

## M3 — Canvas & polish (Weeks 5–6)

- [ ] Side-by-side model comparison (Canvas)
- [ ] Workspace/artifacts view (generated docs/code)
- [ ] Conversation history UI; shareable links (optional)
- [ ] Responsive layout; dark theme (Violet/Cyan)
- [ ] Stripe integration: Free tier limits, Pro subscription
- [ ] Dependency audit in CI; security checklist

**Exit:** MVP feature-complete; Free + Pro tiers live.

---

## M4 — Scale & expand (Month 2–3)

- [ ] pgvector agent search (semantic)
- [ ] Coder agent (E2B sandbox)
- [ ] Expand to 10+ agents; file upload + analysis
- [ ] User profile + usage dashboard
- [ ] CSP and security headers; audit logging
- [ ] Data retention and account deletion

---

## M5+ — Roadmap (Months 4–12)

- Custom agent builder, AI document editor, voice I/O
- Team workspaces, 50+ agents, API for developers
- Privacy policy, GDPR-style rights, bug bounty
- See [Planning — P2/P3](Planning.md#p2--nice-to-have-month-4-6) for full list
