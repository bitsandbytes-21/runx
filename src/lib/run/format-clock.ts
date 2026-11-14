/** "m:ss"; seconds round up so the display reaches 0:00 only at the end. */
export function formatClock(sec: number): string {
  const total = Math.max(0, Math.ceil(sec));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
