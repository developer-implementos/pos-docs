import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadBundle, operations, digest} from './bundle.mjs';

const require = createRequire(new URL('../../apps/starlight/package.json', import.meta.url));
const {chromium} = require('playwright');
const {servePublic} = require('./scripts/serve.cjs');
const bundle = loadBundle();
const server = await servePublic(0);
const origin = `http://127.0.0.1:${server.address().port}`;
const output = fileURLToPath(new URL('../../test-results-reference/', import.meta.url));
fs.mkdirSync(output, {recursive:true});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => errors.push(request.url()));
  page.on('request', request => { if (new URL(request.url()).origin !== origin) errors.push(`External request: ${request.url()}`); });
  const total = bundle.apis.reduce((count, api) => count + operations(api.document).length, 0);
  await page.goto(`${origin}/guide/api/pos-platform/`, {waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-api-operation]').count(), total);
  const search = page.getByRole('searchbox', {name:'Buscar en los contratos'});
  await search.fill('no-such-operation-719462');
  await page.getByText('No hay operaciones con esa búsqueda.').waitFor();
  assert.equal(await page.locator('[data-api-operation]:visible').count(), 0);
  const target = operations(bundle.apis[0].document)[0];
  await search.fill(target.operationId);
  assert.ok(await page.locator('[data-api-operation]:visible').count() > 0);
  const id = `${bundle.apis[0].id}-${target.operationId}`;
  await page.goto(`${origin}/guide/api/pos-platform/#${id}`, {waitUntil:'networkidle'});
  assert.equal(await page.evaluate(id => document.getElementById(id)?.open, id), true);
  for (const [relative, bytes] of bundle.files) {
    const response = await page.request.get(`${origin}/contracts/${relative}`);
    assert.equal(response.status(), 200);
    assert.equal(digest(await response.body()), digest(bytes), 'Published contract differs from its reviewed snapshot');
  }
  await page.goto(`${origin}/guide/api/data-model/`, {waitUntil:'networkidle'});
  const tables = bundle.database.databases.flatMap(db => db.tables);
  assert.equal(await page.locator('[data-data-table]').count(), tables.length);
  assert.equal(await page.locator('[data-data-field]').count(), tables.reduce((sum, table) => sum + table.columns.length, 0));
  const dataSearch = page.getByRole('searchbox', {name:'Buscar tabla, campo o descripción'});
  await dataSearch.fill('no-such-data-field-719462');
  await page.getByText('No hay tablas ni campos con esa búsqueda.').waitFor();
  assert.equal(await page.locator('[data-data-table]:visible').count(), 0);
  await dataSearch.fill('sales.sale currency_scale');
  assert.ok(await page.locator('#field-branch-sales-sale-currency_scale').isVisible());
  assert.equal(await page.locator('#field-branch-sales-sale-total').isVisible(), false);
  await page.getByRole('button', {name:'Limpiar',exact:true}).click();
  assert.equal(await dataSearch.inputValue(), '');
  const fieldAnchor = 'field-branch-devices-job-execution_attempt_id';
  await page.goto(`${origin}/guide/api/data-model/#${fieldAnchor}`, {waitUntil:'networkidle'});
  assert.equal(await page.locator(`#${fieldAnchor}`).evaluate(element => element.open && element.closest('[data-data-table]').open), true);
  assert.match(await page.locator(`#${fieldAnchor} .field-detail`).innerText(), /no es un contador/);
  await page.goto(`${origin}/guide/api/data-model/#field-branch-pricing-quote-result`, {waitUntil:'networkidle'});
  for (const [width, scheme] of [[1440,'light'], [375,'dark'], [320,'light']]) {
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({colorScheme:scheme});
    await page.locator('#field-branch-pricing-quote-result').scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Expanded JSON field overflows at ${width}`);
    await page.screenshot({path:path.join(output, `dictionary-field-${width}-${scheme}.png`)});
  }
  await page.setViewportSize({width:1440,height:900});
  await page.emulateMedia({colorScheme:'light'});
  await page.goto(`${origin}/explore/data-branch-devices/`, {waitUntil:'networkidle'});
  await page.locator('[data-node-id="devices__job"]').first().dispatchEvent('click');
  const fieldDefinition = page.locator('[data-pos-detail-schema] details').filter({has:page.locator('summary', {hasText:'execution_attempt_id'})});
  await fieldDefinition.locator('summary').click();
  assert.match(await fieldDefinition.innerText(), /no es un contador/);
  assert.equal(await fieldDefinition.getByRole('link', {name:'Definición completa del campo'}).getAttribute('href'), `/guide/api/data-model/#${fieldAnchor}`);
  for (const route of ['/guide/api/pos-platform/', '/guide/api/data-model/', '/guide/flows/', '/explore/']) {
    await page.goto(origin + route, {waitUntil:'networkidle'});
    if (route === '/guide/api/pos-platform/') await page.locator('[data-api-operation]').first().evaluate(element => { element.open = true; });
    if (route === '/guide/api/data-model/') { await page.locator('.data-table').first().evaluate(element => { element.open = true; }); await page.locator('[data-data-field]').first().evaluate(element => { element.open = true; }); }
    for (const width of [1440,375,320]) {
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} overflows at ${width}`);
      await page.screenshot({path:path.join(output, `${route.replaceAll('/', '-')}-${width}.png`)});
    }
  }
  assert.deepEqual(errors, []);
  console.log(`Product reference verified: ${total} operations, ${tables.length} tables, source-identical downloads, field search/deep links, expanded examples in light/dark, Archify field definitions, CSP and 4 routes at 3 widths.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
