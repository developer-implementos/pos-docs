import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { architecture } from './model.mjs';
import { renderArchitecture } from './render.mjs';
import { architectureViews, scenarioView, validateArchitecture } from './views.mjs';
import { docsOrigin } from '../../apps/starlight/site-config.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(path.join(root, 'apps/starlight/package.json'));
const { chromium } = require('playwright');
const { servePublic } = require(path.join(root, 'apps/starlight/scripts/serve.cjs'));
const results = path.join(root, 'test-results-architecture');
fs.mkdirSync(results, { recursive: true });
const report = { checks: [], links: [], screenshots: [], sourceErrors: [], browserErrors: [], failedRequests: [], externalRequests: [], unexpectedMethods: [] };
const sorted = values => [...values].sort();
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLowerCase();
const statuses = { proposed: 'Propuesto', conditional: 'Condicional', unresolved: 'Por definir' };
const allItems = [...architecture.nodes, ...architecture.edges];
const nodeIds = new Set(architecture.nodes.map(node => node.id));
const edgeIds = new Set(architecture.edges.map(edge => edge.id));
const itemById = new Map(allItems.map(item => [item.id, item]));
const sourceSvgPath = path.join(root, 'docs/architecture/pos-platform.svg');
let browser;
let server;
let origin;

function validateStructure() {
  validateArchitecture();
  assert.equal(itemById.size, allItems.length, 'Architecture item IDs are unique');
  const apps = architecture.nodes.filter(node => node.kind === 'app');
  assert.deepEqual(sorted(apps.map(node => node.title)), sorted(['pos-desktop', 'pos-mobile', 'branch-api', 'branch-sync-worker', 'country-api', 'erp-worker']), 'The map declares exactly the six agreed applications');
  const groups = new Set(architecture.groups.map(group => group.id));
  for (const item of allItems) {
    assert.match(item.id, /^[a-z][a-z0-9-]*$/u);
    assert.ok(item.title?.trim() && item.description?.trim(), `Named, explained item: ${item.id}`);
    assert.ok(statuses[item.status], `Explicit proposal status: ${item.id}`);
    assert.ok(item.sources?.length, `Architecture claims have sources: ${item.id}`);
    for (const source of item.sources) {
      assert.ok(source.label?.trim(), `Named source: ${item.id}`);
      assert.match(source.href, /^(?:\/(?:guide|docs)\/|https:\/\/)/u, `Source is a document, not a service call: ${item.id}`);
    }
  }
  for (const node of architecture.nodes) {
    assert.ok(groups.has(node.group), `Declared deployment group: ${node.id}`);
    assert.ok(node.technology?.trim(), `Technology is explicit: ${node.id}`);
    if (node.owner) assert.ok(nodeIds.has(node.owner), `Component owner exists: ${node.id}`);
  }
  for (const edge of architecture.edges) {
    assert.ok(nodeIds.has(edge.from) && nodeIds.has(edge.to), `Relationship endpoints exist: ${edge.id}`);
    assert.ok(edge.protocol?.trim(), `Relationship protocol is explained: ${edge.id}`);
    assert.ok(edge.protocolLabel?.trim(), `Relationship has a visible protocol label: ${edge.id}`);
    assert.ok(['sync', 'async', 'data', 'local'].includes(edge.mode), `Relationship mode is known: ${edge.id}`);
  }
  assert.equal(new Set(architecture.scenarios.map(scenario => scenario.id)).size, architecture.scenarios.length);
  for (const scenario of architecture.scenarios) {
    assert.ok(scenario.steps.length, `Scenario has steps: ${scenario.id}`);
    for (const step of scenario.steps) {
      assert.ok(step.title?.trim() && step.description?.trim(), `Scenario explains its step: ${scenario.id}`);
      assert.ok(step.nodes.length, `Scenario step has a camera target: ${scenario.id}`);
      for (const id of step.nodes) assert.ok(nodeIds.has(id), `Scenario highlights a real node: ${scenario.id}/${id}`);
      for (const id of step.edges) assert.ok(edgeIds.has(id), `Scenario highlights a real relationship: ${scenario.id}/${id}`);
    }
  }
  const before = JSON.stringify(architecture);
  const generated = renderArchitecture(architecture);
  assert.equal(JSON.stringify(architecture), before, 'Rendering routes does not rewrite the source model');
  assert.ok(fs.readFileSync(sourceSvgPath, 'utf8') === generated, 'The versioned SVG matches the current model and renderer');
  assert.ok(fs.readFileSync(path.join(root, 'dist/docs/architecture/pos-platform.svg'), 'utf8') === generated, 'The published download matches the versioned SVG');
  assert.doesNotMatch(generated, /<(?:image|foreignObject|script)\b/iu, 'The download is vector SVG without raster payloads or scripts');
  assert.doesNotMatch(generated, /(?:href|src)=["'](?:https?:|data:)/iu, 'The SVG does not load remote or embedded bitmap resources');
  for (const status of ['conditional', 'unresolved']) {
    assert.ok(architecture.nodes.some(node => node.status === status), `The model records ${status} capabilities`);
    assert.ok(generated.includes(statuses[status]), `The SVG visibly identifies ${status} capabilities`);
  }
  report.checks.push('Six applications; typed relationships, sources, statuses and scenario references; deterministic vector download');
}

function observe(page) {
  page.on('pageerror', error => report.browserErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.browserErrors.push(message.text()); });
  page.on('requestfailed', request => report.failedRequests.push(`${request.failure()?.errorText}: ${request.url()}`));
  page.on('response', response => { if (response.status() >= 400) report.failedRequests.push(`${response.status()}: ${response.url()}`); });
  page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) report.unexpectedMethods.push(`${request.method()}: ${request.url()}`); });
}

