'use client';

import { useEffect } from 'react';
import { HEARTBEAT_MS } from '@/lib/analytics-types';
import { flushEvents, sendHeartbeat } from '@/lib/analytics';

/// Drives the session stopwatch and event flushing for the whole page:
/// - Heartbeats every ~5s while the tab is visible (pauses when hidden).
/// - Flushes queued events on the same interval, and on tab-hide / page-hide.
export function useAnalyticsLifecycle(): void {
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === 'visible') sendHeartbeat();
    };
    const tick = () => {
      beat();
      flushEvents();
    };
    beat();

    const interval = window.setInterval(tick, HEARTBEAT_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushEvents();
      else sendHeartbeat();
    };
    const onPageHide = () => flushEvents();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      flushEvents();
    };
  }, []);
}
