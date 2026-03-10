/**
 * Typed client for the Nexora API.
 *
 * Wraps `fetch` with proper error handling and type-safe request/response
 * shapes so that callers don't need to manually construct headers, parse
 * JSON, or duplicate error-handling logic.
 */

import type { ChatAPIRequest, ChatAPIResponse } from "@/types";

/**
 * Sends a chat completion request to the `/api/chat` endpoint.
 *
 * @param payload - The chat request body.
 * @returns The parsed API response.
 * @throws {Error} With a user-friendly message on network or server errors.
 */
export async function sendChatMessage(
  payload: ChatAPIRequest,
): Promise<ChatAPIResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data: ChatAPIResponse = await response.json();

  if (!response.ok) {
    const message = data.details || data.error || "Unable to get a response.";
    throw new Error(message);
  }

  return data;
}

/**
 * Sends the same prompt to multiple models in parallel (for multi-chat mode).
 *
 * @param messages - The conversation history.
 * @param modelIds - Array of model IDs to query simultaneously.
 * @returns Array of responses, one per model (errors become fallback text).
 */
export async function sendMultiModelMessages(
  messages: { role: string; content: string }[],
  modelIds: string[],
): Promise<{ modelId: string; text: string }[]> {
  return Promise.all(
    modelIds.map(async (modelId) => {
      try {
        const data = await sendChatMessage({ model: modelId, messages });
        return { modelId, text: data.text?.trim() || "No response." };
      } catch {
        return { modelId, text: "Something went wrong." };
      }
    }),
  );
}
