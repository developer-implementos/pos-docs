import assert from 'node:assert/strict';
import test from 'node:test';
import {sourceDigest, validateEditorialReviews, editorialReviewStatus, renderEditorialReview} from './editorial-reviews.mjs';
import {productEvidence, validateProductEvidence} from './product-evidence.mjs';

const source = 'docs/product-repository.md';
const text = '# Implementación\nContenido contrastado con el código.\n';
const revision = 'a'.repeat(40);
const review = () => ({source, sourceSha256: sourceDigest(text), productRevision: revision, reviewedOn: '2026-11-03', reviewer: {kind: 'agent', name: 'Codex'}, scope: 'Contraste de aplicaciones y límites del incremento, sin homologación ni aceptación humana.', evidence: ['https://github.com/developer-implementos/pos-platform/issues/121']});
const ledger = () => ({schemaVersion: 1, reviews: [review()]});

test('capture and review have different schemas and capture rejects a global reviewedOn', () => {
  assert.equal(validateProductEvidence(structuredClone(productEvidence)).schemaVersion, 2);
  assert.throws(() => validateProductEvidence({...productEvidence, reviewedOn: '2026-11-03'}));
  assert.throws(() => validateProductEvidence({...productEvidence, capturedAt: '2026-02-30T00:00:00.000Z'}));
  assert.throws(() => validateProductEvidence({...productEvidence, repository: 'https://example.com/pos-platform'}));
});

test('capture alone never accredits editorial review', () => {
  const result = editorialReviewStatus({schemaVersion: 1, reviews: []}, source, text, revision);
  assert.equal(result.status, 'unrecorded');
  assert.match(renderEditorialReview(result), /sin registro/u);
});

test('record identifies an agent and the exact source/product combination', () => {
  const data = validateEditorialReviews(ledger(), new Set([source]));
  const result = editorialReviewStatus(data, source, text, revision);
  assert.equal(result.status, 'reviewed');
  assert.match(renderEditorialReview(result), /por agente Codex/u);
  assert.match(renderEditorialReview(result), /no acredita aceptación/u);
  assert.equal(editorialReviewStatus(data, source, text.replaceAll('\n', '\r\n'), revision).status, 'reviewed', 'Windows line endings preserve content identity');
});

test('changed source or product retain historical review without certifying the current combination', () => {
  const data = ledger();
  for (const result of [editorialReviewStatus(data, source, text + 'Cambio\n', revision), editorialReviewStatus(data, source, text, 'b'.repeat(40))]) {
    assert.equal(result.status, 'changed');
    assert.equal(result.review.productRevision, revision);
    assert.match(renderEditorialReview(result), /requiere un nuevo contraste/u);
  }
  assert.deepEqual(data, ledger(), 'Inspecting freshness must not mutate the record');
});

test('record rejects unknown sources, impossible dates, duplicate claims and missing evidence', () => {
  const invalid = [
    {...review(), source: '../private.md'},
    {...review(), reviewedOn: '2026-02-30'},
    {...review(), productRevision: 'main'},
    {...review(), evidence: []},
    {...review(), evidence: ['javascript:alert(1)']},
    {...review(), reviewer: {kind: 'approved', name: 'Codex'}},
  ];
  for (const record of invalid) assert.throws(() => validateEditorialReviews({schemaVersion: 1, reviews: [record]}, new Set([source])));
  assert.throws(() => validateEditorialReviews({schemaVersion: 1, reviews: [review(), review()]}, new Set([source])));
});

test('a prior exact review remains available when the product temporarily uses a different revision', () => {
  const data = ledger();
  data.reviews.push({...review(), productRevision: 'b'.repeat(40), reviewedOn: '2026-11-04'});
  assert.equal(editorialReviewStatus(data, source, text, revision).review.reviewedOn, '2026-11-03');
});

test('review output escapes editorial text', () => {
  const data = ledger();
  data.reviews[0].reviewer.name = '<img src=x onerror=alert(1)>';
  data.reviews[0].scope = '<script>alert(1)</script> is not executable editorial content';
  const html = renderEditorialReview(editorialReviewStatus(data, source, text, revision));
  assert.doesNotMatch(html, /<script|<img/u);
  assert.match(html, /&lt;script&gt;/u);
});
