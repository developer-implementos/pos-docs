/** Offline consistency of the release configuration, version and published history. */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { breakingSection, compareVersions, loadReleaseConfig, splitChangelog, visibleSections } from './policy.mjs';

const heading = /^## (?:\[(\d+\.\d+\.\d+)\]\([^)]+\)|(\d+\.\d+\.\d+)) \((\d{4}-\d{2}-\d{2})\)$/;

export function checkRelease({ config, manifest, packageJson, changelog }) {
  const root = config.packages?.['.'];
  if (!root || Object.keys(config.packages).length !== 1) throw new Error('release-please must manage exactly the root package.');
  if (root['release-type'] !== 'node' || root['changelog-path'] !== 'CHANGELOG.md') throw new Error('The root package must use the node strategy and CHANGELOG.md.');
  if (!/^[a-f0-9]{40}$/.test(config['bootstrap-sha'] ?? '')) throw new Error('bootstrap-sha must pin the first commit of the history.');
  const sections = visibleSections(config);
  for (const type of ['feat', 'fix', 'docs']) {
    if (!root['changelog-sections'].some(section => section.type === type && !section.hidden)) throw new Error(`Commits of type ${type} must appear in the history.`);
  }
  if (Object.keys(manifest).join() !== '.' || manifest['.'] !== packageJson.version) {
    throw new Error(`The manifest (${JSON.stringify(manifest)}) and package.json (${packageJson.version}) must agree.`);
  }
  const { entries } = splitChangelog(changelog);
  const versions = [];
  const allowed = new Set([...sections, breakingSection]);
  for (const line of entries.split('\n')) {
    if (line.startsWith('## ')) {
      const match = heading.exec(line);
      if (!match) throw new Error(`Unexpected release heading: ${line}`);
      versions.push(match[1] ?? match[2]);
    } else if (line.startsWith('### ') && !allowed.has(line.slice(4))) throw new Error(`Unknown changelog section: ${line}`);
    else if (/^#{1,6} /.test(line) && !line.startsWith('### ')) throw new Error(`Unexpected heading inside the history: ${line}`);
  }
  if (versions[0] !== manifest['.']) throw new Error(`The latest CHANGELOG.md entry (${versions[0]}) must be the released version ${manifest['.']}.`);
  for (let index = 1; index < versions.length; index += 1) {
    if (compareVersions(versions[index - 1], versions[index]) <= 0) throw new Error(`Versions must be listed newest first: ${versions[index - 1]} before ${versions[index]}.`);
  }
  return { version: manifest['.'], releases: versions.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = new URL('../../', import.meta.url);
  const { config, manifest } = loadReleaseConfig(root);
  const result = checkRelease({
    config, manifest,
    packageJson: JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8')),
    changelog: fs.readFileSync(new URL('CHANGELOG.md', root), 'utf8'),
  });
  console.log(`Release history: version ${result.version}, ${result.releases} entries in CHANGELOG.md.`);
}
