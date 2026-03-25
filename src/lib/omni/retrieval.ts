import { braveSearch, mergeSearchResponses, tavilySearch } from "@/lib/search";
import type { TavilySearchResponse } from "@/lib/search";
import { buildSearchQuery, extractUrls, isGithubRepoUrl, sanitizePathToken } from "./planner";
import type {
  QueryPlan,
  RetrievalAttempt,
  RetrievalEvidence,
  RetrievalLog,
  RepoParsedEvidence,
  DirectUrlParsedEvidence,
} from "./types";
import Firecrawl from "@mendable/firecrawl-js";

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
  // Remove scripts/styles and common page chrome so excerpts reflect main content.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function countHeadingTags(html: string): number {
  return (
    (html.match(/<h1[\s>]/gi) ?? []).length +
    (html.match(/<h2[\s>]/gi) ?? []).length +
    (html.match(/<h3[\s>]/gi) ?? []).length
  );
}

function isShellOnlyOrLowBody(raw: string, visibleText: string): boolean {
  const lower = raw.toLowerCase();

  const hasHead = /<head[\s>]/i.test(raw);
  const hasBody = /<body[\s>]/i.test(raw);
  const hasFrameworkShell =
    /__next|id="__next"|_next\/static|application\/json|hydration|webpack|reactroot/i.test(
      raw,
    ) || /next\.js|vercel/i.test(lower);

  const visibleLen = visibleText.trim().length;
  const hasFewHeadings = countHeadingTags(raw) < 3;
  const lowVisibleText = visibleLen < 900;

  // Next/SPA pages sometimes return only <head> + app shell without a meaningful body.
  const headOnlyLikely =
    hasHead && !hasBody && (hasFewHeadings || lowVisibleText);

  // Or we have an app shell but almost no visible content.
  const shellLikely = hasFrameworkShell && (hasFewHeadings || lowVisibleText);

  // Truncated fragments often look like mostly scripts/styles.
  const scriptOrStyleHeavy =
    ((raw.match(/<script[\s\S]*?<\/script>/gi) ?? []).length +
      (raw.match(/<style[\s\S]*?<\/style>/gi) ?? []).length) >=
    4;

  const fragmentLikely = scriptOrStyleHeavy && lowVisibleText && !/article|main/i.test(lower);

  return headOnlyLikely || shellLikely || fragmentLikely;
}

