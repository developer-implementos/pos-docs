import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const sourceDigest = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');

export function validateEditorialReviews(ledger, sources) {
  assert.equal(ledger.schemaVersion, 1, 'Unsupported editorial review ledger');
  assert.deepEqual(Object.keys(ledger).sort(), ['reviews', 'schemaVersion']);
  assert.ok(Array.isArray(ledger.reviews), 'Editorial reviews must be an array');
  const identities = new Set();
  for (const review of ledger.reviews) {
    assert.deepEqual(Object.keys(review).sort(), ['evidence', 'productRevision', 'reviewedOn', 'reviewer', 'scope', 'source', 'sourceSha256']);
    assert.ok(sources.has(review.source), `Review has no canonical editorial source: ${review.source}`);
    assert.match(review.sourceSha256, /^[a-f0-9]{64}$/u);
    assert.match(review.productRevision, /^[a-f0-9]{40}$/u);
    assert.match(review.reviewedOn, /^\d{4}-\d{2}-\d{2}$/u);
    assert.equal(new Date(`${review.reviewedOn}T00:00:00Z`).toISOString().slice(0, 10), review.reviewedOn, 'Invalid editorial review date');
    assert.deepEqual(Object.keys(review.reviewer).sort(), ['kind', 'name']);
    assert.ok(['agent', 'human'].includes(review.reviewer.kind), 'Identify the actual reviewer kind');
    assert.ok(typeof review.reviewer.name === 'string' && review.reviewer.name.trim().length >= 3);
    assert.ok(typeof review.scope === 'string' && review.scope.trim().length >= 30, 'Describe what was actually reviewed');
    assert.ok(Array.isArray(review.evidence) && review.evidence.length > 0, 'Review requires traceable evidence');
    for (const link of review.evidence) assert.match(link, /^https:\/\/github\.com\/developer-implementos\/pos-(?:platform|docs)\/(?:issues|pull)\/[1-9]\d*(?:#(?:issuecomment|discussion_r)-\d+)?$/u);
    const identity = `${review.source}:${review.sourceSha256}:${review.productRevision}`;
    assert.ok(!identities.has(identity), `Duplicate review scope: ${review.source}`);
    identities.add(identity);
  }
  return ledger;
}

export function loadEditorialReviews(root, sources) {
  return validateEditorialReviews(JSON.parse(fs.readFileSync(path.join(root, 'docs/editorial/reviews.json'), 'utf8')), sources);
}

// Capture never changes this record. An earlier review remains valid for its
// own source and product revision, but does not certify a newer combination.
export function editorialReviewStatus(ledger, source, text, productRevision) {
  const matches = ledger.reviews.filter(review => review.source === source);
  const current = matches.find(review => review.sourceSha256 === sourceDigest(text) && review.productRevision === productRevision);
  if (current) return {status: 'reviewed', review: current};
  const previous = matches.sort((left, right) => right.reviewedOn.localeCompare(left.reviewedOn))[0];
  return previous ? {status: 'changed', review: previous} : {status: 'unrecorded', review: null};
}

const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function renderEditorialReview(result) {
  if (result.status === 'unrecorded') return '<p data-editorial-review="unrecorded">Revisión editorial específica: sin registro para esta página. La captura del código no acredita su revisión.</p>';
  const {review} = result;
  const actor = review.reviewer.kind === 'agent' ? 'agente' : 'persona';
  const links = review.evidence.map((link, index) => `<a href="${escapeHtml(link)}">Evidencia ${index + 1}</a>`).join(' · ');
  const scope = `<span>${escapeHtml(review.scope)}</span>`;
  if (result.status === 'changed') return `<p data-editorial-review="changed">Revisión anterior por ${actor} ${escapeHtml(review.reviewer.name)}, ${review.reviewedOn}, para código ${review.productRevision.slice(0, 12)} y contenido ${review.sourceSha256.slice(0, 12)}. Esta combinación de contenido y código requiere un nuevo contraste. ${scope} ${links}</p>`;
  return `<p data-editorial-review="reviewed">Revisión editorial por ${actor} ${escapeHtml(review.reviewer.name)}, ${review.reviewedOn}. ${scope} ${links}. La revisión editorial no acredita aceptación de producto ni comprensión del equipo.</p>`;
}
