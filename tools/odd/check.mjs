import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const maximumDocumentBytes = 256 * 1024;
const taskPath = /^odd\/tasks\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const githubTask =
  /^https:\/\/github\.com\/developer-implementos\/(pos-platform|pos-docs)\/blob\/([a-f0-9]{40})\/(odd\/tasks\/[a-z0-9]+(?:-[a-z0-9]+)*\.md)$/;
const taskLine =
  /^- \[( |x)\] (T[1-9][0-9]*) · (S[1-9][0-9]*(?:,S[1-9][0-9]*)*) · route:(inline|delegated) · (.+) · status:(pending|in_progress|blocked|done) · (evidence|commit): (\S.*)$/;

function boundedText(value, label) {
  assert.equal(typeof value, 'string', `${label} must be text`);
  assert.ok(Buffer.byteLength(value, 'utf8') <= maximumDocumentBytes, `${label} exceeds 256 KiB`);
  assert.ok(!value.includes('\0'), `${label} must not contain NUL`);
  return value.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

/** Preserve line positions while excluding examples, quotations and hidden instructions. */
function withoutComments(text) {
  return text.replace(/<!--[\s\S]*?(?:-->|$)/g, (comment) => comment.replace(/[^\n]/g, ''));
}

function visibleLines(text) {
  let fence;
  return withoutComments(text)
    .split('\n')
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (fence) {
        if (
          marker &&
          marker[1][0] === fence.character &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        )
          fence = undefined;
        return '';
      }
      if (marker) {
        fence = { character: marker[1][0], length: marker[1].length };
        return '';
      }
      return /^(?: {4}|\t| {0,3}>)/.test(line) ? '' : line;
    });
}

function unique(values, label) {
  assert.equal(new Set(values).size, values.length, `Duplicate ${label}`);
}

function parseDocument(source) {
  const text = boundedText(source, 'ODD document');
  const raw = text.split('\n');
  const visible = visibleLines(text);
  const sections = {};
  for (const name of ['Specs', 'Tasks', 'Log']) {
    const matches = visible.flatMap((line, index) => (line.trimEnd() === `## ${name}` ? [index] : []));
    assert.equal(matches.length, 1, `Exactly one visible ## ${name} section is required`);
    sections[name] = matches[0];
  }
  assert.ok(
    sections.Specs < sections.Tasks && sections.Tasks < sections.Log,
    'ODD sections must follow Specs, Tasks, Log order',
  );
  const specs = visible.slice(sections.Specs + 1, sections.Tasks).flatMap((line) => {
    const match = line.match(/^- (S[1-9][0-9]*)\. (\S.*)$/);
    assert.ok(!/^- S[0-9]/.test(line) || match, 'A specification must use - S#. followed by its description');
    return match ? [{ id: match[1], description: match[2] }] : [];
  });
  assert.ok(specs.length, 'ODD requires at least one specification');
  unique(
    specs.map((spec) => spec.id),
    'specification ID',
  );
  const specIds = new Set(specs.map((spec) => spec.id));
  const tasks = withoutComments(text)
    .split('\n')
    .slice(sections.Tasks + 1, sections.Log)
    .filter((line) => line.trim())
    .map((line) => {
      const match = line.match(taskLine);
      assert.ok(
        match,
        'Each task must be one line with T#, S#, route, description, status and evidence or commit',
      );
      assert.equal(
        [...line.matchAll(/ · (?:route|status|evidence|commit):/g)].length,
        3,
        'Task metadata must not repeat route, status or evidence fields',
      );
      const [, checked, id, references, route, description, status, evidenceKind, evidence] = match;
      const referencesList = references.split(',');
      unique(referencesList, `specification reference in ${id}`);
      assert.ok(
        referencesList.every((reference) => specIds.has(reference)),
        `${id} references an unknown specification`,
      );
      assert.equal(checked === 'x', status === 'done', `${id} checkbox and status disagree`);
      if (evidenceKind === 'commit')
        assert.match(evidence, /^[a-f0-9]{40}$/, `${id} commit must be a full immutable SHA`);
      return { id, specs: referencesList, route, description, status, [evidenceKind]: evidence };
    });
  assert.ok(tasks.length, 'ODD requires at least one task');
  unique(
    tasks.map((task) => task.id),
    'task ID',
  );
  const logLines = visible.slice(sections.Log + 1);
  const entries = logLines.flatMap((line, index) => {
    const match = line.match(/^- (L[1-9][0-9]*) · (\S.*)$/);
    assert.ok(!/^- L[0-9]/.test(line) || match, 'A log entry must use - L# · followed by its record');
    return match ? [{ id: match[1], line: sections.Log + 1 + index }] : [];
  });
  assert.ok(entries.length && entries[0].id === 'L1', 'The log must start with L1');
  unique(
    entries.map((entry) => entry.id),
    'log ID',
  );
  for (let index = 0; index < entries.length; index++)
    assert.equal(entries[index].id, `L${index + 1}`, 'Log IDs must preserve sequential append order');
  const original = raw
    .slice(entries[0].line + 1, entries[1]?.line ?? raw.length)
    .filter((line) => /^>\s*\S/.test(line));
  assert.ok(
    original.length,
    'L1 must preserve the original request in a block quotation; this validates presence, not its authorship',
  );
  const log = raw
    .slice(sections.Log + 1)
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
  return {
    specs,
    tasks,
    log,
    logEntries: entries.map((entry) => entry.id),
    originalRequest: original.map((line) => line.replace(/^> ?/, '')).join('\n'),
  };
}

