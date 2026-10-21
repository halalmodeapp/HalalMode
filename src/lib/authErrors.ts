/** Supabase Auth represents a provider rate limit as an AuthError with status 429. */
export function isHttpRateLimitError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'status' in error
    && (error as { status?: unknown }).status === 429;
}
