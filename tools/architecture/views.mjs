import { architecture } from './model.mjs';

/** A projection preserves source IDs and contracts; hidden components resolve to their owner. */
export function projectArchitecture(model, nodeIds, { id = 'projection', title = model.title, compact = true, edgeIds } = {}) {
  const wanted = new Set(nodeIds);
  const nodes = model.nodes.filter(node => wanted.has(node.id)).map(node => ({ ...node, ...(node.owner && !wanted.has(node.owner) ? { owner: undefined } : {}) }));
  const resolve = id => wanted.has(id) ? id : model.nodes.find(node => node.id === id)?.owner;
  const edges = model.edges.filter(edge => !edgeIds || edgeIds.includes(edge.id)).map(edge => ({ ...edge, from: resolve(edge.from), to: resolve(edge.to), sourceFrom: edge.from, sourceTo: edge.to, number: model.edges.indexOf(edge) + 1 })).filter(edge => wanted.has(edge.from) && wanted.has(edge.to) && edge.from !== edge.to);
  // Multiple contracts can share endpoints; never collapse them into an invented generic API.
  return { ...model, id, title, compact, groups: model.groups.filter(group => nodes.some(node => node.group === group.id)), nodes, edges };
}

const baseNodes = architecture.nodes.filter(node => node.kind === 'app' || (node.kind === 'data' && node.status === 'proposed') || (node.kind === 'external' && node.status !== 'conditional')).map(node => node.id);
const baseEdges = ['desktop-api', 'mobile-api', 'commit-local', 'sync-local', 'sync-country', 'accept-country', 'claim-report', 'send-erp', 'fetch-source', 'payment-api', 'fiscal-api', 'device-command', 'device-jobs-local', 'bridge-evidence', 'agent-journal', 'hardware-command', 'country-job-store', 'queue-store'];
export const architectureViews = [
  { id: 'base', title: 'Arquitectura base', description: 'Siete aplicaciones propuestas. Device-agent: F02 por puesto Windows y piloto F05; red, estación compartida y móvil se homologan en F06. Seis apps tienen base o scaffolding; el agente está por implementar.', model: projectArchitecture(architecture, baseNodes, { id: 'base', title: 'POS Platform · arquitectura base', edgeIds: baseEdges }) },
  ...architecture.groups.map(group => {
    const local = architecture.nodes.filter(node => node.group === group.id).map(node => node.id);
    const related = architecture.edges.filter(edge => local.includes(edge.from) || local.includes(edge.to));
    const adjacent = [...new Set(related.flatMap(edge => [edge.from, edge.to]))];
    const nodes = [...new Set([...local, ...adjacent])];
    return { id: group.id, title: group.title, description: `Componentes de ${group.title.toLowerCase()} y sus colaboradores directos.`, model: projectArchitecture(architecture, nodes, { id: group.id, title: group.title, compact: false, edgeIds: related.map(edge => edge.id) }) };
  }),
  { id: 'options', title: 'Caché y observabilidad', description: 'Caché descartable y destinos externos de telemetría conservan su adopción condicionada. Los jobs BullMQ y sus Redis dedicados pertenecen a la arquitectura base.', model: projectArchitecture(architecture, ['branch-api', 'branch-sync', 'country-api', 'cache-port', 'redis-cache', 'country-db', 'erp-worker', 'observability'], { id: 'options', title: 'Caché y observabilidad', compact: false, edgeIds: ['cache-policy', 'cache-read', 'cache-fallback', 'branch-diagnostic', 'sync-diagnostic', 'country-diagnostic', 'erp-diagnostic'] }) },
  { id: 'full', title: 'Mapa completo', description: 'Todas las responsabilidades, contratos y alternativas de la propuesta.', model: { ...architecture, id: 'full' } },
];

export function scenarioView(scenario, stepIndex) {
  const step = scenario.steps[stepIndex];
  const ids = new Set(step.nodes);
  for (const id of step.nodes) { const owner = architecture.nodes.find(node => node.id === id)?.owner; if (owner) ids.add(owner); }
  for (const id of step.edges) { const edge = architecture.edges.find(edge => edge.id === id); ids.add(edge.from); ids.add(edge.to); }
  return { ...projectArchitecture(architecture, [...ids], { id: `scenario-${scenario.id}-${stepIndex + 1}`, title: step.title, compact: true, edgeIds: step.edges }), flow: true, subtitle: `Paso ${stepIndex + 1} · ${scenario.title}. Responsabilidades propuestas; selecciona un elemento para consultar su contrato.` };
}

