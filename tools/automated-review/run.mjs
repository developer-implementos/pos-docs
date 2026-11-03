import { readFile, writeFile, appendFile, mkdtemp, mkdir, copyFile, rm, realpath } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLI_VERSION,
  VERSION,
  requireThat,
  selectCredential,
  validateEvent,
  validatePull,
  collectCandidate,
  cliArguments,
  validateVerdict,
  sha256,
  redactSensitiveText,
} from './core.mjs';
import { githubApi, isolatedEnvironment, runProcess, renderSummary } from './runtime.mjs';

const source = dirname(fileURLToPath(import.meta.url));
let temporary;
let temporaryRoot;
try {
  requireThat(
    process.platform === 'linux' && process.arch === 'x64' && process.env.GITHUB_ACTIONS === 'true',
    'unsupported_runner',
  );
  requireThat(
    process.env.GITHUB_SERVER_URL === 'https://github.com' &&
      process.env.GITHUB_API_URL === 'https://api.github.com',
    'unexpected_github_host',
  );
  const credential = selectCredential(process.env);
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const expected = validateEvent(event, process.env);
  requireThat(process.env.GITHUB_SHA === expected.base, 'untrusted_workflow_revision');
  const api = githubApi(expected.repository, process.env.GITHUB_TOKEN);
  const actor = await api(
    `/repos/${expected.repository}/collaborators/${process.env.GITHUB_ACTOR}/permission`,
  );
  requireThat(['write', 'maintain', 'admin'].includes(actor.permission), 'trigger_actor_not_authorized');
  const candidate = await collectCandidate(api, expected);
  temporaryRoot = await realpath(process.env.RUNNER_TEMP);
  temporary = await mkdtemp(join(temporaryRoot, 'pos-ai-review-'));
  const install = join(temporary, 'install');
  const execution = join(temporary, 'execution');
  await mkdir(install);
  await mkdir(execution);
  await writeFile(join(temporary, 'empty.npmrc'), '', { mode: 0o600 });
  for (const filename of ['package.json', 'package-lock.json'])
    await copyFile(join(source, 'cli', filename), join(install, filename));
  const environment = isolatedEnvironment(process.env, temporary);
  await runProcess(
    'npm',
    ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org'],
    { cwd: install, env: environment, timeout: 180000 },
  );
  const executable = join(install, 'node_modules/@anthropic-ai/claude-code-linux-x64/claude');
  const version = await runProcess(executable, ['--version'], {
    cwd: execution,
    env: environment,
    timeout: 15000,
  });
  requireThat(version.trim() === `${CLI_VERSION} (Claude Code)`, 'unexpected_cli_version');
  validatePull(await api(`/repos/${expected.repository}/pulls/${expected.number}`), expected);
  const raw = await runProcess(executable, cliArguments(credential.model), {
    cwd: execution,
    env: isolatedEnvironment(process.env, temporary, credential),
    input: `UNTRUSTED_CANDIDATE\n${JSON.stringify(candidate)}`,
    timeout: 240000,
  });
  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch {
    throw new Error('review_output_invalid_json');
  }
  const verdict = validateVerdict(envelope, candidate);
  validatePull(await api(`/repos/${expected.repository}/pulls/${expected.number}`), expected);
  requireThat(
    /^\d+$/.test(process.env.GITHUB_RUN_ID || '') && /^\d+$/.test(process.env.GITHUB_RUN_ATTEMPT || ''),
    'invalid_run_identity',
  );
  const evidence = {
    schemaVersion: 1,
    implementationVersion: VERSION,
    cliVersion: CLI_VERSION,
    model: credential.model,
    repository: expected.repository,
    pull: expected.number,
    base: expected.base,
    mergeBase: candidate.mergeBase,
    head: expected.head,
    candidateDigest: candidate.digest,
    policyRevision: process.env.GITHUB_SHA,
    manifestDigest: sha256(await readFile(join(source, 'distribution.json'))),
    runUrl: `https://github.com/${expected.repository}/actions/runs/${process.env.GITHUB_RUN_ID}/attempts/${process.env.GITHUB_RUN_ATTEMPT}`,
    capturedAt: new Date().toISOString(),
    passed: verdict.passed,
    verdict: verdict.verdict,
    files: candidate.files.map((file) => ({
      path: file.path,
      before: file.base?.sha256 || null,
      after: file.head?.sha256 || null,
    })),
    // Publish only validated findings to this repository's existing audience.
    // Secrets and links are removed before either artifact or Markdown output.
    // This is a bounded explanation, never a transcript or full model response.
    findings: verdict.findings.map(({ severity, path, side, line, description }) => ({
      severity,
      path,
      side,
      line,
      description: redactSensitiveText(description, [credential.value, process.env.GITHUB_TOKEN]),
    })),
    coverage: verdict.coverage,
  };
  await writeFile(
    join(temporaryRoot, 'pos-ai-review-evidence.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
    { mode: 0o600 },
  );
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    renderSummary(evidence, [credential.value, process.env.GITHUB_TOKEN]),
  );
  process.exitCode = verdict.passed ? 0 : 1;
} catch (error) {
  // Error messages from network/CLI/JSON/filesystem are not safe for logs.
  const code = /^[a-z][a-z_]{2,70}$/.test(error.message || '') ? error.message : 'review_internal_failure';
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `## Revisión automática no aprobada\n\nCódigo: \`${code}\`. No se acredita revisión ni se omite la comprobación.\n`,
    ).catch(() => {});
  process.stderr.write(`Automatic review failed: ${code}\n`);
  process.exitCode = 1;
} finally {
  if (
    temporary &&
    temporaryRoot &&
    dirname(resolve(temporary)) === resolve(temporaryRoot) &&
    resolve(temporary).startsWith(`${resolve(temporaryRoot)}${sep}pos-ai-review-`)
  )
    await rm(temporary, { recursive: true, force: true });
}
