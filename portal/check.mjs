import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docsOrigin } from '../apps/starlight/site-config.mjs';
import { loadCatalog } from './catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'apps/starlight/package.json'));
const { chromium } = require('playwright');
const { servePublic } = require(path.join(root, 'apps/starlight/scripts/serve.cjs'));
const catalog = loadCatalog(root);
const sourceMaterials = catalog.materials.filter(item => item.kind !== 'proposal');
const proposalMaterials = catalog.materials.filter(item => item.kind === 'proposal');
const comparisonHref = '/guide/evidence/country-comparison/';
const comparisonSourceIds = [
  'mountain-cash-ecosystem',
  'peru-cash-questionnaire', 'peru-cash-first-meeting', 'peru-cash-second-meeting',
  'spain-cash-questionnaire', 'spain-cash-first-meeting', 'spain-cash-second-meeting',
];
const results = path.join(root, 'test-results-portal');
fs.mkdirSync(results, { recursive: true });

const report = { checks: [], links: [], materials: [], screenshots: [], browserErrors: [], failedRequests: [] };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sorted = values => [...values].sort();
const mime = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
};
const server = await servePublic(0);
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;

function observe(page) {
  page.on('pageerror', error => report.browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') report.browserErrors.push(message.text());
  });
  page.on('requestfailed', request => report.failedRequests.push(`${request.failure()?.errorText}: ${request.url()}`));
  page.on('response', response => {
    if (response.status() >= 400) report.failedRequests.push(`${response.status()}: ${response.url()}`);
  });
}

async function visibleMaterials(page) {
  return sorted(await page.locator('#materials [data-material]:visible a[download]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))));
}

async function downloadHrefs(locator) {
  return sorted(await locator.evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))));
}

async function assertSources(page, expected, label) {
  assert.deepEqual(await visibleMaterials(page), sorted(expected.map(item => item.href)), label);
  assert.equal((await page.locator('#materials [data-count]').textContent()).trim(), `${expected.length} ${expected.length === 1 ? 'fuente' : 'fuentes'}`, `${label}: source count`);
}

