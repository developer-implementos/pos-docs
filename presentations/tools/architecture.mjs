import assert from 'node:assert/strict';
import { architecture } from '../../tools/architecture/model.mjs';
import { projectArchitecture } from '../../tools/architecture/views.mjs';

const nodes = new Map(architecture.nodes.map(node => [node.id, node]));
const edges = new Map(architecture.edges.map(edge => [edge.id, edge]));
export const containerOverview = projectArchitecture(architecture,
  ['desktop', 'mobile', 'bridge', 'branch-api', 'branch-db', 'branch-sync', 'country-api', 'country-db', 'erp-worker'],
  { id: 'presentation-containers', edgeIds: ['desktop-api', 'mobile-api', 'device-command', 'commit-local', 'sync-local', 'sync-country', 'accept-country', 'claim-report'] });
export const deviceOverview = projectArchitecture(architecture,
  ['desktop', 'branch-api', 'branch-db', 'bridge', 'device-journal', 'devices'],
  { id: 'presentation-devices', edgeIds: ['desktop-api', 'device-jobs-local', 'device-command', 'bridge-evidence', 'agent-journal', 'hardware-command'] });
const blue = '#0545BA', ink = '#24334B', pale = '#EFF4FF', green = '#007B6D';
const box = (left, top, width, height) => ({ left, top, width, height });
const shape = (left, top, width, height, fill = pale) => ({ type: 'shape', geometry: 'rect', position: box(left, top, width, height), fill, line: { fill, width: 0 } });
const text = (value, left, top, width, height, role = 'body', color = ink) => ({ type: 'text', text: value, position: box(left, top, width, height), style: { typeface: 'Inter', typographyRole: role, color, verticalAlignment: 'top', autoFit: 'none', wrap: 'square', insets: 0 } });
const triangle = { type: 'triangle', width: 'sm', length: 'sm' };
function line(x1, y1, x2, y2, arrow = true) {
  assert.ok(x1 === x2 || y1 === y2, 'Architecture connectors use orthogonal routes');
  const reverse = x2 < x1 || y2 < y1;
  return { type: 'connector', geometry: 'connector', position: box(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)), line: { fill: green, width: 2 }, ...(arrow ? { [reverse ? 'head' : 'tail']: triangle } : {}) };
}
function node(id, x, y, width, height, description, title) {
  const source = nodes.get(id);
  assert.ok(source, `Unknown canonical architecture node: ${id}`);
  return [shape(x, y, width, height), shape(x, y, width, 38, source.kind === 'data' ? green : blue),
    text(title || (source.kind === 'data' ? source.title.replace(/ de (?:sucursal|país)$/u, '') : source.title), x + 12, y + 7, width - 24, 28, 'title', '#FFFFFF'),
    text(description, x + 12, y + 48, width - 24, height - 52)];
}
function connection(id, route, label, labelBox) {
  assert.ok(edges.has(id), `Unknown canonical architecture relationship: ${id}`);
  return [...route.slice(1).map((point, index) => line(...route[index], ...point, index === route.length - 2)), ...(label ? [text(label, ...labelBox, 'label')] : [])];
}

