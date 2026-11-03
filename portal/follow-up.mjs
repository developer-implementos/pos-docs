import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadProgress } from './progress.mjs';

export const productRepository = 'https://github.com/developer-implementos/pos-platform';
const kinds = ['access', 'question', 'decision', 'provider', 'hardware', 'investigation', 'validation'];
const impactScopes = ['technical', 'operational', 'review'];
const executionLabels = ['status:triage', 'status:ready', 'status:in-progress', 'status:blocked', 'status:review', 'status:validation'];
const githubLogin = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

function shape(value, fields, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...fields].sort(), `${label} has missing or unknown fields`);
}

function text(value, label, limit = 2000) {
  assert.ok(typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= limit && !/[\u0000-\u001f\u007f]/u.test(value), `${label} must be bounded plain text`);
}

function date(value, label) {
  assert.ok(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), `${label} must be an ISO date`);
  const parsed = new Date(`${value}T00:00:00Z`);
  assert.ok(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value, `${label} must be a real date`);
}

function timestamp(value, label) {
  assert.ok(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value), `${label} must be a UTC timestamp`);
  const parsed = new Date(value);
  assert.ok(Number.isFinite(parsed.getTime()) && parsed.toISOString() === value.replace(/(?<=:\d{2})Z$/, '.000Z'), `${label} must be a real timestamp`);
}

function distinctStrings(values, label) {
  assert.ok(Array.isArray(values) && values.every(value => typeof value === 'string'), `${label} must be a string array`);
  assert.equal(new Set(values).size, values.length, `${label} contains duplicates`);
}

