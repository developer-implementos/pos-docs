/**
 * Imports the four product snapshots in dependency order. Each importer first compares facts in its
 * read-only mode, so a refreshed GitHub observation time alone never produces a change; only a
 * StaleSnapshotError triggers the real import. Later importers read the snapshots written before them.
 */
import { syncProjectFollowUp } from '../sync-project-follow-up.mjs';
import { syncProjectPlanning } from '../sync-project-planning.mjs';
import { syncProjectProgress } from '../sync-project-progress.mjs';
import { syncProjectQuestions } from '../sync-project-questions.mjs';
import { isStaleSnapshot } from './stale-snapshot.mjs';

/** Order matters: follow-up, planning and questions derive from the snapshots imported before them. */
export const snapshots = Object.freeze([
  Object.freeze({ name: 'progress', label: 'avance', path: 'portal/data/project-progress.json', journeys: ['/project/', '/project/work/', '/guide/implementation/progress/'], sync: syncProjectProgress }),
  Object.freeze({ name: 'followUp', label: 'seguimientos', path: 'portal/data/project-follow-up.json', journeys: ['/project/attention/'], sync: syncProjectFollowUp }),
  Object.freeze({ name: 'planning', label: 'planificación', path: 'portal/data/project-planning.json', journeys: ['/project/plan/'], sync: syncProjectPlanning }),
  Object.freeze({ name: 'questions', label: 'preguntas', path: 'portal/data/project-questions.json', journeys: ['/project/questions/'], sync: syncProjectQuestions }),
]);

/**
 * Returns the product revision and, per snapshot, whether it was imported. Throws on anything other
 * than staleness and when the importers disagree on the revision they read.
 */
export function importSnapshots({ root, workspace, importers = snapshots, options = {} }) {
  const results = [];
  for (const importer of importers) {
    const extra = options[importer.name] ?? {};
    let result;
    try {
      result = importer.sync({ root, workspace, check: true, ...extra });
      results.push({ ...importer, imported: false, revision: result.revision });
      continue;
    } catch (error) {
      if (!isStaleSnapshot(error)) throw error;
    }
    result = importer.sync({ root, workspace, check: false, ...extra });
    results.push({ ...importer, imported: true, revision: result.revision });
  }
  const revisions = new Set(results.map(result => result.revision));
  if (revisions.size !== 1) throw new Error('The importers read different product revisions; retry from one clean checkout.');
  const [revision] = revisions;
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('The product revision must be a full commit SHA.');
  return { revision, results, imported: results.filter(result => result.imported) };
}
