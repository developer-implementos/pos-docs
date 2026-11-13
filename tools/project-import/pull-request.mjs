/**
 * Title and body of the automated import PR. The body satisfies the same editorial policy as a
 * hand-written import (tools/editorial/policy.mjs) and carries the changelog entries that the policy
 * recomputes from the PR's base and head. It is deterministic: the same facts render the same text,
 * so a re-run does not rewrite an open PR. Run-specific links live in the job summary, not here.
 */
import { changesBlock } from '../release/snapshot-changes.mjs';

export const importIssue = 283;
export const importBranch = 'automation/project-import';
const issueUrl = `https://github.com/developer-implementos/pos-platform/issues/${importIssue}`;
const commitUrl = revision => `https://github.com/developer-implementos/pos-platform/commit/${revision}`;
const maxTitle = 100;

function list(items) {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}

/** Names the imported snapshots when they fit the subject limit; otherwise names the source alone. */
export function importTitle(revision, imported) {
  const prefix = `docs(project): [TASK-${importIssue}] importar el corte ${revision.slice(0, 7)} de `;
  const detailed = `${prefix}${list(imported.map(item => item.label))}`;
  if (detailed.length <= maxTitle) return detailed;
  const general = `${prefix}los registros de entrega del producto`;
  if (general.length > maxTitle) throw new Error(`The import title exceeds ${maxTitle} characters.`);
  return general;
}

/**
 * `material` marks an imported snapshot whose published facts change; the others are re-imported only
 * so that all of them keep one product revision. It defaults to `imported`.
 * @param {{revision: string, results: Array<{name,label,path,journeys,imported,material?}>, entries: string[]}} input
 */
export function renderImportPullRequest({ revision, results, entries }) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('The product revision must be a full commit SHA.');
  const all = results.map(result => ({ ...result, material: result.imported && (result.material ?? true) }));
  const imported = all.filter(result => result.imported);
  const material = all.filter(result => result.material);
  if (!material.length) throw new Error('Nothing was imported; there is no PR to render.');
  const title = importTitle(revision, material);
  const journeys = [...new Set(imported.flatMap(result => result.journeys))];
  const short = revision.slice(0, 12);
  const state = result => (result.material ? 'importado: cambian sus datos' : result.imported ? 'importado: sólo cambia la revisión de origen' : 'vigente, sin cambios');
  const rows = all.map(result => `| \`${result.path}\` | ${state(result)} |`);
  const alongside = imported.filter(result => !result.material);
  const body = [
    'ODD-Task: inline',
    '',
    `ODD-Reason: Importación automática de los snapshots de entrega desde una revisión limpia de main de POS Platform (${short}), generada por el workflow Project import; no cambia código, contratos ni procedimientos.`,
    '',
    `Issue: ${issueUrl}`,
    '',
    'Documentation-Impact: behavior',
    '',
    `Sources: ${imported.map(result => result.path).join(', ')}`,
    '',
    `Reader-Journeys: ${journeys.join(', ')}`,
    '',
    `Review-Evidence: Generada por el workflow Project import desde un checkout limpio de POS Platform en ${revision}; cada importador validó su snapshot contra esa revisión y la observación de GitHub. Sin revisión humana: una persona revisa el diff y la integra.`,
    '',
    '## Resultado',
    '',
    `El portal pasa a mostrar el corte [${short}](${commitUrl(revision)}) de main de POS Platform: cambian los datos de ${list(material.map(result => result.label))}.${alongside.length ? ` ${list(alongside.map(result => result.label)).replace(/^./, letter => letter.toUpperCase())} se reimporta${alongside.length > 1 ? 'n' : ''} sólo para conservar una misma revisión.` : ''}`,
    '',
    entries.length
      ? `Cada cambio para el equipo figura en el bloque de entradas del historial (${entries.length}).`
      : 'El cambio no genera entradas propias del historial: actualiza la revisión de origen o datos que el historial no lista.',
    '',
    '## Fuentes y revisión',
    '',
    `**Fuente canónica:** los registros de \`delivery/\` de POS Platform y el estado de sus issues, leídos en la revisión inmutable \`${revision}\`.`,
    '',
    '**Estado:** importación automática. Ningún entregable se cierra ni se acepta desde esta PR, y la importación no verifica el contenido del registro.',
    '',
    '## Validación',
    '',
    '| Snapshot | Resultado |',
    '| --- | --- |',
    ...rows,
    '',
    'Cada importador compara hechos en modo de sólo lectura antes de escribir: la hora de observación de GitHub sola no abre esta PR. `Documentation quality` y `Editorial PR policy` verifican esta revisión exacta.',
    '',
    '## Riesgos y reversión',
    '',
    '**Riesgo:** la vista es un corte fechado, no información en tiempo real. Si main de POS Platform avanza antes de integrar, el workflow actualiza esta misma PR.',
    '',
    '**Reversión:** revertir la PR restaura el corte anterior sin tocar el producto.',
    '',
    changesBlock([title, ...entries]),
    '',
  ].join('\n');
  return { title, body };
}
