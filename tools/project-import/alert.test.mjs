import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, failureMessage, label, notify, recoveryMessage, reminderInterval, title } from './alert.mjs';

const env = (overrides = {}) => ({
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'developer-implementos/pos-docs',
  GITHUB_RUN_ID: '44073778473',
  GITHUB_SHA: 'c'.repeat(40),
  GITHUB_EVENT_NAME: 'schedule',
  IMPORT_RESULT: 'failure',
  ...overrides,
});

/** A `gh` that keeps the open alerts in memory and records every call. */
function fakeGh(open = []) {
  const calls = [];
  const gh = args => {
    calls.push(args);
    if (args[0] === 'issue' && args[1] === 'list') return JSON.stringify(open);
    return '';
  };
  return { gh, calls, writes: () => calls.filter(args => !(args[0] === 'issue' && args[1] === 'list')) };
}

const now = Date.parse('2026-11-17T12:00:00Z');

test('only a failed or cancelled scheduled or dispatched import alerts; any success recovers', () => {
  for (const event of ['schedule', 'repository_dispatch']) {
    assert.equal(decide('failure', event), 'alert');
    assert.equal(decide('cancelled', event), 'alert');
  }
  // A person who dispatches by hand watches that run; a skipped import is the opt-in schedule.
  assert.equal(decide('failure', 'workflow_dispatch'), 'none');
  assert.equal(decide('skipped', 'schedule'), 'none');
  for (const event of ['schedule', 'repository_dispatch', 'workflow_dispatch']) assert.equal(decide('success', event), 'recover');
});

test('the first failure creates the labelled alert, ensuring the label exists', () => {
  const github = fakeGh();
  assert.deepEqual(notify(env(), github.gh, now), { action: 'create' });
  const [labelCall, create] = github.writes();
  assert.deepEqual(labelCall.slice(0, 3), ['label', 'create', label]);
  assert.ok(labelCall.includes('--force'));
  assert.deepEqual(create.slice(0, 2), ['issue', 'create']);
  assert.equal(create[create.indexOf('--title') + 1], title);
  assert.equal(create[create.indexOf('--label') + 1], label);
  assert.equal(create[create.indexOf('--body') + 1], failureMessage(env()));
});

test('an open alert is commented at most once a day while the import keeps failing', () => {
  const fresh = fakeGh([{ number: 5, updatedAt: new Date(now - reminderInterval + 60_000).toISOString() }]);
  assert.deepEqual(notify(env(), fresh.gh, now), { action: 'quiet', number: 5 });
  assert.equal(fresh.writes().length, 0, 'An hourly failure does not add a comment every hour');

  const stale = fakeGh([{ number: 5, updatedAt: new Date(now - reminderInterval).toISOString() }]);
  assert.deepEqual(notify(env({ IMPORT_RESULT: 'cancelled' }), stale.gh, now), { action: 'comment', number: 5 });
  assert.deepEqual(stale.writes(), [['issue', 'comment', '5', '--repo', 'developer-implementos/pos-docs', '--body', failureMessage(env({ IMPORT_RESULT: 'cancelled' }))]]);
});

test('with several open alerts the oldest one is used, and a successful run closes it', () => {
  const github = fakeGh([{ number: 9, updatedAt: '2026-11-01T00:00:00Z' }, { number: 4, updatedAt: '2026-11-01T00:00:00Z' }]);
  assert.deepEqual(notify(env({ IMPORT_RESULT: 'success', GITHUB_EVENT_NAME: 'workflow_dispatch' }), github.gh, now), { action: 'close', number: 4 });
  assert.deepEqual(github.writes(), [['issue', 'close', '4', '--repo', 'developer-implementos/pos-docs', '--comment', recoveryMessage(env())]]);
});

test('a success without an open alert, a skipped import and a failed manual run write nothing', () => {
  for (const overrides of [{ IMPORT_RESULT: 'success' }, { IMPORT_RESULT: 'skipped' }, { IMPORT_RESULT: 'failure', GITHUB_EVENT_NAME: 'workflow_dispatch' }]) {
    const github = fakeGh();
    assert.equal(notify(env(overrides), github.gh, now).action, 'none');
    assert.equal(github.writes().length, 0, JSON.stringify(overrides));
  }
});

test('the public text names the run and the commit, and nothing a log could leak', () => {
  const text = failureMessage(env());
  assert.match(text, /https:\/\/github\.com\/developer-implementos\/pos-docs\/actions\/runs\/44073778473/);
  assert.match(text, new RegExp(`\`${'c'.repeat(40)}\``));
  assert.match(text, /se cierra sola/);
  assert.throws(() => failureMessage(env({ GITHUB_RUN_ID: '1; rm -rf /' })), /GITHUB_RUN_ID/);
});

test('a gh failure propagates so the alert job itself turns red', () => {
  const gh = args => {
    if (args[1] === 'list') return '[]';
    throw new Error('gh label create exited with 1.');
  };
  assert.throws(() => notify(env(), gh, now), /exited with 1/);
});
