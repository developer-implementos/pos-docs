/**
 * Editorial PR check for dependency PRs. Like the release path, it uses the read-only editorial
 * client and reads every file through immutable commits, trees and blobs.
 */
import { repository } from '../release/policy.mjs';
import { gitReader } from '../release/pr.mjs';
import { isDependencyPullRequest, validateDependencyContents } from './policy.mjs';

async function read(get, path) {
  const result = await get(path);
  if (result.status !== 200) throw new Error(`Cannot read dependency PR metadata (HTTP ${result.status}).`);
  return result.value;
}

/** Returns null for any PR that is not a dependency PR, which keeps the full editorial declaration. */
export async function checkDependencyPullRequest(get, number, { expectedHead = null, expectedBase = null } = {}) {
  const pr = await read(get, `repos/${repository}/pulls/${number}`);
  if (!isDependencyPullRequest(pr)) return null;
  if (pr.state !== 'open') throw new Error('Expected an open dependency PR.');
  if (expectedHead && pr.head.sha !== expectedHead) throw new Error('PR changed since this event; validate the new revision.');
  if (expectedBase && pr.base.sha !== expectedBase) throw new Error('PR base changed since this event; validate the new revision.');
  const files = [];
  for (let page = 1; files.length < pr.changed_files; page += 1) {
    const batch = await read(get, `repos/${repository}/pulls/${number}/files?per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) throw new Error('Cannot obtain the complete changed-file inventory.');
    files.push(...batch);
  }
  await validateDependencyContents({ files, read: gitReader(get), base: pr.base.sha, head: pr.head.sha });
  return { number, head: pr.head.sha, files: files.map(file => file.filename), body: pr.body ?? '' };
}
