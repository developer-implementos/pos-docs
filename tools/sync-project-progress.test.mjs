import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseProgressArguments, syncProjectProgress } from './sync-project-progress.mjs';

const origin = 'https://github.com/developer-implementos/pos-platform.git';
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const json = value => JSON.stringify(value, null, 2) + '\n';
function write(root, file, content) {
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content, 'utf8');
}
function initialize(root) {
  fs.mkdirSync(root);
  git(root, 'init', '-q');
  git(root, 'config', 'core.autocrlf', 'false');
  git(root, 'config', 'user.name', 'Progress fixture');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'commit.gpgsign', 'false');
}
function commit(root) {
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'Fixture evidence');
  return git(root, 'rev-parse', 'HEAD');
}
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-progress-import-'));
  // These tests own exactly the newly created temporary fixture tree.
  t.after(() => {
    const resolved = fs.realpathSync(base);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('pos-progress-import-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const root = path.join(base, 'docs');
  const workspace = path.join(base, 'product');
  initialize(root);
  initialize(workspace);
  git(workspace, 'remote', 'add', 'origin', origin);
  const roadmap = {
    schemaVersion: 3,
    phases: [{ id: 'phase-01', title: 'Venta persistida', delivery: { work: [
      { id: 'F01-01', title: 'Venta verificada', apps: ['pos-desktop', 'branch-api'] },
      { id: 'F01-02', title: 'Recuperación verificada', apps: ['branch-api'] },
    ] } }],
  };
  const roadmapSource = json(roadmap);
  write(root, 'docs/roadmap.json', roadmapSource);
  const scopeRevision = commit(root);
  write(workspace, 'README.md', 'Synthetic product evidence\n');
  write(workspace, 'delivery/evidence/acceptance.md', 'Synthetic acceptance evidence\n');
  const productRevision = commit(workspace);
  const content = {
    schemaVersion: 1,
    reviewedOn: '2026-10-30',
    productRevision,
    scope: {
      repository: 'https://github.com/developer-implementos/pos-docs',
      revision: scopeRevision,
      path: 'docs/roadmap.json',
      sha256: createHash('sha256').update(roadmapSource).digest('hex'),
    },
    summary: 'Base técnica disponible; entrega funcional pendiente.',
    applications: ['pos-desktop', 'branch-api'].map(id => ({
      id, stage: 'foundation', summary: 'Base técnica disponible.', nextStep: 'Integrar el recorrido.', evidence: [{ path: 'README.md', label: 'Alcance de la base' }],
    })),
    workPackages: roadmap.phases[0].delivery.work.map(entry => ({ id: entry.id, apps: entry.apps, status: 'not_started', summary: 'Pendiente de aceptación.', acceptance: null })),
  };
  const update = () => {
    write(workspace, 'delivery/progress.json', json(content));
    return commit(workspace);
  };
  const revision = update();
  const destination = path.join(root, 'portal/data/project-progress.json');
  return { root, workspace, content, revision, destination, update };
}

test('imports only reviewed metadata from the immutable clean product commit', t => {
  const item = fixture(t);
  const result = syncProjectProgress(item);
  const snapshot = JSON.parse(fs.readFileSync(item.destination, 'utf8'));
  assert.equal(result.changed, true);
  assert.equal(result.accepted, 0);
  assert.equal(result.total, 2);
  assert.equal(snapshot.source.revision, item.revision);
  assert.notEqual(snapshot.source.revision, snapshot.content.productRevision);
  assert.equal(snapshot.source.sha256, createHash('sha256').update(JSON.stringify(item.content)).digest('hex'));
  assert.deepEqual(snapshot.content, item.content);
  assert.equal(fs.existsSync(path.join(item.root, 'README.md')), false);
  assert.equal(fs.readdirSync(path.dirname(item.destination)).length, 1);
  assert.equal(syncProjectProgress({ ...item, check: true }).changed, false);
  assert.equal(syncProjectProgress(item).changed, false);
});

test('source verifies evidence in the committed source tree and preserves its original content hash', t => {
  const item = fixture(t);
  write(item.workspace, 'delivery/evidence/current.md', 'Evidence introduced with this source revision\n');
  item.content.productRevision = 'source';
  item.content.applications[0].evidence[0].path = 'delivery/evidence/current.md';
  const sourceRevision = item.update();
  const result = syncProjectProgress(item);
  const snapshot = JSON.parse(fs.readFileSync(item.destination, 'utf8'));
  assert.equal(result.revision, sourceRevision);
  assert.equal(snapshot.source.revision, sourceRevision);
  assert.equal(snapshot.content.productRevision, 'source');
  assert.deepEqual(snapshot.content, item.content);
  assert.equal(snapshot.source.sha256, createHash('sha256').update(JSON.stringify(item.content)).digest('hex'));
  assert.equal(result.accepted, 0);
  assert.equal(syncProjectProgress({ ...item, check: true }).changed, false);
});

test('source survives a squash without accepting discarded product or acceptance revisions', t => {
  const item = fixture(t);
  const baseRevision = item.revision;
  git(item.workspace, 'switch', '-c', 'fixture-feature');
  write(item.workspace, 'delivery/evidence/feature.md', 'Evidence in the feature tree\n');
  item.content.productRevision = 'source';
  item.content.applications[0].evidence[0].path = 'delivery/evidence/feature.md';
  const featureRevision = item.update();
  git(item.workspace, 'switch', '-c', 'fixture-integrated', baseRevision);
  git(item.workspace, 'merge', '--squash', 'fixture-feature');
  git(item.workspace, 'commit', '-qm', 'Squashed fixture evidence');
  const integratedRevision = git(item.workspace, 'rev-parse', 'HEAD');
  assert.notEqual(featureRevision, integratedRevision);
  assert.throws(() => git(item.workspace, 'merge-base', '--is-ancestor', featureRevision, integratedRevision));
  assert.equal(syncProjectProgress(item).revision, integratedRevision);
  const previous = fs.readFileSync(item.destination, 'utf8');
  const snapshot = JSON.parse(previous);
  assert.equal(snapshot.content.productRevision, 'source');
  assert.equal(snapshot.source.revision, integratedRevision);

  item.content.productRevision = featureRevision;
  item.update();
  assert.throws(() => syncProjectProgress(item), /Evidence revision must belong to the imported product history/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);

  item.content.productRevision = 'source';
  item.content.workPackages[0].status = 'accepted';
  item.content.workPackages[0].acceptance = {
    revision: featureRevision, reviewedOn: '2026-10-30', reviewer: 'Revisión de prueba', evidence: [{ path: 'delivery/evidence/feature.md', label: 'Evidencia de la rama' }],
  };
  item.update();
  assert.throws(() => syncProjectProgress(item), /Acceptance revision must belong to the audited product history/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);

  item.content.workPackages[0].acceptance.revision = baseRevision;
  item.content.workPackages[0].acceptance.evidence[0].path = 'delivery/evidence/acceptance.md';
  item.update();
  assert.equal(syncProjectProgress(item).accepted, 1, 'Only acceptance in the actual source history is retained');
});

test('source still rejects missing evidence before replacing a published snapshot', t => {
  const item = fixture(t);
  item.content.productRevision = 'source';
  item.update();
  syncProjectProgress(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  item.content.applications[0].evidence[0].path = 'does-not-exist.md';
  item.update();
  assert.throws(() => syncProjectProgress(item), /Missing evidence/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
});

test('--check rejects a missing or stale snapshot without writing it', t => {
  const item = fixture(t);
  assert.throws(() => syncProjectProgress({ ...item, check: true }), /snapshot is stale/);
  assert.equal(fs.existsSync(item.destination), false);
  syncProjectProgress(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  item.content.summary = 'Nueva revisión documentada.';
  item.update();
  assert.throws(() => syncProjectProgress({ ...item, check: true }), /snapshot is stale/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
  assert.equal(syncProjectProgress(item).changed, true);
});

test('rejects tracked and untracked product changes without replacing the published snapshot', t => {
  const item = fixture(t);
  syncProjectProgress(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  write(item.workspace, 'README.md', 'Uncommitted changes\n');
  assert.throws(() => syncProjectProgress(item), /Commit or resolve product changes/);
  git(item.workspace, 'restore', '--', 'README.md');
  write(item.workspace, 'untracked.txt', 'Untracked change\n');
  assert.throws(() => syncProjectProgress(item), /Commit or resolve product changes/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
});

test('rejects another repository or a nested source directory', t => {
  const item = fixture(t);
  git(item.workspace, 'remote', 'set-url', 'origin', 'https://github.com/example/pos-platform.git');
  assert.throws(() => syncProjectProgress(item), /corporate POS Platform/);
  git(item.workspace, 'remote', 'set-url', 'origin', origin);
  assert.throws(() => syncProjectProgress({ ...item, workspace: path.join(item.workspace, 'delivery') }), /root of the product checkout/);
  assert.equal(fs.existsSync(item.destination), false);
});

test('missing application or acceptance evidence fails before snapshot replacement', t => {
  const item = fixture(t);
  syncProjectProgress(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  item.content.applications[0].evidence[0].path = 'does-not-exist.md';
  item.update();
  assert.throws(() => syncProjectProgress(item), /Missing evidence/);
  item.content.applications[0].evidence[0].path = 'README.md';
  item.content.workPackages[0].status = 'accepted';
  item.content.workPackages[0].acceptance = {
    revision: item.content.productRevision, reviewedOn: '2026-10-30', reviewer: 'Revisión de prueba', evidence: [{ path: 'missing-result.md', label: 'Resultado de aceptación' }],
  };
  item.update();
  assert.throws(() => syncProjectProgress(item), /Missing evidence/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
  item.content.workPackages[0].acceptance.evidence[0].path = 'delivery/evidence/acceptance.md';
  item.update();
  assert.equal(syncProjectProgress(item).accepted, 1);
});

test('rejects changed roadmap content and a false pinned roadmap revision', t => {
  const item = fixture(t);
  syncProjectProgress(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  fs.appendFileSync(path.join(item.root, 'docs/roadmap.json'), '\n');
  assert.throws(() => syncProjectProgress(item), /Roadmap scope changed/);
  git(item.root, 'restore', '--', 'docs/roadmap.json');
  item.content.scope.revision = 'a'.repeat(40);
  item.update();
  assert.throws(() => syncProjectProgress(item));
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
});

test('acceptance cannot refer to a commit newer than the audited product revision', t => {
  const item = fixture(t);
  syncProjectProgress(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  write(item.workspace, 'delivery/evidence/new-acceptance.md', 'Later acceptance evidence\n');
  const laterRevision = commit(item.workspace);
  item.content.workPackages[0].status = 'accepted';
  item.content.workPackages[0].acceptance = {
    revision: laterRevision, reviewedOn: '2026-10-30', reviewer: 'Revisión de prueba', evidence: [{ path: 'delivery/evidence/new-acceptance.md', label: 'Nueva aceptación' }],
  };
  item.update();
  assert.throws(() => syncProjectProgress(item), /Acceptance revision must belong to the audited product history/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
  item.content.productRevision = laterRevision;
  item.update();
  assert.equal(syncProjectProgress(item).accepted, 1);
});

test('a tracked symlink cannot serve as reviewed evidence even when its target exists', t => {
  const item = fixture(t);
  syncProjectProgress(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  // Git's symlink representation avoids requiring OS symlink privileges on Windows.
  git(item.workspace, 'config', 'core.symlinks', 'false');
  write(item.workspace, 'linked-evidence.md', 'README.md');
  git(item.workspace, 'add', 'linked-evidence.md');
  const blob = git(item.workspace, 'rev-parse', ':linked-evidence.md');
  git(item.workspace, 'update-index', '--cacheinfo', `120000,${blob},linked-evidence.md`);
  git(item.workspace, 'commit', '-qm', 'Fixture symbolic link');
  item.content.productRevision = git(item.workspace, 'rev-parse', 'HEAD');
  item.content.applications[0].evidence[0].path = 'linked-evidence.md';
  item.update();
  assert.equal(git(item.workspace, 'status', '--porcelain'), '');
  assert.match(git(item.workspace, 'ls-tree', item.content.productRevision, '--', 'linked-evidence.md'), /^120000 blob/);
  assert.throws(() => syncProjectProgress(item), /unsupported Git object/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
  item.content.productRevision = 'source';
  item.update();
  assert.throws(() => syncProjectProgress(item), /unsupported Git object/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
});

test('CLI accepts only the explicit workspace and optional check arguments', () => {
  assert.deepEqual(parseProgressArguments(['--workspace', 'C:/checkout']), { workspace: 'C:/checkout', check: false });
  assert.deepEqual(parseProgressArguments(['--check', '--workspace', 'C:/checkout']), { workspace: 'C:/checkout', check: true });
  for (const args of [[], ['--workspace'], ['--workspace', '--check'], ['--workspace', 'path', '--unknown'], ['--workspace', 'path', '--check', '--check'], ['--workspace', 'path', '--workspace', 'other']]) {
    assert.throws(() => parseProgressArguments(args), /Usage:/);
  }
});

function technicalRegistry(item) {
  item.content.schemaVersion = 2;
  item.content.productRevision = 'source';
  for (const work of item.content.workPackages) work.verification = null;
  item.content.workPackages[0].status = 'verified';
  item.content.workPackages[0].verification = {
    revision: item.revision, reviewedOn: '2026-10-30', reviewer: 'Technical fixture reviewer',
    evidence: [{ path: 'delivery/evidence/acceptance.md', label: 'Technical criteria evidence' }],
  };
}

test('schema 2 imports verified work before manual acceptance and preserves raw source provenance', t => {
  const item = fixture(t);
  technicalRegistry(item);
  const verificationRevision = item.content.workPackages[0].verification.revision;
  item.update();
  const result = syncProjectProgress(item);
  assert.equal(result.measurement, 'verification');
  assert.equal(result.verified, 1);
  assert.equal(result.accepted, 0);
  const snapshot = JSON.parse(fs.readFileSync(item.destination, 'utf8'));
  assert.deepEqual(snapshot.content, item.content);
  assert.equal(snapshot.content.productRevision, 'source');
  assert.equal(snapshot.source.sha256, createHash('sha256').update(JSON.stringify(item.content)).digest('hex'));
  assert.equal(syncProjectProgress({ ...item, check: true }).changed, false);

  write(item.workspace, 'delivery/evidence/manual-review.md', 'Independent human review fixture\n');
  const acceptanceRevision = commit(item.workspace);
  item.content.workPackages[0].acceptance = {
    revision: acceptanceRevision, reviewedOn: '2026-10-30', reviewer: 'Manual fixture reviewer',
    evidence: [{ path: 'delivery/evidence/manual-review.md', label: 'Manual review evidence' }],
  };
  item.update();
  const accepted = syncProjectProgress(item);
  assert.equal(accepted.verified, 1);
  assert.equal(accepted.accepted, 1);
  assert.notEqual(verificationRevision, acceptanceRevision);
  assert.equal(JSON.parse(fs.readFileSync(item.destination, 'utf8')).content.workPackages[0].verification.revision, verificationRevision);
});

test('verification evidence must exist at its revision, not merely in the latest product checkout', t => {
  const item = fixture(t);
  technicalRegistry(item);
  item.update();
  syncProjectProgress(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  write(item.workspace, 'delivery/evidence/later-verification.md', 'Later technical evidence\n');
  const laterRevision = commit(item.workspace);
  item.content.workPackages[0].verification.evidence[0].path = 'delivery/evidence/later-verification.md';
  item.update();
  assert.throws(() => syncProjectProgress(item), /Missing evidence/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
  item.content.workPackages[0].verification.revision = laterRevision;
  item.content.productRevision = item.revision;
  item.update();
  assert.throws(() => syncProjectProgress(item), /Verification revision must belong to the audited product history/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
  item.content.productRevision = 'source';
  item.update();
  assert.equal(syncProjectProgress(item).verified, 1);
});

test('manual acceptance must include the technical verification even when both commits belong to product history', t => {
  const item = fixture(t);
  const earlierRevision = item.revision;
  write(item.workspace, 'delivery/evidence/verification.md', 'Verified technical criteria\n');
  const verificationRevision = commit(item.workspace);
  technicalRegistry(item);
  item.content.workPackages[0].verification.revision = verificationRevision;
  item.content.workPackages[0].verification.evidence[0].path = 'delivery/evidence/verification.md';
  item.update();
  syncProjectProgress(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  item.content.workPackages[0].acceptance = {
    revision: earlierRevision, reviewedOn: '2026-10-30', reviewer: 'Manual fixture reviewer',
    evidence: [{ path: 'delivery/evidence/acceptance.md', label: 'Older manual review' }],
  };
  item.update();
  assert.throws(() => syncProjectProgress(item), /Acceptance must include the verified product revision/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
  item.content.workPackages[0].acceptance.revision = verificationRevision;
  item.update();
  assert.equal(syncProjectProgress(item).accepted, 1);
});

test('a squash never reassigns verification from discarded feature history', t => {
  const item = fixture(t);
  const baseRevision = item.revision;
  git(item.workspace, 'switch', '-c', 'technical-feature');
  write(item.workspace, 'delivery/evidence/technical-feature.md', 'Feature verification evidence\n');
  const featureRevision = commit(item.workspace);
  git(item.workspace, 'switch', '-c', 'technical-integrated', baseRevision);
  git(item.workspace, 'merge', '--squash', 'technical-feature');
  git(item.workspace, 'commit', '-qm', 'Squashed technical feature');
  const integratedRevision = git(item.workspace, 'rev-parse', 'HEAD');
  assert.notEqual(featureRevision, integratedRevision);
  technicalRegistry(item);
  item.content.workPackages[0].verification.revision = featureRevision;
  item.content.workPackages[0].verification.evidence[0].path = 'delivery/evidence/technical-feature.md';
  item.update();
  assert.throws(() => syncProjectProgress(item), /Verification revision must belong to the audited product history/);
  assert.equal(fs.existsSync(item.destination), false);
  item.content.workPackages[0].verification.revision = integratedRevision;
  item.update();
  assert.equal(syncProjectProgress(item).verified, 1, 'An explicit review of integrated history is required');
});

test('schema 2 rejects tracked symlinks as technical verification evidence', t => {
  const item = fixture(t);
  technicalRegistry(item);
  item.update();
  syncProjectProgress(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  git(item.workspace, 'config', 'core.symlinks', 'false');
  write(item.workspace, 'linked-verification.md', 'README.md');
  git(item.workspace, 'add', 'linked-verification.md');
  const blob = git(item.workspace, 'rev-parse', ':linked-verification.md');
  git(item.workspace, 'update-index', '--cacheinfo', `120000,${blob},linked-verification.md`);
  git(item.workspace, 'commit', '-qm', 'Fixture technical symbolic link');
  item.content.workPackages[0].verification.revision = git(item.workspace, 'rev-parse', 'HEAD');
  item.content.workPackages[0].verification.evidence[0].path = 'linked-verification.md';
  item.update();
  assert.throws(() => syncProjectProgress(item), /unsupported Git object/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
});
