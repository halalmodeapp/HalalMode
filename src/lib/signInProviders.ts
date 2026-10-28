export type SignInProvider = 'google' | 'apple';

/**
 * The sign-in buttons each platform shows, decided by the platform and not by
 * what the Supabase project has switched on today.
 *
 * iOS always offers Sign in with Apple, first and beside Google: App Store
 * Review (guideline 4.8) expects it wherever Google sign-in is offered, and a
 * button that disappears whenever a dashboard setting lapses would fail review
 * without anyone noticing. Until Apple is set up in Supabase, pressing it
 * shows the normal sign-in error. Android and the web offer Google.
 */
export function signInProviders(platform: string): SignInProvider[] {
  return platform === 'ios' ? ['apple', 'google'] : ['google'];
}
