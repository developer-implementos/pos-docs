import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

export const defaultLimits = Object.freeze({ timeoutMs: 30 * 60 * 1000, logBytes: 32 * 1024 * 1024, stopGraceMs: 3000 });

// Filtering is not a sandbox: the developer must use an environment without disk credentials.
export function candidateEnvironment() {
  const allowed = /^(path|pathext|systemroot|windir|comspec|temp|tmp|tmpdir|home|userprofile|appdata|localappdata|programfiles|programfiles\(x86\)|programdata|number_of_processors|processor_architecture|playwright_browsers_path)$/i;
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.test(key)));
}

export function execute(cwd, command, args, log, signal, overrides = {}) {
  const limits = { ...defaultLimits, ...overrides };
  return new Promise(resolve => {
    let descriptor;
    let child;
    let completed = false;
    let stopping = false;
    let stopReason;
    let errorCode;
    let bytes = 0;
    const timers = [];
    const finish = (exitCode = null, terminationSignal = null, processExitObserved = false) => {
      if (completed) return;
      completed = true;
      timers.forEach(clearTimeout);
      signal.removeEventListener('abort', interrupted);
      child?.stdout?.destroy();
      child?.stderr?.destroy();
      child?.unref();
      let sha256 = null;
      try {
        if (descriptor !== undefined) fs.closeSync(descriptor);
        if (fs.statSync(log).size > limits.logBytes) errorCode ||= 'log-limit';
        else sha256 = createHash('sha256').update(fs.readFileSync(log)).digest('hex');
      } catch { errorCode ||= 'log-unavailable'; }
      resolve({ exitCode, signal: terminationSignal, sha256, logBytes: bytes, processId: child?.pid ?? null, processExitObserved, ...(stopReason ? { stopReason } : {}), ...(errorCode ? { errorCode } : {}) });
    };
    const terminate = force => {
      if (!child?.pid) return;
      if (process.platform === 'win32') {
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', ...(force ? ['/f'] : [])], { windowsHide: true, stdio: 'ignore' });
        const deadline = setTimeout(() => killer.kill(), limits.stopGraceMs);
        killer.once('error', () => clearTimeout(deadline));
        killer.once('close', () => clearTimeout(deadline));
        killer.unref();
        deadline.unref();
      } else {
        try { process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM'); } catch { /* Close observation decides whether exit is confirmed. */ }
      }
    };
    const stop = reason => {
      stopReason ||= reason;
      errorCode ||= reason;
      if (stopping || completed) return;
      stopping = true;
      terminate(false);
      timers.push(setTimeout(() => terminate(true), limits.stopGraceMs));
      timers.push(setTimeout(() => { errorCode = 'termination-unconfirmed'; finish(); }, limits.stopGraceMs * 2));
    };
    const interrupted = () => stop('interrupted');
    const capture = chunk => {
      if (completed) return;
      const remaining = Math.max(0, limits.logBytes - bytes);
      try {
        const kept = chunk.subarray(0, remaining);
        if (kept.length) {
          const written = fs.writeSync(descriptor, kept);
          bytes += written;
          if (written !== kept.length) stop('log-write-failed');
        }
      } catch { stop('log-write-failed'); }
      if (chunk.length > remaining) stop('log-limit');
    };
    try {
      descriptor = fs.openSync(log, 'wx');
      child = spawn(command, args, { cwd, env: candidateEnvironment(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
      child.stdout.on('data', capture);
      child.stderr.on('data', capture);
      child.once('error', () => { errorCode = 'spawn-failed'; finish(); });
      child.once('close', (code, terminationSignal) => finish(code, terminationSignal, true));
      signal.addEventListener('abort', interrupted, { once: true });
      timers.push(setTimeout(() => stop('step-timeout'), limits.timeoutMs));
      if (signal.aborted) interrupted();
    } catch { errorCode = descriptor === undefined ? 'log-unavailable' : 'spawn-failed'; finish(); }
  });
}
