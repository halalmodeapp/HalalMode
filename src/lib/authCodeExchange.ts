export type AuthCodeExchangeResult = { error: unknown | null };

const inFlightExchanges = new Map<string, Promise<AuthCodeExchangeResult>>();
const completedExchanges = new Map<string, AuthCodeExchangeResult>();
const MAX_COMPLETED_EXCHANGES = 16;

/**
 * An OAuth redirect can arrive both through the auth-session result and the
 * native Linking listener. Share the in-flight exchange, then remember recent
 * successes so a late duplicate cannot redeem the single-use PKCE code again.
 */
export function exchangeAuthCodeOnce(
  code: string,
  exchange: (code: string) => Promise<AuthCodeExchangeResult>
): Promise<AuthCodeExchangeResult> {
  const completed = completedExchanges.get(code);
  if (completed) {
    completedExchanges.delete(code);
    completedExchanges.set(code, completed);
    return Promise.resolve(completed);
  }

  const inFlight = inFlightExchanges.get(code);
  if (inFlight) return inFlight;

  const request = Promise.resolve()
    .then(() => exchange(code))
    .then(({ error }) => {
      const result = { error };
      if (!error) {
        completedExchanges.set(code, result);
        while (completedExchanges.size > MAX_COMPLETED_EXCHANGES) {
          const oldestCode = completedExchanges.keys().next().value;
          if (oldestCode === undefined) break;
          completedExchanges.delete(oldestCode);
        }
      }
      return result;
    })
    .finally(() => inFlightExchanges.delete(code));

  inFlightExchanges.set(code, request);
  return request;
}
