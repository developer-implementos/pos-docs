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
const normalize = value => value.replace(/\s+/g, ' ').trim();
const phaseUrl = phase => `${origin}/guide/roadmap/${phase.id}/`;
const checkedDocuments = new Map();
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
async function assertPhasePlan(page, phase) {
  const plan = page.locator(`[data-roadmap-phase-plan="${phase.id}"]`);
  assert.equal(await page.locator('[data-roadmap-phase-plan]').count(), 1, `${phase.id}: exactly one delivery plan`);
  assert.ok((await page.locator('h1').textContent()).includes(phase.title), `${phase.id}: page identifies its phase`);
  for (const anchor of ['entry-conditions', 'work-packages', 'acceptance-evidence']) assert.equal(await page.locator(`#${anchor}`).count(), 1, `${phase.id}: missing or duplicated ${anchor}`);
  const text = normalize(await plan.textContent());
  for (const field of ['entry', 'parallel', 'deferred', 'evidence', 'reviewers']) {
    for (const value of phase.delivery[field]) assert.ok(text.includes(normalize(value)), `${phase.id}: missing ${field}: ${value}`);
  }
  assert.equal(await plan.locator('[data-work-package]').count(), phase.delivery.work.length);
  for (const work of phase.delivery.work) {
    const packageElement = plan.locator(`[data-work-package="${work.id}"]`);
    assert.equal(await packageElement.count(), 1, `${phase.id}: one identifiable package ${work.id}`);
    const packageText = normalize(await packageElement.textContent());
    for (const value of [work.title, work.deliverable, ...work.apps, ...work.modules, ...work.tasks]) assert.ok(packageText.includes(normalize(value)), `${work.id}: missing ${value}`);
  }
  assert.equal(await plan.locator('[data-roadmap-scenario]').count(), phase.delivery.validation.length);
  for (const [index, validation] of phase.delivery.validation.entries()) {
    const scenario = plan.locator(`[data-roadmap-scenario="${index}"]`);
    assert.equal(await scenario.count(), 1, `${phase.id}: missing scenario ${index}`);
    const scenarioText = normalize(await scenario.textContent());
    assert.ok(scenarioText.includes(normalize(validation.scenario)), `${phase.id}: scenario lost`);
    assert.ok(scenarioText.includes(normalize(validation.expected)), `${phase.id}: acceptance result lost`);
  }
  for (const dependency of phase.requires) assert.ok(await plan.locator(`a[href="/guide/roadmap/${dependency}/"]`).count(), `${phase.id}: dependency must open its plan`);
  assert.ok(await plan.locator(`a[href="/guide/proposal/roadmap/#${phase.id}"]`).count(), `${phase.id}: return to the correct roadmap phase`);
}
async function assertPlanFits(page, phase, label) {
  await assertNoPageOverflow(page, label);
  const clipped = await page.locator(`[data-roadmap-phase-plan="${phase.id}"]`).evaluate(root => {
    const issues = [], bounds = root.getBoundingClientRect();
    for (const element of root.querySelectorAll('[data-work-package],[data-roadmap-scenario],p,li,dt,dd,h2,h3')) {
      if (!element.getClientRects().length || !element.clientWidth) continue;
      const style = getComputedStyle(element);
      if (element.scrollWidth > element.clientWidth + 2 && !['auto', 'scroll'].includes(style.overflowX)) issues.push({ reason: 'horizontal clipping', text: element.textContent.slice(0, 120) });
      if (['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 2) issues.push({ reason: 'vertical clipping', text: element.textContent.slice(0, 120) });
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim()) continue;
      if (node.parentElement.closest('.sr-only,[hidden]')) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width && (rect.right > bounds.right + 2 || rect.left < bounds.left - 2)) issues.push({ reason: 'text outside plan', text: node.textContent.slice(0, 120) });
      }
    }
    return issues;
  });
  assert.deepEqual(clipped, [], label);
}
async function assertPlanLinks(page, phase) {
  const hrefs = await page.locator(`[data-roadmap-phase-plan="${phase.id}"] a[href]`).evaluateAll(links => links.map(link => link.getAttribute('href')));
  for (const href of new Set(hrefs)) {
    const target = new URL(href, page.url());
    if (target.origin !== origin) continue;
    const documentUrl = target.origin + target.pathname + target.search;
    if (!checkedDocuments.has(documentUrl)) {
      const response = await page.request.get(documentUrl);
      assert.equal(response.status(), 200, `${phase.id}: broken local reference ${href}`);
      checkedDocuments.set(documentUrl, await response.text());
    }
    if (target.hash) {
      const id = decodeURIComponent(target.hash.slice(1));
      const exists = await page.evaluate(({ html, id }) => !!new DOMParser().parseFromString(html, 'text/html').getElementById(id), { html: checkedDocuments.get(documentUrl), id });
      assert.ok(exists, `${phase.id}: reference points to missing section ${href}`);
    }
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
    const planLink = page.locator(`[data-phase-plan-link="${phase.id}"]`);
    assert.equal(await planLink.count(), 1, `${phase.id}: full plan is discoverable from roadmap`);
    assert.equal(await planLink.getAttribute('href'), `/guide/roadmap/${phase.id}/`);
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
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-phase-plan-link="phase-01"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(phaseUrl(roadmap.phases[0]));
  assert.ok(await page.locator('nav').filter({ hasText: 'Roadmap de entrega' }).count(), 'Phase pages belong to a discoverable navigation group');
  for (const phase of roadmap.phases) {
    assert.equal((await page.goto(phaseUrl(phase))).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    await assertPhasePlan(page, phase);
    await assertPlanLinks(page, phase);
    assert.ok(await page.locator(`nav a[href="/guide/roadmap/${phase.id}/"]`).count(), `${phase.id}: sidebar link missing`);
    for (const width of [1440, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
        await assertPlanFits(page, phase, `${phase.id} ${width}px ${theme}`);
        if ([1440, 375].includes(width) && [1, 6].includes(phase.number)) {
          await page.screenshot({ path: path.join(result, `${phase.id}-${width}-${theme}.png`), fullPage: false });
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const gateLink = page.getByRole('link', { name: 'Evidencia y decisión de cierre', exact: true }).first();
    assert.ok(await gateLink.count(), `${phase.id}: acceptance gate needs a keyboard-accessible link`);
    const gateUrl = new URL(await gateLink.getAttribute('href'), page.url());
    await gateLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(gateUrl.href);
    assert.ok(await page.locator(`[id="${decodeURIComponent(gateUrl.hash.slice(1))}"]`).isVisible());
  }
  await page.goto(phaseUrl(roadmap.phases[0]));
  for (const { width, height, theme } of [{ width: 1440, height: 1000, theme: 'light' }, { width: 375, height: 900, theme: 'dark' }]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    await page.locator('[data-work-package]').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(result, `phase-01-work-${width}-${theme}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 1600, height: 954 });
  await page.goto(slidesUrl + '#/slide-12');
  await waitForSlide(page, 11, -1);
  const slide = page.locator('#slide-12');
  assert.equal(await page.locator('.slides section[data-leaf]').count(), 22);
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
  await page.waitForFunction(() => document.querySelectorAll('.pdf-page').length === 22);
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
  for (const phase of roadmap.phases) {
    assert.equal((await staticPage.goto(phaseUrl(phase))).status(), 200);
    await assertPhasePlan(staticPage, phase);
    await assertPlanFits(staticPage, phase, `${phase.id} without JavaScript`);
    assert.ok(await staticPage.locator('[data-work-package]').first().isVisible(), `${phase.id}: tasks do not require JavaScript`);
    assert.ok(await staticPage.locator('[data-roadmap-scenario]').first().isVisible(), `${phase.id}: acceptance does not require JavaScript`);
  }
  await staticPage.goto(slidesUrl + 'reading.html');
  for (const phase of roadmap.phases) {
    const detail = staticPage.locator(`#roadmap-reading-${phase.id}`);
    for (const lane of lanes) assert.ok((await detail.textContent()).includes(phase[lane].detail));
  }
  await assertNoPageOverflow(staticPage, 'Reading without JavaScript');
  assert.deepEqual(errors, [], 'No runtime, network or CSP errors');
  console.log('Roadmap checked: shared content, six complete phase plans, dependency/source links, responsive guide and plans, keyboard and no-JS access, two Reveal views, history, detail slides, and 22-page print including chapter covers.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
