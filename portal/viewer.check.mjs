import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from './catalog.mjs';
import { loadPreviews } from './previews.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'apps/starlight/package.json'));
const { chromium } = require('playwright');
const { servePublic } = require(path.join(root, 'apps/starlight/scripts/serve.cjs'));
const catalog = loadCatalog(root);
const previews = loadPreviews(root, catalog);
const results = path.join(root, 'test-results-viewer');
fs.mkdirSync(results, { recursive: true });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const mime = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const report = { documents: [], checks: [], screenshots: [], errors: [], externalRequests: [], unexpectedDownloads: [] };
const server = await servePublic(0);
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;

function observe(page, { expectedFailure } = {}) {
  const state = { allowDownload: false, requests: [] };
  page.on('download', download => {
    if (!state.allowDownload) report.unexpectedDownloads.push(download.url());
  });
  page.on('request', request => {
    const url = new URL(request.url());
    state.requests.push(url.href);
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== origin) report.externalRequests.push(url.href);
  });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    if (expectedFailure && message.location().url === expectedFailure && /503|Failed to load resource/i.test(message.text())) return;
    report.errors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400 && !(response.url() === expectedFailure && response.status() === 503)) {
      report.errors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  page.on('requestfailed', request => {
    if (request.url() !== expectedFailure) report.errors.push(`${request.failure()?.errorText}: ${request.url()}`);
  });
  return state;
}

async function waitForRender(page, number, priorScale) {
  await page.evaluate(() => { delete window.__viewerQaStable; });
  await page.waitForFunction(({ number, priorScale }) => {
    const viewer = document.querySelector('#material-viewer');
    const canvas = document.querySelector('#pdf-page-container .page canvas');
    const text = document.querySelector('#pdf-page-container .page .textLayer');
    const scale = Number(viewer?.dataset.renderScale);
    const ready = Number(viewer?.dataset.renderedPage) === number && canvas?.width > 0 && canvas?.height > 0 && text &&
      Number.isFinite(scale) && scale > 0 && (priorScale === undefined || Math.abs(scale - priorScale) > 0.001);
    if (!ready) { delete window.__viewerQaStable; return false; }
    const viewport = document.querySelector('#pdf-viewport');
    const signature = [number, scale, canvas.width, canvas.height, viewport.clientWidth, viewport.clientHeight].join(':');
    const stable = window.__viewerQaStable;
    if (!stable || stable.canvas !== canvas || stable.signature !== signature) {
      window.__viewerQaStable = { canvas, signature, since: performance.now() };
      return false;
    }
    // The viewer debounces resize for 100ms. Require the final canvas, scale and
    // viewport to remain ready across that interval, without a blind sleep.
    return performance.now() - stable.since >= 200;
  }, { number, priorScale }, { timeout: 45000 });
  assert.equal(await page.locator('#pdf-page').inputValue(), String(number));
  assert.equal(await page.locator('#pdf-error').isVisible(), false, 'A successful rendering clears the error state');
  const total = Number(await page.locator('#pdf-total').textContent());
  assert.equal(await page.locator('#pdf-page-container .page').getAttribute('aria-label'), `Página ${number} de ${total}`, 'The rendered page landmark remains Spanish after asynchronous localization');
}

async function assertCanvasAndText(page, id) {
  const rendering = await page.locator('#pdf-page-container .page').evaluate(element => {
    const canvas = element.querySelector('canvas');
    const sample = document.createElement('canvas');
    sample.width = 256;
    sample.height = 256;
    const context = sample.getContext('2d', { willReadFrequently: true });
    context.drawImage(canvas, 0, 0, 256, 256);
    const rgba = context.getImageData(0, 0, 256, 256).data;
    let ink = 0;
    for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] > 0 && Math.min(rgba[i], rgba[i + 1], rgba[i + 2]) < 235) ink++;
    return { ink, text: element.querySelector('.textLayer').textContent.trim(), width: canvas.width, height: canvas.height };
  });
  assert.ok(rendering.ink > 5, `${id}: the canvas contains document marks, not a blank surface`);
  assert.ok(rendering.text.length > 10, `${id}: document text is available independently of the canvas`);
  assert.ok(rendering.width > 100 && rendering.height > 100, `${id}: document has a usable rendered size`);
}