async function contextFor(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true, ...options });
  context.setDefaultTimeout(10_000);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) {
      report.externalRequests.push(url.href);
      await route.abort('blockedbyclient');
    } else await route.continue();
  });
  return context;
}

async function ready(page, suffix = '') {
  const response = await page.goto(origin + '/architecture/' + suffix, { waitUntil: 'networkidle' });
  if (response) assert.equal(response.status(), 200, 'Architecture explorer is directly available');
  else assert.equal(new URL(page.url()).pathname, '/architecture/', 'A fragment-only visit stays on the loaded explorer');
  await page.waitForFunction(() => document.documentElement.dataset.architectureReady === 'true');
  return response;
}

async function assertSelection(page, item) {
  await page.locator(`#inspector[data-active="${item.id}"]`).waitFor({ state: 'attached' });
  assert.equal(await page.locator('#inspector').getAttribute('data-active'), item.id, `Inspector selected ${item.id}`);
  assert.equal(new URL(page.url()).hash, `#detail-${item.id}`, `Permalink selected ${item.id}`);
  assert.equal(await page.locator('[data-detail]:visible').count(), 1, 'Only one detail card is visible');
  assert.equal(await page.locator(`#detail-${item.id} h2`).textContent(), item.title, `Detail title matches ${item.id}`);
  assert.deepEqual(await page.locator('#drawing .is-selected').evaluateAll(items => items.map(item => item.dataset.itemId).sort()), [item.id], `Selection is exact: ${item.id}`);
  const related = edgeIds.has(item.id) ? [item.from, item.to] : architecture.edges.filter(edge => edge.from === item.id || edge.to === item.id).flatMap(edge => [edge.id, edge.from, edge.to]);
  const mounted=new Set(await page.locator('#drawing [data-item-id]').evaluateAll(items=>items.map(item=>item.dataset.itemId)));
  assert.deepEqual(await page.locator('#drawing .is-related').evaluateAll(items => items.filter(item=>!item.classList.contains('is-selected')).map(item => item.dataset.itemId).sort()), sorted(new Set(related.filter(id=>mounted.has(id)&&id!==item.id))), `Related contracts visible in this projection are exact: ${item.id}`);
}

async function assertNoHorizontalOverflow(page, label) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, html: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(sizes.html <= sizes.viewport + 1 && sizes.body <= sizes.viewport + 1, `${label}: body does not horizontally overflow (${JSON.stringify(sizes)})`);
}

