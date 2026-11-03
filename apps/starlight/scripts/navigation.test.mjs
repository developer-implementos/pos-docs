import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { generatedPages, sidebar } from '../content-map.mjs';
import { authoredPageFiles } from './content-files.mjs';

const content = fileURLToPath(new URL('../src/content/docs/', import.meta.url));
const readPage = name => fs.readFileSync(new URL(`../src/content/docs/${name}`, import.meta.url), 'utf8');
const flatten = items => items.flatMap(item => item.items ? flatten(item.items) : [item]);

test('the six reader journeys keep every published documentation route reachable exactly once', () => {
  const groups = sidebar.filter(item => item.items);
  assert.equal(groups.length, 6, 'Keep one entry per reader need instead of promoting editorial categories');
  const paths = flatten(sidebar).map(item => item.link);
  assert.equal(new Set(paths).size, paths.length, 'A route must have one sidebar home');
  const authored = authoredPageFiles(content, generatedPages).map(file => file.replace(/\.mdx?$/, '').replace(/(^|\/)index$/, ''));
  const expected = [...generatedPages.map(page => page.route), ...authored].map(route => route ? `/${route}/` : '/');
  assert.deepEqual([...paths].sort(), [...expected].sort(), 'Regrouping must preserve all reference, legacy and manual pages');
});

test('the home points development, operations and project work to their canonical entries', () => {
  const source = readPage('index.mdx');
  const cards = [...source.matchAll(/<LinkCard\s[^>]*href="([^"]+)"[^>]*\/>/g)].map(match => match[1]);
  assert.deepEqual(cards, [
    '/guide/overview/',
    '/guide/implementation/start-a-task/',
    '/guide/api/pos-platform/',
    '/guide/flows/',
    '/project/',
    '/guide/evidence/country-comparison/',
  ]);
  assert.match(source, /\[estructura del código\]\(\/guide\/implementation\/monorepo\/\)/);
  assert.ok(!source.includes('href="/guide/architecture/monorepo/"'), 'Code entry must not target the proposed structure');
});

test('development and status journeys lead to implementation and the maintained status page', () => {
  const development = sidebar.find(item => item.label === 'Empezar una tarea');
  assert.equal(development.items[0].link, '/implementation/start-a-task/');
  const routes = flatten(development.items).map(item => item.link);
  assert.ok(routes.includes('/implementation/monorepo/'));
  assert.ok(routes.includes('/implementation/phase-1/'));
  const tracking = sidebar.find(item => item.label === 'Consultar avance y bloqueos');
  assert.equal(tracking.items[0].link, '/project-status/');
  assert.ok(!flatten(tracking.items).some(item => item.link === '/operations/open-items/'), 'The historical questionnaire is a source, not the blocker registry');
  const questionnaire = generatedPages.find(page => page.route === 'operations/open-items');
  assert.equal(questionnaire.source, 'docs/solicitud-informacion-equipo.md', 'Retain the permanent questionnaire URL');
});

test('the task guide links to the product workflow instead of claiming an implementation snapshot', () => {
  const page = generatedPages.find(item => item.route === 'implementation/start-a-task');
  assert.equal(page.kind, 'reference');
  const source = fs.readFileSync(new URL('../../../docs/start-a-task.md', import.meta.url), 'utf8');
  for (const file of ['AGENTS.md', 'CONTRIBUTING.md']) {
    assert.ok(source.includes(`https://github.com/developer-implementos/pos-platform/blob/main/${file}`));
  }
  for (const target of ['/project/plan/', '/project/attention/', '/guide/implementation/testing/', '/guide/implementation/progress/']) {
    assert.ok(source.includes(`](${target})`), `Missing task handoff: ${target}`);
  }
});
