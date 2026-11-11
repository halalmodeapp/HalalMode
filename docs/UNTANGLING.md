# Halal Mode refactor decisions

11 November 2026. The baseline is commit `861611a` plus the five pending member-flow fixes. The [manifesto](MANIFESTO.md) and [product decisions](../DECISIONS.md) govern behavior. The [state-machine inventory](IMPLICIT_STATE_MACHINES_SOL.md) and [later invariant audit](INVARIANT_AUDIT.md) give the starting points for following a flow through the app, database, and workers.

## Daily

**Give the Daily screen one function that decides what to show.** Keep the database responsible for eligibility and the day's set. Keep the client responsible for choosing the appropriate view from that set, the server status, and local progress. Preserve the current order of checks, the words members see, and where each action takes them. Test the cases where two conditions apply at once.

- The [Daily route](../app/%28tabs%29/daily.tsx) decides what to show through several early returns. A new status can accidentally take precedence over owed questions, profile readiness, or consent.
- In the empty-set branch, several booleans choose the title and body separately. The generic title is then used as a condition to render a wait view, so neither generic text value reaches the shared empty view.
- A missing filter name or an empty owed list intentionally falls back to the existing wait state. Preserve that behavior for older or incomplete responses.
- The [API](../src/api/introductions.ts) normalizes the server response and the [round provider](../src/state/round.tsx) owns live picks and refresh. The presentation decision belongs next to the existing [round status types](../src/lib/dailyRoundState.ts).

## How the audit was scoped

The audit followed member flows through app routes, shared code, site scripts, Edge Functions, and the current database functions in the migration history. The import scan covered 412 tracked JavaScript and TypeScript modules and resolved 1,531 internal references, including type imports. HTML script order, database calls, and generated files required separate inspection. Recent Git history helped identify files that tend to change together. For example, eight of the last 100 relevant commits touched both the public profile editor and the private preferences editor.

The sections below record follow-up decisions. The Daily presentation change is the implementation in this pass.

## Submitting a Daily set and generating future sets

**Give the round provider one submission operation and give the screen one active dialog at a time.** The provider should own the order of writes and the round identity they apply to. The screen can own transient dialog state and the draft interaction.

- The [Daily route](../app/%28tabs%29/daily.tsx) records a soft selection before submitting ranked picks because submission closes the write window. The [round provider](../src/state/round.tsx) already owns both operations and can express the order in one place. Preserve the behavior when recording the signal fails, as well as the installed-client submission fallback in the [API](../src/api/introductions.ts).
- Independent flags and IDs can describe more than one active dialog. An explicit dialog state would keep each action paired with its introduction ID. The profile ID still identifies the person on a card.
- The API and provider adapt an owed question from the first item of the owed list. Trace remaining consumers before removing the singular field. Keep support for incomplete or older responses at the API boundary.
- Keep the client countdown, countdown screen, and server refresh distinct. They display time, explain the next set, and discover an authoritative change respectively.

**Keep matching rules explicit at each runtime boundary and extend the existing parity checks when a rule changes.** The [matcher](../src/matching/league.ts), [round worker](../supabase/functions/generate-round/league.ts), and database each have a role in deciding and writing a round. The [parity harness](../scripts/backend-sim/parity.mts) is where intentional duplication of eligibility rules can be checked together. Validate worker payloads at the database boundary where generic response casts currently hide shape changes. Keep lease recovery and quiet fallback behavior.

**Remove obsolete client branches after confirming callers.** The Daily route always passes `popMode={false}` to [HeroCard](../src/components/introductions/HeroCard.tsx), while the old Pop display remains behind that flag. The pass and release API wrappers have no current app caller. Check mock and installed-client contracts before removing compatibility behavior. Database operations used by installed builds or database tests have their own lifecycle.

## Connections and chat

**Use one connection-stage routing decision and one chat data lifecycle.** Make valid entry, refresh, and revisit behavior explicit. Let chat rendering read messages and mutation status from a flow that owns paging, polling, and retries.

