import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { filesAfterChanges, validatePullRequest } from './policy.mjs';
import { assertPullRequestUnchanged, checkLinkedIssue, githubClient, githubOddReader, loadPullRequest } from './github.mjs';
import { readLocalDocument, validateDeclaration } from '../odd/check.mjs';
import { loadReleaseConfig, validateChangelogOverride } from '../release/policy.mjs';
import { checkReleasePullRequest, gitReader } from '../release/pr.mjs';
import { missingSnapshotEntries, requiredSnapshotEntries } from '../release/snapshot-changes.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (['--github', '--require-issue'].includes(argument)) {
    if (options[argument]) throw new Error(`Duplicate option ${argument}.`);
    options[argument] = true;
  } else if (['--body-file', '--event-file', '--pr'].includes(argument)) {
    if (options[argument] || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing or duplicate value for ${argument}.`);
    options[argument] = args[++index];
  } else throw new Error('Usage: pr-check.mjs --body-file <markdown> | --event-file <json> --github | --pr <number> --github [--require-issue]');
}
const modes = ['--body-file', '--event-file', '--pr'].filter(option => options[option]);
if (modes.length !== 1 || (options['--require-issue'] && !options['--github']) || (!options['--body-file'] && !options['--github'])) {
  throw new Error('Select exactly one input; GitHub metadata inputs and --require-issue require --github.');
}
let files = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean));
const get = githubClient({ token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN });
let body;
let snapshot;
let release = null;
let pullRequest = null;
let revision = 'local body; remote PR revision not inspected';
if (options['--body-file']) {
  body = fs.readFileSync(path.resolve(options['--body-file']), 'utf8');
} else {
  let number = Number(options['--pr']);
  let expectedHead = null;
  let expectedBase = null;
  if (options['--event-file']) {
    const event = JSON.parse(fs.readFileSync(options['--event-file'], 'utf8'));
    if (event.repository?.full_name !== 'developer-implementos/pos-docs' || event.pull_request?.base?.ref !== 'main') {
      throw new Error('Unexpected repository or PR base in event.');
    }
    number = event.number;
    expectedHead = event.pull_request.head?.sha;
    expectedBase = event.pull_request.base?.sha;
    if (!/^[a-f\d]{40}$/.test(expectedHead || '') || !/^[a-f\d]{40}$/.test(expectedBase || '')) throw new Error('Missing immutable PR head or base in event.');
  }
  // A release PR carries no editorial declaration: its identity and file scope are checked instead.
  release = await checkReleasePullRequest(get, number, { expectedHead, expectedBase, config: loadReleaseConfig().config });
  if (!release) {
    const pr = await loadPullRequest(get, number, expectedHead, expectedBase);
    pullRequest = pr;
    body = pr.body;
    files = filesAfterChanges(files, pr.files);
    revision = pr.head;
    snapshot = pr.snapshot;
  }
}
if (release) {
  const summary = [
    `Release PR #${release.number}: identity and scope valid.`,
    `PR revision: ${release.head}.`,
    `Version ${release.previous} -> ${release.version}; ${release.files} files, limited to CHANGELOG.md, the manifest and the package.json version.`,
    'This validates what release-please wrote. The merge waits for Documentation quality on this exact revision.',
  ];
  console.log(summary.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.map(line => `- ${line}`).join('\n') + '\n');
  process.exit(0);
}
const declaration = validatePullRequest({ body, knownFiles: files });
const changelog = validateChangelogOverride(body);
// A PR that imports project snapshots lists each change in its changelog block (tools/release/README.md).
const snapshotEntries = pullRequest
  ? await requiredSnapshotEntries({ files: pullRequest.files, read: gitReader(get), base: pullRequest.base, head: pullRequest.head })
  : null;
const missingEntries = snapshotEntries ? missingSnapshotEntries(body, snapshotEntries) : [];
if (missingEntries.length) {
  throw new Error(`This PR changes the project snapshots, so its changelog block must list each change. Run \`npm run release:entries\` and paste the block into the PR body. Missing entries:\n${missingEntries.join('\n')}`);
}
if (options['--body-file']) {
  const source = githubOddReader(get);
  await validateDeclaration(body, { readDocument: reference => {
    if (reference.kind === 'local') return readLocalDocument(root, reference);
    if (!options['--github']) throw new Error('Pinned cross-repository ODD documents require --github for verified source access.');
    return source.document(reference.repository, reference.revision, reference.path);
  } });
}
const issue = options['--github']
  ? await checkLinkedIssue(get, declaration.issueNumber, { required: options['--require-issue'] === true })
  : { status: 'unverified', reason: 'Offline check: issue identity and open state were not queried.' };
if (snapshot) await assertPullRequestUnchanged(get, snapshot);
const summary = [
  'Editorial declaration: valid.',
  `PR revision: ${revision}.`,
  `Product issue: ${declaration.issueUrl}; ${issue.status}.`,
  snapshot ? 'ODD: declared source and changed task histories validated against immutable head/base revisions.' : 'ODD: declaration and current document validated; prior Log history requires a remote PR check.',
  changelog.entries.length ? `Changelog: ${changelog.entries.length} entries replace the PR title in the next release.` : 'Changelog: the PR title becomes the release entry.',
  snapshotEntries === null ? 'Project snapshots: generated entries are compared only against a remote PR.' : snapshotEntries.length ? `Project snapshots: the ${snapshotEntries.length} generated entries are in the changelog block.` : 'Project snapshots: unchanged.',
  ...(issue.reason ? [issue.reason] : []),
  'This validates declared metadata and available issue evidence. It does not approve the content, attest human review or accept a product deliverable.',
];
console.log(summary.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.map(line => `- ${line}`).join('\n') + '\n');
if (issue.status === 'unverified' && process.env.GITHUB_ACTIONS === 'true') {
  console.log('::warning::Product issue identity/state not verified. A reviewer with product access must check it; this result validates the editorial declaration only.');
}
