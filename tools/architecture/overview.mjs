import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { architecture } from './model.mjs';

// A curated application/deployment projection of the canonical architecture.
// Internal modules stay in the detailed C4 views. Titles and layout are editorial;
// application identities, technologies and boundary protocols come from the model.
const root = fileURLToPath(new URL('../../', import.meta.url));
const canonicalNodes = new Map(architecture.nodes.map(node => [node.id, node]));
const canonicalEdges = new Map(architecture.edges.map(edge => [edge.id, edge]));
const WIDTH = 3600;
const HEIGHT = 2650;
const colors = {
  app: { fill: '#edf4ff', stroke: '#4778c8', accent: '#0545BA' },
  data: { fill: '#f1edf9', stroke: '#9983b7', accent: '#684195' },
  external: { fill: '#fff5df', stroke: '#c49a42', accent: '#815d16' },
  infra: { fill: '#eef5f3', stroke: '#709c91', accent: '#276b58' },
};
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function wrap(value, limit) {
  const lines = [''];
  for (const word of value.split(/\s+/)) {
    const last = lines.length - 1;
    if (lines[last] && lines[last].length + word.length + 1 > limit) lines.push(word);
    else lines[last] += (lines[last] ? ' ' : '') + word;
  }
  return lines;
}

function item(id, x, y, w, h, title, lines, options = {}) {
  if (!canonicalNodes.has(id)) throw new Error(`Unknown architecture node: ${id}`);
  const base = canonicalNodes.get(id);
  const technologyLines = wrap(base.technology, Math.floor((w - 44) / 12));
  const titleLines = options.titleLines ?? [title];
  const contentBottom = (base.appId ? 155 : 126 + (titleLines.length - 1) * 31) + (technologyLines.length - 1) * 29 + (lines.length - 1) * 29 + 20;
  return { id, x, y, w, h: Math.max(h, contentBottom), title, lines, optional: false, ...options,
    kind: base.kind, app: base.appId, technology: base.technology, technologyLines };
}
function link(id, refs, from, to, points, label, labelBox, options = {}) {
  for (const ref of refs) if (!canonicalEdges.has(ref)) throw new Error(`Unknown architecture relationship: ${ref}`);
  const endpoint = id => canonicalNodes.get(id)?.owner ?? id;
  const boundary = refs.map(ref => canonicalEdges.get(ref)).filter(edge => endpoint(edge.from) !== endpoint(edge.to));
  if (!boundary.length || boundary.some(edge => endpoint(edge.from) !== from || endpoint(edge.to) !== to)) throw new Error(`Invalid overview relationship projection: ${id}`);
  const protocol = [...new Set(boundary.map(edge => edge.protocolLabel))].join(' / ');
  return { optional: false, ...options, id, refs, from, to, points, label, protocol, labelBox };
}

