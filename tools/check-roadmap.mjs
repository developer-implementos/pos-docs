import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadRoadmap } from './roadmap.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'apps/starlight/package.json'));
const { chromium } = require('playwright');
const { servePublic } = require(path.join(root, 'apps/starlight/scripts/serve.cjs'));
const roadmap = loadRoadmap(root);
const result = path.join(root, 'test-results-roadmap');
fs.mkdirSync(result, { recursive: true });
const server = await servePublic(0);
const origin = `http://127.0.0.1:${server.address().port}`;
const guideUrl = origin + '/guide/proposal/roadmap/';
const slidesUrl = origin + '/presentations/architecture/';
const browser = await chromium.launch({ headless: true });
const errors = [];
const lanes = ['operation', 'construction', 'acceptance'];
function observe(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
}
async function assertNoPageOverflow(page, label) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(extra <= 1, `${label}: page overflows by ${extra}px`);
}
async function waitForSlide(page, index, f) {
  await page.waitForFunction(({ id, f }) => {
    const deck = window.posPresentation;
    return deck?.isReady() && deck.getCurrentSlide()?.id === id &&
      (f === undefined || deck.getIndices().f === f);
  }, { id: `slide-${index + 1}`, f });
  await page.evaluate(() => document.fonts.ready);
}
async function goToSlide(page, index) {
  await page.evaluate(id => {
    const deck = window.posPresentation;
    const { h, v } = deck.getIndices(document.getElementById(id));
    deck.slide(h, v, -1);
  }, `slide-${index + 1}`);
  await waitForSlide(page, index);
}
async function assertMatrix(page, selector, phases) {
  for (const phase of phases) for (const lane of lanes) {
    const cell = page.locator(`${selector} td[data-phase="${phase.id}"][data-row="${lane}"]`);
    assert.equal((await cell.locator('.roadmap-cell-title').textContent()).trim(), phase[lane].title);
    assert.equal((await cell.locator('.roadmap-cell-summary').textContent()).trim(), phase[lane].summary);
  }
}
async function assertSlideFits(page, selector) {
  const issues = await page.locator(selector).evaluate(root => {
    const scale = window.posPresentation.getScale();
    const bounds = root.getBoundingClientRect();
    return [...root.querySelectorAll('.roadmap-card,.roadmap-pair-lane,.roadmap-print-phase')].flatMap(card => {
      const box = card.getBoundingClientRect();
      const children = [...card.children].map(child => child.getBoundingClientRect());
      const outside = children.some(child => child.bottom > box.bottom + 2 || child.right > box.right + 2);
      const clip = card.scrollHeight > card.clientHeight + 2 || card.scrollWidth > card.clientWidth + 2;
      const boundary = box.bottom > bounds.bottom + 2 || box.right > bounds.right + 2;
      return outside || clip || boundary ? [{ text: card.textContent, outside, clip, boundary, scale }] : [];
    });
  });
  assert.deepEqual(issues, [], `${selector}: all cards fit without clipping or shrinking text`);
}
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 954 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  observe(page);
  assert.equal((await page.goto(guideUrl)).status(), 200);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('h1').textContent(), roadmap.title);
  assert.equal(await page.locator('[data-phase-detail]').count(), 6);
  assert.equal(await page.locator('.roadmap-matrix').count(), 2);
  for (const phase of roadmap.phases) {
    assert.equal(await page.locator(`#${phase.id}`).count(), 1);
    const detail = page.locator(`[data-phase-detail="${phase.id}"]`);
    for (const lane of lanes) assert.equal((await detail.locator(`[data-row="${lane}"] dd`).textContent()).trim(), phase[lane].detail);
  }
  await assertMatrix(page, '.roadmap-docs', roadmap.phases);
  assert.ok(await page.locator('nav a[href="/guide/proposal/roadmap/"]').count(), 'Roadmap is discoverable in navigation');
  for (const width of [1440, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await assertNoPageOverflow(page, `Guide ${width}px ${theme}`);
      if (width === 1440 || width === 375) await page.screenshot({ path: path.join(result, `guide-${width}-${theme}.png`), fullPage: false });
    }
  }
  await page.setViewportSize({ width: 1600, height: 954 });
  await page.goto(slidesUrl + '#/slide-12');
  await waitForSlide(page, 11, -1);
  const slide = page.locator('#slide-12');
  assert.equal(await page.locator('.slides section[data-leaf]').count(), 21);
  assert.equal(await page.locator('.slides section[data-chapter-cover]').count(), 5);
  for (const [index, phases] of [roadmap.phases.slice(0, 3), roadmap.phases.slice(3)].entries()) {
    if (index) await page.keyboard.press('ArrowDown');
    await waitForSlide(page, 11, index - 1);
    assert.equal(await slide.locator(`[data-roadmap-panel="${index}"]`).isVisible(), true);
    assert.equal(await slide.locator(`[data-roadmap-panel="${1 - index}"]`).isVisible(), false);
    await assertMatrix(page, `#roadmap-panel-${index}`, phases);
    await assertSlideFits(page, '#slide-12 .roadmap-tour');
    await page.screenshot({ path: path.join(result, `slide-12-view-${index + 1}.png`) });
  }
  await page.waitForFunction(() => location.hash.endsWith('/0'));
  await page.reload();
  await waitForSlide(page, 11, 0);
  assert.equal(await slide.locator('[data-roadmap-panel="1"]').isVisible(), true, 'Fragment survives reload');
  await page.keyboard.press('ArrowDown');
  await waitForSlide(page, 12);
  await page.keyboard.press('ArrowUp');
  await waitForSlide(page, 11, 0);
  await page.keyboard.press('ArrowUp');
  await waitForSlide(page, 11, -1);
  await slide.locator('[data-roadmap-step="1"]').focus();
  await page.keyboard.press('Enter');
  await waitForSlide(page, 11, 0);
  await slide.locator('[data-roadmap-step="0"]').focus();
  await page.keyboard.press('Space');
  await waitForSlide(page, 11, -1);
  await slide.locator('[data-roadmap-step="1"]').focus();
  await page.keyboard.press('Space');
  await waitForSlide(page, 11, 0);
  await slide.locator('[data-roadmap-step="0"]').click();
  await waitForSlide(page, 11, -1);
  for (const index of [12, 13, 14]) {
    await goToSlide(page, index);
    await assertSlideFits(page, `#slide-${index + 1} .roadmap-pair`);
    for (const phase of roadmap.phases.slice((index - 12) * 2, (index - 11) * 2)) for (const lane of lanes) {
      assert.equal((await page.locator(`[data-roadmap-phase="${phase.id}"] [data-row="${lane}"] p`).textContent()).trim(), phase[lane].slideDetail);
    }
    await page.screenshot({ path: path.join(result, `slide-${index + 1}.png`) });
  }
  await page.goto(slidesUrl + '?print-pdf#/slide-12');
  await page.waitForFunction(() => document.querySelectorAll('.pdf-page').length === 21);
  assert.equal(await page.locator('#slide-12 .roadmap-print-phase').count(), 6);
  assert.equal(await page.locator('#slide-12 .roadmap-tour').isVisible(), false);
  await assertSlideFits(page, '#slide-12 .roadmap-print');
  await page.pdf({ path: path.join(result, 'roadmap-deck.pdf'), printBackground: true, preferCSSPageSize: true });
  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  const staticPage = await noScript.newPage();
  observe(staticPage);
  await staticPage.goto(guideUrl);
  assert.equal(await staticPage.locator('[data-phase-detail]').count(), 6);
  await assertNoPageOverflow(staticPage, 'Guide without JavaScript');
  await staticPage.goto(slidesUrl + 'reading.html');
  for (const phase of roadmap.phases) {
    const detail = staticPage.locator(`#roadmap-reading-${phase.id}`);
    for (const lane of lanes) assert.ok((await detail.textContent()).includes(phase[lane].detail));
  }
  await assertNoPageOverflow(staticPage, 'Reading without JavaScript');
  assert.deepEqual(errors, [], 'No runtime, network or CSP errors');
  console.log('Roadmap checked: shared content, six phases, responsive guide, two Reveal views, history, keyboard, detail slides, 21-page print including chapter covers, no-JS reading.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
