/**
 * The live project's public addresses and keys, built into the app.
 *
 * Every value here is public by design. The publishable key and the PostHog
 * project key ship inside every copy of the app and are already on
 * halalmo.de; row-level security protects the data, not secrecy. Building
 * them in means a store build or an over-the-air update can never go out
 * without a backend. That had nearly happened: EAS's own production and
 * preview environments were empty, `.env` is never uploaded, and an app with
 * no Supabase address stops on its first screen.
 *
 * EXPO_PUBLIC_* values still win, so a local .env can point at another
 * project, and EXPO_PUBLIC_USE_MOCKS=1 still runs the demo. They must stay
 * written out as `process.env.EXPO_PUBLIC_…` for Expo to inline them.
 */
export const LIVE_PROJECT = {
  supabaseUrl: 'https://lfuuywsmydruvqkqwvzw.supabase.co',
  supabaseAnonKey: 'sb_publishable_yioJpXVD_u-krXHgA7souQ_2pOiITsN',
  posthogKey: 'phc_phgsQpKgT7KdbRAspaYGd8umNxm7GxAvPMeHoYwYdCvn',
  posthogHost: 'https://us.i.posthog.com',
} as const;

const given = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const envUrl = given(process.env.EXPO_PUBLIC_SUPABASE_URL);

export const SUPABASE_URL: string = envUrl ?? LIVE_PROJECT.supabaseUrl;
// A key only belongs to its own project: another project's URL never borrows
// the live key, and without its own key the app refuses to start.
export const SUPABASE_ANON_KEY: string | undefined = envUrl
  ? given(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
  : LIVE_PROJECT.supabaseAnonKey;

// React Native's __DEV__, read through globalThis so plain Node tests can load this file.
const devBuild = (globalThis as { __DEV__?: boolean }).__DEV__ === true;
// Development builds only send analytics when a key is set on purpose.
export const POSTHOG_KEY: string | undefined =
  given(process.env.EXPO_PUBLIC_POSTHOG_KEY) ?? (devBuild ? undefined : LIVE_PROJECT.posthogKey);
export const POSTHOG_HOST: string =
  given(process.env.EXPO_PUBLIC_POSTHOG_HOST) ?? LIVE_PROJECT.posthogHost;