async function assertNoPageOverflow(page, label) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(extra <= 1, `${label}: page overflows horizontally by ${extra}px`);
}

async function assertCompactLayout(page, label, minimumReadingRatio) {
  await assertNoPageOverflow(page, label);
  const layout = await page.evaluate(() => {
    const rect = node => {
      const box = node.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const controls = [...document.querySelectorAll('.viewer-back,#document-info-open,#original-download,.viewer-control-group button,.viewer-control-group input')]
      .filter(node => node.getClientRects().length).map(node => ({ id: node.id || node.className, ...rect(node) }));
    return {
      width: innerWidth, height: innerHeight, viewport: rect(document.querySelector('#pdf-viewport')),
      header: rect(document.querySelector('.viewer-header')), toolbar: rect(document.querySelector('.viewer-toolbar')),
      title: rect(document.querySelector('#document-title')), controls,
    };
  });
  const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  assert.ok(layout.viewport.height / layout.height >= minimumReadingRatio, `${label}: the document receives at least ${minimumReadingRatio * 100}% of screen height`);
  assert.ok(layout.viewport.top >= 0 && layout.viewport.bottom <= layout.height + 1, `${label}: the reading surface fits the screen`);
  assert.ok(!overlaps(layout.viewport, layout.header) && !overlaps(layout.viewport, layout.toolbar), `${label}: controls do not cover the document`);
  for (const [index, control] of layout.controls.entries()) {
    assert.ok(control.width >= 44 && control.height >= 44, `${label}: ${control.id} retains a 44px interaction target`);
    assert.ok(control.left >= 0 && control.right <= layout.width + 1 && control.top >= 0 && control.bottom <= layout.height + 1, `${label}: ${control.id} is fully on screen`);
    assert.ok(!overlaps(control, layout.title), `${label}: the full title does not displace or cover ${control.id}`);
    for (const other of layout.controls.slice(index + 1)) assert.ok(!overlaps(control, other), `${label}: ${control.id} and ${other.id} do not overlap`);
  }
}

async function assertInformationOverlay(page, item, label, screenshot) {
  const trigger = page.locator('#document-info-open');
  const panel = page.locator('#document-info');
  const currentPage = Number(await page.locator('#pdf-page').inputValue());
  assert.equal(await trigger.getAttribute('aria-label'), 'Información del documento');
  assert.equal(await trigger.getAttribute('popovertarget'), 'document-info');
  assert.equal(await panel.getAttribute('popover'), 'auto');
  assert.equal(await panel.getAttribute('aria-labelledby'), 'document-info-title');
  await page.evaluate(() => {
    const viewport = document.querySelector('#pdf-viewport'), root = document.querySelector('#material-viewer');
    viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
    const frame = viewport.getBoundingClientRect();
    window.__viewerInfoSnapshot = {
      canvas: viewport.querySelector('canvas'), scale: root.dataset.renderScale, page: root.dataset.renderedPage,
      hash: location.hash, top: viewport.scrollTop, left: viewport.scrollLeft,
      rect: [frame.left, frame.top, frame.width, frame.height],
    };
  });
  await trigger.focus();
  await trigger.press('Space');
  await page.waitForFunction(() => document.querySelector('#document-info').matches(':popover-open'));
  assert.equal(await page.locator('#document-info-title').textContent(), item.title, `${label}: information exposes the untruncated title`);
  assert.ok((await panel.textContent()).includes(item.description), `${label}: information includes the document description`);
  const geometry = await panel.evaluate(panel => {
    const box = panel.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: innerWidth, height: innerHeight, extra: panel.scrollWidth - panel.clientWidth };
  });
  assert.ok(geometry.left >= 0 && geometry.right <= geometry.width + 1 && geometry.top >= 0 && geometry.bottom <= geometry.height + 1 && geometry.extra <= 1, `${label}: information fits within the screen`);
  await page.locator('#document-info-close').scrollIntoViewIfNeeded();
  assert.ok(await page.locator('#document-info-close').isVisible(), `${label}: information has a visible close action`);
  if (screenshot) {
    await page.screenshot({ path: path.join(results, screenshot), fullPage: false });
    report.screenshots.push(screenshot);
  }
  await page.locator('#document-info-close').focus();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#document-info').matches(':popover-open'));
  assert.equal(await trigger.evaluate(node => node === document.activeElement), true, `${label}: Escape restores focus to the information button`);
  await trigger.click();
  await page.waitForFunction(() => document.querySelector('#document-info').matches(':popover-open'));
  const frame = await page.locator('#pdf-viewport').boundingBox();
  await page.mouse.click(frame.x + 3, frame.y + frame.height - 3);
  await page.waitForFunction(() => !document.querySelector('#document-info').matches(':popover-open'));
  assert.equal(await panel.evaluate(panel => panel.contains(document.activeElement)), false, `${label}: outside dismissal does not leave focus in hidden information`);
  await waitForRender(page, currentPage);
  const unchanged = await page.evaluate(() => {
    const viewport = document.querySelector('#pdf-viewport'), root = document.querySelector('#material-viewer');
    const frame = viewport.getBoundingClientRect(), prior = window.__viewerInfoSnapshot;
    delete window.__viewerInfoSnapshot;
    return {
      sameCanvas: prior.canvas === viewport.querySelector('canvas'), sameScale: prior.scale === root.dataset.renderScale,
      samePage: prior.page === root.dataset.renderedPage, sameHash: prior.hash === location.hash,
      scrollDifference: Math.max(Math.abs(prior.top - viewport.scrollTop), Math.abs(prior.left - viewport.scrollLeft)),
      geometryDifference: Math.max(...[frame.left, frame.top, frame.width, frame.height].map((value, index) => Math.abs(value - prior.rect[index]))),
    };
  });
  assert.deepEqual(unchanged, { sameCanvas: true, sameScale: true, samePage: true, sameHash: true, scrollDifference: 0, geometryDifference: 0 }, `${label}: information does not rerender, resize or move the document`);
}

