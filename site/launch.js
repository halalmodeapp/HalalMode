/*
 * The one switch for after-launch referrals.
 *
 * While `inviteFlow` is false, referral links (halalmo.de/?ref=CODE) keep
 * joining the waitlist, with the green "referral code added" tick.
 *
 * At launch:
 *   1. Set appStoreUrl to the App Store listing (for example
 *      https://apps.apple.com/app/id1234567890). Google Play is already set.
 *   2. Set inviteFlow to true and run `npm run deploy:web`.
 * Referral links then open /invite: who invited you, Apple / Google / email
 * sign-in, the referral saved to the new account, then the right app store.
 * Links already shared keep working, because the address does not change.
 */
window.HALAL_MODE_LAUNCH = {
  inviteFlow: false,
  appStoreUrl: '',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.halalmode.app'
};
