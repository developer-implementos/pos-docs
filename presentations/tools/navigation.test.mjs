import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildNavigation } from './navigation.mjs';

const fixture = () => ({
  slides: [1, 2, 3].map(number => ({ id: `slide-${number}`, title: `Lámina ${number}` })),
  chapters: [
    { id: 'proposal', title: 'Propuesta', slides: ['slide-1', 'slide-2'] },
    { id: 'delivery', title: 'Entrega', slides: ['slide-3'] },
  ],
});

test('keeps permanent leaf IDs and canonical order while assigning native chapter coordinates', () => {
  const input = fixture();
  const before = structuredClone(input);
  const navigation = buildNavigation(input);
  assert.deepEqual(navigation.slides.map(({ id, index, h, v }) => ({ id, index, h, v })), [
    { id: 'slide-1', index: 0, h: 0, v: 0 },
    { id: 'slide-2', index: 1, h: 0, v: 1 },
    { id: 'slide-3', index: 2, h: 1, v: 0 },
  ]);
  assert.equal(navigation.chapters.length, 2);
  assert.equal(navigation.chapters[1].slides.length, 1, 'Single-slide chapters remain representable');
  assert.strictEqual(navigation.byId.get('slide-2'), navigation.slides[1]);
  assert.deepEqual(input, before, 'Navigation derivation does not rewrite slide content or source order');
});

test('the published deck contains five coherent chapters and the same sixteen permanent IDs', () => {
  const deck = JSON.parse(fs.readFileSync(new URL('../architecture/deck.json', import.meta.url), 'utf8'));
  const navigation = buildNavigation(deck);
  assert.deepEqual(navigation.chapters.map(chapter => [chapter.id, chapter.slides.map(slide => slide.id)]), [
    ['proposal', ['slide-1', 'slide-2', 'slide-3']],
    ['structure', ['slide-4', 'slide-5']],
    ['deployment', ['slide-6', 'slide-7']],
    ['erp-integration', ['slide-8', 'slide-9', 'slide-10']],
    ['delivery-roadmap', ['slide-11', 'slide-12', 'slide-13', 'slide-14', 'slide-15', 'slide-16']],
  ]);
  assert.deepEqual(navigation.slides.map(slide => slide.id), Array.from({ length: 16 }, (_, index) => `slide-${index + 1}`));
});

for (const [label, mutate] of [
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
  ['a control character in a title', deck => { deck.slides[0].title = 'Lámina\nuno'; }],
  ['unexpected chapter metadata', deck => { deck.chapters[0].children = []; }],
]) {
  test(`rejects ${label} before changing public navigation`, () => {
    const deck = fixture();
    mutate(deck);
    assert.throws(() => buildNavigation(deck));
  });
}
