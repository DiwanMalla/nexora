# Changelog

All notable updates to the Nexora project are documented here. Format is summary-first with clear categories.

---

## Current status

| Area | Status |
|------|--------|
| **Auth** | Clerk integrated; sign-in/sign-up; protected routes; redirect to workspace when logged in |
| **Landing** | Full marketing homepage (hero, features, agents, CTA, FAQ, footer); public routes for Features, Pricing, Blog, Privacy, Terms |
| **Workspace** | Logged-in dashboard with sidebar, command bar, agent tiles, and placeholder Inbox/Drive |
| **Docs** | Planning, Architecture, ENV, Milestones, API, Agents, etc.; single-page docs browser (`docs.html`) |

**Next (M1):** `/api/chat` + streaming, basic chat UI, conversation persistence in Supabase.

---

## Authentication

- **Clerk** chosen as auth provider (replacing Supabase Auth for identity).
- **`@clerk/nextjs`** installed; `ClerkProvider` wraps the app in the root layout.
- **Middleware** (`src/middleware.ts`) uses `clerkMiddleware` and `createRouteMatcher`; public routes: `/`, `/sign-in`, `/sign-up`, `/docs`, `/docs/*`, `/features`, `/pricing`, `/blog`, `/privacy`, `/terms`, `/api/webhooks/*`; all other routes require sign-in.
- **Sign-in / Sign-up** pages at `/sign-in` and `/sign-up` using Clerk components; Nexora violet styling via `appearance.variables`.
- **Nav** shows “Sign in” / “Get started” when signed out; “Workspace” + `UserButton` when signed in.
- **Redirect:** Logged-in users visiting `/` are redirected to `/workspace`.
- **Docs:** Planning.md, MILESTONES.md, ENV.md, and Architecture.md updated to reference Clerk; `.env.example` includes optional `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (keyless dev supported).

---

## Landing & marketing

- **Hero** section with gradient headline (Search / Understand / Act), pill badge, primary/secondary CTAs, and a product-preview card (sample query, AI response with citations, Execution Blocks, model badge).
- **Background and visuals:** Aurora gradient mesh, grain overlay, dot grid; section dividers; pill badges; glass cards; animated gradient border on selected elements.
- **Features** section in three parts: (1) agent flow visualization (User Query → Router → Researcher → Verify → Execution Blocks), (2) model transparency (side-by-side model cards with selection and score bars), (3) feature grid (Multi-Model Canvas, Verifiable Search, Intelligent Routing, Execution Blocks, Model Transparency, Privacy by Design).
- **Agents showcase** with categories (Core, Creative, Media, Productivity) and agent tiles (Researcher, Analyst, Coder, Content Writer, Image Gen, etc.).
- **CTA** section (“Stop searching. Start acting.”) with Start Free and Read the Docs.
- **FAQ** section with expandable items (differentiators, models, Execution Blocks, data safety, pricing, custom agents).
- **Footer** with brand, Product/Resources/Company link columns, socials (Twitter, Discord, GitHub), and bottom bar (copyright, Privacy, Terms).
- **Nav:** Scroll-aware header, mobile menu, Nexora logo (hexagon + gradient), links to Features, Pricing, Docs, Blog; focus states and accessibility preserved.
- **Typography & theme:** Syne (display) and DM Sans (body); CSS variables for `--bg`, `--text-muted`, `--text-dim`, `--violet`, `--violet-light`, `--cyan`, `--cyan-light`; Tailwind extended with `violet.light` and `cyan.light`.

---

## Workspace (logged-in dashboard)

- **Dashboard layout** with top bar (Nexora Workspace title, Upgrade CTA), left sidebar (New, Home, AI Inbox, Hub, AI Drive, UserButton at bottom).
- **Workspace home** (`/workspace`): Command bar (“Ask anything, create anything”) with +, settings, mic, send; “Nexora supports personalized tools” and integration icons (Gmail, Calendar, Drive, Teams); agent tiles (Researcher, Analyst, AI Developer, AI Chat, AI Docs, All Agents); promo card (“Don’t type, just speak”).
- **Placeholder routes** `/inbox` and `/drive` with same dashboard layout and “Coming soon” content.
- **Middleware:** `/workspace`, `/inbox`, `/drive` are protected (require sign-in).

---

## Documentation & routes

- **Public marketing routes** added so nav and footer do not 404 or force sign-in: `/features`, `/pricing`, `/blog`, `/privacy`, `/terms` (each with Nav and placeholder or short content).
- **Middleware** updated so `/features`, `/pricing`, `/blog`, `/privacy`, `/terms`, and `/docs(.*)` are public.
- **CHANGELOG.md** (this file) added to record updates in a single place.
- **Docs index:** Readme.md and docs.html updated to list CHANGELOG and DEPENDENCIES where relevant.

---

## Bug fixes & polish

- **Framer Motion variants:** `ease: [0.16, 1, 0.3, 1]` typed as `ease: [0.16, 1, 0.3, 1] as const` in HeroSection, FeaturesSection, AgentsShowcase, CTASection, and FAQSection to satisfy TypeScript `Easing` type.
- **Middleware** syntax cleaned (removed stray comma in `isPublicRoute` array).

---

## Doc references

| Document | Purpose |
|----------|---------|
| [Readme.md](Readme.md) | Project overview, quick start, structure, architecture diagram |
| [Planning.md](Planning.md) | Vision, P0–P3, security, monetization |
| [Architecture.md](Architecture.md) | System overview, data flows, tech decisions |
| [MILESTONES.md](MILESTONES.md) | M1–M5 build phases |
| [ENV.md](ENV.md) | Environment variables (Clerk, Supabase, OpenRouter, etc.) |
| [DEPENDENCIES.md](DEPENDENCIES.md) | npm packages and agent skills (skills.sh) |
| [CHANGELOG.md](CHANGELOG.md) | This file — what’s been done |

For the full doc set and single-page browser, open **docs/docs.html** from the `docs/` folder.
