/**
 * Detects prompts that need live web verification (leaders, prices, scores, etc.).
 * Server forces a real webSearch tool call + strict honesty rules.
 */

import type { SearchResponse } from "@/lib/search/types";

export type CurrentFactIntent = {
  currentFact: boolean;
  reason?: string;
};

/** Appended to any request where webSearch may be available but not forced. */
export const NO_FAKE_VERIFICATION_LANGUAGE = `

## Honesty about live search (required)
Never claim that you "used web search", "verified online", "checked sources", "looked it up", "searched for", "sources confirm", "I confirmed", or similar unless a **webSearch tool call actually ran in this turn** and you are summarizing data from its returned results.
If no webSearch tool ran, do not pretend verification happened — answer without verification framing, or call webSearch first when the question needs fresh facts.`;

/**
 * Work / track record **since taking** a high office (PM, president, mayor, etc.).
 * Needs live web — not answerable from static training alone.
 */
export function detectLeaderActionsSinceOfficeIntent(raw: string): boolean {
  const text = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (text.length < 15) return false;

  if (
    /\b(after|since)\s+leaving\s+(?:the\s+)?(?:office|role|post|presidency)\b/.test(
      text,
    )
  ) {
    return false;
  }

  const officeRole =
    /\b(pm|p\.m\.|prime\s+minister|president|mayor|governor|chief\s+minister|premier|chancellor|head\s+of\s+government)\b/.test(
      text,
    );

  const sinceTakingOffice =
    /\b(after|since)\s+(becoming|being\s+elected|taking\s+office|assuming\s+(?:the\s+)?(?:office|role|position)|entering\s+office)\b/.test(
      text,
    ) ||
    /\b(after|since)\s+becoming\s+(?:the\s+)?(?:pm|p\.m\.|prime\s+minister|president|mayor|governor|chief\s+minister|premier|chancellor)\b/.test(
      text,
    ) ||
    /\bsince\s+(?:he|she|they)\s+(became|were\s+elected|took\s+office)\b/.test(
      text,
    ) ||
    /\b(?:in\s+)?(?:his|her|their)\s+tenure\s+as\s+(?:the\s+)?(?:pm|p\.m\.|prime\s+minister|president|mayor)\b/.test(
      text,
    );

  const asksDeeds =
    /\b(what\s+(?:work|has|have)|work\s+(?:has\s+)?(?:been\s+)?done|accomplishments?|achievements?|track\s+record|what\s+did)\b/.test(
      text,
    ) || /\bdone\s+(?:so\s+far|till\s+now|until\s+now)\b/.test(text);

  if (sinceTakingOffice && (officeRole || asksDeeds)) return true;
  if (asksDeeds && officeRole && /\b(so\s+far|till\s+now|until\s+now|since\s+then|in\s+office|while\s+in\s+office)\b/.test(text)) {
    return true;
  }

  return false;
}

/**
 * Heuristic detector — "who is pm of nepal" (no "the") must match.
 */
