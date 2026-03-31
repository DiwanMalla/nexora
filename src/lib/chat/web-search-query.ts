/**
 * Normalizes model-authored webSearch queries for live / current-news turns.
 * Strips stale calendar years (e.g. 2024 in 2026) so Tavily gets clean, natural queries.
 */

import type { CurrentFactIntent } from "./current-fact";

const YEAR = /\b(19|20)\d{2}\b/g;

/**
 * User explicitly anchored a specific calendar year (historical or “in 2024” style).
 * In those cases we do not strip years from the search query.
 */
export function userAnchoredCalendarYearInQuestion(userText: string): boolean {
  const t = userText.trim();
  if (!t) return false;
  // "in 2024", "during 2019", "year 2020", "as of 2023"
  if (
    /\b(?:in|during|from|since|before|until|after|by|circa|c\.|around)\s+(19|20)\d{2}\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/\b(?:year|spring|summer|fall|autumn|winter)\s+(19|20)\d{2}\b/i.test(t)) {
    return true;
  }
  if (/\b(?:19|20)\d{2}\s+(?:election|war|crisis|pandemic|earthquake|revolution)\b/i.test(t)) {
    return true;
  }
  if (/\b(?:histor|archive|retro|former|previously|used to be|was the|were the)\b/i.test(t)) {
    return true;
  }
  return false;
}

/**
 * Any server-detected **current-fact** turn: strip stale years from the model’s
 * search string unless the user explicitly anchored a calendar year.
 */
export function shouldSanitizeSearchQueryForCurrentFact(
  userText: string,
  factIntent: CurrentFactIntent,
): boolean {
  if (!factIntent.currentFact) return false;
  if (userAnchoredCalendarYearInQuestion(userText)) return false;
  return true;
}

/**
 * Removes 4-digit years strictly before `referenceYear` (calendar year).
 * Keeps the current year and future years (e.g. planned events).
 */
export function stripPastCalendarYearsFromSearchQuery(
  query: string,
  referenceYear: number,
): string {
  let out = query.replace(YEAR, (match) => {
    const y = Number.parseInt(match, 10);
    if (Number.isNaN(y)) return match;
    if (y < referenceYear) return "";
    return match;
  });
  out = out.replace(/\s{2,}/g, " ").replace(/^\s+|\s+$/g, "").trim();
  return out;
}

export type SanitizeLiveWebSearchQueryParams = {
  query: string;
  userText: string;
  factIntent: CurrentFactIntent;
  now?: Date;
};

export function sanitizeLiveWebSearchQuery(
  params: SanitizeLiveWebSearchQueryParams,
): string {
  const { query, userText, factIntent, now = new Date() } = params;
  const trimmed = query.trim();
  if (!trimmed) return trimmed;

  if (!shouldSanitizeSearchQueryForCurrentFact(userText, factIntent)) {
    return trimmed;
  }

  const year = now.getFullYear();
  return stripPastCalendarYearsFromSearchQuery(trimmed, year);
}