async function fetchViaRenderedMirror(url: string): Promise<string> {
  const mirrorUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, "")}`;
  return tryFetchText(mirrorUrl);
}

async function fetchViaRenderedFirecrawl(
  url: string,
): Promise<{ content: string; mode: "firecrawl" }> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY not set");
  }

  const app = new Firecrawl({ apiKey });
  const doc = await app.scrape(url, {
    formats: ["markdown"],
    onlyMainContent: true,
    timeout: 30_000,
    removeBase64Images: true,
  });

  if (typeof doc.markdown !== "string" || !doc.markdown.trim()) {
    throw new Error("Firecrawl returned empty markdown");
  }

  return { content: doc.markdown, mode: "firecrawl" };
}

async function fetchViaRenderedFallback(
  url: string,
): Promise<{ content: string; mode: "firecrawl" | "mirror" }> {
  // Prefer Firecrawl (better handling of JS-heavy docs) when configured.
  try {
    const res = await fetchViaRenderedFirecrawl(url);
    return res;
  } catch {
    // Fall back to a cheaper mirror approach when Firecrawl isn't configured
    // or fails for a specific page.
  }

  return { content: await fetchViaRenderedMirror(url), mode: "mirror" };
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
      let contentToStore = raw;
      let storedVisibleLen = 0;

      if (looksHtml) {
        const visible = stripHtmlToText(raw);
        storedVisibleLen = visible.length;

        if (isShellOnlyOrLowBody(raw, visible)) {
          attempts.push({
            strategy: "direct_url_fetch",
            target: `${url}#shell-detected`,
            success: false,
            error: "Shell-only/low-body content detected; retrying with rendered retrieval",
          });

          const rendered = await fetchViaRenderedFallback(url);
          const renderedVisible = stripHtmlToText(rendered.content);
          storedVisibleLen = renderedVisible.length;

          if (renderedVisible.length < 700) {
            throw new Error(
              "Rendered fallback could not recover meaningful page body content",
            );
          }

          contentToStore = rendered.content;
          attempts.push({
            strategy: "direct_url_fetch",
            target: `${url}#rendered-${rendered.mode}`,
            success: true,
          });
        } else {
          // Keep HTML (minus scripts/styles) so strict extraction can parse headings reliably.
          contentToStore = raw
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .trim();
        }
      }

      // If we ended up with almost no usable content, treat as insufficient.
      if (storedVisibleLen > 0 && storedVisibleLen < 120) {
        throw new Error("Low-content page body (insufficient for summarization)");
      }

      attempts.push({ strategy: "direct_url_fetch", target: url, success: true });
      evidence.sources.push({
        title: `Fetched URL: ${url}`,
        url,
        content: contentToStore,
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
      // Direct URL summarization must be grounded in the retrieved page.
      // If we can't extract meaningful body content, return no searchResponse
      // and let the caller produce a fast limitation response.
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

function extractMarkdownHeadings(markdown: string): {
  headings: string[];
  sections: Array<{ heading: string; excerpt: string }>;
} {
  const lines = markdown.split("\n");
  const headings: string[] = [];
  const sections: Array<{ heading: string; excerpt: string }> = [];

  let currentHeading: string | null = null;
  let currentBuf: string[] = [];

  const cleanLinesForSection = (input: string): string => {
    // Remove common docs chrome inside scraped markdown.
    const banned = [
      /table of contents/i,
      /on this page/i,
      /contents/i,
      /navigation/i,
      /skip to content/i,
      /^menu\s*$/i,
    ];
    const cleaned = input
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !banned.some((b) => b.test(l)))
      .join("\n");
    return cleaned.replace(/\s+/g, " ").trim();
  };

  const truncateToWordBoundary = (input: string, maxChars: number): string => {
    const trimmed = input.trim();
    if (trimmed.length <= maxChars) return trimmed;
    const slice = trimmed.slice(0, maxChars);
    const lastSpace = slice.lastIndexOf(" ");
    const lastPunct = Math.max(
      slice.lastIndexOf("."),
      slice.lastIndexOf("!"),
      slice.lastIndexOf("?"),
      slice.lastIndexOf(";"),
      slice.lastIndexOf(","),
    );
    const cutAt = Math.max(lastSpace, lastPunct);
    const candidate = slice.slice(0, cutAt + 1).trim();
    return candidate || slice.trim();
  };

  const cleanExcerptStart = (input: string): string => {
    let t = input.trim();
    t = t.replace(/^[\W_]+/g, "");
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return t;
    const first = parts[0] ?? "";
    const looksTailFragment =
      first.length <= 6 &&
      /^[a-z]/.test(first) &&
      !/[A-Z]/.test(first) &&
      !/\d/.test(first) &&
      (first.includes(".") ||
        first.startsWith("-") ||
        first.startsWith("–") ||
        first.startsWith("—") ||
        first.endsWith(","));
    if (looksTailFragment) {
      parts.shift();
      return parts.join(" ").trim();
    }
    return t;
  };

  const flush = () => {
    if (!currentHeading) return;
    const joined = currentBuf.join("\n").trim().replace(/\n{3,}/g, "\n\n");
    const compact = cleanLinesForSection(joined);
    const excerpt = truncateToWordBoundary(compact, 260);

    if (excerpt) {
      const cleaned = cleanExcerptStart(excerpt);
      if (cleaned) sections.push({ heading: currentHeading, excerpt: cleaned });
    }
    currentBuf = [];
  };

  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (m) {
      flush();
      currentHeading = m[2]!.trim();
      headings.push(currentHeading);
      continue;
    }
    if (currentHeading) currentBuf.push(line);
  }
  flush();

  // Dedup overlapping/near-identical excerpts (intro fragments tend to repeat).
  const deduped: typeof sections = [];
  const seen = new Set<string>();
  for (const s of sections) {
    const key = `${s.heading.toLowerCase()}::${s.excerpt.toLowerCase().slice(0, 70)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(s);
  }

  return { headings: [...new Set(headings)].slice(0, 12), sections: deduped.slice(0, 8) };
}

function extractHtmlHeadings(html: string): {
  headings: string[];
  sections: Array<{ heading: string; excerpt: string }>;
} {
  const matches = Array.from(
    html.matchAll(/<(h1|h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi),
  ).slice(0, 20);

  const normalizedMatches = matches
    .map((m) => {
      const headingText = (m[3] ?? "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return {
        headingText,
        index: m.index ?? 0,
      };
    })
    .filter((m) => m.headingText.length >= 3);

  const uniqueHeadingOrder: string[] = [];
  const seenHeading = new Set<string>();
  for (const m of normalizedMatches) {
    const key = m.headingText.toLowerCase();
    if (seenHeading.has(key)) continue;
    seenHeading.add(key);
    uniqueHeadingOrder.push(m.headingText);
    if (uniqueHeadingOrder.length >= 12) break;
  }

  const sections: Array<{ heading: string; excerpt: string }> = [];
  for (let i = 0; i < normalizedMatches.length; i++) {
    const cur = normalizedMatches[i]!;
    const headingKey = cur.headingText.toLowerCase();
    if (!uniqueHeadingOrder.some((h) => h.toLowerCase() === headingKey)) continue;

    // Grab HTML chunk from this heading until the next heading of same level/order.
    const nextIndex = normalizedMatches[i + 1]?.index ?? html.length;
    const chunk = html.slice(cur.index, nextIndex);
    const plainChunk = stripHtmlToText(chunk);

    // Remove repeated boilerplate intro from each excerpt by focusing on the first "paragraph-like" content.
    const rawExcerpt = plainChunk
      .replace(/^\s*(?:[A-Z][^\n]{2,40}\s*){0,2}/i, "")
      .replace(/\s+/g, " ")
      .trim();

    const excerpt = rawExcerpt.length > 240 ? rawExcerpt.slice(0, 240).trim() : rawExcerpt;
    const excerptFinal = excerpt
      ? truncateHtmlExcerptToWordBoundary(excerpt, 240)
      : "";

    const cleanedStart = excerptFinal
      ? cleanExcerptStartForHtml(excerptFinal)
      : "";

    if (!cleanedStart) continue;

    const dedupeKey = `${headingKey}::${excerpt.toLowerCase().slice(0, 60)}`;
    if (
      sections.some(
        (s) =>
          `${s.heading.toLowerCase()}::${s.excerpt.toLowerCase().slice(0, 60)}` ===
          dedupeKey,
      )
    ) {
      continue;
    }

    sections.push({ heading: cur.headingText, excerpt: cleanedStart });
    if (sections.length >= 8) break;
  }

  return { headings: uniqueHeadingOrder, sections };
}

function truncateHtmlExcerptToWordBoundary(input: string, maxChars: number): string {
  const trimmed = input.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const slice = trimmed.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const lastPunct = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf("!"),
    slice.lastIndexOf("?"),
    slice.lastIndexOf(";"),
    slice.lastIndexOf(","),
  );
  const cutAt = Math.max(lastSpace, lastPunct);
  const candidate = slice.slice(0, cutAt + 1).trim();
  return candidate || slice.trim();
}

function cleanExcerptStartForHtml(input: string): string {
  let t = input.trim();
  t = t.replace(/^[\W_]+/g, "");
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return t;
  const first = parts[0] ?? "";
  const looksTailFragment =
    first.length <= 6 &&
    /^[a-z]/.test(first) &&
    !/[A-Z]/.test(first) &&
    !/\d/.test(first) &&
    (first.includes(".") ||
      first.startsWith("-") ||
      first.startsWith("–") ||
      first.startsWith("—") ||
      first.endsWith(","));
  if (looksTailFragment) {
    parts.shift();
    return parts.join(" ").trim();
  }
  return t;
}

export function parseDirectUrlEvidence(evidence: RetrievalEvidence): DirectUrlParsedEvidence {
  const source = evidence.sources[0];
  const content = source?.content ?? "";
  if (!content.trim()) {
    return {
      sourceUsed: "text",
      headings: [],
      sections: [],
      isMeaningful: false,
      visibleCharCount: 0,
    };
  }

  const looksMarkdown = /^#{1,6}\s+/m.test(content) || /\n#{1,6}\s+/m.test(content);

  if (looksMarkdown) {
    const parsed = extractMarkdownHeadings(content);
    const visibleCharCount = stripHtmlToText(content).length;
    // For strict extraction, headings are the primary signal. Visible length is a secondary guard.
    const isMeaningful =
      parsed.headings.length >= 2 &&
      (parsed.sections.length >= 2 || visibleCharCount > 120);
    return {
      sourceUsed: "markdown",
      headings: parsed.headings,
      sections: parsed.sections,
      isMeaningful,
      visibleCharCount,
    };
  }

  const parsedHtml = extractHtmlHeadings(content);
  const visibleCharCount = stripHtmlToText(content).length;
  const isMeaningful =
    parsedHtml.headings.length >= 2 &&
    (parsedHtml.sections.length >= 2 || visibleCharCount > 180);
  return {
    sourceUsed: "html",
    headings: parsedHtml.headings,
    sections: parsedHtml.sections,
    isMeaningful,
    visibleCharCount,
  };
}

export function formatDirectUrlPageExtractionReport(
  parsed: DirectUrlParsedEvidence,
): string {
  const headings = parsed.headings.slice(0, 15);
  const sections = parsed.sections.slice(0, 7);

  const headingsBlock =
    headings.length > 0
      ? headings.map((h) => `- ${h}`).join("\n")
      : "- none";

  const sectionsBlock =
    sections.length > 0
      ? sections
          .map((s) => {
            const excerpt = s.excerpt?.trim() || "";
            const short =
              excerpt.length > 160 ? `${excerpt.slice(0, 157).trim()}...` : excerpt;
            return `- ${s.heading}: ${short || "not present in the retrieved content"}`;
          })
          .join("\n")
      : "- none";

  return [
    "## Direct page extraction (page-explicit)",
    "",
    "## Headings",
    headingsBlock,
    "",
    "## Key sections (verified excerpts)",
    sectionsBlock,
  ].join("\n");
}
