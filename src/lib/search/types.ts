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
}

export interface SearchResponse {
  answer?: string;
  results: SearchResult[];
  images?: string[];
  query: string;
}
