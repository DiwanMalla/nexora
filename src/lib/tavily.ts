export interface TavilySearchOptions {
  maxResults?: number;
  includeImages?: boolean;
}

export interface TavilyImageResult {
  url: string;
  title: string;
  sourceUrl?: string;
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  answer?: string;
  results: TavilyResult[];
  images?: string[];
  query: string;
}

export async function tavilySearch(
  query: string,
  options?: TavilySearchOptions,
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY environment variable.");
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      include_answer: true,
      include_images: options?.includeImages ?? false,
      include_raw_content: false,
      max_results: options?.maxResults || 5,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Tavily search failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data as TavilySearchResponse;
}

export async function tavilyImageSearch(
  query: string,
  options?: TavilySearchOptions,
): Promise<TavilyImageResult[]> {
  const response = await tavilySearch(query, {
    ...options,
    includeImages: true,
  });

  const imageUrls = response.images ?? [];

  return imageUrls.slice(0, options?.maxResults ?? 8).map((url, index) => ({
    url,
    title: response.results[index]?.title ?? query,
    sourceUrl: response.results[index]?.url,
  }));
}
