/**
 * The name a sign-in provider already gave us, as a starting point.
 *
 * Google sends `full_name` or `name`, and usually `given_name`; Apple sends a
 * name only on the very first sign-in and sometimes nothing but an email. So
 * every field is optional, and anything that looks like an email address is
 * refused — "maryam.k@gmail.com" in the first-name box would be worse than an
 * empty one.
 */
export function namesFromIdentity(
  metadata: Record<string, unknown> | null | undefined,
): { fullName?: string; firstName?: string } {
  if (!metadata) return {};

  const text = (value: unknown) =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 100) : '';
  const usable = (value: string) => value.length >= 2 && !value.includes('@');

  const fullName = [text(metadata.full_name), text(metadata.name)].find(usable) ?? '';
  const firstName =
    [text(metadata.given_name), fullName.split(' ')[0] ?? ''].find(usable) ?? '';

  return {
    ...(fullName ? { fullName } : {}),
    ...(firstName ? { firstName } : {}),
  };
}
