export const COUNTDOWN_START = Date.parse('2026-08-19T00:00:00+08:00');
export const COUNTDOWN_TARGET = Date.parse('2026-08-29T00:00:00+08:00');

const TOTAL_DURATION = COUNTDOWN_TARGET - COUNTDOWN_START;

export function getCountdownState(now = Date.now()) {
  if (now < COUNTDOWN_START) {
    return { phase: 'before', progress: 0, remainingMs: TOTAL_DURATION };
  }

  if (now >= COUNTDOWN_TARGET) {
    return { phase: 'reunited', progress: 1, remainingMs: 0 };
  }

  return {
    phase: 'counting',
    progress: (now - COUNTDOWN_START) / TOTAL_DURATION,
    remainingMs: COUNTDOWN_TARGET - now,
  };
}

export function splitDuration(remainingMs) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}
