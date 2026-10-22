import assert from 'node:assert/strict';

const chapterId = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const leafId = /^slide-[1-9]\d*$/;

function title(value, label) {
  assert.ok(typeof value === 'string' && value.trim() === value && value.length > 0 && !/[\u0000-\u001f\u007f]/u.test(value), `${label} must be nonempty plain text`);
}

/** Map the canonical leaf order onto Reveal's horizontal chapters and vertical slides. */
export function buildNavigation(deck) {
  assert.ok(Array.isArray(deck.slides) && deck.slides.length > 0, 'Navigation requires slides');
  assert.ok(Array.isArray(deck.chapters) && deck.chapters.length > 0, 'Navigation requires chapters');
  const leafById = new Map();
  for (const [index, slide] of deck.slides.entries()) {
    assert.ok(slide && typeof slide === 'object', 'Invalid slide metadata');
    assert.match(slide.id || '', leafId, 'Invalid slide id');
    assert.ok(!leafById.has(slide.id), `Duplicate slide id: ${slide.id}`);
    title(slide.title, `Title of ${slide.id}`);
    leafById.set(slide.id, { id: slide.id, title: slide.title, index });
  }

  const chapterIds = new Set();
  const covered = new Set();
  const chapters = deck.chapters.map((chapter, h) => {
    assert.ok(chapter && typeof chapter === 'object' && !Array.isArray(chapter), 'Invalid chapter metadata');
    assert.deepEqual(Object.keys(chapter).sort(), ['id', 'slides', 'title'], 'A chapter must declare id, title and slides');
    assert.match(chapter.id || '', chapterId, 'Invalid chapter id');
    assert.ok(!chapterIds.has(chapter.id), `Duplicate chapter id: ${chapter.id}`);
    chapterIds.add(chapter.id);
    title(chapter.title, `Title of chapter ${chapter.id}`);
    assert.ok(Array.isArray(chapter.slides) && chapter.slides.length > 0, `Chapter ${chapter.id} must contain slides`);
    const slides = chapter.slides.map((id, v) => {
      assert.ok(leafById.has(id), `Unknown slide in chapter ${chapter.id}: ${id}`);
      assert.ok(!covered.has(id), `Slide belongs to more than one chapter: ${id}`);
      covered.add(id);
      return { ...leafById.get(id), h, v };
    });
    return { id: chapter.id, title: chapter.title, h, slides };
  });
  const slides = chapters.flatMap(chapter => chapter.slides);
  assert.deepEqual(slides.map(slide => slide.id), [...leafById.keys()], 'Chapters must cover every slide exactly once in its canonical order');
  return { chapters, slides, byId: new Map(slides.map(slide => [slide.id, slide])) };
}