export const overview = {
  width: WIDTH, height: HEIGHT,
  nodes: [
    item('mobile', 300, 330, 430, 165, 'POS móvil', ['Operaciones móviles habilitadas'], {}),
    item('desktop', 300, 720, 430, 165, 'POS de escritorio', ['Venta, caja y atención al cliente'], {}),
    item('bridge', 300, 1020, 430, 180, 'Servicio de periféricos', ['Ejecuta trabajos y reporta resultados'], {}),
    item('device-journal', 100, 1460, 280, 250, 'Base local de trabajos', ['Estados e intentos', 'Resultados pendientes'], { kind: 'data', titleLines:['Base local','de trabajos'],  }),
    item('devices', 450, 1460, 280, 250, 'Periféricos del puesto', ['Recibos, etiquetas', 'y lectura de cheques'], { kind: 'external', titleLines:['Periféricos','del puesto'],  }),
    item('branch-api', 1090, 720, 500, 235, 'API de sucursal', ['Ventas, caja, cobros y devoluciones', 'Cotización, permisos y dispositivos', 'Autoridad de negocio de la sucursal'], {}),
    item('branch-db', 1090, 1240, 500, 200, 'Base de datos de sucursal', ['Operación, auditoría y trabajos de dispositivos', 'Inbox / outbox · progreso de sincronización', 'Espejos locales: catálogo, precios y ofertas'], { kind: 'data' }),
    item('branch-sync', 1090, 1690, 500, 210, 'Sincronizador de sucursal', ['Entrega operaciones y recupera acuses', 'Descarga y activa versiones comerciales'], {}),
    item('country-api', 2010, 970, 500, 235, 'API de país', ['Recibe operaciones y publica versiones', 'BullMQ crea solicitudes fuera de HTTP', 'Asigna trabajo ERP y recibe resultados'], {}),
    item('country-db', 2010, 1500, 500, 200, 'Base de datos de país', ['Recepciones, proyecciones e inbox / outbox', 'Versiones comerciales y trabajo ERP', 'Resultados y referencias de integración'], { kind: 'data' }),
    item('redis-cache', 2010, 310, 500, 175, 'Caché de consultas', ['Lecturas derivadas con caducidad', 'Reconstruible desde PostgreSQL'], { kind: 'data', optional: true, badge: 'OPCIONAL' }),
    item('country-redis-jobs', 2010, 610, 500, 170, 'Trabajos técnicos de país', ['Programación y solicitudes de publicación', 'Persistencia y noeviction · separado de caché'], { kind: 'data' }),
    item('erp-worker', 2930, 970, 500, 235, 'Integrador ERP', ['Traduce contratos y concilia resultados', 'BullMQ ejecuta jobs y preparación por lotes', 'Reclama al ejecutar; identidad estable'], {}),
    item('redis-jobs', 2930, 610, 500, 170, 'Trabajos técnicos de ERP', ['Ejecución, lotes y consultas de conciliación', 'Persistencia y noeviction · aislado de país'], { kind: 'data' }),
    item('erp', 2930, 1420, 500, 200, 'ERP correspondiente al país', ['Chile: Dynamics AX', 'Perú: ICS / desarrollo propio', 'España: Gira'], { kind: 'external' }),
    item('masters', 2930, 1770, 500, 180, 'Fuentes de maestros comerciales', ['Catálogo, precios y promociones', 'ERP u otros sistemas autorizados'], { kind: 'external' }),
    item('network-devices', 100, 2100, 630, 200, 'Periféricos de red compartidos', ['F06: impresoras de recibos o etiquetas seleccionadas', 'Mismo servicio; estación Windows autorizada', 'Acceso móvil y entre puestos después de homologar'], { kind: 'external', optional: true, badge: 'F06 · POSTERIOR' }),
    item('payments', 1090, 2100, 500, 200, 'Proveedor de pagos', ['Ejemplos: Transbank POS · Niubiz', 'Cobro, consulta y conciliación por contrato', 'Terminal local: homologación independiente'], { kind: 'external', optional: true, badge: 'POR HOMOLOGAR' }),
    item('fiscal', 2010, 2100, 500, 200, 'Proveedor de facturación', ['CL: Acepta / Ingydev · PE: EFACT', 'ES: Gira · modalidad por validar', 'Proveedor y autoridad tributaria son distintos'], { kind: 'external', optional: true, badge: 'POR HOMOLOGAR' }),
  ],
  edges: [
    link('mobile-api', ['mobile-api'], 'mobile', 'branch-api', [[730,412],[850,412],[850,660],[1200,660],[1200,720]], ['Ejecutar operaciones móviles', 'y consultar datos del POS'], [835,530,390,100]),
    link('desktop-api', ['desktop-api'], 'desktop', 'branch-api', [[730,802],[1090,802]], ['Registrar operaciones', 'y consultar datos del POS'], [752,705,316,89]),
    link('service-api', ['device-command','device-execution-permit','bridge-evidence'], 'bridge', 'branch-api', [[730,1110],[1010,1110],[1010,900],[1090,900]], ['Obtener trabajo y permiso', 'único; reportar resultados'], [750,1140,270,125]),
    link('local-work', ['agent-journal'], 'bridge', 'device-journal', [[300,1140],[240,1140],[240,1460]], ['Guardar y recuperar', 'trabajos, intentos', 'y resultados'], [91,1250,298,125]),
    link('local-hardware', ['hardware-command'], 'bridge', 'devices', [[590,1200],[590,1460]], ['Imprimir documentos', 'y ejecutar lecturas', 'autorizadas'], [440,1250,300,125]),
    link('branch-storage', ['commit-local','read-prices','device-jobs-local'], 'branch-api', 'branch-db', [[1340,955],[1340,1240]], ['Consultar datos; registrar operación,', 'auditoría, outbox y trabajos'], [1110,1060,460,100]),
    link('sync-storage', ['sync-local'], 'branch-sync', 'branch-db', [[1340,1690],[1340,1440]], ['Consultar pendientes y registrar avances;', 'actualizar espejos comerciales'], [1100,1525,480,100]),
    link('sync-country', ['sync-country'], 'branch-sync', 'country-api', [[1590,1785],[1810,1785],[1810,1120],[2010,1120]], ['Enviar operaciones;', 'consultar acuses y descargar', 'versiones comerciales'], [1635,1370,350,125]),
    link('country-storage', ['accept-country','persist-work','publish-version'], 'country-api', 'country-db', [[2260,1205],[2260,1500]], ['Registrar recepciones, publicaciones', 'y resultados; consultar datos de país'], [2020,1310,480,100]),
    link('country-cache', ['cache-read'], 'country-api', 'redis-cache', [[2010,1000],[1950,1000],[1950,550],[2260,550],[2260,485]], ['Consultar y reconstruir lecturas derivadas'], [2010,510,500,80], { optional: true }),
    link('country-jobs', ['country-job-library','country-job-store'], 'country-api', 'country-redis-jobs', [[2260,970],[2260,780]], ['Persistir programación,', 'jobs e intentos técnicos'], [2055,825,410,100]),
    link('erp-country', ['claim-report','submit-publication'], 'erp-worker', 'country-api', [[2930,1055],[2510,1055]], ['Obtener trabajo; reportar resultados', 'y entregar maestros preparados'], [2534,947,372,100]),
    link('erp-jobs', ['worker-library','queue-store'], 'erp-worker', 'redis-jobs', [[3180,970],[3180,780]], ['Persistir jobs, intentos y progreso'], [2955,835,450,80]),
    link('erp-system', ['send-erp'], 'erp-worker', 'erp', [[3180,1205],[3180,1420]], ['Registrar operaciones', 'y consultar su resultado'], [2940,1260,480,100]),
    link('master-source', ['fetch-source'], 'erp-worker', 'masters', [[2930,1150],[2780,1150],[2780,1860],[2930,1860]], ['Obtener catálogo,', 'precios y ofertas'], [2615,1650,290,100]),
    link('payments-api', ['payment-api'], 'branch-api', 'payments', [[1090,840],[1045,840],[1045,2060],[1340,2060],[1340,2100]], ['Solicitar cobros y consultar resultados'], [1090,1940,500,90], { optional: true }),
    link('fiscal-api', ['fiscal-api'], 'branch-api', 'fiscal', [[1590,845],[1620,845],[1620,2050],[2260,2050],[2260,2100]], ['Emitir documentos y consultar estado fiscal'], [2010,1940,500,90], { optional: true }),
    link('network-hardware', ['network-hardware-command'], 'bridge', 'network-devices', [[300,1080],[75,1080],[75,2010],[415,2010],[415,2100]], ['F06: controlar impresoras de red', 'con asignación y permisos compartidos'], [92,1870,650,100], { optional: true }),
  ],
};

