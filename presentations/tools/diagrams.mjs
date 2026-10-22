import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { presentationColor } from './palette.mjs';

const fontCache = new Map();
const lineHeight = 1.13;
const padding = 8;
const tolerance = 4;
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const attribute = value => escape(value).replaceAll('\n', '&#10;');
const number = value => String(Number(value.toFixed(8)));

function fonts(root) {
  const location = path.resolve(root);
  if (!fontCache.has(location)) {
    const require = createRequire(path.join(location, 'apps/starlight/package.json'));
    const fontkit = require('fontkit');
    const load = weight => fontkit.openSync(path.join(location, `presentations/architecture/assets/Inter-${weight}.ttf`));
    fontCache.set(location, { regular: load('Regular'), bold: load('Bold') });
  }
  return fontCache.get(location);
}

function keys(object, allowed, label) {
  assert.ok(object && typeof object === 'object' && !Array.isArray(object), `${label}: expected an object`);
  for (const key of Object.keys(object)) assert.ok(allowed.includes(key), `${label}: unsupported property ${key}`);
}

function color(value, label) {
  assert.ok(typeof value === 'string' && /^(?:none|#[\da-f]{3}|#[\da-f]{6}|#[\da-f]{8})$/iu.test(value), `${label}: unsupported color`);
  return presentationColor(value);
}

function position(element, label) {
  keys(element.position, ['left', 'top', 'width', 'height'], label);
  for (const value of Object.values(element.position)) assert.ok(Number.isFinite(value), `${label}: invalid position`);
  const { left, top, width, height } = element.position;
  assert.ok([left, top, width, height].every(Number.isFinite), `${label}: incomplete position`);
  assert.ok(width >= 0 && height >= 0, `${label}: negative dimensions are unsupported`);
  return element.position;
}

function stroke(line, label) {
  keys(line, ['fill', 'width'], label);
  const fill = color(line.fill, label);
  assert.ok(Number.isFinite(line.width) && line.width >= 0, `${label}: invalid stroke width`);
  return `stroke="${fill}" stroke-width="${number(line.width)}"`;
}

function wrap(text, font, size, width, label) {
  const measure = value => font.layout(value).positions.reduce((total, glyph) => total + glyph.xAdvance, 0) * size / font.unitsPerEm;
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let current = '';
    let spaces = '';
    for (const token of paragraph.match(/ +|[^ ]+/gu) || []) {
      if (/^ +$/u.test(token)) { spaces += token; continue; }
      const candidate = current + spaces + token;
      if (current && measure(candidate) > width) {
        lines.push(current);
        current = token;
      } else {
        current = candidate;
      }
      spaces = '';
    }
    lines.push(current + spaces);
  }
  for (const line of lines) {
    assert.ok(measure(line.trimEnd()) <= width + tolerance, `${label}: text exceeds its width (${JSON.stringify(line)})`);
  }
  return lines;
}

function textElement(element, fontSet, label) {
  keys(element, ['type', 'text', 'position', 'style'], label);
  const { text, style, position: box } = element;
  assert.equal(typeof text, 'string', `${label}: missing text`);
  keys(style, ['typeface', 'fontSize', 'color', 'bold', 'verticalAlignment', 'autoFit', 'wrap', 'insets'], label);
  assert.ok(style.typeface === 'Inter' && style.verticalAlignment === 'top' && style.autoFit === 'none' && style.wrap === 'square' && style.insets === 0, `${label}: unsupported text layout`);
  assert.equal(typeof style.bold, 'boolean', `${label}: unsupported font weight`);
  assert.ok(Number.isFinite(style.fontSize) && style.fontSize > 0, `${label}: invalid font size`);
  const fill = color(style.color, label);
  const font = style.bold ? fontSet.bold : fontSet.regular;
  for (const character of text) {
    assert.ok(character === '\n' || font.hasGlyphForCodePoint(character.codePointAt(0)), `${label}: missing Inter glyph ${JSON.stringify(character)}`);
  }
  const lines = wrap(text, font, style.fontSize, box.width, label);
  const step = style.fontSize * lineHeight;
  assert.ok(lines.length * step <= box.height + tolerance, `${label}: ${lines.length} text lines need ${number(lines.length * step)}px, available ${box.height}px (+${tolerance}px tolerance)`);
  // CSS puts half the leading above the font's ascender and half below its descender.
  const scale = style.fontSize / font.unitsPerEm;
  const leading = step - (font.ascent - font.descent) * scale;
  const baseline = box.top + leading / 2 + font.ascent * scale;
  const paths = lines.map((line, index) => {
    const run = font.layout(line);
    let x = box.left;
    let y = baseline + index * step;
    return `<g>${run.glyphs.map((glyph, glyphIndex) => {
      assert.ok(glyph.id !== 0, `${label}: font shaping produced a missing glyph`);
      const offset = run.positions[glyphIndex];
      const transform = `matrix(${number(scale)} 0 0 ${number(-scale)} ${number(x + offset.xOffset * scale)} ${number(y - offset.yOffset * scale)})`;
      x += offset.xAdvance * scale;
      y -= offset.yAdvance * scale;
      const outline = glyph.path.toSVG();
      return outline ? `<path d="${outline}" transform="${transform}"/>` : '';
    }).join('')}</g>`;
  }).join('');
  return `<g data-label="${attribute(text)}" fill="${fill}"><title>${escape(text)}</title>${paths}</g>`;
}

/** Derive a standalone, font-independent SVG from the deck's existing diagram region. */
export function createDiagram(slide, { root }) {
  assert.ok(slide && /^[a-z][a-z\d-]*$/iu.test(slide.id), 'Diagram requires a safe slide ID');
  assert.ok(typeof slide.title === 'string' && slide.title.trim(), `${slide.id}: missing diagram title`);
  assert.ok(Array.isArray(slide.elements), `${slide.id}: missing elements`);
  const selected = slide.elements.map((element, index) => {
    const box = position(element, `${slide.id} element ${index}`);
    return { element, index, box };
  }).filter(({ box }) => box.top >= 220 && box.top < 630);
  assert.ok(selected.length, `${slide.id}: empty diagram region`);
  const labels = selected.filter(({ element }) => element.type === 'text').map(({ element }) => element.text);
  assert.ok(labels.length, `${slide.id}: diagram has no text labels`);
  const fontSet = fonts(root);
  const left = Math.min(...selected.map(({ box }) => box.left)) - padding;
  const top = Math.min(...selected.map(({ box }) => box.top)) - padding;
  const width = Math.max(...selected.map(({ box }) => box.left + box.width)) - left + padding;
  const height = Math.max(...selected.map(({ box }) => box.top + box.height)) - top + padding;
  const prefix = `${slide.id}-diagram`;
  const definitions = [];
  const markup = selected.map(({ element, index, box }) => {
    const label = `${slide.id} element ${index}`;
    if (element.type === 'text') return textElement(element, fontSet, label);
    if (element.type === 'shape') {
      keys(element, ['type', 'geometry', 'position', 'fill', 'line'], label);
      assert.equal(element.geometry, 'rect', `${label}: unsupported shape geometry`);
      return `<rect x="${number(box.left)}" y="${number(box.top)}" width="${number(box.width)}" height="${number(box.height)}" fill="${color(element.fill, label)}" ${stroke(element.line, label)}/>`;
    }
    assert.equal(element.type, 'connector', `${label}: unsupported diagram element ${element.type}`);
    keys(element, ['type', 'geometry', 'position', 'line', 'head', 'tail'], label);
    assert.equal(element.geometry, 'connector', `${label}: unsupported connector geometry`);
    const line = stroke(element.line, label);
    for (const marker of [element.head, element.tail].filter(Boolean)) {
      keys(marker, ['type', 'width', 'length'], label);
      assert.ok(marker.type === 'triangle' && marker.width === 'sm' && marker.length === 'sm', `${label}: unsupported arrow marker`);
    }
    const markerId = `${prefix}-arrow-${index}`;
    if (element.head || element.tail) definitions.push(`<marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color(element.line.fill, label)}"/></marker>`);
    return `<line x1="${number(box.left)}" y1="${number(box.top)}" x2="${number(box.left + box.width)}" y2="${number(box.top + box.height)}" ${line}${element.head ? ` marker-start="url(#${markerId})"` : ''}${element.tail ? ` marker-end="url(#${markerId})"` : ''}/>`;
  }).join('\n');
  const backdrop = `<rect x="${number(left)}" y="${number(top)}" width="${number(width)}" height="${number(height)}" fill="${color(slide.background ?? '#FFFFFF', `${slide.id} background`)}"/>`;
  const description = `Elementos del diagrama, en el orden de la fuente: ${labels.join('; ')}.`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${prefix}-title ${prefix}-description" width="${number(width)}" height="${number(height)}" viewBox="${number(left)} ${number(top)} ${number(width)} ${number(height)}" preserveAspectRatio="xMidYMid meet"><title id="${prefix}-title">${escape(slide.title)}</title><desc id="${prefix}-description">${escape(description)}</desc><defs>${definitions.join('')}</defs>\n${backdrop}\n${markup}\n</svg>\n`;
  return { svg, left, top, width, height, labels };
}
