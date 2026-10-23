const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const drawing = $('#drawing'), viewport = $('#viewport'), inspector = $('#inspector');
const details = new Map($$('[data-detail]').map(card => [card.dataset.detail, card]));
const scenarios = new Map($$('[data-scenario-panel]').map(panel => [panel.dataset.scenarioPanel, panel]));
const templates = new Map($$('template[data-map-view]').map(template => [template.dataset.mapView, template]));
const viewSelect = $('#view'), scenarioSelect = $('#scenario'), search = $('#search');
const options = $('#map-options'), optionsToggle = $('#options-toggle'), inspectorToggle = $('#toggle-inspector');
const viewIds = new Set([...viewSelect.options].map(option => option.value));
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let items = new Map(), nativeWidth = 1, nativeHeight = 1, mapKey = '', scale = 1, fitting = true, fitWhole = false;
let state = { view: 'base', scenario: null, step: 1, detail: null }, filter = 'node', resizeFrame, appliedUrl, feedbackTimer;
const announce = text => { $('#announcement').textContent = text; };
function feedback(text) {
  announce(text);
  const toast = $('#feedback'); toast.textContent = text; toast.hidden = false;
  clearTimeout(feedbackTimer); feedbackTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}
function closeOptions({ returnFocus = true } = {}) {
  if (options.matches(':popover-open')) options.hidePopover();
  if (returnFocus) optionsToggle.focus({ preventScroll: true });
}

