/**
 * Imports the product snapshots and, with --publish, opens or updates the import PR.
 *
 *   node tools/project-import/run.mjs --workspace <clean pos-platform checkout> [--publish]
 *
 * Environment: GH_TOKEN reads POS Platform issues for the importers; with --publish, POS_DOCS_TOKEN
 * writes the import branch and PR, and IMPORT_APP_SLUG identifies the App that owns them.
 * Output never includes snapshot contents: this repository and its workflow logs are public.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validatePullRequest } from '../editorial/policy.mjs';
import { validateChangelogOverride } from '../release/policy.mjs';
import { missingSnapshotEntries, snapshotChanges, snapshotPaths } from '../release/snapshot-changes.mjs';
import { closeObsoleteImport, importClient, publishImport } from './github.mjs';
import { renderImportPullRequest } from './pull-request.mjs';
import { importSnapshots } from './snapshots.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

function parse(args) {
  const options = { publish: false, workspace: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--publish' && !options.publish) options.publish = true;
    else if (args[index] === '--workspace' && !options.workspace && args[index + 1] && !args[index + 1].startsWith('--')) options.workspace = args[++index];
    else throw new Error('Usage: node tools/project-import/run.mjs --workspace <clean-pos-platform-checkout> [--publish]');
  }
  if (!options.workspace) throw new Error('Usage: node tools/project-import/run.mjs --workspace <clean-pos-platform-checkout> [--publish]');
  return options;
}

/** Parsed snapshots that the changelog entries compare, read from a revision or the working tree. */
function readSnapshots(root, revision) {
  return Object.fromEntries(Object.entries(snapshotPaths).map(([name, relative]) => {
    const text = revision ? git(root, 'show', `${revision}:${relative}`) : fs.readFileSync(path.join(root, relative), 'utf8');
    return [name, JSON.parse(text)];
  }));
}

/**
 * What a snapshot publishes, without the two values that move on their own: the product commit it was
 * read from and the time GitHub was observed. A new product commit that leaves the delivery records
 * and the issues unchanged is not news, so it does not justify a PR.
 */
export function publishedFacts(text) {
  const snapshot = JSON.parse(text);
  if (snapshot.source) delete snapshot.source.revision;
  if (snapshot.issues) delete snapshot.issues.observedAt;
  return JSON.stringify(snapshot);
}

/**
 * Plans the import without network writes. Returns `{status: 'current', revision, reason}` or
 * `{status: 'stale', revision, base, results, entries, title, body, files}`.
 */
export function planImport({ root = repositoryRoot, workspace, importers, options }) {
  if (git(root, 'status', '--porcelain', '--untracked-files=all') !== '') throw new Error('POS Docs checkout must be clean before importing.');
  const base = git(root, 'rev-parse', 'HEAD').trim();
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('POS Docs HEAD must be a full commit SHA.');
  const before = readSnapshots(root, base);
  const imported = importSnapshots({ root, workspace, ...(importers ? { importers } : {}), ...(options ? { options } : {}) });
  if (!imported.imported.length) return { status: 'current', reason: 'facts', revision: imported.revision, base, results: imported.results };
  const changed = git(root, 'status', '--porcelain', '--untracked-files=all').split('\n').filter(Boolean).map(line => line.slice(3));
  const expected = new Set(imported.imported.map(result => result.path));
  if (changed.length !== expected.size || changed.some(file => !expected.has(file))) {
    throw new Error('The import changed files other than the imported snapshots; refusing to publish.');
  }
  // Facts decide; the revision only travels with them. All of them stay on one revision either way.
  const results = imported.results.map(result => ({
    ...result,
    material: result.imported && publishedFacts(git(root, 'show', `${base}:${result.path}`)) !== publishedFacts(fs.readFileSync(path.join(root, result.path), 'utf8')),
  }));
  if (!results.some(result => result.material)) {
    git(root, 'checkout', '--', ...expected);
    return { status: 'current', reason: 'revision', revision: imported.revision, base, results: results.map(result => ({ ...result, imported: false })) };
  }
  const entries = snapshotChanges(before, readSnapshots(root, null));
  const { title, body } = renderImportPullRequest({ revision: imported.revision, results, entries });
  const knownFiles = new Set(git(root, 'ls-files', '-z').split('\0').filter(Boolean));
  // Fail before touching GitHub if the body would not pass the editorial policy in CI.
  validatePullRequest({ body, knownFiles });
  validateChangelogOverride(body);
  if (missingSnapshotEntries(body, entries).length) throw new Error('The rendered body lacks generated changelog entries.');
  const files = Object.fromEntries([...expected].map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
  return { status: 'stale', revision: imported.revision, base, results, entries, title, body, files };
}

function summarize(lines) {
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.map(line => `- ${line}`).join('\n') + '\n');
}

async function main() {
  const { workspace, publish } = parse(process.argv.slice(2));
  const plan = planImport({ workspace: path.resolve(workspace) });
  const snapshotsLine = plan.results.map(result => `${result.label}: ${result.imported ? 'importado' : 'vigente'}`).join('; ');
  const lines = [`POS Platform ${plan.revision.slice(0, 12)} sobre POS Docs ${plan.base.slice(0, 12)}. ${snapshotsLine}.`];
  if (plan.status === 'current') {
    lines.push(plan.reason === 'revision'
      ? 'Sólo avanzó la revisión del producto: los registros de entrega y las issues no cambian, así que se conserva el corte publicado.'
      : 'Los snapshots publicados están vigentes; no hay nada que importar.');
    if (publish) {
      const closed = await closeObsoleteImport({ request: importClient({ token: process.env.POS_DOCS_TOKEN }), appSlug: process.env.IMPORT_APP_SLUG, revision: plan.revision });
      if (closed) lines.push(`PR de importación obsoleta cerrada: #${closed.pull} (${closed.url}).`);
    }
    summarize(lines);
    return;
  }
  lines.push(`${plan.entries.length} entradas del historial. Título: ${plan.title}`);
  if (!publish) {
    lines.push('Plan sin publicar: ejecutar con --publish para abrir o actualizar la PR.');
    summarize(lines);
    return;
  }
  const result = await publishImport({
    request: importClient({ token: process.env.POS_DOCS_TOKEN }),
    base: plan.base,
    files: plan.files,
    title: plan.title,
    body: plan.body,
    appSlug: process.env.IMPORT_APP_SLUG,
  });
  lines.push(`PR #${result.pull} ${{ created: 'creada', updated: 'actualizada', unchanged: 'sin cambios' }[result.pullRequest]}; rama ${{ created: 'creada', updated: 'actualizada', unchanged: 'sin cambios' }[result.branch]} en ${result.head.slice(0, 12)}: ${result.url}`);
  summarize(lines);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`Project import failed: ${error.message}`);
    process.exitCode = 1;
  });
}
