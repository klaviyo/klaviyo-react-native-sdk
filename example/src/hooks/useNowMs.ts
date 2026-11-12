import { useEffect, useState } from 'react';

/**
 * Ticks once every `intervalMs`, returning the current epoch ms. Used to
 * drive the Auth screen's and Configure Response screen's live
 * "Expires in"/"Refresh in" countdowns, which change every second even
 * though the underlying token/claims don't.
 */
export function useNowMs(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
