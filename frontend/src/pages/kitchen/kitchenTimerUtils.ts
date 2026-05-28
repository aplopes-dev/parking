/** Segundos decorridos desde sentAt (ISO). */
export function elapsedSeconds(sentAtIso: string, nowMs = Date.now()): number {
  const start = new Date(sentAtIso).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((nowMs - start) / 1000));
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export type WaitUrgency = 'ok' | 'warn' | 'late';

/** Limiares de espera para cor do cronômetro. */
export function waitUrgency(seconds: number): WaitUrgency {
  if (seconds >= 20 * 60) return 'late';
  if (seconds >= 10 * 60) return 'warn';
  return 'ok';
}