function readLocation() {
  const url = new URL(location.href), view = viewIds.has(url.searchParams.get('view')) ? url.searchParams.get('view') : 'base';
  const scenario = scenarios.has(url.searchParams.get('scenario')) ? url.searchParams.get('scenario') : null;
  const count = scenario ? scenarios.get(scenario).querySelectorAll('[data-step]').length : 1;
  const rawStep = Number(url.searchParams.get('step'));
  const step = Number.isInteger(rawStep) ? Math.max(1, Math.min(count, rawStep)) : 1;
  let detail; try { detail = decodeURIComponent(url.hash.replace(/^#(?:detail-)?/, '')); } catch { detail = null; }
  return { view, scenario, step, detail: details.has(detail) ? detail : null };
}
function writeLocation(replace = false) {
  const url = new URL(location.href);
  for (const key of ['view', 'scenario', 'step']) url.searchParams.delete(key);
  if (state.view !== 'base') url.searchParams.set('view', state.view);
  if (state.scenario) { url.searchParams.set('scenario', state.scenario); url.searchParams.set('step', state.step); }
  url.hash = state.detail ? `detail-${state.detail}` : '';
  if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState'](null, '', url);
  appliedUrl = location.href;
}
function openInspector(open) {
  const restoreFocus = !open && inspector.contains(document.activeElement);
  $('.explorer').classList.toggle('has-inspector', open);
  inspector.hidden = !open;
  inspectorToggle.setAttribute('aria-expanded', String(open));
  inspectorToggle.setAttribute('aria-label', open ? 'Ocultar detalles' : 'Explorar elementos');
  inspectorToggle.title = open ? 'Ocultar detalles' : 'Explorar elementos';
  $('#toggle-inspector-label').textContent = open ? 'Detalles' : 'Explorar';
  if (restoreFocus) inspectorToggle.focus({ preventScroll: true });
}
function mount(key) {
  if (mapKey === key) return false;
  const template = templates.get(key); if (!template) throw new Error(`Unknown architecture view: ${key}`);
  drawing.replaceChildren(template.content.cloneNode(true)); mapKey = key;
  drawing.dataset.view = key;
  items = new Map([...drawing.querySelectorAll('[data-item-id]')].map(item => [item.dataset.itemId, item]));
  const box = drawing.querySelector('svg').viewBox.baseVal; nativeWidth = box.width; nativeHeight = box.height;
  fitting = true; fitWhole = false; return true;
}
function scaleTo(value, keepCenter = true) {
  const center = { x: (viewport.scrollLeft + viewport.clientWidth / 2) / scale, y: (viewport.scrollTop + viewport.clientHeight / 2) / scale };
  scale = Math.max(.08, Math.min(1.8, value));
  drawing.style.width = `${nativeWidth * scale}px`; drawing.style.height = `${nativeHeight * scale}px`;
  $('#zoom-label').textContent = `${Math.round(scale * 100)} %`;
  $('#zoom-out').disabled = scale <= .08; $('#zoom-in').disabled = scale >= 1.8;
  if (keepCenter) viewport.scrollTo({ left: center.x * scale - viewport.clientWidth / 2, top: center.y * scale - viewport.clientHeight / 2 });
}
function fit({ whole = fitWhole } = {}) {
  fitting = true; fitWhole = whole;
  const style = getComputedStyle(viewport);
  const width = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const height = viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  // Base is fit to width so labels remain readable; scrolling preserves its vertical detail.
  scaleTo(Math.min(1, whole || mapKey !== 'base' ? Math.min(width / nativeWidth, height / nativeHeight) : width / nativeWidth), false);
  viewport.scrollTo({ top: 0, left: 0 });
}
function centerIds(ids, readable = false) {
  const boxes = ids.map(id => items.get(id)?.getBBox()).filter(Boolean); if (!boxes.length) return;
  const x = Math.min(...boxes.map(box => box.x)), y = Math.min(...boxes.map(box => box.y));
  const width = Math.max(...boxes.map(box => box.x + box.width)) - x, height = Math.max(...boxes.map(box => box.y + box.height)) - y;
  fitting = false;
  if (readable) scaleTo(Math.min(1, Math.min((viewport.clientWidth - 80) / Math.max(1, width), (viewport.clientHeight - 80) / Math.max(1, height))), false);
  const canvas = drawing.getBoundingClientRect(), region = viewport.getBoundingClientRect();
  viewport.scrollTo({ left: (x + width / 2) * scale + canvas.left - region.left + viewport.scrollLeft - viewport.clientWidth / 2, top: (y + height / 2) * scale + canvas.top - region.top + viewport.scrollTop - viewport.clientHeight / 2, behavior: 'instant' });
}
function highlight(selected, related = []) {
  const chosen = new Set(selected), neighbours = new Set(related);
  drawing.classList.toggle('is-focused', chosen.size > 0);
  for (const [id, item] of items) {
    item.classList.toggle('is-selected', chosen.has(id)); item.classList.toggle('is-related', neighbours.has(id));
    item.setAttribute('aria-pressed', String(chosen.has(id)));
  }
}
function filterIndex() {
  const query = normalize(search.value.trim()); let count = 0;
  for (const row of $$('[data-index-item]')) {
    row.hidden = row.dataset.kind !== filter || !normalize(row.dataset.search).includes(query);
    if (!row.hidden) count++;
  }
  $('#result-count').textContent = count ? `${count} ${filter === 'node' ? 'elementos' : 'conexiones'}` : 'Sin resultados. Prueba otro nombre o tecnología.';
}
function revealActiveStep() {
  if (!state.scenario || state.detail || !['auto', 'scroll'].includes(getComputedStyle(inspector).overflowY)) return;
  const active = scenarios.get(state.scenario).querySelector('[data-step][aria-current="step"]');
  const panel = inspector.getBoundingClientRect(), step = active.getBoundingClientRect(), padding = 16;
  const topPadding = $('.inspector-tools').getBoundingClientRect().height + padding;
  // Scroll only the detail panel; the graph camera and mobile document position stay stable.
  if (step.top < panel.top + topPadding) inspector.scrollTop += step.top - panel.top - topPadding;
  else if (step.bottom > panel.bottom - padding) inspector.scrollTop += step.bottom - panel.bottom + padding;
}
function renderState({ focus = false, center = false, fromHistory = false } = {}) {
  let key = state.scenario ? `scenario-${state.scenario}-${state.step}` : state.view;
  const changed = mount(key);
  // Old detail URLs remain valid. A selection outside the projection opens its complete context.
  if (state.detail && !items.has(state.detail)) { state = { ...state, view: 'full', scenario: null, step: 1 }; key = 'full'; mount(key); }
  for (const panel of [...details.values(), ...scenarios.values()]) panel.hidden = true;
  $('#index-panel').hidden = Boolean(state.detail || state.scenario);
  $('#back-index').hidden = !state.detail && !state.scenario;
  $('#back-index').textContent = state.detail && state.scenario ? '← Volver al recorrido' : '← Explorar elementos';
  $('#copy-link').hidden = false; $('#focus-item').disabled = !state.detail;
  viewSelect.value = state.view; scenarioSelect.value = state.scenario ?? '';
  highlight([]);
  const viewTitle = viewSelect.selectedOptions[0].textContent;
  $('#view-description').textContent = state.scenario ? `${scenarioSelect.selectedOptions[0].textContent} · paso ${state.step}` : `${viewTitle}. Selecciona un elemento para consultar responsabilidades, datos y contratos.`;
  if (state.scenario) {
    const panel = scenarios.get(state.scenario), steps = [...panel.querySelectorAll('[data-step]')];
    panel.hidden = Boolean(state.detail);
    steps.forEach((step, index) => { if (index === state.step - 1) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current'); });
    panel.querySelector('[data-previous-step]').disabled = state.step === 1;
    panel.querySelector('[data-next-step]').disabled = state.step === steps.length;
    inspector.dataset.active = state.scenario;
    openInspector(true);
    announce(`Paso ${state.step} de ${steps.length}: ${steps[state.step - 1].querySelector('strong').textContent}`);
  }
  if (state.detail) {
    const card = details.get(state.detail); card.hidden = false; inspector.dataset.active = state.detail;
    const related = new Set();
    for (const [id, edge] of items) if (edge.dataset.from && (id === state.detail || edge.dataset.from === state.detail || edge.dataset.to === state.detail)) for (const relatedId of [id, edge.dataset.from, edge.dataset.to]) related.add(relatedId);
    highlight([state.detail], [...related]); openInspector(true);
    if (focus) card.querySelector('h2').focus({ preventScroll: true });
    announce(`Detalles: ${card.querySelector('h2').textContent}.`);
  } else if (!state.scenario) { inspector.dataset.active = 'index'; if (fromHistory || changed) openInspector(false); announce(`Vista: ${viewTitle}.`); }
  inspector.scrollTop = 0;
  requestAnimationFrame(() => { if (state.detail && (center || fromHistory || changed)) centerIds([state.detail], true); else if (changed || fromHistory) fit(); revealActiveStep(); });
}
function navigate(next, options = {}) { state = { ...state, ...next }; renderState(options); writeLocation(); }
function selectItem(id, focus = false) { if (details.has(id)) navigate({ detail: id }, { center: true, focus }); }
function changeStep(next) {
  const panel = scenarios.get(state.scenario); if (!panel) return;
  const count = panel.querySelectorAll('[data-step]').length;
  navigate({ detail: null, step: Math.max(1, Math.min(count, next)) });
}

// Enhancement only: SVG and all detail articles remain available without JavaScript.
document.documentElement.classList.add('js');
filterIndex();
for (const link of $$('[data-select]')) link.addEventListener('click', event => { event.preventDefault(); selectItem(link.dataset.select, true); });
drawing.addEventListener('click', event => { const item = event.target.closest('[data-item-id]'); if (item) selectItem(item.dataset.itemId); });
drawing.addEventListener('keydown', event => { if (!['Enter', ' '].includes(event.key)) return; const item = event.target.closest('[data-item-id]'); if (!item) return; event.preventDefault(); selectItem(item.dataset.itemId, true); });
for (const button of $$('[data-kind-filter]')) button.addEventListener('click', () => { filter = button.dataset.kindFilter; for (const item of $$('[data-kind-filter]')) item.setAttribute('aria-pressed', String(item === button)); filterIndex(); });
search.addEventListener('input', filterIndex);
$('#toggle-inspector').addEventListener('click', () => { const opening = inspector.hidden; openInspector(opening); if (opening && !state.detail && !state.scenario) search.focus({ preventScroll: true }); if (fitting) requestAnimationFrame(() => fit()); });
$('#close-inspector').addEventListener('click', () => { openInspector(false); inspectorToggle.focus({ preventScroll: true }); if (fitting) requestAnimationFrame(() => fit()); });
options.addEventListener('toggle', event => {
  optionsToggle.setAttribute('aria-expanded', String(event.newState === 'open'));
  // Light dismissal should not steal focus from a control the user just clicked.
  if (event.newState === 'closed' && options.contains(document.activeElement)) optionsToggle.focus({ preventScroll: true });
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || options.matches(':popover-open') || inspector.hidden) return;
  event.preventDefault(); openInspector(false); inspectorToggle.focus({ preventScroll: true });
  if (fitting) requestAnimationFrame(() => fit());
});
$('.skip-link').addEventListener('click', event => {
  event.preventDefault(); openInspector(true);
  const target = state.detail ? details.get(state.detail).querySelector('h2') : state.scenario ? scenarios.get(state.scenario).querySelector('[data-step][aria-current="step"]') : search;
  target.focus({ preventScroll: false });
});
$('#back-index').addEventListener('click', () => { if (state.detail && state.scenario) navigate({ detail: null }); else { navigate({ detail: null, scenario: null, step: 1 }); openInspector(true); search.focus({ preventScroll: true }); } });
$('#clear-selection').addEventListener('click', () => { closeOptions(); navigate({ view: 'base', scenario: null, step: 1, detail: null }); openInspector(false); fit(); });
$('#fit').addEventListener('click', () => fit({ whole: true }));
$('#actual').addEventListener('click', () => { fitting = false; scaleTo(1); });
$('#zoom-in').addEventListener('click', () => { fitting = false; scaleTo(scale * 1.3); });
$('#zoom-out').addEventListener('click', () => { fitting = false; scaleTo(scale / 1.3); });
$('#focus-item').addEventListener('click', () => { closeOptions({ returnFocus: false }); if (state.detail) centerIds([state.detail], true); viewport.focus({ preventScroll: true }); });
viewSelect.addEventListener('change', () => navigate({ view: viewSelect.value, scenario: null, step: 1, detail: null }));
scenarioSelect.addEventListener('change', () => { closeOptions(); navigate({ scenario: scenarioSelect.value || null, step: 1, detail: null }); if (state.scenario) scenarios.get(state.scenario).querySelector('[data-step][aria-current="step"]').focus({ preventScroll: true }); });
for (const step of $$('[data-step]')) step.addEventListener('click', () => changeStep(Number(step.dataset.step) + 1));
for (const button of $$('[data-previous-step]')) button.addEventListener('click', () => changeStep(state.step - 1));
for (const button of $$('[data-next-step]')) button.addEventListener('click', () => changeStep(state.step + 1));
for (const button of [$('#copy-link'), $('#copy-view')]) button.addEventListener('click', async () => { if (button.id === 'copy-view') closeOptions(); try { await navigator.clipboard.writeText(location.href); feedback('Enlace a esta vista copiado.'); } catch { feedback(`Enlace a esta vista: ${location.href}`); } });
$('#fullscreen').addEventListener('click', async () => { closeOptions(); try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { feedback('Este navegador no permite pantalla completa; el zoom del mapa sigue disponible.'); } });
document.addEventListener('fullscreenchange', () => { $('#fullscreen-label').textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa'; });
function restoreLocation() { if (appliedUrl === location.href) return; state = readLocation(); renderState({ fromHistory: true }); appliedUrl = location.href; }
window.addEventListener('popstate', restoreLocation); window.addEventListener('hashchange', restoreLocation);
new ResizeObserver(() => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => { if (fitting) fit(); }); }).observe(viewport);
requestAnimationFrame(() => { state = readLocation(); renderState({ fromHistory: true }); appliedUrl = location.href; document.documentElement.dataset.architectureReady = 'true'; });

let pan = null;
viewport.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('[data-item-id]')) return;
  pan = { id: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
  viewport.setPointerCapture(event.pointerId); viewport.classList.add('is-panning');
  viewport.focus({ preventScroll: true }); event.preventDefault();
});
viewport.addEventListener('pointermove', event => { if (!pan || pan.id !== event.pointerId) return; viewport.scrollLeft = pan.left - event.clientX + pan.x; viewport.scrollTop = pan.top - event.clientY + pan.y; });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) viewport.addEventListener(type, () => { pan = null; viewport.classList.remove('is-panning'); });
viewport.addEventListener('keydown', event => {
  if (event.target !== viewport) return;
  if (['+', '=', '-'].includes(event.key)) { event.preventDefault(); fitting = false; scaleTo(scale * (event.key === '-' ? 1 / 1.3 : 1.3)); }
  if (event.key === '0') { event.preventDefault(); fit({ whole: true }); }
  if (event.key === '1') { event.preventDefault(); fitting = false; scaleTo(1); }
});