export function validateArchitecture(model = architecture) {
  const nodes = new Map(model.nodes.map(node => [node.id, node]));
  const fail = message => { throw new Error(message); };
  if (nodes.size !== model.nodes.length) fail('Duplicate architecture node');
  const apps = model.nodes.filter(node => node.kind === 'app').map(node => node.title).sort();
  if (JSON.stringify(apps) !== JSON.stringify(['branch-api', 'branch-sync-worker', 'country-api', 'device-agent', 'erp-worker', 'pos-desktop', 'pos-mobile'])) fail('The architecture must retain the seven agreed applications');
  if (nodes.get('bridge')?.kind !== 'app' || nodes.get('bridge')?.status !== 'proposed') fail('Device agent must remain a proposed application');
  for (const node of model.nodes) {
    if (node.kind === 'component' && (!node.owner || nodes.get(node.owner)?.kind !== 'app')) fail(`Internal component requires an application owner: ${node.id}`);
    if (node.owner && nodes.get(node.owner)?.group !== node.group) fail(`Component crosses its process boundary: ${node.id}`);
    if (node.kind === 'process' && node.owner) fail(`Independent process cannot be an internal component: ${node.id}`);
  }
  for (const [library, owner, store, group] of [['country-bullmq', 'country-api', 'country-redis-jobs', 'country'], ['bullmq', 'erp-worker', 'redis-jobs', 'integrations']]) {
    if (nodes.get(library)?.owner !== owner || nodes.get(library)?.status !== 'proposed' || nodes.get(library)?.kind !== 'component') fail(`BullMQ must be selected within its application: ${library}`);
    if (nodes.get(store)?.status !== 'proposed' || nodes.get(store)?.kind !== 'data' || nodes.get(store)?.group !== group) fail(`Dedicated job store must be selected in its execution domain: ${store}`);
    const connection = model.edges.find(edge => edge.from === library && edge.to === store);
    if (!connection || connection.status !== 'proposed' || !connection.protocol.includes('Redis')) fail(`BullMQ requires its dedicated Redis contract: ${library}`);
  }
  if (nodes.get('redis-cache')?.status !== 'conditional') fail('Discardable cache remains optional and separate from jobs');
  const ids = new Set(nodes.keys());
  for (const edge of model.edges) {
    if (ids.has(edge.id)) fail(`Duplicate architecture ID: ${edge.id}`); ids.add(edge.id);
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) fail(`Dangling edge: ${edge.id}`);
    if (['country-redis-jobs', 'redis-jobs'].includes(edge.to) && nodes.get(edge.from)?.group !== nodes.get(edge.to).group) fail(`Redis cannot cross execution domains: ${edge.id}`);
    if (['country-bullmq', 'bullmq'].includes(edge.from) && edge.to === 'redis-cache') fail(`Jobs cannot use the discardable cache: ${edge.id}`);
    if (edge.relation === 'evaluation' && edge.status !== 'unresolved') fail(`Evaluation is not an adopted contract: ${edge.id}`);
    if (['desktop', 'mobile', 'bridge', 'erp-worker', 'master-source'].includes(edge.from) && edge.to === 'country-db') fail(`Forbidden SQL authority: ${edge.id}`);
    if (['desktop', 'mobile', 'bridge'].includes(edge.from) && edge.to === 'branch-db') fail(`Clients cannot own SQL access: ${edge.id}`);
    if (['desktop', 'mobile'].includes(edge.from) && ['bridge', 'device-journal', 'devices'].includes(edge.to) || edge.from === 'bridge' && ['desktop', 'mobile'].includes(edge.to)) fail(`Device work cannot depend on a client relay: ${edge.id}`);
    if (edge.to === 'device-journal' && edge.from !== 'bridge') fail(`Agent journal has a single application owner: ${edge.id}`);
  }
  for (const [id, from, to] of [['sync-country', 'branch-sync', 'country-api'], ['claim-report', 'erp-worker', 'country-api'], ['submit-publication', 'master-source', 'country-api'], ['device-command', 'bridge', 'branch-api'], ['bridge-evidence', 'bridge', 'branch-api']]) {
    const edge = model.edges.find(edge => edge.id === id);
    if (!edge || edge.from !== from || edge.to !== to || !edge.protocol.includes('HTTPS')) fail(`Outgoing HTTPS boundary changed: ${id}`);
  }
  const journal = model.edges.find(edge => edge.id === 'agent-journal');
  if (!journal || journal.from !== 'bridge' || journal.to !== 'device-journal' || !journal.protocol.includes('SQLite')) fail('Agent journal must retain its local SQLite contract');
  const deviceJobs = model.edges.find(edge => edge.id === 'device-jobs-local');
  if (!deviceJobs || deviceJobs.from !== 'branch-api' || deviceJobs.to !== 'branch-db' || !deviceJobs.protocol.includes('PostgreSQL')) fail('Device work and observations must retain their branch PostgreSQL contract');
  if (nodes.get('network-devices')?.status !== 'conditional') fail('Network peripherals must remain a later conditional capability');
  const networkHardware = model.edges.find(edge => edge.id === 'network-hardware-command');
  if (!networkHardware || networkHardware.from !== 'bridge' || networkHardware.to !== 'network-devices' || networkHardware.status !== 'conditional') fail('Network hardware must retain the assigned device-agent contract');
  const initialPrinting = model.scenarios.find(scenario => scenario.id === 'local-printing');
  if (!initialPrinting || initialPrinting.steps.some(step => step.nodes.includes('mobile') || step.nodes.includes('network-devices'))) fail('Initial dedicated printing cannot imply shared mobile or network support');
  const sharedPrinting = model.scenarios.find(scenario => scenario.id === 'shared-printing');
  if (!sharedPrinting?.steps.some(step => step.edges.includes('network-hardware-command'))) fail('Later shared printing must show its separate network contract');
  for (const scenario of model.scenarios) for (const step of scenario.steps) {
    for (const id of [...step.nodes, ...step.edges]) if (!ids.has(id)) fail(`Unknown scenario item: ${id}`);
    for (const id of step.edges) { const edge = model.edges.find(edge => edge.id === id); if (!step.nodes.includes(edge.from) || !step.nodes.includes(edge.to)) fail(`Scenario omits relationship endpoint: ${scenario.id}/${id}`); }
  }
}
