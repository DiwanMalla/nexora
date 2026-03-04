/**
 * OpenRouter provider for Vercel AI SDK (streamText, useChat).
 * Uses OPENROUTER_API_KEY from env; server-side only.
 * @see https://openrouter.ai/docs/community/vercel-ai-sdk
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/** Lazy OpenRouter provider (reads OPENROUTER_API_KEY when first used). */
function getOpenRouter() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  return createOpenRouter({ apiKey: key, compatibility: "strict" });
}

export { getOpenRouter };
