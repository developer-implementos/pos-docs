import fs from 'node:fs';

const file = new URL('../src/data/product-evidence.json', import.meta.url);
export const productEvidence = JSON.parse(fs.readFileSync(file, 'utf8'));
if (productEvidence.schemaVersion !== 1 ||
    productEvidence.repository !== 'https://github.com/floxcristian/pos-platform' ||
    !/^[a-f0-9]{40}$/.test(productEvidence.revision) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(productEvidence.reviewedOn) ||
    productEvidence.productGuide?.source !== 'docs/product-repository.md' ||
    !/^[a-f0-9]{64}$/.test(productEvidence.productGuide?.upstreamSha256) ||
    !Array.isArray(productEvidence.references)) {
  throw new Error('Invalid product evidence. Capture a clean product revision before publishing.');
}

export const productReferences = new Map();
for (const entry of productEvidence.references) {
  if (!/^[\w.-]+(?:\/[\w. -]+)*$/.test(entry.path) || entry.path.split('/').some(part => part === '.' || part === '..') ||
      !['blob', 'tree'].includes(entry.kind) || productReferences.has(entry.path)) {
    throw new Error('Invalid or duplicate product reference: ' + entry.path);
  }
  productReferences.set(entry.path, entry.kind);
}
if (productReferences.get('README.md') !== 'blob') throw new Error('Product evidence must identify its upstream README.');
