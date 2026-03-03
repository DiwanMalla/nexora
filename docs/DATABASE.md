# 🗄️ NEXORA — Database Schema

Supabase (PostgreSQL + pgvector). All tables use **Row Level Security (RLS)** so users only access their own data.

---

## Core tables

### `profiles` (extends Auth)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK, FK → auth.users) | User id from Supabase Auth |
| `email` | text | User email |
| `display_name` | text | Optional display name |
| `avatar_url` | text | Optional avatar URL |
| `tier` | enum | `free` \| `pro` \| `teams` |
| `credits_remaining` | int | Daily/monthly message credits (free tier) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `conversations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → profiles) | Owner |
| `title` | text | Auto or user-set title |
| `agent_id` | uuid (FK, nullable) | If started from an agent |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**RLS:** `user_id = auth.uid()`.

---

### `messages`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `conversation_id` | uuid (FK → conversations) | |
| `role` | enum | `user` \| `assistant` \| `system` |
| `content` | text | Message body |
| `model` | text | Model used (if assistant) |
| `sources` | jsonb | Optional citations/sources |
| `created_at` | timestamptz | |

**RLS:** Via conversation ownership (user can only read/write messages in their conversations).

---

### `agents`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `slug` | text (unique) | e.g. `researcher`, `analyst`, `coder` |
| `name` | text | Display name |
| `description` | text | Short description |
| `category` | text | e.g. Research, Data, Code |
| `system_prompt` | text | Default system prompt |
| `default_model` | text | OpenRouter model id |
| `embedding` | vector(1536) | For pgvector search (optional) |
| `is_featured` | boolean | Show on discover |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Indexes:** `slug`, `category`, pgvector index on `embedding` for semantic search.

---

### `sources` (for citations)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `message_id` | uuid (FK → messages) | |
| `title` | text | Source title |
| `url` | text | Source URL |
| `favicon` | text | Optional favicon URL |
| `snippet` | text | Optional excerpt |
| `created_at` | timestamptz | |

**RLS:** Via message → conversation → user.

---

### `usage_logs` (optional; for limits and audit)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | |
| `action` | text | e.g. `chat`, `agent_search` |
| `model` | text | nullable |
| `metadata` | jsonb | No PII; IDs, counts only |
| `created_at` | timestamptz | |

**RLS:** User can read own; write via service role or trusted server only.

---

## Migrations

- Use Supabase migrations: `supabase/migrations/`.
- After schema changes: `npx supabase db push` (or link and push to remote).
- Never store API keys or full prompts in DB; keep logs PII-free (see [Planning — Security](Planning.md#-privacy-security--cybersecurity-top-priority)).
