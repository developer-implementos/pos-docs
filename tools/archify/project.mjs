import { architecture } from '../architecture/model.mjs';
import { architectureViews, projectArchitecture, validateArchitecture } from '../architecture/views.mjs';
import { exploreCatalog } from './catalog.mjs';
import { lifecycleDiagrams } from './lifecycle.mjs';

const type = node => node.kind === 'data' ? 'database' : ['desktop', 'mobile'].includes(node.id) ? 'frontend' : node.kind === 'external' ? 'external' : 'backend';
const groups = new Map(architecture.groups.map(group => [group.id, group.title]));
const positions = {
  desktop: [40, 60], mobile: [40, 230], bridge: [40, 400], 'device-journal': [40, 570],
  'branch-api': [490, 60], 'branch-db': [490, 230], 'branch-sync': [490, 400],
  'country-api': [940, 400], 'country-db': [940, 570], 'country-redis-jobs': [940, 230],
  'erp-worker': [1390, 400], 'redis-jobs': [1390, 570],
};

export function projectApplications() {
  validateArchitecture();
  const base = architectureViews.find(view => view.id === 'base').model;
  const model = projectArchitecture(base, base.nodes.filter(node => node.kind === 'app' || node.kind === 'data').map(node => node.id));
  return {
    schema_version: 1, diagram_type: 'architecture',
    meta: { title: 'POS Platform · aplicaciones y despliegue propuestos', locale: 'es', output: 'applications.html', quality_profile: 'showcase', animation: 'none' },
    components: model.nodes.map(node => ({ id: node.id, label: node.title, type: type(node), sublabel: groups.get(node.group), pos: positions[node.id], size: [240, 84] })),
    connections: model.edges.map(edge => ({ id: edge.id, from: edge.from, to: edge.to, label: edge.title, variant: edge.mode === 'async' ? 'dashed' : 'default',
      ...(edge.id === 'commit-local' ? { labelAt: [720, 185] } : {}),
      ...(edge.id === 'bridge-evidence' ? { fromSide: 'right', toSide: 'top', via: [[320, 442], [320, 20], [610, 20]], labelAt: [460, 20] } : {}),
    })),
    cards: [{ dot: 'cyan', title: 'Alcance de esta vista', items: [
      'Arquitectura objetivo: la presencia de una aplicación o almacén no acredita que esté operativo.',
      'Las tecnologías, contratos y proveedores se consultan seleccionando el elemento. La vista completa conserva los componentes internos y dependencias externas.',
      'Los clientes no acceden a SQL. Los Redis de jobs pertenecen a ámbitos distintos; el transporte entre redes es HTTPS.',
    ] }],
  };
}

export function projectScenario(scenario) {
  const titleLines = title => {
    const words = title.split(' ');
    let split = 1;
    while (split < words.length && words.slice(0, split + 1).join(' ').length <= 22) split++;
    return { label: words.slice(0, split).join(' '), ...(split < words.length ? { sublabel: words.slice(split).join(' ') } : {}) };
  };
  const nodes = scenario.steps.map((step, index) => ({
    id: `step-${index + 1}`, lane: 'journey', col: index, type: 'backend',
    ...titleLines(step.title), tag: `Paso ${index + 1}`, height: 98,
  }));
  return {
    schema_version: 2, diagram_type: 'workflow',
    meta: { title: scenario.title, locale: 'es', output: `${scenario.id}.html`, quality_profile: 'showcase', animation: 'none', legend: { entries: { backend: { label: 'Paso del proceso' } } } },
    lanes: [{ id: 'journey', label: 'Recorrido propuesto' }], nodes,
    mainPath: nodes.map(node => node.id),
    edges: nodes.slice(1).map((node, index) => ({ id: `next-${index + 1}`, from: nodes[index].id, to: node.id, role: 'main', variant: 'emphasis' })),
    cards: scenario.steps.map((step, index) => ({ dot: 'cyan', title: `${index + 1}. ${step.title}`, items: [step.description] })),
  };
}

export function projectDiagrams() {
  return [...exploreCatalog.filter(entry => entry.type !== 'lifecycle').map(entry => ({ ...entry, diagram: entry.id === 'applications' ? projectApplications() : projectScenario(architecture.scenarios.find(scenario => scenario.id === entry.id)) })), ...lifecycleDiagrams()];
}

export function detailData(id, productSource) {
  if (id === 'applications') return {
    nodes: Object.fromEntries(architecture.nodes.map(node => [node.id, { title: node.title, description: node.description || node.summary, technology: node.technology, status: node.status, sources: node.sources, href: `/architecture/?view=full#detail-${node.id}`,
      links: [
        ...(node.kind === 'app' && productSource ? [{ label: `Código de ${node.title} · ${productSource.commit.slice(0, 7)}`, href: `${productSource.repository}/tree/${productSource.commit}/apps/${node.title}` }] : []),
        ...(['branch-api', 'country-api'].includes(node.id) ? [{ label: 'Contrato HTTP de esta API', href: `/guide/api/pos-platform/#api-${node.id}` }] : []),
        { label: 'Implementación y límites', href: '/guide/implementation/monorepo/' },
      ],
    }])),
    edges: Object.fromEntries(architecture.edges.map(edge => [edge.id, { title: edge.title, description: edge.description, technology: edge.protocol, status: edge.status, sources: edge.sources, href: `/architecture/?view=full#detail-${edge.id}` }])),
  };
  const scenario = architecture.scenarios.find(item => item.id === id);
  return { nodes: Object.fromEntries(scenario.steps.map((step, index) => [`step-${index + 1}`, {
    title: step.title, description: step.description, technology: step.nodes.map(nodeId => architecture.nodes.find(node => node.id === nodeId).title).join(' · '),
    status: 'proposed', sources: [], href: `/architecture/?scenario=${scenario.id}&step=${index + 1}`,
  }])), edges: {} };
}
