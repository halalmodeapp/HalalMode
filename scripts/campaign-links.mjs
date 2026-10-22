/**
 * Short, shareable campaign addresses: halalmo.de/<name> forwards to the
 * homepage with UTM labels, so each channel's visits can be told apart in
 * Cloudflare Web Analytics without the long address showing anywhere.
 *
 * To add one, add a line below and run `npm run deploy:web`.
 * Never put a personal referral code (?ref=) in a campaign link.
 */
export const CAMPAIGN_LINKS = {
  reddit: { source: 'reddit', medium: 'paid', campaign: 'waitlist' },
};

export function campaignRedirects() {
  return Object.entries(CAMPAIGN_LINKS)
    .map(([path, { source, medium, campaign }]) =>
      `/${path} /?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign} 302`)
    .join('\n') + '\n';
}