async function assertCamera(page, ids, label) {
  const geometry = await page.evaluate(ids => {
    const viewport = document.querySelector('#viewport');
    const outer = viewport.getBoundingClientRect();
    const visible = { left: outer.left + viewport.clientLeft, top: outer.top + viewport.clientTop };
    visible.right = visible.left + viewport.clientWidth;
    visible.bottom = visible.top + viewport.clientHeight;
    const clipped=ids.filter(id => {
      const box = document.querySelector(`#drawing [data-item-id="${id}"] .architecture-node-box`).getBoundingClientRect();
      return box.left < visible.left - 2 || box.top < visible.top - 2 || box.right > visible.right + 2 || box.bottom > visible.bottom + 2;
    });
    const svg=document.querySelector('#drawing svg');
    const scale=svg.getBoundingClientRect().width/svg.viewBox.baseVal.width;
    const titles=ids.map(id=>{
      const title=document.querySelector(`#drawing [data-item-id="${id}"] .architecture-node-title`);
      return {id,size:parseFloat(getComputedStyle(title).fontSize)*scale};
    });
    return {clipped,titles,desktop:innerWidth>=1000};
  }, ids);
  assert.deepEqual(geometry.clipped, [], `${label}: the camera includes every node in the current step`);
  if(geometry.desktop)assert.deepEqual(geometry.titles.filter(title=>title.size<14),[],`${label}: the projected step has readable node titles, not only geometric fit`);
}

async function capture(page, name) {
  await page.screenshot({ path: path.join(results, name), fullPage: true });
  report.screenshots.push(name);
}

async function assertActiveStepVisible(page,label) {
  const geometry=await page.locator('[data-scenario-panel]:visible [aria-current="step"]').evaluate(node=>{
    const panel=document.querySelector('#inspector');
    const box=node.getBoundingClientRect(),outer=panel.getBoundingClientRect();
    const toolbar=document.querySelector('.inspector-tools').getBoundingClientRect();
    return {top:box.top,bottom:box.bottom,visibleTop:Math.max(outer.top,toolbar.bottom),visibleBottom:outer.bottom,scrollY};
  });
  assert.ok(geometry.top>=geometry.visibleTop-2&&geometry.bottom<=geometry.visibleBottom+2,`${label}: the active step is visible in its inspector`);
  assert.equal(geometry.scrollY,0,`${label}: revealing a step does not scroll the desktop document`);
}

async function checkSources(context, page) {
  const references = await page.locator('a[href], link[href], script[src], img[src]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href') || node.getAttribute('src')));
  const locals = new Map();
  for (const reference of references) {
    const url = new URL(reference, page.url());
    if (url.origin !== origin) continue;
    const pathname = url.pathname + url.search;
    if (!locals.has(pathname)) locals.set(pathname, new Set());
    if (url.hash) locals.get(pathname).add(decodeURIComponent(url.hash.slice(1)));
  }
  for (const [href, anchors] of locals) {
    const response = await context.request.get(origin + href, { maxRedirects: 0 });
    if(response.status()!==200){report.sourceErrors.push(`${response.status()}: ${href}`);await response.dispose();continue;}
    if (anchors.size) {
      const text = await response.text();
      const missing = await page.evaluate(({ text, anchors }) => {
        const document = new DOMParser().parseFromString(text, 'text/html');
        return anchors.filter(anchor => !document.getElementById(anchor));
      }, { text, anchors: [...anchors] });
      for(const anchor of missing)report.sourceErrors.push(`Missing anchor: ${href}#${anchor}`);
    }
    report.links.push(href);
    await response.dispose();
  }
}

