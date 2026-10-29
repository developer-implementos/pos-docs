import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildNavigation } from './navigation.mjs';

const fixture = () => ({
  cover: 'slide-1',
  slides: [1, 2, 3, 4].map(number => ({ id: `slide-${number}`, title: `Lámina ${number}` })),
  chapters: [
    { id: 'proposal', title: 'Propuesta', summary: 'Un producto común para varios países.', slides: ['slide-2', 'slide-3'] },
    { id: 'delivery', title: 'Entrega', summary: 'Entregas y criterios de aceptación.', slides: ['slide-4'] },
  ],
});

test('keeps permanent leaf IDs and canonical order while assigning native chapter coordinates', () => {
  const input = fixture();
  const before = structuredClone(input);
  const navigation = buildNavigation(input);
  assert.deepEqual(navigation.slides.map(({ id, index, h, v }) => ({ id, index, h, v })), [
    { id: 'slide-1', index: 0, h: 0, v: 0 },
    { id: 'slide-2', index: 1, h: 1, v: 1 },
    { id: 'slide-3', index: 2, h: 1, v: 2 },
    { id: 'slide-4', index: 3, h: 2, v: 1 },
  ]);
  assert.strictEqual(navigation.opening, navigation.slides[0], 'The opening has one canonical navigation record');
  assert.strictEqual(navigation.byId.get(input.cover), navigation.opening);
  assert.deepEqual(navigation.chapters.map(({ number, h }) => ({ number, h })), [{ number: 1, h: 1 }, { number: 2, h: 2 }]);
  assert.equal(navigation.chapters.length, 2);
  assert.equal(navigation.chapters[1].slides.length, 1, 'Single-slide chapters remain representable');
  assert.deepEqual(navigation.chapters.map(chapter => chapter.cover), [
    { id: 'chapter-proposal', title: 'Propuesta', h: 1, v: 0 },
    { id: 'chapter-delivery', title: 'Entrega', h: 2, v: 0 },
  ]);
  assert.deepEqual(navigation.chapters.map(chapter => chapter.summary), input.chapters.map(chapter => chapter.summary));
  assert.equal(navigation.byId.size, 4, 'Permanent content links include the opening and remain independent of chapter covers');
  assert.equal(navigation.byId.has('chapter-proposal'), false);
  assert.strictEqual(navigation.byId.get('slide-2'), navigation.slides[1]);
  assert.deepEqual(input, before, 'Navigation derivation does not rewrite slide content or source order');
});

test('the published deck preserves every permanent ID and includes the device-agent deployment detail', () => {
  const deck = JSON.parse(fs.readFileSync(new URL('../architecture/deck.json', import.meta.url), 'utf8'));
  const navigation = buildNavigation(deck);
  assert.deepEqual(navigation.chapters.map(chapter => [chapter.id, chapter.slides.map(slide => slide.id)]), [
    ['proposal', ['slide-2', 'slide-3', 'slide-17']],
    ['structure', ['slide-4', 'slide-5']],
    ['deployment', ['slide-6', 'slide-7', 'slide-18']],
    ['erp-integration', ['slide-8', 'slide-9', 'slide-10']],
    ['delivery-roadmap', ['slide-11', 'slide-12', 'slide-13', 'slide-14', 'slide-15', 'slide-16']],
  ]);
  assert.equal(deck.cover, 'slide-1');
  assert.equal(navigation.opening.id, deck.cover);
  assert.equal(navigation.opening.h, 0);
  assert.equal(navigation.opening.v, 0);
  assert.equal(navigation.chapters.flatMap(chapter => chapter.slides).length, 17, 'The opening has no vertical children');
  assert.deepEqual(navigation.slides.map(slide => slide.id), ['slide-1', 'slide-2', 'slide-3', 'slide-17', 'slide-4', 'slide-5', 'slide-6', 'slide-7', 'slide-18', ...Array.from({ length: 9 }, (_, index) => `slide-${index + 8}`)]);
  assert.equal(new Set(navigation.chapters.map(chapter => chapter.cover.id)).size, 5);
  for (const [index, chapter] of navigation.chapters.entries()) {
    assert.equal(chapter.number, index + 1, 'Editorial chapter numbering excludes the opening');
    assert.equal(chapter.h, index + 1, 'Each chapter occupies its own horizontal position after the opening');
    assert.equal(chapter.cover.id, `chapter-${chapter.id}`);
    assert.equal(chapter.cover.v, 0);
    assert.equal(chapter.slides[0].v, 1);
    assert.ok(chapter.summary.trim(), 'Every chapter explains its scope before the details');
  }
});

for (const [label, mutate] of [
  ['a missing opening ID', deck => { delete deck.cover; }],
  ['an unknown opening ID', deck => { deck.cover = 'slide-99'; }],
  ['an opening outside canonical first position', deck => { deck.cover = 'slide-2'; deck.chapters[0].slides[0] = 'slide-1'; }],
  ['an opening assigned to a vertical chapter', deck => deck.chapters[0].slides.unshift('slide-1')],
  ['a non-string opening ID', deck => { deck.cover = ['slide-1']; }],
  ['a missing leaf', deck => deck.chapters[0].slides.pop()],
  ['a duplicate assignment', deck => deck.chapters[1].slides.unshift('slide-2')],
  ['an unknown leaf', deck => { deck.chapters[1].slides[0] = 'slide-99'; }],
  ['reordered leaves', deck => deck.chapters[0].slides.reverse()],
  ['reordered chapters', deck => deck.chapters.reverse()],
  ['duplicate chapter IDs', deck => { deck.chapters[1].id = deck.chapters[0].id; }],
  ['duplicate leaf IDs', deck => { deck.slides[1].id = deck.slides[0].id; }],
  ['an invalid chapter ID', deck => { deck.chapters[0].id = '../proposal'; }],
  ['an invalid leaf ID', deck => { deck.slides[0].id = '<slide-1>'; }],
  ['an empty chapter', deck => { deck.chapters[0].slides = []; }],
  ['an empty title', deck => { deck.chapters[0].title = ''; }],
  ['a missing chapter summary', deck => { delete deck.chapters[0].summary; }],
  ['an empty chapter summary', deck => { deck.chapters[0].summary = ''; }],
  ['a control character in a chapter summary', deck => { deck.chapters[0].summary = 'Propuesta\nnueva'; }],
  ['a control character in a title', deck => { deck.slides[0].title = 'Lámina\nuno'; }],
  ['unexpected chapter metadata', deck => { deck.chapters[0].children = []; }],
]) {
  test(`rejects ${label} before changing public navigation`, () => {
    const deck = fixture();
    mutate(deck);
    assert.throws(() => buildNavigation(deck));
  });
}
