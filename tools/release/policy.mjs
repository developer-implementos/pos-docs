/**
 * Release policy for POS Docs. Pure functions shared by the merge job and the editorial PR check;
 * every caller supplies its own GitHub reader, so the same rules apply online and in tests.
 */
import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

export const repository = 'developer-implementos/pos-docs';
export const releaseBranch = 'release-please--branches--main';
export const pendingLabel = 'autorelease: pending';
/** GitHub App that opens and merges the release PR. It is the only bot in the review bypass. */
export const releaseApp = { id: 0, slug: 'implementos-pos-docs-release' };
export const releaseBot = `${releaseApp.slug}[bot]`;
/** A release PR may only touch these files, and only modify them. */
export const releaseFiles = ['.release-please-manifest.json', 'CHANGELOG.md', 'package.json'];
export const breakingSection = '⚠ BREAKING CHANGES';
const conventionalTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const versionHeader = /\n###? v?[0-9[]/;

export function loadReleaseConfig(root = new URL('../../', import.meta.url)) {
  const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
  return { config: read('release-please-config.json'), manifest: read('.release-please-manifest.json') };
}

export function visibleSections(config) {
  return config.packages['.']['changelog-sections'].filter(section => !section.hidden).map(section => section.section);
}

export function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(value));
  if (!match) throw new Error(`Not a release version: ${value}`);
  return match.slice(1).map(Number);
}

export function compareVersions(left, right) {
  const [a, b] = [parseVersion(left), parseVersion(right)];
  for (let index = 0; index < 3; index += 1) if (a[index] !== b[index]) return a[index] - b[index];
  return 0;
}

/** Identity alone decides whether a PR takes the release path; anything else is an editorial PR. */
export function isReleasePullRequest(pr) {
  return pr?.user?.login === releaseBot && pr.user.type === 'Bot' && pr.head?.ref === releaseBranch &&
    pr.head?.repo?.full_name === repository && pr.base?.ref === 'main' && pr.base?.repo?.full_name === repository;
}

export function validateReleaseFiles(files) {
  const names = files.map(file => file.filename);
  const unexpected = names.filter(name => !releaseFiles.includes(name));
  if (unexpected.length) throw new Error(`A release PR may only change ${releaseFiles.join(', ')}; found ${unexpected.join(', ')}.`);
  const reshaped = files.filter(file => file.status !== 'modified');
  if (reshaped.length) throw new Error(`A release PR may only modify existing files; ${reshaped.map(file => `${file.filename} is ${file.status}`).join(', ')}.`);
  if (!names.includes('CHANGELOG.md') || !names.includes('.release-please-manifest.json')) {
    throw new Error('A release PR must update CHANGELOG.md and .release-please-manifest.json.');
  }
}

/** Split a changelog into the authored introduction and the generated version entries. */
export function splitChangelog(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const index = normalized.search(versionHeader);
  if (index < 0) throw new Error('CHANGELOG.md must keep at least one version heading after its introduction.');
  return { intro: normalized.slice(0, index), entries: normalized.slice(index) };
}

export function validateChangelogEntry(entry, { version, previous, sections }) {
  const lines = entry.trim().split('\n');
  const header = /^## (?:\[(\d+\.\d+\.\d+)\]\(https:\/\/github\.com\/developer-implementos\/pos-docs\/compare\/v(\d+\.\d+\.\d+)\.\.\.v(\d+\.\d+\.\d+)\)|(\d+\.\d+\.\d+)) \((\d{4}-\d{2}-\d{2})\)$/.exec(lines[0]);
  if (!header) throw new Error(`Unexpected release heading: ${lines[0]}`);
  const [, linked, from, to, plain] = header;
  if ((linked ?? plain) !== version || (linked && (to !== version || from !== previous))) {
    throw new Error(`Release heading does not describe ${previous} -> ${version}: ${lines[0]}`);
  }
  const allowed = new Set([...sections, breakingSection]);
  let bullets = 0;
  for (const line of lines.slice(1)) {
    if (line === '') continue;
    const section = /^### (.+)$/.exec(line);
    if (section) {
      if (!allowed.has(section[1])) throw new Error(`Unknown changelog section: ${section[1]}`);
      continue;
    }
    if (!/^\* \S/.test(line)) throw new Error(`Unexpected changelog line: ${line}`);
    // Entries come from PR titles and bodies; the page renders Markdown, so reject raw HTML.
    if (/<[A-Za-z/!?]/.test(line)) throw new Error(`Changelog entries must not contain HTML: ${line}`);
    bullets += 1;
  }
  if (!bullets) throw new Error('A release must list at least one change.');
}

