/**
 * Changelog entries for the project snapshots in portal/data/. A PR that imports progress, follow-ups
 * or planning lists what changed for the team, one entry per change, instead of its title alone
 * (TASK-253, odd/tasks/release-history.md S8). The editorial policy recomputes them from the base
 * and head revisions and requires each one in the PR's changelog block.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { actionKinds, executionLabel, technicalStatuses } from '../../portal/project.mjs';
import { validateChangelogOverride } from './policy.mjs';

export const snapshotPaths = {
  followUp: 'portal/data/project-follow-up.json',
  progress: 'portal/data/project-progress.json',
  planning: 'portal/data/project-planning.json',
};
const followUpTexts = { summary: 'resumen', impact: 'impacto', nextAction: 'próxima acción', closureCriteria: 'criterio de cierre' };
const planningTexts = { title: 'título', outcome: 'resultado esperado' };
const maxLength = 200;

/** One line, no markup that the changelog rejects, short enough to read in a list. */
function clean(text) {
  return String(text ?? '').replace(/\s+/g, ' ').replace(/</g, '‹').trim().replace(/\.$/, '');
}
function entry(scope, text) {
  const line = `docs(${scope}): ${clean(text)}`;
  return line.length <= maxLength ? line : `${line.slice(0, maxLength - 1).trimEnd()}…`;
}
/** Summaries and resolutions run to several sentences; the first one says what changed. */
const firstSentence = text => String(text ?? '').split(/(?<=\.)\s+(?=\p{Lu})/u)[0];
const byKey = (list, key) => new Map((list ?? []).map(item => [item[key], item]));
const changedFields = (before, after, labels) => Object.keys(labels).filter(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
const execution = item => executionLabel({ state: item.state, executionLabels: item.executionLabels ?? [] });

function followUpChanges(before, after) {
  const entries = [];
  const previous = byKey(before?.content.items, 'id');
  const current = byKey(after?.content.items, 'id');
  for (const [id, item] of current) {
    const old = previous.get(id);
    if (!old) entries.push(entry('follow-up', `${id} nuevo · ${actionKinds[item.kind] ?? item.kind}: ${firstSentence(item.summary)}`));
    else if (old.state !== item.state) {
      entries.push(entry('follow-up', item.state === 'resolved' ? `${id} resuelto: ${firstSentence(item.resolution?.summary ?? item.summary)}` : `${id} reabierto: ${firstSentence(item.summary)}`));
    } else {
      const fields = changedFields(old, item, followUpTexts);
      if (fields.length) entries.push(entry('follow-up', `${id} actualizado (${fields.map(field => followUpTexts[field]).join(', ')}): ${firstSentence(item.summary)}`));
    }
  }
  for (const [id, item] of previous) if (!current.has(id)) entries.push(entry('follow-up', `${id} retirado del registro: ${firstSentence(item.summary)}`));
  return entries;
}

function progressChanges(before, after) {
  const entries = [];
  const previous = byKey(before.progress?.content.workPackages, 'id');
  const current = byKey(after.progress?.content.workPackages, 'id');
  const oldIssues = byKey(before.followUp?.issues.entries, 'code');
  const newIssues = byKey(after.followUp?.issues.entries, 'code');
  const issueChange = code => {
    const old = oldIssues.get(code);
    const item = newIssues.get(code);
    if (!item) return [];
    if (!old) return [entry('progress', `${code} entra al flujo en GitHub · ${execution(item)}`)];
    return execution(old) !== execution(item) ? [entry('progress', `${code} en GitHub pasa de ${execution(old)} a ${execution(item)}`)] : [];
  };
  for (const [id, work] of current) {
    const old = previous.get(id);
    if (!old) {
      entries.push(entry('progress', `${id} nuevo entregable · ${technicalStatuses[work.status] ?? work.status}: ${firstSentence(work.summary)}`));
      continue;
    }
    if (old.status !== work.status) entries.push(entry('progress', `${id} pasa de ${technicalStatuses[old.status] ?? old.status} a ${technicalStatuses[work.status] ?? work.status}`));
    else if (old.summary !== work.summary) entries.push(entry('progress', `${id} actualizado (resumen): ${firstSentence(work.summary)}`));
    entries.push(...issueChange(id));
    if (!old.acceptance && work.acceptance) entries.push(entry('progress', `${id} aceptado por el equipo`));
    if (old.acceptance && !work.acceptance) entries.push(entry('progress', `${id} ya no tiene aceptación registrada`));
  }
  for (const id of previous.keys()) if (!current.has(id)) entries.push(entry('progress', `${id} retirado del alcance`));
  for (const code of newIssues.keys()) if (!current.has(code) && !previous.has(code)) entries.push(...issueChange(code));
  return entries;
}

function planningChanges(before, after) {
  const entries = [];
  const label = item => `${item.title} (${item.parentDelivery})`;
  const oldIncrement = before?.content.increment;
  const increment = after?.content.increment;
  if (increment && (!oldIncrement || oldIncrement.id !== increment.id || oldIncrement.title !== increment.title)) {
    entries.push(entry('planning', `nuevo incremento: ${increment.title}`));
  }
  const previous = byKey(before?.content.items, 'key');
  const current = byKey(after?.content.items, 'key');
  const oldIssues = byKey(before?.issues.entries, 'code');
  const newIssues = byKey(after?.issues.entries, 'code');
  for (const [key, item] of current) {
    const old = previous.get(key);
    if (!old) {
      entries.push(entry('planning', `${label(item)} entra al próximo incremento`));
      continue;
    }
    const fields = changedFields(old, item, planningTexts);
    if (fields.length) entries.push(entry('planning', `${label(item)} actualizado (${fields.map(field => planningTexts[field]).join(', ')})`));
    const oldIssue = oldIssues.get(key);
    const issue = newIssues.get(key);
    if (issue && !oldIssue) entries.push(entry('planning', `${label(item)} entra al flujo en GitHub · ${execution(issue)}`));
    else if (issue && execution(oldIssue) !== execution(issue)) entries.push(entry('planning', `${label(item)} en GitHub pasa de ${execution(oldIssue)} a ${execution(issue)}`));
  }
  for (const [key, item] of previous) if (!current.has(key)) entries.push(entry('planning', `${label(item)} sale del próximo incremento`));
  return entries;
}

/** Entries for everything that changed between two sets of parsed snapshots ({followUp, progress, planning}). */
export function snapshotChanges(before, after) {
  return [...followUpChanges(before.followUp, after.followUp), ...progressChanges(before, after), ...planningChanges(before.planning, after.planning)];
}

export function changesBlock(entries) {
  return entries.length ? `BEGIN_COMMIT_OVERRIDE\n${entries.join('\n\n')}\nEND_COMMIT_OVERRIDE` : '';
}

/**
 * Entries a PR must carry. `files` is the PR's changed-file inventory; `read(path, revision)` returns
 * the file at an immutable revision. Unchanged snapshots are read once, at head, for context only.
 */
export async function requiredSnapshotEntries({ files, read, base, head }) {
  const changed = new Map(files.map(file => [file.filename, file.status]));
  if (!Object.values(snapshotPaths).some(path => changed.has(path))) return [];
  const before = {};
  const after = {};
  for (const [name, path] of Object.entries(snapshotPaths)) {
    const status = changed.get(path);
    after[name] = status === 'removed' ? null : JSON.parse(await read(path, head));
    before[name] = !status ? after[name] : status === 'added' ? null : JSON.parse(await read(path, base));
  }
  return snapshotChanges(before, after);
}

/** Required entries that the PR body does not carry in its changelog block. */
export function missingSnapshotEntries(body, required) {
  const present = new Set(validateChangelogOverride(body).entries);
  return required.filter(item => !present.has(item));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const option = name => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
  const base = option('--base') ?? 'origin/main';
  const head = option('--head');
  const show = (path, revision) => {
    try {
      return execFileSync('git', ['show', `${revision}:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return null;
    }
  };
  const load = revision => Object.fromEntries(Object.entries(snapshotPaths).map(([name, path]) => {
    const text = revision ? show(path, revision) : (fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : null);
    return [name, text === null ? null : JSON.parse(text)];
  }));
  const entries = snapshotChanges(load(base), load(head));
  if (!entries.length) {
    console.log(`Sin cambios de avance, seguimientos ni planificación respecto de ${base}.`);
  } else {
    console.log(`${entries.length} entradas respecto de ${base}. Pegar el bloque en el cuerpo de la PR y agregar ahí la entrada de cualquier otro cambio, porque el bloque reemplaza al título en el historial:\n`);
    console.log(changesBlock(entries));
  }
}
