/**
 * Analyst agent: data/CSV analysis, summaries, structured insights.
 * Tools: Cached or user-uploaded data.
 * @see docs/AGENTS.md
 */

export const ANALYST_SLUG = "analyst";

export type AnalystInput = {
  query: string;
  data?: string | unknown[];
};

export type AnalystOutput = {
  content: string;
  tables?: unknown[];
  suggestedActions?: string[];
};

/** Stub: will be implemented with LangGraph + cached data. */
export async function runAnalyst(_input: AnalystInput): Promise<AnalystOutput> {
  return {
    content: "",
    suggestedActions: ["Export CSV"],
  };
}
