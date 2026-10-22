/**
 * Campaign addresses. Each one serves the normal homepage (and waitlist) at
 * its own clean path, so the address bar stays tidy and Cloudflare Web
 * Analytics counts that path's visits separately: halalmo.de/waitlist is the
 * Reddit ad's link and halalmo.de/waitlistx the X ad's. Each one's visits are
 * that ad's visits. Every path also needs a label in site/waitlist-source.js.
 *
 * To add one, add a path below and run `npm run deploy:web`. Use a new path
 * per channel. Never put a personal referral code (?ref=) in a campaign link.
 */
export const CAMPAIGN_PATHS = ['waitlist', 'waitlistx'];

export function campaignRedirects() {
  return CAMPAIGN_PATHS.map((path) => `/${path} / 200`).join('\n') + '\n';
}
