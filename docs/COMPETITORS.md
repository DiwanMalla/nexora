# 🎯 NEXORA — Competitor Research & Positioning

Research snapshot (2024–2025). Use this to stay differentiated and to decide what to build first (start simple) vs later (advance).

---

## Competitor Overview

| | **Perplexity** | **Genspark** | **AI Fiesta** | **Kumari.ai** |
|--|----------------|--------------|---------------|----------------|
| **Positioning** | AI answer engine, cited search | Multi-agent workspace, Sparkpages, content creation | Multi-model aggregator, one subscription | Smart multi-model routing (why this model) |
| **Strength** | Fast cited answers, Pro/Max models, Sonar API, Spaces | End-to-end tasks: research → slides/docs/video/sites; export; even phone AI | Side-by-side models, ~$12/mo for 9+ models, auto routing | Cost + capability + latency–aware routing |
| **Weakness** | Inconsistent on niche topics; no built-in "actions" (until Computer); limited technical depth | Pricier ($20–$80/mo); complex UX; limited public API | Search/citations secondary; free tier tiny (3 msgs) | Less visibility in market; product detail sparse |
| **Pricing** | Free (5 Pro searches/day), Pro $20/mo, Max $200/mo | Free (200 credits/day), Plus ~$20–25/mo, Pro $39–79/mo | Free (3 messages), ~$12/mo all models | (Pricing not clearly public) |
| **Actions / Execution** | Computer (Max): multi-agent workflows, not yet "Export to Sheets" style buttons | Export to PDF/DOCX/Google Docs/WordPress; content creation tools | Prompt enhancement, projects, personas; no search-to-action | Routing only |
| **Agents / Workspace** | Spaces, Pages; Computer is new | Multi-agent (docs, sheets, slides, research, video) | "Super Fiesta" auto model; personas | Routing layer only |

---

## Perplexity — Deep Dive

**What they do well:** Cited answers, multiple models on Pro/Max, Sonar API, Comet (agentic browser on Max), shareable Pages.

**Gaps / criticisms (from research):**
- Inconsistent quality on **niche or specialized** topics; surface-level on research papers.
- **Source crediting and credibility** — limited visibility into how sources are chosen/validated.
- **No simple "Execution Blocks"** — you get an answer, not "Export to Sheets" or "Draft email" in-product (Computer is workflow automation for Max, different use case).
- **Technical depth** — not strong for complex programming or structured data work; no control over data sources/selectors.
- **Automation** — not built for scalable automation or custom data formatting.

**Nexora angle:** We offer **search + agents + Execution Blocks** (next-step actions) from day one, with a **unified Canvas** and **transparency** (why which agent/model). Start with cited search + one agent + one action type; then add more agents and actions.

---

## Genspark — Deep Dive

**What they do well:** Sparkpages (synthesized reports), multi-agent system (docs, sheets, slides, research, video), export (PDF, DOCX, Google Docs, WordPress), AI Drive, team plans, advanced automation (e.g. phone).

**Gaps:**
- **Price** — Plus/Pro at $20–$80/mo; we can undercut with a simpler free tier and $12 Pro.
- **Complexity** — Many features; discovery and UX can feel heavy. We focus on **clear agent discovery** and **simpler mental model** (search → answer → actions).
- **API** — Limited/no public API; we can offer API later for developers.

**Nexora angle:** **Simpler UX**, **better agent discovery**, **cheaper** Pro; we don't need to do slides/video/phone in MVP — we do **research + citations + Execution Blocks** better and clearer.

---

## AI Fiesta — Deep Dive

**What they do well:** One subscription (~$12/mo) for 9+ models, **side-by-side comparison**, Super Fiesta (auto model selection), prompt enhancement, custom projects with system instructions, avatar personas, image gen, Memory; web + mobile.

**Gaps:**
- **Search/citations** — Positioned as chat aggregator, not "answer engine with citations."
- **Free tier** — Only 3 messages; we can offer a more generous free tier (e.g. 20 messages/day) to hook users.
- **Agents** — Personas are fun but not "Researcher / Analyst" task routing with real tools (Tavily, Firecrawl, cache).

**Nexora angle:** **Better UX**, **more real agents** (Researcher, Analyst, Coder with tools), **smarter routing** (LangGraph), and **verifiable search** (citations) so we're not "just another chat aggregator."

---

## Kumari.ai — Deep Dive

