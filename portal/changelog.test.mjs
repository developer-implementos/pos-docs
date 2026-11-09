import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {loadChangelog, parseChangelog, renderInline} from './changelog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('the repository history reads newest first, with sections, entries and their PR', () => {
  const releases = loadChangelog(root);
  const manifest = JSON.parse(fs.readFileSync(`${root}/.release-please-manifest.json`, 'utf8'));
  assert.equal(releases[0].version, manifest['.']);
  assert.equal(releases.at(-1).version, '0.1.0');
  const second = releases.find(release => release.version === '0.2.0');
  assert.deepEqual(second.sections.map(section => section.title), ['Novedades', 'Correcciones']);
  assert.deepEqual(second.sections[0].entries[0], {
    scope:'release', text:'[TASK-253] versionar POS Docs y publicar su historial de cambios',
    pr:37, prUrl:'https://github.com/developer-implementos/pos-docs/issues/37', commit:'1b3cbd6',
  });
  assert.equal(second.date, '2026-11-09');
  assert.equal(second.compare, 'https://github.com/developer-implementos/pos-docs/compare/v0.1.0...v0.2.0');
  // The baseline has prose and no entries.
  assert.deepEqual(releases.at(-1).sections, []);
});

test('entries without scope, PR or commit and breaking sections are kept as written', () => {
  const [release] = parseChangelog(`# Historial

## [1.0.0](https://github.com/developer-implementos/pos-docs/compare/v0.9.0...v1.0.0) (2026-12-01)


### ⚠ BREAKING CHANGES

* **guide:** retirar \`/guide/legacy/\` ([#90](https://github.com/developer-implementos/pos-docs/issues/90)) ([abcdef1](https://github.com/developer-implementos/pos-docs/commit/abcdef1))

### Contenido actualizado

* FOLLOWUP-009 nuevo: falta el acceso al ambiente de pruebas
* **follow-up:** FOLLOWUP-005 resuelto ([#91](https://github.com/developer-implementos/pos-docs/issues/91))

## 0.9.0 (2026-11-30)
`);
  assert.equal(release.version, '1.0.0');
  assert.deepEqual(release.sections.map(section => [section.title, section.entries.length]), [['⚠ BREAKING CHANGES', 1], ['Contenido actualizado', 2]]);
  assert.deepEqual(release.sections[1].entries[0], {scope:null, text:'FOLLOWUP-009 nuevo: falta el acceso al ambiente de pruebas', pr:null, prUrl:null, commit:null});
  assert.deepEqual(release.sections[1].entries[1], {scope:'follow-up', text:'FOLLOWUP-005 resuelto', pr:91, prUrl:'https://github.com/developer-implementos/pos-docs/issues/91', commit:null});
});

test('a history without versions or with an unreadable entry is rejected', () => {
  assert.throws(() => parseChangelog('# Historial\n\nSin versiones.\n'), /no release heading/);
  assert.throws(() => parseChangelog('## 0.1.0 (2026-11-08)\n\n### Novedades\n\n*sin espacio\n'), /Unreadable changelog line/);
});

test('inline text escapes HTML and keeps only code spans and https links', () => {
  assert.equal(renderInline('usar `<b>` y [la guía](https://example.test/a?b=1&c=2)'), 'usar <code>&lt;b&gt;</code> y <a href="https://example.test/a?b=1&amp;c=2">la guía</a>');
  assert.equal(renderInline('[x](javascript:alert(1)) <script>'), '[x](javascript:alert(1)) &lt;script&gt;');
});
