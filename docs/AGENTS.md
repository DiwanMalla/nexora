# 🤖 NEXORA — Agent Registry

Agents are specialized workflows powered by LangGraph. The router sends queries to the best-fit agent; users can also pick an agent from the discovery page.

---

## Core agents (P0 / P1)

### Researcher

| Field | Value |
|-------|--------|
| **Slug** | `researcher` |
| **Purpose** | Deep search, fact-checking, citation-backed answers |
| **Tools** | Tavily (search), Firecrawl (optional scrape), `"use cache"` (RAG) |
| **Output** | Markdown answer + `Source[]` (title, URL, favicon) + Execution Blocks (e.g. Export to Sheets, Draft email) |
| **Default model** | e.g. `anthropic/claude-3.5-sonnet` or `openai/gpt-4o` |
| **When used** | Research questions, "find me…", "compare…", "what's the latest on…" |

---

### Analyst

| Field | Value |
|-------|--------|
| **Slug** | `analyst` |
| **Purpose** | Data and CSV analysis, summaries, structured insights |
| **Tools** | Cached or user-uploaded data; optional file parse |
| **Output** | Tables, summaries, suggested actions (e.g. Export CSV) |
| **Default model** | e.g. `openai/gpt-4o` or `anthropic/claude-3.5-sonnet` |
| **When used** | "Analyze this data", "summarize this CSV", "trends in…" |

---

### Coder (P1)

| Field | Value |
|-------|--------|
| **Slug** | `coder` |
| **Purpose** | Code generation, debugging, run in sandbox |
| **Tools** | E2B sandbox (when available) |
| **Output** | Code blocks, run results, suggested fixes |
| **Default model** | e.g. `openai/gpt-4o` or `anthropic/claude-3.5-sonnet` |
| **When used** | "Write a function…", "debug this", "run this code" |

---

## Categories (for discovery)

| Category | Description | Example agents |
|----------|-------------|----------------|
| **Research** | Search, citations, reports | Researcher |
| **Data** | Analysis, CSV, numbers | Analyst |
| **Code** | Code gen, run, debug | Coder |
| **Writing** | Drafts, emails, copy | (Future) |
| **Creative** | Images, ideas | (Future) |

---

## Adding agents

1. Implement logic in `src/agents/<name>.ts` and plug into LangGraph in `src/lib/graph/`.
2. Insert or update row in `agents` table (slug, name, description, category, system_prompt, default_model, embedding for search).
3. Optionally set `is_featured` for discover page.
4. Document here and in API (GET `/api/agents/[id]`).

---

## Model routing

- **Router/simple tasks:** `gpt-4o-mini` (cost-effective).
- **Reasoning / complex answers:** `claude-3.5-sonnet` or `o1`.
- Centralize model ids in `src/lib/ai/models.ts`; never hardcode in agents.
