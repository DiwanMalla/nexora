# Live Assist Model TODO Report

## Goal

Implement a reliable live-assist experience with tiered model access:

- Free users: Groq models
- Paid users: OpenRouter models

This report captures follow-up work to make the current best-effort path production-ready.

## Current Direction

- Best-effort web-assisted mode is enabled for unsupported tool-flow models.
- Retrieval should run first (Tavily/Brave), then pass compact evidence into generation.
- Responses should avoid claiming full grounding unless strict enforcement is active.

## TODO: Live Assist Reliability

- [ ] Add retrieval result quality scoring (high / medium / low) before final generation.
- [ ] Add final-answer validator for stale fallback patterns (cutoff/training-data language when retrieval succeeded).
- [ ] Retry generation with stricter prompt when validator fails.
- [ ] Add explicit "evidence coverage" checks:
  - [ ] minimum distinct domains
  - [ ] minimum non-empty snippets
  - [ ] conflict detection summary in output
- [ ] Add server-side telemetry events for:
  - [ ] retrieval success/failure by provider (Tavily/Brave)
  - [ ] grounding guard retries
  - [ ] fallback reason classification

## TODO: Free vs Paid Model Access

- [ ] Define subscription gate contract:
  - [ ] `free` => allow Groq model list only
  - [ ] `paid` => allow OpenRouter + Groq model list
- [ ] Add user-tier lookup at request entry for:
  - [ ] `/api/chat`
  - [ ] `/api/omni-agent`
- [ ] Enforce allowed-model list server-side (never trust client-selected model).
- [ ] Add safe fallback behavior:
  - [ ] if user selects disallowed model, auto-map to default allowed model
  - [ ] return metadata showing model was remapped
- [ ] Add UX badges in model picker:
  - [ ] "Free" or "Pro"
  - [ ] locked state + upgrade CTA for paid-only models

## TODO: Data / Auth / Billing Integration

- [ ] Add a canonical `plan_tier` source of truth (profile/subscription table or billing webhook sync).
- [ ] Ensure plan tier is available in API auth context.
- [ ] Add test fixtures for free and paid accounts.
- [ ] Add migration notes and rollback plan for tier rollout.

## TODO: Product Behavior Rules

- [ ] If retrieval succeeds, answer must be evidence-led.
- [ ] If retrieval is weak/conflicting, answer must explicitly say so.
- [ ] If retrieval fails, return truthful failure state (no faux-grounded language).
- [ ] Do not display "Grounded" UI unless strict grounding checks passed end-to-end.

## TODO: QA Checklist

- [ ] Free user + current-events prompt on Groq => useful best-effort web-assisted answer.
- [ ] Paid user + same prompt on OpenRouter => strict grounded path where supported.
- [ ] Free user selecting OpenRouter model => server remaps + user-visible notice.
- [ ] History reload preserves metadata and does not show incorrect grounded badges.
- [ ] Streaming and non-streaming paths produce equivalent markdown rendering quality.

## TODO: Launch Plan

- [ ] Phase 1: Soft launch best-effort mode + telemetry only.
- [ ] Phase 2: Enable strict grounding validator + retry for top live-intent prompts.
- [ ] Phase 3: Enforce tiered model gating in production UI + APIs.
- [ ] Phase 4: Evaluate quality metrics and adjust default models per tier.

## Notes

- Keep user trust prioritized over completeness.
- Prefer honest uncertainty over fabricated certainty.
- Treat "successful retrieval + stale prior-based answer" as a critical defect class.
