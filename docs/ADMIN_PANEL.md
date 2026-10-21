# Admin panel — halalmo.de/admin

One panel for the website and the app. In the app, admins see **You → Settings → Halal Mode admin**, which opens the same panel in the in-app browser. Nobody else sees that row. The panel asks for its own sign-in.

Try it without signing in: `https://halalmo.de/admin?demo` (sample data, nothing is saved).

## Security model

| Layer | What it does |
|---|---|
| Admin list | `halal_mode_private.admin_members` (owner / viewer). Every RPC checks it on the server. |
| Two-factor | Every read needs an `aal2` session (Google, then an authenticator code). |
| Step-up | Every change needs a code entered in the last 15 minutes (JWT `amr` totp timestamp). |
| Audit | Every change writes an append-only `admin_audit_log` row with the previous value and a reason. Sign-ins are recorded. |
| Limits | 60 changes per admin per 10 minutes; typed confirmation for flags, Luna and removals; referral links locked to halalmo.de; at least one owner always. |
| Browser | No service key. The session is kept only in `sessionStorage`, with sign-out after 15 minutes idle. `/admin` sends a strict CSP, `no-store`, `noindex` and `frame-ancestors 'none'`. |
| Privacy | Members appear only in aggregate. No names, photos, messages or per-member scores. |

Optional extra layer: put `halalmo.de/admin*` behind **Cloudflare Access**. It is free for up to 50 users and runs on the same Cloudflare account.

## Owner setup (once, after deploy approval)

1. Apply the migrations (`npx supabase db push`) and deploy the site (`npm run deploy:web`).
2. Supabase → Auth → URL configuration: add `https://halalmo.de/admin` to the redirect URLs.
3. Supabase → Auth → Multi-factor: enable **TOTP**.
4. Add yourself as the first owner:
   ```sql
   insert into halal_mode_private.admin_members (user_id, role, note)
   select id, 'owner', 'Mohammed' from auth.users where email = 'YOUR_ADMIN_EMAIL';
   ```
5. Open `/admin`, continue with Google, and scan the QR code with an authenticator app. Add further admins from **Team & access**.

## What it controls

- **Scoring:** switches and weights for each signal. Similarity is capped at 0.20.
- **Luna:** on/off, typed confirmation, bounded backfill.
- **Feature flags:** on/off and rollout percentage.
- **Settings:** referral link address and email daily limit.
- **Team:** add, change role, remove.

The launch switch was removed on 19 Oct (`20261019160000_remove_launch_switch.sql`), so it is not in the panel.