/**
 * Validate what release-please wrote, comparing the PR head with its base.
 * `read(path, revision)` returns the file text at an immutable revision.
 */
export async function validateReleaseContents({ base, head, read, config }) {
  const [basePackage, headPackage] = await Promise.all([read('package.json', base), read('package.json', head)]).then(texts => texts.map(text => JSON.parse(text)));
  const [baseManifest, headManifest] = await Promise.all([read('.release-please-manifest.json', base), read('.release-please-manifest.json', head)]).then(texts => texts.map(text => JSON.parse(text)));
  const version = headPackage.version;
  const previous = basePackage.version;
  if (compareVersions(version, previous) <= 0) throw new Error(`The release version must increase: ${previous} -> ${version}.`);
  if (!isDeepStrictEqual({ ...headPackage, version: previous }, basePackage)) throw new Error('A release PR may only change the version in package.json.');
  if (!isDeepStrictEqual(baseManifest, { '.': previous }) || !isDeepStrictEqual(headManifest, { '.': version })) {
    throw new Error(`The manifest must move from ${previous} to ${version} and keep only the root package.`);
  }
  const before = splitChangelog(await read('CHANGELOG.md', base));
  const after = (await read('CHANGELOG.md', head)).replace(/\r\n/g, '\n');
  if (!after.startsWith(before.intro.trimEnd())) throw new Error('The release changed the CHANGELOG.md introduction.');
  if (!after.trimEnd().endsWith(before.entries.trim())) throw new Error('The release rewrote previous CHANGELOG.md entries.');
  const entry = after.slice(before.intro.trimEnd().length, after.trimEnd().length - before.entries.trim().length);
  validateChangelogEntry(entry, { version, previous, sections: visibleSections(config) });
  return { previous, version };
}

export async function validateReleaseCandidate({ pr, files, read, config }) {
  if (!isReleasePullRequest(pr)) throw new Error(`Only ${releaseBot} may open a release PR from ${releaseBranch}.`);
  validateReleaseFiles(files);
  return validateReleaseContents({ base: pr.base.sha, head: pr.head.sha, read, config });
}

/**
 * release-please replaces a PR's changelog entry with the text between these markers, wherever they
 * appear in the body, HTML comments included. A malformed block would publish the wrong history.
 */
export function validateChangelogOverride(body) {
  const text = String(body ?? '').replace(/\r\n/g, '\n');
  const begins = text.split('BEGIN_COMMIT_OVERRIDE').length - 1;
  const ends = text.split('END_COMMIT_OVERRIDE').length - 1;
  if (!begins && !ends) return { entries: [] };
  if (begins !== 1 || ends !== 1 || text.indexOf('END_COMMIT_OVERRIDE') < text.indexOf('BEGIN_COMMIT_OVERRIDE')) {
    throw new Error('Use exactly one BEGIN_COMMIT_OVERRIDE ... END_COMMIT_OVERRIDE block, in that order.');
  }
  const block = text.split('BEGIN_COMMIT_OVERRIDE')[1].split('END_COMMIT_OVERRIDE')[0].trim();
  if (!block) throw new Error('The changelog block is empty; remove the markers to use the PR title.');
  const entry = new RegExp(`^(?:${conventionalTypes.join('|')})(?:\\([a-z0-9-]+\\))?: \\S[^\\n]*$`);
  const entries = block.split(/\n\s*\n/).map(paragraph => paragraph.trim());
  for (const paragraph of entries) {
    if (!entry.test(paragraph)) {
      throw new Error(`Each changelog entry is one line "type(scope): text", separated by a blank line, without "!": ${paragraph.split('\n')[0]}`);
    }
    if (/<[A-Za-z/!?]/.test(paragraph)) throw new Error(`Changelog entries must not contain HTML: ${paragraph}`);
  }
  return { entries };
}
