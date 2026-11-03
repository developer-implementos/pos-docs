import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {loadBundle, productRepository, snapshotRoot} from './bundle.mjs';

const args = process.argv.slice(2);
assert.ok(args.length === 2 && args[0] === '--workspace', 'Usage: node tools/product-reference/sync.mjs --workspace <clean-pos-platform-checkout>');
const workspace = fs.realpathSync(path.resolve(args[1]));
const git = (...command) => execFileSync('git', command, {cwd: workspace, encoding: 'utf8'}).trim();
assert.ok([productRepository, `${productRepository}.git`, 'git@github.com:developer-implementos/pos-platform.git'].includes(git('remote', 'get-url', 'origin')), 'Use the corporate product repository');
assert.equal(git('status', '--porcelain'), '', 'Product checkout must be clean');
const revision = git('rev-parse', 'HEAD');
const bundle = loadBundle(path.join(workspace, 'dist/documentation'));
assert.equal(bundle.manifest.source.commit, revision, 'Export belongs to another product revision');
assert.equal(git('rev-parse', 'HEAD'), revision, 'Product revision changed during import');
assert.equal(git('status', '--porcelain'), '', 'Product changed during import');
// Read and validate every byte before replacing the explicit, reviewed public snapshot.
for (const [relative, bytes] of bundle.files) {
  const target = path.join(fileURLToPath(snapshotRoot), relative);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, bytes);
}
console.log(`Product reference: ${revision.slice(0, 12)}, ${bundle.apis.length} APIs, ${bundle.database.databases.reduce((count, db) => count + db.tables.length, 0)} tables. Review the snapshot diff before publication.`);
