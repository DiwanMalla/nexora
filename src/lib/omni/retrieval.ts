import { braveSearch, mergeSearchResponses, tavilySearch } from "@/lib/search";
import type { TavilySearchResponse } from "@/lib/search";
import { buildSearchQuery, extractUrls, isGithubRepoUrl, sanitizePathToken } from "./planner";
import type {
  QueryPlan,
  RetrievalAttempt,
  RetrievalEvidence,
  RetrievalLog,
  RepoParsedEvidence,
} from "./types";

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function scoreDomainCredibility(domain: string): number {
  if (!domain) return 0;
  const highTrustPatterns = [
    /\.gov$/,
    /\.edu$/,
    /\.ac\./,
    /wikipedia\.org$/,
    /reuters\.com$/,
    /apnews\.com$/,
    /bbc\.com$/,
    /who\.int$/,
    /un\.org$/,
  ];
  const lowTrustPatterns = [/blogspot\./, /medium\.com$/, /reddit\.com$/];
  if (highTrustPatterns.some((p) => p.test(domain))) return 1;
  if (lowTrustPatterns.some((p) => p.test(domain))) return 0.35;
  return 0.65;
}

function enrichWithCredibility(response: TavilySearchResponse): TavilySearchResponse {
  return {
    ...response,
    results: response.results.map((r) => {
      const domain = getDomain(r.url);
      const credibility = scoreDomainCredibility(domain);
      const adjustedScore = Number((r.score * 0.7 + credibility * 0.3).toFixed(3));
      return { ...r, score: adjustedScore };
    }),
  };
}

function createSearchResponseFromEvidence(
  query: string,
  evidence: RetrievalEvidence,
): TavilySearchResponse {
  return {
    query,
    answer: undefined,
    results: evidence.sources.map((s) => ({
      title: s.title,
      url: s.url,
      content: s.content.slice(0, 1200),
      score: s.score,
    })),
    images: [],
  };
}

