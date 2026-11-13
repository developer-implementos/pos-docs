import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { productRepository } from './follow-up.mjs';

export const questionsSourcePath = 'delivery/business-questions.json';
// A fact is answered with evidence; a rule is decided by the business.
export const questionKinds = { fact: 'Hecho', rule: 'Regla' };
export const questionStates = { open: 'Abierta', answered: 'Respondida', decided: 'Decidida' };
export const answerSourceNames = { code: 'Código', data: 'Datos', configuration: 'Configuración', schema: 'Esquema', spec: 'Ficha del producto', person: 'Persona', meeting: 'Reunión' };
// Where a rule is decided or configured, from the common core to a single register.
export const recommendationScopes = { core: 'Núcleo común', country: 'Por país', legal_entity: 'Por sociedad', branch: 'Por sucursal', register: 'Por caja' };
export const recommendationBases = { practice: 'Práctica habitual', regulation: 'Norma', architecture: 'Arquitectura del producto', legacy: 'Conserva el legacy', data: 'Datos observados', meeting: 'Reuniones con los países' };
// Whether the agent recommended the rule. A fact, or a rule decided without one, is not_applicable.
export const recommendationStatuses = { present: 'Con recomendación', none: 'Sin recomendación' };
// What a final decision does with the agent's recommendation; its outcome is null when there was none to weigh.
export const decisionOutcomes = { adopted: 'Adopta la recomendación', adapted: 'Ajusta la recomendación', rejected: 'Descarta la recomendación' };
/**
 * Same official hosts as tools/check-business-questions.mjs: a recommendation grounded in a
 * regulation cites a government, tax authority, official gazette or regulator. A subdomain counts.
 */
export const officialHosts = ['gob.cl', 'sii.cl', 'bcn.cl', 'leychile.cl', 'cmfchile.cl', 'sernac.cl', 'gob.pe', 'elperuano.pe', 'gob.es', 'boe.es', 'aepd.es', 'europa.eu'];
const kinds = Object.keys(questionKinds);
const states = Object.keys(questionStates);
const outcomes = Object.keys(decisionOutcomes);
const answerSources = new Set(Object.keys(answerSourceNames));
const scopes = Object.keys(recommendationScopes);
const bases = new Set(Object.keys(recommendationBases));
export const questionPriorities = Object.freeze(['P1', 'P2', 'P3']);
const priorities = questionPriorities;
// Same rules as tools/check-business-questions.mjs and the follow-up owner in POS Platform.
const login = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const auditRef = /^[CPRSH]-\d{2,}$/;
const segment = /^(?!\.{1,2}$)[\w.@-]+$/;
const official = host => officialHosts.some(domain => host === domain || host.endsWith(`.${domain}`));
/*
 * Content schema 4 of the registry, the one POS Platform publishes: the catalog of roles that decide or
 * are consulted, the deciding and consulted roles of each question, and the questions merged into another.
 */
const schemaVersion = 4;
const contentFields = ['schemaVersion', 'reviewedOn', 'audit', 'roles', 'items', 'merged'];
const itemFields = ['id', 'topic', 'question', 'kind', 'state', 'currentAnswer', 'answerSources', 'auditRefs', 'parityRefs', 'sources', 'decider', 'consulted', 'owner', 'followUp', 'workPackages', 'priority', 'reviewedOn', 'recommendation', 'decision'];
const roleFields = ['key', 'name', 'responsibility'];
const mergedFields = ['id', 'question', 'into', 'mergedOn', 'reason'];
// Same rule as tools/check-business-questions.mjs: a stable lowercase key, such as `tesoreria` or `ti-erp`.
const roleKey = /^[a-z][a-z\d]*(?:-[a-z\d]+)*$/;
const questionId = /^Q-[0-9]{2,}$/;
const recommendationFields = ['answer', 'scope', 'default', 'rationale', 'basis', 'references', 'sources', 'agent', 'proposedOn'];
const decisionFields = ['answer', 'decidedBy', 'decidedOn', 'source', 'outcome'];

