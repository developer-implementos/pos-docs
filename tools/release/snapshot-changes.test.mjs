import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateChangelogOverride } from './policy.mjs';
import { changesBlock, missingSnapshotEntries, requiredSnapshotEntries, snapshotChanges, snapshotPaths } from './snapshot-changes.mjs';

const followUpItem = (id, fields = {}) => ({
  id, kind: 'question', state: 'open', summary: `Resumen de ${id}`, impact: 'Impacto', nextAction: 'Próxima acción',
  closureCriteria: 'Criterio', owner: 'alguien', requestedFrom: 'Comercial', reviewedOn: '2026-11-01', evidence: [], resolution: null, ...fields,
});
const work = (id, fields = {}) => ({ id, status: 'in_progress', summary: `Trabajo de ${id}`, acceptance: null, verification: null, ...fields });
const issue = (code, labels, state = 'OPEN') => ({ code, state, executionLabels: labels, assignees: [], updatedAt: '2026-11-01T00:00:00Z' });
const planItem = (key, fields = {}) => ({ key, kind: 'story', parentDelivery: 'F02-04', title: `Trabajo ${key}`, outcome: 'Resultado', ...fields });
const snapshots = ({ items = [], entries = [], works = [], plan = [], planIssues = [], increment = { id: 'I1', title: 'Incremento uno' } } = {}) => ({
  followUp: { content: { items }, issues: { entries } },
  progress: { content: { workPackages: works } },
  planning: { content: { increment, items: plan }, issues: { entries: planIssues } },
});

test('each kind of project change becomes one reader-facing entry', () => {
  const before = snapshots({
    items: [followUpItem('FOLLOWUP-001'), followUpItem('FOLLOWUP-002'), followUpItem('FOLLOWUP-003'), followUpItem('FOLLOWUP-004')],
    entries: [issue('F02-05', ['status:review']), issue('F02-06', ['status:in-progress'])],
    works: [work('F02-05'), work('F02-06'), work('F02-07', { status: 'verified' }), work('F02-08')],
    plan: [planItem('kept'), planItem('dropped')],
    planIssues: [{ ...issue('kept', ['status:ready']) }],
  });
  const after = snapshots({
    items: [
      // A resolution explains the decision and then its consequences; the entry keeps the decision.
      followUpItem('FOLLOWUP-001', { state: 'resolved', resolution: { resolvedOn: '2026-11-02', summary: 'Comercial aprobó las reglas (acta 12). Riesgo aceptado: el catálogo se revisa cada mes.', evidence: [] } }),
      followUpItem('FOLLOWUP-002', { nextAction: 'Otra acción', impact: 'Otro impacto', reviewedOn: '2026-11-05' }),
      followUpItem('FOLLOWUP-004', { reviewedOn: '2026-11-05', evidence: ['nuevo'], owner: 'otra persona' }),
      followUpItem('FOLLOWUP-009', { kind: 'access', summary: 'Falta el acceso   al ambiente\nde pruebas. Lo pidió Comercial.' }),
    ],
    entries: [issue('F02-05', ['status:validation']), issue('F02-06', ['status:in-progress'], 'CLOSED'), issue('F02-09', ['status:triage'])],
    works: [work('F02-05', { status: 'verified' }), work('F02-06', { summary: 'Nuevo resumen. Detalle de la verificación con PostgreSQL 16.4 y TASK-11.' }), work('F02-07', { status: 'verified', acceptance: { revision: 'x' } }), work('F02-08'), work('F02-09', { status: 'not_started' }), work('F02-10', { status: 'not_started' })],
    plan: [planItem('kept', { outcome: 'Otro resultado' }), planItem('added', { parentDelivery: 'F02-12' })],
    planIssues: [{ ...issue('kept', ['status:in-progress']) }],
    increment: { id: 'I2', title: 'Incremento dos' },
  });
  assert.deepEqual(snapshotChanges(before, after), [
    'docs(follow-up): FOLLOWUP-001 resuelto: Comercial aprobó las reglas (acta 12)',
    'docs(follow-up): FOLLOWUP-002 actualizado (impacto, próxima acción): Resumen de FOLLOWUP-002',
    'docs(follow-up): FOLLOWUP-009 nuevo · Acceso: Falta el acceso al ambiente de pruebas',
    'docs(follow-up): FOLLOWUP-003 retirado del registro: Resumen de FOLLOWUP-003',
    'docs(progress): F02-05 pasa de En desarrollo a Verificado técnicamente',
    'docs(progress): F02-05 en GitHub pasa de En revisión a En validación',
    'docs(progress): F02-06 actualizado (resumen): Nuevo resumen',
    'docs(progress): F02-06 en GitHub pasa de En desarrollo a Cerrada',
    'docs(progress): F02-07 aceptado por el equipo',
    'docs(progress): F02-09 nuevo entregable · Pendiente: Trabajo de F02-09',
    'docs(progress): F02-10 nuevo entregable · Pendiente: Trabajo de F02-10',
    'docs(planning): nuevo incremento: Incremento dos',
    'docs(planning): Trabajo kept (F02-04) actualizado (resultado esperado)',
    'docs(planning): Trabajo kept (F02-04) en GitHub pasa de Listo para tomar a En desarrollo',
    'docs(planning): Trabajo added (F02-12) entra al próximo incremento',
    'docs(planning): Trabajo dropped (F02-04) sale del próximo incremento',
  ]);
  // Review dates, evidence and owners change on most imports; they do not make an entry on their own.
  assert.ok(!snapshotChanges(before, after).some(entry => entry.includes('FOLLOWUP-004')));
  assert.deepEqual(snapshotChanges(after, after), []);
});

