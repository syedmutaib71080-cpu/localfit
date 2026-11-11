export interface WorkoutInterval {
  startMs: number;
  endMs: number | null;
}

/**
 * Calculates total active workout duration strictly from active intervals.
 * All paused intervals between an interval's end and the next interval's start
 * are completely excluded.
 */
export function calculateActiveDurationSeconds(
  intervals: WorkoutInterval[],
  currentTimestampMs: number = Date.now()
): number {
  if (!intervals || intervals.length === 0) return 0;

  let totalActiveMs = 0;

  for (const interval of intervals) {
    if (interval.startMs <= 0) continue;

    const intervalEnd = interval.endMs !== null ? interval.endMs : currentTimestampMs;
    const intervalDuration = Math.max(0, intervalEnd - interval.startMs);
    totalActiveMs += intervalDuration;
  }

  return Math.floor(totalActiveMs / 1000);
}

/**
 * Formats duration in seconds to standard stopwatch format:
 * - Under 1 hour: MM:SS (e.g. "24:30")
 * - 1 hour or more: HH:MM:SS (e.g. "01:15:42")
 */
export function formatDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return "00:00";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");

  if (hours > 0) {
    const hh = hours.toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}
