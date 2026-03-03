# 🎨 NEXORA — UI Component Library

Components live under `src/components/`. Design system: **Nexora aesthetic** (see [.cursorrule](../.cursorrule)) — dark default, Violet (#7C3AED), Cyan (#06B6D4), glassmorphism, Inter + JetBrains Mono.

---

## Layout (`src/components/layout/`)

| Component | Purpose |
|-----------|---------|
| **Sidebar** | Nav: Chat, Search, Workspace, Discover. Glassmorphism (`backdrop-blur-md`, `bg-white/5`). |
| **CommandK** | Global command palette (shortcuts, quick actions). |
| **GlassCard** / **GlassPanel** | Wrapper with blur and border for sidebars and inputs. |
| **AppShell** | Root layout: sidebar + main content; responsive. |

---

## Chat (`src/components/chat/`)

| Component | Purpose |
|-----------|---------|
| **ChatInterface** | Main chat UI; uses `useChat` (Vercel AI SDK); sends to `/api/chat`. |
| **ModelSelector** | Dropdown or list of 10+ models (from `lib/ai/models.ts`). |
| **PromptInput** | Textarea + submit; optional file attach (P1). |
| **MessageList** | Renders user/assistant messages; supports streaming and markdown. |
| **ThinkingIndicator** | Shows granular "Thinking…" states (e.g. "Reading Reddit…", "Verifying citations…"). |

---

## AI (`src/components/ai/`)

| Component | Purpose |
|-----------|---------|
| **StreamingText** | Renders streamed AI output (markdown, no raw HTML). |
| **SourceList** | Citations: list of sources with title, URL, favicon. |
| **SourceCard** | Single source chip/card; link out. |
| **ActionFooter** | Execution Blocks: 1–2 "Next step" buttons (e.g. Export to Sheets, Draft email). |
| **ResearchResult** | Full research block: title, content (prose), `SourceList`, `ActionFooter`. Use `"use cache"` in async wrapper where appropriate. |

---

## Canvas (`src/components/canvas/`)

| Component | Purpose |
|-----------|---------|
| **Canvas** | Side-by-side workspace for generated docs/code/artifacts. |
| **ArtifactEditor** | Editable view of an artifact (doc or code). |
| **ArtifactPreview** | Read-only or live preview (e.g. markdown → HTML, code highlight). |
| **ComparisonView** | Side-by-side model comparison (e.g. Claude vs GPT-4o). |

---

## Shared patterns

- **Dark theme default** — `#0A0A0A` background; violet/cyan accents.
- **Typography** — Inter for UI; JetBrains Mono for code and agent logs.
- **No raw HTML from AI** — Always render via Markdown + these components.
- **View transitions** — Use React 19 `startTransition` for smooth switches (e.g. between agents or routes).

Reference [Architecture](Architecture.md) for folder map and [.cursorrule](../.cursorrule) for the ResearchResult + API route code patterns.