async function tryFetchText(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  const text = await res.text();
  if (!text.trim()) throw new Error("Empty response body");
  return text;
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isShellLikeHtml(raw: string, visibleText: string): boolean {
  const lower = raw.toLowerCase();
  const hasFrameworkShell =
    /__next|id="__next"|_next\/static|application\/json|hydration|webpack|reactroot/i.test(
      raw,
    ) || /next\.js|vercel/i.test(lower);
  const hasBodyTag = /<body[\s>]/i.test(raw);
  const lowVisibleContent = visibleText.length < 900;
  return hasBodyTag && hasFrameworkShell && lowVisibleContent;
}

async function fetchViaRenderedMirror(url: string): Promise<string> {
  const mirrorUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, "")}`;
  const text = await tryFetchText(mirrorUrl);
  return text;
}

async function retrieveFromDirectUrls(
  urls: string[],
  attempts: RetrievalAttempt[],
): Promise<RetrievalEvidence> {
  const evidence: RetrievalEvidence = { sources: [], extractedFields: [] };
  for (const url of urls) {
    try {
      const raw = await tryFetchText(url);
      const looksHtml = /<html[\s>]|<body[\s>]|<!doctype html/i.test(raw);
      let text = raw;
      if (looksHtml) {
        const visible = stripHtmlToText(raw);
        if (isShellLikeHtml(raw, visible)) {
          attempts.push({
            strategy: "direct_url_fetch",
            target: `${url}#raw-shell`,
            success: false,
            error: "Shell-only HTML detected; retrying with rendered mirror",
          });
          const rendered = await fetchViaRenderedMirror(url);
          const renderedVisible = stripHtmlToText(rendered);
          if (renderedVisible.length < 700) {
            throw new Error(
              "Shell-only/low-content page even after rendered retry",
            );
          }
          text = renderedVisible;
          attempts.push({
            strategy: "direct_url_fetch",
            target: `${url}#rendered-mirror`,
            success: true,
          });
        } else {
          text = visible;
        }
      }
      attempts.push({ strategy: "direct_url_fetch", target: url, success: true });
      evidence.sources.push({
        title: `Fetched URL: ${url}`,
        url,
        content: text,
        score: 0.9,
      });
      if (/package\.json/i.test(url)) evidence.extractedFields.push("package.json");
      if (/env\.example/i.test(url)) evidence.extractedFields.push(".env.example");
      if (/readme\.md/i.test(url)) evidence.extractedFields.push("README.md");
    } catch (err) {
      attempts.push({
        strategy: "direct_url_fetch",
        target: url,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
  return evidence;
}

async function retrieveFromGithubRepo(
  repoUrl: string,
  attempts: RetrievalAttempt[],
): Promise<RetrievalEvidence> {
  const evidence: RetrievalEvidence = { sources: [], extractedFields: [] };
  const match = repoUrl.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (!match) return evidence;
  const owner = sanitizePathToken(match[1]);
  const repo = sanitizePathToken(match[2]).replace(/\.git$/i, "");
  if (!owner || !repo) return evidence;
  console.log(`        🔎 repo_fetch normalized target: ${owner}/${repo}`);

  const mainCandidates = [
    `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/main/package.json`,
    `https://raw.githubusercontent.com/${owner}/${repo}/main/.env.example`,
    `https://raw.githubusercontent.com/${owner}/${repo}/main/docs/API.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/main/docs/Architecture.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/main/docs/MILESTONES.md`,
  ];
  const masterCandidates = [
    `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/package.json`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/.env.example`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/docs/API.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/docs/Architecture.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/docs/MILESTONES.md`,
  ];

  const appendField = (url: string) => {
    if (/README\.md$/i.test(url)) evidence.extractedFields.push("README.md");
    if (/package\.json$/i.test(url)) evidence.extractedFields.push("package.json");
    if (/\.env\.example$/i.test(url)) evidence.extractedFields.push(".env.example");
    if (/docs\/API\.md$/i.test(url)) evidence.extractedFields.push("docs/API.md");
    if (/docs\/Architecture\.md$/i.test(url))
      evidence.extractedFields.push("docs/Architecture.md");
    if (/docs\/MILESTONES\.md$/i.test(url))
      evidence.extractedFields.push("docs/MILESTONES.md");
  };

  for (const url of mainCandidates) {
    try {
      const text = await tryFetchText(url);
      attempts.push({ strategy: "repo_fetch", target: url, success: true });
      evidence.sources.push({
        title: `Repo file: ${url.split("/").slice(-1)[0]}`,
        url,
        content: text,
        score: 0.98,
      });
      appendField(url);
    } catch (err) {
      attempts.push({
        strategy: "repo_fetch",
        target: url,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  if (!evidence.sources.length) {
    for (const url of masterCandidates) {
      try {
        const text = await tryFetchText(url);
        attempts.push({ strategy: "repo_fetch", target: url, success: true });
        evidence.sources.push({
          title: `Repo file: ${url.split("/").slice(-1)[0]}`,
          url,
          content: text,
          score: 0.98,
        });
        appendField(url);
      } catch (err) {
        attempts.push({
          strategy: "repo_fetch",
          target: url,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  return evidence;
}

async function retrieveViaWebSearch(
  webQuery: string,
  attempts: RetrievalAttempt[],
): Promise<TavilySearchResponse | null> {
  const [tavilyResult, braveResult] = await Promise.allSettled([
    tavilySearch(webQuery, {
      maxResults: 5,
      includeImages: false,
    }),
    braveSearch(webQuery, {
      maxResults: 5,
      includeImages: false,
    }),
  ]);

  const successfulResponses: TavilySearchResponse[] = [];
  if (tavilyResult.status === "fulfilled") {
    attempts.push({ strategy: "web_search", target: `tavily:${webQuery}`, success: true });
    successfulResponses.push(tavilyResult.value);
  } else {
    attempts.push({
      strategy: "web_search",
      target: `tavily:${webQuery}`,
      success: false,
      error:
        tavilyResult.reason instanceof Error
          ? tavilyResult.reason.message
          : "Unknown error",
    });
  }
  if (braveResult.status === "fulfilled") {
    attempts.push({ strategy: "web_search", target: `brave:${webQuery}`, success: true });
    successfulResponses.push(braveResult.value);
  } else {
    attempts.push({
      strategy: "web_search",
      target: `brave:${webQuery}`,
      success: false,
      error:
        braveResult.reason instanceof Error ? braveResult.reason.message : "Unknown error",
    });
  }
  if (!successfulResponses.length) return null;
  return mergeSearchResponses(successfulResponses, 8);
}

export async function runRetrievalPlan(
  queryPlan: QueryPlan,
  userQuery: string,
): Promise<{ searchResponse: TavilySearchResponse | null; log: RetrievalLog }> {
  const attempts: RetrievalAttempt[] = [];
  const urls = extractUrls(userQuery);
  let evidence: RetrievalEvidence = { sources: [], extractedFields: [] };
  let searchResponse: TavilySearchResponse | null = null;
  let fallbackUsed = false;

  if (queryPlan.retrievalStrategy === "repo_fetch") {
    const repoUrl = urls.find((u) => isGithubRepoUrl(u));
    if (repoUrl) evidence = await retrieveFromGithubRepo(repoUrl, attempts);
    if (!evidence.sources.length) {
      fallbackUsed = true;
      const webQuery = buildSearchQuery(queryPlan.searchQuery || userQuery);
      searchResponse = await retrieveViaWebSearch(webQuery, attempts);
    } else {
      searchResponse = createSearchResponseFromEvidence(
        queryPlan.searchQuery || userQuery,
        evidence,
      );
    }
  } else if (queryPlan.retrievalStrategy === "direct_url_fetch") {
    if (urls.length) evidence = await retrieveFromDirectUrls(urls, attempts);
    if (!evidence.sources.length) {
      fallbackUsed = true;
      const webQuery = buildSearchQuery(queryPlan.searchQuery || userQuery);
      searchResponse = await retrieveViaWebSearch(webQuery, attempts);
    } else {
      searchResponse = createSearchResponseFromEvidence(
        queryPlan.searchQuery || userQuery,
        evidence,
      );
    }
  } else if (queryPlan.retrievalStrategy === "web_search") {
    const webQuery = buildSearchQuery(queryPlan.searchQuery || userQuery);
    searchResponse = await retrieveViaWebSearch(webQuery, attempts);
  }

  if (searchResponse) {
    searchResponse = enrichWithCredibility(searchResponse);
  }

  return {
    searchResponse,
    log: {
      strategyChosen: queryPlan.retrievalStrategy,
      attempts,
      evidence,
      fallbackUsed,
    },
  };
}

export function parseRepoEvidence(evidence: RetrievalEvidence): RepoParsedEvidence {
  const parsed: RepoParsedEvidence = {
    filesRetrieved: [],
    scripts: {},
    dependencies: [],
    envVars: [],
    apiRoutes: [],
    milestoneHeadings: [],
  };

  for (const source of evidence.sources) {
    const url = source.url;
    const content = source.content || "";
    const lowerUrl = url.toLowerCase();
    const fileName = url.split("/").pop() || url;
    parsed.filesRetrieved.push(fileName);

    if (lowerUrl.endsWith("/package.json")) {
      try {
        const pkg = JSON.parse(content) as {
          scripts?: Record<string, string>;
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        parsed.scripts = { ...(pkg.scripts || {}) };
        parsed.dependencies = [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {}),
        ].slice(0, 40);
      } catch {}
    }

    if (lowerUrl.endsWith("/.env.example")) {
      const vars = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => line.split("=")[0]?.trim() || "")
        .filter(Boolean);
      parsed.envVars.push(...vars);
    }

    if (lowerUrl.endsWith("/docs/api.md")) {
      const routes = content.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+\/[^\s)]+/g) ?? [];
      parsed.apiRoutes.push(...routes);
    }

    if (lowerUrl.endsWith("/docs/milestones.md")) {
      const headings = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /^#{1,3}\s+/.test(line));
      parsed.milestoneHeadings.push(...headings);
    }

    if (lowerUrl.endsWith("/docs/architecture.md")) {
      parsed.architectureSummary = content.slice(0, 1200);
    }
  }

  parsed.filesRetrieved = [...new Set(parsed.filesRetrieved)];
  parsed.dependencies = [...new Set(parsed.dependencies)];
  parsed.envVars = [...new Set(parsed.envVars)];
  parsed.apiRoutes = [...new Set(parsed.apiRoutes)];
  parsed.milestoneHeadings = [...new Set(parsed.milestoneHeadings)];

  return parsed;
}

export function buildRepoEvidenceBlock(parsed: RepoParsedEvidence): string {
  const scriptsLines = Object.entries(parsed.scripts)
    .slice(0, 20)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  const depLines = parsed.dependencies.slice(0, 30).map((d) => `- ${d}`).join("\n");
  const envLines = parsed.envVars.slice(0, 40).map((e) => `- ${e}`).join("\n");
  const routeLines = parsed.apiRoutes.slice(0, 30).map((r) => `- ${r}`).join("\n");
  const milestoneLines = parsed.milestoneHeadings
    .slice(0, 20)
    .map((h) => `- ${h}`)
    .join("\n");

  return [
    "--- REPO EVIDENCE ---",
    `files retrieved: ${parsed.filesRetrieved.join(", ") || "none"}`,
    "",
    "package.json scripts:",
    scriptsLines || "- none",
    "",
    "package.json dependencies:",
    depLines || "- none",
    "",
    ".env.example variables:",
    envLines || "- none",
    "",
    "docs/API.md routes:",
    routeLines || "- none",
    "",
    "docs/MILESTONES.md headings (planned scope, not completion proof):",
    milestoneLines || "- none",
    "",
    "docs/Architecture.md summary:",
    parsed.architectureSummary || "- none",
    "--- END REPO EVIDENCE ---",
  ].join("\n");
}
