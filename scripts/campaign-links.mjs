/**
 * Campaign addresses. Each one serves the normal homepage (and waitlist) at
 * its own clean path, so the address bar stays tidy and Cloudflare Web
 * Analytics counts that path's visits separately: halalmo.de/waitlist is the
 * Reddit ad's link, and its visits are the ad's visits.
 *
 * To add one, add a path below and run `npm run deploy:web`. Use a new path
 * per channel. Never put a personal referral code (?ref=) in a campaign link.
 */
export const CAMPAIGN_PATHS = ['waitlist'];

export function campaignRedirects() {
  return CAMPAIGN_PATHS.map((path) => `/${path} / 200`).join('\n') + '\n';
}
