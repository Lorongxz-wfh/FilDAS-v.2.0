import { useEffect, useRef, useState, useCallback } from "react";
import { clearAuthAndRedirect } from "../lib/auth";

const IDLE_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "focus",
];

/**
 * Tracks user inactivity and logs them out after `timeoutMs`.
 * Shows a warning dialog `warningMs` before the timeout fires.
 */
export function useIdleTimeout(
  timeoutMs = 30 * 60 * 1000,   // 30 minutes
  warningMs = 5 * 60 * 1000,    // warn 5 min before
) {
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
    }, timeoutMs - warningMs);

    timeoutRef.current = setTimeout(() => {
      clearAuthAndRedirect();
    }, timeoutMs);
  }, [timeoutMs, warningMs, clearTimers]);

  // Reset on any user interaction
  useEffect(() => {
    resetTimers();
    IDLE_EVENTS.forEach((ev) => window.addEventListener(ev, resetTimers, { passive: true }));
    return () => {
      clearTimers();
      IDLE_EVENTS.forEach((ev) => window.removeEventListener(ev, resetTimers));
    };
  }, [resetTimers, clearTimers]);

  /** Call this when user clicks "Stay logged in" */
  const stayLoggedIn = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  return { showWarning, stayLoggedIn };
}
