/**
 * Fail when a merged release PR is still waiting for its tag. release-please aborts every later run
 * in that state while its workflow stays green; devops-platform stopped releasing that way.
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { pullRequestLabels, releaseClient, untaggedMergedReleases } from './github.mjs';
import { pendingLabel } from './policy.mjs';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * The label search lags the label swap that release-please makes seconds before this step (run
 * 42697341007 listed a release it had just tagged). Each listed PR is confirmed through its own
 * record, re-read up to `attempts` times, and only one still pending after that fails the run.
 */
export async function verifyTagged({ request, startedAt, attempts = 3, pause = wait }) {
  let pending = (await untaggedMergedReleases(request)).filter(issue => Date.parse(issue.pull_request.merged_at) < Date.parse(startedAt));
  for (let attempt = 1; pending.length && attempt <= attempts; attempt++) {
    if (attempt > 1) await pause(10_000);
    const labels = await Promise.all(pending.map(issue => pullRequestLabels(request, issue.number)));
    pending = pending.filter((issue, index) => labels[index].includes(pendingLabel));
  }
  if (pending.length) {
    throw new Error(`Merged release PRs still labelled "${pendingLabel}": ${pending.map(issue => `#${issue.number} (${issue.html_url})`).join(', ')}. ` +
      'release-please will not open another release until each one is tagged. See tools/release/README.md#recuperar-un-release-sin-tag.');
  }
  return { message: 'Todos los PR de release integrados tienen su tag.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const startedAt = process.argv[process.argv.indexOf('--started-at') + 1];
  if (!process.argv.includes('--started-at') || Number.isNaN(Date.parse(startedAt))) throw new Error('Usage: verify.mjs --started-at <ISO-8601>');
  const result = await verifyTagged({ request: releaseClient({ token: process.env.GH_TOKEN }), startedAt });
  console.log(result.message);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${result.message}\n`);
}
