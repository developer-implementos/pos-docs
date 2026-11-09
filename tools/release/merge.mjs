/**
 * Merge the open release PR once its exact head passed Documentation quality.
 * Runs from the trusted default branch with the release App token; it never checks out the PR.
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { contentsReader, getJson, latestQualityRun, openReleasePullRequests, prefix, pullRequestFiles, releaseClient } from './github.mjs';
import { loadReleaseConfig, pendingLabel, validateReleaseCandidate } from './policy.mjs';

export async function mergeRelease({ request, config, expectedHead = null, log = console.log }) {
  const open = await openReleasePullRequests(request);
  if (open.length === 0) return { outcome: 'none', message: 'No hay PR de release abierto.' };
  if (open.length > 1) throw new Error(`Expected one release PR, found ${open.map(pr => `#${pr.number}`).join(', ')}.`);
  const pr = await getJson(request, `${prefix}pulls/${open[0].number}`);
  if (pr.state !== 'open' || pr.draft) return { outcome: 'skipped', message: `El PR #${pr.number} no está abierto para integrar.` };
  if (expectedHead && pr.head.sha !== expectedHead) {
    return { outcome: 'stale', message: `El PR #${pr.number} avanzó a ${pr.head.sha.slice(0, 12)}; se integrará cuando esa revisión pase la verificación.` };
  }
  if (!pr.labels?.some(label => label.name === pendingLabel)) throw new Error(`PR #${pr.number} lacks the ${pendingLabel} label release-please uses to tag it.`);
  const files = await pullRequestFiles(request, pr);
  const { previous, version } = await validateReleaseCandidate({ pr, files, read: contentsReader(request), config });
  const run = await latestQualityRun(request, pr.head.sha);
  if (!run || run.status !== 'completed') {
    return { outcome: 'waiting', message: `Documentation quality aún no termina sobre ${pr.head.sha.slice(0, 12)}.` };
  }
  if (run.conclusion !== 'success') {
    throw new Error(`Documentation quality concluded ${run.conclusion} on the release PR #${pr.number}: ${run.html_url}`);
  }
  const latest = await getJson(request, `${prefix}pulls/${pr.number}`);
  if (latest.state !== 'open' || latest.head.sha !== pr.head.sha) {
    return { outcome: 'stale', message: `El PR #${pr.number} cambió durante la validación; se reintentará con la nueva revisión.` };
  }
  log(`PR #${pr.number}: ${previous} -> ${version}, ${files.length} archivos, verificación ${run.html_url}.`);
  // The head SHA pins the merge to the validated revision; GitHub rejects it if the branch moved.
  const merged = await request('PUT', `${prefix}pulls/${pr.number}/merge`, { merge_method: 'squash', sha: pr.head.sha });
  if (merged.status !== 200 || merged.value?.merged !== true) throw new Error(`GitHub refused to merge release PR #${pr.number} (HTTP ${merged.status}).`);
  return { outcome: 'merged', message: `Integrado el PR #${pr.number} (${version}) en ${merged.value.sha}.`, version, sha: merged.value.sha };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const index = args.indexOf('--head-sha');
  const expectedHead = index >= 0 ? args[index + 1] : null;
  if (expectedHead !== null && !/^[a-f0-9]{40}$/.test(expectedHead)) throw new Error('--head-sha requires a 40-character commit SHA.');
  const request = releaseClient({ token: process.env.GH_TOKEN });
  const result = await mergeRelease({ request, config: loadReleaseConfig().config, expectedHead });
  console.log(result.message);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${result.message}\n`);
}
