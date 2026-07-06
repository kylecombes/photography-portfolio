'use client';

import { useEffect } from 'react';
import { recordView } from '@/lib/analytics';

/// Records how long each photo is shown. The effect cleanup fires when the
/// filename changes (navigation) or the lightbox unmounts (close), recording the
/// duration for the photo that was just showing. Sub-second views are dropped by
/// recordView. No timers running during hidden tabs are paused here — the
/// session stopwatch handles genuine away-time; this is per-photo dwell.
export function useViewTracking(filename: string): void {
  useEffect(() => {
    const start = Date.now();
    return () => recordView(filename, Date.now() - start);
  }, [filename]);
}
