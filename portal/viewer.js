// One local PDF page at a time. Original Office files are downloaded only on request.
const root = document.querySelector('#material-viewer');
const viewport = document.querySelector('#pdf-viewport');
const container = document.querySelector('#pdf-page-container');
const pageInput = document.querySelector('#pdf-page');
const total = document.querySelector('#pdf-total');
const previous = document.querySelector('#pdf-previous');
const next = document.querySelector('#pdf-next');
const zoomOut = document.querySelector('#pdf-zoom-out');
const zoomIn = document.querySelector('#pdf-zoom-in');
const zoomLabel = document.querySelector('#pdf-zoom');
const fitButton = document.querySelector('#pdf-fit');
const status = document.querySelector('#pdf-status');
const errorPanel = document.querySelector('#pdf-error');
const errorMessage = document.querySelector('#pdf-error-message');
const retry = document.querySelector('#pdf-retry');
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const CSS_UNITS = 96 / 72;
const MAX_CANVAS_PIXELS = 8 * 1024 * 1024;
let modules = null;
let loadingTask = null;
let documentPdf = null;
let pageView = null;
let viewAbort = null;
let renderGeneration = 0;
let loadGeneration = 0;
let pageNumber = 1;
let scale = 1;
let fitWidth = true;
let failed = false;
let lastWidth = 0;
let resizeTimer;

function readHash() {
  const match = location.hash.match(/^#page=([1-9]\d*)$/);
  return match ? Number(match[1]) : 1;
}

function clampPage(value) {
  const pages = documentPdf?.numPages || Number(root.dataset.pages);
  return Math.max(1, Math.min(pages, Number.isSafeInteger(value) ? value : 1));
}

function setHash(replace = false) {
  const hash = `#page=${pageNumber}`;
  if (location.hash !== hash) history[replace ? 'replaceState' : 'pushState'](null, '', hash);
}

function updateControls() {
  const ready = Boolean(documentPdf) && !failed;
  pageInput.disabled = !ready;
  previous.disabled = !ready || pageNumber <= 1;
  next.disabled = !ready || pageNumber >= documentPdf.numPages;
  zoomOut.disabled = !ready || scale <= MIN_SCALE;
  zoomIn.disabled = !ready || scale >= MAX_SCALE;
  fitButton.disabled = !ready;
  fitButton.setAttribute('aria-pressed', String(fitWidth));
  pageInput.value = pageNumber;
  pageInput.max = documentPdf?.numPages || root.dataset.pages;
  total.textContent = documentPdf?.numPages || root.dataset.pages;
  zoomLabel.value = documentPdf ? `${Math.round(scale * 100)} %` : '—';
}

function clearPage() {
  viewAbort?.abort();
  viewAbort = null;
  pageView?.destroy();
  pageView = null;
  container.replaceChildren();
}

function showError(error) {
  failed = true;
  delete root.dataset.renderedPage;
  delete root.dataset.renderScale;
  viewport.setAttribute('aria-busy', 'false');
  errorMessage.textContent = error?.name === 'PasswordException'
    ? 'Esta vista previa está protegida. Puedes consultar el documento original.'
    : 'Vuelve a intentarlo. El original sigue disponible en Descargar.';
  errorPanel.hidden = false;
  status.textContent = 'No se pudo cargar la vista de lectura.';
  updateControls();
}

function visibleCenter() {
  if (!pageView) return null;
  const page = pageView.div.getBoundingClientRect();
  const frame = viewport.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (frame.left + viewport.clientLeft + viewport.clientWidth / 2 - page.left) / page.width)),
    y: Math.max(0, Math.min(1, (frame.top + viewport.clientTop + viewport.clientHeight / 2 - page.top) / page.height)),
  };
}

function restoreCenter(center) {
  if (!center) {
    viewport.scrollTop = 0;
    viewport.scrollLeft = 0;
    return;
  }
  const page = pageView.div.getBoundingClientRect();
  const frame = viewport.getBoundingClientRect();
  viewport.scrollLeft += page.left + center.x * page.width - frame.left - viewport.clientLeft - viewport.clientWidth / 2;
  viewport.scrollTop += page.top + center.y * page.height - frame.top - viewport.clientTop - viewport.clientHeight / 2;
}