test('generated entries pass the changelog block rules and stay readable', () => {
  const long = 'x'.repeat(400);
  const entries = snapshotChanges(snapshots(), snapshots({ items: [followUpItem('FOLLOWUP-010', { summary: `Usar <b>${long}` })] }));
  assert.equal(entries.length, 1);
  assert.ok(entries[0].length <= 200, 'A long summary is shortened');
  assert.match(entries[0], /…$/);
  assert.doesNotMatch(entries[0], /<b/);
  const block = changesBlock([...entries, 'docs(progress): F02-05 pasa de En desarrollo a Verificado técnicamente']);
  assert.equal(validateChangelogOverride(`Texto del PR.\n\n${block}\n`).entries.length, 2);
  assert.equal(changesBlock([]), '');
});

test('the policy requires every generated entry, reading only immutable revisions', async () => {
  const before = snapshots({ items: [followUpItem('FOLLOWUP-001')] });
  const after = snapshots({ items: [followUpItem('FOLLOWUP-001'), followUpItem('FOLLOWUP-009')] });
  const reads = [];
  const read = async (path, revision) => {
    reads.push(`${revision}:${path}`);
    const name = Object.entries(snapshotPaths).find(([, value]) => value === path)[0];
    return JSON.stringify((revision === 'base' ? before : after)[name]);
  };
  const files = [{ filename: snapshotPaths.followUp, status: 'modified' }, { filename: 'docs/mobile.md', status: 'modified' }];
  const required = await requiredSnapshotEntries({ files, read, base: 'base', head: 'head' });
  assert.deepEqual(required, ['docs(follow-up): FOLLOWUP-009 nuevo · Pregunta: Resumen de FOLLOWUP-009']);
  assert.ok(reads.every(entry => entry.endsWith(snapshotPaths.followUp) || entry.startsWith('head:')), 'Unchanged snapshots are read once, at head');
  assert.deepEqual(missingSnapshotEntries('Sin bloque.', required), required);
  const body = `Resultado.\n\n${changesBlock([...required, 'docs(mobile): explicar los perfiles móviles'])}\n`;
  assert.deepEqual(missingSnapshotEntries(body, required), []);
  // A PR that does not touch the snapshots needs nothing and reads nothing.
  reads.length = 0;
  assert.deepEqual(await requiredSnapshotEntries({ files: [{ filename: 'docs/mobile.md', status: 'modified' }], read, base: 'base', head: 'head' }), []);
  assert.deepEqual(reads, []);
});
