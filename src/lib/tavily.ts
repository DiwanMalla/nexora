export async function tavilySearch(query: string, options?: { maxResults?: number }) {
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
      include_images: false,
      include_raw_content: false,
      max_results: options?.maxResults || 5,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Tavily search failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data;
}
