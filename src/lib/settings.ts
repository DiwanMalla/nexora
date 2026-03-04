import { AVAILABLE_MODELS } from "./constants";

const STORAGE_KEY = "nexora.account.settings.v2";

type StoredSettings = {
  competingModelIds?: string[];
};

const defaultCompetingIds = AVAILABLE_MODELS.slice(0, 2).map((m) => m.id);

/**
 * Returns the list of model IDs that should compete and produce a consensus response in AI Chat.
 * When 2+ are returned, the chat API runs them in parallel and synthesizes one agreed answer.
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
    return valid.length > 0 ? valid : defaultCompetingIds;
  } catch {
    return defaultCompetingIds;
  }
}