function textLayerReady(eventBus, view, signal) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      eventBus.off('textlayerrendered', onRendered);
      signal.removeEventListener('abort', onAbort);
    };
    const onAbort = () => { cleanup(); resolve(false); };
    const onRendered = event => {
      if (event.source !== view) return;
      cleanup();
      if (event.error) reject(event.error);
      else resolve(true);
    };
    eventBus.on('textlayerrendered', onRendered);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function renderPage({ center = null } = {}) {
  clearTimeout(resizeTimer);
  if (!documentPdf || failed) return;
  const generation = ++renderGeneration;
  const currentDocument = documentPdf;
  const number = pageNumber;
  clearPage();
  delete root.dataset.renderedPage;
  delete root.dataset.renderScale;
  viewport.setAttribute('aria-busy', 'true');
  status.textContent = `Cargando página ${number} de ${currentDocument.numPages}…`;
  try {
    const page = await currentDocument.getPage(number);
    if (generation !== renderGeneration || currentDocument !== documentPdf) return;
    if (page.isPureXfa) throw new Error('Unsupported interactive preview');
    if (fitWidth) {
      const style = getComputedStyle(viewport);
      const available = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      scale = Math.min(MAX_SCALE, Math.max(0.05, available / page.getViewport({ scale: CSS_UNITS }).width));
    }
    const { PDFPageView, EventBus, GenericL10n } = modules.viewer;
    const eventBus = new EventBus();
    viewAbort = new AbortController();
    const signal = viewAbort.signal;
    const view = new PDFPageView({
      container, eventBus, id: number, scale,
      defaultViewport: page.getViewport({ scale: scale * CSS_UNITS }),
      textLayerMode: 1, annotationMode: modules.pdf.AnnotationMode.DISABLE,
      enableAutoLinking: false, enableDetailCanvas: false,
      enableSelectionRendering: false, imagesRightClickMinSize: -1,
      minDurationToUpdateCanvas: 0,
      maxCanvasPixels: MAX_CANVAS_PIXELS, maxCanvasDim: 8192, capCanvasAreaFactor: -1,
      imageResourcesPath: '/portal/pdfjs/web/images/',
      // The surrounding controls and page landmark are localized here. Passing
      // the official service keeps PDF.js lifecycle hooks without locale fetches.
      l10n: new GenericL10n(), abortSignal: signal,
    });
    pageView = view;
    view.setPdfPage(page);
    view.div.setAttribute('aria-label', `Página ${number} de ${currentDocument.numPages}`);
    const textReady = textLayerReady(eventBus, view, signal);
    updateControls();
    await Promise.all([view.draw(), textReady]);
    if (generation !== renderGeneration || signal.aborted) return;
    restoreCenter(center);
    viewport.setAttribute('aria-busy', 'false');
    root.dataset.renderedPage = String(number);
    root.dataset.renderScale = String(scale);
    const hasText = Boolean(view.textLayer?.div.textContent.trim());
    status.textContent = `Página ${number} de ${currentDocument.numPages}${hasText ? '' : ' · Esta página no contiene texto seleccionable.'}`;
  } catch (error) {
    if (generation !== renderGeneration) return;
    clearPage();
    showError(error);
  }
}

async function loadDocument() {
  clearTimeout(resizeTimer);
  const generation = ++loadGeneration;
  ++renderGeneration;
  failed = false;
  errorPanel.hidden = true;
  retry.disabled = true;
  documentPdf = null;
  clearPage();
  delete root.dataset.renderedPage;
  delete root.dataset.renderScale;
  viewport.setAttribute('aria-busy', 'true');
  status.textContent = 'Cargando documento…';
  updateControls();
  try {
    if (loadingTask) await loadingTask.destroy();
    loadingTask = null;
    if (!modules) {
      // The viewer bundle reads pdfjsLib established by the core module.
      const pdf = await import('/portal/pdfjs/build/pdf.mjs');
      const viewer = await import('/portal/pdfjs/web/pdf_viewer.mjs');
      modules = { pdf, viewer };
    }
    if (generation !== loadGeneration) return;
    const pdfUrl = new URL(root.dataset.pdfUrl, location.href);
    if (pdfUrl.origin !== location.origin || !/^\/materials\/previews\/[a-z0-9-]+\.pdf$/.test(pdfUrl.pathname) || pdfUrl.search || pdfUrl.hash) throw new Error('Invalid preview URL');
    modules.pdf.GlobalWorkerOptions.workerSrc = '/portal/pdfjs/build/pdf.worker.mjs';
    const task = modules.pdf.getDocument({
      url: pdfUrl.href,
      cMapUrl: '/portal/pdfjs/cmaps/', cMapPacked: true,
      standardFontDataUrl: '/portal/pdfjs/standard_fonts/',
      wasmUrl: '/portal/pdfjs/wasm/',
      isEvalSupported: false, useWasm: false, enableXfa: false,
    });
    loadingTask = task;
    const pdf = await task.promise;
    if (generation !== loadGeneration) return;
    documentPdf = pdf;
    pageNumber = clampPage(readHash());
    setHash(true);
    updateControls();
    await renderPage();
  } catch (error) {
    if (generation === loadGeneration) showError(error);
  } finally {
    if (generation === loadGeneration) retry.disabled = false;
  }
}

function goToPage(value, { fromHistory = false } = {}) {
  if (!documentPdf || failed) return;
  const target = clampPage(value);
  if (target === pageNumber) { pageInput.value = target; return; }
  pageNumber = target;
  if (!fromHistory) setHash();
  updateControls();
  void renderPage();
}

function zoomBy(delta) {
  if (!documentPdf || failed) return;
  const center = visibleCenter();
  fitWidth = false;
  scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round((scale + delta) * 100) / 100));
  updateControls();
  void renderPage({ center });
}

previous.addEventListener('click', () => goToPage(pageNumber - 1));
next.addEventListener('click', () => goToPage(pageNumber + 1));
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  viewport.focus({ preventScroll: true });
});
pageInput.addEventListener('change', () => goToPage(Number(pageInput.value)));
pageInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); goToPage(Number(pageInput.value)); }
  if (event.key === 'Escape') pageInput.value = pageNumber;
});
zoomOut.addEventListener('click', () => zoomBy(-0.25));
zoomIn.addEventListener('click', () => zoomBy(0.25));
fitButton.addEventListener('click', () => {
  fitWidth = true;
  void renderPage();
});
retry.addEventListener('click', () => {
  // A failed ES-module fetch is cached by the browser; reload retries that load.
  if (!modules) location.reload();
  else void loadDocument().then(() => { if (!failed) viewport.focus({ preventScroll: true }); });
});
window.addEventListener('hashchange', () => goToPage(readHash(), { fromHistory: true }));
new ResizeObserver(() => {
  const width = viewport.clientWidth;
  if (width === lastWidth) return;
  lastWidth = width;
  clearTimeout(resizeTimer);
  if (fitWidth && documentPdf && !failed) resizeTimer = setTimeout(() => {
    if (fitWidth && documentPdf && !failed) void renderPage();
  }, 100);
}).observe(viewport);
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  clearTimeout(resizeTimer);
  ++renderGeneration;
  clearPage();
  void loadingTask?.destroy();
});
void loadDocument();
