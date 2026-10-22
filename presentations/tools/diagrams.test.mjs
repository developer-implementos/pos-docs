import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createDiagram } from './diagrams.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const text = (value, width = 180, height = 60) => ({
  type: 'text', text: value,
  position: { left: 80, top: 240, width, height },
  style: { typeface: 'Inter', fontSize: 20, color: '#123456', bold: false, verticalAlignment: 'top', autoFit: 'none', wrap: 'square', insets: 0 },
});
const slide = (...elements) => ({ id: 'slide-test', title: 'Árbol y acción', elements });
const create = (...elements) => createDiagram(slide(...elements), { root });

test('derives the padded region while excluding header and footer objects', () => {
  const header = text('Encabezado'); header.position.top = 105;
  const footer = text('Pie'); footer.position.top = 630;
  const result = create(header, text('Árbol & "acción"', 180, 60), footer);
  assert.deepEqual({ left: result.left, top: result.top, width: result.width, height: result.height }, { left: 72, top: 232, width: 196, height: 76 });
  assert.deepEqual(result.labels, ['Árbol & "acción"']);
  assert.match(result.svg, /viewBox="72 232 196 76"/u);
  assert.match(result.svg, /<rect x="72" y="232" width="196" height="76" fill="#FFFFFF"\/>/u, 'Standalone SVG retains the slide background in external viewers');
  assert.match(result.svg, /data-label="Árbol &amp; &quot;acción&quot;"/u);
  assert.match(result.svg, /role="img" aria-labelledby="slide-test-diagram-title slide-test-diagram-description"/u);
  assert.doesNotMatch(result.svg, /Encabezado|Pie|<text\b|<image\b|<foreignObject\b|<script\b|@font-face/iu);
  assert.match(result.svg, /<path d="[MLCQ]/u);
});

test('wraps words and preserves accents and explicit blank lines', () => {
  const wrapped = create(text('Árboles Bogotá', 100, 60));
  assert.equal((wrapped.svg.match(/<g>/gu) || []).length, 2, 'Two shaped lines fit in the original box');
  const explicit = create(text('Árbol\n\nBogotá', 100, 80));
  assert.equal((explicit.svg.match(/<g>/gu) || []).length, 3, 'Explicit blank lines retain their vertical space');
  assert.deepEqual(explicit.labels, ['Árbol\n\nBogotá']);
  assert.match(explicit.svg, /data-label="Árbol&#10;&#10;Bogotá"/u);
});

test('keeps shaping and font sizes without shrinking overflowing text', () => {
  assert.doesNotThrow(() => create(text('Árbol\nBogotá', 100, 42)));
  assert.throws(() => create(text('Árbol\nBogotá', 100, 40)), /text lines need/u);
  assert.throws(() => create(text('supercalifragilisticoespialidoso', 40, 100)), /exceeds its width/u);
  const regular = create(text('Oficina e integración'));
  const boldText = text('Oficina e integración'); boldText.style.bold = true;
  assert.notEqual(create(boldText).svg, regular.svg, 'Bold text uses the bold font outlines');
  assert.equal(create(text('Oficina e integración')).svg, regular.svg, 'The same source produces identical bytes');
});

test('retains rectangle strokes, drawing order and both connector arrow directions', () => {
  const shape = { type: 'shape', geometry: 'rect', position: { left: 64, top: 220, width: 260, height: 120 }, fill: '#FFFFFF', line: { fill: '#0545BA', width: 2 } };
  const arrow = { type: 'connector', geometry: 'connector', position: { left: 324, top: 280, width: 50, height: 0 }, line: { fill: '#00937F', width: 2 }, head: { type: 'triangle', width: 'sm', length: 'sm' }, tail: { type: 'triangle', width: 'sm', length: 'sm' } };
  const result = create(shape, text('Conexión'), arrow);
  assert.match(result.svg, /<rect x="64" y="220" width="260" height="120" fill="#FFFFFF" stroke="#0545BA" stroke-width="2"/u);
  assert.ok(result.svg.indexOf('<rect ') < result.svg.indexOf('<g data-label='));
  assert.ok(result.svg.indexOf('<g data-label=') < result.svg.indexOf('<line '));
  assert.match(result.svg, /x1="324" y1="280" x2="374" y2="280"/u);
  assert.match(result.svg, /marker-start="url\(#slide-test-diagram-arrow-2\)" marker-end="url\(#slide-test-diagram-arrow-2\)"/u);
  const second = createDiagram({ ...slide(shape, text('Conexión'), arrow), id: 'slide-other' }, { root });
  assert.doesNotMatch(second.svg, /id="slide-test-/u);
});

test('rejects unsupported elements and layouts instead of silently omitting them', () => {
  assert.throws(() => create(text('Caja'), { type: 'image', position: { left: 64, top: 230, width: 50, height: 50 }, src: 'remote.png' }), /unsupported diagram element/u);
  const unknown = text('Caja'); unknown.style.verticalAlignment = 'middle';
  assert.throws(() => create(unknown), /unsupported text layout/u);
  const injection = text('Caja'); injection.style.color = 'url(https://example.invalid/font)';
  assert.throws(() => create(injection), /unsupported color/u);
  assert.throws(() => create(text('\u{10ffff}')), /missing Inter glyph/u);
  assert.throws(() => createDiagram(slide(), { root }), /empty diagram region/u);
});

test('generates all six source diagrams deterministically with every label intact', () => {
  const deck = JSON.parse(fs.readFileSync(new URL('../architecture/deck.json', import.meta.url), 'utf8'));
  const selected = ['slide-3', 'slide-6', 'slide-7', 'slide-8', 'slide-9', 'slide-10'];
  for (const id of selected) {
    const source = deck.slides.find(item => item.id === id);
    const result = createDiagram(source, { root });
    const expected = source.elements.filter(item => item.type === 'text' && item.position.top >= 220 && item.position.top < 630).map(item => item.text);
    assert.deepEqual(result.labels, expected, `${id}: every diagram label is preserved in source order`);
    assert.equal(result.svg, createDiagram(source, { root }).svg, `${id}: reproducible output`);
    assert.doesNotMatch(result.svg, /NaN|Infinity|<text\b|<image\b|<foreignObject\b/iu);
    assert.ok(result.width > 0 && result.height > 0);
  }
});
