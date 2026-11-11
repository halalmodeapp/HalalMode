import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeDailyRoundStatus,
  resolveDailyPresentation,
  type DailyPresentationInput,
} from '../src/lib/dailyRoundState';

test('accepts only the documented privacy-safe daily round statuses', () => {
  assert.equal(normalizeDailyRoundStatus('ready'), 'ready');
  assert.equal(normalizeDailyRoundStatus('profile_not_ready'), 'profile_not_ready');
  assert.equal(normalizeDailyRoundStatus('no_suitable_introductions'), 'no_suitable_introductions');
  assert.equal(normalizeDailyRoundStatus('matching_inputs_unavailable'), 'matching_inputs_unavailable');
  assert.equal(normalizeDailyRoundStatus('awaiting_turn'), 'awaiting_turn');
  assert.equal(normalizeDailyRoundStatus('at_match_capacity'), 'at_match_capacity');
  assert.equal(normalizeDailyRoundStatus('legal_consent_required'), 'legal_consent_required');
});

test('unknown server reasons fall back to the least revealing empty state', () => {
  assert.equal(normalizeDailyRoundStatus('filtered_by_distance'), 'no_suitable_introductions');
  assert.equal(normalizeDailyRoundStatus({ count: 4 }), 'no_suitable_introductions');
  assert.equal(normalizeDailyRoundStatus(null), 'no_suitable_introductions');
});

type Round = { introductions: string[] };
const withCards: Round = { introductions: ['a', 'b'] };
const noCards: Round = { introductions: [] };

function present(overrides: Partial<DailyPresentationInput<Round>>) {
  return resolveDailyPresentation<Round>({
    isLoading: false,
    conductReady: true,
    hasFetchError: false,
    round: noCards,
    emptyReason: null,
    owedCount: 0,
    profileReady: true,
    narrowingCriterion: null,
    submitted: false,
    ...overrides,
  }).kind;
}

test('nothing is decided until the round and the conduct check have both loaded', () => {
  assert.equal(present({ isLoading: true, hasFetchError: true }), 'loading');
  assert.equal(present({ conductReady: false, round: withCards }), 'loading');
});

test('someone waiting on an answer comes before the profile checklist and consent', () => {
  assert.equal(present({ emptyReason: 'answers_owed', owedCount: 2, profileReady: false }), 'owed-list');
  assert.equal(present({ emptyReason: 'answers_owed', owedCount: 0 }), 'generic-wait');
});

test('an unfinished profile only blocks the screen when there are no cards to show', () => {
  assert.equal(present({ profileReady: false }), 'profile-readiness');
  assert.equal(present({ profileReady: false, round: withCards }), 'live-cards');
});

test('consent is required even when cards are waiting', () => {
  assert.equal(present({ emptyReason: 'legal_consent_required', round: withCards }), 'consent');
});

test('a set the server calls complete only shows as complete when it is empty', () => {
  assert.equal(present({ emptyReason: 'set_complete' }), 'server-complete');
  assert.equal(present({ emptyReason: 'set_complete', round: withCards }), 'live-cards');
});

test('narrow filters without a named criterion fall back to the plain wait', () => {
  assert.equal(present({ emptyReason: 'filters_too_narrow', narrowingCriterion: null }), 'generic-wait');
  assert.equal(present({ round: undefined }), 'generic-wait');
});

test('after choosing, the set shows as done instead of the cards', () => {
  assert.equal(present({ round: withCards, submitted: true }), 'local-complete');
});

test('the card view always comes with the round it shows', () => {
  const result = resolveDailyPresentation<Round>({
    isLoading: false, conductReady: true, hasFetchError: false, round: withCards,
    emptyReason: null, owedCount: 0, narrowingCriterion: null, submitted: false,
  });
  assert.equal(result.kind === 'live-cards' && result.round, withCards);
});
