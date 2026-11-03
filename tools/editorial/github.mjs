import { verifyIssue } from './policy.mjs';

const docsRepository = 'developer-implementos/pos-docs';
const productRepository = 'developer-implementos/pos-platform';

export function githubClient({ token, fetcher = fetch }) {
  return async function get(path) {
    if (!/^repos\/developer-implementos\/pos-(?:docs|platform)\/(?:pulls|issues)\/[1-9]\d*(?:\/files\?per_page=100&page=[1-9]\d*)?$/.test(path)) {
      throw new Error('GitHub request is outside the editorial policy allowlist.');
    }
    const response = await fetcher(`https://api.github.com/${path}`, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    // Never print private issue bodies, API error bodies or authentication headers.
    if (!response.ok) return { status: response.status };
    return { status: response.status, value: await response.json() };
  };
}

export async function loadPullRequest(get, number, expectedHead = null) {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('PR number must be a positive integer.');
  const result = await get(`repos/${docsRepository}/pulls/${number}`);
  if (result.status !== 200) throw new Error(`Cannot read PR metadata (HTTP ${result.status}).`);
  const pr = result.value;
  if (pr.number !== number || pr.base?.repo?.full_name !== docsRepository || pr.base.ref !== 'main' || pr.state !== 'open') {
    throw new Error('Expected an open POS Docs PR targeting main.');
  }
  if (expectedHead && pr.head?.sha !== expectedHead) throw new Error('PR changed since this event; validate the new revision.');
  if (!Number.isSafeInteger(pr.changed_files) || pr.changed_files < 0 || pr.changed_files > 3000) {
    throw new Error('PR file count exceeds the complete metadata review limit.');
  }
  const files = [];
  for (let page = 1; files.length < pr.changed_files; page += 1) {
    const pageResult = await get(`repos/${docsRepository}/pulls/${number}/files?per_page=100&page=${page}`);
    if (pageResult.status !== 200 || !Array.isArray(pageResult.value) || pageResult.value.length === 0) {
      throw new Error('Cannot obtain the complete changed-file inventory.');
    }
    files.push(...pageResult.value);
    if (files.length > pr.changed_files) throw new Error('PR changed while reading its files; retry the current revision.');
  }
  // Defend against a force-push between reading metadata and listing files.
  const latest = await get(`repos/${docsRepository}/pulls/${number}`);
  if (latest.status !== 200 || latest.value.head?.sha !== pr.head?.sha || latest.value.body !== pr.body || latest.value.changed_files !== pr.changed_files) {
    throw new Error('PR changed during validation; retry the current revision.');
  }
  return { body: pr.body, files, head: pr.head.sha };
}

export async function checkLinkedIssue(get, number, { required = false } = {}) {
  const result = await get(`repos/${productRepository}/issues/${number}`);
  if ([403, 404].includes(result.status)) {
    if (required) throw new Error(`Issue identity/state could not be verified (HTTP ${result.status}).`);
    return { status: 'unverified', reason: `HTTP ${result.status}: repository access or issue identity could not be confirmed.` };
  }
  if (result.status !== 200) throw new Error(`Issue lookup failed (HTTP ${result.status}); retry after the API recovers.`);
  return verifyIssue(result.value, number);
}
