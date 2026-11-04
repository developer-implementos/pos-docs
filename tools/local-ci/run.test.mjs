import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { runVerification } from './run.mjs';

function fixture(t, script = 'console.log("verification executed");', journeys = 'console.log("journeys executed");') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-local-ci-'));
  const cwd = path.join(directory, 'candidate');
  fs.mkdirSync(path.join(cwd, 'apps/starlight'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'tools/editorial'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { verify: 'node verify.mjs' } }));
  fs.writeFileSync(path.join(cwd, 'apps/starlight/package-lock.json'), '{}');
  fs.writeFileSync(path.join(cwd, 'verify.mjs'), script);
  fs.writeFileSync(path.join(cwd, 'tools/editorial/journeys-check.mjs'), journeys);
  const git = (...args) => execFileSync('git', args, { cwd, stdio: 'pipe' });
  git('init');
  git('config', 'user.name', 'Local CI fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('remote', 'add', 'origin', 'https://github.com/developer-implementos/pos-docs.git');
  git('add', '.');
  git('commit', '-m', 'fixture');
  const options = { cwd, output: path.join(directory, 'evidence'), bodyFile: path.join(directory, 'pr.md') };
  fs.writeFileSync(options.bodyFile, 'Reader-Journeys: /guide/');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return { ...options, git };
}

test('records actual runtime, canonical command, locks, body, successful steps and log hashes', async t => {
  const options = fixture(t);
  const result = await runVerification(options);
  assert.equal(result.status, 'passed');
  assert.equal(result.verificationCommand, 'node verify.mjs');
  assert.deepEqual(result.steps.map(step => step.status), ['passed', 'passed', 'passed']);
  assert.match(result.executedRuntime.npm, /^\d+\.\d+\.\d+$/);
  assert.equal(result.nodeExecutable, process.execPath);
  assert.equal(result.executedRuntime.node, process.version.slice(1));
  assert.equal(result.executedRuntime.satisfiesDeclaredRequirements, 'not-validated');
  for (const step of result.steps) assert.equal(step.sha256, createHash('sha256').update(fs.readFileSync(path.join(options.output, step.log))).digest('hex'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(options.output, 'manifest.json'))), result);
  await assert.rejects(runVerification(options), /exist/);
});

test('failed verify preserves failure and missing journeys instead of success', async t => {
  const options = fixture(t, 'console.error("intentional failure"); process.exit(7);');
  const result = await runVerification(options);
  assert.equal(result.status, 'failed');
  assert.equal(result.steps[1].exitCode, 7);
  assert.equal(result.steps[2].status, 'not_run');
});

test('failed reader journeys prevents success', async t => {
  const result = await runVerification(fixture(t, undefined, 'process.exit(2);'));
  assert.equal(result.status, 'failed');
  assert.equal(result.steps[2].exitCode, 2);
});

test('dirty source and evidence within candidate are rejected before execution', async t => {
  const options = fixture(t);
  fs.writeFileSync(path.join(options.cwd, 'untracked'), 'dirty');
  await assert.rejects(runVerification(options), /source-dirty/);
  fs.unlinkSync(path.join(options.cwd, 'untracked'));
  await assert.rejects(runVerification({ ...options, output: path.join(options.cwd, 'tmp/evidence') }), /outside/);
  assert.equal(fs.existsSync(options.output), false);
});

test('source modification and changed HEAD cannot pass', async t => {
  for (const script of [
    'import fs from "node:fs"; fs.appendFileSync("apps/starlight/package-lock.json", " ");',
    'import {execFileSync} from "node:child_process"; execFileSync("git", ["-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "--allow-empty", "-m", "changed"]);',
  ]) {
    const result = await runVerification(fixture(t, script));
    assert.equal(result.status, 'failed');
    assert.match(result.errorCode, /^source-(dirty|changed)$/);
  }
});

test('absent tracked lockfile fails closed', async t => {
  const options = fixture(t);
  options.git('rm', 'apps/starlight/package-lock.json');
  options.git('commit', '-m', 'remove lock');
  await assert.rejects(runVerification(options), /lockfile/);
});

test('missing canonical command and unexpected origin are rejected', async t => {
  const options = fixture(t);
  fs.writeFileSync(path.join(options.cwd, 'package.json'), '{}');
  options.git('add', '.');
  options.git('commit', '-m', 'remove command');
  await assert.rejects(runVerification(options), /canonical verify/);
  options.git('remote', 'set-url', 'origin', 'https://github.com/example/other.git');
  await assert.rejects(runVerification(options), /corporate/);
});

test('changed body or previous log is rejected even when both commands succeed', async t => {
  for (const filename of ['../pr.md', 'verify.log']) {
    const script = `import fs from 'node:fs'; import path from 'node:path'; fs.appendFileSync(path.resolve(path.dirname(process.argv[3]), ${JSON.stringify(filename)}), 'changed');`;
    const result = await runVerification(fixture(t, undefined, script));
    assert.equal(result.status, 'failed');
    assert.match(result.errorCode, /^(body-changed|step-evidence-changed)$/);
  }
});

test('GitHub credentials and arbitrary environment variables are not inherited', async t => {
  const previous = process.env.LOCAL_CI_TEST_SECRET;
  process.env.LOCAL_CI_TEST_SECRET = 'fixture-only';
  t.after(() => { if (previous === undefined) delete process.env.LOCAL_CI_TEST_SECRET; else process.env.LOCAL_CI_TEST_SECRET = previous; });
  const result = await runVerification(fixture(t, 'if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || process.env.LOCAL_CI_TEST_SECRET) process.exit(3);'));
  assert.equal(result.status, 'passed');
});

test('interruption persists non-success and does not run later checks', async t => {
  const options = fixture(t, 'console.log("started"); setInterval(() => {}, 1000);');
  const controller = new AbortController();
  const timer = setInterval(() => {
    const log = path.join(options.output, 'verify.log');
    if (fs.existsSync(log) && fs.readFileSync(log, 'utf8').includes('started')) controller.abort();
  }, 50);
  const timeout = setTimeout(() => controller.abort(), 10000);
  t.after(() => { clearInterval(timer); clearTimeout(timeout); });
  const result = await runVerification({ ...options, signal: controller.signal });
  assert.equal(result.status, 'interrupted');
  assert.equal(result.steps[1].status, 'interrupted');
  assert.equal(result.steps[2].status, 'not_run');
});

test('oversized child output leaves failed durable evidence and no later checks', async t => {
  const options = fixture(t, 'process.stdout.write("x".repeat(256 * 1024));');
  const result = await runVerification({ ...options, limits: { logBytes: 64 * 1024, stopGraceMs: 1000 } });
  assert.equal(result.status, 'failed');
  assert.equal(result.steps[1].errorCode, 'log-limit');
  assert.equal(result.steps[2].status, 'not_run');
  assert.equal(fs.statSync(path.join(options.output, 'verify.log')).size, 64 * 1024);
  assert.equal(JSON.parse(fs.readFileSync(path.join(options.output, 'manifest.json'))).status, 'failed');
});

test('unexpected source-read errors persist only a fixed code', async t => {
  const options = fixture(t, 'import fs from "node:fs"; fs.renameSync(".git", ".git-hidden"); console.error("fixture-sensitive-output");');
  const result = await runVerification(options);
  assert.equal(result.status, 'failed');
  assert.equal(result.errorCode, 'verification-failed');
  assert.equal(JSON.stringify(result).includes('fixture-sensitive-output'), false);
  assert.equal(Object.hasOwn(result, 'error'), false);
});