**What they do well:** Multi-provider routing with **capability + cost + latency**; "why this model" transparency.

**Gaps:** Less product visibility; positioning is routing layer, not full workspace or search-to-action.

**Nexora angle:** We **show why a model/agent was chosen** (transparency) and combine it with **workspace + actions**, not just routing.

---

## How Nexora Stands Against Them (Summary)

| Dimension | Nexora (goal) | vs Others |
|-----------|----------------|-----------|
| **Search** | Cited, verifiable (Tavily + Firecrawl + cache) | Perplexity: strong but no actions. Genspark: rich but complex. AI Fiesta: not search-first. |
| **Agents** | Researcher, Analyst, Coder; LangGraph routing | Genspark: many agents but heavier. AI Fiesta: personas, not task agents. Perplexity: Computer is Max-only. |
| **Actions** | Execution Blocks (Export, Draft email, etc.) from MVP | Perplexity: no simple in-product actions. Genspark: export + creation. We do "next step" buttons clearly. |
| **Workspace** | Unified Canvas, side-by-side comparison | Perplexity: Spaces/Pages. Genspark: Sparkpages + Drive. We: one Canvas, simpler. |
| **Transparency** | Why this agent/model chosen | Kumari: routing transparency. We: same + full product. |
| **Price** | Free (20 msgs/day, 5 agent uses) + Pro $12/mo | Under or match AI Fiesta; under Genspark/Perplexity Pro. |
| **Privacy / trust** | Privacy-first, security by design, no selling data | Differentiator across all. |

---

## Start Simple → Advance (Roadmap)

### Phase 1 — Simple (compete on "good enough" + one clear win)

- **Cited search** — One agent (Researcher), Tavily + cache; answers with sources. "We're like Perplexity but simpler and with one agent."
- **One Execution Block** — e.g. "Copy to clipboard" or "Export as Markdown" so every result has a clear next step.
- **Multi-model chat** — 3–5 models, side-by-side optional later; "we're like AI Fiesta but with real search."
- **Auth + free tier** — 20 messages/day, 5 agent uses; no credit confusion like Genspark.
- **Single agent discovery** — One "Researcher" agent, clearly explained.

**Success:** User can sign in, ask a question, get a cited answer, and use one action. No slides, no video, no phone — just search + action + chat.

### Phase 2 — Advance (differentiate clearly)

- **Second agent** — Analyst (data/CSV); router chooses Researcher vs Analyst.
- **More Execution Blocks** — "Draft email," "Export to Sheets" (or CSV), "Analyze in spreadsheet."
- **Canvas** — Side-by-side model comparison; workspace for artifacts (doc/code).
- **Agent discovery page** — Featured agents, categories, search (keyword first, pgvector later).
- **Pro tier** — $12/mo; unlimited messages, all models, all agents.

**Success:** We clearly beat "just search" (Perplexity) and "just chat" (AI Fiesta) by combining search + agents + actions + workspace at a lower price than Genspark.

### Phase 3 — Lead (where we pull ahead)

- **Transparency** — UI shows "Why we used Researcher" / "Why we used Claude for this."
- **Coder agent** — E2B sandbox; we do "run code" and "debug" in-product.
- **10+ agents** — Expand library; custom agent builder (no-code) later.
- **API** — For developers; pay-per-token or Pro API access.
- **Privacy & compliance** — GDPR-style rights, audit log, bug bounty; marketing as "trust-first."

**Success:** Nexora is the place for "search → understand → act" with full transparency and trust.

---

## What Else We Can Do (Next Actions)

1. **Landing page copy** — Use the table above and "Start simple → Advance" to write hero + comparison bullets.
2. **Pricing page** — Free vs Pro vs (later) Teams; compare "vs Perplexity Pro $20" and "vs Genspark Plus $25."
3. **Blog / SEO** — "Perplexity vs Genspark vs Nexora," "Why AI search needs Execution Blocks," "Privacy-first AI search."
4. **Feature parity checklist** — For each phase, a list of "we have / we don't" vs Perplexity, Genspark, AI Fiesta so we don't overbuild.
5. **Re-research quarterly** — Perplexity Computer and Genspark's new features move fast; refresh this doc and adjust roadmap.

---

*Sources: Public web search (Genspark, AI Fiesta, Kumari.ai, Perplexity pricing/features/limitations, Genspark vs Perplexity, AI search with actions). Last updated for planning use; validate before external use.*
