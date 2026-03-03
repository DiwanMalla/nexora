# 🗺️ NEXORA — Master Planning Document

## 🎯 Vision

Nexora is the **one-stop AI destination** for everyone: users don't need to know which AI to use. Nexora finds the right agent, lets them compare models, and delivers a full AI workspace with **Search-to-Action** (Execution Blocks) — not just answers.

**Strategic pillars** (align with [.cursorrule](../.cursorrule) and [Readme](Readme.md)):  
Search-to-Action · Agentic Loops (LangGraph) · Unified Canvas · **Privacy & Security First**

## 👥 Target Users

- **Primary MVP focus:** Students (research, writing) + Professionals (reports, emails, analysis)
- Developers (coding help, debugging)
- Creators (content, images, social media)
- Businesses (marketing, legal, finance)
- Casual users (any question, any task)

## 🏆 Core Value Propositions

1. Find the RIGHT AI agent for any task instantly
2. Compare multiple AI models side-by-side
3. One subscription for all top AI models
4. Simple enough for non-technical users
5. Powerful enough for developers
6. **Trust-first:** Privacy and cybersecurity are top priority — no selling user data; secure by design

---

## 🔒 Privacy, Security & Cybersecurity (Top Priority)

Security and privacy are **non-negotiable** from day one. Nexora handles queries, conversation history, and optional PII — all must be protected.

### Principles

- **Privacy by design** — Collect only what's needed; no selling or sharing user data with third parties for ads.
- **Least privilege** — Auth and RBAC so users and services only access what they're allowed.
- **Secure by default** — HTTPS only, secrets server-side only, secure headers, and safe dependencies.
- **Transparency** — Clear privacy policy and data handling; explain what is stored and where (e.g. Supabase, Vercel).

### P0 Security & Privacy Requirements (MVP)

- [ ] **Authentication** — Secure auth (e.g. Clerk/Supabase Auth) with Google + email; no plaintext passwords; session handling and logout.
- [ ] **Secrets** — All API keys (OpenRouter, Tavily, Firecrawl, Stripe) **server-side only**; never exposed to client or logs.
- [ ] **Rate limiting & abuse** — `proxy.ts` (or equivalent) for AI/API rate limits and basic abuse protection.
- [ ] **Data in transit** — HTTPS only; no mixed content; secure cookies (e.g. `Secure`, `HttpOnly`, `SameSite`).
- [ ] **Data at rest** — Supabase (PostgreSQL) with Row Level Security (RLS) so users only see their own data; encrypt sensitive fields if required by policy.
- [ ] **Logging & monitoring** — No PII or full prompts in logs; log only IDs, timestamps, and error codes; prepare for audit trail.
- [ ] **Input validation** — Validate and sanitize all user input and API payloads; guard against injection (SQL, NoSQL, prompt injection where relevant).
- [ ] **Dependencies** — Keep dependencies updated; run `npm audit` in CI; address high/critical CVEs before release.

### P1 — Security Hardening (Month 2–3)

- [ ] **CSP & security headers** — Content-Security-Policy, X-Frame-Options, etc. (e.g. via Next.js headers or Vercel).
- [ ] **Audit logging** — Who did what and when (e.g. login, export, delete) for support and compliance.
- [ ] **Data retention & deletion** — Clear retention policy; user-initiated account and data deletion.
- [ ] **Security review** — Internal checklist or lightweight pentest before broader launch.

### P2+ — Compliance & Scale

- [ ] **Privacy policy & ToS** — Published, readable, and aligned with actual data flows.
- [ ] **GDPR / regional compliance** — Data subject rights (access, export, delete, rectify) where applicable.
- [ ] **Bug bounty or responsible disclosure** — Channel for security researchers to report issues.

### Risks & Mitigations (Security)

- **Data breach** → RLS, least privilege, no PII in logs; encrypt secrets; rotate keys if compromised.
- **Abuse / prompt injection** → Rate limiting, validation, and (where possible) sandboxing or filtering for agent inputs/outputs.
- **Supply chain** → Lockfile, CI `npm audit`, and review critical dependencies before upgrades.

---

## 🎯 Key Features (Priority Order)

### P0 — Must Have (MVP)

