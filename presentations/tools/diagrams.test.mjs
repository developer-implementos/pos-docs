import { prepareDeck, containerOverview } from './architecture.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createDiagram } from './diagrams.mjs';
import { presentationColor, presentationPalette, renderPaletteCss } from './palette.mjs';
import { diagramTextStyle, diagramTypography } from './typography.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const text = (value, width = 180, height = 60) => ({
  type: 'text', text: value,
  position: { left: 80, top: 240, width, height },
  style: { typeface: 'Inter', typographyRole: 'body', color: '#123456', verticalAlignment: 'top', autoFit: 'none', wrap: 'square', insets: 0 },
});
const slide = (...elements) => ({ id: 'slide-test', title: 'Árbol y acción', elements });
const create = (...elements) => createDiagram(slide(...elements), { root });

test('publishes the requested primary color and readable foreground/background pairs', () => {
  const luminance = hex => hex.slice(1).match(/../gu)
    .map(channel => Number.parseInt(channel, 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const contrast = (a, b) => {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  const palette = presentationPalette;
  assert.equal(palette.primary, '#0545BA');
  for (const background of ['surface', 'primarySoft', 'accentSoft', 'page']) {
    for (const foreground of ['primary', 'primaryHover', 'accent', 'text', 'muted']) {
      assert.ok(contrast(palette[foreground], palette[background]) >= 4.5,
        `${foreground} on ${background}: ordinary text must retain WCAG AA contrast`);
    }
  }
  for (const background of ['primary', 'primaryHover', 'accent']) {
    assert.ok(contrast(palette.surface, palette[background]) >= 4.5, `White text on ${background}`);
  }
  assert.match(renderPaletteCss(), /--primary: #0545BA;/u);
  assert.match(renderPaletteCss(), /--blue: var\(--primary\);/u);
  assert.match(renderPaletteCss(), /--green: var\(--accent\);/u);
});

test('maps only known source colors without replacing unrelated semantic colors', () => {
  assert.equal(presentationColor('#006db6'), '#0545BA');
  for (const value of ['none', '#FFFFFF', '#fff', '#123456', '#C93232', '#006DB680', '#0545BA']) {
    assert.equal(presentationColor(value), value);
  }
  for (const value of ['#006DB6', '#EDF4F8', '#00937F', '#34383E', '#636569']) {
    assert.equal(presentationColor(presentationColor(value)), presentationColor(value), 'The presentation palette is idempotent');
  }
});

test('applies the web palette to SVG backgrounds, shapes, text, strokes and arrowheads without mutating the source', () => {
  const shape = { type: 'shape', geometry: 'rect', position: { left: 64, top: 220, width: 260, height: 120 }, fill: '#EDF4F8', line: { fill: '#006DB6', width: 2 } };
  const label = text('Arquitectura'); label.style.color = '#006DB6';
  const arrow = { type: 'connector', geometry: 'connector', position: { left: 324, top: 280, width: 50, height: 0 }, line: { fill: '#00937F', width: 2 }, tail: { type: 'triangle', width: 'sm', length: 'sm' } };
  const source = { ...slide(shape, label, arrow), background: '#EDF4F8' };
  const original = structuredClone(source);
  const result = createDiagram(source, { root });
  assert.deepEqual(source, original, 'Original colors, geometry and content remain traceable to the source');
  assert.match(result.svg, /<rect[^>]+fill="#EFF4FF"\/>/u);
  assert.match(result.svg, /<rect[^>]+fill="#EFF4FF" stroke="#0545BA"/u);
  assert.match(result.svg, /<g data-label="Arquitectura" fill="#0545BA"/u);
  assert.match(result.svg, /<marker[^>]+><path[^>]+fill="#007B6D"/u);
  assert.match(result.svg, /<line[^>]+stroke="#007B6D"/u);
  assert.doesNotMatch(result.svg, /#(?:006DB6|EDF4F8|00937F)/iu);
});

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
  const boldText = text('Oficina e integración'); boldText.style.typographyRole = 'title';
  assert.notEqual(create(boldText).svg, regular.svg, 'Bold text uses the bold font outlines');
  assert.equal(create(text('Oficina e integración')).svg, regular.svg, 'The same source produces identical bytes');
});

test('requires semantic typography and rejects per-node size or weight overrides', () => {
  assert.throws(() => diagramTextStyle({ typographyRole: 'custom' }, 'Custom'), /unknown diagram typography role/u);
  for (const override of [{ fontSize: 19 }, { bold: true }]) {
    assert.throws(() => diagramTextStyle({ typographyRole: 'body', ...override }, 'Body'), /per-element overrides/u);
  }
  const deck=prepareDeck(JSON.parse(fs.readFileSync(new URL('../architecture/deck.json', import.meta.url), 'utf8')));
  for (const source of deck.slides.filter(item => item.diagram)) {
    const elements = source.elements.filter(item => item.type === 'text' && item.position.top >= 220 && item.position.top < 630);
    for (const element of elements) {
      const style = diagramTextStyle(element.style, `${source.id}: ${element.text}`);
      assert.equal(style.fontSize, diagramTypography[style.typographyRole].fontSize);
    }
    const { svg } = createDiagram(source, { root });
    const rendered = [...svg.matchAll(/data-typography-role="(\w+)" data-font-size="(\d+)"/gu)];
    assert.equal(rendered.length, elements.length, `${source.id}: every exported label uses the same role-based scale`);
    for (const [, role, size] of rendered) assert.equal(Number(size), diagramTypography[role].fontSize);
  }
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

test('generates all source diagrams deterministically with every label intact', () => {
  const deck=prepareDeck(JSON.parse(fs.readFileSync(new URL('../architecture/deck.json', import.meta.url), 'utf8')));
  const selected = deck.slides.filter(slide => slide.diagram).map(slide => slide.id);
  for (const id of selected) {
    const source = deck.slides.find(item => item.id === id);
    const original = structuredClone(source);
    const result = createDiagram(source, { root });
    const expected = source.elements.filter(item => item.type === 'text' && item.position.top >= 220 && item.position.top < 630).map(item => item.text);
    assert.deepEqual(result.labels, expected, `${id}: every diagram label is preserved in source order`);
    assert.equal(result.svg, createDiagram(source, { root }).svg, `${id}: reproducible output`);
    assert.deepEqual(source, original, `${id}: source colors, text and positions remain unchanged`);
    assert.doesNotMatch(result.svg, /#(?:006DB6|EDF4F8|00937F|34383E|636569)/iu, `${id}: standalone downloads retain the web palette`);
    assert.doesNotMatch(result.svg, /NaN|Infinity|<text\b|<image\b|<foreignObject\b/iu);
    assert.ok(result.width > 0 && result.height > 0);
  }
});

test('the overview reuses six application identities and projects the transaction to its owner', () => {
  assert.deepEqual(containerOverview.nodes.filter(node => node.kind === 'app').map(node => node.title).sort(),
    ['branch-api', 'branch-sync-worker', 'country-api', 'erp-worker', 'pos-desktop', 'pos-mobile']);
  assert.deepEqual(containerOverview.nodes.filter(node => node.kind === 'data').map(node => node.id).sort(), ['branch-db', 'country-db']);
  const commit = containerOverview.edges.find(edge => edge.id === 'commit-local');
  assert.equal(commit.from, 'branch-api'); assert.equal(commit.sourceFrom, 'transaction'); assert.equal(commit.to, 'branch-db');
  const erp = containerOverview.edges.find(edge => edge.id === 'claim-report');
  assert.equal(erp.from, 'erp-worker'); assert.equal(erp.to, 'country-api');
  assert.ok(containerOverview.edges.every(edge => !(['desktop', 'mobile', 'erp-worker'].includes(edge.from) && edge.to.endsWith('-db'))), 'The summary must not invent client or WAN SQL access');
});
