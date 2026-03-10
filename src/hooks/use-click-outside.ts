/**
 * useClickOutside — Dismisses UI elements when clicking outside them.
 *
 * Commonly used for dropdown menus, modals, and popovers.
 */

"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls `onClickOutside` whenever a click/touch occurs outside the referenced element.
 *
 * @param onClickOutside - Callback fired on outside click.
 * @param enabled - When false, the listener is not attached (default: true).
 * @returns A ref to attach to the container element.
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  onClickOutside: () => void,
  enabled = true,
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside();
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClickOutside, enabled]);

  return ref;
}
