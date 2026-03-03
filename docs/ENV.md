# 🔐 NEXORA — Environment Variables

Copy `.env.example` to `.env.local` and fill in the values below. **Never commit `.env.local` or real keys.**

All keys must stay **server-side only** (see [Planning — Privacy & Security](Planning.md#-privacy-security--cybersecurity-top-priority)).

---

## Required

| Variable | Description | Example / Where to get |
|----------|--------------|------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` (Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | Project Settings → API → service_role (secret) |
| `OPENROUTER_API_KEY` | OpenRouter API key for 100+ models | [openrouter.ai](https://openrouter.ai) → Keys |
| `TAVILY_API_KEY` | Tavily search API for agentic search | [tavily.com](https://tavily.com) |

---

## Optional (per feature)

| Variable | Description | When needed |
|----------|-------------|-------------|
| `FIRECRAWL_API_KEY` | Firecrawl for clean markdown scraping | Agentic search / citations (optional) |
| `STRIPE_SECRET_KEY` | Stripe secret key | Payments (Pro / Teams) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Payment webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-safe) | Checkout UI only |
| `E2B_API_KEY` | E2B sandbox for Coder agent | Code execution (P1) |

---

## Auth (if using Supabase Auth)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (client-safe for Auth) |

---

## Notes

- Prefix with `NEXT_PUBLIC_` only if the value **must** be exposed to the browser (e.g. Supabase URL, anon key, Stripe publishable). Never use it for API secrets.
- For Vercel: add the same variables in Project → Settings → Environment Variables.
- Rotate keys immediately if ever exposed or compromised.
