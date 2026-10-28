import assert from 'node:assert/strict';
import test from 'node:test';

import { decideNotificationTap, notificationDestination } from '../src/lib/notificationDestination';

test('push kinds open the matching in-app area without exposing a user-controlled URL', () => {
  assert.equal(notificationDestination({ kind: 'round_ready' }), '/(tabs)/daily');
  assert.equal(notificationDestination({ kind: 'mutual_match' }), '/(tabs)/connections');
  assert.equal(notificationDestination({ kind: 'new_message' }), '/(tabs)/connections');
  assert.equal(notificationDestination({ kind: 'notice' }), '/(tabs)/you');
  assert.equal(notificationDestination({ kind: 'halal_cards' }), '/(tabs)/connections');
  assert.equal(notificationDestination({ kind: 'liked_you' }), '/(tabs)/connections');
  assert.equal(notificationDestination({ kind: 'waiting_on_you' }), '/(tabs)/connections');
  assert.equal(notificationDestination({ kind: 'quiet_match' }), '/(tabs)/connections');
  assert.equal(notificationDestination({ kind: 'round_expiring' }), '/(tabs)/daily');
  assert.equal(notificationDestination({ kind: 'recap_ready' }), '/(tabs)/connections');
  assert.equal(notificationDestination({ kind: 'photo_decision' }), '/(tabs)/you');
});

test('unknown and malformed notification data never become routes', () => {
  assert.equal(notificationDestination(null), null);
  assert.equal(notificationDestination('https://attacker.example'), null);
  assert.equal(notificationDestination({ kind: 'https://attacker.example' }), null);
  assert.equal(notificationDestination({ url: '/connection/private/chat' }), null);
  assert.equal(notificationDestination({ kind: 42 }), null);
});

test('a valid push tap waits for an authenticated profile before routing', () => {
  const tap = {
    actionIdentifier: 'default',
    defaultActionIdentifier: 'default',
    data: { kind: 'new_message' },
  };
  assert.deepEqual(decideNotificationTap({ ...tap, userId: 'member-1', canOpen: false }), { action: 'wait' });
  assert.deepEqual(decideNotificationTap({ ...tap, userId: 'member-1', canOpen: true }), {
    action: 'route',
    destination: '/(tabs)/connections',
  });
  assert.deepEqual(decideNotificationTap({ ...tap, userId: undefined, canOpen: true }), { action: 'ignore' });
  assert.deepEqual(decideNotificationTap({ ...tap, actionIdentifier: 'reply', userId: 'member-1', canOpen: true }), { action: 'ignore' });
});
