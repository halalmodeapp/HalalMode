# Post-launch referral routing

Every share URL stays `https://halalmo.de/?ref=CODE`. Before launch it joins the waitlist (with a green "referral code added" tick). After launch the same link opens the invite page, so links already shared keep working.

## The invite flow (built, switched off until launch)

One flow for iPhone, Android and computers. No app links are needed: everyone goes through the website first.

1. **`/invite?ref=CODE`**: "**Ali** invited you to Halal Mode" (first name, or their email when the inviter has no name yet), a green tick with "Your referral code HM… is ready", and **Continue with Apple / Google / email**. Apple is first on iPhone, Google first elsewhere.
2. **Sign-in** happens on the web with Supabase Auth (OAuth, or an email sign-in link). On return the page calls `claim_invite(code)`, which saves the referral to the new account and keeps "first referrer wins" (including referrals made on the waitlist). The web session is then signed out.
3. **Congratulations** with confetti: "Your invite from Ali is now linked to your account." iPhone sees the App Store button, Android the Google Play button (each opens automatically after a moment), and computers a QR code plus both buttons. The QR code points to `/get`, which sends each phone to its own store.
4. **In the app** they sign in the same way; the referral counts once their profile is complete, as before. The typed code in onboarding stays as the last resort.

Database: `referral_inviter(code)` (anyone; first name, or email when there is no name) and `claim_invite(code)` (asks you to sign in if you are not). See `supabase/migrations/20261021210000_invite_flow.sql` and pgTAP `0205`.

Preview without switching it on: `https://halalmo.de/invite?demo` (sample data, no sign-in) or `/invite?ref=CODE&preview` (real sign-in).

## Switching it on at launch

1. In `site/launch.js`, set `appStoreUrl` to the App Store listing and `inviteFlow: true`. (`playStoreUrl` is already set from the package name `com.halalmode.app`.)
2. Supabase → Auth → URL configuration: add `https://halalmo.de/invite**` to the redirect URLs.
3. Supabase → Auth → Providers: Apple must be configured for the web (Services ID and key), as well as Google.
4. `npm run deploy:web`.

If a sign-in ever returns to the homepage instead (redirect not allowed), the homepage forwards it to `/invite` to finish.

## Android install referrer (optional extra)

For people who skip the website sign-in, a Google Play link can also carry `referrer=ref%3DCODE`, read on first launch with the Play Install Referrer library through a small Expo native module. Not built; the website sign-in covers the main path.
