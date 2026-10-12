import { useEffect, useState } from 'react';

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the target date has been reached. */
  isOver: boolean;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Pure function, kept separate from the hook so it is trivially testable. */
export function getTimeLeft(target: Date, now: Date = new Date()): TimeLeft {
  const diff = target.getTime() - now.getTime();
  if (Number.isNaN(diff) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
  }
  return {
    days: Math.floor(diff / DAY),
    hours: Math.floor((diff % DAY) / HOUR),
    minutes: Math.floor((diff % HOUR) / MINUTE),
    seconds: Math.floor((diff % MINUTE) / SECOND),
    isOver: false,
  };
}

/** Ticks every second until the target date, then stops the timer. */
export function useCountdown(targetIso: string): TimeLeft {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(new Date(targetIso)));

  useEffect(() => {
    const target = new Date(targetIso);
    const tick = () => {
      const next = getTimeLeft(target);
      setTimeLeft(next);
      if (next.isOver) window.clearInterval(id);
    };
    const id = window.setInterval(tick, SECOND);
    tick();
    return () => window.clearInterval(id);
  }, [targetIso]);

  return timeLeft;
}
