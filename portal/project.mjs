import { teamMembers } from './team.mjs';

export const applicationNames = {
  'pos-desktop': 'POS de escritorio', 'pos-mobile': 'POS móvil',
  'branch-api': 'API de sucursal', 'branch-sync-worker': 'Sincronización de sucursal',
  'country-api': 'API de país', 'erp-worker': 'Integración ERP', 'device-agent': 'Servicio de dispositivos',
};
export const technicalStatuses = { not_started: 'Pendiente', in_progress: 'En desarrollo', blocked: 'Bloqueado', verified: 'Verificado técnicamente', accepted: 'Aceptado' };
export const executionStatuses = { 'status:triage': 'Por clasificar', 'status:ready': 'Listo para tomar', 'status:in-progress': 'En desarrollo', 'status:blocked': 'Bloqueado', 'status:review': 'En revisión', 'status:validation': 'En validación' };
export const actionKinds = { access: 'Acceso', question: 'Pregunta', decision: 'Decisión', provider: 'Proveedor', hardware: 'Dispositivo', investigation: 'Investigación', validation: 'Validación' };
export const impactScopes = { technical: 'Verificación técnica', operational: 'Habilitación operativa', review: 'Revisión del equipo' };

export function isActiveWork(work) {
  return work.issue.state === 'OPEN' && work.issue.executionLabels.length === 1 && ['status:in-progress', 'status:blocked', 'status:review', 'status:validation'].includes(work.issue.executionLabels[0]);
}

export function executionLabel(issue) {
  if (issue.state === 'CLOSED') return 'Cerrada';
  return issue.executionLabels.length === 1 ? executionStatuses[issue.executionLabels[0]] || 'Estado sin confirmar' : 'Estado sin confirmar';
}

/** Presentation-only projection. The imported models remain the owners of all facts. */
export function deriveProject(progress, followUp, members = teamMembers) {
  const works = followUp.workPackages;
  const actions = followUp.items;
  const openActions = actions.filter(item => item.state === 'open');
  const active = works.filter(isActiveWork);
  const priority = work => work.status === 'blocked' ? 0 : work.issue.executionLabels.includes('status:in-progress') ? 1 : 2;
  const activePreview = [...active].sort((a, b) => priority(a) - priority(b) || a.id.localeCompare(b.id)).slice(0, 6);
  const membersByLogin = new Map(members.map(member => [member.github.toLowerCase(), member]));
  const logins = new Map(members.map(member => [member.github.toLowerCase(), member.github]));
  for (const work of works) for (const login of work.issue.assignees) if (!logins.has(login.toLowerCase())) logins.set(login.toLowerCase(), login);
  for (const action of actions) if (action.owner && !logins.has(action.owner.toLowerCase())) logins.set(action.owner.toLowerCase(), action.owner);
  const people = [...logins].map(([key, github]) => ({
    ...(membersByLogin.get(key) || { name: `@${github}`, role: 'Perfil sin registrar en el equipo', github, avatar: null }),
    active: active.filter(work => work.issue.assignees.some(login => login.toLowerCase() === key)),
    actions: openActions.filter(action => action.owner?.toLowerCase() === key),
  }));
  return {
    progress, followUp, works, actions, openActions, active, activePreview, people,
    unassignedWork: works.filter(work => !work.issue.assignees.length),
    unassignedActive: active.filter(work => !work.issue.assignees.length),
    unassignedActions: openActions.filter(action => !action.owner),
  };
}