- [ ] **Security & privacy baseline** — See [Privacy, Security & Cybersecurity](#-privacy-security--cybersecurity-top-priority) (auth, secrets server-side, rate limiting, HTTPS, RLS, no PII in logs, input validation, dependency audit).
- [ ] User authentication (Google + email)
- [ ] Multi-model chat with streaming (OpenRouter)
- [ ] Model selector (10+ models)
- [ ] **Agentic search** with citations (Tavily + optional Firecrawl), backed by `"use cache"`
- [ ] **Core agents** (Researcher, Analyst) + task routing (LangGraph) + Agent discovery page
- [ ] **Execution Blocks** — at least 1–2 "Next step" actions per result (e.g. Export, Draft email)
- [ ] Conversation history
- [ ] Side-by-side model comparison (Canvas)
- [ ] Responsive mobile design
- [ ] Free tier + Pro subscription (Stripe)

### P1 — Should Have (Month 2-3)

- [ ] Smart agent search (semantic, pgvector)
- [ ] Expand agent library (10+ agents; Coder/E2B, more specialists)
- [ ] AI Image generation
- [ ] File upload + analysis (PDF, images)
- [ ] User profile + usage dashboard
- [ ] Agent rating system
- [ ] Shareable conversation links

### P2 — Nice to Have (Month 4-6)

- [ ] Custom agent builder (no-code)
- [ ] AI Document editor (Canvas artifacts)
- [ ] AI Presentation builder
- [ ] Voice input/output
- [ ] User-visible multi-agent workflows (orchestration UI)
- [ ] Team workspaces
- [ ] Expand to 50+ agents; API access for developers

### P3 — Future (Month 7+)

- [ ] Third-party agent submissions
- [ ] Agent marketplace with revenue share
- [ ] Mobile app (React Native)
- [ ] Enterprise tier
- [ ] Agent analytics dashboard

## 💰 Monetization

- Free tier: 20 AI messages/day, 5 agent uses/day
- Pro tier: $12/month — unlimited messages, all models, all agents
- Teams tier: $29/month per user — shared workspace, custom agents
- API tier: Pay-per-token for developers

## 🏁 Success Metrics (Year 1)

- Month 3: 500 active users
- Month 6: 5,000 active users, 200 paying
- Month 12: 25,000 active users, 2,000 paying

## 🔑 Differentiators vs Competitors

- vs Perplexity: We have agents + workspace, not just search
- vs Genspark: Simpler UX, better agent discovery, cheaper
- vs Kumari: Show WHY a model was chosen (transparency)
- vs AI Fiesta: Better UX, more agents, smarter routing
- **vs others (trust):** Privacy-first, security by design — no selling user data; clear data handling and secure infra from MVP

## ⚠️ Risks & Mitigations

- **OpenRouter / API downtime** → Next.js 16 `"use cache"` for RAG/results; status page; graceful degradation.
- **High API costs** → Rate limiting via `proxy.ts`, smart model routing (e.g. gpt-4o-mini for routing, Claude/o1 for reasoning).
- **Third-party dependency (Tavily, Firecrawl)** → Cache aggressively; optional Firecrawl; consider fallback search later.
- **Competition from big players** → Differentiate on agent quality, Execution Blocks, and UX — not just model access.
- **Solo developer burnout** → Strict P0 scope, no creep, ship often; defer P2/P3 until P0/P1 are live.
- **Security / privacy incident** → See [Privacy, Security & Cybersecurity](#-privacy-security--cybersecurity-top-priority); RLS, no PII in logs, secrets server-side, dependency audit, and incident response plan as we scale.

---

## 📋 Planning Improvements (Summary)

- **Vision** — Tied to Search-to-Action and strategic pillars; linked to .cursorrule and Readme.
- **Target users** — Primary MVP segment called out (students + professionals) for focus.
- **P0** — Aligned with stack: agentic search (Tavily + cache), core agents (Researcher, Analyst), Execution Blocks; "50+ agents" moved to P2 so MVP ships with 3 core agents + discovery.
- **P1** — "Web search + AI" folded into P0 (agentic search); P1 adds Coder and expanding agent library.
- **P2** — Clarified "multi-agent workflows" as user-visible orchestration; 50+ agents and API here.
- **Risks** — Mitigations updated to mention `proxy.ts`, `"use cache"`, and third-party API risk.
- **Privacy & security** — New strategic pillar; dedicated section with principles, P0/P1/P2+ security requirements, and differentiator (trust-first). Security baseline is part of P0 MVP.
- **Competitors** — See [COMPETITORS.md](COMPETITORS.md): research on Perplexity, Genspark, AI Fiesta, Kumari.ai; positioning table; Start simple → Advance roadmap (Phase 1: cited search + one agent + one Execution Block; Phase 2: Analyst, Canvas, discovery; Phase 3: transparency, Coder, API, trust).
- **Optional next steps:** Add a short "Out of scope for MVP" (e.g. custom agent builder, mobile app, API), and dependency notes (which P1 items block on P0).
