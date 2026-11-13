/**
 * The import PRs link one permanent product issue, because the editorial policy wants an open one.
 * This repository's CI cannot read the private product, so there the policy checks only the
 * declaration and reports the issue as unverified. The import job can read it: its product token has
 * `issues: read`. It checks the issue before publishing, so a closed issue stops the run instead of
 * opening a PR that links it.
 */
import { verifyIssue } from '../editorial/policy.mjs';
import { importIssue } from './pull-request.mjs';

export async function verifyImportIssue({ token, fetcher = fetch, number = importIssue }) {
  if (!token) throw new Error('A POS Platform token with issues: read is required to check the import issue.');
  const response = await fetcher(`https://api.github.com/repos/developer-implementos/pos-platform/issues/${number}`, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
    },
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
  // Never print response bodies or headers: they may echo the request.
  if (response.status !== 200) throw new Error(`GitHub GET of the import issue #${number} failed (HTTP ${response.status}).`);
  const issue = await response.json();
  try {
    return verifyIssue(issue, number);
  } catch (error) {
    throw new Error(`Import issue #${number}: ${error.message}`);
  }
}
