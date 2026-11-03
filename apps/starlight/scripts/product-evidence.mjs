import fs from 'node:fs';
import assert from 'node:assert/strict';
import { productEvidenceOrigins } from '../site-config.mjs';

const file = new URL('../src/data/product-evidence.json', import.meta.url);
export function validateProductEvidence(evidence) {
  assert.deepEqual(Object.keys(evidence).sort(), ['capturedAt', 'notice', 'productGuide', 'references', 'repository', 'revision', 'schemaVersion']);
  assert.equal(evidence.schemaVersion, 2, 'Capture product evidence with schema 2; capture is not editorial review');
  assert.ok(productEvidenceOrigins.includes(evidence.repository));
  assert.match(evidence.revision, /^[a-f0-9]{40}$/u);
  assert.match(evidence.capturedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
  assert.equal(new Date(evidence.capturedAt).toISOString(), evidence.capturedAt, 'Invalid capture timestamp');
  assert.equal(evidence.productGuide?.source, 'docs/product-repository.md');
  assert.match(evidence.productGuide?.upstreamSha256, /^[a-f0-9]{64}$/u);
  assert.ok(Array.isArray(evidence.references));
  const references = new Map();
  for (const entry of evidence.references) {
    if (!/^[\w.-]+(?:\/[\w. -]+)*$/.test(entry.path) || entry.path.split('/').some(part => part === '.' || part === '..') ||
        !['blob', 'tree'].includes(entry.kind) || references.has(entry.path)) {
      throw new Error('Invalid or duplicate product reference: ' + entry.path);
    }
    references.set(entry.path, entry.kind);
  }
  if (references.get('README.md') !== 'blob') throw new Error('Product evidence must identify its upstream README.');
  return evidence;
}
export const productEvidence = validateProductEvidence(JSON.parse(fs.readFileSync(file, 'utf8')));
export const productReferences = new Map(productEvidence.references.map(entry => [entry.path, entry.kind]));
