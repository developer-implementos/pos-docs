import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const json = (name) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
const core = json('.github/rulesets/main.json');
const review = json('.github/rulesets/review.json');
const settings = json('.github/repository.json');
const name = json('package.json').name;
const byType = (ruleset, type) => ruleset.rules.filter(rule => rule.type === type);

test('technical rules require a PR and verified checks without any bypass actor', () => {
  assert.deepEqual(core.bypass_actors, []);
  assert.deepEqual(core.conditions.ref_name, { include: ['~DEFAULT_BRANCH'], exclude: [] });
  assert.equal(core.enforcement, 'active');
  for (const type of ['deletion', 'non_fast_forward', 'required_linear_history', 'pull_request', 'required_status_checks']) assert.equal(byType(core, type).length, 1);
  const pr = byType(core, 'pull_request')[0].parameters;
  assert.deepEqual(pr.allowed_merge_methods, ['squash']);
  assert.equal(pr.required_review_thread_resolution, true);
  const checks = byType(core, 'required_status_checks')[0].parameters;
  assert.equal(checks.strict_required_status_checks_policy, true);
  assert.equal(checks.do_not_enforce_on_create, false);
  const expected = name === 'pos-platform' ? ['delivery-progress', 'api', 'clients', 'android-mobile', 'ios-mobile', 'windows-desktop', 'PR policy'] : ['documentation', 'editorial-policy'];
  assert.deepEqual(checks.required_status_checks, expected.map(context => ({ context, integration_id: 15368 })));
});

test('only Cristian can bypass the separate human-review ruleset via a PR', () => {
  assert.equal(review.enforcement, 'active');
  assert.deepEqual(review.conditions, core.conditions);
  assert.deepEqual(review.bypass_actors, [{ actor_id: 28737734, actor_type: 'User', bypass_mode: 'pull_request' }]);
  assert.equal(review.rules.length, 1);
  assert.equal(review.rules[0].type, 'pull_request');
  const rule = review.rules[0].parameters;
  assert.equal(rule.required_approving_review_count, 1);
  for (const flag of ['dismiss_stale_reviews_on_push', 'require_code_owner_review', 'require_last_push_approval', 'required_review_thread_resolution']) assert.equal(rule[flag], true);
});

test('merge settings and ownership protect the policy itself', () => {
  assert.equal(settings.allow_merge_commit, false);
  assert.equal(settings.allow_rebase_merge, false);
  assert.equal(settings.allow_squash_merge, true);
  assert.equal(settings.squash_merge_commit_title, 'PR_TITLE');
  assert.equal(settings.squash_merge_commit_message, 'PR_BODY');
  const owners = readFileSync(new URL('../.github/CODEOWNERS', import.meta.url), 'utf8');
  for (const rule of ['/.github/', '/AGENTS.md', '/.agents/', '/.claude/', '/.codex/', '/.mcp.json', '/tools/odd/', '/tools/automated-review/', '/package.json', '/package-lock.json']) assert.ok(owners.split(/\r?\n/).includes(`${rule} @floxcristian`), `${rule} requires designated governance owner`);
});
