import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { filesAfterChanges, validatePullRequest } from './policy.mjs';
import { checkLinkedIssue, githubClient, loadPullRequest } from './github.mjs';

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
let revision = 'local body; remote PR revision not inspected';
if (options['--body-file']) {
  body = fs.readFileSync(path.resolve(options['--body-file']), 'utf8');
} else {
  let number = Number(options['--pr']);
  let expectedHead = null;
  if (options['--event-file']) {
    const event = JSON.parse(fs.readFileSync(options['--event-file'], 'utf8'));
    if (event.repository?.full_name !== 'developer-implementos/pos-docs' || event.pull_request?.base?.ref !== 'main') {
      throw new Error('Unexpected repository or PR base in event.');
    }
    number = event.number;
    expectedHead = event.pull_request.head?.sha;
    if (!/^[a-f\d]{40}$/.test(expectedHead || '')) throw new Error('Missing immutable PR head in event.');
  }
  const pr = await loadPullRequest(get, number, expectedHead);
  body = pr.body;
  files = filesAfterChanges(files, pr.files);
  revision = pr.head;
}
const declaration = validatePullRequest({ body, knownFiles: files });
const issue = options['--github']
  ? await checkLinkedIssue(get, declaration.issueNumber, { required: options['--require-issue'] === true })
  : { status: 'unverified', reason: 'Offline check: issue identity and open state were not queried.' };
const summary = [
  'Editorial declaration: valid.',
  `PR revision: ${revision}.`,
  `Product issue: ${declaration.issueUrl}; ${issue.status}.`,
  ...(issue.reason ? [issue.reason] : []),
  'This validates declared metadata and available issue evidence. It does not approve the content, attest human review or accept a product deliverable.',
];
console.log(summary.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.map(line => `- ${line}`).join('\n') + '\n');
if (issue.status === 'unverified' && process.env.GITHUB_ACTIONS === 'true') {
  console.log('::warning::Product issue identity/state not verified. A reviewer with product access must check it; this result validates the editorial declaration only.');
}