/*
 * The public portal must not receive infrastructure. This mirrors tools/publishable-text.mjs of
 * POS Platform, so a registry the product accepts is published here under the same rule, and the
 * build rejects a snapshot edited after its import.
 */
const octet = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const privateRanges = [
  `10\\.${octet}\\.${octet}\\.${octet}`,
  `172\\.(?:1[6-9]|2\\d|3[01])\\.${octet}\\.${octet}`,
  `192\\.168\\.${octet}\\.${octet}`,
  `100\\.(?:6[4-9]|[7-9]\\d|1[01]\\d|12[0-7])\\.${octet}\\.${octet}`,
];
const internalReferenceKinds = [
  ['corporate host name', /\bimp-[a-z][a-z\d-]*[a-z\d]/g],
  ['fleet SSH alias', /\bonprem-\d+\b/g],
  ['private IPv4 address', new RegExp(`(?<![\\d.])(?:${privateRanges.join('|')})(?!\\.?\\d)`, 'g')],
  ['internal domain', /\b[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)*\.(?:internal|intranet|corp|lan|local|home\.arpa)\b(?![.-]?[a-z\d])/gi],
];

/** Internal references in a text, in order of appearance. */
export function internalReferences(text) {
  return internalReferenceKinds
    .flatMap(([kind, pattern]) => [...String(text).matchAll(pattern)].map(match => ({ kind, match: match[0], index: match.index })))
    .sort((left, right) => left.index - right.index)
    .map(({ kind, match }) => ({ kind, match }));
}

function assertPublishable(value, label) {
  const [found] = internalReferences(value);
  assert.ok(!found, found && `${label}: "${found.match}" is a ${found.kind}; POS Docs publishes this text, so describe the role instead`);
}

function object(value, keys, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label}: unexpected or missing fields`);
}

function text(value, label) {
  assert.ok(typeof value === 'string' && value.length > 0 && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value), `${label}: required single-line text without control characters`);
  // Same limit and message as POS Platform, which rejects longer text before it is published.
  assert.ok(value.length <= 2000, `${label}: at most 2000 characters, the limit that POS Docs publishes`);
  assertPublishable(value, label);
}

function date(value, label) {
  assert.ok(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), `${label}: expected ISO date`);
  const parsed = new Date(`${value}T00:00:00Z`);
  assert.ok(!Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value, `${label}: invalid date`);
}

function list(value, label, { nonempty = false } = {}) {
  assert.ok(Array.isArray(value) && (!nonempty || value.length > 0), `${label}: expected ${nonempty ? 'nonempty ' : ''}list`);
  assert.equal(new Set(value).size, value.length, `${label}: duplicate entries`);
  return value;
}

/** A repository-relative POSIX path, optionally with a `#fragment`; returns the path without it. */
function repositoryPath(value, label, { fragment = false } = {}) {
  text(value, label);
  const [file, anchor, ...rest] = value.split('#');
  assert.ok(rest.length === 0 && (anchor === undefined || (fragment && /^[\w.-]+$/.test(anchor))) && file.split('/').every(part => segment.test(part)), `${label}: expected a relative repository path${fragment ? ', optionally with #fragment' : ''}`);
  return file;
}

/** Identifiers in the first column of an audit CSV, with quoted fields as in RFC 4180. */
export function csvIds(content, label) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = String(content).replace(/^﻿/, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      rows.push([...row, field]);
      row = [];
      field = '';
    } else field += char;
  }
  assert.ok(!quoted, `${label}: unterminated quoted field`);
  if (field !== '' || row.length > 0) rows.push([...row, field]);
  const [header, ...records] = rows.filter(cells => cells.some(cell => cell !== ''));
  assert.equal(header?.[0], 'id', `${label}: expected id as the first column`);
  const ids = records.map(cells => cells[0]);
  assert.equal(new Set(ids).size, ids.length, `${label}: duplicate identifiers`);
  return new Set(ids);
}

/** Same serialization rule as the other reviewed product registries, independent of JSON whitespace. */
export function questionsContentHash(content) {
  return createHash('sha256').update(JSON.stringify(content), 'utf8').digest('hex');
}

