import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const lanes = [
  { key: 'operation', label: 'Operación' },
  { key: 'construction', label: 'Construcción' },
  { key: 'acceptance', label: 'Aceptación' },
];
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const escapeMarkdown = value => escape(value).replace(/[\\`*_\[\]~]/g, '\\$&');
const phaseCode = phase => `F${String(phase.number).padStart(2, '0')}`;
const localLink = /^\/(?:guide|presentations)\/(?:[a-z0-9-]+\/)*(?:#[a-z0-9][a-z0-9-]*)?$/;
const applications = new Set(['pos-desktop', 'pos-mobile', 'branch-api', 'branch-sync-worker', 'country-api', 'erp-worker']);
export const phasePlanHref = phase => `/guide/roadmap/${phase.id}/`;

function shape(value, keys, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} has missing or unsupported fields`);
}

function text(value, label, max = 3000) {
  assert.ok(typeof value === 'string' && value.trim() === value && value.length > 0, `${label} must be nonempty trimmed text`);
  assert.ok([...value].length <= max, `${label} exceeds ${max} characters`);
  assert.ok(!/[\u0000-\u001f\u007f]/u.test(value), `${label} must be plain text on one line`);
}

function textList(value, label, min = 1, max = 12) {
  assert.ok(Array.isArray(value) && value.length >= min && value.length <= max, `${label} must have ${min}–${max} entries`);
  for (const item of value) text(item, label);
  assert.equal(new Set(value).size, value.length, `${label} must not repeat entries`);
}

function validateDelivery(delivery, phase) {
  const label = `${phase.id} delivery`;
  shape(delivery, ['entry', 'work', 'validation', 'parallel', 'deferred', 'evidence', 'reviewers'], label);
  for (const field of ['entry', 'parallel', 'deferred', 'evidence', 'reviewers']) textList(delivery[field], `${label} ${field}`, 2, 6);
  assert.ok(Array.isArray(delivery.work) && delivery.work.length >= 3 && delivery.work.length <= 5, `${label} requires 3–5 work packages`);
  for (const [index, work] of delivery.work.entries()) {
    const workLabel = `${label} work ${index + 1}`;
    shape(work, ['id', 'title', 'apps', 'modules', 'deliverable', 'tasks'], workLabel);
    assert.equal(work.id, `${phaseCode(phase)}-${String(index + 1).padStart(2, '0')}`, `${workLabel} must have its ordered unique id`);
    text(work.title, `${workLabel} title`, 120);
    text(work.deliverable, `${workLabel} deliverable`);
    textList(work.apps, `${workLabel} apps`, 1, 6);
    for (const app of work.apps) assert.ok(applications.has(app), `${workLabel} has an unknown app: ${app}`);
    textList(work.modules, `${workLabel} modules`, 1, 12);
    for (const module of work.modules) assert.match(module, /^libs\/(?:[a-z][a-z0-9-]*\/)*[a-z][a-z0-9-]*\/?$/, `${workLabel} requires repository library paths`);
    textList(work.tasks, `${workLabel} tasks`, 2, 6);
  }
  assert.ok(Array.isArray(delivery.validation) && delivery.validation.length >= 4 && delivery.validation.length <= 8, `${label} requires 4–8 acceptance scenarios`);
  for (const validation of delivery.validation) {
    shape(validation, ['scenario', 'expected'], `${label} validation`);
    text(validation.scenario, `${label} scenario`);
    text(validation.expected, `${label} expected`);
  }
  assert.equal(new Set(delivery.validation.map(item => item.scenario)).size, delivery.validation.length, `${label} repeats acceptance scenarios`);
}

