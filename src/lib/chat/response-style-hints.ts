/**
 * AI Chat — task-aware response shaping (guidance only, not rigid templates).
 * Categories drive soft system hints; the model picks headings, flow, and tone.
 */

import type { CurrentFactIntent } from "./current-fact";
import {
  detectBroadCurrentNewsOverviewIntent,
  detectLeaderActionsSinceOfficeIntent,
} from "./current-fact";

export type ChatResponseStyleIntent =
  | "current_fact"
  | "leader_since_office"
  | "live_news"
  | "calculation"
  | "repo_inspection"
  | "teaching"
  | "writing"
  | "coding"
  | "comparison"
  | "general_chat";

function normalizeUserText(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Single primary intent for this turn (priority: specific task shapes first,
 * then live news vs narrow current-fact, then teaching, then general).
 */
export function classifyChatResponseStyleIntent(
  lastUserText: string,
  factIntent: CurrentFactIntent,
): ChatResponseStyleIntent {
  const t = normalizeUserText(lastUserText);
  if (t.length < 2) return "general_chat";

  const repoRef =
    /\b(this|our|the)\s+(repo|repository|codebase|project)\b/.test(t);
  if (
    /\b(inspect|review|scan|walk)\s+(through\s+)?(the\s+)?(repo|repository|codebase|code|project|implementation|files?)\b/.test(
      t,
    ) ||
    (repoRef &&
      /\b(read|show|what'?s?\s+in|implemented|wiring|src\/|package\.json|tsconfig|schema)\b/.test(
        t,
      )) ||
    /\b(what'?s?\s+(actually\s+)?implemented|is\s+.*\s+(wired|implemented)\s+in\s+(the\s+)?(code|codebase|repo))\b/.test(
      t,
    )
  ) {
    return "repo_inspection";
  }

  if (
    /\b(calculate|compound|interest|revenue|roi|npv|irr|discount\s+rate|cagr|break-?even|profit|margin|amortization|loan|present\s+value|future\s+value|exceeds?|first\s+year)\b/.test(
      t,
    ) ||
    /\b\d+(\.\d+)?\s*[%$]/.test(t)
  ) {
    return "calculation";
  }

  if (
    /\b(debug|debugger|stack\s+trace|error\s+ts\d+|typescript\s+error|eslint|syntax\s+error|uncaught|segmentation\s+fault)\b/.test(
      t,
    ) ||
    /\b(how\s+do\s+i\s+(write|fix|implement|add|remove)|fix\s+this\s+(code|bug|error)|refactor\s+this)\b/.test(
      t,
    ) ||
    (/\b(function|class|interface|async|await|import\s+from|useEffect|useState|def\s+\w+)\b/.test(
      t,
    ) &&
      /\b(how|why|fix|error|bug|broken|not\s+working|throws?)\b/.test(t))
  ) {
    return "coding";
  }

  if (
    /\b(draft|compose|write\s+(me\s+)?(an?\s+)?(email|letter|essay|blog\s*post|post|tweet|linkedin|memo|speech|proposal|job\s+description|outline))\b/.test(
      t,
    ) ||
    /\b(in\s+the\s+style\s+of|professional\s+tone|casual\s+tone|formal\s+letter)\b/.test(
      t,
    )
  ) {
    return "writing";
  }

  if (
    /\b(compare|comparison|vs\.?|versus|better\s+than|pros\s+and\s+cons|trade-?offs?|which\s+(one\s+)?(should|to)\s+(pick|choose|use)|side\s*by\s*side)\b/.test(
      t,
    )
  ) {
    return "comparison";
  }

  if (detectLeaderActionsSinceOfficeIntent(lastUserText)) {
    return "leader_since_office";
  }

  if (detectBroadCurrentNewsOverviewIntent(lastUserText)) {
    return "live_news";
  }

  if (factIntent.currentFact) {
    return "current_fact";
  }

  if (
    /\b(explain\s+(like\s+i'?m\s+five|to\s+a\s+beginner|simply)|eli5|teach\s+me(\s+about)?|for\s+dummies|grade\s*6|middle\s+school\s+level)\b/.test(
      t,
    ) ||
    (/\bwhat\s+(is|are)\s+/.test(t) &&
      /\b(in\s+simple\s+terms|basically|intuition|plain\s+english)\b/.test(t))
  ) {
    return "teaching";
  }

  return "general_chat";
}

const STYLE_GUIDANCE: Record<ChatResponseStyleIntent, string> = {
  current_fact: `**Aim:** A **verified, time-sensitive fact** (who holds office, live figure, result, etc.).
**Structure:** Your choice—keep it natural. Usually a **short lead** with the fact, then only extra context if useful. If **webSearch** returned URLs, end with a compact set of **markdown links** (any sensible heading or none if the reply is one line). **Vary** how you label sections so answers don’t feel repetitive.`,
  leader_since_office: `**Aim:** What a **leader or public figure has done after taking** (or while in) **a specific office**—not a biography dump.
**Discipline (critical):**
- **Do not** blend into one pile: (1) **confirmed actions in the role asked about**, (2) **announced priorities / bills / proposals** (not yet done), (3) **campaign promises**, (4) **prior career** (e.g. earlier mayor terms). Each belongs in a **different bucket**.
- **Answer the timeframe** the user asked (e.g. “after becoming PM”). Prior roles (e.g. Kathmandu mayor) go only in a **short, clearly labeled** section like **Earlier career (before this role)**—one tight paragraph max unless the user asked for it.
- **Evidence:** Prefer phrasing like “reported / according to [outlet] / official statement” from search results. Flag **speculative or thinly sourced** claims; do not state precise stats as hard fact unless the snippet supports them.
**Preferred sections (use these headings or very close equivalents):**
1. **Direct answer** — 2–4 sentences: the bottom line for the user’s timeframe.
2. **Confirmed early actions** — deeds that are **documented** as done (law passed, order issued, visit held), with light attribution.
3. **Announced priorities / proposals** — plans, bills, rhetoric **not yet** established as completed.
4. **What is too early to judge** — tenure length, pending items, disputed reporting.
5. **Sources** — markdown links from **webSearch** results only.
**Markdown:** For GDP, per capita, or any numbers, use a **proper** pipe table (header row + \`| --- |\` separator row) **or** lines like **GDP (reported):** … — **never** stray \`|\` characters inside normal prose (that breaks rendering).`,
  live_news: `**Aim:** **Live answer engine** — broad **topic-bucket** retrieval, **≥3 themes** when possible, **global snapshot** ordering (interleaved lenses when context says so), **one \`*Why it matters:*\` line per headline**, and **claim text that uses only \`[outlet](url)\` links** (no bare wire names).
**Structure:** Follow the **Live news roundup** system block; prefer **Multi-source / Single-source / Conflicting reports / Developing** labels over heavy “verified” language.`,
  calculation: `**Aim:** Accurate, presentation-quality math/business calculation.
**Required structure:** (1) **Direct answer** first, (2) **Formulas used**, (3) **Step-by-step calculation**, (4) **Final result(s)**.
**Math formatting:** Use KaTeX-compatible markdown math delimiters (\`$...$\` inline, \`$$...$$\` display). Do **not** output raw bracket delimiters like \`[ ... ]\`.
**Display fallback:** If math rendering may be unsupported, provide a plain-text formula line immediately after each equation (example: \`Revenue_5 = 200,000 * (1.15^5)\`).
**Quality rules:** No contradictory scratch checks, no repeated reasoning loops, no unresolved internal debate in final output. If assumptions are needed, state them once clearly.`,
  repo_inspection: `**Aim:** **Codebase / project** questions without pretending you opened files unless this chat actually provided file content.
**Structure:** Separate **what you can support** from **what’s uncertain**. Omni-style **verified / planned / unclear** framing is allowed but **not required**—use whatever headings help. Don’t claim files were read if they weren’t in context.`,
  teaching: `**Aim:** **Explain or teach** at the level the user asked for.
**Structure:** Concept → intuition → **example** (or worked mini-example). Headings optional; use them when length makes them useful. No fake “I verified online” unless a tool actually ran.`,
  writing: `**Aim:** **Produce the requested written artifact** (email, post, etc.).
**Structure:** Deliver the **draft or final copy** in the requested style; minimal meta. Use formatting that fits the genre (salutation, paragraphs, etc.).`,
  coding: `**Aim:** **Code or technical fix** help.
**Structure:** Short **explanation** if needed, then **code** in fenced blocks with language tags; numbered steps only when they clarify. Don’t fabricate APIs or errors.`,
  comparison: `**Aim:** **Compare options** fairly.
**Structure:** Often a **table** helps, plus a **concise recommendation** if appropriate—headings are yours. If you lack data, say so instead of guessing.`,
  general_chat: `**Aim:** **General** question or conversation.
**Structure:** **Adaptive**—match length to the ask. Use headings/lists when the answer is long enough to benefit; skip for short replies. Stay clear and direct.`,
};

/**
 * System block appended after trust/search rules. Guidance only—not a template engine.
 */
export function buildAdaptiveResponseStyleSystemBlock(
  intent: ChatResponseStyleIntent,
): string {
  return `

---
## Response style (this turn)
${STYLE_GUIDANCE[intent]}

**Always apply:** Readable markdown; **honest uncertainty**; **no fake verification** language; when **webSearch** (or other tools) gave evidence, **cite it** with real links; use **sectioning** when length warrants it—**not** for one-line replies. You decide exact headings and flow.
**Tables / numbers:** Never put raw pipe \`|\` characters inside a sentence. For comparisons or stats, use a valid markdown table (header + separator row) or **bold label:** value per line—otherwise the UI may render broken lines.`;
}
