/**
 * Stricter retrieval + prompt shaping for very recent politics / government questions.
 */

import type { TavilyResult } from "@/lib/search";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Lower tier = sort first (wire + major regional papers the product trusts). */
export function politicalSourceTierFromUrl(url: string): number {
  return politicalNewsTier(hostname(url));
}

/** Lower tier = sort first (wire + major regional papers the product trusts). */
function politicalNewsTier(domain: string): number {
  if (!domain) return 50;
  const d = domain;

  const tier0 =
    /^(www\.)?reuters\.com$/i.test(d) ||
    /^(.+\.)?bbc\.(com|co\.uk)$/i.test(d) ||
    /^(www\.)?apnews\.com$/i.test(d) ||
    /^(www\.)?aljazeera\.com$/i.test(d) ||
    /^(www\.)?kathmandupost\.com$/i.test(d) ||
    /^(www\.)?thehimalayantimes\.com$/i.test(d);

  if (tier0) return 0;

  const tier1 =
    /^(www\.)?nepalnews\.com$/i.test(d) ||
    /^(www\.)?onlinekhabar\.com$/i.test(d) ||
    /\.gov\.np$/i.test(d) ||
    /^(www\.)?nepal\.gov\.np$/i.test(d);

  if (tier1) return 1;

  const tier2 =
    /^(www\.)?nytimes\.com$/i.test(d) ||
    /^(www\.)?theguardian\.com$/i.test(d) ||
    /^(www\.)?washingtonpost\.com$/i.test(d) ||
    /^(www\.)?economist\.com$/i.test(d) ||
    /^(www\.)?ft\.com$/i.test(d);

  if (tier2) return 2;

  return 10;
}

/**
 * Re-order Tavily hits so trusted wires / major papers lead (model reads context in order).
 */
export function prioritizePoliticalNewsSources(results: TavilyResult[]): TavilyResult[] {
  return [...results].sort((a, b) => {
    const da = hostname(a.url);
    const db = hostname(b.url);
    const ta = politicalNewsTier(da);
    const tb = politicalNewsTier(db);
    if (ta !== tb) return ta - tb;
    return b.score - a.score;
  });
}

/**
 * Recent politics / government where answers must not treat blogs like wires,
 * and must separate fact vs announcement vs speculation.
 */
export function detectStrictPoliticalNewsQuery(query: string): boolean {
  const t = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (t.length < 12) return false;

  const political =
    /\b(pm|p\.m\.|prime\s+minister|president|mayor|governor|chief\s+minister|premier|cabinet|parliament|congress|senate|house\s+of\s+representatives|ruling\s+party|opposition|coalition|ministers?|sworn\s+in|inaugurat|oath\s+of\s+office|vote\s+of\s+confidence|snap\s+election|by-?election|legislature|downing\s+street|white\s+house)\b/.test(
      t,
    );

  const recentOrActions =
    /\b(current|latest|recent|today|right\s+now|this\s+week|since|after\s+becoming|new\s+pm|new\s+president|took\s+office|entered\s+office|just\s+elected)\b/.test(
      t,
    ) ||
    /\b(work\s+done|accomplishments?|achievements?|track\s+record|what\s+has\b|what\s+did\b|policies?\s+(passed|enacted|signed|announced)|agenda)\b/.test(
      t,
    ) ||
    /\b(cabinet\s+size|ministers?\s+appointed|swearing-?in\s+date|when\s+did\b)\b/.test(
      t,
    );

  return political && recentOrActions;
}

/**
 * Evidence block with **plain URLs** (fewer broken markdown pipes than nested link lists).
 */
export function formatPoliticalNewsEvidenceBlock(results: TavilyResult[]): string {
  if (!results.length) return "";

  const excerpts: string[] = [];
  const sourceLines: string[] = [];

  results.forEach((r, i) => {
    const dom = hostname(r.url) || "unknown";
    const tier = politicalNewsTier(dom);
    const tierLabel =
      tier === 0 ? "priority outlet" : tier <= 2 ? "major/regional" : "other";
    excerpts.push(
      `### ${i + 1}. ${r.title}\n- Domain: ${dom} (${tierLabel})\n- URL: ${r.url}\n- Excerpt: ${r.content.slice(0, 420).trim().replace(/\s+/g, " ")}`,
    );
    sourceLines.push(
      `${i + 1}. ${r.title} | ${dom} | ${r.url}`,
    );
  });

  return [
    "## Retrieved excerpts (ordered: wire services & trusted papers first)",
    excerpts.join("\n\n"),
    "",
    "## Source index (plain text — use these URLs in your answer’s Sources section)",
    sourceLines.join("\n"),
  ].join("\n");
}
