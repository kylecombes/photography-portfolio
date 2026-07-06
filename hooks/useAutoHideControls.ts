'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/// Controls visibility that fades out after a period of inactivity. Visible on
/// mount; call `poke()` on any user activity (mouse move, tap, key) to reveal the
/// controls and restart the idle countdown.
export function useAutoHideControls(timeoutMs = 5000) {
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poke = useCallback(() => {
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), timeoutMs);
  }, [timeoutMs]);

  // Start the initial idle countdown (controls begin visible). We set the timer
  // directly rather than calling poke() so no state is set during the effect.
  useEffect(() => {
    timer.current = setTimeout(() => setVisible(false), timeoutMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [timeoutMs]);

  return { visible, poke };
}
