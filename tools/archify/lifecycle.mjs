import { lifecycles } from '../architecture/lifecycles.mjs';

export const lifecycleCatalog = lifecycles.map(item => ({
  id: item.id, title: item.title, description: item.description, type: 'lifecycle',
  href: `/explore/${item.id}/`, status: item.status, source: item.source,
  evidenceKind: item.meta.evidenceKind, revision: item.meta.commit,
}));

export function projectLifecycle(item) {
  return {
    schema_version: 3, diagram_type: 'lifecycle',
    meta: { title: item.title, locale: 'es', output: `${item.id}.html`, quality_profile: 'showcase', animation: 'none' },
    mainPath: item.id === 'state-printing' ? ['queued', 'received', 'executing', 'uncertain', 'spooled'] : [...item.mainPath],
    states: item.states.map(state => ({ id: state.id, label: state.label, type: state.kind })),
    transitions: item.transitions.map((transition, index) => ({ id: `transition-${index + 1}`, from: transition.from, to: transition.to, label: transition.label, ...(transition.variant ? { variant: transition.variant } : {}) })),
    cards: [{ dot: 'cyan', title: 'Alcance verificado en código', items: [item.meta.scope, ...(item.id === 'state-printing' ? ['Recorrido destacado: recuperación del mismo intento tras un resultado incierto. Las demás salidas del trabajo permanecen visibles.'] : []), item.meta.limitations, `Revisión ${item.meta.commit}. La inspección del código no acredita pruebas ejecutadas ni homologación.`] }],
  };
}

export function lifecycleDetails(item) {
  const describe = element => ({
    title: element.label, description: element.description, status: item.status,
    evidenceKind: item.meta.evidenceKind, href: item.source,
    technology: `${item.meta.scope} Revisión ${item.meta.commit.slice(0, 7)}.`,
    links: element.evidence.map(evidence => ({ label: `${evidence.path}:${evidence.line}`, href: `${item.meta.repository}/blob/${item.meta.commit}/${evidence.path}#L${evidence.line}-L${evidence.end_line}` })),
  });
  return { nodes: Object.fromEntries(item.states.map(state => [state.id, describe(state)])), edges: Object.fromEntries(item.transitions.map((transition, index) => [`transition-${index + 1}`, describe(transition)])) };
}

export function lifecycleDiagrams() {
  return lifecycles.map((item, index) => ({ ...lifecycleCatalog[index], diagram: projectLifecycle(item), details: lifecycleDetails(item) }));
}
