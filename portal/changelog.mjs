import fs from 'node:fs';
import path from 'node:path';
import {escapeHtml as escape} from './site-shell.mjs';

// CHANGELOG.md is written by release-please (tools/release/README.md). The portal shows the newest
// release; the full history stays at /guide/changelog/.
const heading = /^## (?:\[(\d+\.\d+\.\d+)\]\((https:\/\/[^)\s]+)\)|(\d+\.\d+\.\d+)) \((\d{4}-\d{2}-\d{2})\)$/;
const entry = /^\* (?:\*\*([^*]+):\*\* )?(.+?)(?: \(\[#(\d+)\]\((https:\/\/[^)\s]+)\)\))?(?: \(\[([0-9a-f]{7,40})\]\(https:\/\/[^)\s]+\)\))?$/;

/** Releases newest first, each with its sections and entries as release-please wrote them. */
export function parseChangelog(text) {
  const releases = [];
  let release = null;
  let section = null;
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const version = heading.exec(line);
    if (version) {
      release = {version: version[1] ?? version[3], compare: version[2] ?? null, date: version[4], sections: []};
      releases.push(release);
      section = null;
    } else if (release && line.startsWith('### ')) {
      section = {title: line.slice(4).trim(), entries: []};
      release.sections.push(section);
    } else if (release && section && line.startsWith('*')) {
      const match = entry.exec(line);
      if (!match) throw new Error(`Unreadable changelog line: ${line}`);
      section.entries.push({scope: match[1] ?? null, text: match[2], pr: match[3] ? Number(match[3]) : null, prUrl: match[4] ?? null, commit: match[5] ?? null});
    }
  }
  if (!releases.length) throw new Error('CHANGELOG.md has no release heading.');
  return releases;
}

export function loadChangelog(root) {
  return parseChangelog(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'));
}

/** Escapes the entry and renders only code spans and https links, the inline syntax entries use. */
export function renderInline(text) {
  return escape(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

/** The newest release in a form the portal pages render. */
export function latestRelease(releases, limit = 5) {
  const [release] = releases;
  const entries = release.sections.flatMap(section => section.entries.map(item => ({...item, section: section.title})));
  return {version: release.version, date: release.date, total: entries.length, entries: entries.slice(0, limit)};
}