/** Versioned files of the product repository; never the private evidence kept in tmp/. */
function sourceList(value, label, sourceExists) {
  for (const [position, source] of list(value, label).entries()) {
    const file = repositoryPath(source, `${label}[${position}]`, { fragment: true });
    assert.ok(!file.startsWith('tmp/'), `${label}[${position}]: tmp/ holds unversioned private evidence; cite a versioned file`);
    if (sourceExists) assert.ok(sourceExists(file), `${label}[${position}]: ${file} is not a repository file`);
  }
}

/** A public host: not localhost and not an IP literal, as in POS Platform. */
const publicHost = hostname => {
  // A fully qualified name may end with a dot that URL parsing keeps: `localhost.` is still localhost.
  const host = hostname.replace(/\.$/, '');
  return host !== 'localhost' && !host.endsWith('.localhost') && !host.startsWith('[') && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
};

/** A public HTTPS link `{label, url}`; returns its host. */
function reference(value, label) {
  object(value, ['label', 'url'], label);
  text(value.label, `${label}.label`);
  text(value.url, `${label}.url`);
  let url = null;
  try {
    url = new URL(value.url);
  } catch {
    // Reported below with the same message as any other URL that is not public HTTPS.
  }
  // URL parsing drops a default port, so an explicit `:443` is detected in the written authority.
  const authority = value.url.replace(/^https:\/\//i, '').split(/[/?#]/)[0];
  assert.ok(url && url.protocol === 'https:' && url.hostname && publicHost(url.hostname) && !url.username && !url.password && !authority.includes(':'), `${label}.url: expected a public HTTPS URL without credentials or port`);
  return url.hostname;
}

/**
 * The agent's recommendation for a rule, as in POS Platform: the rule, where it applies, why, its
 * grounds, the agent that generated it and when. It guides the decision and nobody approves it.
 */
function validateRecommendation(item, sourceExists) {
  const { id, recommendation } = item;
  if (recommendation === null) return;
  const label = `${id}.recommendation`;
  assert.notEqual(item.kind, 'fact', `${id}: a fact is answered with evidence; only a rule carries a recommendation`);
  object(recommendation, recommendationFields, label);
  text(recommendation.answer, `${label}.answer`);
  assert.ok(scopes.includes(recommendation.scope), `${label}.scope: expected core, country, legal_entity, branch or register`);
  if (recommendation.scope === 'core') assert.equal(recommendation.default, null, `${label}.default: a core rule is the same in every country and has no default`);
  else {
    assert.notEqual(recommendation.default, null, `${label}.default: a configurable rule states its recommended default`);
    text(recommendation.default, `${label}.default`);
  }
  text(recommendation.rationale, `${label}.rationale`);
  for (const basis of list(recommendation.basis, `${label}.basis`, { nonempty: true })) assert.ok(bases.has(basis), `${label}.basis: unsupported basis ${basis}; expected ${[...bases].join(', ')}`);
  assert.ok(Array.isArray(recommendation.references), `${label}.references: expected list`);
  const hosts = recommendation.references.map((value, position) => reference(value, `${label}.references[${position}]`));
  const urls = recommendation.references.map(value => value.url);
  assert.equal(new Set(urls).size, urls.length, `${label}.references: duplicate URL`);
  sourceList(recommendation.sources, `${label}.sources`, sourceExists);
  if (recommendation.basis.includes('regulation')) assert.ok(hosts.some(official), `${label}.references: a recommendation grounded in a regulation cites an official source (${officialHosts.join(', ')})`);
  if (recommendation.basis.includes('architecture')) assert.ok(recommendation.sources.length + recommendation.references.length > 0, `${label}: a recommendation grounded in the architecture cites the spec, ADR or proposal it follows`);
  text(recommendation.agent, `${label}.agent`);
  date(recommendation.proposedOn, `${label}.proposedOn`);
  assert.ok(recommendation.proposedOn <= item.reviewedOn, `${label}: proposed after the item review; review the item again`);
}

/**
 * The final decision of the business, which an agent records from the business decision document.
 * The document is cited by name and date and is neither uploaded nor linked. The outcome says whether
 * the decision adopts, adapts or rejects the recommendation, and is null when there was none to weigh.
 */
function validateDecision(item) {
  const { id, decision, recommendation } = item;
  if (decision === null) return;
  const label = `${id}.decision`;
  object(decision, decisionFields, label);
  text(decision.answer, `${label}.answer`);
  text(decision.decidedBy, `${label}.decidedBy`);
  date(decision.decidedOn, `${label}.decidedOn`);
  assert.ok(decision.decidedOn <= item.reviewedOn, `${label}: decided after the item review; review the item again`);
  text(decision.source, `${label}.source`);
  assert.ok(!decision.source.includes('://'), `${label}.source: cite the decision document by name and date; it is not linked`);
  // As in POS Platform: a decision says what it did with the recommendation it could weigh; one taken
  // before the recommendation was proposed, or without one, has no outcome.
  if (recommendation === null) assert.equal(decision.outcome, null, `${label}.outcome: null when there was no recommendation`);
  else if (decision.decidedOn < recommendation.proposedOn) assert.equal(decision.outcome, null, `${label}: decided before its recommendation was proposed`);
  else assert.ok(outcomes.includes(decision.outcome), `${label}.outcome: expected adopted, adapted or rejected`);
}

/**
 * The rules of POS Platform's validator (tools/check-business-questions.mjs) for schema 4, with the
 * same messages. The import passes the product context: backlog packages, follow-ups, audit registers
 * and versioned files at the imported revision. The published snapshot is checked again without that
 * context, against the POS Docs roadmap.
 */
export function validateQuestionsContent(content, { workPackageIds, workPackageSource = 'the POS Docs roadmap', followUpIds = null, sourceExists = null, readAudit = null }) {
  assert.ok(content && typeof content === 'object' && !Array.isArray(content), 'questions: expected object');
  // The version first, so that importing a cut of an older schema says so instead of listing its fields.
  assert.equal(content.schemaVersion, schemaVersion, `questions: unsupported schema version; expected ${schemaVersion}`);
  object(content, contentFields, 'questions');
  date(content.reviewedOn, 'questions.reviewedOn');
  const roles = validateRoles(content.roles);
  const audit = repositoryPath(content.audit, 'questions.audit');
  const registers = readAudit ? readAudit(audit) : null;
  const packages = new Set(workPackageIds);
  const followUps = followUpIds ? new Set(followUpIds) : null;
  assert.ok(Array.isArray(content.items), 'questions.items: expected array');
  let previous = null;
  for (const [index, item] of content.items.entries()) {
    object(item, itemFields, `questions.items[${index}]`);
    assert.ok(typeof item.id === 'string' && questionId.test(item.id), `questions.items[${index}].id: expected Q-NN`);
    const { id } = item;
    if (previous) {
      assert.notEqual(id, previous.id, `${id}: duplicate question ID`);
      assert.ok(Number(id.slice(2)) > Number(previous.id.slice(2)), `${id}: out of order after ${previous.id}`);
    }
    previous = item;
    for (const key of ['topic', 'question', 'currentAnswer', 'decider']) text(item[key], `${id}.${key}`);
    validateRoleAssignment(item, roles);
    assert.ok(kinds.includes(item.kind), `${id}.kind: expected fact or rule`);
    assert.ok(states.includes(item.state), `${id}.state: expected open, answered or decided`);
    for (const source of list(item.answerSources, `${id}.answerSources`, { nonempty: true })) {
      assert.ok(answerSources.has(source), `${id}.answerSources: unsupported source ${source}; expected ${[...answerSources].join(', ')}`);
    }
    assert.ok(priorities.includes(item.priority), `${id}.priority: expected P1, P2 or P3`);
    assert.ok(Array.isArray(item.workPackages) && item.workPackages.length > 0, `${id}.workPackages: expected nonempty package list`);
    for (const pkg of list(item.workPackages, `${id}.workPackages`)) assert.ok(packages.has(pkg), `${id}.workPackages: unknown package ${pkg} in ${workPackageSource}`);
    assert.ok(item.followUp === null || (typeof item.followUp === 'string' && /^FOLLOWUP-\d{3}$/.test(item.followUp) && (!followUps || followUps.has(item.followUp))), `${id}.followUp: expected null or a follow-up in delivery/follow-ups.json`);
    assert.ok(item.owner === null || (typeof item.owner === 'string' && login.test(item.owner)), `${id}.owner: expected GitHub login or null; do not infer an owner`);
    for (const reference of list(item.auditRefs, `${id}.auditRefs`)) {
      assert.ok(typeof reference === 'string' && auditRef.test(reference), `${id}.auditRefs: expected C-NN, P-NN, R-NN, S-NN or H-NN, got ${JSON.stringify(reference)}`);
      if (registers && reference.startsWith('C-')) assert.ok(registers.claims.has(reference), `${id}.auditRefs: ${reference} is not in ${audit}/afirmaciones.csv`);
      if (registers && reference.startsWith('P-')) assert.ok(registers.parity.has(reference), `${id}.auditRefs: ${reference} is not in ${audit}/paridad.csv`);
    }
    for (const reference of list(item.parityRefs, `${id}.parityRefs`)) {
      assert.ok(typeof reference === 'string' && /^P-\d{2,}$/.test(reference), `${id}.parityRefs: expected P-NN, got ${JSON.stringify(reference)}`);
      if (registers) assert.ok(registers.parity.has(reference), `${id}.parityRefs: ${reference} is not in ${audit}/paridad.csv`);
    }
    sourceList(item.sources, `${id}.sources`, sourceExists);
    if (item.state === 'answered') assert.equal(item.kind, 'fact', `${id}: an answered record must be a fact; rules need a decision`);
    // A rule is decided if and only if it declares its decision; a fact carries neither.
    if (item.state === 'decided') {
      assert.notEqual(item.kind, 'fact', `${id}: a fact is answered with evidence; only a rule is decided`);
      assert.notEqual(item.decision, null, `${id}: a decided record must declare its decision`);
    } else assert.equal(item.decision, null, `${id}: only a decided record declares a decision`);
    date(item.reviewedOn, `${id}.reviewedOn`);
    assert.ok(item.reviewedOn <= content.reviewedOn, `${id}: reviewed after registry review`);
    validateRecommendation(item, sourceExists);
    validateDecision(item);
  }
  validateMerged(content);
  return content;
}

/** The closed catalog of roles of schema 4; returns its keys. */
function validateRoles(roles) {
  assert.ok(Array.isArray(roles) && roles.length > 0, 'questions.roles: expected nonempty list');
  const keys = new Set();
  const names = new Set();
  for (const [index, role] of roles.entries()) {
    const label = `questions.roles[${index}]`;
    object(role, roleFields, label);
    assert.ok(typeof role.key === 'string' && roleKey.test(role.key), `${label}.key: expected a lowercase key such as tesoreria`);
    text(role.name, `${label}.name`);
    text(role.responsibility, `${label}.responsibility`);
    assert.ok(!keys.has(role.key), `${label}.key: duplicate role ${role.key}`);
    assert.ok(!names.has(role.name), `${label}.name: duplicate role name ${role.name}`);
    keys.add(role.key);
    names.add(role.name);
  }
  return keys;
}

/** In schema 4 the deciding role and the roles consulted come from the catalog, without repeating one. */
function validateRoleAssignment(item, roles) {
  const { id } = item;
  assert.ok(roles.has(item.decider), `${id}.decider: unknown role ${item.decider}; declare it in questions.roles`);
  for (const role of list(item.consulted, `${id}.consulted`)) {
    assert.ok(roles.has(role), `${id}.consulted: unknown role ${role}; declare it in questions.roles`);
    assert.notEqual(role, item.decider, `${id}.consulted: ${role} already decides the question`);
  }
}

/**
 * A question merged into another keeps its identifier, its original text and why it was merged, so its
 * links still resolve. It is decided in the surviving question, and an identifier is never reused.
 */
function validateMerged(content) {
  assert.ok(Array.isArray(content.merged), 'questions.merged: expected list');
  const live = new Map(content.items.map(item => [item.id, item]));
  let previous = null;
  for (const [index, entry] of content.merged.entries()) {
    object(entry, mergedFields, `questions.merged[${index}]`);
    assert.ok(typeof entry.id === 'string' && questionId.test(entry.id), `questions.merged[${index}].id: expected Q-NN`);
    const { id } = entry;
    if (previous) assert.ok(Number(id.slice(2)) > Number(previous.slice(2)), `${id}: merged question out of order after ${previous}`);
    previous = id;
    assert.ok(!live.has(id), `${id}: listed as a question and as merged; an identifier is never reused`);
    text(entry.question, `${id}.question`);
    text(entry.reason, `${id}.reason`);
    const survivor = live.get(entry.into);
    assert.ok(survivor, `${id}.into: expected a question of the register, got ${JSON.stringify(entry.into)}`);
    date(entry.mergedOn, `${id}.mergedOn`);
    assert.ok(entry.mergedOn <= content.reviewedOn, `${id}: merged after registry review`);
    assert.ok(survivor.reviewedOn >= entry.mergedOn, `${id}: ${entry.into} absorbed it on ${entry.mergedOn}; review ${entry.into} again`);
  }
}

/**
 * Whether the agent recommended the rule. A recorded recommendation stays visible after the decision,
 * as what it adopted, adapted or rejected. Without one, only an open rule lacks it: a fact is answered
 * with evidence, and a decided rule has nothing left to recommend.
 */
function recommendationStatus(item) {
  if (item.recommendation) return 'present';
  return item.kind === 'fact' || item.state === 'decided' ? 'not_applicable' : 'none';
}

/**
 * What each role still has to answer, split by what is asked of it. `decide` counts the open rules it
 * decides, also by priority; `data` counts the open facts whose data it holds, because it confirms the
 * answer (`decider`) or is consulted for it (`consulted`). So a fact is on the row of every role that
 * holds its data, while a rule is only on the row of the role that decides it.
 *
 * Roles come first by their P1 decisions, then by more decisions, then by more data, then by name. A
 * role that is only consulted on rules is not listed, and nothing is assigned here: the register names
 * roles from a catalog that the business has yet to confirm (FOLLOWUP-017).
 */
function agenda(items, roles) {
  const open = items.filter(item => item.state === 'open');
  return roles.map(({ key, name, responsibility }) => {
    const decide = open.filter(item => item.kind === 'rule' && item.decider === key);
    const data = open.filter(item => item.kind === 'fact' && (item.decider === key || item.consulted.includes(key)));
    return { key, name, responsibility, decide: decide.length, priorities: Object.fromEntries(priorities.map(priority => [priority, decide.filter(item => item.priority === priority).length])), data: data.length };
  }).filter(role => role.decide + role.data > 0).sort((a, b) => b.priorities.P1 - a.priorities.P1 || b.decide - a.decide || b.data - a.data || a.name.localeCompare(b.name, 'es'));
}

/**
 * Offline view of the register: each question belongs to the earliest roadmap phase of its packages
 * and is ordered by phase, priority and identifier. Nothing is decided, assigned or answered here.
 */
export function deriveQuestions(snapshot, progress, followUp = null) {
  object(snapshot, ['schemaVersion', 'source', 'integration', 'content'], 'Questions snapshot');
  assert.equal(snapshot.schemaVersion, 1, 'Unsupported questions snapshot schema');
  object(snapshot.source, ['repository', 'revision', 'path', 'sha256'], 'Questions source');
  assert.equal(snapshot.source.repository, productRepository, 'Questions require the corporate product repository');
  assert.equal(snapshot.source.path, questionsSourcePath, 'Unexpected questions source path');
  assert.match(snapshot.source.revision, /^[a-f0-9]{40}$/, 'Questions source requires an immutable revision');
  assert.match(snapshot.source.sha256, /^[a-f0-9]{64}$/, 'Questions source requires a content hash');
  assert.equal(snapshot.source.sha256, questionsContentHash(snapshot.content), 'Questions content hash mismatch');
  object(snapshot.integration, ['reference', 'included'], 'Questions integration');
  assert.equal(snapshot.integration.reference, 'main', 'Questions integration must refer to main');
  assert.equal(typeof snapshot.integration.included, 'boolean', 'Questions integration must state whether main contains the revision');
  assert.ok(Array.isArray(progress?.workPackages) && Array.isArray(progress?.phases), 'Questions require the roadmap projection of the project progress');
  const works = new Map(progress.workPackages.map(work => [work.id, work]));
  const phaseOrder = new Map(progress.phases.map((phase, index) => [phase.id, index]));
  const { content } = snapshot;
  validateQuestionsContent(content, { workPackageIds: works.keys() });
  const actions = new Map((followUp?.items || []).map(action => [action.id, action]));
  const roles = new Map(content.roles.map(role => [role.key, role]));
  const items = content.items.map(item => {
    const packages = item.workPackages.map(id => works.get(id));
    const phases = [...new Set(packages.map(work => work.phase))].sort((a, b) => phaseOrder.get(a) - phaseOrder.get(b));
    const phase = progress.phases[phaseOrder.get(phases[0])];
    return { ...item, deciderName: roles.get(item.decider).name, consultedNames: item.consulted.map(key => roles.get(key).name), recommendationStatus: recommendationStatus(item), packages, phases, phase: phase.id, phaseTitle: phase.title, phaseHref: phase.href, followUpAction: item.followUp ? actions.get(item.followUp) || null : null };
  }).sort((a, b) => phaseOrder.get(a.phase) - phaseOrder.get(b.phase) || priorities.indexOf(a.priority) - priorities.indexOf(b.priority) || Number(a.id.slice(2)) - Number(b.id.slice(2)));
  const byId = new Map(items.map(item => [item.id, item]));
  const merged = content.merged.map(entry => ({ ...entry, intoQuestion: byId.get(entry.into).question }));
  const groups = progress.phases.map(phase => ({ id: phase.id, title: phase.title, href: phase.href, items: items.filter(item => item.phase === phase.id) })).filter(group => group.items.length);
  return {
    source: snapshot.source,
    integration: snapshot.integration,
    reviewedOn: snapshot.content.reviewedOn,
    audit: snapshot.content.audit,
    items,
    groups,
    merged,
    phases: progress.phases.filter(phase => items.some(item => item.phases.includes(phase.id))),
    // The roles that decide some question, for the filter; a role only consulted does not decide.
    deciders: [...new Set(items.map(item => item.decider))].map(key => roles.get(key)).map(({ key, name }) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    // The roles that take part in some question, deciding it or consulted for it, for the role filter.
    participants: [...new Set(items.flatMap(item => [item.decider, ...item.consulted]))].map(key => roles.get(key)).map(({ key, name }) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    agenda: agenda(items, content.roles),
    scopes: scopes.filter(scope => items.some(item => item.recommendation?.scope === scope)),
    counts: {
      total: items.length,
      ...Object.fromEntries(states.map(state => [state, items.filter(item => item.state === state).length])),
      // The rules still open: a fact awaits evidence, not a decision.
      pendingDecision: items.filter(item => item.kind === 'rule' && item.state === 'open').length,
      unassigned: items.filter(item => item.owner === null).length,
      merged: merged.length,
      recommended: items.filter(item => item.recommendation !== null).length,
      unrecommended: items.filter(item => item.recommendationStatus === 'none').length,
      ...Object.fromEntries(outcomes.map(outcome => [outcome, items.filter(item => item.decision?.outcome === outcome).length])),
    },
  };
}

export function loadQuestions(root, progress, followUp = null) {
  return deriveQuestions(JSON.parse(fs.readFileSync(path.join(root, 'portal/data/project-questions.json'), 'utf8')), progress, followUp);
}
