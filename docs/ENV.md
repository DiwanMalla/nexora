# 🔐 NEXORA — Environment Variables

Copy `.env.example` to `.env.local` and fill in the values below. **Never commit `.env.local` or real keys.**

All keys must stay **server-side only** (see [Planning — Privacy & Security](Planning.md#-privacy-security--cybersecurity-top-priority)).

---

## Required

| Variable                    | Description                                         | Example / Where to get                                |
| --------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | Supabase project URL                                | `https://xxxxx.supabase.co` (Project Settings → API)  |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only)             | Project Settings → API → service_role (secret)        |
| `GROQ_API_KEY`              | Groq API key (current default Omni provider)        | [console.groq.com](https://console.groq.com)          |
| `OPENROUTER_API_KEY`        | OpenRouter API key for 100+ models                  | [openrouter.ai](https://openrouter.ai) → Keys         |
| `TAVILY_API_KEY`            | Tavily search API for agentic search                | [tavily.com](https://tavily.com)                      |
| `BRAVE_SEARCH_API_KEY`      | Brave Search API key for secondary web verification | [brave.com/search/api](https://brave.com/search/api/) |

---

## Optional (per feature)

| Variable                             | Description                           | When needed                           |
| ------------------------------------ | ------------------------------------- | ------------------------------------- |
| `FIRECRAWL_API_KEY`                  | Firecrawl for clean markdown scraping | Agentic search / citations (optional) |
| `STRIPE_SECRET_KEY`                  | Stripe secret key                     | Payments (Pro / Teams)                |
| `STRIPE_WEBHOOK_SECRET`              | Stripe webhook signing secret         | Payment webhooks                      |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-safe)  | Checkout UI only                      |
| `E2B_API_KEY`                        | E2B sandbox for Coder agent           | Code execution (P1)                   |

### Omni provider toggle (recommended)

| Variable                                | Description                                                                | Suggested value now           |
| --------------------------------------- | -------------------------------------------------------------------------- | ----------------------------- |
| `OMNI_PROVIDER`                         | Selects Omni model backend (`groq` or `openrouter`)                        | `groq`                        |
| `OPENROUTER_OMNI_MODEL_SIMPLE`          | Optional override for simple routing model when `OMNI_PROVIDER=openrouter` | `openai/gpt-4o-mini`          |
| `OPENROUTER_OMNI_MODEL_CODING`          | Optional override for coding route model                                   | `openai/gpt-4o-mini`          |
| `OPENROUTER_OMNI_MODEL_HEAVY_REASONING` | Optional override for heavy reasoning route model                          | `anthropic/claude-3.7-sonnet` |
| `OPENROUTER_OMNI_MODEL_COMPLEX_WRITING` | Optional override for complex writing route model                          | `google/gemini-2.0-flash-001` |

---

## Auth (Clerk)

| Variable                            | Description                                  | When                                       |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (client-safe)          | Production; optional in dev (keyless mode) |
| `CLERK_SECRET_KEY`                  | Clerk secret key (server-only, never expose) | Production; optional in dev (keyless mode) |

Keyless mode: if these are unset, Clerk auto-generates dev keys so you can run the app immediately. For production, get keys from [dashboard.clerk.com](https://dashboard.clerk.com).

---

## Notes

- Prefix with `NEXT_PUBLIC_` only if the value **must** be exposed to the browser (e.g. Supabase URL, anon key, Stripe publishable). Never use it for API secrets.
- For Vercel: add the same variables in Project → Settings → Environment Variables.
- Rotate keys immediately if ever exposed or compromised.
