/**
 * Live-news prefetch: dedupe/cluster retrieved articles, source diversity hints,
 * and structured JSON extraction for claim-level citations.
 */

import { detectBroadCurrentNewsOverviewIntent } from "@/lib/chat/current-fact";
import { mergeSearchResponses } from "@/lib/search/merge";
import type { SearchResponse, SearchResult } from "@/lib/search/types";
import type {
  LiveNewsStructuredPayload,
  LiveNewsVerificationLevel,
} from "@/types";
import { z } from "zod";

export type LiveNewsProgressStage =
  | "searching"
  | "fetching"
  | "clustering"
  | "summarizing";

export type EnrichedResult = SearchResult & { domain: string };

export type StoryCluster = {
  id: string;
  results: EnrichedResult[];
  /** Best title for the story (highest score). */
  representativeTitle: string;
  leadSnippet: string;
  /** Distinct registrable domains in this cluster. */
  domains: string[];
  independentDomainCount: number;
  maxScore: number;
  hasWireOrMajor: boolean;
  hasOfficial: boolean;
  domainQualityTier: "high" | "mixed" | "low";
};

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "her",
  "was",
  "one",
  "our",
  "out",
  "day",
  "get",
  "has",
  "him",
  "his",
  "how",
  "its",
  "let",
  "may",
  "new",
  "now",
  "old",
  "see",
  "two",
  "way",
  "who",
  "boy",
  "did",
  "she",
  "use",
  "her",
  "many",
  "then",
  "them",
  "when",
  "with",
  "have",
  "this",
  "will",
  "your",
  "from",
  "that",
  "they",
  "been",
  "into",
  "more",
  "some",
  "than",
  "very",
  "what",
  "just",
  "like",
  "over",
  "also",
  "back",
  "only",
  "know",
  "take",
  "year",
  "good",
  "make",
  "most",
  "such",
  "time",
  "said",
  "each",
  "which",
  "their",
  "would",
  "there",
  "could",
  "other",
  "after",
  "first",
  "these",
  "about",
  "news",
  "latest",
  "today",
  "update",
  "breaking",
  "reports",
  "report",
  "says",
  "say",
]);

const WIRE_MAJOR =
  /^(?:.*\.)?(?:reuters|apnews|ap\.org|bbc\.co|afp|bloomberg|wsj|ft\.com|theguardian|nytimes|washingtonpost|aljazeera|cnn|npr\.org|economist)/i;
const OFFICIAL_HOST =
  /\.(?:gov|gob|go\.[a-z]{2}|edu|int)(?:\b|$)/i;
const LOW_SIGNAL =
  /(?:reddit|facebook|twitter|x\.com|tiktok|pinterest|tumblr|blogspot|wordpress\.com)$/i;

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Encyclopedic / non-news sources to exclude from live daily-news roundups. */
const WIKIPEDIA_HOST = /^(?:[a-z]{2,3}\.)?wikipedia\.org$/i;

export function isExcludedLiveNewsSourceUrl(url: string): boolean {
  const host = extractDomain(url);
  return WIKIPEDIA_HOST.test(host);
}

/** Drop Wikipedia (etc.) from Tavily payloads before clustering or display. */
export function filterLiveNewsSearchResponse(
  response: SearchResponse,
): SearchResponse {
  const results = (response.results ?? []).filter(
    (r) => !isExcludedLiveNewsSourceUrl(r.url),
  );
  return { ...response, results };
}

