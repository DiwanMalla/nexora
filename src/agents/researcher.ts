/**
 * Researcher agent: deep search, fact-checking, citation-backed answers.
 * Tools: Tavily, Firecrawl (optional), "use cache" (RAG).
 * @see docs/AGENTS.md
 */

export const RESEARCHER_SLUG = "researcher";

export type ResearcherInput = {
  query: string;
  options?: { includeCitations?: boolean; maxSources?: number };
};

export type ResearcherOutput = {
  content: string;
  sources: Array<{ title: string; url: string; favicon?: string; snippet?: string }>;
  suggestedActions?: string[];
};

/** Stub: will be implemented with LangGraph + Tavily + Firecrawl. */
export async function runResearcher(_input: ResearcherInput): Promise<ResearcherOutput> {
  return {
    content: "",
    sources: [],
    suggestedActions: ["Copy to clipboard", "Export as Markdown"],
  };
}
