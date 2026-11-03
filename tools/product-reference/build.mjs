import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {loadBundle} from './bundle.mjs';

const output = fileURLToPath(new URL('../../dist/', import.meta.url));
assert.ok(fs.existsSync(path.join(output, '.pos-docs-build')) && !fs.lstatSync(output).isSymbolicLink(), 'Build the documentation artifact first');
const bundle = loadBundle();
for (const [relative, bytes] of bundle.files) {
  const target = path.join(output, 'contracts', relative);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, bytes);
}
console.log(`Published product contracts from ${bundle.manifest.source.commit.slice(0, 12)}; no runtime API access.`);
