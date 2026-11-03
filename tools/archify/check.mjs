import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'apps/starlight/package.json'));
const { chromium } = require('playwright');
const { servePublic } = require('./scripts/serve.cjs');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'dist/explore/catalog.json'))).diagrams;
const output = path.join(root, 'test-results-archify');
fs.mkdirSync(output, { recursive: true });
const server = await servePublic(0);
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const failures = [], requests = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  page.on('requestfailed', request => failures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()} ${response.url()}`); });
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) requests.push(request.url()); });
  await page.addInitScript(() => { window.posCspErrors = []; document.addEventListener('securitypolicyviolation', event => window.posCspErrors.push(`${event.violatedDirective}: ${event.blockedURI}`)); });
  for (const entry of catalog) {
    const response = await page.goto(`${origin}${entry.href}`);
    assert.equal(response.status(), 200, entry.id);
    assert.ok(response.headers()['content-security-policy'].includes("script-src 'self'"), `${entry.id}: production CSP applied`);
    await page.locator('svg [data-node-id]').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual(await page.evaluate(() => window.posCspErrors), [], `${entry.id}: CSP`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${entry.id}: desktop horizontal overflow`);
    for (const selector of ['[data-pos-details-open]', '.pos-docs-context a:last-of-type']) {
      assert.ok(await page.locator(selector).evaluate(element => {
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      }), `${entry.id}: context control must not be covered by native toolbar`);
    }
    const first = page.locator('svg [data-node-id]').first();
    await first.focus();
    await first.press('Enter');
    assert.ok(await page.locator('#pos-diagram-details').isVisible(), `${entry.id}: keyboard inspector`);
    const selectedId = await first.getAttribute('data-node-id');
    const selectedTitle = await page.evaluate(id => JSON.parse(document.querySelector('#pos-docs-details').textContent).nodes[id].title, selectedId);
    assert.equal(await page.locator('#pos-detail-title').textContent(), selectedTitle, `${entry.id}: selected node contract`);
    await page.keyboard.press('Escape');
    assert.ok(await first.evaluate(node => node === document.activeElement), `${entry.id}: restores focus`);
    const edge = page.locator('svg [data-edge-id][role="button"]').first();
    if (await edge.count()) {
      await edge.focus();
      await edge.press('Space');
      assert.ok(await page.locator('#pos-diagram-details').isVisible(), `${entry.id}: edge inspector`);
      const edgeId = await edge.getAttribute('data-edge-id');
      const title = await page.evaluate(id => JSON.parse(document.querySelector('#pos-docs-details').textContent).edges[id].title, edgeId);
      assert.equal(await page.locator('#pos-detail-title').textContent(), title);
      await page.keyboard.press('Escape');
    }
    await page.evaluate(() => scrollTo(0, 0));
    if (['applications', 'local-sale', 'state-printing', 'data-branch-sales', 'data-branch-payments'].includes(entry.id)) await page.screenshot({ path: path.join(output, `${entry.id}-desktop.png`) });
    for (const width of [1024, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => { scrollTo(0, 0); return new Promise(requestAnimationFrame); });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${entry.id}: ${width}px horizontal overflow`);
      for (const selector of ['[data-pos-details-open]', '.pos-docs-context a:last-of-type']) {
        assert.ok(await page.locator(selector).evaluate(element => {
          const rect = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
        }), `${entry.id}: ${width}px context control must not be covered`);
      }
      await page.locator('[data-pos-details-open]').click();
      const bounds = await page.locator('#pos-diagram-details').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${entry.id}: ${width}px inspector fits`);
      await page.locator('[data-pos-details-close]').click();
    }
    if (entry.id === 'applications') await page.screenshot({ path: path.join(output, `${entry.id}-mobile.png`) });
    await page.setViewportSize({ width: 1440, height: 900 });
    assert.deepEqual(failures, [], `${entry.id}: no console/runtime/request errors`);
    console.log(`Archify browser: ${entry.id}`);
  }
  await page.goto(`${origin}/explore/applications/`);
  await page.locator('#btn-export').click();
  const download = page.waitForEvent('download');
  await page.locator('[data-format="svg"]').click();
  const exported = await download;
  const target = path.join(output, 'applications.svg');
  await exported.saveAs(target);
  const svg = fs.readFileSync(target, 'utf8');
  assert.ok(svg.includes('<svg') && svg.includes('@font-face'), 'SVG export retains embedded licensed fonts');
  assert.deepEqual(failures, [], 'No runtime exceptions');
  assert.deepEqual(requests, [], 'No external runtime requests');
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ schemaVersion: 1, diagrams: catalog.length, viewports: [1440, 1024, 768, 375, 320], csp: 'pass', keyboard: 'pass', svgExport: 'pass', externalRequests: requests }, null, 2) + '\n');
  console.log(`Archify browser: ${catalog.length} views passed CSP, keyboard, responsive checks and SVG export.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
