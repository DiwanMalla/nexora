import type { QueryAnalysis, QueryPlan, RouteModelKey } from "./types";

const MAX_SEARCH_QUERY_CHARS = 400;
const TARGET_SEARCH_QUERY_CHARS = 140;

export function cleanTrailingPunctuation(text: string): string {
  return text.replace(/[.,;:!?]+$/g, "").replace(/[)\]}]+$/g, "");
}

export function sanitizePathToken(token: string): string {
  return cleanTrailingPunctuation(token.trim())
    .replace(/[)\]}>,]+$/g, "")
    .replace(/\.+$/g, "");
}

export function normalizeUrlCandidate(url: string): string {
  return cleanTrailingPunctuation(url.trim())
    .replace(/[)\]}>,]+$/g, "")
    .replace(/\.+$/g, "");
}

export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s]+/gi) ?? [];
  return matches
    .map((u) => normalizeUrlCandidate(u))
    .filter((u) => /^https?:\/\/\S+$/i.test(u));
}

export function isGithubRepoUrl(url: string): boolean {
  return /https?:\/\/github\.com\/[^/\s]+\/[^/\s#?]+/i.test(url);
}

export function buildSearchQuery(rawQuery: string): string {
  const normalized = rawQuery.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const urlMatches = extractUrls(normalized);
  const githubRepo = urlMatches.find((u) =>
    /github\.com\/[^/\s]+\/[^/\s]+/i.test(u),
  );
  if (githubRepo) {
    const match = githubRepo.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
    if (match) {
      const owner = sanitizePathToken(match[1]);
      const repo = sanitizePathToken(match[2]).replace(/\.git$/i, "");
      const short = `site:github.com ${owner} ${repo}`;
      return short.slice(0, MAX_SEARCH_QUERY_CHARS);
    }
  }

  const stripped = normalized
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[`"']/g, " ")
    .replace(
      /\b(please|kindly|analyze|generate|create|write|build|explain|step by step|in detail|production-ready|comprehensive)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  const tokens = stripped
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && /^[a-z0-9._:-]+$/i.test(t));
  const uniqueTokens: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueTokens.push(token);
  }

  const compact = uniqueTokens.join(" ");
  const preferred = compact.slice(0, TARGET_SEARCH_QUERY_CHARS).trim();
  const fallback = normalized.slice(0, TARGET_SEARCH_QUERY_CHARS).trim();
  return (preferred || fallback || normalized).slice(0, MAX_SEARCH_QUERY_CHARS);
}

export function buildQueryPlan(
  userQuery: string,
  analysis: QueryAnalysis,
): QueryPlan {
  const q = userQuery.toLowerCase();
  const hasUrl = /https?:\/\/\S+/.test(q);
  const hasGithubRepo = /github\.com\/[^/\s]+\/[^/\s]+/.test(q);
  const hasCodeOrLogs =
    /```|stack trace|traceback|error:|exception|line \d+|undefined is not/i.test(
      userQuery,
    );
  const hasCurrentIntent =
    /\b(latest|today|current|recent|news|price|compare|vs)\b/i.test(q);
  const hasComparisonIntent =
    /\b(compare|comparison|vs|pricing|price|difference|which is better)\b/i.test(
      q,
    );
  const hasExplicitNoSearchInstruction =
    /\b(do not|don't|avoid)\s+(use\s+)?(web\s+)?search\b/i.test(q) ||
    /\bunless (it is|it's)?\s*necessary\b/i.test(q);
  const hasConceptualIntent =
    /\b(explain|difference between|trade[-\s]?offs?|concept|principle|strategy|architecture|reasoning[-\s]?only|why)\b/i.test(
      q,
    );
  const hasExternalEvidenceNeed =
    hasUrl ||
    hasGithubRepo ||
    hasCurrentIntent ||
    /\b(cite|citation|sources?|verify|verified|evidence)\b/i.test(q);
  const shouldForceReasoningOnly =
    hasConceptualIntent && !hasExternalEvidenceNeed && !hasCodeOrLogs;
  const recommendedModel = ((
    ["coding", "heavyReasoning", "complexWriting", "simple"] as const
  ).includes(analysis.recommendedModel as RouteModelKey)
    ? (analysis.recommendedModel as RouteModelKey)
    : "simple");

  if (hasGithubRepo) {
    return {
      taskType: "artifact_inspection",
      artifactType: "github_repo",
      groundingRequirement: "required",
      retrievalStrategy: "repo_fetch",
      searchQuery: buildSearchQuery(userQuery),
      reasoning: "GitHub repository inspection requires external evidence.",
      recommendedModel: "coding",
    };
  }

  if (hasUrl) {
    return {
      taskType: "artifact_inspection",
      artifactType: "webpage",
      groundingRequirement: "required",
      retrievalStrategy: "direct_url_fetch",
      searchQuery: buildSearchQuery(userQuery),
      reasoning: "Direct URL provided; retrieval-first path selected.",
      // Direct URL summaries are grounded, so route to the synthesis-focused model.
      recommendedModel: "complexWriting",
    };
  }

  if (hasCodeOrLogs) {
    return {
      taskType: "code_debugging",
      artifactType: "log_text",
      groundingRequirement: "required",
      retrievalStrategy: "none",
      searchQuery: "",
      reasoning: "Code/log evidence already present in prompt.",
      recommendedModel: "coding",
    };
  }

  if (shouldForceReasoningOnly || hasExplicitNoSearchInstruction) {
    return {
      taskType: "general_qa",
      artifactType: "none",
      groundingRequirement: "none",
      retrievalStrategy: "none",
      searchQuery: "",
      reasoning:
        "Conceptual/reasoning prompt detected; retrieval disabled unless explicit external evidence is required.",
      recommendedModel: "simple",
    };
  }

  if (hasCurrentIntent || analysis.needsWebSearch) {
    return {
      taskType: "web_research",
      artifactType: "none",
      groundingRequirement: "recommended",
      retrievalStrategy: "web_search",
      searchQuery: buildSearchQuery(analysis.searchQuery || userQuery),
      reasoning: "Current or external research intent detected.",
      // Avoid routing common web/current/research prompts to "heavyReasoning" by default.
      // Comparison still gets higher-quality synthesis, but stays on the grounded synthesis model.
      recommendedModel: hasComparisonIntent ? "complexWriting" : "simple",
    };
  }

  return {
    taskType: "general_qa",
    artifactType: "none",
    groundingRequirement: "none",
    retrievalStrategy: "none",
    searchQuery: "",
    reasoning: analysis.reasoning,
    recommendedModel,
  };
}
