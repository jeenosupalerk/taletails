import { useEffect, useState } from "react";

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isFinished: boolean;
}

const compute = (target: number): Countdown => {
  const totalMs = Math.max(0, target - Date.now());
  return {
    days: Math.floor(totalMs / 86_400_000),
    hours: Math.floor((totalMs / 3_600_000) % 24),
    minutes: Math.floor((totalMs / 60_000) % 60),
    seconds: Math.floor((totalMs / 1000) % 60),
    totalMs,
    isFinished: totalMs <= 0,
  };
};

/**
 * Ticks once per second toward an ISO end time.
 * SSR-safe: the first render is computed on the client only.
 */
export function useCountdown(endTime: string): Countdown | null {
  const [countdown, setCountdown] = useState<Countdown | null>(null);

  useEffect(() => {
    const target = new Date(endTime).getTime();
    setCountdown(compute(target));
    const id = window.setInterval(() => {
      const next = compute(target);
      setCountdown(next);
      if (next.isFinished) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [endTime]);

  return countdown;
}

export const pad = (n: number) => String(n).padStart(2, "0");
