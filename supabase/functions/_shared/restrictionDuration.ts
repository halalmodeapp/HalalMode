/** Keep a retried Auth action anchored to its first claim. */
export function restrictionDuration(banUntil: string | null, now: number): string {
  if (banUntil === null) return 'none';
  const deadline = Date.parse(banUntil);
  if (!Number.isFinite(deadline) || !Number.isFinite(now)) throw new Error('Invalid restriction deadline');
  const seconds = Math.ceil((deadline - now) / 1000);
  return seconds > 0 ? `${seconds}s` : 'none';
}