function evidence(entries, label) {
  assert.ok(Array.isArray(entries) && entries.length > 0, `${label} requires evidence`);
  const urls = new Set();
  for (const entry of entries) {
    shape(entry, ['url', 'label'], label);
    text(entry.label, `${label} label`, 300);
    text(entry.url, `${label} URL`, 1000);
    assert.ok(!/[\s\\]/.test(entry.url), `${label} evidence URL cannot contain whitespace or backslashes`);
    const url = new URL(entry.url);
    const corporate = url.hostname === 'github.com' && /^\/developer-implementos\/[a-z\d._-]+(?:\/|$)/i.test(url.pathname);
    const published = url.hostname === 'pos-docs-starlight.vercel.app';
    assert.ok(url.protocol === 'https:' && /^https:\/\/(?:github\.com|pos-docs-starlight\.vercel\.app)(?:\/|#|$)/i.test(entry.url) && (corporate || published) && !url.username && !url.password && !url.port && !url.search, `${label} requires a public documentation or corporate repository URL without credentials, port or query`);
    assert.ok(!urls.has(entry.url), `${label} repeats an evidence URL`);
    urls.add(entry.url);
  }
}

/** Same serialization rule as the reviewed product metadata, independent of JSON whitespace. */
export function followUpContentHash(content) {
  return createHash('sha256').update(JSON.stringify(content), 'utf8').digest('hex');
}

export function validateFollowUpContent(content, workPackageIds) {
  shape(content, ['schemaVersion', 'reviewedOn', 'items'], 'Follow-up content');
  assert.equal(content.schemaVersion, 1, 'Unsupported follow-up content schema');
  date(content.reviewedOn, 'Follow-up review');
  assert.ok(Array.isArray(content.items), 'Follow-up items must be an array');
  const knownWork = new Set(workPackageIds);
  const ids = new Set();
  for (const item of content.items) {
    shape(item, ['id', 'kind', 'state', 'workPackages', 'summary', 'impact', 'impactScope', 'nextAction', 'requestedFrom', 'owner', 'closureCriteria', 'reviewedOn', 'evidence', 'resolution'], 'Follow-up item');
    assert.ok(typeof item.id === 'string' && /^FOLLOWUP-\d{3}$/.test(item.id) && item.id !== 'FOLLOWUP-000' && !ids.has(item.id), 'Unknown or duplicate follow-up ID');
    ids.add(item.id);
    assert.ok(kinds.includes(item.kind), `${item.id} has an unknown kind`);
    assert.ok(['open', 'resolved'].includes(item.state), `${item.id} has an unknown state`);
    assert.ok(impactScopes.includes(item.impactScope), `${item.id} has an unknown impact scope`);
    distinctStrings(item.workPackages, `${item.id} work packages`);
    assert.ok(item.workPackages.length > 0 && item.workPackages.every(id => knownWork.has(id)), `${item.id} references an unknown work package`);
    for (const field of ['summary', 'impact', 'nextAction', 'requestedFrom', 'closureCriteria']) text(item[field], `${item.id} ${field}`);
    assert.ok(item.owner === null || (typeof item.owner === 'string' && githubLogin.test(item.owner)), `${item.id} requires a GitHub login or null owner`);
    date(item.reviewedOn, `${item.id} review`);
    assert.ok(item.reviewedOn <= content.reviewedOn, `${item.id} review cannot follow the snapshot review`);
    evidence(item.evidence, `${item.id} evidence`);
    if (item.state === 'open') {
      assert.equal(item.resolution, null, `${item.id} open follow-up cannot claim resolution`);
    } else {
      shape(item.resolution, ['resolvedOn', 'summary', 'evidence'], `${item.id} resolution`);
      date(item.resolution.resolvedOn, `${item.id} resolution`);
      assert.ok(item.resolution.resolvedOn <= item.reviewedOn, `${item.id} resolution cannot follow its review`);
      text(item.resolution.summary, `${item.id} resolution summary`);
      evidence(item.resolution.evidence, `${item.id} resolution evidence`);
    }
  }
  return content;
}

/** Build an offline view without equating issue closure, technical verification and acceptance. */
export function deriveFollowUp(snapshot, progress) {
  shape(snapshot, ['schemaVersion', 'source', 'content', 'issues'], 'Follow-up snapshot');
  assert.equal(snapshot.schemaVersion, 1, 'Unsupported follow-up snapshot schema');
  shape(snapshot.source, ['repository', 'revision', 'path', 'sha256'], 'Follow-up source');
  assert.equal(snapshot.source.repository, productRepository, 'Follow-up requires the corporate product repository');
  assert.equal(snapshot.source.path, 'delivery/follow-ups.json', 'Unexpected follow-up source path');
  assert.match(snapshot.source.revision, /^[a-f0-9]{40}$/, 'Follow-up source requires an immutable revision');
  assert.match(snapshot.source.sha256, /^[a-f0-9]{64}$/, 'Follow-up source requires a content hash');
  assert.equal(snapshot.source.sha256, followUpContentHash(snapshot.content), 'Follow-up content hash mismatch');
  assert.ok(Array.isArray(progress?.workPackages) && progress.workPackages.length > 0, 'Follow-up requires validated project progress');
  const workIds = new Set(progress.workPackages.map(item => item.id));
  validateFollowUpContent(snapshot.content, workIds);
  shape(snapshot.issues, ['observedAt', 'repository', 'entries'], 'Issue snapshot');
  assert.equal(snapshot.issues.repository, productRepository, 'Issues require the corporate product repository');
  timestamp(snapshot.issues.observedAt, 'GitHub observation');
  assert.ok(snapshot.content.reviewedOn <= snapshot.issues.observedAt.slice(0, 10), 'GitHub observation cannot precede the follow-up review');
  assert.ok(Array.isArray(snapshot.issues.entries), 'Issue entries must be an array');
  const issues = new Map();
  const numbers = new Set();
  const warnings = [];
  for (const issue of snapshot.issues.entries) {
    shape(issue, ['code', 'number', 'url', 'state', 'executionLabels', 'assignees', 'updatedAt'], 'Issue entry');
    assert.ok(workIds.has(issue.code) && !issues.has(issue.code), 'Unknown or duplicate issue code');
    assert.ok(Number.isSafeInteger(issue.number) && issue.number > 0 && !numbers.has(issue.number), 'Invalid or duplicate issue number');
    numbers.add(issue.number);
    assert.equal(issue.url, `${productRepository}/issues/${issue.number}`, 'Issue URL does not match its corporate identity');
    assert.ok(['OPEN', 'CLOSED'].includes(issue.state), 'Unknown issue state');
    distinctStrings(issue.executionLabels, `${issue.code} execution labels`);
    assert.ok(issue.executionLabels.every(label => /^status:[a-z][a-z-]*$/.test(label)), 'Unexpected non-execution issue label');
    distinctStrings(issue.assignees, `${issue.code} assignees`);
    assert.ok(issue.assignees.every(login => githubLogin.test(login)), 'Invalid GitHub assignee login');
    timestamp(issue.updatedAt, `${issue.code} update`);
    assert.ok(new Date(issue.updatedAt) <= new Date(snapshot.issues.observedAt), 'Issue update cannot follow the GitHub observation');
    if (issue.state === 'OPEN' && (issue.executionLabels.length !== 1 || !executionLabels.includes(issue.executionLabels[0]))) {
      warnings.push({ code: 'execution-unconfirmed', workPackage: issue.code, message: `${issue.code}: estado de ejecución sin confirmar; revisar sus etiquetas en GitHub.` });
    }
    if (issue.state === 'CLOSED' && issue.executionLabels.length > 0) {
      warnings.push({ code: 'closed-with-active-label', workPackage: issue.code, message: `${issue.code}: issue cerrada con etiqueta de ejecución; revisar el seguimiento en GitHub.` });
    }
    issues.set(issue.code, issue);
  }
  assert.deepEqual([...issues.keys()].sort(), [...workIds].sort(), 'GitHub snapshot must cover every work package');
  const workPackages = progress.workPackages.map(work => {
    const attentionIds = snapshot.content.items.filter(item => item.state === 'open' && item.workPackages.includes(work.id)).map(item => item.id);
    if (work.status === 'blocked' && !snapshot.content.items.some(item => item.state === 'open' && item.impactScope === 'technical' && item.workPackages.includes(work.id))) {
      warnings.push({ code: 'blocked-without-follow-up', workPackage: work.id, message: `${work.id}: bloqueo técnico sin siguiente acción registrada.` });
    }
    return { ...work, code: work.id, issue: issues.get(work.id), attentionIds };
  });
  const workById = new Map(workPackages.map(work => [work.id, work]));
  const items = snapshot.content.items.map(item => ({ ...item, workPackages: item.workPackages.map(id => workById.get(id)) }));
  const open = items.filter(item => item.state === 'open');
  return {
    reviewedOn: snapshot.content.reviewedOn,
    observedAt: snapshot.issues.observedAt,
    source: snapshot.source,
    items,
    workPackages,
    warnings,
    counts: { open: open.length, resolved: items.length - open.length, unassigned: open.filter(item => item.owner === null).length, ...Object.fromEntries(impactScopes.map(scope => [scope, open.filter(item => item.impactScope === scope).length])) },
  };
}

export function loadFollowUp(root, progress = loadProgress(root)) {
  return deriveFollowUp(JSON.parse(fs.readFileSync(path.join(root, 'portal/data/project-follow-up.json'), 'utf8')), progress);
}