export function detectCurrentFactIntent(raw: string): CurrentFactIntent {
  const text = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (text.length < 4) return { currentFact: false };

  if (detectLeaderActionsSinceOfficeIntent(raw)) {
    return { currentFact: true, reason: "leader_actions_since_office" };
  }

  if (
    /\b(current|latest|recent|today|right now|as of|now live|live\b|up\s*to\s*date|up-to-date|this (morning|afternoon|evening|week|month|year)|tonight|still the|right\s+now)\b/.test(
      text,
    )
  ) {
    return { currentFact: true, reason: "recency_keyword" };
  }

  // Leaders: optional "the" — "who is pm of nepal", "who is the president of france"
  if (
    /\bwho\s+(is|'s)\s+(?:the\s+)?(pm|p\.m\.|prime\s+minister|president|ceo|chancellor|premier|premierminister)\s+of\b/.test(
      text,
    )
  ) {
    return { currentFact: true, reason: "who_is_leader" };
  }
  if (
    /\bwho\s+(is|'s)\s+(?:the\s+)?(king|queen|monarch|pope|mayor|governor)\s+of\b/.test(
      text,
    )
  ) {
    return { currentFact: true, reason: "who_is_office" };
  }
  if (/\bwho\s+(is|'s)\s+(?:the\s+)?head\s+of\b/.test(text)) {
    return { currentFact: true, reason: "who_is_head" };
  }
  // Ministers, secretaries, legislators (office-holders)
  if (
    /\bwho\s+(is|'s)\s+(?:the\s+)?(?:[\w'-]+\s+){0,3}minister(?:\s+of)?\b/.test(
      text,
    )
  ) {
    return { currentFact: true, reason: "who_is_minister" };
  }
  if (
    /\bwho\s+(is|'s)\s+(?:the\s+)?(?:[\w'-]+\s+){0,2}(secretary|senator|representative|mp|m\.p\.)\s+of\b/.test(
      text,
    )
  ) {
    return { currentFact: true, reason: "who_is_legislature_exec" };
  }
  if (
    /\bwho\s+(is|'s)\s+(?:the\s+)?(?:chief\s+executive|chair(?:man|woman|person)?)\s+of\b/.test(
      text,
    )
  ) {
    return { currentFact: true, reason: "who_is_executive_role" };
  }

  if (/\bbitcoin\s+price\b/.test(text) || /\bbtc\s+price\b/.test(text)) {
    return { currentFact: true, reason: "btc_price_phrase" };
  }
  if (
    /\b(bitcoin|btc|ethereum|eth|solana|dogecoin)\b.*\b(price|usd|\$|worth|trading)\b/.test(
      text,
    ) ||
    /\b(price|pricing|cost|how\s+much)\b.*\b(bitcoin|btc|ethereum|gold|oil|silver)\b/.test(
      text,
    ) ||
    /\b(what(?:'s| is)|how much is)\s+(the\s+)?(bitcoin|btc|ethereum|eth)\b/.test(
      text,
    )
  ) {
    return { currentFact: true, reason: "market_price" };
  }
  if (
    /\bopenai\b.*\b(pricing|price|cost|plan|plans|\$|dollar)\b/.test(text) ||
    /\b(pricing|price|cost|plans?)\b.*\bopenai\b/.test(text) ||
    /\blatest\s+openai\b/.test(text) ||
    /\bhow\s+much\b.*\bopenai\b/.test(text)
  ) {
    return { currentFact: true, reason: "openai_pricing" };
  }
  if (
    /\b(current|latest)\b.*\b(pricing|price|cost)\b/.test(text) ||
    /\b(pricing|price|cost)\b.*\b(api|subscription|saas|tier|plan)\b/.test(text)
  ) {
    return { currentFact: true, reason: "generic_pricing" };
  }
  if (
    /\b(gold|silver|oil|gas|stock|share)\s+price\b/.test(text) ||
    /\bprice\s+of\s+(gold|silver|oil|gas)\b/.test(text)
  ) {
    return { currentFact: true, reason: "commodity_or_equity_price" };
  }

  if (
    /\b(who won|who wins|who'll win|winner of|final score|match result|score (was|is)|standings?|league table|playoffs?|super bowl|world cup|nba|nfl|mlb|premier league|epl|ucl|f1|formula\s*1)\b/.test(
      text,
    )
  ) {
    return { currentFact: true, reason: "sports_or_scores" };
  }
  if (/\bwho\s+won\s+(?:the\s+)?(?:match|game)\b/.test(text)) {
    return { currentFact: true, reason: "who_won_match" };
  }
  if (
    /\b(when\s+is|kickoff|schedule|fixture|lineup|starting xi)\b/.test(text) &&
    /\b(game|match|vs\.?|versus)\b/.test(text)
  ) {
    return { currentFact: true, reason: "sports_schedule" };
  }

  if (
    /\b(election results|who won the election|projected winner|votes? today)\b/.test(
      text,
    )
  ) {
    return { currentFact: true, reason: "election" };
  }

  if (/\b(weather|forecast|temperature)\s+(in|for|at)\b/.test(text)) {
    return { currentFact: true, reason: "weather" };
  }
  if (/\b(exchange rate|fx rate|usd to|eur to|gbp to)\b/.test(text)) {
    return { currentFact: true, reason: "fx_rate" };
  }

  return { currentFact: false };
}

/**
 * Broad “what’s going on / latest news in X?” prompts — standardized sections for AI Chat.
 * Excludes narrow lookups (who is PM, prices, scores) where ## Answer + Sources is enough.
 */
