import { spawn } from 'node:child_process';
import { LIMITS, REPOSITORIES, requireThat, safeText } from './core.mjs';

export function apiUrl(path, repository) {
  requireThat(REPOSITORIES.includes(repository), 'unexpected_repository');
  const prefix = `/repos/${repository}`;
  const suffix = path.slice(prefix.length);
  requireThat(
    path.startsWith(`${prefix}/`) &&
      /^\/(?:pulls\/\d+(?:\/files\?per_page=100&page=1)?|compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40}\?per_page=1|git\/(?:commits|trees|blobs)\/[a-f0-9]{40}|collaborators\/[a-zA-Z0-9-]+\/permission)$/.test(
        suffix,
      ),
    'unsafe_api_path',
  );
  return new URL(path, 'https://api.github.com').href;
}

export async function boundedJson(response, maximum = LIMITS.apiBytes) {
  requireThat(
    response.ok &&
      response.body &&
      /application\/(?:[^;]+\+)?json/i.test(response.headers.get('content-type') || ''),
    'github_api_failed',
  );
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maximum) {
      await response.body.cancel().catch(() => {});
      throw new Error('github_response_too_large');
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('invalid_github_json');
  }
}

export function githubApi(repository, token, fetcher = fetch) {
  requireThat(typeof token === 'string' && token.length > 0, 'github_token_missing');
  return async (path) => {
    const url = apiUrl(path, repository);
    let response;
    try {
      response = await fetcher(url, {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
        },
      });
    } catch {
      throw new Error('github_request_failed');
    }
    return boundedJson(response);
  };
}

export function isolatedEnvironment(source, directory, credential) {
  const result = {};
  for (const key of ['PATH', 'LANG', 'LC_ALL', 'TZ', 'SystemRoot'])
    if (source[key]) result[key] = source[key];
  Object.assign(result, {
    HOME: directory,
    USERPROFILE: directory,
    TMPDIR: directory,
    TMP: directory,
    TEMP: directory,
    CLAUDE_CONFIG_DIR: `${directory}/config`,
    CI: 'true',
    DISABLE_AUTOUPDATER: '1',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    npm_config_userconfig: `${directory}/empty.npmrc`,
    npm_config_registry: 'https://registry.npmjs.org',
    npm_config_cache: `${directory}/npm-cache`,
  });
  if (credential) result[credential.name] = credential.value;
  return result;
}

// No shell; children never receive the parent environment implicitly. On Linux the
// process group is terminated as well, including any subprocess left by the CLI.
export function runProcess(file, args, options) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0,
      stopped = false,
      failure = null;
    const child = spawn(file, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      detached: process.platform !== 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    function stop(code) {
      if (stopped) return;
      stopped = true;
      failure = new Error(code);
      try {
        process.platform === 'win32' ? child.kill('SIGKILL') : process.kill(-child.pid, 'SIGKILL');
      } catch {
        /* Already exited. */
      }
    }
    const timer = setTimeout(() => stop('review_process_timeout'), options.timeout ?? 240000);
    child.on('error', () => {
      clearTimeout(timer);
      reject(new Error('review_process_start_failed'));
    });
    child.stdout.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > (options.maxOutput ?? LIMITS.responseBytes)) stop('review_output_too_large');
      else chunks.push(chunk);
    });
    // Keep stderr private and bounded. Never publish prompts, transcripts or tokens.
    let errorBytes = 0;
    child.stderr.on('data', (chunk) => {
      errorBytes += chunk.length;
      if (errorBytes > LIMITS.responseBytes) stop('review_error_output_too_large');
    });
    child.stdin.on('error', () => {
      /* A failed child can close stdin first. */
    });
    child.stdin.end(options.input || '');
    child.on('close', (code) => {
      clearTimeout(timer);
      if (process.platform !== 'win32') {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {
          /* No remaining children. */
        }
      }
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error('review_process_failed'));
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
  });
}

export function renderSummary(evidence, secrets = []) {
  const text = (value) => safeText(value, secrets);
  const lines = [
    '## Revisión automática',
    '',
    `Resultado: **${evidence.passed ? 'sin hallazgos bloqueantes' : 'no aprobada'}**. Esta comprobación es de máquina; no constituye aprobación humana ni aceptación operativa.`,
    '',
    `- Candidato: \`${text(evidence.head)}\``,
    `- Base: \`${text(evidence.base)}\``,
    `- CLI: ${text(evidence.cliVersion)} · modelo solicitado: ${text(evidence.model)}`,
    `- Evidencia: ${text(evidence.candidateDigest)}`,
    `- Archivos revisados: ${evidence.files.length}`,
    '',
  ];
  for (const finding of evidence.findings)
    lines.push(
      `- **${text(finding.severity)}** ${text(finding.path)}:${finding.line} (${text(finding.side)}): ${text(finding.description)}`,
    );
  if (!evidence.passed)
    lines.push(
      '',
      'Corrige los hallazgos o completa el contexto y vuelve a ejecutar la comprobación para el candidato vigente.',
    );
  return `${lines.join('\n')}\n`;
}
