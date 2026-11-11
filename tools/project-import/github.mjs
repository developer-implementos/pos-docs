/**
 * Publishes the import as one bot-owned branch and PR. The job holds a write token for this public
 * repository, so every endpoint is listed explicitly, the branch is written through the Git Data API
 * (no credentials in a local git config, commits signed by GitHub for the App) and anything the App
 * did not create aborts the run instead of being overwritten.
 */
import { importBranch } from './pull-request.mjs';

export const repository = 'developer-implementos/pos-docs';
const prefix = `repos/${repository}/`;
const branchRef = `heads/${importBranch}`;
const sha = '[a-f0-9]{40}';
const endpoints = [
  ['GET', new RegExp(`^git/commits/${sha}$`)],
  ['GET', new RegExp(`^commits/${sha}$`)],
  ['GET', new RegExp(`^git/ref/${branchRef}$`)],
  ['GET', new RegExp(`^pulls\\?state=open&base=main&head=developer-implementos:${importBranch}&per_page=100$`)],
  ['POST', /^git\/trees$/],
  ['POST', /^git\/commits$/],
  ['POST', /^git\/refs$/],
  ['PATCH', new RegExp(`^git/refs/${branchRef}$`)],
  ['POST', /^pulls$/],
  ['PATCH', /^pulls\/[1-9]\d*$/],
  ['POST', /^issues\/[1-9]\d*\/comments$/],
];

export function importClient({ token, fetcher = fetch }) {
  if (!token) throw new Error('A GitHub token for POS Docs is required to publish the import.');
  return async function request(method, path, body) {
    const local = path.startsWith(prefix) ? path.slice(prefix.length) : null;
    if (local === null || !endpoints.some(([allowed, pattern]) => allowed === method && pattern.test(local))) {
      throw new Error(`GitHub request is outside the import allowlist: ${method} ${path}`);
    }
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
      signal: AbortSignal.timeout(20_000),
    });
    // Never print response bodies or headers: they may echo the request.
    const value = response.status === 204 ? null : await response.json().catch(() => null);
    return { status: response.status, value };
  };
}

async function call(request, method, path, body, expected) {
  const result = await request(method, `${prefix}${path}`, body);
  if (!expected.includes(result.status)) throw new Error(`GitHub ${method} ${path} failed (HTTP ${result.status}).`);
  return result;
}

/** The bot identity is the App's slug as GitHub shows it on commits and PRs. */
export function botLogin(appSlug) {
  if (!/^[a-z0-9][a-z0-9-]{0,38}$/.test(appSlug ?? '')) throw new Error('A valid GitHub App slug is required to recognize the import bot.');
  return `${appSlug}[bot]`;
}

/**
 * Creates or updates the import branch and PR. `files` maps repository paths to their new UTF-8
 * content; `base` is the main commit the import was computed from. Returns what it did.
 */
export async function publishImport({ request, base, files, title, body, appSlug }) {
  if (!new RegExp(`^${sha}$`).test(base)) throw new Error('The base must be a full commit SHA.');
  const bot = botLogin(appSlug);
  const open = (await call(request, 'GET', `pulls?state=open&base=main&head=developer-implementos:${importBranch}&per_page=100`, null, [200])).value;
  if (!Array.isArray(open) || open.length > 1) throw new Error('Expected at most one open import PR.');
  const existing = open[0] ?? null;
  if (existing && (existing.user?.login !== bot || existing.head?.repo?.full_name !== repository)) {
    throw new Error(`The open PR #${existing.number} on ${importBranch} was not opened by ${bot}; refusing to modify it.`);
  }

  const baseCommit = (await call(request, 'GET', `git/commits/${base}`, null, [200])).value;
  const tree = (await call(request, 'POST', 'git/trees', {
    base_tree: baseCommit.tree.sha,
    tree: Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })),
  }, [201])).value;

  const ref = await call(request, 'GET', `git/ref/${branchRef}`, null, [200, 404]);
  let head = null;
  if (ref.status === 200) {
    const current = ref.value.object.sha;
    const author = (await call(request, 'GET', `commits/${current}`, null, [200])).value;
    if (author.author?.login !== bot || author.committer?.login !== bot) {
      throw new Error(`The branch ${importBranch} has a commit that ${bot} did not create; refusing to overwrite it.`);
    }
    const commit = (await call(request, 'GET', `git/commits/${current}`, null, [200])).value;
    if (commit.tree.sha === tree.sha && commit.parents.length === 1 && commit.parents[0].sha === base) head = current;
  }
  let branch = 'unchanged';
  if (!head) {
    const commit = (await call(request, 'POST', 'git/commits', { message: title, tree: tree.sha, parents: [base] }, [201])).value;
    head = commit.sha;
    if (ref.status === 200) await call(request, 'PATCH', `git/refs/${branchRef}`, { sha: head, force: true }, [200]);
    else await call(request, 'POST', 'git/refs', { ref: `refs/${branchRef}`, sha: head }, [201]);
    branch = ref.status === 200 ? 'updated' : 'created';
  }

  if (!existing) {
    const created = (await call(request, 'POST', 'pulls', { title, body, head: importBranch, base: 'main', maintainer_can_modify: false }, [201])).value;
    return { pull: created.number, url: created.html_url, head, branch, pullRequest: 'created' };
  }
  if (existing.title === title && existing.body === body) return { pull: existing.number, url: existing.html_url, head, branch, pullRequest: 'unchanged' };
  await call(request, 'PATCH', `pulls/${existing.number}`, { title, body }, [200]);
  return { pull: existing.number, url: existing.html_url, head, branch, pullRequest: 'updated' };
}

/** Closes the bot PR when main already carries current snapshots, so no obsolete import stays open. */
export async function closeObsoleteImport({ request, appSlug, revision }) {
  const bot = botLogin(appSlug);
  const open = (await call(request, 'GET', `pulls?state=open&base=main&head=developer-implementos:${importBranch}&per_page=100`, null, [200])).value;
  if (!Array.isArray(open) || open.length > 1) throw new Error('Expected at most one open import PR.');
  const existing = open[0];
  if (!existing) return null;
  if (existing.user?.login !== bot || existing.head?.repo?.full_name !== repository) {
    throw new Error(`The open PR #${existing.number} on ${importBranch} was not opened by ${bot}; refusing to close it.`);
  }
  await call(request, 'POST', `issues/${existing.number}/comments`, { body: `Cerrada automáticamente: main ya publica los snapshots vigentes de POS Platform en \`${revision}\`.` }, [201]);
  await call(request, 'PATCH', `pulls/${existing.number}`, { state: 'closed' }, [200]);
  return { pull: existing.number, url: existing.html_url, pullRequest: 'closed' };
}
