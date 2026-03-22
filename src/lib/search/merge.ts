import type { SearchResponse, SearchResult } from "./types";

export function mergeSearchResponses(
  responses: SearchResponse[],
  maxResults = 8,
): SearchResponse {
  const mergedByUrl = new Map<string, SearchResult>();
  let answer: string | undefined;
  const images: string[] = [];
  const query = responses[0]?.query ?? "";

  for (const response of responses) {
    if (!answer && response.answer) {
      answer = response.answer;
    }

    if (Array.isArray(response.images)) {
      images.push(...response.images);
    }

    for (const result of response.results) {
      const normalizedUrl = result.url.trim();
      if (!normalizedUrl) continue;

      const existing = mergedByUrl.get(normalizedUrl);
      if (!existing || result.score > existing.score) {
        mergedByUrl.set(normalizedUrl, {
          ...result,
          url: normalizedUrl,
        });
      }
    }
  }

  const mergedResults = [...mergedByUrl.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return {
    query,
    answer,
    images: images.length > 0 ? [...new Set(images)] : undefined,
    results: mergedResults,
  };
}
