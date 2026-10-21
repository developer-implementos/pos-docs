import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generatedPages, sourceRouteAliases } from '../apps/starlight/content-map.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--workspace') {
  throw new Error('Usage: node tools/capture-product-evidence.mjs --workspace <clean-pos-platform-checkout>');
}
const workspace = fs.realpathSync(path.resolve(args[1]));
const git = (...command) => execFileSync('git', command, { cwd: workspace, encoding: 'utf8' }).trim();
const repository = 'https://github.com/floxcristian/pos-platform';
if (!['https://github.com/floxcristian/pos-platform.git', repository, 'git@github.com:floxcristian/pos-platform.git'].includes(git('remote', 'get-url', 'origin'))) {
  throw new Error('The evidence workspace must be the POS Platform product repository.');
}
if (git('status', '--porcelain')) throw new Error('Commit or resolve product changes before capturing evidence; a dirty checkout is not a revision.');
const revision = git('rev-parse', 'HEAD');
const productFiles = new Set(git('-c', 'core.quotepath=false', 'ls-tree', '-r', '--name-only', revision).split('\n'));
const candidates = new Set(['README.md']);

// Only retain paths actually referenced by editorial sources, never a copy of product code or configuration.
for (const page of generatedPages) {
  const source = fs.readFileSync(path.join(root, page.source), 'utf8');
  const linkSource = page.linkSource || page.source;
  let fence = null;
  for (const line of source.split(/\r?\n/)) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) { fence = fence === marker[1][0] ? null : fence || marker[1][0]; continue; }
    if (fence) continue;
    for (const match of line.matchAll(/(?:!?\[[^\]]*\]\()(<[^>]+>|[^)\s]+)(?:[^)]*\))/g)) {
      const target = match[1].replace(/^<|>$/g, '');
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) continue;
      const pathname = decodeURIComponent(target.split(/[?#]/, 1)[0]);
      const relative = path.posix.normalize(pathname.startsWith('/') ? pathname.slice(1) : path.posix.join(path.posix.dirname(linkSource), pathname));
      if (relative.startsWith('../')) throw new Error('Editorial link escapes its repository: ' + target);
      if (sourceRouteAliases[relative] || relative.startsWith('guide/') || relative.startsWith('docs/') ||
          relative.startsWith('apps/starlight/') || relative.startsWith('tools/diagrams/') ||
          relative.startsWith('presentation/') || relative.startsWith('video/')) continue;
      if (productFiles.has(relative) || [...productFiles].some(file => file.startsWith(relative + '/'))) candidates.add(relative);
    }
  }
}
const references = [...candidates].sort().map(relative => ({
  path: relative,
  kind: productFiles.has(relative) ? 'blob' : 'tree',
}));
const upstreamReadme = execFileSync('git', ['show', `${revision}:README.md`], { cwd: workspace, encoding: 'utf8' }).replaceAll('\r\n', '\n');
const evidence = {
  schemaVersion: 1,
  repository,
  revision,
  reviewedOn: new Date().toISOString().slice(0, 10),
  notice: 'Reviewed clean product revision. The documentation repository builds from this metadata without accessing the product checkout.',
  productGuide: {
    source: 'docs/product-repository.md',
    relationship: 'Editorial synthesis adapted from the product README; it is not a byte-for-byte snapshot.',
    upstreamPath: 'README.md',
    upstreamSha256: createHash('sha256').update(upstreamReadme).digest('hex'),
  },
  references,
};
const target = path.join(root, 'apps/starlight/src/data/product-evidence.json');
fs.writeFileSync(target, JSON.stringify(evidence, null, 2) + '\n');
console.log(`Product evidence: ${revision.slice(0, 12)}; ${references.length} referenced paths; no product source copied.`);
