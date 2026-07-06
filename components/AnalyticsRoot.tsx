'use client';

import { useAnalyticsLifecycle } from '@/hooks/useAnalyticsLifecycle';

/// Mounted once at the app root to run the session heartbeat and event flushing.
/// Renders nothing.
export function AnalyticsRoot() {
  useAnalyticsLifecycle();
  return null;
}