/** Validate the editorial plan, independently of either presentation framework. */
export function validateRoadmap(roadmap) {
  shape(roadmap, ['schemaVersion', 'title', 'reviewedOn', 'status', 'statusLabel', 'notice', 'baseline', 'phases'], 'Roadmap');
  assert.equal(roadmap.schemaVersion, 2, 'Unsupported roadmap schema');
  assert.equal(roadmap.status, 'proposed', 'Roadmap must identify these phases as a proposal');
  for (const field of ['title', 'statusLabel', 'notice', 'baseline']) text(roadmap[field], `Roadmap ${field}`);
  assert.match(roadmap.reviewedOn, /^\d{4}-\d{2}-\d{2}$/, 'Roadmap reviewedOn must be an ISO date');
  const reviewDate = new Date(`${roadmap.reviewedOn}T00:00:00Z`);
  assert.ok(Number.isFinite(reviewDate.getTime()) && reviewDate.toISOString().slice(0, 10) === roadmap.reviewedOn, 'Roadmap reviewedOn must be a real date');
  assert.ok(Array.isArray(roadmap.phases) && roadmap.phases.length === 6, 'Roadmap must contain the six agreed phases');
  const previousIds = new Set();
  for (const [index, phase] of roadmap.phases.entries()) {
    const label = `Roadmap phase ${index + 1}`;
    shape(phase, ['id', 'number', 'title', 'summary', 'operation', 'construction', 'acceptance', 'requires', 'links', 'delivery'], label);
    assert.equal(phase.number, index + 1, `${label} must be in order`);
    assert.equal(phase.id, `phase-${String(index + 1).padStart(2, '0')}`, `${label} must have its stable anchor`);
    text(phase.title, `${label} title`, 100);
    text(phase.summary, `${label} summary`, 500);
    for (const lane of lanes) {
      shape(phase[lane.key], ['title', 'summary', 'slideDetail', 'detail'], `${label} ${lane.key}`);
      text(phase[lane.key].title, `${label} ${lane.key} title`, 100);
      text(phase[lane.key].summary, `${label} ${lane.key} summary`, 85);
      text(phase[lane.key].slideDetail, `${label} ${lane.key} slideDetail`, 180);
      text(phase[lane.key].detail, `${label} ${lane.key} detail`);
    }
    assert.ok(Array.isArray(phase.requires), `${label} requires must be an array`);
    assert.equal(new Set(phase.requires).size, phase.requires.length, `${label} repeats a dependency`);
    for (const dependency of phase.requires) assert.ok(previousIds.has(dependency), `${label} requires an unknown, same or later phase: ${dependency}`);
    assert.ok(Array.isArray(phase.links) && phase.links.length > 0, `${label} must link its supporting documentation`);
    const links = new Set();
    for (const link of phase.links) {
      shape(link, ['label', 'href'], `${label} link`);
      text(link.label, `${label} link label`, 160);
      assert.ok(typeof link.href === 'string' && localLink.test(link.href), `${label} link must use a local guide or presentation route: ${link.href}`);
      assert.ok(!links.has(link.href), `${label} repeats a supporting link: ${link.href}`);
      links.add(link.href);
    }
    validateDelivery(phase.delivery, phase);
    previousIds.add(phase.id);
  }
  return roadmap;
}

export function loadRoadmap(root) {
  return validateRoadmap(JSON.parse(fs.readFileSync(path.join(root, 'docs/roadmap.json'), 'utf8')));
}

