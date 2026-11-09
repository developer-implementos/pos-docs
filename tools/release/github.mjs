import { releaseBranch, repository } from './policy.mjs';

const prefix = `repos/${repository}/`;
const allowed = [
  /^pulls\?state=open&base=main&head=developer-implementos:release-please--branches--main--components--pos-docs&per_page=100$/,
  /^pulls\/[1-9]\d*$/,
  /^pulls\/[1-9]\d*\/files\?per_page=100&page=[1-9]\d*$/,
  /^pulls\/[1-9]\d*\/merge$/,
  /^contents\/(?:CHANGELOG\.md|package\.json|\.release-please-manifest\.json)\?ref=[a-f0-9]{40}$/,
  /^actions\/workflows\/docs-quality\.yml\/runs\?head_sha=[a-f0-9]{40}&event=pull_request&per_page=100$/,
  /^issues\?state=closed&labels=autorelease%3A%20pending&per_page=100$/,
];

/** A narrow REST client: release jobs hold a write token, so every endpoint is listed explicitly. */
export function releaseClient({ token, fetcher = fetch }) {
  if (!token) throw new Error('A GitHub token is required.');
  return async function request(method, path, body) {
    if (!path.startsWith(prefix) || !allowed.some(pattern => pattern.test(path.slice(prefix.length)))) {
      throw new Error(`GitHub request is outside the release allowlist: ${method} ${path}`);
    }
    if (method !== 'GET' && !(method === 'PUT' && path.endsWith('/merge'))) throw new Error(`Release jobs only read and merge: ${method} ${path}`);
    const response = await fetcher(`https://api.github.com/${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    // Never print response bodies or headers: they may echo the request.
    const value = response.status === 204 ? null : await response.json().catch(() => null);
    return { status: response.status, value };
  };
}

export async function getJson(request, path) {
  const result = await request('GET', path);
  if (result.status !== 200) throw new Error(`GitHub GET ${path} failed (HTTP ${result.status}).`);
  return result.value;
}

export async function openReleasePullRequests(request) {
  return getJson(request, `${prefix}pulls?state=open&base=main&head=developer-implementos:${releaseBranch}&per_page=100`);
}

export async function pullRequestFiles(request, pr) {
  const files = [];
  for (let page = 1; files.length < pr.changed_files; page += 1) {
    const batch = await getJson(request, `${prefix}pulls/${pr.number}/files?per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) throw new Error('Cannot obtain the complete changed-file inventory.');
    files.push(...batch);
  }
  if (files.length !== pr.changed_files) throw new Error('The PR changed while its files were read; retry.');
  return files;
}

export function contentsReader(request) {
  return async (path, revision) => {
    const value = await getJson(request, `${prefix}contents/${path}?ref=${revision}`);
    if (value?.encoding !== 'base64' || typeof value.content !== 'string') throw new Error(`Unexpected contents response for ${path}.`);
    return Buffer.from(value.content, 'base64').toString('utf8');
  };
}

/** The latest Documentation quality run for this exact head, or null if none has been created yet. */
export async function latestQualityRun(request, sha) {
  const value = await getJson(request, `${prefix}actions/workflows/docs-quality.yml/runs?head_sha=${sha}&event=pull_request&per_page=100`);
  const runs = (value?.workflow_runs ?? []).filter(run => run.head_sha === sha);
  return runs.sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))[0] ?? null;
}

export async function untaggedMergedReleases(request) {
  const issues = await getJson(request, `${prefix}issues?state=closed&labels=autorelease%3A%20pending&per_page=100`);
  return issues.filter(issue => issue.pull_request?.merged_at);
}

export { prefix };
