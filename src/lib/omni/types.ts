export interface QueryAnalysis {
  category: string;
  needsWebSearch: boolean;
  searchQuery: string;
  reasoning: string;
  recommendedModel: "coding" | "heavyReasoning" | "complexWriting" | "simple";
}

export type RouteModelKey =
  | "coding"
  | "heavyReasoning"
  | "complexWriting"
  | "simple";

export type TaskType =
  | "general_qa"
  | "web_research"
  | "artifact_inspection"
  | "code_debugging"
  | "document_summarization"
  | "comparison"
  | "creative_writing";

export type ArtifactType =
  | "github_repo"
  | "webpage"
  | "docs_site"
  | "pdf"
  | "file"
  | "zip"
  | "spreadsheet"
  | "image"
  | "log_text"
  | "api_spec"
  | "unknown"
  | "none";

export type GroundingRequirement = "none" | "recommended" | "required";

export type RetrievalStrategy =
  | "none"
  | "web_search"
  | "direct_url_fetch"
  | "repo_fetch"
  | "file_parse"
  | "ocr"
  | "multi_step";

export interface QueryPlan {
  taskType: TaskType;
  artifactType: ArtifactType;
  groundingRequirement: GroundingRequirement;
  retrievalStrategy: RetrievalStrategy;
  searchQuery: string;
  reasoning: string;
  recommendedModel: RouteModelKey;
}

export interface RetrievalAttempt {
  strategy: RetrievalStrategy | "fallback_web_search";
  target: string;
  success: boolean;
  error?: string;
}

export interface RetrievalEvidence {
  sources: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
  extractedFields: string[];
}

export interface RetrievalLog {
  strategyChosen: RetrievalStrategy;
  attempts: RetrievalAttempt[];
  evidence: RetrievalEvidence;
  fallbackUsed: boolean;
}

export interface RepoParsedEvidence {
  filesRetrieved: string[];
  scripts: Record<string, string>;
  dependencies: string[];
  envVars: string[];
  apiRoutes: string[];
  milestoneHeadings: string[];
  architectureSummary?: string;
}

export interface DirectUrlParsedEvidence {
  sourceUsed: "html" | "markdown" | "text";
  headings: string[];
  sections: Array<{
    heading: string;
    excerpt: string;
  }>;
  isMeaningful: boolean;
  visibleCharCount: number;
}