/** Same three-column, three-lane matrix for Starlight and Reveal. No client script. */
export function renderRoadmapMatrix(phases, { id, mode = 'docs' } = {}) {
  assert.match(id || '', /^[a-z][a-z0-9-]*$/, 'A stable matrix id is required');
  assert.ok(mode === 'docs' || mode === 'slide', 'Unsupported roadmap rendering mode');
  assert.ok(Array.isArray(phases) && phases.length === 3, 'A roadmap matrix contains exactly three phases');
  const caption = `Fases ${String(phases[0].number).padStart(2, '0')}–${String(phases.at(-1).number).padStart(2, '0')}`;
  const header = phases.map(phase => `<th id="${id}-${phase.id}" class="roadmap-phase" scope="col" data-phase="${phase.id}"><span class="roadmap-phase-number">${phaseCode(phase)}</span><span class="roadmap-phase-title">${escape(phase.title)}</span>${mode === 'docs' ? `<a class="roadmap-phase-link" href="#${phase.id}" aria-label="Ver detalle de ${phaseCode(phase)}: ${escape(phase.title)}">Ver detalle</a>` : ''}</th>`).join('');
  const rows = lanes.map(lane => `<tr data-row="${lane.key}"><th id="${id}-${lane.key}" scope="row" class="roadmap-row-label">${lane.label}</th>${phases.map(phase => `<td class="roadmap-cell" data-row="${lane.key}" data-phase="${phase.id}" headers="${id}-${lane.key} ${id}-${phase.id}"><div class="roadmap-card"><p class="roadmap-cell-title">${escape(phase[lane.key].title)}</p><p class="roadmap-cell-summary">${escape(phase[lane.key].summary)}</p></div></td>`).join('')}</tr>`).join('');
  return `<div class="roadmap-matrix-scroll"${mode === 'docs' ? ' tabindex="0"' : ''} role="region" aria-labelledby="${id}-caption"><table id="${id}" class="roadmap-matrix" data-mode="${mode}"><caption id="${id}-caption">${caption}</caption><thead><tr><th scope="col" class="roadmap-lane-heading">Frente</th>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

/** Markdown headings remain visible to Astro's native TOC; all data is escaped. */
export function renderRoadmapDocs(roadmap) {
  validateRoadmap(roadmap);
  const matrices = [roadmap.phases.slice(0, 3), roadmap.phases.slice(3, 6)]
    .map((phases, index) => renderRoadmapMatrix(phases, { id: `roadmap-board-${index + 1}` })).join('');
  const details = roadmap.phases.map(phase => {
    const dependencies = phase.requires.length
      ? phase.requires.map(id => { const target = roadmap.phases.find(item => item.id === id); return `<a href="#${id}">${phaseCode(target)} · ${escape(target.title)}</a>`; }).join(', ')
      : 'Primera fase del plan.';
    return `<article class="roadmap-phase-detail" aria-label="${phaseCode(phase)} · ${escape(phase.title)}" data-phase-detail="${phase.id}">\n\n### <span class="roadmap-phase-number" id="${phase.id}">${phaseCode(phase)}</span> ${escapeMarkdown(phase.title)}\n\n<p class="roadmap-phase-outcome">${escape(phase.summary)}</p><p><a data-phase-plan-link="${phase.id}" href="${phasePlanHref(phase)}">Plan de ${phaseCode(phase)}: entregables, aplicaciones y pruebas</a></p><dl class="roadmap-detail-lanes">${lanes.map(lane => `<div data-row="${lane.key}"><dt>${lane.label} · ${escape(phase[lane.key].title)}</dt><dd>${escape(phase[lane.key].detail)}</dd></div>`).join('')}</dl><p class="roadmap-dependencies"><strong>Dependencias de aceptación:</strong> ${dependencies}</p><ul class="roadmap-source-links" aria-label="Referencias de ${phaseCode(phase)}">${phase.links.map(link => `<li><a href="${escape(link.href)}">${escape(link.label)}</a></li>`).join('')}</ul></article>`;
  }).join('\n\n');
  const phaseIndex = `<nav class="roadmap-phase-index" aria-label="Planes detallados del roadmap"><ol>${roadmap.phases.map(phase => `<li><a href="${phasePlanHref(phase)}"><span>${phaseCode(phase)}</span><strong>${escape(phase.title)}</strong><small>${phase.delivery.work.length} entregables · ${phase.delivery.validation.length} pruebas de aceptación</small></a></li>`).join('')}</ol></nav>`;
  return `<div class="roadmap-docs" data-roadmap-status="${roadmap.status}"><p class="roadmap-status-line"><span class="roadmap-status">${escape(roadmap.statusLabel)}</span><span class="roadmap-review">Revisión editorial: <time datetime="${roadmap.reviewedOn}">${roadmap.reviewedOn}</time></span></p>${phaseIndex}<aside class="roadmap-plan-context" aria-label="Estado del roadmap"><p>${escape(roadmap.notice)}</p><p><strong>Punto de partida:</strong> ${escape(roadmap.baseline)}</p></aside>${matrices}<section class="roadmap-details" aria-label="Detalle por fase">\n\n<span id="detalle-por-fase"></span>\n\n## Resumen por fase\n\n${details}\n\n</section></div>`;
}

