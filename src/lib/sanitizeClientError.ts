type ErrorDetails = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

function safeErrorName(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(value)
    ? value
    : 'Error';
}

function safeErrorCode(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return;
  const code = String(value);
  return /^(?:[A-Z][A-Z0-9_]{0,19}|\d{3}|\d{5})$/.test(code) ? code : undefined;
}

function safeStatus(value: unknown): number | undefined {
  const status = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
}

function errorCategory(message: unknown, status: number | undefined): string {
  const text = typeof message === 'string' ? message.toLowerCase() : '';
  if (status === 429 || /rate.?limit|too many requests/.test(text)) return 'rate_limited';
  if (/timed?\s*out|timeout|deadline/.test(text)) return 'timeout';
  if (/network|offline|fetch failed|connection|dns/.test(text)) return 'network_failure';
  if (/unauthori[sz]ed|invalid token|session expired/.test(text)) return 'authentication_failure';
  if (/forbidden|permission|access denied/.test(text)) return 'access_denied';
  if (/not found|does not exist/.test(text)) return 'not_found';
  if (status !== undefined && status >= 500) return 'server_failure';
  if (status !== undefined && status >= 400) return 'request_rejected';
  return 'request_failed';
}

/** Keep operational signal while ensuring server messages and values never leave the device. */
export function sanitizeClientError(error: unknown): string {
  const details = error && typeof error === 'object' ? error as ErrorDetails : undefined;
  const name = safeErrorName(details?.name ?? (error instanceof Error ? error.name : undefined));
  const status = safeStatus(details?.status ?? details?.statusCode);
  const code = safeErrorCode(details?.code);
  const category = errorCategory(details?.message ?? (typeof error === 'string' ? error : undefined), status);
  return [name, category, code ? `code=${code}` : '', status ? `status=${status}` : '']
    .filter(Boolean)
    .join(': ');
}
