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

  if (searchResponse) {
    if (searchResponse.answer) {
      parts.push(`\nSearch Quick Answer: ${searchResponse.answer}`);
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
  }

  if (repoEvidenceBlock) {
    parts.push("\nGrounded repo evidence (source of truth):");
    parts.push(repoEvidenceBlock);
    parts.push(
      "\nGrounding rule: If repo evidence exists, do NOT claim files were inaccessible. Base claims on this evidence only.",
    );
    parts.push(
      "You already have successful retrieval + parsing. It is incorrect to claim package.json/.env/docs were not accessed when they appear in this evidence block.",
    );
    parts.push(
      "Milestone grounding rule: Entries from docs/MILESTONES.md describe intended roadmap/scope, not verified completion status. Do not state a milestone is complete unless completion is explicitly evidenced elsewhere.",
    );
    parts.push(
      "Scope-boundary rule for repo summaries: Only claim what is directly supported by retrieved files. If full source coverage (for example the broader src tree) was not inspected, explicitly state that broader implementation status is uncertain.",
    );
    parts.push(
      "Avoid speculative phrasing such as 'likely pending in unsubmitted code' unless there is direct evidence. Prefer: 'From retrieved files, I can verify X; broader status remains unverified in this run.'",
    );
  }

  parts.push(`
Response style guidance:
- Write in a natural, conversational style similar to modern assistants (Gemini/ChatGPT/Groq).
- Do NOT force fixed section headers unless they clearly improve readability.
- When making factual claims from web results, ground them in the available evidence and mention key sources naturally.
- If evidence is weak or conflicting, state uncertainty clearly and avoid overconfident wording.`);
  parts.push("--- END PIPELINE CONTEXT ---");

  return parts.join("\n");
}
