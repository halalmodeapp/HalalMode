# Relationship Challenge Claude: build report

The Claude version of the comparison build described in [RELATIONSHIP-CHALLENGE-CODEX.md](../RELATIONSHIP-CHALLENGE-CODEX.md). It uses flat SVG placeholders. Every asset can be swapped through one map. The Codex art handoff is generated from the same scene manifest that the app renders from.

## Routes

| Route | What it is |
|---|---|
| `/halal-cards/[id]/relationship-challenge-claude` | Entry page: the hypothetical framing, both scenarios, Invite/Join/Continue, and a link to the local preview |
| `/halal-cards/[id]/relationship-challenge-claude/play/[sessionId]` | A real two-phone session using the existing Halal Cards session API |
| `/halal-cards/[id]/relationship-challenge-claude/preview/[scenario]` | One-phone preview: same engine and screen, switches between host and guest seats, sends nothing |

The hub (`app/halal-cards/[id]/index.tsx`) gets one additive row that links to the entry page. Nothing else that is shared was changed: there are no edits to Halal Cards types, the engine, copy, API, server, navigation, package.json or Metro config.

## Files

- `src/halalCards/relationshipChallengeClaude/`: pure TypeScript, no React Native
  - `types.ts`: scenario, clue, hotspot and event-log types
  - `scenarios.ts`: Scenario A (`rc-claude-three-things`, morning; answer 342) and B (`rc-claude-evening-plan`, night; answer `park_loop`)
  - `engine.ts`: replays the event log. It is deterministic and idempotent (action ids), and it validates each event as it applies it
  - `scene.ts`: scene manifest with 42 assets, canvases, anchors, layer order, per-time-of-day placements and state swaps
  - `strings.ts`: English and Arabic copy (a test checks that Arabic has every line)
- `src/components/relationshipChallengeClaude/`: `RoomStage` (layered renderer), `RoomEffects` (shafts, lamp pool, night grade, capped dust), `ChallengePlay` (play surface), `Glyphs`, `assetSource` (swap point), `placeholderSources` (generated), `useRcClaudeSession` (remote and local), `paths`
- `assets/relationship-challenge-claude/`: 42 flat SVG placeholders (`scene/{morning,night,shared}`, `characters`, `clues`, `fx`)
- `scripts/relationship-challenge-claude/build-placeholders.mjs`: writes the SVGs and the require map from the manifest
- `scripts/relationship-challenge-claude/build-handoff.mjs`: writes the Codex handoff
- `docs/relationship-challenge/claude/relationship-challenge-codex-asset-handoff.ts` (+ `.json`): **the Codex asset handoff**, 44 entries (2 room references, 39 runtime assets, 3 optional effect masks), each with a complete ImageGen prompt
- `tests/relationshipChallengeClaude.test.ts`: 10 engine, content and manifest tests

## How multiplayer works

A challenge is an ordinary Halal Cards session. The activity id starts with `rc-claude-` and the state is `{ kind: 'rc_claude', scenarioId, cast, log }`. Invitations, accept and decline, leave, expiry, Premium unlock and the chaperone-visible chat all reuse the existing system.

- **Ordered:** each action is written against the version it was computed from, and the server's `advance_halal_cards_session` refuses stale versions.
- **Idempotent:** each action carries a client action id. If a write is refused as stale, the phone fetches the newer log and applies the same action again under the same id. If the clue was already collected, nothing is written.
- **Safe against bad events:** `deriveRc` replays the log and drops anything invalid (duplicate ids, a clue collected before it was found, a second copy of a token, skipped hint levels, answers before the clues are in or after the puzzle is solved, unknown seats).
- **Resumable:** progress lives in the log on the server, so a reconnect rebuilds the same view. A failed refresh shows a calm "reconnecting" line.
- **Shared answers:** an answer only counts once both seats agree. A wrong agreed answer leaves the box closed and asks you, gently, to look again. Nothing is scored or stored about the people playing.
- Fixed pings ("Show Amina") and four non-verbal emotes. There is no new chat, voice or upload.

## Commands

```bash
node scripts/relationship-challenge-claude/build-placeholders.mjs
```

```bash
node scripts/relationship-challenge-claude/build-handoff.mjs
```

```bash
npx tsc -p tests/tsconfig.json && node --test .test-build/tests/relationshipChallengeClaude.test.js
```

Use the `expo-web-mock` launch config (port 8082), then open `/halal-cards/conn-1/relationship-challenge-claude`.

## Verified

- `npm run typecheck`, eslint on every new or changed file, and `npm test` (426 tests passing, including the 10 new ones).
- In the browser at 375×812 and desktop width, with mock data:
  - Scenario A played end to end in the preview. A wrong code (234) was rejected gently, 342 opened the box, and the reflection was skippable.
  - Scenario B was solved. The café-terrace trap was rejected, and the park loop was accepted.
  - The invite → partner accepts → shared clue and hint flow worked through the session API.
  - Each seat sees only its own private clue.

## Known limitations

- **Private clues are hidden by the client, not by the server.** All content ships in the app bundle, as every Halal Cards activity does, and the existing server stores state as opaque JSON. Each phone renders only its own seat's clue, and the clues are fictional. Enforcing this on the server would need the clue text held on the server plus a small RPC. That is a shared backend change, so it is left for after the comparison.
- **Event validation runs on both phones, not on the server.** Both phones replay the same log and ignore the same invalid events, so a bad write cannot corrupt progress, but the server does not reject it. Server-side validation would be a follow-up together with the item above.
- **Presence is basic.** "Joined" and "left" come from the session status (accepted, cancelled). There is no live "partner is away" signal because the existing infrastructure has none.
- Challenge sessions do not appear in the hub's "In progress" list or the chat banner, because those look up the shared catalogue. You reach them from the entry page. Notifications use the existing `halal_cards` push.
- On the Metro dev server, the large SVG plates take a few seconds to paint the first time. The stage shows a backdrop in the right time-of-day colour meanwhile, and critical layers load at high priority.
- Room canvas: 1000×1500 room units (2:3 portrait, the room shape that reads best on a phone), with sources at 2 px per unit. This is not the 2048×1536 shown as an example in the brief.

## Mobile and web note

On a phone the room fills the column, with every hotspot target at least about 56 pt. The inspect panel, your private clue, the board and the hints stack below the room. On desktop the room is capped at about 62% of the window height, so the whole scene stays in view in the 560 px column. Effects hold still and dust is turned off when reduced motion is on. Authored symbol order and the code dials are pinned left to right in Arabic.