- The [connection list](../app/%28tabs%29/connections.tsx) maps stages to routes. The [connection routes](../app/connection/%5Bid%5D) each apply their own stage checks. Preserve question and waiting transitions, recap revisits, and the profile overlay when combining shared decisions.
- The [chat route](../app/connection/%5Bid%5D/chat.tsx) coordinates fetches, more than one mark-read effect, optimistic sends, and retries. The [connection API](../src/api/connections.ts) and [message merger](../src/lib/mergeMessages.ts) supply parts of the same behavior. A chat data owner should preserve request IDs across retries, discard stale completions, and handle overlap, pagination, and deletions together.
- The chat UI only opens the unavailable call state. The simulated calling and connected branches can be reviewed for removal while preserving the current unavailable experience. Unused app wrappers for the old message fetch and plain close action are separate from server RPC compatibility.

## Account access, editing, and notifications

**Decide admission to the app once.** Let the root gate consume a decision derived from session, deletion recovery, onboarding, consent, and the intended destination. Pass recovery actions into the recovery view to remove its circular dependency with the [auth provider](../src/state/auth.tsx). Preserve public legal routes, safety access before conduct consent, and deletion recovery precedence. Have the [notification observer](../app/_layout.tsx) use the same admission result where it depends on readiness.

**Give each profile save an explicit set of fields and one persistence operation.** The [profile editor](../src/components/you/ProfileTab.tsx) and [private preferences editor](../src/components/you/PrivateTab.tsx) sequence multiple writes and separately manage owner-scoped drafts. Private preferences deliberately omit fields the profile editor owns. Distinct write inputs and transactional saves would make that ownership visible and prevent a partial update from looking like a completed save. Preserve tier and validation checks, field omission semantics, account-scoped drafts, and protection against clearing a newer draft.

**Give notification events a shared contract across the client and worker.** The [preferences API](../src/api/notifications.ts), [destination mapper](../src/lib/notificationDestination.ts), [delivery worker](../supabase/functions/send-notifications/index.ts), and database switch independently name events. Verify agreement through a contract test. Device delivery, translated copy, and in-app destinations remain distinct responsibilities.

**Keep translation infrastructure below session state.** The [translation provider](../src/i18n/index.tsx) reads [session state](../src/state/session.tsx), which reads auth. Auth renders translated components in turn. Supply the saved locale at the composition boundary and preserve locale precedence and immediate local changes. The catalog and spoken language modules also import each other, with one import used only for types. Put shared catalog types below language display formatting if those modules change together again.

## Halal Cards

**Let the server own multiplayer progress and the client own display state.** The [Cards hook](../src/halalCards/hooks.ts) computes who is waiting, then the [API](../src/api/halalCards.ts) sends that information to a [database function](../supabase/migrations/20261106130000_halal_cards.sql) that derives it again under lock. Retire the compatibility input only after checking current and installed clients and the mock. Keep the member-facing respond and advance cues and protect sealed answers until both people have answered.

## Website, invites, and admin

**Make the launch configuration and invite handoff explicit at page entry points.** [Launch settings](../site/launch.js) are installed on `window`. The [homepage](../site/index.html), [app handoff](../site/get.html), and [invite page](../site/invite.html) rely on script order and fallback configuration. Use explicit imports when touching these pages together and test that the referral survives the handoff. The [web invite claim](../site/invite.js) and [signed-in app claim](../src/api/referrals.ts) serve different steps. Keep their attribution and identity checks and test the handoff with the same code. Keep the existing waitlist, preview, and live app deploy modes in the [web deploy script](../scripts/deploy-web.mjs).

**Give the admin console a session owner and separate the page renderers.** [Admin JavaScript](../site/admin.js) coordinates session refresh, storage, MFA, request gating, demo data, and page rendering in one closure. Pull out the session lifecycle before splitting renderers, so expiry and step-up have one owner. Keep the server-side admin checks and the deliberate separation of member and admin sessions.
