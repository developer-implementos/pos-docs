import {createHash} from 'node:crypto';
import {deriveProgress, progressContentHash} from './progress.mjs';
import {deriveFollowUp, followUpContentHash, productRepository} from './follow-up.mjs';
import {planningContentHash} from './planning.mjs';

export function planningFixture() {
  const revision = 'a'.repeat(40);
  const roadmap = JSON.stringify({schemaVersion: 3, phases: [{id: 'phase-02', title: 'Cobro', delivery: {work: [{id: 'F02-04', title: 'Impresión', apps: ['device-agent']}]}}]}) + '\n';
  const content = {schemaVersion: 2, reviewedOn: '2026-11-03', productRevision: 'source', scope: {repository: 'https://github.com/developer-implementos/pos-docs', revision, path: 'docs/roadmap.json', sha256: createHash('sha256').update(roadmap).digest('hex')}, summary: 'Alcance del fixture.', applications: [{id: 'device-agent', stage: 'planned', summary: 'Pendiente.', nextStep: 'Implementar.', evidence: []}], workPackages: [{id: 'F02-04', apps: ['device-agent'], status: 'not_started', summary: 'Pendiente.', verification: null, acceptance: null}]};
  const progressSnapshot = {schemaVersion: 1, source: {repository: productRepository, revision, path: 'delivery/progress.json', sha256: progressContentHash(content)}, content};
  const progress = deriveProgress(progressSnapshot, roadmap);
  const followContent = {schemaVersion: 1, reviewedOn: '2026-11-03', items: [{id: 'FOLLOWUP-001', kind: 'provider', state: 'open', workPackages: ['F02-04'], summary: 'Contrato pendiente.', impact: 'Limita el adaptador.', impactScope: 'technical', nextAction: 'Confirmar contrato.', requestedFrom: 'Proveedor', owner: null, closureCriteria: 'Contrato documentado.', reviewedOn: '2026-11-03', evidence: [{url: `${productRepository}/issues/20`, label: 'Seguimiento'}], resolution: null}]};
  const parentIssue = {code: 'F02-04', number: 20, url: `${productRepository}/issues/20`, state: 'OPEN', executionLabels: ['status:triage'], assignees: [], updatedAt: '2026-11-03T01:00:00Z'};
  const followSnapshot = {schemaVersion: 1, source: {repository: productRepository, revision, path: 'delivery/follow-ups.json', sha256: followUpContentHash(followContent)}, content: followContent, issues: {observedAt: '2026-11-03T02:00:00Z', repository: productRepository, entries: [parentIssue]}};
  const followUp = deriveFollowUp(followSnapshot, progress);
  const work = (key, order, kind) => ({key, kind, parentDelivery: 'F02-04', title: `Trabajo ${order}`, outcome: 'Resultado comprobable.', order, priority: 'P1', rationale: 'Reduce la incertidumbre del contrato antes de implementar el recorrido.', dependsOn: [], followUps: ['FOLLOWUP-001'], scope: ['Contrato acotado.'], exclusions: ['Sin operar producción.'], entryCriteria: ['Acceso autorizado al contrato.'], criteria: ['Respuesta registrada y verificable.'], expectedTests: ['Verificar campos requeridos.'], evidence: ['Contrato versionado.'], question: kind === 'research' ? '¿Cómo se consulta un resultado incierto?' : null, timebox: kind === 'research' ? '1 sesión de investigación; registrar impedimentos si no hay respuesta.' : null});
  const planningContent = {schemaVersion: 1, reviewedOn: '2026-11-03', increment: {id: 'INC-01', title: 'Incremento del fixture', outcome: 'Resultado del incremento.', coordinator: null}, items: [work('inspect-contract', 1, 'research'), {...work('deliver-flow', 2, 'story'), dependsOn: ['inspect-contract']}]};
  const entries = planningContent.items.map((item, index) => ({code: item.key, number: 120 + index, url: `${productRepository}/issues/${120 + index}`, state: 'OPEN', stateReason: null, executionLabels: ['status:triage'], assignees: [], updatedAt: '2026-11-03T01:00:00Z'}));
  const snapshot = {schemaVersion: 1, source: {repository: productRepository, revision, path: 'delivery/planning.json', sha256: planningContentHash(planningContent)}, content: planningContent, issues: {observedAt: '2026-11-03T02:00:00Z', repository: productRepository, entries}};
  return {roadmap, progressSnapshot, followSnapshot, progress, followUp, snapshot};
}