const nodeIndex = new Map(overview.nodes.map(node => [node.id,node]));
for (const edge of overview.edges) {
  if (!nodeIndex.has(edge.from) || !nodeIndex.has(edge.to)) throw new Error(`Invalid overview endpoints: ${edge.id}`);
}
const apps = overview.nodes.filter(node => node.app);
if (apps.length !== 7 || new Set(apps.map(node => node.app)).size !== 7) throw new Error('Overview must preserve seven application types.');
if (overview.nodes.some(node => node.kind === 'component')) throw new Error('Overview cannot expose internal modules.');

function text(x, y, value, css, extra = '') {
  return `<text x="${x}" y="${y}" class="${css}" ${extra}>${esc(value)}</text>`;
}
function multiline(x, y, lines, css, step = 30, extra = '') {
  return lines.map((line,index) => text(x,y + index * step,line,css,extra)).join('');
}
function group(x, y, w, h, number, title, subtitle) {
  return `<g class="zone"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#f8faff" stroke="#bfd0e7" stroke-width="2"/>` +
    `<path d="M${x+10},${y}H${x+w-10}Q${x+w},${y} ${x+w},${y+10}V${y+74}H${x}V${y+10}Q${x},${y} ${x+10},${y}" fill="#e2ecff"/>` +
    text(x+22,y+32,`${number}  ${title}`,'zone-title') + text(x+22,y+58,subtitle,'zone-subtitle') + '</g>';
}
function subGroup(x,y,w,h,title) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#fff" stroke="#c6d4e6" stroke-width="2"/>` + text(x+20,y+32,title,'host-label');
}
function card(node) {
  const color = colors[node.kind] ?? colors.app;
  const badge = node.badge;
  const types = { app: 'APLICACIÓN', data:'ALMACÉN DE DATOS', external:'SISTEMA / DISPOSITIVO', infra:'INFRAESTRUCTURA' };
  const type = node.app ? 'APLICACIÓN' : types[node.kind];
  const inset = 22;
  let output = `<g id="${node.id}" data-node="${node.id}" data-kind="${node.app ? 'app' : node.kind}" data-x="${node.x}" data-y="${node.y}" data-w="${node.w}" data-h="${node.h}">`;
  const detail = [node.title, node.app, node.technology, ...node.lines].filter(Boolean).join('. ');
  output += `<title>${esc(detail)}</title><rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="7" fill="${color.fill}" stroke="${color.stroke}" stroke-width="2" ${node.optional ? 'stroke-dasharray="10 6"' : ''}/>`;
  output += `<rect x="${node.x}" y="${node.y+10}" width="5" height="${node.h-20}" rx="2" fill="${color.accent}"/>`;
  output += text(node.x+inset,node.y+25,type,'type',`fill="${color.accent}"`);
  if (badge) output += text(node.x+node.w-17,node.y+25,badge,'badge','text-anchor="end"');
  const titleLines = node.titleLines ?? [node.title];
  output += multiline(node.x+inset,node.y+60,titleLines,'card-title',31);
  if (node.app) {
    output += text(node.x+inset,node.y+91,node.app,'app-id');
    output += multiline(node.x+inset,node.y+122,node.technologyLines,'technology',29);
    output += multiline(node.x+inset,node.y+155+(node.technologyLines.length-1)*29,node.lines,'body',29);
  } else {
    const technologyLines = node.technologyLines ?? [node.technology];
    const technologyY = node.y+93+(titleLines.length-1)*31;
    output += multiline(node.x+inset,technologyY,technologyLines,'technology',29);
    output += multiline(node.x+inset,technologyY+33+(technologyLines.length-1)*29,node.lines,'body',29);
  }
  return output + '</g>';
}
function route(edge) {
  const d = edge.points.map(([x,y],i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const stroke = edge.optional ? '#7b8a9e' : '#245b91';
  const dash = edge.optional ? 'stroke-dasharray="12 8"' : '';
  return `<g data-edge="${edge.id}" data-from="${edge.from}" data-to="${edge.to}"><title>${esc([...edge.label,edge.protocol].join('. '))}</title>` +
    `<path d="${d}" fill="none" stroke="#fff" stroke-width="11" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" ${dash} marker-end="url(#${edge.optional ? 'arrow-optional' : 'arrow'})"/></g>`;
}
function edgeLabel(edge) {
  const [x,y,w,h] = edge.labelBox;
  return `<g data-label="${edge.id}" data-x="${x}" data-y="${y}" data-w="${w}" data-h="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#fff" fill-opacity="0.97"/>` +
    multiline(x+w/2,y+25,edge.label,'edge-label',27,'text-anchor="middle"') +
    text(x+w/2,y+25+edge.label.length*27,edge.protocol,'edge-protocol','text-anchor="middle"') + '</g>';
}

export function renderOverview() {
  const styles = `text{font-family:Arial,Helvetica,sans-serif;fill:#172b47} .title{font-size:45px;font-weight:700;fill:#0545BA}.subtitle{font-size:25px;fill:#506580}.eyebrow{font-size:17px;font-weight:700;letter-spacing:1.2px;fill:#0545BA}.zone-title{font-size:24px;font-weight:700;fill:#173e78}.zone-subtitle{font-size:19px;fill:#47627e}.host-label{font-size:21px;font-weight:700;fill:#536882}.type{font-size:14px;font-weight:700;letter-spacing:.7px}.badge{font-size:14px;font-weight:700;fill:#6a5c38}.card-title{font-size:27px;font-weight:700}.card-title.small{font-size:21px}.app-id{font-size:24px;font-family:Consolas,'Courier New',monospace;fill:#0545BA}.technology{font-size:22px;font-weight:600;fill:#465d78}.technology.small{font-size:18px}.body{font-size:21px;fill:#314763}.body.small{font-size:18px}.edge-label{font-size:21px;font-weight:600;fill:#2d4865}.edge-protocol{font-size:18px;fill:#596f88}.legend{font-size:20px;fill:#38536d}.note-title{font-size:23px;font-weight:700;fill:#173e78}.note{font-size:22px;fill:#38536d}.footer{font-size:18px;fill:#61728a}`;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="diagram-title diagram-description"><title id="diagram-title">POS Platform · arquitectura general de aplicaciones y despliegue</title><desc id="diagram-description">Siete tipos de aplicación. POS móvil y escritorio, servicio de periféricos con SQLite, branch-api y sincronizador con PostgreSQL de sucursal, country-api con PostgreSQL de país e integrador ERP en su red autorizada. BullMQ y Redis jobs dedicados a país y ERP son dependencias seleccionadas; Redis caché sigue opcional. Muestra proveedores y expansión F06 de periféricos de red. Flechas con propósito y protocolo; sin módulos internos. Propuesta, no inventario de capacidades implementadas.</desc><metadata>Projection of tools/architecture/model.mjs. Source: tools/architecture/overview.mjs. Technical identities and protocols inherited from the canonical model. Proposed architecture.</metadata><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0L10 5L0 10Z" fill="#245b91"/></marker><marker id="arrow-optional" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0L10 5L0 10Z" fill="#7b8a9e"/></marker><style>${styles}</style></defs><rect width="${WIDTH}" height="${HEIGHT}" fill="#fff"/>`;
  svg += text(40,43,'ARQUITECTURA PROPUESTA · VISTA GENERAL','eyebrow');
  svg += text(40,103,'POS Platform · aplicaciones, datos y conexiones','title');
  svg += text(40,148,'Producto corporativo para Chile, Perú y España · 7 tipos de aplicación · sin módulos internos','subtitle');
  svg += text(2370,48,'Las flechas indican quién inicia la interacción.','legend');
  svg += text(2370,79,'Las respuestas están implícitas; los cruces no son uniones.','legend');
  svg += `<path d="M2370 113H2420" stroke="#245b91" stroke-width="3" marker-end="url(#arrow)"/>` + text(2435,120,'Relación propuesta','legend');
  svg += `<path d="M2720 113H2770" stroke="#7b8a9e" stroke-width="3" stroke-dasharray="10 6" marker-end="url(#arrow-optional)"/>` + text(2785,120,'Opcional / posterior / por homologar','legend');

  svg += group(40,200,760,1820,'01','CLIENTES Y PERIFÉRICOS','Móvil separado del PC Windows de cada caja');
  svg += group(960,200,760,1820,'02','SERVIDOR DE SUCURSAL','Compartido por los puestos · red local disponible');
  svg += group(1880,200,760,1820,'03','PLATAFORMA DE PAÍS','Aislamiento por país y empresa · servicio central');
  svg += group(2800,200,760,1820,'04','RED AUTORIZADA DEL ERP','Conectores y fuentes homologadas por país');
  svg += subGroup(60,295,710,245,'Dispositivo Android / iOS');
  svg += subGroup(60,640,710,1100,'Puesto Windows · una instalación por caja (F02 / F05)');
  svg += text(1090,350,'Operación local de la sucursal','note-title');
  svg += multiline(1090,390,['El cliente usa la API, sin acceso SQL directo.','La venta y su outbox se confirman juntas.','El servicio de periféricos solicita trabajos.','Sin WAN: requiere LAN y servidor disponibles.'],'note',35);
  svg += text(2930,350,'Integración por contrato','note-title');
  svg += multiline(2930,390,['El worker inicia la comunicación con país.','El ERP conserva su frontera de acceso.','Cada operación usa el destino de su país.'],'note',35);
  svg += multiline(2010,1790,['PostgreSQL conserva negocio, inbox y outbox.','El relay reconstruye jobs con identidad estable.','No se comparte Redis ni PostgreSQL por WAN.','Un job no autoriza repetir un efecto incierto.','BullMQ está seleccionado; falta implementarlo.'],'footer',28);

  // Edge underlays isolate crossings. Labels are placed in reserved corridors,
  // then checked in Chromium against the actual font metrics and node bounds.
  svg += overview.edges.map(route).join('');
  svg += overview.nodes.map(card).join('');
  svg += overview.edges.map(edgeLabel).join('');

  svg += multiline(2930,2110,['La ruta de pago depende del contrato:','API remota o terminal / SDK local.','No ejecutar ambas para el mismo intento.','','Los proveedores son ejemplos de las fuentes;','el soporte debe homologarse por país/modelo.'],'note',33);
  svg += `<rect x="40" y="2350" width="3520" height="130" rx="8" fill="#f1f5fb" stroke="#c7d4e4" stroke-width="2"/>`;
  svg += text(65,2390,'OPERACIÓN TRANSVERSAL','eyebrow');
  svg += text(65,2435,'Logs, métricas y trazas correlacionadas · Pino en Node.js; telemetría .NET en periféricos · Sentry opcional · diagnóstico sin datos sensibles','note');
  svg += text(65,2465,'Aplicado a las aplicaciones; se resume aquí para no cruzar el mapa con una conexión de telemetría por proceso.','footer');
  svg += text(40,2535,'F02: periféricos por puesto  →  F05: piloto de ese perfil  →  F06: dispositivos de red y uso compartido, incluido móvil','note-title');
  svg += text(40,2580,'Todos los bloques representan la arquitectura objetivo. La disponibilidad real, la ejecución fiscal y los adaptadores de hardware requieren implementación y validación.','footer');
  svg += text(40,2615,'Fuente: POS Docs · Modelo C4, contratos de sincronización, publicación de maestros y dispositivos · SVG vectorial, sin imágenes incrustadas ni fuentes externas.','footer');
  return svg + '</svg>\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destination = path.join(root,'docs/architecture/pos-platform-overview.svg');
  fs.writeFileSync(destination,renderOverview(),'utf8');
  console.log(`Overview SVG: ${overview.nodes.length} elements, ${overview.edges.length} connections, seven applications. ${destination}`);
}
