import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {loadProgress} from './progress.mjs';
import {loadFollowUp} from './follow-up.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'apps/starlight/package.json'));
const {chromium} = require('playwright');
const {servePublic} = require(path.join(root, 'apps/starlight/scripts/serve.cjs'));
const model = loadFollowUp(root, loadProgress(root));
const output = path.join(root, 'test-results-follow-up');
fs.mkdirSync(output, {recursive: true});
const server = await servePublic(0);
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  const firstWork = model.workPackages[0];
  const firstAction = model.items[0];
  for (const [old, target] of [
    ['', '/project/'],
    ['#work-title', '/project/work/'],
    ['#actions-title', '/project/attention/'],
    [`#work-${firstWork.id.toLowerCase()}`, `/project/work/#work-${firstWork.id.toLowerCase()}`],
    [`#${firstAction.id.toLowerCase()}`, `/project/attention/#${firstAction.id.toLowerCase()}`],
    ['?phase=phase-02&status=remaining', '/project/work/?phase=phase-02&status=remaining'],
    ['?query=F01', '/project/work/?query=F01'],
    ['?scope=operational&state=open', '/project/attention/?scope=operational&state=open'],
  ]) {
    await page.goto(`${origin}/guide/project-status/${old}`, {waitUntil: 'networkidle'});
    await page.waitForURL(origin + target);
    assert.equal(page.url(), origin + target, `Historical URL retains its destination: ${old}`);
    if (target.includes('#')) assert.ok(await page.locator(target.slice(target.indexOf('#'))).isVisible());
  }
  await page.screenshot({path: path.join(output, 'permalink.png')});
  const noJs = await browser.newContext({javaScriptEnabled: false});
  const fallback = await noJs.newPage();
  await fallback.goto(`${origin}/guide/project-status/`);
  const expectedLinks = [
    ...model.workPackages.map(work => [`work-${work.id.toLowerCase()}`, `/project/work/#work-${work.id.toLowerCase()}`]),
    ...model.items.map(action => [action.id.toLowerCase(), `/project/attention/#${action.id.toLowerCase()}`]),
  ];
  for (const [id, href] of expectedLinks) assert.equal(await fallback.locator(`#${id} a`).getAttribute('href'), href);
  await fallback.locator('[data-project-migration] summary').click();
  await fallback.locator(`#work-${firstWork.id.toLowerCase()} a`).click();
  assert.equal(new URL(fallback.url()).pathname, '/project/work/');
  assert.ok(await fallback.locator(`#work-${firstWork.id.toLowerCase()}`).isVisible());
  assert.deepEqual(failures, [], 'Historical route has no browser or CSP errors');
  await noJs.close();
  console.log(`Follow-up compatibility passed: redirects, filters and ${expectedLinks.length} historical permalinks with no-JS fallback.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
