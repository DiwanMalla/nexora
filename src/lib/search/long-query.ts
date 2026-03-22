import { tavilySearch } from "./tavily";

const TAVILY_QUERY_LIMIT = 400;
const HUGE_QUERY_THRESHOLD = 900;

/**
 * In-memory cache for chunk-level query results.
 * Key format: tavily:<sha256(chunk)>
 */
const chunkResultCache = new Map<string, string>();

/**
 * Hash a string to produce a stable cache key.
 */
async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Split long user text into chunks that fit Tavily's 400-char limit.
 * Keeps words intact whenever possible.
 */
function splitIntoTavilySafeChunks(input: string): string[] {
  const text = input.trim();
  if (!text) return [];
  if (text.length <= TAVILY_QUERY_LIMIT) return [text];

  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= TAVILY_QUERY_LIMIT) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    // If a single token is longer than the limit, hard-split it.
    if (word.length > TAVILY_QUERY_LIMIT) {
      for (let i = 0; i < word.length; i += TAVILY_QUERY_LIMIT) {
        chunks.push(word.slice(i, i + TAVILY_QUERY_LIMIT));
      }
    } else {
      current = word;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * Convert Tavily response to markdown that is easy to merge later.
 */
export async function searchTavily(query: string): Promise<string> {
  const response = await tavilySearch(query, {
    maxResults: 5,
    includeImages: false,
  });

  const lines: string[] = [];

  if (response.answer) {
    lines.push("### Tavily Answer", `- ${response.answer}`);
  }

  if (response.results.length > 0) {
    lines.push("### Sources");
    for (const result of response.results) {
      const summary = result.content?.trim();
      lines.push(`- **${result.title}**`);
      lines.push(`  - URL: ${result.url}`);
      if (summary) {
        lines.push(`  - Insight: ${summary}`);
      }
    }
  }

  return lines.join("\n").trim();
}

/**
 * Low-cost local fallback. Kept deterministic and fast.
 */
export async function localLLM(query: string): Promise<string> {
  const trimmed = query.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "### Fallback Summary\n- No query content provided.";
  }

  const snippet =
    trimmed.length > 280 ? `${trimmed.slice(0, 280)}...` : trimmed;
  return [
    "### Fallback Summary",
    "- Tavily request was skipped or failed for this segment.",
    `- Query segment: ${snippet}`,
  ].join("\n");
}

/**
 * Normalize line for dedupe checks while preserving output formatting.
 */
function normalizeLineForDedupe(line: string): string {
  return line
    .trim()
    .toLowerCase()
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Merge multiple markdown fragments, remove duplicates/redundant lines,
 * and preserve readable structure.
 */
function mergeStructuredTexts(parts: string[]): string {
  const seen = new Set<string>();
  const mergedLines: string[] = [];

  for (const part of parts) {
    const lines = part.split("\n");

    for (const line of lines) {
      // Keep spacing blocks for readability.
      if (!line.trim()) {
        if (
          mergedLines.length > 0 &&
          mergedLines[mergedLines.length - 1] !== ""
        ) {
          mergedLines.push("");
        }
        continue;
      }

      const key = normalizeLineForDedupe(line);
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      mergedLines.push(line);
    }
  }

  return mergedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function getOrFetchChunkResult(chunk: string): Promise<string> {
  const hash = await sha256Hex(chunk);
  const cacheKey = `tavily:${hash}`;
  const cached = chunkResultCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const preferLocal = process.env.NEXORA_TAVILY_PREFER_LOCAL === "true";
  const chunkResult = preferLocal
    ? await localLLM(chunk)
    : await searchTavily(chunk);

  chunkResultCache.set(cacheKey, chunkResult);
  return chunkResult;
}

function isSearchLikeQuery(query: string): boolean {
  return /(find|recent|latest|news|article|cite|sources|research|compare|top|best|who is|what is|when did|where is)/i.test(
    query,
  );
}

function buildPolicyNote(message: string): string {
  return `### Retrieval Policy\n- ${message}`;
}

/**
 * Public helper for long query handling with chunking, cache, fallback,
 * and merged final output.
 */
export async function handleLongQuery(userQuery: string): Promise<string> {
  const query = userQuery.trim();
  if (!query) {
    return "### Notice\n- Empty query received.";
  }

  const warnings: string[] = [];
  const searchLike = isSearchLikeQuery(query);
  const allowLongTavily = process.env.NEXORA_ENABLE_LONG_TAVILY === "true";

  // Cost policy: large planning prompts are better handled locally.
  if (query.length > HUGE_QUERY_THRESHOLD && !allowLongTavily) {
    const fallback = await localLLM(query);
    return [
      fallback,
      buildPolicyNote(
        "Skipped Tavily for a huge query to reduce API costs; local reasoning was used instead.",
      ),
    ].join("\n\n");
  }

  // Cost policy: non-search queries should not trigger Tavily by default.
  if (
    !searchLike &&
    process.env.NEXORA_TAVILY_FORCE_FOR_NON_SEARCH !== "true"
  ) {
    const fallback = await localLLM(query);
    return [
      fallback,
      buildPolicyNote(
        "Skipped Tavily because query is not search-oriented; local reasoning was used to avoid unnecessary API calls.",
      ),
    ].join("\n\n");
  }

  // Cost-saving path: single Tavily call when query is within limit.
  if (query.length <= TAVILY_QUERY_LIMIT) {
    try {
      const singleResult = await getOrFetchChunkResult(query);
      return singleResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      warnings.push(`Single query failed: ${message}`);
      const fallback = await localLLM(query);
      return `${fallback}\n\n### Warnings\n- ${warnings.join("\n- ")}`;
    }
  }

  const chunks = splitIntoTavilySafeChunks(query);
  const chunkResults: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    try {
      const result = await getOrFetchChunkResult(chunk);
      chunkResults.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      warnings.push(`Chunk ${i + 1}/${chunks.length} failed: ${message}`);

      try {
        const fallback = await localLLM(chunk);
        chunkResults.push(fallback);
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : "Unknown local fallback error";
        warnings.push(
          `Chunk ${i + 1}/${chunks.length} local fallback failed: ${fallbackMessage}`,
        );
      }
    }
  }

  const merged = mergeStructuredTexts(chunkResults);

  if (!warnings.length) {
    return merged;
  }

  const warningBlock = `\n\n### Warnings\n${warnings.map((w) => `- ${w}`).join("\n")}`;
  return `${merged}${warningBlock}`;
}

/**
 * Example usage:
 *
 * const response = await handleLongQuery(userInput);
 * console.log(response);
 */
