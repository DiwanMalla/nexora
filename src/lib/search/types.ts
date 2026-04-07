export interface SearchOptions {
  maxResults?: number;
  includeImages?: boolean;
}

export interface ImageResult {
  url: string;
  title: string;
  sourceUrl?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  /** Present when the search provider returns a publish time. */
  published_date?: string;
}

export interface SearchResponse {
  answer?: string;
  results: SearchResult[];
  images?: string[];
  query: string;
}
