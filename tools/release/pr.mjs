/**
 * Editorial PR check for release PRs. It uses the editorial read-only client, so it reads files
 * through immutable commits, trees and blobs, and never needs the release App token.
 */
import { createHash } from 'node:crypto';
import { isReleasePullRequest, repository, validateReleaseCandidate } from './policy.mjs';

async function read(get, path) {
  const result = await get(path);
  if (result.status !== 200) throw new Error(`Cannot read release metadata (HTTP ${result.status}).`);
  return result.value;
}

export function gitReader(get) {
  const trees = new Map();
  return async (path, revision) => {
    if (!trees.has(revision)) {
      trees.set(revision, (async () => {
        const commit = await read(get, `repos/${repository}/git/commits/${revision}`);
        if (commit.sha !== revision || !/^[a-f0-9]{40}$/.test(commit.tree?.sha ?? '')) throw new Error('GitHub returned another commit.');
        const tree = await read(get, `repos/${repository}/git/trees/${commit.tree.sha}?recursive=1`);
        if (tree.truncated !== false) throw new Error('Release validation requires a complete Git tree.');
        return new Map(tree.tree.map(entry => [entry.path, entry]));
      })());
    }
    const entry = (await trees.get(revision)).get(path);
    if (entry?.type !== 'blob' || entry.mode !== '100644') throw new Error(`${path} is not a regular file at ${revision}.`);
    const blob = await read(get, `repos/${repository}/git/blobs/${entry.sha}`);
    const bytes = Buffer.from(blob.content ?? '', 'base64');
    const digest = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (blob.encoding !== 'base64' || digest !== entry.sha) throw new Error(`${path} does not match its Git identity.`);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  };
}

/** Returns null for an ordinary PR, which keeps the full editorial declaration. */
export async function checkReleasePullRequest(get, number, { expectedHead = null, expectedBase = null, config }) {
  const pr = await read(get, `repos/${repository}/pulls/${number}`);
  if (!isReleasePullRequest(pr)) return null;
  if (pr.state !== 'open') throw new Error('Expected an open release PR.');
  if (expectedHead && pr.head.sha !== expectedHead) throw new Error('PR changed since this event; validate the new revision.');
  if (expectedBase && pr.base.sha !== expectedBase) throw new Error('PR base changed since this event; validate the new revision.');
  const files = [];
  for (let page = 1; files.length < pr.changed_files; page += 1) {
    const batch = await read(get, `repos/${repository}/pulls/${number}/files?per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) throw new Error('Cannot obtain the complete changed-file inventory.');
    files.push(...batch);
  }
  const { previous, version } = await validateReleaseCandidate({ pr, files, read: gitReader(get), config });
  return { number, head: pr.head.sha, previous, version, files: files.length };
}
