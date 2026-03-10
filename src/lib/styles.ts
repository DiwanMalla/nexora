/**
 * Shared style constants and CSS class fragments.
 *
 * Centralises repeated Tailwind class strings that were previously
 * copy-pasted across many components (e.g. focus ring, icon button).
 */

/** Focus ring used on interactive elements for keyboard accessibility. */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

/** Standard icon-only toolbar button classes. */
export const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-surface-overlay-strong hover:text-text transition-all focus:outline-none focus:ring-0";

/** Standard icon-only action button (smaller, used in message footers). */
export const ICON_ACTION_BUTTON =
  "text-text-dim hover:text-text transition-colors";
