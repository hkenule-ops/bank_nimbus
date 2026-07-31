import { useEffect, useRef } from "react";

interface BackgroundRefreshOptions {
  /** Poll interval in ms while the tab is visible. Default 30s. */
  intervalMs?: number;
  /** Whether polling should currently be active (e.g. only when logged in). */
  enabled?: boolean;
}

/**
 * Silently re-runs `callback` on a timer, whenever the tab regains focus,
 * and whenever the network comes back online.
 *
 * Intended for keeping data (balances, transactions, admin lists) fresh in
 * the background WITHOUT the user noticing: no loading spinners, no page
 * reload, no layout shift. The callback you pass in should merge new data
 * into state quietly (e.g. setState with the fresh array/object) rather
 * than toggling any "isLoading" flag.
 *
 * Polling automatically pauses while the tab is hidden (saves battery/data
 * and avoids racing with a foreground fetch) and immediately does one
 * refresh the moment the tab becomes visible again or the network
 * reconnects, so the data feels instantly up to date when the user returns.
 */
export function useBackgroundRefresh(
  callback: () => void | Promise<void>,
  options: BackgroundRefreshOptions = {},
) {
  const { intervalMs = 30000, enabled = true } = options;
  const callbackRef = useRef(callback);
  const inFlightRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const run = () => {
      if (inFlightRef.current) return;
      if (document.visibilityState === "hidden") return;
      inFlightRef.current = true;
      Promise.resolve(callbackRef.current())
        .catch(() => {
          /* Never surface background sync errors — fail silently and try again next tick. */
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    };

    const interval = window.setInterval(run, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    const onOnline = () => run();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, intervalMs]);
}