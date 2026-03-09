import { AVAILABLE_MODELS } from "./constants";

const STORAGE_KEY = "nexora.account.settings.v2";

type StoredSettings = {
  competingModelIds?: string[];
};

/** Default: no competing models, so the selected model in the dropdown is used. */
const defaultCompetingIds: string[] = [];

/**
 * Returns the list of model IDs that should compete and produce a consensus response in AI Chat.
 * When 2+ are returned, the chat API runs them in parallel and synthesizes one agreed answer.
 * When empty (default), only the currently selected model in the UI is used.
 */
export function getCompetingModelIds(): string[] {
  if (typeof window === "undefined") return defaultCompetingIds;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCompetingIds;
    const parsed = JSON.parse(raw) as StoredSettings;
    const ids = parsed.competingModelIds;
    if (!Array.isArray(ids)) return defaultCompetingIds;
    const valid = ids.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
    // Migration: old default was first 2 models; treat as "no competing" so dropdown is used
    const oldDefault =
      AVAILABLE_MODELS.length >= 2 &&
      valid.length === 2 &&
      valid[0] === AVAILABLE_MODELS[0].id &&
      valid[1] === AVAILABLE_MODELS[1].id;
    if (oldDefault) return defaultCompetingIds;
    return valid;
  } catch {
    return defaultCompetingIds;
  }
}