async function assertFocus(locator, label) {
  const state = await locator.evaluate(node => {
    const css = getComputedStyle(node);
    return {
      focused: document.activeElement === node,
      outlined: parseFloat(css.outlineWidth) >= 2 && css.outlineStyle !== 'none',
    };
  });
  assert.ok(state.focused, `${label} receives keyboard focus`);
  assert.ok(state.outlined, `${label} has a visible keyboard focus indicator`);
}

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  context.setDefaultTimeout(10_000);
  const page = await context.newPage();
  observe(page);
  const response = await page.goto(origin + '/', { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200, 'The portal is served at /');
  assert.equal(response.request().redirectedFrom(), null, 'The portal does not redirect to Starlight');
  const html = await response.text();
  assert.doesNotMatch(html, /presentation-gamma/iu, 'The portal does not promote the external deck');
  const csp = response.headers()['content-security-policy'] || '';
  const scripts = csp.split(';').find(value => value.trim().startsWith('script-src ')) || '';
  assert.match(scripts, /'self'/u, 'The portal restricts script execution to local assets');
  assert.doesNotMatch(scripts, /unsafe-inline|unsafe-eval|wasm-unsafe-eval/u, 'The portal does not inherit the Pagefind WASM exception');
  assert.equal(response.headers()['x-content-type-options'], 'nosniff');
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), docsOrigin + '/');
  assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), docsOrigin + '/');
  assert.equal(await page.locator('html').getAttribute('lang'), 'es');
  assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
  assert.equal(await page.getByRole('main').count(), 1);
  assert.equal(await page.getByRole('navigation', { name: 'Navegación principal' }).count(), 1);
  assert.equal(await page.locator('script:not([src])').count(), 0, 'Portal scripts are externalized');
  report.checks.push('Root response, security headers, canonical URL and landmarks');

  const references = await page.locator('a[href], link[href], script[src], img[src]').evaluateAll(nodes => nodes.map(node => ({
    tag: node.tagName,
    href: node.getAttribute('href') || node.getAttribute('src'),
  })));
  const local = new Set(['/guide/', comparisonHref, ...catalog.presentations.flatMap(deck => [deck.href, deck.readingHref])]);
  for (const reference of references) {
    const url = new URL(reference.href, origin);
    if (url.origin !== origin) continue;
    if (url.pathname === '/' && url.hash) {
      assert.equal(await page.locator('[id]').evaluateAll((nodes, id) => nodes.filter(node => node.id === id).length, decodeURIComponent(url.hash.slice(1))), 1, `Anchor resolves: ${reference.href}`);
    } else {
      local.add(url.pathname + url.search);
    }
  }
  for (const href of local) {
    const result = await context.request.get(origin + href, { maxRedirects: 0 });
    assert.equal(result.status(), 200, `Local resource resolves directly: ${href}`);
    report.links.push(href);
    await result.dispose();
  }
  report.checks.push('Every portal link, local asset, Starlight entry and local Reveal/reading page');

  assert.ok(catalog.materials.length, 'The portal publishes cataloged materials');
  assert.ok(sourceMaterials.length && proposalMaterials.length, 'The catalog distinguishes source documents and proposals');
  const proposals = page.locator('#presentations');
  const sources = page.locator('#materials');
  assert.equal(await proposals.getByRole('heading', { name: 'Propuestas', exact: true, level: 2 }).count(), 1);
  assert.equal(await sources.getByRole('heading', { name: 'Fuentes de reuniones', exact: true, level: 2 }).count(), 1);
  assert.deepEqual(await downloadHrefs(page.locator('a[download]')), sorted(catalog.materials.map(item => item.href)), 'Every catalog original has exactly one download link');
  assert.deepEqual(await downloadHrefs(proposals.locator('a[download]')), sorted(proposalMaterials.map(item => item.href)), 'Proposal originals appear only with proposals');
  assert.deepEqual(await downloadHrefs(proposals.locator('a[download][data-proposal-download]')), sorted(proposalMaterials.map(item => item.href)), 'Proposal downloads have their own semantic marker');
  assert.deepEqual(await downloadHrefs(sources.locator('a[download]')), sorted(sourceMaterials.map(item => item.href)), 'Source downloads exclude every proposal, including the architecture PowerPoint');
  for (const proposal of proposalMaterials) assert.equal(await sources.locator(`a[href="${proposal.href}"]`).count(), 0, `Proposal has no link in meeting sources: ${proposal.id}`);
  assert.equal(await sources.locator('[data-material]').count(), sourceMaterials.length, 'Only original sources are filterable material rows');
  assert.equal(await proposals.locator('[data-material]').count(), 0, 'Proposals are outside source filtering');
  await assertSources(page, sourceMaterials, 'All source documents are initially visible');
  const docxSources = sourceMaterials.filter(item => item.format === 'docx' && ['meeting', 'questionnaire'].includes(item.kind));
  for (const id of comparisonSourceIds.slice(1)) {
    assert.ok(docxSources.some(item => item.id === id), `The supplied meeting/questionnaire original remains cataloged: ${id}`);
  }
  const questionnaires = sourceMaterials.filter(item => item.kind === 'questionnaire');
  assert.ok(questionnaires.length, 'Questionnaires are identified separately from meeting records');
  for (const item of questionnaires) {
    const row = sources.locator('[data-material]').filter({ has: page.getByRole('link', { name: `Descargar ${item.title} (${item.format.toUpperCase()})`, exact: true }) });
    assert.equal(await row.count(), 1, `Questionnaire source exists: ${item.id}`);
    assert.match(await row.locator('.metadata').innerText(), /cuestionario/iu, `Questionnaire is labeled as such: ${item.id}`);
  }
  const comparison = sources.locator(`a[href="${comparisonHref}"]`);
  assert.equal(await comparison.count(), 1, 'The country synthesis has one link within source context');
  assert.match(await sources.innerText(), /Síntesis comparativa por país/u);
  assert.equal(await comparison.getAttribute('download'), null, 'The synthesis is a guide page, not an original download');
  assert.ok(await comparison.evaluate(node => !node.closest('[data-material]')), 'The synthesis is outside the original-source list');
  report.checks.push('Proposals separated from original sources; six DOCX sources, questionnaire labels and distinct country synthesis');

  const summaryPage = await context.newPage();
  observe(summaryPage);
  assert.equal((await summaryPage.goto(origin + comparisonHref, { waitUntil: 'networkidle' })).status(), 200, 'The comparative synthesis is published in Starlight');
  const summaryContent = summaryPage.locator('.sl-markdown-content');
  const summaryLinks = await summaryContent.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  assert.ok(summaryLinks.includes('/#materials'), 'The synthesis points back to portal sources, not their GitHub directory');
  for (const id of comparisonSourceIds) {
    const item = sourceMaterials.find(item => item.id === id);
    assert.ok(item, `The comparative synthesis retains its source: ${id}`);
    assert.ok(summaryLinks.includes(item.href), `The synthesis links the local published original: ${item.id}`);
  }
  assert.ok(!summaryLinks.some(href => /github\.com\/[^/]+\/[^/]+\/(?:blob|tree)\/[^/]+\/(?:materials\/|#materials$)/u.test(href)), 'Published source links and portal anchors are not rewritten to GitHub');
  await summaryContent.locator('a[href="/#materials"]').first().click();
  await summaryPage.waitForURL(origin + '/#materials');
  assert.ok(await summaryPage.locator('#materials').isVisible(), 'Following the synthesis source link reaches the portal source section');
  assert.equal((await summaryPage.goto(origin + comparisonHref, { waitUntil: 'networkidle' })).status(), 200);
  const summaryImages = new Set(await summaryPage.locator('img[src]').evaluateAll(nodes => nodes.map(node => node.getAttribute('src'))));
  for (const image of summaryImages) {
    const url = new URL(image, origin + comparisonHref);
    if (url.origin !== origin) continue;
    const resource = await context.request.get(url.href, { maxRedirects: 0 });
    assert.equal(resource.status(), 200, `Country synthesis image resolves: ${url.pathname}`);
    if (/\.png$/iu.test(url.pathname)) assert.equal(resource.headers()['content-type'].split(';')[0], 'image/png', `Country synthesis PNG MIME: ${url.pathname}`);
    report.links.push(url.pathname + url.search);
    await resource.dispose();
  }
  await summaryPage.close();
  report.checks.push('Country synthesis page, local original-source destinations, working portal return and local image resources');

  for (const item of catalog.materials) {
    const source = fs.readFileSync(path.join(root, item.source));
    const built = fs.readFileSync(path.join(root, 'dist', item.source));
    assert.equal(source.length, item.bytes, `Catalog size: ${item.source}`);
    assert.equal(sha256(built), sha256(source), `Built original is unchanged: ${item.source}`);
    const resource = await context.request.get(origin + item.href);
    assert.equal(resource.status(), 200, `Download response: ${item.href}`);
    assert.equal(resource.headers()['content-type'].split(';')[0], mime[item.format], `Download MIME type: ${item.source}`);
    const body = await resource.body();
    assert.equal(body.length, item.bytes, `Served size: ${item.source}`);
    assert.equal(sha256(body), sha256(source), `Served original is unchanged: ${item.source}`);
    await resource.dispose();

    const link = page.getByRole('link', { name: `Descargar ${item.title} (${item.format.toUpperCase()})`, exact: true });
    assert.equal(await link.getAttribute('href'), item.href, 'Download links have explicit accessible names');
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
    assert.equal(await download.failure(), null, `Browser download succeeds: ${item.source}`);
    assert.equal(download.suggestedFilename(), path.basename(item.source));
    assert.equal(sha256(fs.readFileSync(await download.path())), sha256(source), `Browser download preserves bytes: ${item.source}`);
    await download.delete();
    report.materials.push({ source: item.source, bytes: item.bytes, sha256: sha256(source) });
  }
  report.checks.push('All materials: catalog, built file, HTTP bytes, MIME and browser downloads');

  await page.goto(origin + '/', { waitUntil: 'networkidle' });
  const form = page.getByRole('search', { name: 'Buscar fuentes de reuniones' });
  await form.waitFor({ state: 'visible' });
  const query = form.getByRole('searchbox', { name: 'Buscar fuente', exact: true });
  const format = form.getByRole('combobox', { name: 'Formato', exact: true });
  const country = form.getByRole('combobox', { name: 'País', exact: true });
  const reset = form.getByRole('button', { name: 'Limpiar', exact: true });
  assert.equal(await query.getAttribute('id'), 'material-query');
  assert.equal(await format.getAttribute('id'), 'material-format');
  assert.equal(await country.getAttribute('id'), 'material-country');
  const countries = sorted(new Set(sourceMaterials.map(item => item.country).filter(value => value !== null)));
  const formats = sorted(new Set(sourceMaterials.map(item => item.format)));
  assert.deepEqual(await format.locator('option').evaluateAll(nodes => nodes.map(node => node.value).filter(Boolean).sort()), formats, 'Format options come from source documents only');
  assert.deepEqual(await country.locator('option').evaluateAll(nodes => nodes.map(node => node.value).filter(Boolean).sort()), countries, 'Country options come from non-null source countries');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Saltar al contenido' });
  await assertFocus(skip, 'Skip link');
  const skipBox = await skip.boundingBox();
  assert.ok(skipBox && skipBox.y >= 0, 'The focused skip link is visible in the viewport');
  await page.keyboard.press('Enter');
  assert.ok(await page.getByRole('main').evaluate(node => document.activeElement === node), 'Skip link moves focus to the content');
  await query.focus();
  await page.keyboard.press('Tab');
  await assertFocus(format, 'Format filter');
  await page.keyboard.press('Shift+Tab');
  await assertFocus(query, 'Search field');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await assertFocus(country, 'Country filter');
  await page.keyboard.press('Tab');
  await assertFocus(reset, 'Reset button');
  report.checks.push('Accessible filter labels, skip link and keyboard focus indicators/order');

  const accentedSource = sourceMaterials.find(item => /[áéíóúüñ]/iu.test(`${item.title} ${item.description}`));
  const accentedWord = `${accentedSource?.title || ''} ${accentedSource?.description || ''}`.match(/\p{L}*[áéíóúüñ]\p{L}*/iu)?.[0];
  assert.ok(accentedWord, 'The source catalog contains a word with an accent for the normalization check');
  await query.fill(accentedWord.toLocaleUpperCase('es'));
  const accented = await visibleMaterials(page);
  assert.ok(accented.length, 'A source document is searchable with an accent');
  await query.fill(`  ${accentedWord.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es')}  `);
  assert.deepEqual(await visibleMaterials(page), accented, 'Search ignores accents, case and surrounding whitespace');
  await query.fill('material-inexistente-907d7fe0');
  await page.locator('[data-empty]').waitFor({ state: 'visible' });
  assert.deepEqual(await visibleMaterials(page), []);
  await assertSources(page, [], 'No sources match an unknown search');
  assert.equal(await page.locator('[data-count]').getAttribute('aria-live'), 'polite');
  assert.ok(await page.locator('.materials-list').isHidden(), 'No-results does not leave an empty list visible');
  await reset.click();
  await page.waitForFunction(() => document.querySelector('#material-query').value === '' && !document.querySelector('.materials-list').hidden);
  assert.equal(await query.inputValue(), '');
  assert.equal(await format.inputValue(), '');
  assert.equal(await country.inputValue(), '');
  await assertSources(page, sourceMaterials, 'Reset restores all sources');
  assert.ok(await page.locator('[data-empty]').isHidden());
  for (const value of formats) {
    await format.selectOption(value);
    await assertSources(page, sourceMaterials.filter(item => item.format === value), `Filter by ${value}`);
  }
  await format.selectOption('');
  for (const value of countries) {
    await country.selectOption(value);
    await assertSources(page, sourceMaterials.filter(item => item.country === value), `Filter by ${value}`);
  }
  await country.selectOption('');
  const intersectionSource = docxSources.find(item => item.country !== null);
  assert.ok(intersectionSource, 'A country-specific source is available for combined filters');
  await query.fill(intersectionSource.title);
  await format.selectOption(intersectionSource.format);
  await country.selectOption(intersectionSource.country);
  await assertSources(page, [intersectionSource], 'Search, format and country intersect to one source');
  const otherCountry = countries.find(value => value !== intersectionSource.country);
  assert.ok(otherCountry, 'There is another country to test a nonmatching intersection');
  await country.selectOption(otherCountry);
  await assertSources(page, [], 'A mismatched country excludes the matching query and format');
  assert.ok(await page.locator('[data-empty]').isVisible());
  assert.ok(await page.locator(`#materials a[href="${comparisonHref}"]`).isVisible(), 'Source filtering does not remove the synthesis');
  assert.deepEqual(await downloadHrefs(page.locator('#presentations a[download]:visible')), sorted(proposalMaterials.map(item => item.href)), 'Source filters do not affect proposal downloads');
  await reset.click();
  await page.waitForFunction(() => ['material-query', 'material-format', 'material-country'].every(id => document.getElementById(id).value === ''));
  await assertSources(page, sourceMaterials, 'Reset clears search, format and country together');
  assert.ok(await page.locator('[data-empty]').isHidden());
  assert.ok(await page.locator('.materials-list').isVisible());
  report.checks.push('Accent/case-insensitive search, no-results announcement, format/country filters, combined intersection, singular count and complete reset');

  for (const width of [1440, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      clipped: [...document.querySelectorAll('h1,h2,h3,p,a,input,select,button')].filter(node => {
        if (!node.getClientRects().length || node.classList.contains('skip-link')) return false;
        const box = node.getBoundingClientRect();
        return box.left < -1 || box.right > document.documentElement.clientWidth + 1;
      }).map(node => ({ tag: node.tagName, text: (node.textContent || node.getAttribute('aria-label') || '').trim().slice(0, 90) })),
    }));
    const filename = `portal-${width}.png`;
    await page.screenshot({ path: path.join(results, filename), fullPage: true });
    report.screenshots.push(filename);
    assert.ok(layout.width <= layout.viewport + 1, `No horizontal overflow at ${width}px: ${JSON.stringify(layout)}`);
    assert.deepEqual(layout.clipped, [], `No offscreen content/controls at ${width}px`);
  }
  report.checks.push('Responsive layout at 1440, 768, 375 and 320px with screenshots');

  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 1000 } });
  const fallback = await noJs.newPage();
  observe(fallback);
  assert.equal((await fallback.goto(origin + '/')).status(), 200);
  await assertSources(fallback, sourceMaterials, 'All source documents are available without JavaScript');
  assert.deepEqual(await downloadHrefs(fallback.locator('a[download]:visible')), sorted(catalog.materials.map(item => item.href)), 'Every original, including proposals, is downloadable without JavaScript');
  assert.ok(await fallback.locator(`#materials a[href="${comparisonHref}"]`).isVisible(), 'The synthesis remains available without JavaScript');
  assert.ok(await fallback.locator('[data-filters]').isHidden(), 'Inert search controls are hidden without JavaScript');
  assert.ok(await fallback.locator('[data-empty]').isHidden());
  for (const deck of catalog.presentations) {
    assert.ok(await fallback.locator(`a[href="${deck.href}"]`).isVisible(), 'Presentation links remain available without JavaScript');
    assert.ok(await fallback.locator(`a[href="${deck.readingHref}"]`).isVisible(), 'Reading links remain available without JavaScript');
  }
  await fallback.getByRole('link', { name: 'Documentación', exact: true }).click();
  await fallback.waitForURL(origin + '/guide/');
  report.checks.push('JavaScript-disabled materials, presentation/reading links and Starlight navigation');
  await noJs.close();
  assert.deepEqual(report.browserErrors, [], 'No browser errors or CSP violations');
  assert.deepEqual(report.failedRequests, [], 'No failed browser requests');
  report.ok = true;
  console.log(`Portal verified: ${report.links.length} local resources, ${report.materials.length} original downloads, ${report.screenshots.length} responsive screenshots.`);
} catch (error) {
  report.ok = false;
  report.failure = error.stack || String(error);
  throw error;
} finally {
  fs.writeFileSync(path.join(results, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
