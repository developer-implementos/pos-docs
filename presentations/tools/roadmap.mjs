import assert from 'node:assert/strict';
import { renderRoadmapMatrix, phasePlanHref } from '../../tools/roadmap.mjs';

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const phaseCode = phase => `F${String(phase.number).padStart(2, '0')}`;
const lanes = [
  { key: 'operation', label: 'Operación' },
  { key: 'construction', label: 'Construcción' },
  { key: 'acceptance', label: 'Aceptación' },
];

/** One Reveal slide, with two native-fragment views of the canonical matrix. */
export function roadmapView(roadmap) {
  assert.equal(roadmap.phases.length, 6, 'The roadmap overview requires six phases');
  const groups = [roadmap.phases.slice(0, 3), roadmap.phases.slice(3, 6)];
  const groupLabel = phases => `Fases ${String(phases[0].number).padStart(2, '0')}–${String(phases.at(-1).number).padStart(2, '0')}`;
  const markup = `<div class="roadmap-tour" aria-label="Roadmap por fases y frentes de trabajo">
    <nav class="roadmap-nav" aria-label="Fases del roadmap">${groups.map((phases, index) => `<button type="button" data-roadmap-step="${index}" aria-controls="roadmap-panel-${index}"${index === 0 ? ' aria-current="step"' : ''}>${groupLabel(phases)}</button>`).join('')}<span class="roadmap-proposal-status">${escape(roadmap.statusLabel)}</span></nav>
    <p class="visually-hidden" data-roadmap-announcement aria-live="polite" aria-atomic="true">${groupLabel(groups[0])}</p>
    ${groups.map((phases, index) => `<div id="roadmap-panel-${index}" class="roadmap-panel" data-roadmap-panel="${index}"${index ? ' hidden' : ''}>${renderRoadmapMatrix(phases, { id: `roadmap-slide-matrix-${index}`, mode: 'slide' })}</div>`).join('')}
    <span class="fragment custom roadmap-fragment" data-fragment-index="0" aria-hidden="true"></span>
  </div>`;
  // Printing shows every phase regardless of the currently selected fragment.
  // Detailed acceptance evidence remains on the following three slides.
  const print = `<div class="roadmap-print" aria-label="Resumen de las seis fases del roadmap">${roadmap.phases.map(phase => `<div class="roadmap-print-phase" data-phase="${phase.id}"><span class="roadmap-print-number">${phaseCode(phase)}</span><h3>${escape(phase.title)}</h3><p>${escape(phase.summary)}</p></div>`).join('')}</div>`;
  const reading = `<div class="roadmap-reading-overview"><p><strong>${escape(roadmap.statusLabel)}.</strong> ${escape(roadmap.notice)}</p><p><strong>Punto de partida:</strong> ${escape(roadmap.baseline)}</p><ol>${roadmap.phases.map(phase => `<li><h3><a href="#roadmap-reading-${phase.id}">${phaseCode(phase)} · ${escape(phase.title)}</a></h3><p>${escape(phase.summary)}</p></li>`).join('')}</ol><p><a href="/guide/proposal/roadmap/">Roadmap completo y criterios de avance</a></p></div>`;
  return { markup, reading, print };
}

/** Two phases per detail slide; prose comes from the same source as Starlight. */
export function roadmapPairView(phases) {
  assert.equal(phases.length, 2, 'A roadmap detail slide requires two phases');
  const markup = `<div class="roadmap-pair">${phases.map(phase => `<div class="roadmap-pair-phase" data-roadmap-phase="${phase.id}" role="group" aria-labelledby="roadmap-pair-${phase.id}"><h3 id="roadmap-pair-${phase.id}"><span class="roadmap-phase-code">${phaseCode(phase)}</span>${escape(phase.title)}<a class="phase-plan-link" href="${phasePlanHref(phase)}" target="_blank" rel="noopener" aria-label="Entregables y aceptación de ${phaseCode(phase)}">Ver plan</a></h3>${lanes.map(lane => `<div class="roadmap-pair-lane" data-row="${lane.key}"><h4>${lane.label} <span>· ${escape(phase[lane.key].title)}</span></h4><p>${escape(phase[lane.key].slideDetail)}</p></div>`).join('')}</div>`).join('')}</div>`;
  const reading = `<div class="roadmap-reading-pair">${phases.map(phase => `<section id="roadmap-reading-${phase.id}" class="roadmap-reading-phase"><h3>${phaseCode(phase)} · ${escape(phase.title)}</h3><p>${escape(phase.summary)}</p><dl>${lanes.map(lane => `<div><dt>${lane.label} · ${escape(phase[lane.key].title)}</dt><dd>${escape(phase[lane.key].detail)}</dd></div>`).join('')}</dl><p><a href="${phasePlanHref(phase)}">Entregables y aceptación de ${phaseCode(phase)}</a></p><ul aria-label="Fuentes de ${phaseCode(phase)}">${phase.links.map(link => `<li><a href="${escape(link.href)}">${escape(link.label)}</a></li>`).join('')}</ul></section>`).join('')}</div>`;
  return { markup, reading };
}
