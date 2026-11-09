import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { releaseApp } from './release/policy.mjs';

const json = (name) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
const core = json('.github/rulesets/main.json');
const review = json('.github/rulesets/review.json');
const settings = json('.github/repository.json');
const text = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const byType = (ruleset, type) => ruleset.rules.filter(rule => rule.type === type);

test('technical rules protect PR integration without hosted status checks or bypass actors', () => {
  assert.deepEqual(core.bypass_actors, []);
  assert.deepEqual(core.conditions.ref_name, { include: ['~DEFAULT_BRANCH'], exclude: [] });
  assert.equal(core.enforcement, 'active');
  assert.deepEqual(core.rules.map(rule => rule.type).sort(), ['deletion', 'non_fast_forward', 'pull_request', 'required_linear_history']);
  assert.equal(byType(core, 'required_status_checks').length, 0);
  const pr = byType(core, 'pull_request')[0].parameters;
  assert.deepEqual(pr.allowed_merge_methods, ['squash']);
  assert.equal(pr.required_review_thread_resolution, true);
});

test('only Cristian and the release App can bypass the separate human-review ruleset, both via a PR', () => {
  assert.equal(review.enforcement, 'active');
  assert.deepEqual(review.conditions, core.conditions);
  assert.ok(Number.isSafeInteger(releaseApp.id) && releaseApp.id > 0, 'Declare the release App ID in tools/release/policy.mjs');
  assert.deepEqual(review.bypass_actors, [
    { actor_id: releaseApp.id, actor_type: 'Integration', bypass_mode: 'pull_request' },
    { actor_id: 28737734, actor_type: 'User', bypass_mode: 'pull_request' },
  ]);
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
  assert.equal(settings.allow_auto_merge, false);
  assert.equal(settings.allow_update_branch, true);
  assert.equal(settings.delete_branch_on_merge, true);
  assert.equal(settings.squash_merge_commit_title, 'PR_TITLE');
  assert.equal(settings.squash_merge_commit_message, 'PR_BODY');
  const owners = readFileSync(new URL('../.github/CODEOWNERS', import.meta.url), 'utf8');
  for (const rule of ['/.github/', '/AGENTS.md', '/.agents/', '/.claude/', '/.codex/', '/.mcp.json', '/tools/odd/', '/tools/automated-review/', '/tools/release/', '/package.json', '/package-lock.json', '/release-please-config.json', '/.release-please-manifest.json']) assert.ok(owners.split(/\r?\n/).includes(`${rule} @floxcristian`), `${rule} requires designated governance owner`);
});

test('release workflows hold the App token only on main and only to open, validate and merge the release PR', () => {
  const release = text('.github/workflows/release.yml');
  const merge = text('.github/workflows/release-merge.yml');
  for (const [name, workflow] of [['release.yml', release], ['release-merge.yml', merge]]) {
    assert.match(workflow, /^permissions:\n  contents: read\njobs:\n/m, `${name}: the default token stays read-only`);
    assert.match(workflow, /^    environment: release$/m, `${name}: the App key is an environment secret limited to main`);
    assert.doesNotMatch(workflow, /pull_request_target|secrets\.GITHUB_TOKEN|persist-credentials: true/, name);
    assert.doesNotMatch(workflow, /^\s+ref:/m, `${name}: never check out a PR revision`);
    for (const [, action] of workflow.matchAll(/uses: ([^\s#]+)/g)) assert.match(action, /@[a-f0-9]{40}$/, `${name}: pin ${action} to a commit`);
    const permissions = [...workflow.matchAll(/permission-([a-z-]+): (\w+)/g)].map(match => `${match[1]}:${match[2]}`);
    assert.ok(permissions.every(entry => ['contents:write', 'pull-requests:write', 'issues:write'].includes(entry)), `${name}: ${permissions}`);
  }
  assert.match(release, /^on:\n  push:\n    branches: \[main\]\n  workflow_dispatch:\npermissions:/m);
  assert.match(release, /node tools\/release\/verify\.mjs/, 'An untagged merged release must fail the run');
  assert.match(merge, /^on:\n  workflow_run:\n    workflows: \[Documentation quality\]\n    types: \[completed\]\n  workflow_dispatch:\npermissions:/m);
  assert.match(merge, /head_branch == 'release-please--branches--main'/);
  assert.match(merge, /head_repository\.full_name == github\.repository/);
  assert.match(merge, /run: node tools\/release\/merge\.mjs /);
  assert.doesNotMatch(merge, /permission-issues/, 'Merging needs no issue access');
});

// GitHub discards a workflow whose YAML does not parse, and no other check parses it: a plain `run:`
// value containing ": " left release.yml unloadable (TASK-253). Values that YAML would read as a
// nested mapping must be quoted or written as block scalars. Comments and block contents are skipped.
test('workflow values that YAML would read as a mapping are quoted or block scalars', () => {
  const directory = new URL('../.github/workflows/', import.meta.url);
  const problems = [];
  for (const name of readdirSync(directory).filter(file => file.endsWith('.yml'))) {
    let blockIndent = null;
    readFileSync(new URL(name, directory), 'utf8').split(/\r?\n/).forEach((line, index) => {
      const indent = line.match(/^ */)[0].length;
      if (blockIndent !== null) {
        if (!line.trim() || indent > blockIndent) return;
        blockIndent = null;
      }
      const value = line.match(/^ *(?:- )?[\w.-]+:\s+(\S.*)$/)?.[1];
      if (!value) return;
      if (/^[|>]/.test(value)) blockIndent = indent;
      else if (!/^['"[{&*!]/.test(value) && value.replace(/\s#.*$/, '').includes(': ')) problems.push(`${name}:${index + 1}: ${value}`);
    });
  }
  assert.deepEqual(problems, []);
});