/** Presentation composition only: identities, ownership and relationships stay in the shared architecture model. */
export function architectureSlide(slide) {
  if (!slide.architectureView) return slide;
  const chrome = slide.elements.filter(element => element.position.top < 220 || element.position.top >= 630);
  let body;
  if (slide.architectureView === 'containers') {
    const apps = ['desktop', 'mobile', 'bridge', 'branch-api', 'branch-sync', 'country-api', 'erp-worker'];
    assert.ok(apps.every(id => nodes.get(id)?.kind === 'app'), 'C2 shows the seven canonical applications');
    assert.equal(containerOverview.edges.length, 8, 'Every connection must project to the applications and stores shown');
    body = [
      text('Puesto / clientes', 64, 224, 258, 32, 'group', blue), text('Sucursal', 352, 224, 270, 32, 'group', blue),
      text('País', 686, 224, 240, 32, 'group', blue), text('Red autorizada', 996, 224, 220, 32, 'group', blue),
      ...node('desktop', 64, 270, 212, 98, 'Shell Tauri\nFrontend Angular'),
      ...node('mobile', 64, 390, 212, 98, 'Shell Capacitor\nFrontend Angular'),
      ...node('bridge', 64, 510, 212, 98, '.NET / Windows\nF02 · por puesto'),
      ...node('branch-api', 352, 280, 262, 94, 'Reglas y permisos'),
      ...node('branch-db', 352, 420, 262, 94, 'Negocio + outbox'),
      ...node('branch-sync', 352, 550, 262, 74, 'Intercambio durable'),
      ...node('country-api', 686, 280, 238, 94, 'Recepción y contratos'),
      ...node('country-db', 686, 500, 238, 94, 'Inbox, trabajo y versiones'),
      ...node('erp-worker', 996, 280, 220, 118, 'ERP y fuentes\nautorizadas'),
      ...connection('desktop-api', [[276, 326], [352, 326]], 'HTTPS', [282, 300, 68, 22]),
      ...connection('mobile-api', [[276, 440], [314, 440], [314, 344], [352, 344]], '', []),
      ...connection('device-command', [[276, 560], [334, 560], [334, 362], [352, 362]], 'HTTPS', [278, 572, 68, 22]),
      ...connection('commit-local', [[483, 374], [483, 420]], 'PostgreSQL', [494, 388, 114, 22]),
      ...connection('sync-local', [[483, 550], [483, 514]], 'PostgreSQL', [494, 520, 114, 22]),
      ...connection('sync-country', [[614, 588], [652, 588], [652, 348], [686, 348]], 'HTTPS', [660, 412, 64, 22]),
      ...connection('accept-country', [[805, 374], [805, 500]], 'PostgreSQL', [818, 430, 106, 22]),
      ...connection('claim-report', [[996, 326], [924, 326]], 'HTTPS', [930, 300, 64, 22]),
      text('Inicia conexiones\na país; sin SQL WAN.', 996, 430, 220, 60),
    ];
  } else if (slide.architectureView === 'devices') {
    body = [
      text('F02 · Escritorio', 64, 224, 258, 32, 'group', blue), text('Servidor de sucursal', 352, 224, 310, 32, 'group', blue),
      text('Mismo PC de caja', 754, 224, 360, 32, 'group', blue),
      ...node('desktop', 64, 280, 212, 98, 'Tauri + Angular'),
      ...node('branch-api', 352, 280, 262, 118, 'NestJS · devices\nAutoriza y coordina'),
      ...node('branch-db', 352, 478, 262, 98, 'Trabajos y auditoría'),
      ...node('bridge', 754, 280, 232, 118, '.NET / C# · Windows\nEjecuta y recupera'),
      ...node('device-journal', 754, 478, 248, 98, 'Intentos y evidencia\nSin autoridad de ventas', 'SQLite'),
      ...node('devices', 1060, 280, 156, 118, 'USB / serie\nSDK local', 'Periféricos'),
      ...connection('desktop-api', [[276, 326], [352, 326]], 'HTTPS', [282, 300, 68, 22]),
      ...connection('device-command', [[754, 328], [614, 328]], 'Obtener trabajo', [624, 300, 128, 24]),
      ...connection('bridge-evidence', [[754, 372], [614, 372]], 'Reportar estado', [624, 348, 128, 24]),
      text('HTTPS / LAN\niniciado por agente', 624, 402, 128, 64, 'label'),
      ...connection('agent-journal', [[870, 398], [870, 478]], 'SQLite', [882, 430, 96, 24]),
      ...connection('hardware-command', [[986, 338], [1060, 338]], 'Driver /\nSDK', [992, 292, 68, 44]),
      ...connection('device-jobs-local', [[483, 398], [483, 478]], 'PostgreSQL', [495, 430, 120, 24]),
      shape(64, 440, 258, 178),
      text('F06 · Evolución', 78, 454, 230, 32, 'title', blue),
      text('Después del piloto F05.\nRed y móvil compartido:\nasignación y permisos\npor homologar.', 78, 496, 230, 100),
      text('Mismo jobId · un dueño por equipo físico · enviado al spooler ≠ papel impreso.', 352, 594, 864, 32, 'label'),
    ];
  } else if (slide.architectureView === 'erp-topology') {
    body = [
      text('Plataforma de país', 64, 226, 300, 32, 'group', blue), text('Red autorizada del ERP', 550, 226, 420, 32, 'group', blue),
      ...node('country-api', 64, 282, 296, 112, 'Trabajo y resultados\nContrato común POS'),
      ...node('country-db', 64, 482, 296, 112, 'Recepción, estados\ny referencias durables'),
      ...connection('accept-country', [[212, 394], [212, 482]], 'PostgreSQL', [228, 426, 132, 26]),
    ];
    const worker = nodes.get('erp-worker');
    for (const [index, [country, erp, description]] of [['CL', 'Dynamics AX', 'Identidades y estados AX'], ['PE', 'ICS / custom', 'Modelo e interfaz por validar'], ['ES', 'Gira', 'Modelo e interfaz por validar']].entries()) {
      const y = 282 + index * 112;
      body.push(shape(550, y, 354, 94), shape(550, y, 354, 38, blue), text(`${country} / ${worker.title}`, 564, y + 7, 326, 28, 'title', '#FFFFFF'), text(`ACL interna · ${description}`, 564, y + 47, 326, 46),
        shape(1040, y, 176, 94), shape(1040, y, 176, 38, blue), text(erp, 1052, y + 7, 152, 28, 'title', '#FFFFFF'), text('Contrato por\nhomologar', 1052, y + 47, 152, 46),
        line(550, y + 55, 440, y + 55, false), text('HTTPS saliente', 368, y + 16, 174, 23, 'label'), line(904, y + 55, 1040, y + 55), text('Interfaz', 924, y + 12, 98, 22, 'label'), text('por validar', 912, y + 72, 122, 22, 'label'));
    }
    body.push(line(440, 561, 440, 337, false), line(440, 337, 360, 337), text('Trabajo y resultados', 372, 604, 230, 22, 'label'));
  } else throw new Error(`Unknown architecture view: ${slide.architectureView}`);
  return { ...slide, elements: [...chrome, ...body] };
}

export const prepareDeck = deck => ({ ...deck, slides: deck.slides.map(architectureSlide) });