/** Structural validation only. Does not certify implementation, review or human acceptance. */
export function validateDocument(text, { previous } = {}) {
  const current = parseDocument(text);
  if (previous !== undefined && previous !== null) {
    const prior = parseDocument(previous);
    assert.ok(
      current.log === prior.log || current.log.startsWith(`${prior.log}\n`),
      'ODD Log is append-only; preserve previous entries verbatim',
    );
    if (current.log !== prior.log) {
      const addition = current.log.slice(prior.log.length).trimStart();
      assert.ok(
        addition.startsWith(`- L${prior.logEntries.length + 1} · `),
        'Append a new sequential Log entry instead of extending a previous record',
      );
    }
  }
  return current;
}

export function parseReference(value) {
  assert.equal(typeof value, 'string', 'ODD task reference must be text');
  assert.ok(value === value.trim() && !/[\r\n\0]/.test(value), 'ODD task reference must occupy one line');
  if (taskPath.test(value)) return { kind: 'local', path: value };
  const match = value.match(githubTask);
  assert.ok(
    match,
    'ODD-Task must be odd/tasks/kebab.md or a company GitHub blob URL pinned to a full commit SHA',
  );
  return {
    kind: 'github',
    repository: `developer-implementos/${match[1]}`,
    revision: match[2],
    path: match[3],
    url: value,
  };
}

export function parseDeclaration(body) {
  const lines = visibleLines(boundedText(body, 'PR declaration'));
  const values = (name) =>
    lines.flatMap((line) => {
      const match = line.match(new RegExp(`^ {0,3}${name}:\\s*(.*)$`));
      return match ? [match[1].trim()] : [];
    });
  const tasks = values('ODD-Task');
  const reasons = values('ODD-Reason');
  assert.equal(tasks.length, 1, 'Exactly one visible ODD-Task field is required');
  assert.ok(tasks[0], 'ODD-Task must not be empty');
  assert.ok(reasons.length <= 1, 'At most one visible ODD-Reason field is allowed');
  if (tasks[0] === 'inline') {
    assert.equal(reasons.length, 1, 'Inline work requires a visible ODD-Reason');
    assert.ok(
      reasons[0].length >= 30 &&
        !/\b(?:TODO|TBD|FIXME)\b|\[(?:describir|completar|pendiente)\]/i.test(reasons[0]),
      'ODD-Reason must describe the small change concretely, without placeholders',
    );
    return { kind: 'inline', reason: reasons[0] };
  }
  return { kind: 'document', reference: parseReference(tasks[0]) };
}

/** Loaders return text from trusted storage; this module never fetches reference URLs. */
export async function validateDeclaration(body, { readDocument, readPreviousDocument } = {}) {
  const declaration = parseDeclaration(body);
  if (declaration.kind === 'inline') return declaration;
  const { reference } = declaration;
  assert.equal(typeof readDocument, 'function', 'An ODD task needs a trusted text loader');
  const document = await readDocument(reference);
  const previous = readPreviousDocument ? await readPreviousDocument(reference) : undefined;
  return { kind: 'document', reference, document: validateDocument(document, { previous }) };
}

async function safePath(root, relative, expected) {
  const base = path.resolve(root);
  const physical = await realpath(base);
  const comparable = (value) => (process.platform === 'win32' ? value.toLowerCase() : value);
  assert.equal(comparable(physical), comparable(base), 'ODD root must not traverse symlinks or junctions');
  const segments = relative.split('/');
  let current = base;
  for (const segment of ['', ...segments]) {
    if (segment) current = path.join(current, segment);
    const info = await lstat(current);
    assert.ok(!info.isSymbolicLink(), 'ODD local data must not traverse symlinks or junctions');
    if (current === path.join(base, ...segments) && expected === 'file')
      assert.ok(info.isFile(), 'ODD task must be a regular file');
    else assert.ok(info.isDirectory(), 'ODD data directory must be a regular directory');
  }
  return current;
}

export async function readLocalDocument(root, reference) {
  assert.equal(reference?.kind, 'local', 'The local loader does not fetch GitHub or network references');
  assert.match(reference.path, taskPath, 'Invalid local ODD task path');
  const target = await safePath(root, reference.path, 'file');
  const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const info = await handle.stat();
    assert.ok(
      info.isFile() && info.size <= maximumDocumentBytes,
      'ODD task must be a bounded regular text file',
    );
    return boundedText(await handle.readFile('utf8'), 'ODD document');
  } finally {
    await handle.close();
  }
}

export async function checkWorkspace(root) {
  const directory = await safePath(root, 'odd/tasks', 'directory');
  const entries = await readdir(directory, { withFileTypes: true });
  const checked = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    assert.ok(!entry.isSymbolicLink(), 'ODD task directory must not contain symlinks or junctions');
    if (!entry.name.endsWith('.md')) continue;
    const reference = parseReference(`odd/tasks/${entry.name}`);
    const document = validateDocument(await readLocalDocument(root, reference));
    checked.push({ path: reference.path, specs: document.specs.length, tasks: document.tasks.length });
  }
  assert.ok(checked.length, 'No ODD task documents found');
  return checked;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.deepEqual(process.argv.slice(2), ['--check'], 'Usage: node tools/odd/check.mjs --check');
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const checked = await checkWorkspace(root);
    process.stdout.write(
      `ODD: ${checked.length} task documents structurally validated; history comparison belongs to PR policy, not this local check.\n`,
    );
  } catch (error) {
    process.stderr.write(`ODD validation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
