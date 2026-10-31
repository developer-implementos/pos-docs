import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const productRepository = 'https://github.com/developer-implementos/pos-platform';
const documentationRepository = 'https://github.com/developer-implementos/pos-docs';
const statuses = ['not_started', 'in_progress', 'blocked', 'accepted'];
const stages = ['prototype', 'foundation', 'planned', 'functional', 'validated'];
const sha = /^[a-f0-9]{40}$/;
const digest = /^[a-f0-9]{64}$/;
const appId = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function shape(value, fields, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...fields].sort(), `${label} has missing or unknown fields`);
}

function text(value, label, limit = 2000) {
  assert.ok(typeof value === 'string' && value.trim() === value && value.length > 0, `${label} must be nonempty trimmed text`);
  assert.ok(value.length <= limit && !/[\u0000-\u001f\u007f]/u.test(value), `${label} must be bounded plain text`);
}

function date(value, label) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${label} must be an ISO date`);
  const parsed = new Date(`${value}T00:00:00Z`);
  assert.ok(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value, `${label} must be a real calendar date`);
}

function evidence(entries, label, required) {
  assert.ok(Array.isArray(entries) && entries.length >= (required ? 1 : 0), `${label} requires evidence entries`);
  const paths = new Set();
  for (const entry of entries) {
    shape(entry, ['path', 'label'], label);
    text(entry.label, `${label} label`, 300);
    assert.ok(typeof entry.path === 'string' && entry.path.length <= 500, `${label} path must be bounded text`);
    assert.match(entry.path, /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/, `${label} requires a relative repository path`);
    assert.ok(entry.path.split('/').every(segment => segment !== '.' && segment !== '..'), `${label} path cannot traverse directories`);
    assert.ok(!paths.has(entry.path), `${label} repeats a path`);
    paths.add(entry.path);
  }
}

function roadmapScope(source) {
  const roadmap = JSON.parse(source);
  assert.equal(roadmap.schemaVersion, 3, 'Progress requires roadmap schema 3');
  assert.ok(Array.isArray(roadmap.phases) && roadmap.phases.length > 0, 'Progress requires roadmap phases');
  const work = new Map();
  const apps = new Set();
  const phases = new Set();
  for (const phase of roadmap.phases) {
    assert.match(phase.id, /^phase-[0-9]{2}$/, 'Invalid roadmap phase ID');
    assert.ok(!phases.has(phase.id), 'Duplicate roadmap phase ID');
    phases.add(phase.id);
    text(phase.title, 'Roadmap phase title', 300);
    assert.ok(Array.isArray(phase.delivery?.work) && phase.delivery.work.length > 0, 'Roadmap phase requires work packages');
    for (const entry of phase.delivery.work) {
      assert.match(entry.id, new RegExp(`^F${phase.id.slice(-2)}-[0-9]{2}$`), 'Work package must identify its phase');
      assert.ok(!work.has(entry.id), `Duplicate roadmap work package: ${entry.id}`);
      text(entry.title, 'Roadmap work title', 300);
      assert.ok(Array.isArray(entry.apps) && entry.apps.length > 0, 'Roadmap work package requires apps');
      assert.equal(new Set(entry.apps).size, entry.apps.length, 'Roadmap work package repeats an app');
      for (const app of entry.apps) {
        assert.match(app, appId, 'Invalid roadmap app ID');
        apps.add(app);
      }
      work.set(entry.id, { ...entry, phase: phase.id, phaseTitle: phase.title });
    }
  }
  assert.ok(work.size > 0, 'Progress cannot use an empty scope');
  return { work, apps };
}

/** Hash the parsed JSON content, independently of whitespace in its source file. */
export function progressContentHash(content) {
  return createHash('sha256').update(JSON.stringify(content), 'utf8').digest('hex');
}

/** Validate a pinned snapshot and derive percentages from unique accepted packages. */
export function deriveProgress(snapshot, roadmapSource) {
  shape(snapshot, ['schemaVersion', 'source', 'content'], 'Progress snapshot');
  assert.equal(snapshot.schemaVersion, 1, 'Unsupported progress snapshot schema');
  shape(snapshot.source, ['repository', 'revision', 'path', 'sha256'], 'Progress source');
  assert.equal(snapshot.source.repository, productRepository, 'Progress must come from the corporate product repository');
  assert.equal(snapshot.source.path, 'delivery/progress.json', 'Unexpected canonical progress path');
  assert.match(snapshot.source.revision, sha, 'Progress source requires an immutable revision');
  assert.match(snapshot.source.sha256, digest, 'Progress source requires a content hash');
  assert.equal(progressContentHash(snapshot.content), snapshot.source.sha256, 'Progress source content hash mismatch');

  const content = snapshot.content;
  shape(content, ['schemaVersion', 'reviewedOn', 'productRevision', 'scope', 'summary', 'applications', 'workPackages'], 'Progress content');
  assert.equal(content.schemaVersion, 1, 'Unsupported product progress schema');
  date(content.reviewedOn, 'Progress review');
  assert.ok(content.productRevision === 'source' || (typeof content.productRevision === 'string' && sha.test(content.productRevision)), 'Progress requires source or an immutable audited product revision');
  const productRevision = content.productRevision === 'source' ? snapshot.source.revision : content.productRevision;
  text(content.summary, 'Progress summary');
  shape(content.scope, ['repository', 'revision', 'path', 'sha256'], 'Progress scope');
  assert.equal(content.scope.repository, documentationRepository, 'Progress scope must reference POS Docs');
  assert.equal(content.scope.path, 'docs/roadmap.json', 'Unexpected progress scope path');
  assert.match(content.scope.revision, sha, 'Progress scope requires an immutable revision');
  assert.match(content.scope.sha256, digest, 'Progress scope requires a content hash');
  assert.equal(createHash('sha256').update(roadmapSource.replaceAll('\r\n', '\n'), 'utf8').digest('hex'), content.scope.sha256, 'Roadmap scope changed; review the progress baseline before publishing');
  const scope = roadmapScope(roadmapSource);

  assert.ok(Array.isArray(content.applications) && content.applications.length > 0, 'Progress requires applications');
  const applicationIds = new Set();
  for (const app of content.applications) {
    shape(app, ['id', 'stage', 'summary', 'nextStep', 'evidence'], 'Progress application');
    assert.ok(scope.apps.has(app.id) && !applicationIds.has(app.id), `Unknown or duplicate progress app: ${app.id}`);
    applicationIds.add(app.id);
    assert.ok(stages.includes(app.stage), `Unknown implementation stage: ${app.stage}`);
    text(app.summary, `${app.id} summary`);
    text(app.nextStep, `${app.id} next step`);
    evidence(app.evidence, `${app.id} evidence`, app.stage !== 'planned');
  }
  assert.deepEqual([...applicationIds].sort(), [...scope.apps].sort(), 'Progress must cover every roadmap app');

  assert.ok(Array.isArray(content.workPackages) && content.workPackages.length > 0, 'Progress requires work packages');
  const workIds = new Set();
  const counts = Object.fromEntries(statuses.map(status => [status, 0]));
  const workPackages = content.workPackages.map(entry => {
    shape(entry, ['id', 'apps', 'status', 'summary', 'acceptance'], 'Progress work package');
    assert.ok(scope.work.has(entry.id) && !workIds.has(entry.id), `Unknown or duplicate progress work package: ${entry.id}`);
    workIds.add(entry.id);
    const definition = scope.work.get(entry.id);
    assert.ok(Array.isArray(entry.apps) && new Set(entry.apps).size === entry.apps.length, `${entry.id} requires distinct apps`);
    assert.deepEqual([...entry.apps].sort(), [...definition.apps].sort(), `${entry.id} app assignment differs from the roadmap`);
    assert.ok(statuses.includes(entry.status), `Unknown progress status: ${entry.status}`);
    text(entry.summary, `${entry.id} summary`);
    if (entry.status === 'accepted') {
      shape(entry.acceptance, ['revision', 'reviewedOn', 'reviewer', 'evidence'], `${entry.id} acceptance`);
      assert.match(entry.acceptance.revision, sha, `${entry.id} acceptance requires an immutable revision`);
      date(entry.acceptance.reviewedOn, `${entry.id} acceptance review`);
      assert.ok(entry.acceptance.reviewedOn <= content.reviewedOn, `${entry.id} acceptance cannot follow the snapshot review`);
      text(entry.acceptance.reviewer, `${entry.id} reviewer`, 300);
      evidence(entry.acceptance.evidence, `${entry.id} acceptance evidence`, true);
    } else {
      assert.equal(entry.acceptance, null, `${entry.id} cannot claim acceptance before it is accepted`);
    }
    counts[entry.status]++;
    return { ...entry, phase: definition.phase, phaseTitle: definition.phaseTitle, title: definition.title, href: `/guide/roadmap/${definition.phase}/#work-${entry.id.toLowerCase()}` };
  });
  assert.deepEqual([...workIds].sort(), [...scope.work.keys()].sort(), 'Progress must cover every roadmap work package');

  const total = workPackages.length;
  const accepted = counts.accepted;
  const percent = (complete, size) => Math.floor(complete / size * 100);
  const applications = content.applications.map(app => {
    const assigned = workPackages.filter(entry => entry.apps.includes(app.id));
    const complete = assigned.filter(entry => entry.status === 'accepted').length;
    assert.ok(assigned.length > 0, `${app.id} must have assigned work`);
    return { ...app, total: assigned.length, accepted: complete, percent: percent(complete, assigned.length) };
  });
  return { total, accepted, percent: percent(accepted, total), applications, workPackages, counts, source: snapshot.source, scope: content.scope, reviewedOn: content.reviewedOn, productRevision, summary: content.summary };
}

export function loadProgress(root) {
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'portal/data/project-progress.json'), 'utf8'));
  const roadmap = fs.readFileSync(path.join(root, 'docs/roadmap.json'), 'utf8');
  return deriveProgress(snapshot, roadmap);
}
