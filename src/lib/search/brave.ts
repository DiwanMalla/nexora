import type { SearchOptions, SearchResponse, SearchResult } from "./types";

type BraveWebItem = {
  title?: string;
  url?: string;
  description?: string;
};

type BraveSearchPayload = {
  web?: {
    results?: BraveWebItem[];
  };
};

export async function braveSearch(
  query: string,
  options?: SearchOptions,
): Promise<SearchResponse> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("Missing BRAVE_SEARCH_API_KEY environment variable.");
  }

  const maxResults = options?.maxResults ?? 5;
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(maxResults));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brave search failed (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as BraveSearchPayload;
  const webResults = payload.web?.results ?? [];

  const results: SearchResult[] = webResults
    .slice(0, maxResults)
    .map((item, index) => {
      const maxRank = Math.max(maxResults, 1);
      const score = Number(((maxRank - index) / maxRank).toFixed(3));

      return {
        title: item.title?.trim() || "Untitled",
        url: item.url?.trim() || "",
        content: item.description?.trim() || "",
        score,
      };
    });

  return {
    query,
    results: results.filter((item) => item.url.length > 0),
  };
}
