import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execute } from './process.mjs';

function workspace(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-process-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  return { cwd, log: path.join(cwd, 'step.log'), signal: new AbortController().signal };
}

test('deadline bounds an unresponsive child and records observed exit without claiming tree isolation', async t => {
  const { cwd, log, signal } = workspace(t);
  const started = Date.now();
  const result = await execute(cwd, process.execPath, ['-e', 'process.on("SIGTERM",()=>{}); setInterval(()=>{},1000);'], log, signal, { timeoutMs: 500, stopGraceMs: 1000 });
  if (!result.processExitObserved && result.processId) {
    try { process.kill(result.processId, 'SIGKILL'); } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.equal(result.stopReason, 'step-timeout');
  assert.ok(['step-timeout', 'termination-unconfirmed'].includes(result.errorCode));
  assert.ok(Date.now() - started < 10000);
});

test('spawn failures return fixed codes and leave a bounded local log', async t => {
  const { cwd, log, signal } = workspace(t);
  const result = await execute(cwd, path.join(cwd, 'missing-sensitive-executable'), [], log, signal);
  assert.equal(result.errorCode, 'spawn-failed');
  assert.equal(result.processExitObserved, false);
  assert.equal(result.exitCode, null);
  assert.equal(JSON.stringify(result).includes('sensitive'), false);
  assert.equal(fs.statSync(log).size, 0);
});

test('partial log writes fail even if the child exits successfully', async t => {
  const { cwd, log, signal } = workspace(t);
  t.mock.method(fs, 'writeSync', () => 0);
  const result = await execute(cwd, process.execPath, ['-e', 'console.log("fixture output")'], log, signal);
  assert.equal(result.errorCode, 'log-write-failed');
  assert.equal(result.logBytes, 0);
});

test('unconfirmed termination returns within its bound without claiming process exit', async t => {
  const { cwd, log, signal } = workspace(t);
  const originalKill = process.kill.bind(process);
  if (process.platform !== 'win32') t.mock.method(process, 'kill', () => {});
  let result;
  try {
    // Windows taskkill is asynchronous: allow no observation interval in this fixture.
    result = await execute(cwd, process.execPath, ['-e', 'setInterval(()=>{},1000);'], log, signal, { timeoutMs: 500, stopGraceMs: 0 });
  } finally {
    t.mock.restoreAll();
    if (result?.processId) {
      try { originalKill(result.processId, 'SIGKILL'); } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  assert.equal(result.errorCode, 'termination-unconfirmed');
  assert.equal(result.processExitObserved, false);
  assert.equal(result.exitCode, null);
});