try {
  validateStructure();
  server = await servePublic(0);
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  const context = await contextFor();
  const page = await context.newPage();
  observe(page);
  const response = await ready(page);
  await page.evaluate(()=>document.fonts.ready);
  assert.deepEqual(await page.locator('img').evaluateAll(images=>images.filter(image=>!image.complete||image.naturalWidth===0).map(image=>image.currentSrc)),[],'Brand images load before visual geometry is checked');
  const fonts=await page.evaluate(()=>[...document.fonts].filter(font=>font.family.replaceAll('"','')==='Inter').map(font=>({weight:font.weight,status:font.status})));
  assert.ok(fonts.length>=2&&fonts.every(font=>font.status==='loaded'),'Regular and bold Inter load; visual checks must not silently use fallback fonts');
  const scriptPolicy = (response.headers()['content-security-policy'] || '').split(';').find(value => value.trim().startsWith('script-src ')) || '';
  assert.match(scriptPolicy, /'self'/u, 'Scripts are local under CSP');
  assert.doesNotMatch(scriptPolicy, /unsafe-inline|unsafe-eval|wasm-unsafe-eval/u, 'Explorer has no permissive script exception');
  assert.equal(response.headers()['x-content-type-options'], 'nosniff');
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), docsOrigin + '/architecture/');
  assert.equal(await page.locator('script:not([src])').count(), 0);
  assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
  assert.equal(await page.getByRole('main').count(), 1);
  const base=architectureViews.find(view=>view.id==='base');
  assert.equal(await page.locator('#drawing').getAttribute('data-view'),'base');
  assert.ok(await page.locator('#inspector').isHidden(),'The first view gives its width to the proposal');
  assert.deepEqual(await page.locator('#drawing [data-item-id]').evaluateAll(items=>items.map(item=>item.dataset.itemId).sort()),sorted([...base.model.nodes,...base.model.edges].map(item=>item.id)));
  assert.equal(await page.locator('#drawing svg').count(),1,'Only the selected projection is mounted');
  assert.deepEqual(await page.locator('[data-detail]').evaluateAll(items => items.map(item => item.dataset.detail).sort()), sorted(itemById.keys()));
  await page.locator('#view').selectOption('full');
  for (const edge of architecture.edges) {
    assert.ok((await page.locator(`#drawing [data-item-id="${edge.id}"] text`).allTextContents()).join(' ').includes(edge.protocolLabel), `Relationship protocol appears visibly in the SVG: ${edge.id}`);
  }
  await checkSources(context, page);
  await page.locator('#view').selectOption('base');
  await assertNoHorizontalOverflow(page, 'Desktop overview');
  await capture(page, 'desktop.png');
  await page.emulateMedia({colorScheme:'dark'});
  await capture(page,'desktop-dark.png');
  await page.emulateMedia({colorScheme:'light'});
  report.checks.push('Security headers, canonical URL, landmarks, complete SVG/detail inventory and all internal sources');

  for(const view of architectureViews){
    await page.locator('#view').selectOption(view.id);
    assert.equal(await page.locator('#drawing').getAttribute('data-view'),view.id);
    assert.deepEqual(await page.locator('#drawing [data-item-id]').evaluateAll(items=>items.map(item=>item.dataset.itemId).sort()),sorted([...view.model.nodes,...view.model.edges].map(item=>item.id)),`${view.id}: only its proposed scope is mounted`);
    const before=new URL(page.url());
    await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.documentElement.dataset.architectureReady==='true');
    assert.equal(await page.locator('#drawing').getAttribute('data-view'),view.id,`${view.id}: view survives reload`);
    assert.equal(new URL(page.url()).search,before.search);
  }
  await ready(page,'?view=not-a-view&scenario=unknown&step=99');
  assert.equal(await page.locator('#drawing').getAttribute('data-view'),'base','Invalid selectors fall back to the base proposal');
  assert.equal(await page.locator('#scenario').inputValue(),'');
  await ready(page,'?scenario=country-erp&step=-3');
  assert.equal(await page.locator('#drawing').getAttribute('data-view'),'scenario-country-erp-1','Negative steps are clamped to the beginning');
  await ready(page,'?scenario=country-erp&step=999');
  const erpScenario=architecture.scenarios.find(scenario=>scenario.id==='country-erp');
  assert.equal(await page.locator('#drawing').getAttribute('data-view'),`scenario-country-erp-${erpScenario.steps.length}`,'Out-of-range steps are clamped to the end');
  await ready(page,'?scenario=country-erp&step=3');
  const erpPanel=page.locator('[data-scenario-panel="country-erp"]');
  assert.equal(await erpPanel.locator('[aria-current="step"]').getAttribute('data-step'),'2','Shared step numbers are one-based');
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin});
  await page.locator('#copy-view').click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),page.url(),'Copy includes the selected scenario and step');
  await erpPanel.locator('[data-next-step]').click();
  assert.equal(new URL(page.url()).searchParams.get('step'),'4');
  await page.goBack();
  assert.equal(await erpPanel.locator('[aria-current="step"]').getAttribute('data-step'),'2');
  await page.goForward();
  assert.equal(await erpPanel.locator('[aria-current="step"]').getAttribute('data-step'),'3');
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.documentElement.dataset.architectureReady==='true');
  assert.equal(await page.locator('#drawing').getAttribute('data-view'),'scenario-country-erp-4');
  await assertActiveStepVisible(page,'ERP step4 deep link');
  await capture(page,'scenario-erp.png');
  await page.locator('#clear-selection').click();
  assert.equal(await page.locator('#drawing').getAttribute('data-view'),'base');
  assert.equal(new URL(page.url()).search,'');
  assert.ok(await page.locator('#inspector').isHidden());
  report.checks.push('All projected views, valid/invalid deep links, step clamping, copy, reload and scenario back/forward');

  const native = await page.locator('#drawing svg').evaluate(svg => ({ width: svg.viewBox.baseVal.width, viewBox: svg.getAttribute('viewBox'), text: svg.textContent }));
  await page.locator('#actual').click();
  const actualWidth = await page.locator('#drawing').evaluate(node => node.getBoundingClientRect().width);
  assert.ok(Math.abs(actualWidth - native.width) < 1, '100% uses native SVG width');
  await page.locator('#zoom-in').click();
  assert.ok(await page.locator('#drawing').evaluate(node => node.getBoundingClientRect().width) > actualWidth, 'Zoom increases actual SVG dimensions');
  assert.equal(await page.locator('#drawing svg').getAttribute('viewBox'), native.viewBox, 'Zoom preserves vector coordinates');
  assert.equal(await page.locator('#drawing svg').textContent(), native.text, 'Zoom preserves SVG labels');
  assert.equal(await page.locator('#drawing svg image, #drawing canvas').count(), 0, 'Zoom never swaps the diagram for a raster');
  await page.locator('#view').selectOption('full');
  await page.locator('#actual').click();
  const viewport=page.locator('#viewport');
  await viewport.focus();
  const fullNativeWidth=await page.locator('#drawing').evaluate(node=>node.getBoundingClientRect().width);
  await viewport.press('+');
  assert.ok(await page.locator('#drawing').evaluate(node=>node.getBoundingClientRect().width)>fullNativeWidth,'Viewport keyboard zoom enlarges the vector');
  await viewport.press('1');
  assert.ok(Math.abs(await page.locator('#drawing').evaluate(node=>node.getBoundingClientRect().width)-fullNativeWidth)<1,'Viewport 1 restores actual vector dimensions');
  const panStart=await viewport.evaluate(node=>{
    node.scrollLeft=200;node.scrollTop=200;
    const box=node.getBoundingClientRect();
    for(let y=box.top+40;y<box.bottom-80;y+=24)for(let x=box.left+40;x<box.right-80;x+=24){
      const target=document.elementFromPoint(x,y);
      if(node.contains(target)&&!target.closest('[data-item-id]'))return {x,y,left:node.scrollLeft,top:node.scrollTop};
    }
    return null;
  });
  assert.ok(panStart,'The map has background where users can drag without selecting a node');
  await page.mouse.move(panStart.x,panStart.y);
  await page.mouse.down();
  await page.mouse.move(panStart.x+50,panStart.y+40,{steps:5});
  await page.mouse.up();
  const panEnd=await viewport.evaluate(node=>({left:node.scrollLeft,top:node.scrollTop}));
  assert.ok(panEnd.left<panStart.left||panEnd.top<panStart.top,'Dragging the background scrolls the map');
  assert.equal(await page.locator('#drawing .is-selected').count(),0,'Dragging the background does not select an unrelated component');
  assert.equal(await viewport.evaluate(node=>node.classList.contains('is-panning')),false,'Pointer release ends panning');
  for (const item of allItems) {
    const shape = page.locator(`#drawing [data-item-id="${item.id}"] ${edgeIds.has(item.id) ? '.architecture-edge-label' : '.architecture-node-box'}`);
    await shape.click();
    await assertSelection(page, item);
  }
  await assertNoHorizontalOverflow(page, 'Desktop at native SVG size');
  report.checks.push(`Background panning and keyboard zoom preserve selection; real SVG clicks select every one of ${architecture.nodes.length} nodes and ${architecture.edges.length} relationships`);

  for (const [item, key] of [[architecture.nodes[0], 'Enter'], [architecture.edges[0], 'Space']]) {
    const control = page.locator(`#drawing [data-item-id="${item.id}"]`);
    await control.focus();
    assert.equal(await control.getAttribute('role'), 'button');
    assert.equal(await control.getAttribute('tabindex'), '0');
    assert.ok(await control.evaluate(node => document.activeElement === node && Number.parseFloat(getComputedStyle(node).outlineWidth) >= 2), 'SVG keyboard focus is visible');
    await control.press(key);
    await assertSelection(page, item);
    assert.ok(await page.locator(`#detail-${item.id} h2`).evaluate(node => node === document.activeElement), 'Keyboard selection moves focus to the inspector heading');
  }

  const first = architecture.nodes[0], second = architecture.edges[0];
  await ready(page, `#detail-${first.id}`);
  await assertSelection(page, first);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.architectureReady === 'true');
  await assertSelection(page, first);
  await page.locator('#back-index').click();
  await page.locator('[data-kind-filter="edge"]').click();
  await page.locator(`#index-panel [data-select="${second.id}"]`).click();
  await assertSelection(page, second);
  await page.goBack();
  assert.equal(await page.locator('#inspector').getAttribute('data-active'), 'index');
  await page.goBack();
  await assertSelection(page, first);
  await page.goForward();
  assert.equal(await page.locator('#inspector').getAttribute('data-active'), 'index');
  await page.goForward();
  await assertSelection(page, second);
  await ready(page, '#detail-item-without-a-source');
  assert.equal(await page.locator('#inspector').getAttribute('data-active'), 'index', 'An unknown deep link does not select an unrelated item');
  assert.equal(await page.locator('#drawing .is-selected').count(), 0);
  assert.equal(new URL(page.url()).pathname, '/architecture/', 'An unknown item does not reroute to an invented source');
  report.checks.push('Enter/Space, inspector focus, deep links, reload, back/forward and unknown-target handling');

  if(await page.locator('#inspector').isHidden())await page.locator('#toggle-inspector').click();
  await page.locator('[data-kind-filter="node"]').click();
  await page.locator('#search').fill('zzzz-no-architecture-result');
  assert.equal(await page.locator('[data-index-item]:visible').count(), 0);
  assert.match(await page.locator('#result-count').textContent(), /Sin resultados/u);
  const accented = architecture.nodes.find(item => /[áéíóúñ]/iu.test([item.title, item.technology, item.summary, item.description].join(' ')));
  assert.ok(accented, 'The model contains a diacritic search fixture');
  const token = [accented.title, accented.technology, accented.summary, accented.description].join(' ').match(/[\p{L}]*[áéíóúñ][\p{L}]*/iu)[0];
  await page.locator('#search').fill(token);
  const accentedResults = await page.locator('[data-index-item]:visible [data-select]').evaluateAll(items => items.map(item => item.dataset.select).sort());
  await page.locator('#search').fill(normalize(token).toUpperCase());
  assert.deepEqual(await page.locator('[data-index-item]:visible [data-select]').evaluateAll(items => items.map(item => item.dataset.select).sort()), accentedResults, 'Search ignores case and diacritics');
  assert.ok(accentedResults.includes(accented.id));
  await page.locator('#search').fill('');
  await page.locator('[data-kind-filter="edge"]').click();
  assert.deepEqual(await page.locator('[data-index-item]:visible [data-select]').evaluateAll(items => items.map(item => item.dataset.select).sort()), sorted(edgeIds), 'Connections filter contains only and all relationships');
  await page.locator('[data-kind-filter="node"]').click();
  assert.deepEqual(await page.locator('[data-index-item]:visible [data-select]').evaluateAll(items => items.map(item => item.dataset.select).sort()), sorted(nodeIds));
  report.checks.push('Search without accents, empty results, exact node/connection filters');

  for (const scenario of architecture.scenarios) {
    await page.locator('#scenario').selectOption(scenario.id);
    const panel = page.locator(`[data-scenario-panel="${scenario.id}"]`);
    assert.ok(await panel.isVisible());
    for (const [index, step] of scenario.steps.entries()) {
      await panel.locator(`[data-step="${index}"]`).click();
      assert.equal(await panel.locator('[aria-current="step"]').getAttribute('data-step'), String(index));
      const projection=scenarioView(scenario,index);
      assert.equal(await page.locator('#drawing').getAttribute('data-view'),`scenario-${scenario.id}-${index+1}`);
      assert.deepEqual(await page.locator('#drawing [data-item-id]').evaluateAll(items=>items.map(item=>item.dataset.itemId).sort()),sorted([...projection.nodes,...projection.edges].map(item=>item.id)),`Only the declared step and its process owners are drawn: ${scenario.id}/${index}`);
      assert.equal(new URL(page.url()).searchParams.get('scenario'),scenario.id);
      assert.equal(new URL(page.url()).searchParams.get('step'),String(index+1));
      assert.equal(await page.locator('#drawing .is-related').count(), 0, 'Scenario highlights do not leak prior selection');
      assert.equal(await panel.locator('[data-previous-step]').isDisabled(), index === 0);
      assert.equal(await panel.locator('[data-next-step]').isDisabled(), index === scenario.steps.length - 1);
      await assertCamera(page, projection.nodes.map(node=>node.id), `Desktop ${scenario.id}/${index}`);
      await assertActiveStepVisible(page,`${scenario.id}/${index+1}`);
      if(scenario.id==='recovery'&&index===3)await capture(page,'scenario-recovery.png');
    }
    if (scenario.steps.length > 1) {
      await panel.locator('[data-previous-step]').click();
      assert.equal(await panel.locator('[aria-current="step"]').getAttribute('data-step'), String(scenario.steps.length - 2));
      await panel.locator('[data-next-step]').click();
      assert.equal(await panel.locator('[aria-current="step"]').getAttribute('data-step'), String(scenario.steps.length - 1));
    }
  }
  await page.locator('#clear-selection').click();
  assert.equal(await page.locator('#drawing .is-selected, #drawing .is-related').count(), 0);
  assert.equal(await page.locator('#scenario').inputValue(), '');
  await page.locator('.skip-link').focus();
  await page.locator('.skip-link').press('Enter');
  assert.ok(await page.locator('#inspector').isVisible(),'Skip link reveals the details panel');
  assert.ok(await page.locator('#search').evaluate(node=>document.activeElement===node),'Skip link focuses the search field');
  report.checks.push(`All ${architecture.scenarios.length} guided scenarios mount exact step projections with readable desktop titles, all nodes framed, visible active steps, shareable URLs and usable skip link`);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('a[download][href="/docs/architecture/pos-platform.svg"]').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'pos-platform.svg');
  assert.equal(await download.failure(), null);
  assert.equal(fs.readFileSync(await download.path(), 'utf8'), fs.readFileSync(sourceSvgPath, 'utf8'));
  await ready(page, `#detail-${first.id}`);
  await capture(page, 'desktop-detail.png');
  const source = first.sources.find(source => source.href.startsWith('/guide/'));
  assert.ok(source, 'The first node has an internal reference');
  await page.locator(`#detail-${first.id} .sources a[href="${source.href}"]`).click();
  await page.waitForURL(origin + source.href);
  assert.equal(new URL(page.url()).pathname, new URL(source.href, origin).pathname, 'Source navigation is not intercepted as a diagram selection');
  report.checks.push('SVG download byte equality and real documentation navigation');

  const mobileContext = await contextFor({ viewport: { width: 375, height: 812 } });
  const mobile = await mobileContext.newPage();
  observe(mobile);
  await ready(mobile);
  await assertNoHorizontalOverflow(mobile, 'Mobile overview');
  const smallControls=await mobile.locator('.toolbar button,.toolbar select').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length&&node.getBoundingClientRect().height<44).map(node=>node.textContent.trim()));
  assert.deepEqual(smallControls,[],'Mobile view, scenario and zoom controls retain 44px targets');
  await capture(mobile, 'mobile.png');
  await mobile.locator('#toggle-inspector').click();
  await mobile.locator(`#index-panel [data-select="${first.id}"]`).click();
  await assertSelection(mobile, first);
  await assertNoHorizontalOverflow(mobile, 'Mobile detail');
  await capture(mobile, 'mobile-detail.png');
  await mobile.locator('#back-index').click();
  assert.ok(await mobile.locator('#search').evaluate(node => document.activeElement === node), 'Mobile back returns focus to search');
  for (const scenario of architecture.scenarios) {
    await mobile.locator('#scenario').selectOption(scenario.id);
    const panel = mobile.locator(`[data-scenario-panel="${scenario.id}"]`);
    for (const [index, step] of scenario.steps.entries()) {
      await panel.locator(`[data-step="${index}"]`).click();
      await assertCamera(mobile, scenarioView(scenario,index).nodes.map(node=>node.id), `Mobile ${scenario.id}/${index}`);
    }
  }
  await mobileContext.close();

  const noJs = await contextFor({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const fallback = await noJs.newPage();
  observe(fallback);
  assert.equal((await fallback.goto(origin + '/architecture/', { waitUntil: 'networkidle' })).status(), 200);
  assert.equal(await fallback.locator('[data-detail]:visible').count(), allItems.length, 'All detail cards exist without JavaScript');
  assert.equal(await fallback.locator('#drawing svg image').count(), 0);
  await assertNoHorizontalOverflow(fallback, 'No-JavaScript mobile');
  for (const item of [first, second, allItems.at(-1)]) {
    await fallback.locator(`#index-panel [data-select="${item.id}"]`).click();
    assert.equal(new URL(fallback.url()).hash, `#detail-${item.id}`);
    const rect = await fallback.locator(`#detail-${item.id}`).boundingBox();
    assert.ok(rect && rect.y >= -1 && rect.y < 812, `Native anchor scrolls to ${item.id} without JavaScript`);
  }
  assert.ok(await fallback.locator('a[download][href="/docs/architecture/pos-platform.svg"]').isVisible(),'The complete vector is downloadable without JavaScript on mobile');
  await fallback.setViewportSize({width:1440,height:1000});
  for(const href of ['/docs/architecture/pos-platform-base.svg','/docs/architecture/pos-platform.svg'])
    assert.ok(await fallback.locator(`a[download][href="${href}"]`).isVisible(),`The ${href} vector is downloadable without JavaScript on desktop`);
  await noJs.close();
  report.checks.push('375px responsive layout and usable native anchors/details without JavaScript');

  assert.deepEqual(report.browserErrors, [], 'No browser errors or CSP violations');
  assert.deepEqual(report.sourceErrors, [], 'Every document source and resource resolves');
  assert.deepEqual(report.failedRequests, [], 'No failed browser resources');
  assert.deepEqual(report.externalRequests, [], 'No requests to external or corporate services');
  assert.deepEqual(report.unexpectedMethods, [], 'No business mutations are requested');
  report.ok = true;
  report.counts = { nodes: architecture.nodes.length, edges: architecture.edges.length, scenarios: architecture.scenarios.length };
  console.log(`Architecture verified: ${architecture.nodes.length} nodes, ${architecture.edges.length} relationships, ${architecture.scenarios.length} scenarios, ${report.links.length} local resources; desktop, mobile and no-JS.`);
} catch (error) {
  report.ok = false;
  report.failure = error.stack || String(error);
  throw error;
} finally {
  fs.writeFileSync(path.join(results, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
