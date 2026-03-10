/**
 * useKeyboardShortcut — Listens for specific keyboard shortcuts.
 *
 * Commonly used for ESC-to-close on modals/dropdowns.
 */

"use client";

import { useEffect } from "react";

/**
 * Registers a keyboard shortcut listener on `document`.
 *
 * @param key - The `KeyboardEvent.key` to listen for (e.g. "Escape").
 * @param callback - The function to call when the key is pressed.
 * @param enabled - When false, the listener is not attached.
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === key) {
        callback();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, enabled]);
}
