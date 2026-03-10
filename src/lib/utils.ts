import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a UUID v4. Uses crypto.randomUUID() when available (modern browsers/Node),
 * otherwise falls back to crypto.getRandomValues() or a simple random fallback
 * so it works on older browsers and environments where randomUUID is not defined.
 */
export function randomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Removes <think>...</think> blocks from model output so they are not shown in the UI.
 * Also removes any trailing unclosed <think> (streaming).
 */
export function stripThinkBlocks(text: string): string {
  if (!text || typeof text !== "string") return text;
  let out = text;
  // Remove complete <think>...</think> blocks (non-greedy, match newlines)
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Remove trailing unclosed <think>... (streaming)
  out = out.replace(/<think>[\s\S]*$/i, "").trim();
  return out;
}

/**
 * True if the text contains an unclosed <think> tag (model is still "thinking").
 */
export function hasUnclosedThink(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const open = /<think>/i.test(text);
  const closed = /<\/think>/i.test(text);
  return open && !closed;
}
