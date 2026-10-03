import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * The page the web build is served inside.
 *
 * Without this file Expo uses its default, which paints the page black whenever
 * the visitor's computer is in dark mode. This app is light only, so every load
 * began with a second of solid black before the first screen drew — the first
 * thing anybody opening the link saw. The background now matches the app's own
 * surface from the first frame.
 */
const SURFACE = '#FCFCFB';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content={SURFACE} />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `html, body { background-color: ${SURFACE}; color-scheme: light; overflow-x: hidden; overflow-x: clip; }`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
