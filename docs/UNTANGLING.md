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

Status: done, 11 November 2026, in `1e74231`, `f809aa6` and `926f229`. Typecheck, lint and 574 tests pass, and the web build bundles. Not run in a browser (the preview pane was hidden).

**Give the round provider one `submit(roundId, ordered)` that does the whole send.** It records the soft select, builds the engagement payload and submits, in that order, against the round the member was looking at. The screen only says who, in what order, for which round.

- [`daily.tsx:266`](../app/%28tabs%29/daily.tsx) must call `recordSoftSelect()` before `submit()`, because submitting closes the write window. Nothing enforces that order; a second caller of `submit` would silently lose the signal.
- [`round.tsx:269`](../src/state/round.tsx) returns an empty success when there is no round. The screen then shows "set complete" for a send that never happened. Submitting without a round should fail like any other send.
- [`round.tsx:283`](../src/state/round.tsx) turns the dwell and engagement ledgers into the submitted payload inline (5-second buckets, 120-second cap). It is a pure rule with no test. Move it to [`matchingEngagement.ts`](../src/lib/matchingEngagement.ts) next to the ledger it reads, and test it there.
- `recordSoftSelect` leaves the provider's public interface, because only `submit` needs it.

**Give the screen one active dialog instead of six independent pieces of state.** A single `dialog` value (`none`, `swap` with the pending and swap-out ids, `confirm`, `first-choice` with its pick, `nobody`) keeps each action paired with its ids, makes two dialogs at once impossible, and turns the reset on a new set into one assignment.

- [`daily.tsx:131`](../app/%28tabs%29/daily.tsx) holds `confirmOpen`, `firstChoiceOpen`, `firstChoiceId`, `nobodyOpen`, `pendingId` and `swapOutId` separately. Every path that closes one has to remember the others (lines 150, 250, 261, 620).

**Remove the round fields and wrappers nothing reads, and keep the compatibility the server still needs.**

- [`round.tsx:154`](../src/state/round.tsx) exposes a singular `owed` that no screen reads. Everything uses `owedAll`. Keep the API's fallback that builds `owedAll` from an older `owed`-only response.
- [`daily.tsx:518`](../app/%28tabs%29/daily.tsx) always passes `popMode={false}`, so the Pop badge in [HeroCard](../src/components/introductions/HeroCard.tsx) never renders. Remove the prop, the badge and its styles. The `daily.popLabel` string goes with it.
- [`releaseIntroduction` and `passIntroduction`](../src/api/introductions.ts) have no app caller. Remove the client wrappers only. The `release_introduction` and `pass_introduction` RPCs stay, because installed builds and database tests still call them.
- Keep: the `submit_round_selections_ranked` fallback in `submitKeeps` (a client can reach a database before its migration), the refresh after a failed send (a lost response may have committed), and the soft-select failure being swallowed (it is a courtesy signal and must never cost the member their round).

### Second round (done, in `99c21f4`, `3664b6c`, `5af7e6c` and `3b3b3a9`)

A review of the area after those commits found no regressions and these leftovers:

**Remove what Pop mode and the old pass question left behind.**
- [`dwell.ts:67`](../src/lib/dwell.ts) `inferPassCandidate` and the module header describe the removed pass question. Only its own test calls it. The stale comment above `softSelectIntroduction` in [the API](../src/api/introductions.ts) goes too.
- [`roundInvariants.ts:8`](../src/lib/roundInvariants.ts) `getRoundInteractionState` (with `canPop`) is only called by its test.
- [`testIds.ts:29`](../src/lib/testIds.ts) still names the Select button `daily-pop-mode`. Rename it together with [`maestro/daily-round.yaml`](../maestro/daily-round.yaml).

**Say each Daily rule once.**
- `Math.min(keepLimit, live.length)` appears four times in [daily.tsx](../app/%28tabs%29/daily.tsx). The round provider should expose the effective pick limit once.
- `round?.expiresAt ?? nextFajrAt` appears five times in daily.tsx and is the provider's `roundBoundary`. Expose it from the provider.
- [HeroCard](../src/components/introductions/HeroCard.tsx) accepts both `chosen` and `chosenIds`. The only caller passes `chosenIds`, so make it required and drop `chosen`.

**Make the picker dialog say what it is.** [FirstChoiceDialog](../src/components/introductions/FirstChoiceDialog.tsx) has default labels that both callers override, so `daily.firstChoiceBody` is never shown. Make the labels required and remove the unused string.

**Make missing arguments a type error.** `submitKeeps`'s `engagement = []` default hides a missing argument. Its one caller always passes it.

### Third round

A second review found no regressions. Its fixes to this pass's own work are in the commit after `3b3b3a9`: a blocked send now shows its error, a wrong comment about free-member limits, and a privacy test that checked nothing.

Decided and done:

- **Use one at-limit dialog.** Done: `SwapChoiceDialog` reads the round itself, and Daily and the profile page both use it. Switching on a profile makes the swap there and returns to the deck. Checked in the web app with sample data. [`introduction/[id].tsx:284`](../app/introduction/%5Bid%5D.tsx) has its own copy of the at-limit dialog, with the same title, body and "Switch" label as Daily's swap picker. Confirming it only returns to the deck, where the member taps again to get the real picker.

The send flow was checked in the web app with sample data: choose one or two, the first-choice picker, confirm, and the mutual screen. The sample data only has match screens for some profiles, so a sample "match" with someone else lands on "This match is not available". That gap is in the sample data, not in the app.

**Keep matching rules explicit at each runtime boundary and extend the existing parity checks when a rule changes.** The [matcher](../src/matching/league.ts), [round worker](../supabase/functions/generate-round/league.ts), and database each have a role in deciding and writing a round. The [parity harness](../scripts/backend-sim/parity.mts) is where intentional duplication of eligibility rules can be checked together. Validate worker payloads at the database boundary where generic response casts currently hide shape changes. Keep lease recovery and quiet fallback behavior.

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
