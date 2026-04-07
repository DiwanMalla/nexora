import type { TavilySearchResponse } from "@/lib/search";
import type { QueryAnalysis } from "./types";
import type { RetrievalStrategy } from "./types";

export function buildEnhancedSystemPrompt(params: {
  basePrompt: string;
  analysis: QueryAnalysis;
  retrievalStrategy: RetrievalStrategy;
  webSearchUsed: boolean;
  searchResponse: TavilySearchResponse | null;
  analysisText: string;
  factCheckNotes?: string;
  claimVerificationText?: string;
  repoEvidenceBlock?: string;
  /** Very recent politics / government — stricter evidence & humility rules */
  strictPoliticalNewsGrounding?: boolean;
  /** Broad current-events snapshots must stay grounded in retrieved evidence. */
  strictCurrentEventsGrounding?: boolean;
}): string {
  const {
    basePrompt,
    analysis,
    retrievalStrategy,
    webSearchUsed,
    searchResponse,
    analysisText,
    factCheckNotes,
    claimVerificationText,
    repoEvidenceBlock,
    strictPoliticalNewsGrounding = false,
    strictCurrentEventsGrounding = false,
  } = params;

  const parts = [basePrompt];
  parts.push("\n\n--- PIPELINE CONTEXT ---");
  parts.push(`Query Category: ${analysis.category}`);
  parts.push(`Retrieval Strategy: ${retrievalStrategy}`);
  parts.push(`Web Search Used: ${webSearchUsed ? "Yes" : "No"}`);
  if (retrievalStrategy === "none") {
    parts.push(
      "Reasoning-only response mode: Keep the answer concise and direct by default (prefer 4-8 bullets or short sections). Do not produce long-form essay style unless the user explicitly asks for depth.",
    );
  }

  if (retrievalStrategy === "direct_url_fetch") {
    parts.push(
      "Direct URL grounding rule: For summaries/extractions from a specific page, you must only use information present in the retrieved page content/context. If a requested section/detail cannot be verified from the retrieved content, explicitly say it is not present in the retrieved page content (do not fill gaps from prior knowledge).",
    );
  }

  if (searchResponse) {
    if (searchResponse.answer) {
      if (strictPoliticalNewsGrounding) {
        parts.push(
          "\n**Search Quick Answer (machine aggregate — not fact-checked):** Treat as a rough hint only. **Do not** treat it as verified truth. Every concrete claim must align with the excerpts and source index below; if it conflicts, **trust the excerpts** or say sources disagree.",
        );
        parts.push(`\n${searchResponse.answer}`);
      } else {
        parts.push(`\nSearch Quick Answer: ${searchResponse.answer}`);
      }
    }
    parts.push(
      "\nEvidence note: The following context is based on direct retrieval from accessible sources.",
    );
    parts.push(`\n${analysisText}`);
    if (factCheckNotes) {
      parts.push(`\nFact Check: ${factCheckNotes}`);
    }
    if (claimVerificationText) {
      parts.push(`\nClaim Verification:\n${claimVerificationText}`);
    }
    if (strictPoliticalNewsGrounding) {
      parts.push(`

## STRICT GROUNDING — recent politics / government (mandatory)
- **Source quality:** When excerpts include **Reuters, BBC, AP, Al Jazeera, Kathmandu Post, Himalayan Times** (or similar), weight those **above** thin blogs, social rewrites, or SEO pages. If only weak sources support a claim, say so or omit.
- **Evidence buckets (do not merge):** (1) **Actions already taken** (votes held, laws signed, appointments published, visits completed). (2) **Announced plans / proposals / rhetoric** — **not** “done” until corroborated as enacted. (3) **Campaign promises** — never report as completed achievements. (4) **Prior career** — only in a **short, labeled** section if relevant; never as post-office facts.
- **Very new tenure:** If reporting suggests the figure **just** took office or the term is **very short**, say **clearly** that **major achievements are premature to claim**; summarize only what is **documented** as already occurred.
- **Conflicting facts:** For **dates, cabinet size, headcounts**, if sources **disagree**, **state the disagreement** (e.g. “outlets report X vs Y”) — **do not** pick one version with confidence.
- **Specificity:** Do not state precise numbers, dates, or names as hard fact unless **supported by at least one strong excerpt**; otherwise hedge (“reported as…”, “according to …”).
- **Sources section (your reply):** Use a **clean bullet list**: \`- [Outlet or title](URL)\` one per line — **no** stray pipe \`|\` characters inside sentences; **no** broken partial tables. Keep it readable.
`);
    }
    if (strictCurrentEventsGrounding) {
      parts.push(`

## STRICT GROUNDING — broad current-events snapshot (mandatory)
- You have retrieved web evidence in this turn. Base the answer on that evidence first.
- Do not default to generic "knowledge cutoff" framing when sources are present.
- If a detail is uncertain or conflicting, say "reporting is mixed/limited" and cite sources; do not fabricate.
- For "top events right now" prompts, provide distinct developments (avoid repeating one storyline in multiple bullets).
- For each event, include: (1) what is happening, (2) why it matters globally, (3) likely outcomes.
- Include a short sources section with markdown links drawn from retrieved URLs.
`);
    }
  }

  if (repoEvidenceBlock) {
    parts.push("\nGrounded repo evidence (source of truth):");
    parts.push(repoEvidenceBlock);
    parts.push(
      "\nGrounding rule: If repo evidence exists, do NOT claim files were inaccessible. Base claims ONLY on the retrieved content below.",
    );
    parts.push(
      "Evidence discipline rule: Do NOT label anything as 'implemented in code', 'fully wired', 'already works', or 'LangGraph is running' unless that runtime wiring is explicitly evidenced in the retrieved artifacts you actually have here.",
    );
    parts.push(
      "Important: dependencies + docs alone are NOT proof of wiring. They are 'declared' or 'documented' unless you can point to direct retrieved code artifacts.",
    );
    parts.push(
      "Milestone grounding rule: Entries from docs/MILESTONES.md describe intended roadmap/scope, not verified completion status.",
    );
    parts.push(
      "Scope-boundary rule: Only claim what is directly supported by these retrieved files. If the broader src tree / execution code / workflow definitions were not retrieved, broader implementation status is uncertain.",
    );

    // Output structure for repo inspection synthesis.
    parts.push(
      "\nRepo inspection synthesis output format (mandatory):\n" +
        "## Summary\n" +
        "Short, direct answer to what the project appears to be.\n\n" +
        "## ✅ Verified in retrieved artifacts\n" +
        "Only list statements you can directly support from the retrieved evidence block content (e.g., exact npm scripts, exact env var names, explicit lists in the evidence block).\n\n" +
        "## 🛠️ Documented / planned (not verified wired)\n" +
        "List statements that appear in README/docs as architecture claims or intended roadmap/scope, but do not claim they are implemented/wired unless code-level evidence is included in the retrieved artifacts.\n\n" +
        "## ⚠️ Uncertain / not verified from retrieved files\n" +
        "List capabilities or implementation details you cannot prove with the currently retrieved evidence (e.g., persistence, LangGraph runtime wiring, inbox/drive backends, rate limiting, request validation, etc.).\n\n" +
        "## Top 3 beta-readiness priorities\n" +
        "Choose priorities biased toward reliability and platform maturity, not feature expansion. The top 3 MUST emphasize:\n" +
        "1) persistence (chat history / threads, and artifact state if applicable)\n" +
        "2) UX parity and streaming consistency (AI Chat parity with Omni’s responsive streaming + pipeline UX)\n" +
        "3) backend hardening (validation, rate limiting, safer request handling)\n" +
        "Do NOT use milestone/Canvas/Payments expansion as the top priorities unless the evidence explicitly shows readiness.\n\n" +
        "## Sources (from evidence block)\n" +
        "Briefly restate which retrieved files supported the verified bullets.\n" +
        "Format each evidence/artifact reference as inline code (chips) like `README.md`, `package.json`, `.env.example`, `docs/API.md`, `docs/Architecture.md`.",
    );

    // Make the model restate evidence boundaries when it is tempted to overreach.
    parts.push(
      "\nGuardrail: If you are unsure whether a feature is implemented (not just documented), put it under ⚠️ Uncertain, not ✅ Verified or 🛠️ Documented/Wired.",
    );
  }

  parts.push(
    strictPoliticalNewsGrounding
      ? `
Response style guidance (strict political mode):
- Always output valid Markdown.
- Lead with **calibrated certainty**: if the situation is fluid or tenure is new, say that **before** listing facts.
- Use **clear sections** (your headings) separating **what is verified done** vs **what is only announced / proposed** vs **what is uncertain or disputed**.
- Put **## Sources** (or equivalent) **near the end** only, as a **simple bullet list** of markdown links—no tables unless every row is complete and valid.
- Avoid overconfident phrasing; prefer “reported”, “according to”, “sources disagree on…”.
`
      : strictCurrentEventsGrounding
        ? `
Response style guidance (strict current-events mode):
- Always output valid Markdown.
- Start with "## Summary" and then 3 numbered events.
- Each numbered event must include the three subpoints: what is happening, why it matters globally, likely outcomes.
- Use evidence-first language grounded in retrieved context; avoid stale generic commentary.
- If confidence is limited, say so explicitly without inventing specifics.
- Every numbered event must include at least one credible markdown citation link.
- Do not fill missing slots with plausible priors. If only 2 events are strongly supported, provide 2 and explicitly say the next slot could not be verified confidently.
- End with "## Sources" and markdown links.
`
      : `
Response style guidance:
- Always output valid Markdown.
- Prefer report-style formatting over chat-style walls of text.
- Short answer first: start immediately with "## Summary" containing a concise direct answer (1-4 sentences).
- Then use structured sections (bullets/numbered lists). If you need citations/evidence, include them only near the end under "## Sources".
- Avoid placing "## Sources" at the top.
- When making factual claims, ground them in the available evidence and avoid overconfident phrasing when evidence is weak.
- If evidence is weak/conflicting, state uncertainty clearly.
- If you include numbered sections/items (e.g. "7. ..."), ensure numbering is consistent and sequential (no repeated numbers).
`,
  );
  parts.push("--- END PIPELINE CONTEXT ---");

  return parts.join("\n");
}
