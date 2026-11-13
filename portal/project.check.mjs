import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {loadProgress} from './progress.mjs';
import {loadFollowUp} from './follow-up.mjs';
import {loadPlanning} from './planning.mjs';
import {loadQuestions} from './questions.mjs';
import {loadRules} from './rules.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'apps/starlight/package.json'));
const {chromium} = require('playwright');
const {servePublic} = require(path.join(root, 'apps/starlight/scripts/serve.cjs'));
const progress = loadProgress(root);
const followUp = loadFollowUp(root, progress);
const planning = loadPlanning(root, progress, followUp);
const questions = loadQuestions(root, progress, followUp);
const rules = loadRules(root, progress, questions);
const output = path.join(root, 'test-results-project');
fs.mkdirSync(output, {recursive: true});
const server = await servePublic(0);
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless: true});
const routes = ['/project/', '/project/plan/', '/project/work/', '/project/attention/', '/project/questions/', '/project/rules/', '/project/team/'];
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
  const failures = [], external = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  page.on('request', request => { if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) external.push(request.url()); });
  const count = () => page.locator('[data-project-item]:visible').count();
  const form = () => page.locator('[data-project-filters]');
  const reset = async () => {
    await form().getByRole('button', {name: 'Limpiar filtros'}).click();
    await page.waitForFunction(() => !location.search);
  };
  const navigate = async route => {
    const response = await page.goto(origin + route, {waitUntil: 'networkidle'});
    if (response) assert.equal(response.status(), 200, `${route} is published`);
    assert.equal(new URL(page.url()).pathname, new URL(route, origin).pathname);
  };
  for (const route of routes) {
    await navigate(route);
    const nav = page.getByRole('navigation', {name: 'Gestión del proyecto', exact: true});
    assert.equal(await nav.locator('[aria-current="page"]').getAttribute('href'), route);
    assert.deepEqual(await nav.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href'))), routes);
    assert.equal(await page.locator('h1').count(), 1);
    await page.screenshot({path: path.join(output, `${route.split('/')[2] || 'summary'}-desktop.png`)});
  }

  await navigate('/project/plan/');
  assert.equal(await page.locator('[data-plan-item]').count(), planning.items.length);
  const firstPlan = planning.items[0];
  await navigate(`/project/plan/#plan-${firstPlan.key}`);
  assert.notEqual(await page.locator(`#plan-${firstPlan.key} details`).getAttribute('open'), null, 'Planning permalinks expose scope and tests');
  await page.locator(`#plan-${firstPlan.key} a[href^="/project/work/#"]`).click();
  assert.equal(new URL(page.url()).hash, `#work-${firstPlan.parentDelivery.toLowerCase()}`);
  await navigate('/project/');
  for (const [id, entries] of [['phases', progress.phases], ['apps', progress.applications]]) {
    const bars = page.locator(`#${id} progress`);
    assert.equal(await bars.count(), entries.length);
    for (const [index, entry] of entries.entries()) {
      assert.equal(Number(await bars.nth(index).getAttribute('value')), entry.completed);
      assert.equal(Number(await bars.nth(index).getAttribute('max')), entry.total);
    }
  }
  const technicalMetric = page.locator('.project-kpis a[href="/project/work/?status=verified"]');
  assert.ok((await technicalMetric.innerText()).includes(`${new Intl.NumberFormat('es-CL', {maximumFractionDigits: 1}).format(progress.percent)} %`));
  assert.ok((await technicalMetric.innerText()).includes(`${progress.completed} de ${progress.total}`));
  const acceptanceMetric = page.locator('.project-kpis a[href="/project/work/?status=review"]');
  assert.equal(Number(await acceptanceMetric.locator('strong').innerText()), progress.pendingAcceptance);
  assert.ok((await acceptanceMetric.innerText()).includes(`${progress.accepted} aceptados`), 'Human acceptance stays separate from technical verification');
  const provenance = page.locator('#project-sources');
  await page.locator('[data-project-update] summary').click();
  await page.getByRole('link', {name: 'Ver fuentes', exact: true}).click();
  assert.notEqual(await provenance.getAttribute('open'), null, 'Source links reveal their disclosure');
  assert.equal(await provenance.locator('summary').evaluate(element => element === document.activeElement), true);
  await page.keyboard.press('Enter');
  await provenance.locator('summary').focus();
  await page.keyboard.press('Enter');
  assert.notEqual(await provenance.getAttribute('open'), null, 'Source and methodology details are keyboard accessible');
  assert.ok(await provenance.locator('a[href="/guide/implementation/progress/"]').isVisible());
  await page.keyboard.press('Enter');
  await navigate('/project/#project-sources');
  await page.reload({waitUntil: 'networkidle'});
  assert.notEqual(await provenance.getAttribute('open'), null, 'Source permalinks open their disclosure on arrival');
  await navigate('/project/');
  const metrics = [
    ['/project/work/?status=verified', followUp.workPackages.filter(work => work.status === 'verified').length],
    ['/project/work/?status=in_progress', followUp.workPackages.filter(work => work.status === 'in_progress').length],
    ['/project/work/?status=review', followUp.workPackages.filter(work => work.status === 'verified' && !work.acceptance).length],
    ['/project/attention/?state=open', followUp.items.filter(action => action.state === 'open').length],
  ];
  for (const [href, expected] of metrics) {
    await page.locator(`.project-kpis a[href="${href}"]`).click();
    assert.equal(await count(), expected, `Indicator opens its filtered detail: ${href}`);
    await page.goBack({waitUntil: 'networkidle'});
  }
  const view = page.locator('[data-breakdown-select]');
  await view.selectOption('apps');
  assert.equal(new URL(page.url()).searchParams.get('view'), 'apps');
  assert.ok(await page.locator('#apps').isVisible());
  assert.ok(await page.locator('#phases').isHidden());
  await page.reload({waitUntil: 'networkidle'});
  assert.equal(await view.inputValue(), 'apps');
  await view.selectOption('phases');
  await page.goBack({waitUntil: 'networkidle'});
  assert.equal(await view.inputValue(), 'apps', 'Back restores the distribution view');
  const appLink = page.locator('#apps a').first();
  const appHref = new URL(await appLink.getAttribute('href'), origin);
  await appLink.click();
  assert.equal(await count(), followUp.workPackages.filter(work => work.apps.includes(appHref.searchParams.get('app'))).length);

  await navigate('/project/work/');
  assert.equal(await count(), followUp.workPackages.length);
  const phase = progress.phases[1]?.id || progress.phases[0].id;
  await form().locator('[name=phase]').selectOption(phase);
  assert.equal(new URL(page.url()).searchParams.get('phase'), phase);
  assert.equal(await count(), followUp.workPackages.filter(work => work.phase === phase).length);
  await form().locator('[name=status]').selectOption('remaining');
  assert.equal(await count(), followUp.workPackages.filter(work => work.phase === phase && work.status !== 'verified').length);
  await page.goBack({waitUntil: 'networkidle'});
  assert.equal(await form().locator('[name=phase]').inputValue(), phase);
  assert.equal(await form().locator('[name=status]').inputValue(), '', 'Back restores filter controls');
  await page.goForward({waitUntil: 'networkidle'});
  assert.equal(await form().locator('[name=status]').inputValue(), 'remaining');
  await page.reload({waitUntil: 'networkidle'});
  assert.equal(await form().locator('[name=phase]').inputValue(), phase, 'Reload restores URL filters');
  await form().locator('[name=query]').fill('zz-no-coincide');
  assert.equal(new URL(page.url()).searchParams.get('query'), 'zz-no-coincide');
  assert.ok(await page.locator('[data-project-empty]').isVisible());
  assert.equal(await count(), 0);
  await reset();
  assert.equal(await count(), followUp.workPackages.length);
  await form().locator('[name=assignee]').selectOption('unassigned');
  assert.equal(await count(), followUp.workPackages.filter(work => work.issue.assignees.length === 0).length);
  await reset();
  const firstWork = followUp.workPackages[0];
  const workId = `work-${firstWork.id.toLowerCase()}`;
  await form().locator('[name=query]').fill('zz-no-coincide');
  await page.evaluate(id => { location.hash = id; }, workId);
  await page.waitForFunction(id => !document.getElementById(id).hidden, workId);
  assert.ok(await page.locator(`#${workId}`).isVisible(), 'A permalink reveals work excluded by filters');
  assert.equal(await page.locator(`#${workId} details`).getAttribute('open'), '', 'A permalink opens its evidence');
  const disclosure = page.locator(`#${workId} summary`);
  await disclosure.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator(`#${workId} details`).getAttribute('open'), null, 'Evidence supports keyboard toggling');
  await page.keyboard.press('Enter');
  assert.notEqual(await page.locator(`#${workId} details`).getAttribute('open'), null);
  await form().locator('[name=phase]').selectOption(phase);
  assert.equal(new URL(page.url()).hash, '', 'Changing filters removes a previous permalink target');
  await page.reload({waitUntil: 'networkidle'});
  assert.equal(await form().locator('[name=phase]').inputValue(), phase, 'A previous anchor cannot override new filters on reload');
  assert.equal(await count(), followUp.workPackages.filter(work => work.phase === phase).length);

  await navigate('/project/attention/');
  assert.equal(await count(), followUp.items.length);
  await form().locator('[name=state]').selectOption('open');
  await form().locator('[name=scope]').selectOption('operational');
  assert.equal(await count(), followUp.items.filter(action => action.state === 'open' && action.impactScope === 'operational').length);
  await form().locator('[name=owner]').selectOption('unassigned');
  assert.equal(await count(), followUp.items.filter(action => action.state === 'open' && action.impactScope === 'operational' && !action.owner).length);
  await reset();
  await form().locator('[name=state]').selectOption('resolved');
  assert.equal(await count(), followUp.items.filter(action => action.state === 'resolved').length);
  const firstAction = followUp.items.find(action => action.state === 'open') || followUp.items[0];
  await page.evaluate(id => { location.hash = id; }, firstAction.id.toLowerCase());
  await page.waitForFunction(id => !document.getElementById(id).hidden, firstAction.id.toLowerCase());
  assert.ok(await page.locator(`#${firstAction.id.toLowerCase()}`).isVisible(), 'A permalink reveals an action excluded by filters');
  await form().locator('[name=query]').fill('zz-no-coincide');
  assert.ok(await page.locator('[data-project-empty]').isVisible());
  await page.locator('[data-project-empty] [data-project-reset]').click();
  assert.equal(await form().locator('[name=query]').inputValue(), '');
  const related = page.locator('[data-project-item]:visible a[href^="/project/work/#"]').first();
  const relatedId = (await related.getAttribute('href')).split('#')[1];
  await related.click();
  assert.ok(await page.locator(`#${relatedId}`).isVisible(), 'Actions link to affected deliverables');

  if (rules) {
    await navigate('/project/rules/');
    assert.equal(await count(), rules.items.length, 'Every rule is listed');
    assert.equal(await page.locator('[data-project-group]:visible').count(), rules.groups.length);
    const internal = rules.items.find(item => item.disclosure === 'internal');
    if (internal) {
      const card = page.locator(`#${internal.id.toLowerCase()}`);
      assert.equal(await card.locator('h3').count(), 0, 'An internal rule publishes no title');
      assert.equal(await card.getAttribute('data-disclosure'), 'internal');
    }
    await form().locator('[name=decision]').selectOption('abierta');
    assert.equal(await count(), rules.items.filter(item => item.decision === 'abierta').length);
    const area = Object.keys(rules.areas)[0];
    await form().locator('[name=area]').selectOption(area);
    assert.equal(await count(), rules.items.filter(item => item.decision === 'abierta' && item.area === area).length, 'Filters combine');
    await reset();
    await form().locator('[name=disclosure]').selectOption('internal');
    assert.equal(await count(), rules.counts.disclosure.internal, 'Internal rules can be listed by themselves');
    await reset();
    const question = rules.items.find(item => item.linkedQuestions.length)?.linkedQuestions[0];
    if (question) {
      await page.locator(`[data-project-item]:visible a[href="/project/questions/#${question.id.toLowerCase()}"]`).first().click();
      assert.equal(new URL(page.url()).hash, `#${question.id.toLowerCase()}`, 'A rule links the question where it is decided');
    }
  }

  await navigate('/project/questions/');
  const groups = () => page.locator('[data-project-group]:visible').count();
  assert.equal(await count(), questions.items.length);
  assert.equal(await groups(), questions.groups.length);
  assert.equal(await page.locator('[data-project-group] h2 a').evaluateAll(links => links.map(link => link.getAttribute('href'))).then(hrefs => hrefs.join(' ')), questions.groups.map(group => group.href).join(' '), 'Each phase group names and links its phase');
  await form().locator('[name=state]').selectOption('open');
  assert.equal(new URL(page.url()).searchParams.get('state'), 'open');
  assert.equal(await count(), questions.items.filter(item => item.state === 'open').length);
  const questionPhase = questions.phases.at(-1).id;
  await form().locator('[name=phase]').selectOption(questionPhase);
  const inPhase = questions.items.filter(item => item.state === 'open' && item.phases.includes(questionPhase));
  assert.equal(await count(), inPhase.length, 'The phase filter includes every question that affects the phase');
  assert.equal(await groups(), new Set(inPhase.map(item => item.phase)).size, 'Groups without visible questions are hidden');
  await page.goBack({waitUntil: 'networkidle'});
  assert.equal(await form().locator('[name=phase]').inputValue(), '', 'Back restores question filters');
  await reset();
  assert.equal(await groups(), questions.groups.length);
  const decider = questions.deciders[0];
  await form().locator('[name=decider]').selectOption(decider);
  assert.equal(await count(), questions.items.filter(item => item.decider === decider).length);
  await reset();
  await form().locator('[name=recommendation]').selectOption('present');
  assert.equal(new URL(page.url()).searchParams.get('recommendation'), 'present');
  assert.equal(await count(), questions.counts.recommended, 'The filter selects every question with the agent recommendation');
  await reset();
  await form().locator('[name=recommendation]').selectOption('none');
  assert.equal(new URL(page.url()).searchParams.get('recommendation'), 'none');
  assert.equal(await count(), questions.items.filter(item => item.recommendationStatus === 'none').length, 'Only open rules appear as missing a recommendation');
  await reset();
  for (const scope of questions.scopes) {
    await form().locator('[name=scope]').selectOption(scope);
    assert.equal(await count(), questions.items.filter(item => item.recommendation?.scope === scope).length, `The scope filter selects ${scope}`);
    await reset();
  }
  assert.equal(await page.locator('.project-question-counts a').count(), 3, 'Open, answered and decided, without a separate validation');
  const summaryText = await page.locator('.project-question-summary').innerText();
  const pending = questions.counts.pendingDecision;
  assert.ok(summaryText.includes(`${pending} ${pending === 1 ? 'pendiente' : 'pendientes'} de decisión`), 'The summary counts the open rules as pending decisions');
  assert.doesNotMatch(await page.locator('[data-project-page]').innerText(), /Sin respaldo del equipo|Respaldada|Validación de negocio|Pendiente de validación|Validada por|por validar|Borrador de agente|Recomendaci(?:ón|ones) del equipo/, 'Nothing is endorsed or validated');
  await page.locator('.project-question-recommendations a[href="/project/questions/?recommendation=present"]').click();
  await page.waitForURL(url => url.searchParams.get('recommendation') === 'present');
  assert.equal(await form().locator('[name=recommendation]').inputValue(), 'present', 'The recommendation count opens its filtered list');
  assert.equal(await count(), questions.counts.recommended);
  await navigate('/project/questions/?state=decided');
  assert.equal(await form().locator('[name=state]').inputValue(), 'decided');
  assert.equal(await count(), questions.items.filter(item => item.state === 'decided').length);
  for (const [name, value] of [['state', 'validated'], ['recommendation', 'endorsed']]) {
    await navigate(`/project/questions/?${name}=${value}`);
    assert.equal(await form().locator(`[name=${name}]`).inputValue(), '', `A shared link with ${name}=${value} shows every record`);
    assert.equal(await count(), questions.items.length);
  }
  await navigate('/project/questions/?state=answered');
  assert.equal(await form().locator('[name=state]').inputValue(), 'answered', 'Summary counts open their filtered list');
  assert.equal(await count(), questions.items.filter(item => item.state === 'answered').length);
  const firstQuestion = questions.items[0].id.toLowerCase();
  await form().locator('[name=query]').fill('zz-no-coincide');
  assert.ok(await page.locator('[data-project-empty]').isVisible());
  assert.equal(await groups(), 0);
  await page.evaluate(id => { location.hash = id; }, firstQuestion);
  await page.waitForFunction(id => !document.getElementById(id).hidden, firstQuestion);
  assert.ok(await page.locator(`#${firstQuestion}`).isVisible(), 'A permalink reveals a question excluded by filters');
  const linkedQuestion = questions.items.find(item => item.followUpAction);
  if (linkedQuestion) {
    await navigate(`/project/questions/#${linkedQuestion.id.toLowerCase()}`);
    await page.locator(`#${linkedQuestion.id.toLowerCase()} a[href^="/project/attention/#"]`).click();
    assert.equal(new URL(page.url()).hash, `#${linkedQuestion.followUp.toLowerCase()}`);
    assert.ok(await page.locator(`#${linkedQuestion.followUp.toLowerCase()}`).isVisible(), 'Questions link their published follow-up');
  }

  await navigate('/project/team/');
  const unassignedLink = page.locator('a[href*="/project/work/?"][href*="assignee=unassigned"]').first();
  await unassignedLink.click();
  const expectedUnassigned = followUp.workPackages.filter(work => !work.issue.assignees.length && (!new URL(page.url()).searchParams.has('status') || (work.issue.state === 'OPEN' && work.issue.executionLabels.length === 1 && work.issue.executionLabels.some(label => ['status:in-progress', 'status:blocked', 'status:review', 'status:validation'].includes(label))))).length;
  assert.equal(await count(), expectedUnassigned, 'Team links retain development assignment scope');

  for (const width of [390, 320]) {
    await page.setViewportSize({width, height: 844});
    for (const route of routes) {
      await navigate(route);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No horizontal page overflow: ${route} at ${width}px`);
      for (const control of await form().locator('input, select, button').all()) {
        assert.ok(await control.evaluate(element => element.getBoundingClientRect().height >= 44), `Touch target height at ${width}px`);
      }
      await page.screenshot({path: path.join(output, `${route.split('/')[2] || 'summary'}-${width}.png`)});
      if (route === '/project/') {
        await page.locator('[data-breakdown-select]').selectOption('apps');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Application view has no horizontal overflow at ${width}px`);
        await page.locator('.project-breakdown').screenshot({path: path.join(output, `summary-apps-${width}.png`)});
      } else if (route === '/project/plan/') {
        await page.locator('[data-plan-item]').first().screenshot({path: path.join(output, `plan-item-${width}.png`)});
      } else if (route === '/project/team/') {
        await page.locator('.project-team-list > li').first().screenshot({path: path.join(output, `team-person-${width}.png`)});
      } else {
        await page.locator('[data-project-item]').first().screenshot({path: path.join(output, `${route.split('/')[2]}-item-${width}.png`)});
      }
    }
  }

  const noJs = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
  const fallback = await noJs.newPage();
  for (const [route, expected] of [['/project/work/', followUp.workPackages.length], ['/project/attention/', followUp.items.length], ['/project/questions/', questions.items.length]]) {
    await fallback.goto(origin + route);
    assert.equal(await fallback.locator('[data-project-item]:visible').count(), expected, `${route} exposes every record without JavaScript`);
    assert.ok(await fallback.locator('[data-project-filters]').isHidden());
    assert.ok(await fallback.locator('[data-project-item] a[href^="https://github.com/"]').count() > 0);
  }
  await fallback.goto(origin + '/project/plan/');
  assert.equal(await fallback.locator('[data-plan-item]:visible').count(), planning.items.length, 'Planning works without JavaScript');
  await fallback.locator('[data-plan-item] details summary').first().click();
  assert.notEqual(await fallback.locator('[data-plan-item] details').first().getAttribute('open'), null);
  await fallback.goto(origin + '/project/');
  assert.ok(await fallback.locator('#apps').isVisible());
  assert.ok(await fallback.locator('#phases').isVisible());
  await fallback.locator('.project-kpis a').first().click();
  assert.equal(new URL(fallback.url()).pathname, '/project/work/', 'Metric links work without JavaScript');
  assert.equal(await fallback.locator('[data-project-item]:visible').count(), followUp.workPackages.length);
  await noJs.close();
  assert.deepEqual(failures, [], 'No browser or CSP errors');
  assert.deepEqual(external, [], 'No external service is consulted at runtime');
  console.log(`Project browser checks passed: ${followUp.workPackages.length} deliverables, ${followUp.items.length} actions, ${questions.items.length} questions in ${questions.groups.length} phases; metrics, URL filters/history, permalinks, keyboard, 320/390px and no-JS navigation.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
