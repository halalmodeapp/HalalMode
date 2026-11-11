import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DwellLedger,
  inferSoftSelect,
  type DwellRecord,
} from '../src/lib/dwell';

const record = (introductionId: string, totalMs: number, opens = 1): DwellRecord => ({
  introductionId,
  totalMs,
  opens,
});

// --- The ledger -------------------------------------------------------------

test('the ledger accumulates time across repeat visits', () => {
  let clock = 0;
  const ledger = new DwellLedger(() => clock);

  ledger.opened('a');
  clock += 5_000;
  ledger.closed('a');

  ledger.opened('b');
  clock += 1_000;
  ledger.closed('b');

  ledger.opened('a');
  clock += 3_000;
  ledger.closed('a');

  const byId = new Map(ledger.records().map((r) => [r.introductionId, r]));
  assert.equal(byId.get('a')?.totalMs, 8_000, 'a second look adds to the first');
  assert.equal(byId.get('a')?.opens, 2);
  assert.equal(byId.get('b')?.totalMs, 1_000);
});

test('opening a second profile closes the first', () => {
  let clock = 0;
  const ledger = new DwellLedger(() => clock);

  ledger.opened('a');
  clock += 4_000;
  ledger.opened('b');
  clock += 2_000;

  const byId = new Map(ledger.records().map((r) => [r.introductionId, r]));
  assert.equal(byId.get('a')?.totalMs, 4_000);
  assert.equal(byId.get('b')?.totalMs, 2_000, 'reading in progress is counted, not lost');
});

test('closing a profile that is not open changes nothing', () => {
  let clock = 0;
  const ledger = new DwellLedger(() => clock);
  ledger.opened('a');
  clock += 1_000;
  ledger.closed('b');
  clock += 1_000;
  ledger.closed('a');

  assert.deepEqual(ledger.records(), [{ introductionId: 'a', totalMs: 2_000, opens: 1 }]);
});

test('snapshots keep the current visit running after an abandoned or failed submission', () => {
  let clock = 0;
  const ledger = new DwellLedger(() => clock);
  ledger.opened('a');
  clock += 3_000;

  assert.deepEqual(ledger.records(), [{ introductionId: 'a', totalMs: 3_000, opens: 1 }]);
  clock += 5_000;
  assert.deepEqual(
    ledger.records(),
    [{ introductionId: 'a', totalMs: 8_000, opens: 1 }],
    'time after the snapshot is still part of the same visit'
  );
  assert.deepEqual(ledger.records(), [{ introductionId: 'a', totalMs: 8_000, opens: 1 }]);
});

test('repeated background events retain the resume target', () => {
  let clock = 0;
  const ledger = new DwellLedger(() => clock);
  ledger.opened('a');
  clock = 1000;
  ledger.pause();
  clock = 2000;
  ledger.pause();
  ledger.records();
  clock = 9000;
  ledger.resume();
  clock = 10000;
  ledger.closed('a');
  assert.deepEqual(ledger.records(), [{ introductionId: 'a', totalMs: 2000, opens: 1 }]);
});

test('closing while paused does not resume a profile that was left', () => {
  let clock = 0;
  const ledger = new DwellLedger(() => clock);
  ledger.opened('a');
  clock = 1000;
  ledger.pause();
  ledger.closed('a');
  ledger.resume();
  clock = 9000;
  assert.deepEqual(ledger.records(), [{ introductionId: 'a', totalMs: 1000, opens: 1 }]);
});

// --- Leaving the app --------------------------------------------------------

test('time stops while the app is away', () => {
  let clock = 0;
  const ledger = new DwellLedger(() => clock);

  ledger.opened('a');
  clock += 3_000;
  ledger.pause();
  clock += 1_800_000;   // half an hour on a phone call
  ledger.resume();
  clock += 2_000;
  ledger.closed('a');

  assert.deepEqual(
    ledger.records(),
    [{ introductionId: 'a', totalMs: 5_000, opens: 1 }],
    'the call must not be banked against whoever was on screen'
  );
});

test('an interrupted reading is one reading, not two', () => {
  let clock = 0;
  const ledger = new DwellLedger(() => clock);
  ledger.opened('a');
  clock += 1_000;
  ledger.pause();
  ledger.resume();
  clock += 1_000;
  ledger.closed('a');

  assert.equal(ledger.records()[0]?.opens, 1);
});

test('pausing with nothing open, and resuming without pausing, are both no-ops', () => {
  let clock = 0;
  const ledger = new DwellLedger(() => clock);
  ledger.pause();
  ledger.resume();
  assert.deepEqual(ledger.records(), []);

  ledger.opened('a');
  clock += 1_000;
  ledger.resume();           // never paused
  clock += 1_000;
  assert.deepEqual(ledger.records(), [{ introductionId: 'a', totalMs: 2_000, opens: 1 }]);
});

test('a profile left open when the app is backgrounded is still counted', () => {
  let clock = 0;
  const ledger = new DwellLedger(() => clock);
  ledger.opened('a');
  clock += 4_000;
  ledger.pause();
  clock += 600_000;
  // Submitted from a notification, or the round expired while away.
  assert.deepEqual(ledger.records(), [{ introductionId: 'a', totalMs: 4_000, opens: 1 }]);
});

// --- Soft select ------------------------------------------------------------

test('the most-read profile among those let go is soft selected', () => {
  const records = [
    record('a', 40_000),
    record('b', 30_000),
    record('c', 8_000),
  ];
  // 'a' was kept, so the longest read among the rest is 'b'.
  assert.equal(inferSoftSelect(records, ['b', 'c']), 'b');
});

test('someone kept is not soft selected, they were actually chosen', () => {
  const records = [record('a', 40_000), record('b', 30_000)];
  assert.equal(inferSoftSelect(records, ['b']), 'b', 'the kept one is skipped');
});

test('a tie for longest singles nobody out', () => {
  const records = [record('a', 40_000), record('b', 20_000), record('c', 20_000)];
  assert.equal(inferSoftSelect(records, ['b', 'c']), null);
});

test('one profile read is not enough for "most" to mean anything', () => {
  assert.equal(inferSoftSelect([record('a', 40_000)], ['a']), null);
});

test('a bounce is not a reading, so it cannot be the most read', () => {
  const records = [record('a', 40_000), record('b', 30_000), record('c', 200)];
  assert.equal(inferSoftSelect(records, ['c']), null, 'the only released profile was never read');
});
