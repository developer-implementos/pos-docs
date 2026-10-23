import { generatedPages } from './content-map.mjs';

const profiles = {
  proposal: { label: 'Propuesta', weight: 2, titleWeight: 9 },
  design: { label: 'Propuesta', weight: 2, titleWeight: 9 },
  implementation: { label: 'Implementación', weight: 1, titleWeight: 7 },
  evidence: { label: 'Fuentes y legado', weight: 1, titleWeight: 6 },
  synthesis: { label: 'Fuentes y legado', weight: 1, titleWeight: 6 },
  research: { label: 'Evaluación', weight: 1, titleWeight: 6 },
  reference: { label: 'Referencia', weight: .5, titleWeight: 3 },
  historical: { label: 'Antecedentes', weight: .2, titleWeight: 1 },
};
const manual = { index: 'proposal', overview: 'proposal', diagrams: 'proposal', glossary: 'reference', contents: 'reference' };
export function searchProfile(id) {
  const route = id.replace(/\.(?:md|mdx)$/, '').replace(/^\/+|\/+$/g, '') || 'index';
  const kind = generatedPages.find(page => page.route === route)?.kind || manual[route] || (route.startsWith('api/') ? 'evidence' : 'reference');
  if (!profiles[kind]) throw new Error(`Search profile missing for document kind: ${kind}`);
  return { kind, ...profiles[kind] };
}
