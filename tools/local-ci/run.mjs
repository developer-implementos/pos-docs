import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { execute, defaultLimits } from './process.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = file => hash(fs.readFileSync(file));
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const reportCodes = new Set(['source-dirty', 'source-changed', 'body-changed', 'step-evidence-changed', 'step-failed', 'interrupted', 'runtime-unavailable']);
const fail = code => { throw Object.assign(new Error(code), { reportCode: code }); };
const npmCommand = command => process.platform === 'win32' ? [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm ${command}`]] : ['npm', command.split(' ')];

function source(cwd) {
  if (!/^(?:https:\/\/github\.com\/|git@github\.com:)developer-implementos\/pos-docs(?:\.git)?$/.test(git(cwd, 'remote', 'get-url', 'origin'))) throw new Error('Expected the corporate POS Docs origin.');
  if (git(cwd, 'status', '--porcelain', '--untracked-files=all')) fail('source-dirty');
  const files = git(cwd, 'ls-files', '-z').split('\0').filter(file => file.endsWith('package-lock.json'));
  if (!files.includes('apps/starlight/package-lock.json')) throw new Error('Missing tracked Starlight lockfile.');
  const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json')));
  const verificationCommand = packageJson.scripts?.verify;
  if (!verificationCommand?.trim()) throw new Error('Missing canonical verify command.');
  return {
    head: git(cwd, 'rev-parse', 'HEAD'),
    verificationCommand,
    runtimeRequirements: { engines: packageJson.engines ?? null, packageManager: packageJson.packageManager ?? null },
    packageJsonSha256: fileHash(path.join(cwd, 'package.json')),
    locks: Object.fromEntries(files.map(file => [file, fileHash(path.join(cwd, file))])),
  };
}

export async function runVerification({ cwd = root, output, bodyFile, signal = new AbortController().signal, limits = defaultLimits }) {
  limits = { ...defaultLimits, ...limits };
  const candidate = source(cwd);
  const body = fs.readFileSync(bodyFile);
  const destination = path.resolve(output);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const resolvedDestination = path.join(fs.realpathSync(path.dirname(destination)), path.basename(destination));
  const relative = path.relative(fs.realpathSync(cwd), resolvedDestination);
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('Evidence directory must be outside the candidate checkout.');
  fs.mkdirSync(destination); // Refuse to overwrite evidence from another attempt.
  fs.writeFileSync(path.join(destination, 'pr-body.md'), body, { flag: 'wx' });
  const manifest = {
    schemaVersion: 1, repository: 'developer-implementos/pos-docs', ...candidate,
    node: process.version, nodeExecutable: process.execPath, platform: process.platform, architecture: process.arch,
    limits,
    startedAt: new Date().toISOString(), status: 'running', prBodySha256: hash(body),
    steps: ['runtime', 'verify', 'reader-journeys'].map(id => ({ id, status: 'not_run', log: `${id}.log` })),
    limitation: 'Developer declaration, not independent attestation; live PR policy and native verification are separate.',
  };
  const save = () => {
    fs.writeFileSync(path.join(destination, 'manifest.tmp'), JSON.stringify(manifest, null, 2) + '\n');
    fs.renameSync(path.join(destination, 'manifest.tmp'), path.join(destination, 'manifest.json'));
  };
  const interrupted = () => {
    manifest.status = 'interrupted';
    try { save(); } catch { manifest.errorCode = 'evidence-write-failed'; }
  };
  signal.addEventListener('abort', interrupted, { once: true });
  save();
  try {
    const commands = [
      npmCommand('--versions --json'),
      npmCommand('run verify'),
      [process.execPath, ['tools/editorial/journeys-check.mjs', '--body-file', path.join(destination, 'pr-body.md')]],
    ];
    for (const [index, step] of manifest.steps.entries()) {
      if (signal.aborted) fail('interrupted');
      step.status = 'running';
      step.limits = step.id === 'runtime' ? { ...limits, timeoutMs: Math.min(limits.timeoutMs, 15000), logBytes: Math.min(limits.logBytes, 64 * 1024) } : limits;
      save();
      const [command, args] = commands[index];
      Object.assign(step, await execute(cwd, command, args, path.join(destination, step.log), signal, step.limits));
      step.status = signal.aborted ? 'interrupted' : step.exitCode === 0 && !step.errorCode && step.processExitObserved ? 'passed' : 'failed';
      save();
      if (step.status !== 'passed') fail('step-failed');
      if (step.id === 'runtime') {
        try {
          const versions = JSON.parse(fs.readFileSync(path.join(destination, step.log), 'utf8'));
          if (![versions.node, versions.npm].every(value => /^\d+\.\d+\.\d+$/.test(value))) fail('runtime-unavailable');
          manifest.executedRuntime = { node: versions.node, npm: versions.npm, satisfiesDeclaredRequirements: 'not-validated' };
        } catch { fail('runtime-unavailable'); }
      }
    }
    if (JSON.stringify(source(cwd)) !== JSON.stringify(candidate)) fail('source-changed');
    if (fileHash(bodyFile) !== manifest.prBodySha256 || fileHash(path.join(destination, 'pr-body.md')) !== manifest.prBodySha256) fail('body-changed');
    for (const step of manifest.steps) {
      if (step.status !== 'passed' || fs.statSync(path.join(destination, step.log)).size > step.limits.logBytes || fileHash(path.join(destination, step.log)) !== step.sha256) fail('step-evidence-changed');
    }
    manifest.status = 'passed';
  } catch (error) {
    manifest.status = signal.aborted ? 'interrupted' : 'failed';
    manifest.errorCode = reportCodes.has(error.reportCode) ? error.reportCode : 'verification-failed';
  } finally {
    manifest.finishedAt = new Date().toISOString();
    save();
    signal.removeEventListener('abort', interrupted);
  }
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const abort = new AbortController();
  for (const event of ['SIGINT', 'SIGTERM']) process.once(event, () => abort.abort());
  try {
    const args = process.argv.slice(2);
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
      const key = args[index];
      if (!['--output', '--body-file'].includes(key) || options[key] || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Usage: run.mjs --output <new external directory> --body-file <PR markdown>');
      options[key] = args[index + 1];
    }
    if (!options['--output'] || !options['--body-file']) throw new Error('Both --output and --body-file are required.');
    const result = await runVerification({ output: options['--output'], bodyFile: options['--body-file'], signal: abort.signal });
    console.log(`Local documentation verification: ${result.status}. Evidence: ${path.resolve(options['--output'])}`);
    process.exitCode = result.status === 'passed' ? 0 : abort.signal.aborted ? 130 : 1;
  } catch { console.error('Local verification could not start or persist evidence; check clean source and --output/--body-file arguments.'); process.exitCode = 1; }
}