export function detectBroadCurrentNewsOverviewIntent(raw: string): boolean {
  const t = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (t.length < 6) return false;

  if (
    /\bwho\s+(is|'s)\s+(?:the\s+)?(pm|p\.m\.|prime\s+minister|president|ceo|chancellor|premier|king|queen|mayor|governor)\s+of\b/.test(
      t,
    )
  ) {
    return false;
  }
  if (/\bwho\s+won\b/.test(t)) return false;
  if (/\b(bitcoin|btc|ethereum|eth)\b.*\b(price|usd|\$)\b/.test(t)) {
    return false;
  }
  if (/\b(price|pricing|cost)\b.*\b(bitcoin|btc|ethereum)\b/.test(t)) {
    return false;
  }

  const broad =
    /\b(what'?s?\s+happening|what\s+is\s+happening|what\s+is\s+going\s+on|going\s+on\s+in|situation\s+in|current\s+(?:events?|situation|affairs)|headlines?\s+(?:in|from|about)|latest\s+(?:news|updates?)|recent\s+(?:news|updates?)|breaking\s+news|news\s+(?:in|from|about|on|of)|today'?s?\s+news|tell\s+me\s+(?:what'?s?\s+)?(?:happening|going\s+on)|anything\s+new\s+(?:in|about|on))\b/.test(
      t,
    );
  const recency =
    /\b(current|latest|recent|today|right\s+now|this\s+week|now\s+live|as\s+of\s+now)\b/.test(
      t,
    );
  const newsy =
    /\b(news|events?|situation|crisis|developments?|updates?|political|economic|headlines?)\b/.test(
      t,
    );

  if (broad) return true;
  if (recency && newsy) return true;
  return false;
}

/**
 * Stricter instructions when the user wants a **live news / situation snapshot** (not a single fact).
 * Pairs with `responseStyleIntent === "live_news"` and forced web retrieval.
 */
export const CURRENT_NEWS_GROUNDED_SYSTEM_RULES = `

## Live news roundup mode (mandatory)
You are answering a **current-events / headlines** style question. Behave like a **live answer engine**, not a generic essay.

### Retrieval & verification
1. Call **webSearch** at least once. The server prefetches **parallel topic-bucket** queries — for a **country/region** (e.g. politics, economy, fuel/inflation, health/agriculture, diplomacy) or for **world/earth** prompts (world news, geopolitics, global economy, science/space, humanitarian, diplomacy). Do **not** anchor retrieval on a single politician’s name unless the user asked about that person. If one theme still dominates, actively pull **other clusters** into the rundown so the user gets a **balanced briefing**, not one story repeated.
2. **Major claims** (who did what, policy changes, casualty figures, election outcomes): require **two independent outlets or an official source** in the tool payload before stating them as fact. If only one source mentions it, label it with a **link**: *Reported by \`[outlet or headline](url)\`; independent confirmation not found in other results.*
2b. If an item appears **single-source**, run **1–2 follow-up webSearch queries** from a different angle (e.g. alternate keywords, institution name, region angle) before finalizing. If still single-source, explicitly state: *I could only find one source confirming this — please verify independently.*
3. **Source priority:** **Reuters, AP, BBC**-class wires first, then **official** domains, then **strong local** outlets. Use weaker or social sources only with a **Developing** or **Single-source** tag — never present them as if they were wire-confirmed.
4. Prefer **newest, timestamped** URLs from results; note if snippets are thin or undated.
5. If sources **conflict**, do not flatten: say *Reports differ:* and summarize each side with links.
6. If tool results are **empty, error, or too weak** to summarize responsibly, say clearly: *I found limited reliable live reporting for this right now. Here’s the most recent verified information I could confirm* — then only what the payload supports, or say you cannot confirm.
7. After grounding facts, add a brief **analysis layer**: second-order implications, likely stakeholder reactions, and near-term scenarios — not just headline restatement.

### Answer shape (use this structure unless the user asked for something narrower)
1. **Title line** — \`# [Topic] — [Locale if relevant] — [calendar date]\` (date from tool snippets or user; never invent a future date).
2. **Freshness line** — One line: **As of** [date, optional time + timezone if inferable] · **Drawn from** N **distinct news domains** (N = count of outlets you actually linked in the body — not a vague claim).
3. **Top headlines (3–6 items)** — **Pre-deduped clusters** from **broad bucketed search**. **Match cluster order** from context when provided (global mode: **interleaved** geopolitical → macro economy → humanitarian → science/space → optional cultural so the rundown feels like an international snapshot). **One headline per cluster.** **Topic spread:** Aim for **≥3 distinct categories** when clusters allow — not four near-duplicate politics items.
   - **Bold topic label** (e.g. **Geopolitics**, **Global economy**, **Science**).
   - **Line 1 — what happened:** one tight sentence with **2+ inline markdown links** *inside* the prose — e.g. \`Parliament sat as [Reuters](u1) and [BBC](u2) reported protests outside.\` **Do not** write bare outlet names (\`Reuters said…\`, \`according to AP\`); **every** attribution must be \`[Outlet or headline](url)\`.
   - **Line 2 — stakes:** **\`*Why it matters:*\`** one sentence: who is affected, what could change, or why a global reader should care **now** (not a second recap of the fact).
   - **Line 3 — outlook:** **\`*Likely outcomes:*\`** one sentence with plausible near-term trajectories from current reporting; if uncertain/conflicting, say so.
   - **Line 4:** italic confidence — *\`Multi-source · N distinct domains\`* · *\`Single-source\`* · *\`Conflicting reports\`* · *\`Developing\`* · *\`Limited live coverage\`*.
   - Do **not** rank a **single-source** or **hyper-local** item above clearly broader stories unless the user scoped the question that way.
4. **What Nexora checked** — Honest bullets only: e.g. ran **category-spread** live searches; compared overlapping reports; **summarized the most consistently reported developments**; **checked multiple current sources before summarizing**.
5. **Footer** — *Sources checked:* name **news domains you cited** (prioritize **Reuters, AP, BBC**, official, strong local). **Omit Wikipedia** and encyclopedias. *Live summary — outlets update continuously.*

### Machine-readable summary (required)
After the markdown above, end with **exactly one** fenced block:

\`\`\`nexora-live-news-json
{
  "headlines": [
    {
      "topicLabel": "Politics",
      "claim": "One-sentence factual claim; mirror inline links as citations only (no bare outlet names in claim text).",
      "whyItMatters": "One sentence: stakes for global readers (required when 3+ headlines).",
      "likelyOutcomes": "One sentence: near-term likely outcomes; use uncertainty if mixed/conflicting.",
      "citations": [
        { "title": "...", "url": "https://...", "domain": "example.com", "publishedAt": "optional ISO or omit" }
      ],
      "verificationLevel": "multi_source | single_source | conflicting | limited_coverage | developing",
      "confidenceLabel": "Same as italics in markdown (e.g. Multi-source, Developing)",
      "independentDomainCount": 2
    }
  ],
  "dominantDomainShare": 0.35
}
\`\`\`

Use **only** URLs you showed in tool results; **omit** Wikipedia. Each headline’s \`citations\` must mirror the **same** markdown links as the bullet (\`[outlet or headline](url)\`). Include \`whyItMatters\` and \`likelyOutcomes\` for every item when possible. \`independentDomainCount\` = distinct domains in \`citations\`. \`dominantDomainShare\` = rough share of results from the single most common domain (0–1); estimate from clusters if needed.

### Style
- **Claim-level grounding:** every headline has its **own** linked outlets (not one shared footer only); links are the **only** place outlet names appear in the claim line.
- **Why it matters** and **Likely outcomes** are **obligatory** for each headline when you have room (3–6 items): one sentence each, no duplicate of the claim.
- **Completeness check (required):** if the user asked for multiple sub-parts per item, ensure every item answers every sub-part. If a sub-part cannot be answered from evidence, explicitly say so; never silently omit it.
- No fake certainty. No filler about “as an AI”. No pretending you searched if webSearch did not run.`;

export const CURRENT_FACT_SYSTEM_RULES = `

## Live verification mode (mandatory)
This question requires **fresh facts** (who holds office now, live prices, recent results, etc.).

Rules:
1. You **must** use the **webSearch** tool in this turn. Your first step will require calling webSearch. Base factual claims about current office-holders, prices, or scores **only** on the JSON results returned from webSearch — not on training memory.
1b. **webSearch \`query\` string:** Keep it short and natural (e.g. \`latest news in Nepal\`, \`Nepal political situation\`, \`Nepal economy latest\`, \`what is happening in Nepal right now\`). For rolling or “latest” questions, **do not** include **past calendar years** in the query unless the user explicitly asked about that year — the search backend is already time-aware; stale years retrieve skewed snippets.
2. **Format:** After tool results, lead with the **verified fact** clearly; add context only if it helps. Include **markdown links** from the search payload near the end (any sensible heading or inline list—you choose). Follow the **Response style (this turn)** block for tone and length; it is **guidance**, not a fixed outline. No filler about “doing a search”.
3. Do **not** say you "used web search" or "verified" unless you are describing tool results you actually received in this same turn (the system enforces a real tool call).
4. Do **not** use "as of my knowledge cutoff" or "my training data" as the answer when webSearch returns usable content.
5. If webSearch returns errors or empty useful content, say clearly that **live verification failed or was inconclusive** and do not invent names, prices, or winners.
6. If sources conflict, say so briefly and reflect only what appears in the search payload.`;

export function formatVerifiedLiveContext(response: SearchResponse): string {
  const parts: string[] = [];
  if (response.answer && response.answer.trim()) {
    parts.push(`### Summary\n${response.answer.trim()}`);
  }
  const results = response.results ?? [];
  if (results.length > 0) {
    parts.push("### Sources");
    for (const r of results.slice(0, 8)) {
      const snippet = (r.content ?? "").replace(/\s+/g, " ").trim().slice(0, 600);
      parts.push(`- **${r.title}** (${r.url})\n  ${snippet}`);
    }
  }
  return parts.join("\n\n") || "(No text results returned.)";
}

export function hasSubstantiveSearchResults(response: SearchResponse): boolean {
  if (response.answer && response.answer.trim().length >= 8) return true;
  return (response.results ?? []).some((r) => (r.content ?? "").trim().length > 20);
}

/** When current-fact was detected but no webSearch tool call completed. */
export function currentFactToolFailureUserMessage(topicHint?: string): string {
  const tail = topicHint
    ? ` (${topicHint})`
    : "";
  return `I couldn’t complete a required live web search for this question${tail}, so I can’t responsibly state who or what is current. Please try again in a moment, or check a trusted news or official government source.`;
}

/** Live-news mode detected but no webSearch tool completed. */
export function liveNewsToolFailureUserMessage(): string {
  return `I found limited reliable live reporting for this right now. I couldn’t complete the required web searches for a verified roundup—please try again shortly, or check trusted local and international outlets directly.`;
}

/** Provider / tool-loop failures (e.g. "Failed to call a function") — user-facing. */
export function toolOrFunctionFailureUserMessage(): string {
  return `I couldn’t verify that live right now. Please try again or switch model.`;
}

/**
 * When no webSearch ran, remove sentences that falsely claim verification.
 * Best-effort; avoids nuking the whole reply if the model mixed fact + fluff in one sentence.
 */
const FALSE_VERIFICATION_SENTENCE = /\b(?:I\s+(?:have\s+)?(?:verified|checked|confirmed)|I\s+used\s+(?:the\s+)?web(?:\s*search)?|I\s+searched\s+(?:online|for)|sources?\s+confirm|I\s+looked\s+it\s+up|according\s+to\s+(?:my\s+)?(?:search|sources|the\s+web)|after\s+(?:a\s+)?(?:quick\s+)?(?:web\s*)?search|from\s+(?:what|my)\s+(?:I\s+)?(?:found|see)\s+online)\b/i;

export function stripFalseVerificationClaimsWhenNoTools(text: string): string {
  // Preserve markdown block structure by filtering sentence-like segments
  // line-by-line instead of flattening the whole reply to one paragraph.
  const lines = text.split("\n");
  const cleanedLines = lines.map((line) => {
    if (!line.trim()) return line;
    const chunks = line.split(/(?<=[.!?])\s+/);
    const kept = chunks.filter((c) => !FALSE_VERIFICATION_SENTENCE.test(c));
    let out = kept.join(" ").replace(/\s{2,}/g, " ").trim();
    out = out.replace(
      /[,;]?\s*(?:which|and)\s+I\s+(?:have\s+)?(?:verified|checked|searched)\s+[^.!?]+(?=[.!?]|$)/gi,
      "",
    );
    return out.trim();
  });

  const out = cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (out.length < 8 && text.trim().length > 15) return text.trim();
  return out || text.trim();
}