/** Per-phase delivery plans are generated from the same source as the overview and Reveal. */
export function renderRoadmapPhase(roadmap, phaseId) {
  validateRoadmap(roadmap);
  const phase = roadmap.phases.find(item => item.id === phaseId);
  assert.ok(phase, `Unknown roadmap phase: ${phaseId}`);
  const delivery = phase.delivery;
  const list = items => `<ul>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
  const dependencies = phase.requires.map(id => {
    const target = roadmap.phases.find(item => item.id === id);
    return `<a href="${phasePlanHref(target)}">${phaseCode(target)} · ${escape(target.title)}</a>`;
  }).join(', ') || 'No requiere una fase anterior.';
  const work = delivery.work.map(item => `<article class="roadmap-work-package" data-work-package="${item.id}" aria-labelledby="work-${item.id.toLowerCase()}"><h3 id="work-${item.id.toLowerCase()}"><span>${item.id}</span> ${escape(item.title)}</h3><dl class="roadmap-work-scope"><div><dt>Aplicaciones</dt><dd>${item.apps.map(app => `<code>apps/${app}</code>`).join(' ')}</dd></div><div><dt>Módulos del diseño objetivo</dt><dd>${item.modules.map(module => `<code>${escape(module)}</code>`).join(' ')}</dd></div></dl><p class="roadmap-deliverable"><strong>Entregable:</strong> ${escape(item.deliverable)}</p>${list(item.tasks)}</article>`).join('\n');
  const validation = `<dl class="roadmap-validation">${delivery.validation.map((item, index) => `<div data-roadmap-scenario="${index}"><dt><span>${phaseCode(phase)}-V${String(index + 1).padStart(2, '0')}</span> ${escape(item.scenario)}</dt><dd>${escape(item.expected)}</dd></div>`).join('')}</dl>`;
  const adjacent = [roadmap.phases[phase.number - 2], roadmap.phases[phase.number]].filter(Boolean);
  return `<div class="roadmap-docs roadmap-phase-plan" data-roadmap-phase-plan="${phase.id}">

<p class="roadmap-status-line"><span class="roadmap-status">Aceptación no acreditada</span><a href="/guide/implementation/repository/">Evidencia actual del producto</a></p>

${escapeMarkdown(phase.summary)} El alcance siguiente es propuesto; requiere acordar equipo, proveedores y configuración antes de estimar fechas. Los módulos indican dónde implementar cada responsabilidad según la [estructura objetivo](/guide/architecture/monorepo/).

<span id="entry-conditions"></span>

## Condiciones de entrada

<p><strong>Aceptación previa:</strong> ${dependencies}</p>

${list(delivery.entry)}

<span id="work-packages"></span>

## Entregables y trabajo por aplicación

${work}

## Pruebas de aceptación

Cada escenario debe ejecutarse en la versión y el entorno declarados. Las simulaciones permiten desarrollar el recorrido; la aceptación exige comprobar las garantías de los componentes reales del alcance.

${validation}

## Preparación en paralelo

${list(delivery.parallel)}

## Alcance posterior o condicionado

${list(delivery.deferred)}

<span id="acceptance-evidence"></span>

## Evidencia y decisión de cierre

${list(delivery.evidence)}

<p><strong>Participantes propuestos para revisar:</strong> ${delivery.reviewers.map(escape).join('; ')}. La asignación de personas queda pendiente.</p>

La fase se acepta para una configuración identificada cuando se cumplen los criterios anteriores y queda registrada la decisión con versión del producto, entorno, resultados y pendientes. Una carpeta, una pantalla mock o un build correcto no acreditan el recorrido. Las exclusiones modifican el alcance de la aprobación y deben quedar explícitas.

## Referencias del diseño

<ul class="roadmap-source-links">${phase.links.map(link => `<li><a href="${escape(link.href)}">${escape(link.label)}</a></li>`).join('')}</ul>

<nav class="roadmap-plan-navigation" aria-label="Continuar en el roadmap"><a href="/guide/proposal/roadmap/#${phase.id}">Visión general del roadmap</a>${adjacent.map(target => `<a href="${phasePlanHref(target)}">${phaseCode(target)} · ${escape(target.title)}</a>`).join('')}</nav>

</div>`;
}