async function assertDownloadedOriginal(context, item, preview) {
  const response = await context.request.get(origin + item.href);
  assert.equal(response.status(), 200, `${item.id}: original download resolves`);
  assert.ok(response.headers()['content-type'].startsWith(mime[item.format]), `${item.id}: original MIME`);
  const bytes = await response.body();
  assert.equal(sha256(bytes), preview.sourceSha256, `${item.id}: downloaded original matches reviewed provenance`);
  assert.equal(sha256(bytes), sha256(fs.readFileSync(path.join(root, item.source))), `${item.id}: original bytes are preserved`);
  const pdf = await context.request.get(origin + preview.href);
  assert.equal(pdf.status(), 200, `${item.id}: preview download resolves`);
  assert.ok(pdf.headers()['content-type'].startsWith('application/pdf'), `${item.id}: preview MIME`);
  assert.equal(sha256(await pdf.body()), preview.pdfSha256, `${item.id}: PDF download matches the conversion manifest`);
}

try {
  assert.equal(previews.size, catalog.materials.length, 'Every cataloged material has exactly one approved preview');
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  const state = observe(page);
  for (const item of catalog.materials) {
    const preview = previews.get(item.id);
    const url = `${origin}/materials/view/${item.id}/`;
    state.requests.length = 0;
    const response = await page.goto(url);
    assert.equal(response.status(), 200, item.id);
    assert.ok(response.headers()['content-security-policy']?.includes("'self'"), `${item.id}: CSP is served`);
    assert.ok(!response.headers()['content-security-policy'].includes("'unsafe-eval'"), `${item.id}: the viewer does not enable JavaScript eval`);
    await waitForRender(page, 1);
    assert.equal(await page.locator('h1').textContent(), item.title);
    assert.equal(await page.locator('#material-viewer').getAttribute('data-pages'), String(preview.pages));
    assert.equal(await page.locator('#pdf-page').getAttribute('max'), String(preview.pages));
    assert.equal(Number((await page.locator('#pdf-total').textContent()).match(/\d+/u)?.[0]), preview.pages);
    assert.equal(await page.locator('#pdf-previous').isDisabled(), true);
    assert.equal(await page.locator('#pdf-next').isDisabled(), preview.pages === 1);
    assert.equal(await page.locator('#original-download').getAttribute('href'), item.href);
    assert.equal(await page.locator('#preview-download').getAttribute('href'), preview.href);
    assert.notEqual(await page.locator('#original-download').getAttribute('download'), null);
    assert.notEqual(await page.locator('#preview-download').getAttribute('download'), null);
    await assertCanvasAndText(page, item.id);
    assert.ok(!state.requests.includes(origin + item.href), `${item.id}: opening the preview does not download the Office original`);
    await assertDownloadedOriginal(context, item, preview);
    if (preview.pages > 1) {
      await page.locator('#pdf-next').click();
      await waitForRender(page, 2);
      await page.locator('#pdf-previous').click();
      await waitForRender(page, 1);
    }
    report.documents.push({ id: item.id, pages: preview.pages, sourceSha256: preview.sourceSha256, pdfSha256: preview.pdfSha256 });
  }
  report.checks.push('Every preview renders nonblank content and selectable text; original and PDF downloads preserve their hashes and MIME types.');

  const representative = catalog.materials.find(item => item.id === 'architecture-roadmap-pptx');
  assert.ok(representative && previews.get(representative.id).pages >= 2, 'Navigation and layout coverage use the architecture PowerPoint');
  const preview = previews.get(representative.id);
  const url = `${origin}/materials/view/${representative.id}/`;
  await page.goto(url + '#page=2');
  await waitForRender(page, 2);
  await page.reload();
  await waitForRender(page, 2);
  assert.equal(new URL(page.url()).hash, '#page=2');
  await page.locator('.skip-link').focus();
  await page.locator('.skip-link').click();
  await waitForRender(page, 2);
  assert.equal(new URL(page.url()).hash, '#page=2', 'Skipping to the document must not replace the page deep link');
  assert.equal(await page.locator('#pdf-viewport').evaluate(node => document.activeElement === node), true, 'The skip link moves keyboard focus to the document');
  await page.locator('#pdf-page').fill(String(preview.pages));
  await page.locator('#pdf-page').press('Enter');
  await waitForRender(page, preview.pages);
  assert.equal(await page.locator('#pdf-next').isDisabled(), true);
  await page.locator('#pdf-page').fill('1');
  await page.locator('#pdf-page').press('Enter');
  await waitForRender(page, 1);
  assert.equal(await page.locator('#pdf-previous').isDisabled(), true);

  const initialScale = Number(await page.locator('#material-viewer').getAttribute('data-render-scale'));
  await page.locator('#pdf-zoom-in').click();
  await waitForRender(page, 1, initialScale);
  const enlarged = Number(await page.locator('#material-viewer').getAttribute('data-render-scale'));
  assert.ok(enlarged > initialScale, 'Zoom in changes the PDF rendering scale');
  await page.locator('#pdf-zoom-out').click();
  await waitForRender(page, 1, enlarged);
  assert.ok(Number(await page.locator('#material-viewer').getAttribute('data-render-scale')) < enlarged, 'Zoom out changes the PDF rendering scale');
  await assertInformationOverlay(page, representative, 'Information after manual zoom');
  report.checks.push('Next/previous, explicit page entry, disabled bounds, deep links, reload, and actual PDF zoom work.');

  const layouts = [
    { width: 320, height: 568, ratio: 0.6 },
    { width: 375, height: 667, ratio: 0.6 },
    { width: 768, height: 950, ratio: 0.8 },
    { width: 844, height: 390, ratio: 0.6 },
    { width: 1280, height: 800, ratio: 0.8 },
    { width: 1440, height: 900, ratio: 0.8 },
  ];
  for (const { width, height, ratio } of layouts) {
    await page.setViewportSize({ width, height });
    await page.locator('#pdf-fit').click();
    await waitForRender(page, 1);
    await assertCompactLayout(page, `Viewer ${width}x${height}`, ratio);
    const fit = await page.locator('#pdf-viewport').evaluate(viewport => {
      const box = viewport.getBoundingClientRect();
      const canvas = viewport.querySelector('canvas').getBoundingClientRect();
      return { available: viewport.clientWidth, rendered: canvas.width, viewportWidth: box.width };
    });
    assert.ok(fit.rendered <= fit.available + 1, `${width}px: fit keeps the PDF within the viewport width`);
    assert.ok(fit.viewportWidth <= width, `${width}px: the viewing region stays inside the page`);
    const filename = `viewer-${representative.id}-${width}x${height}.png`;
    await page.screenshot({ path: path.join(results, filename), fullPage: false });
    report.screenshots.push(filename);
    await assertInformationOverlay(page, representative, `Information ${width}x${height}`, [375, 1280, 1440].includes(width) ? `viewer-info-${representative.id}-${width}x${height}.png` : undefined);
  }
  await page.locator('#pdf-viewport').focus();
  assert.equal(await page.locator('#pdf-viewport').evaluate(node => node === document.activeElement), true, 'The native scrolling region is keyboard accessible');
  report.checks.push('Compact controls preserve at least 80% reading height on desktop and 60% on small screens, including landscape, with 44px targets and no overlaps.');

  const longTitleItem = catalog.materials.find(item => item.id === 'peru-cash-questionnaire');
  assert.ok(longTitleItem, 'The long-title DOCX fixture is available');
  const longTitlePage = await context.newPage();
  observe(longTitlePage);
  await longTitlePage.goto(`${origin}/materials/view/${longTitleItem.id}/`);
  await waitForRender(longTitlePage, 1);
  assert.equal(await longTitlePage.locator('#document-title').textContent(), longTitleItem.title, 'The compact title retains its complete accessible text');
  for (const { width, height, ratio } of layouts.filter(layout => [375, 1280, 1440].includes(layout.width))) {
    await longTitlePage.setViewportSize({ width, height });
    await longTitlePage.locator('#pdf-fit').click();
    await waitForRender(longTitlePage, 1);
    await assertCompactLayout(longTitlePage, `Long title ${width}x${height}`, ratio);
    const filename = `viewer-${longTitleItem.id}-${width}x${height}.png`;
    await longTitlePage.screenshot({ path: path.join(results, filename), fullPage: false });
    report.screenshots.push(filename);
    await assertInformationOverlay(longTitlePage, longTitleItem, `Long title information ${width}x${height}`, `viewer-info-${longTitleItem.id}-${width}x${height}.png`);
  }
  await longTitlePage.close();
  report.checks.push('Information exposes full titles and descriptions without resizing, rerendering or moving the document; keyboard and outside dismissal preserve usable focus.');

  // Register after the application observer, so this callback zooms immediately
  // after the fit-mode resize callback schedules its 100ms redraw.
  await page.evaluate(() => {
    const viewer = document.querySelector('#material-viewer');
    const viewport = document.querySelector('#pdf-viewport');
    const originalWidth = viewport.clientWidth;
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    const state = { completed: 0, expected: null };
    const renders = new MutationObserver(records => {
      state.completed += records.filter(record => record.oldValue === null && viewer.hasAttribute('data-rendered-page')).length;
    });
    const resize = new ResizeObserver(() => {
      if (viewport.clientWidth === originalWidth) return;
      resize.disconnect();
      const frame = viewport.getBoundingClientRect();
      const sheet = viewport.querySelector('.page').getBoundingClientRect();
      const beforeScale = Number(viewer.dataset.renderScale);
      state.expected = {
        beforeScale, scale: Math.min(4, Math.round((beforeScale + 0.25) * 100) / 100),
        x: (frame.left + viewport.clientLeft + viewport.clientWidth / 2 - sheet.left) / sheet.width,
        y: (frame.top + viewport.clientTop + viewport.clientHeight / 2 - sheet.top) / sheet.height,
      };
      renders.observe(viewer, { attributes: true, attributeOldValue: true, attributeFilter: ['data-rendered-page'] });
      document.querySelector('#pdf-zoom-in').click();
    });
    window.__viewerResizeZoom = { state, renders, resize };
    resize.observe(viewport);
  });
  await page.setViewportSize({ width: 1200, height: 950 });
  await page.waitForFunction(() => Boolean(window.__viewerResizeZoom?.state.expected));
  const expectedZoom = await page.evaluate(() => window.__viewerResizeZoom.state.expected);
  await waitForRender(page, 1, expectedZoom.beforeScale);
  const settledZoom = await page.evaluate(() => {
    const viewport = document.querySelector('#pdf-viewport');
    const frame = viewport.getBoundingClientRect();
    const sheet = viewport.querySelector('.page').getBoundingClientRect();
    const { state, renders, resize } = window.__viewerResizeZoom;
    renders.disconnect();
    resize.disconnect();
    delete window.__viewerResizeZoom;
    return {
      completed: state.completed,
      x: (frame.left + viewport.clientLeft + viewport.clientWidth / 2 - sheet.left) / sheet.width,
      y: (frame.top + viewport.clientTop + viewport.clientHeight / 2 - sheet.top) / sheet.height,
      width: sheet.width, height: sheet.height,
      scale: Number(document.querySelector('#material-viewer').dataset.renderScale),
      fit: document.querySelector('#pdf-fit').getAttribute('aria-pressed'),
    };
  });
  assert.equal(settledZoom.fit, 'false', 'Manual zoom survives a pending fit-mode resize');
  assert.ok(Math.abs(settledZoom.scale - expectedZoom.scale) < 0.001, 'The settled scale is the requested manual zoom');
  assert.equal(settledZoom.completed, 1, 'The pending resize does not cause a second completed redraw');
  assert.ok(Math.abs(settledZoom.x - expectedZoom.x) * settledZoom.width <= 2, 'The horizontal reading position survives the pending resize');
  assert.ok(Math.abs(settledZoom.y - expectedZoom.y) * settledZoom.height <= 2, 'The vertical reading position survives the pending resize');
  report.checks.push('Zoom immediately after a fit-mode resize preserves its scale and reading position without a late second redraw.');

  state.allowDownload = true;
  const originalDownload = page.waitForEvent('download');
  await page.locator('#original-download').click();
  const downloaded = await originalDownload;
  assert.equal(sha256(fs.readFileSync(await downloaded.path())), preview.sourceSha256, 'Explicit original download preserves exact bytes');
  await page.locator('#document-info-open').click();
  const previewDownload = page.waitForEvent('download');
  await page.locator('#preview-download').click();
  const downloadedPdf = await previewDownload;
  assert.equal(sha256(fs.readFileSync(await downloadedPdf.path())), preview.pdfSha256, 'Explicit preview download preserves exact bytes');
  state.allowDownload = false;

  const failedPdf = origin + preview.href;
  const retryPage = await context.newPage();
  observe(retryPage, { expectedFailure: failedPdf });
  let rejectRequest = true;
  await retryPage.route(failedPdf, route => rejectRequest
    ? route.fulfill({ status: 503, contentType: 'text/plain', body: 'Temporary preview unavailability' })
    : route.continue());
  await retryPage.goto(url);
  await retryPage.locator('#pdf-error').waitFor({ state: 'visible', timeout: 45000 });
  assert.equal(await retryPage.locator('#pdf-retry').isEnabled(), true);
  assert.equal(await retryPage.locator('#material-viewer').getAttribute('data-rendered-page'), null, 'A failed download is not marked as rendered');
  assert.equal(await retryPage.locator('#original-download').isVisible(), true, 'Failure preserves access to the original');
  rejectRequest = false;
  await retryPage.locator('#pdf-retry').click();
  await waitForRender(retryPage, 1);
  await assertCanvasAndText(retryPage, representative.id);
  await retryPage.close();
  report.checks.push('A failed PDF request shows an accessible recovery path; retry renders the document without reloading.');

  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 950 } });
  const staticPage = await noScript.newPage();
  observe(staticPage);
  assert.equal((await staticPage.goto(url)).status(), 200);
  assert.equal(await staticPage.locator('#original-download').getAttribute('href'), representative.href);
  assert.equal(await staticPage.locator('#preview-download').getAttribute('href'), preview.href);
  await staticPage.locator('#document-info-open').click();
  assert.equal(await staticPage.locator('#preview-download').isVisible(), true, 'The native information popover exposes the PDF download without JavaScript');
  await staticPage.locator('#document-info-close').click();
  assert.equal(await staticPage.locator('#preview-download').isVisible(), false, 'The native close action works without JavaScript');
  await assertNoPageOverflow(staticPage, 'Viewer without JavaScript');
  report.checks.push('Download links remain available without JavaScript; loading a viewer never starts an automatic download.');
  assert.deepEqual(report.unexpectedDownloads, []);
  assert.deepEqual(report.externalRequests, []);
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify({ documents: report.documents.length, checks: report.checks, errors: report.errors }, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  fs.writeFileSync(path.join(results, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
