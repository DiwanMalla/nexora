/**
 * Typed client for the Nexora API.
 *
 * Wraps `fetch` with proper error handling and type-safe request/response
 * shapes so that callers don't need to manually construct headers, parse
 * JSON, or duplicate error-handling logic.
 */

import type {
  ChatAPIRequest,
  ChatAPIResponse,
  LiveNewsStreamProgressStage,
} from "@/types";

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

type NdjsonChatEvent =
  | { type: "progress"; stage: LiveNewsStreamProgressStage }
  | {
      type: "done";
      text?: string;
      model?: string;
      meta?: ChatAPIResponse["meta"];
      error?: string;
      details?: string;
    }
  | { type: "error"; error: string };

/**
 * Live-news path: NDJSON stream with `progress` lines then a final `done` object.
 */
export async function sendChatMessageStream(
  payload: ChatAPIRequest,
  onProgress: (stage: LiveNewsStreamProgressStage) => void,
): Promise<ChatAPIResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, stream: true }),
  });

  if (!response.ok) {
    let message = "Unable to get a response.";
    try {
      const data = (await response.json()) as ChatAPIResponse;
      message = data.details || data.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let last: ChatAPIResponse = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let ev: NdjsonChatEvent;
      try {
        ev = JSON.parse(trimmed) as NdjsonChatEvent;
      } catch {
        continue;
      }
      if (ev.type === "progress" && ev.stage) {
        onProgress(ev.stage);
      }
      if (ev.type === "done") {
        last = {
          text: ev.text,
          model: ev.model,
          meta: ev.meta,
          error: ev.error,
          details: ev.details,
        };
      }
      if (ev.type === "error") {
        throw new Error(ev.error || "Stream error.");
      }
    }
  }

  return last;
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
  options?: {
    webSearch?: boolean;
    conversationId?: string;
    attachmentIds?: string[];
  },
): Promise<{ modelId: string; text: string }[]> {
  const webSearch = options?.webSearch !== false;
  return Promise.all(
    modelIds.map(async (modelId) => {
      try {
        const data = await sendChatMessage({
          model: modelId,
          messages,
          webSearch,
          conversationId: options?.conversationId,
          attachmentIds: options?.attachmentIds,
        });
        if (data.meta) {
          console.log(
            `[Nexora chat] ${modelId} (${data.meta.displayName ?? data.meta.modelId ?? modelId})`,
            data.meta,
          );
        } else {
          console.log(`[Nexora chat] ${modelId}`, data.model ?? "(no meta)");
        }
        return { modelId, text: data.text?.trim() || "No response." };
      } catch {
        return { modelId, text: "Something went wrong." };
      }
    }),
  );
}