function cleanGeoFragment(s: string): string {
  const out = s
    .replace(/\b(the|a|an|today'?s?|latest|current|breaking|some|any|right now)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[?.!]+$/, "")
    .trim();
  return out.slice(0, 48);
}

/**
 * Best-effort place/topic fragment for bucketed queries (e.g. "Nepal" from "today news of Nepal").
 */
export function extractLiveNewsGeoFocus(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length < 3) return null;

  const patterns: RegExp[] = [
    /\btoday'?s?\s+news\s+of\s+(.+?)(?:\s*[?.!]|$)/i,
    /\bnews\s+of\s+(.+?)(?:\s*[?.!]|$)/i,
    /\bnews\s+from\s+(.+?)(?:\s*[?.!]|$)/i,
    /\bnews\s+in\s+(.+?)(?:\s*[?.!]|$)/i,
    /\bheadlines?\s+(?:in|from|about)\s+(.+?)(?:\s*[?.!]|$)/i,
    /\blatest\s+news\s+in\s+(.+?)(?:\s*[?.!]|$)/i,
    /\bwhat(?:'s| is)\s+happening\s+in\s+(.+?)(?:\s*[?.!]|$)/i,
    /\bhappening\s+in\s+(.+?)(?:\s*[?.!]|$)/i,
    /\bgoing\s+on\s+in\s+(.+?)(?:\s*[?.!]|$)/i,
    /\bupdates?\s+on\s+(.+?)(?:\s*[?.!]|$)/i,
    /\bcurrent\s+(?:events?|news)\s+in\s+(.+?)(?:\s*[?.!]|$)/i,
    /\bsituation\s+in\s+(.+?)(?:\s*[?.!]|$)/i,
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) {
      const frag = cleanGeoFragment(m[1]);
      if (frag.length >= 2 && frag.length <= 48) return frag;
    }
  }

  const endCountry = t.match(
    /\b(?:in|of|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s*$/,
  );
  if (endCountry?.[1]) {
    const frag = cleanGeoFragment(endCountry[1]);
    if (frag.length >= 2 && frag.length <= 48) return frag;
  }

  return null;
}

function isGlobalPlaceToken(geo: string): boolean {
  const g = geo.trim().toLowerCase();
  return (
    g === "the world" ||
    g === "world" ||
    g === "earth" ||
    g === "the earth" ||
    g === "this planet" ||
    g === "the planet" ||
    g === "globe" ||
    g === "the globe" ||
    g === "global" ||
    g === "international" ||
    g === "worldwide"
  );
}

/**
 * True for “whole planet” style prompts (not a single country/region focus).
 */
export function detectGlobalWorldNewsIntent(raw: string): boolean {
  const t = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (t.length < 6) return false;

  const geo = extractLiveNewsGeoFocus(raw.trim());
  if (geo && !isGlobalPlaceToken(geo) && !/\b(on\s+)?earth\b|\bthe\s+whole\s+world\b|\bthis\s+planet\b/.test(t)) {
    return false;
  }

  const worldish =
    /\b(?:on\s+)?earth\b/.test(t) ||
    /\bthe\s+world\b/.test(t) ||
    /\bwhole\s+world\b/.test(t) ||
    /\baround\s+the\s+world\b/.test(t) ||
    /\bworldwide\b/.test(t) ||
    /\bglobally\b/.test(t) ||
    /\binternationally\b/.test(t) ||
    /\b(global|world)\s+news\b/.test(t) ||
    /\bwhat(?:'s|s| is)\s+going\s+on\s+(?:on\s+(?:earth|the\s+world|this\s+planet)|in\s+the\s+world|around\s+the\s+world|globally)\b/.test(
      t,
    ) ||
    /\bgoing\s+on\s+on\s+earth\b/.test(t) ||
    (/\bplanet\b/.test(t) &&
      /\b(news|happening|today|right\s+now|going\s+on|headlines?)\b/.test(
        t,
      ));

  return worldish;
}

export function getLiveNewsRankingMode(userText: string): "global" | "regional" {
  const geo = extractLiveNewsGeoFocus(userText);
  if (
    detectGlobalWorldNewsIntent(userText) &&
    (!geo || isGlobalPlaceToken(geo))
  ) {
    return "global";
  }
  return "regional";
}

/** Higher = prefer for citations and cluster lead article. */
export function liveNewsSourceQualityTier(domain: string): number {
  const d = domain.toLowerCase();
  if (WIRE_MAJOR.test(d)) return 4;
  if (OFFICIAL_HOST.test(d)) return 4;
  if (LOW_SIGNAL.test(d)) return 0;
  return 2;
}

const GLOBAL_GEO =
  /war|conflict|invasion|missile|strike|sanction|gaza|ukrain|taiwan|iran|israel|palestin|nato|un security|security council|ceasefire|military|coup|border|troops|defense secretary|pentagon|xi jinping|putin|khamenei|terror attack|hostage|nuclear|g7\b|g20|summit(?!\s+local)|bilateral crisis|armed clash/i;
const GLOBAL_ECON =
  /fed\b|interest rate|inflation|recession|stock market|trade war|tariff|oil price|opec|currency crash|imf|debt default|bond yield|wall street|supply chain|commodities rout|central bank/i;
const GLOBAL_SCI =
  /nasa|spacex|space ?x|rocket launch|orbit|mars\b|moon mission|quantum|ai chip|breakthrough|clinical trial|nobel|telescope|james webb/i;
const GLOBAL_HUM =
  /earthquake|tsunami|hurricane|typhoon|cyclone|flood|famine|refugee|humanitarian|evacuation|aftershock|landslide|wildfire|outbreak|pandemic|cholera/i;
const GLOBAL_CULT =
  /olympics|world cup|oscar|grammy|super bowl|met gala|nobel peace/i;
const HYPER_LOCAL =
  /traffic stop|county fair|local high school|high school football|shoplifting|parking lot|minor injury|routine arrest/i;

function globalSignificanceScore(blob: string): number {
  const t = blob.slice(0, 900);
  const raw = [
    GLOBAL_GEO.test(t) ? 100 : 0,
    GLOBAL_ECON.test(t) ? 78 : 0,
    GLOBAL_HUM.test(t) ? 72 : 0,
    GLOBAL_SCI.test(t) ? 60 : 0,
    GLOBAL_CULT.test(t) ? 28 : 0,
  ];
  const primary = Math.max(...raw);
  const secondary = raw.reduce((a, b) => a + b, 0) - primary;
  let score = primary + Math.min(28, secondary * 0.15);
  if (HYPER_LOCAL.test(t) && primary < 48) score -= 35;
  if (primary >= 70 && (GLOBAL_GEO.test(t) || GLOBAL_ECON.test(t))) score += 6;
  return score;
}

type GlobalTier = "geo" | "econ" | "hum" | "sci" | "cult" | "other";

const GLOBAL_TIER_ORDER: GlobalTier[] = [
  "geo",
  "econ",
  "hum",
  "sci",
  "cult",
  "other",
];

function globalTierDisplayLabel(tier: GlobalTier): string {
  switch (tier) {
    case "geo":
      return "Geopolitical / security";
    case "econ":
      return "Global economy / markets";
    case "hum":
      return "Humanitarian / disaster";
    case "sci":
      return "Science / space / technology";
    case "cult":
      return "Culture / symbolic";
    default:
      return "General / other";
  }
}

function inferGlobalPrimaryTier(blob: string): GlobalTier {
  const t = blob.slice(0, 900);
  const scored: { tier: GlobalTier; val: number }[] = [
    { tier: "geo", val: GLOBAL_GEO.test(t) ? 100 : 0 },
    { tier: "econ", val: GLOBAL_ECON.test(t) ? 78 : 0 },
    { tier: "hum", val: GLOBAL_HUM.test(t) ? 72 : 0 },
    { tier: "sci", val: GLOBAL_SCI.test(t) ? 60 : 0 },
    { tier: "cult", val: GLOBAL_CULT.test(t) ? 28 : 0 },
  ];
  let best: GlobalTier = "other";
  let bestVal = -1;
  for (const { tier, val } of scored) {
    if (val > bestVal) {
      bestVal = val;
      best = tier;
    } else if (val === bestVal && val > 0) {
      const prevIdx = GLOBAL_TIER_ORDER.indexOf(best);
      const nextIdx = GLOBAL_TIER_ORDER.indexOf(tier);
      if (nextIdx < prevIdx) best = tier;
    }
  }
  return bestVal <= 0 ? "other" : best;
}

function regionalDiversityScore(c: StoryCluster): number {
  const blob = `${c.representativeTitle} ${c.leadSnippet}`.toLowerCase();
  let s = c.maxScore * 12;
  if (/\b(econom|market|inflation|fuel|oil|rupiah|rupee|gdp|trade|bank)\b/.test(blob))
    s += 28;
  if (/\b(health|disease|farm|crop|food|hospital|outbreak|bird flu|vaccin)\b/.test(blob))
    s += 26;
  if (
    /\b(diplomat|embassy|foreign minister|bilateral|summit|un general|treaty|ambassador)\b/.test(
      blob,
    )
  )
    s += 26;
  if (/\b(fuel|diesel|petrol|power outage|electricity|energy)\b/.test(blob))
    s += 22;
  if (/\b(politics|election|parliament|minister|prime minister|president|opposition|coalition)\b/.test(blob))
    s += 14;
  return s;
}

type ScoredCluster = {
  c: StoryCluster;
  score: number;
  tier: GlobalTier;
};

function roundRobinGlobalSnapshot(scored: ScoredCluster[]): StoryCluster[] {
  const buckets = new Map<GlobalTier, ScoredCluster[]>();
  for (const t of GLOBAL_TIER_ORDER) buckets.set(t, []);
  for (const item of scored) {
    buckets.get(item.tier)?.push(item);
  }
  for (const t of GLOBAL_TIER_ORDER) {
    buckets.get(t)?.sort((a, b) => b.score - a.score);
  }
  const maxRounds = Math.max(
    0,
    ...GLOBAL_TIER_ORDER.map((t) => buckets.get(t)?.length ?? 0),
  );
  const out: StoryCluster[] = [];
  for (let i = 0; i < maxRounds; i++) {
    for (const t of GLOBAL_TIER_ORDER) {
      const row = buckets.get(t);
      if (row && row[i]) out.push(row[i].c);
    }
  }
  return out;
}

/**
 * Global: round-robin by significance **tier** (geo → econ → hum → sci → cult) so the rundown reads
 * like an intentional snapshot, not five variants of the same beat. Regional: score-only order.
 */
export function rankClustersBySignificance(
  clusters: StoryCluster[],
  mode: "global" | "regional",
): StoryCluster[] {
  if (clusters.length <= 1) return clusters;

  const scored: ScoredCluster[] = clusters.map((c) => {
    const blob = `${c.representativeTitle} ${c.leadSnippet} ${c.results.map((r) => `${r.title} ${(r.content ?? "").slice(0, 80)}`).join(" ")}`;
    if (mode === "global") {
      const tier = inferGlobalPrimaryTier(blob);
      return {
        c,
        score: globalSignificanceScore(blob),
        tier,
      };
    }
    return {
      c,
      score: regionalDiversityScore(c) + globalSignificanceScore(blob) * 0.35,
      tier: "other",
    };
  });

  if (mode === "global") {
    return roundRobinGlobalSnapshot(scored);
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.c);
}

function sortClusterArticlesByQualityAndScore(
  arr: EnrichedResult[],
): EnrichedResult[] {
  return [...arr].sort((a, b) => {
    const qa = liveNewsSourceQualityTier(a.domain);
    const qb = liveNewsSourceQualityTier(b.domain);
    if (qb !== qa) return qb - qa;
    return b.score - a.score;
  });
}

function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function similarityArticle(a: EnrichedResult, b: EnrichedResult): number {
  const ta = tokenize(`${a.title} ${(a.content ?? "").slice(0, 200)}`);
  const tb = tokenize(`${b.title} ${(b.content ?? "").slice(0, 200)}`);
  return jaccard(ta, tb);
}

function enrich(r: SearchResult): EnrichedResult | null {
  const domain = extractDomain(r.url);
  if (!domain) return null;
  return { ...r, domain };
}

function clusterDomainQuality(domains: string[]): "high" | "mixed" | "low" {
  let high = 0;
  let low = 0;
  for (const d of domains) {
    if (WIRE_MAJOR.test(d)) high++;
    if (LOW_SIGNAL.test(d)) low++;
  }
  if (high >= 1 && low === 0) return "high";
  if (low >= domains.length && domains.length > 0) return "low";
  return "mixed";
}

function summarizeCluster(id: string, arr: EnrichedResult[]): StoryCluster {
  const sorted = sortClusterArticlesByQualityAndScore(arr);
  const top = sorted[0]!;
  const domains = [...new Set(sorted.map((r) => r.domain))];
  const hasWireOrMajor = domains.some((d) => WIRE_MAJOR.test(d));
  const hasOfficial = domains.some((d) => OFFICIAL_HOST.test(d));
  const leadSnippet = (top.content ?? "").replace(/\s+/g, " ").trim().slice(0, 280);

  return {
    id,
    results: sorted,
    representativeTitle: top.title,
    leadSnippet,
    domains,
    independentDomainCount: domains.length,
    maxScore: top.score,
    hasWireOrMajor,
    hasOfficial,
    domainQualityTier: clusterDomainQuality(domains),
  };
}

const SIM_THRESHOLD = 0.26;

/**
 * Greedy clustering by title+snippet Jaccard; caps at `maxClusters` by merging weakest.
 */
export function clusterLiveNewsResults(
  results: SearchResult[],
  maxClusters = 6,
): StoryCluster[] {
  const filtered = results.filter((r) => !isExcludedLiveNewsSourceUrl(r.url));
  const enriched = filtered
    .map(enrich)
    .filter((r): r is EnrichedResult => r !== null);
  if (enriched.length === 0) return [];

  enriched.sort((a, b) => b.score - a.score);

  const clusters: EnrichedResult[][] = [];
  for (const r of enriched) {
    let placed = false;
    for (const c of clusters) {
      const rep = c[0]!;
      if (similarityArticle(r, rep) >= SIM_THRESHOLD) {
        c.push(r);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([r]);
  }

  while (clusters.length > maxClusters) {
    let minIdx = 0;
    let minScore = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      const mx = Math.max(...clusters[i]!.map((x) => x.score));
      if (mx < minScore) {
        minScore = mx;
        minIdx = i;
      }
    }
    const orphan = clusters.splice(minIdx, 1)[0]!;
    if (clusters.length === 0) {
      clusters.push(orphan);
      break;
    }
    let bestJ = 0;
    let bestSim = -1;
    for (let j = 0; j < clusters.length; j++) {
      const s = similarityArticle(orphan[0]!, clusters[j]![0]!);
      if (s > bestSim) {
        bestSim = s;
        bestJ = j;
      }
    }
    clusters[bestJ]!.push(...orphan);
  }

  clusters.sort((a, b) => {
    const ma = Math.max(...a.map((x) => x.score));
    const mb = Math.max(...b.map((x) => x.score));
    return mb - ma;
  });

  return clusters.map((c, i) => summarizeCluster(`cluster-${i + 1}`, c));
}

/** Prefer 1 wire + 1 local + 1 official when possible — narrative for the model. */
export function buildSourceDiversityGuidance(clusters: StoryCluster[]): string {
  const allDomains = new Set<string>();
  for (const c of clusters) {
    for (const d of c.domains) {
      if (!WIKIPEDIA_HOST.test(d)) allDomains.add(d);
    }
  }
  const list = [...allDomains];
  const wires = list.filter((d) => WIRE_MAJOR.test(d));
  const official = list.filter((d) => OFFICIAL_HOST.test(d));
  const localOrOther = list.filter(
    (d) => !WIRE_MAJOR.test(d) && !OFFICIAL_HOST.test(d),
  );

  const lines: string[] = [
    "### Source mix (enforced preference)",
    `- Distinct domains across retrieval: **${list.length}**`,
    `- Wire / major international-style domains spotted: ${wires.length ? wires.slice(0, 5).join(", ") : "(none — say *Limited live coverage* and lean on what exists)"}`,
    `- Official / institutional hosts: ${official.length ? official.slice(0, 4).join(", ") : "(none found)"}`,
    `- Other / local-style: ${localOrOther.length ? localOrOther.slice(0, 6).join(", ") : "(none)"}`,
    "- **Do not** build the whole briefing from a single domain unless results leave no choice — then use the **Limited live coverage** / **Single-source report** labels.",
    "- Deprioritize obvious syndication duplicates; each numbered headline should be a **different story** (see clusters below).",
    "- **Topic spread:** For broad national/region roundups, cover **at least 3 different themes** (politics, economy, science/space where relevant, health/disaster, international/diplomacy) when clusters support it — do not let one political storyline consume the whole briefing.",
    "- **Source quality:** Prefer **Reuters, AP, BBC**-class wires, **official** domains, and **strong local outlets** for claims; treat social and marginal blogs as *Developing* or low confidence. **Never** list Wikipedia as a current-news source.",
  ];
  return lines.join("\n");
}

function buildGeoTopicBucketQueries(g: string): string[] {
  const place = g.trim();
  const buckets = [
    `latest news in ${place}`,
    `${place} politics latest`,
    `${place} economy latest`,
    `${place} fuel inflation latest`,
    `${place} health agriculture latest`,
    `${place} diplomacy international latest`,
  ];
  return [...new Set(buckets.map((q) => q.replace(/\s+/g, " ").trim()))];
}

function buildWorldTopicBucketQueries(): string[] {
  return [
    "latest world news",
    "biggest geopolitical developments today",
    "global economy markets latest today",
    "major science space news today",
    "humanitarian disaster news today",
    "major international summit diplomacy today",
  ];
}

/**
 * Broad overview → topic-bucketed prefetch: regional (place) vs global (world/earth).
 * Avoid entity-heavy query strings so one politician does not hijack retrieval.
 */
export function buildLiveNewsPrefetchQueries(userText: string): string[] {
  const raw = userText.trim().replace(/\s+/g, " ");
  const broad = detectBroadCurrentNewsOverviewIntent(userText);
  const geo = extractLiveNewsGeoFocus(raw);
  const globalWorld = detectGlobalWorldNewsIntent(raw);

  if (broad && geo && isGlobalPlaceToken(geo)) {
    return buildWorldTopicBucketQueries();
  }
  if (broad && globalWorld && !geo) {
    return buildWorldTopicBucketQueries();
  }
  if (broad && geo) {
    return buildGeoTopicBucketQueries(geo);
  }

  const core = raw.slice(0, 120);
  const q1 = core.length >= 8 ? `${core} latest news` : `${raw} latest news`;
  const q2 =
    core.length >= 8 ? `${core} breaking updates today` : `${raw} news today`;
  const out = [...new Set([q1, q2])];
  return out.slice(0, 2);
}

export function formatClustersForSystemPrompt(
  clusters: StoryCluster[],
  opts?: { rankingMode?: "global" | "regional" },
): string {
  if (clusters.length === 0) {
    return "### Story clusters (pre-deduped)\n(No articles clustered — treat as weak retrieval.)";
  }

  const rankingMode = opts?.rankingMode ?? "regional";
  const globalInstructions =
    rankingMode === "global"
      ? [
          "**Global snapshot:** Clusters are **ranked for global significance** and **interleaved** across lenses (geopolitical → economic → humanitarian → science → culture) so the rundown reads like an **international wire**, not one beat repeated. **Follow cluster order #1, #2…** as the backbone of your headline sequence unless the user narrowed the scope.",
        ]
      : [];

  const lines: string[] = [
    "### Story clusters (pre-deduped — one headline per cluster)",
    `The backend merged similar URLs/snippets into **${clusters.length}** topic groups from **parallel topic-bucket** searches (not one narrow query). Articles within each cluster are **ordered by source quality** (wires, official, strong outlets first). Write **3–6** numbered headlines—**one primary story per cluster**—with **claim-level markdown links** (\`[Reuters](url)\`, \`[BBC](url)\`) **in** the bullet; a sources-only footer is **not** enough.`,
    "**Topic diversity:** When evidence allows, cover **≥3 distinct categories** (e.g. Politics / Economy / Science / Health–disaster / Diplomacy). Do not output four bullets about the same political thread.",
    "**Per headline / bullet:** (1) **What happened** — one tight sentence; **every** outlet or title attribution must be a **markdown link**; **never** bare names like “Reuters said” or “according to BBC”. (2) Next line: **`*Why it matters:*`** one sentence — stakes for a global reader or why this belongs in a **world snapshot now**. (3) Then italic confidence (*Multi-source* · *N independent domains*, *Single-source*, etc.).",
    "**Per-bullet trust:** Use italic tags such as *Multi-source* · *Single-source* · *Conflicting reports* · *Developing* — honest and compact.",
    ...globalInstructions,
    "",
  ];

  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i]!;
    const v =
      c.independentDomainCount >= 2
        ? "multi_domain"
        : c.independentDomainCount === 1
          ? "single_domain"
          : "unknown";
    const tierBlob = `${c.representativeTitle} ${c.leadSnippet} ${c.results
      .slice(0, 12)
      .map((r) => `${r.title} ${(r.content ?? "").replace(/\s+/g, " ").trim()} ${r.domain}`)
      .join(" ")}`;
    const snapshotTier =
      rankingMode === "global" ? inferGlobalPrimaryTier(tierBlob) : null;
    lines.push(`#### Cluster ${i + 1} — ${c.representativeTitle}`);
    if (snapshotTier && rankingMode === "global") {
      lines.push(
        `- **Snapshot:** order **#${i + 1}** · primary lens **${globalTierDisplayLabel(snapshotTier)}** (tiers are interleaved for a balanced global read).`,
      );
    }
    lines.push(
      `- **Independent domains in cluster:** ${c.independentDomainCount} (${c.domains.join(", ")})`,
    );
    lines.push(`- **Verification hint:** ${v}`);
    lines.push(
      `- **Quality:** ${c.domainQualityTier}${c.hasOfficial ? " · includes official/institutional host" : ""}${c.hasWireOrMajor ? " · includes wire/major outlet" : ""}`,
    );
    lines.push(`- **Lead snippet:** ${c.leadSnippet}`);
    lines.push("**Articles (cite these, prefer diverse domains):**");
    for (const r of c.results.slice(0, 5)) {
      const sn = (r.content ?? "").replace(/\s+/g, " ").trim().slice(0, 220);
      const pub = r.published_date?.trim();
      lines.push(
        `- [${r.title}](${r.url}) — _${r.domain}_${pub ? ` · ${pub}` : ""} — ${sn}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function dominantDomainShare(clusters: StoryCluster[]): number {
  const counts = new Map<string, number>();
  let total = 0;
  for (const c of clusters) {
    for (const r of c.results) {
      counts.set(r.domain, (counts.get(r.domain) ?? 0) + 1);
      total++;
    }
  }
  if (total === 0) return 0;
  let max = 0;
  for (const n of counts.values()) max = Math.max(max, n);
  return max / total;
}

// ─── Structured JSON (model output) ─────────────────────────────────────────

const citationSchema = z.object({
  title: z.string(),
  url: z.string(),
  domain: z.string().optional(),
  publishedAt: z.string().optional(),
});

const headlineSchema = z.object({
  topicLabel: z.string(),
  claim: z.string(),
  whyItMatters: z.string().optional(),
  citations: z.array(citationSchema),
  verificationLevel: z.enum([
    "multi_source",
    "single_source",
    "conflicting",
    "limited_coverage",
    "developing",
  ]),
  confidenceLabel: z.string().optional(),
  independentDomainCount: z.number().optional(),
});

export const liveNewsStructuredPayloadSchema = z.object({
  headlines: z.array(headlineSchema),
  dominantDomainShare: z.number().optional(),
});

export const LIVE_NEWS_JSON_FENCE = "nexora-live-news-json";

/** Remove fenced JSON block from visible assistant markdown. */
export function stripLiveNewsJsonFromText(text: string): string {
  const re = new RegExp(
    "```\\s*" +
      LIVE_NEWS_JSON_FENCE +
      "\\s*[\\s\\S]*?```",
    "i",
  );
  return text.replace(re, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function parseLiveNewsStructuredPayload(
  text: string,
): LiveNewsStructuredPayload | null {
  const re = new RegExp(
    "```\\s*" + LIVE_NEWS_JSON_FENCE + "\\s*([\\s\\S]*?)```",
    "i",
  );
  const m = text.match(re);
  if (!m?.[1]) return null;
  try {
    const raw = JSON.parse(m[1].trim()) as unknown;
    const parsed = liveNewsStructuredPayloadSchema.safeParse(raw);
    if (!parsed.success) return null;
    return normalizeStructuredPayload(parsed.data);
  } catch {
    return null;
  }
}

function normalizeDomain(url: string): string {
  return extractDomain(url);
}

function normalizeStructuredPayload(
  data: z.infer<typeof liveNewsStructuredPayloadSchema>,
): LiveNewsStructuredPayload {
  return {
    ...data,
    headlines: data.headlines.map((h) => {
      const citations = h.citations
        .filter((c) => !isExcludedLiveNewsSourceUrl(c.url))
        .map((c) => ({
          ...c,
          domain: c.domain?.trim() || normalizeDomain(c.url),
        }));
      const domains = [...new Set(citations.map((c) => c.domain).filter(Boolean))];
      const count = domains.length;
      let verificationLevel = h.verificationLevel;
      if (verificationLevel === "multi_source" && count < 2) {
        verificationLevel = "single_source";
      }
      const confidenceLabel =
        h.confidenceLabel?.trim() ||
        defaultConfidenceLabel(verificationLevel, count);
      return {
        ...h,
        citations,
        verificationLevel,
        independentDomainCount: h.independentDomainCount ?? count,
        confidenceLabel,
        whyItMatters: h.whyItMatters?.trim() || undefined,
      };
    }),
  };
}

export function defaultConfidenceLabel(
  level: LiveNewsVerificationLevel,
  domainCount: number,
): string {
  switch (level) {
    case "multi_source":
      return "Multi-source";
    case "single_source":
      return "Single-source";
    case "conflicting":
      return "Conflicting reports";
    case "limited_coverage":
      return "Limited live coverage";
    case "developing":
      return "Developing";
    default:
      return domainCount >= 2 ? "Multi-source" : "Single-source";
  }
}

/**
 * Merge several Tavily responses for clustering (more than default 8).
 */
export function mergeLiveNewsPrefetchResponses(
  responses: SearchResponse[],
): SearchResponse {
  const cleaned = responses.map((r) => filterLiveNewsSearchResponse(r));
  return mergeSearchResponses(cleaned, 40);
}
