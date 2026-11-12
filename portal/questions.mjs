import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { productRepository } from './follow-up.mjs';

export const questionsSourcePath = 'delivery/business-questions.json';
export const questionKinds = { fact: 'Hecho', rule: 'Regla', decision: 'Decisión' };
export const questionStates = { open: 'Abierta', answered: 'Respondida', decided: 'Decidida', validated: 'Validada' };
export const answerSourceNames = { code: 'Código', data: 'Datos', configuration: 'Configuración', schema: 'Esquema', spec: 'Ficha del producto', person: 'Persona', meeting: 'Reunión' };
// Where a rule is decided or configured, from the common core to a single register.
export const recommendationScopes = { core: 'Núcleo común', country: 'Por país', legal_entity: 'Por sociedad', branch: 'Por sucursal', register: 'Por caja' };
export const recommendationBases = { practice: 'Práctica habitual', regulation: 'Norma', architecture: 'Arquitectura del producto', legacy: 'Conserva el legacy', data: 'Datos observados', meeting: 'Reuniones con los países' };
export const recommendationStatuses = { none: 'Sin recomendación', draft: 'Sin respaldo', endorsed: 'Respaldada' };
/**
 * Same official hosts as tools/check-business-questions.mjs: a recommendation grounded in a
 * regulation cites a government, tax authority, official gazette or regulator. A subdomain counts.
 */
export const officialHosts = ['gob.cl', 'sii.cl', 'bcn.cl', 'leychile.cl', 'cmfchile.cl', 'sernac.cl', 'gob.pe', 'elperuano.pe', 'gob.es', 'boe.es', 'aepd.es', 'europa.eu'];
const kinds = Object.keys(questionKinds);
const states = Object.keys(questionStates);
const answerSources = new Set(Object.keys(answerSourceNames));
const scopes = Object.keys(recommendationScopes);
const bases = new Set(Object.keys(recommendationBases));
const priorities = ['P1', 'P2', 'P3'];
// Same rules as tools/check-business-questions.mjs and the follow-up owner in POS Platform.
const login = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const auditRef = /^[CPRSH]-\d{2,}$/;
const segment = /^(?!\.{1,2}$)[\w.@-]+$/;
const official = host => officialHosts.some(domain => host === domain || host.endsWith(`.${domain}`));
const baseItemFields = ['id', 'topic', 'question', 'kind', 'state', 'currentAnswer', 'answerSources', 'auditRefs', 'parityRefs', 'sources', 'decider', 'owner', 'followUp', 'workPackages', 'priority', 'reviewedOn', 'validation'];
/*
 * Content schemas this portal reads. Schema 2 adds the team's recommendation. Schema 1 stays readable
 * only while POS Platform migrates and is removed once the published snapshot uses schema 2.
 */
const itemFieldsBySchema = new Map([[1, baseItemFields], [2, [...baseItemFields, 'recommendation']]]);
const recommendationFields = ['answer', 'scope', 'default', 'rationale', 'basis', 'references', 'sources', 'author', 'proposedOn', 'endorsement'];

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
  assert.ok(typeof value === 'string' && value.length > 0 && value.length <= 2000 && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value), `${label}: required single-line text without control characters`);
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

/**
 * What an endorsement covers, exactly as POS Platform computes it: the proposal in a fixed key order,
 * without its authorship, dates or endorsement.
 */
export function recommendationContentHash(recommendation) {
  const { answer, scope, rationale, basis, references, sources } = recommendation;
  const content = { answer, scope, default: recommendation.default, rationale, basis, references: references.map(({ label, url }) => ({ label, url })), sources };
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
  assert.ok(url && url.protocol === 'https:' && url.hostname && !url.username && !url.password && !url.port, `${label}.url: expected a public HTTPS URL without credentials or port`);
  return url.hostname;
}

function author(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  if (value.kind === 'agent') {
    object(value, ['kind', 'name'], label);
    text(value.name, `${label}.name`);
  } else if (value.kind === 'person') {
    object(value, ['kind', 'login'], label);
    assert.ok(typeof value.login === 'string' && login.test(value.login), `${label}.login: expected a GitHub login`);
  } else assert.fail(`${label}.kind: expected agent or person`);
}

/** The rules of validateRecommendation in POS Platform: a proposal never decides or validates. */
function validateRecommendation(item, sourceExists) {
  const { id, recommendation } = item;
  if (recommendation === null) return;
  const label = `${id}.recommendation`;
  assert.notEqual(item.kind, 'fact', `${id}: a fact is answered with evidence; only a rule or a decision carries a recommendation`);
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
  author(recommendation.author, `${label}.author`);
  date(recommendation.proposedOn, `${label}.proposedOn`);
  assert.ok(recommendation.proposedOn <= item.reviewedOn, `${label}: proposed after the item review; review the item again`);
  const { endorsement } = recommendation;
  if (endorsement === null) return;
  object(endorsement, ['endorsedBy', 'endorsedOn', 'contentSha256'], `${label}.endorsement`);
  assert.ok(typeof endorsement.endorsedBy === 'string' && login.test(endorsement.endorsedBy), `${label}.endorsement.endorsedBy: expected the GitHub login of the person who endorsed`);
  assert.ok(recommendation.author.kind !== 'person' || recommendation.author.login !== endorsement.endorsedBy, `${label}.endorsement: the author cannot endorse their own recommendation`);
  date(endorsement.endorsedOn, `${label}.endorsement.endorsedOn`);
  assert.ok(endorsement.endorsedOn >= recommendation.proposedOn, `${label}.endorsement: endorsed before the recommendation was proposed`);
  assert.ok(endorsement.endorsedOn <= item.reviewedOn, `${label}.endorsement: endorsed after the item review; review the item again`);
  assert.ok(typeof endorsement.contentSha256 === 'string' && /^[a-f0-9]{64}$/.test(endorsement.contentSha256), `${label}.endorsement.contentSha256: expected a lowercase SHA-256`);
  assert.equal(endorsement.contentSha256, recommendationContentHash(recommendation), `${label}.endorsement: the recommendation changed after it was endorsed; endorse it again or set endorsement to null`);
}

/**
 * The rules of POS Platform's validator (tools/check-business-questions.mjs). The import passes the
 * product context: backlog packages, follow-ups, audit registers and versioned files at the imported
 * revision. The published snapshot is checked again without that context, against the POS Docs roadmap.
 */
export function validateQuestionsContent(content, { workPackageIds, workPackageSource = 'the POS Docs roadmap', followUpIds = null, sourceExists = null, readAudit = null }) {
  object(content, ['schemaVersion', 'reviewedOn', 'audit', 'items'], 'questions');
  const itemFields = itemFieldsBySchema.get(content.schemaVersion);
  assert.ok(itemFields, `questions: unsupported schema version; expected ${[...itemFieldsBySchema.keys()].join(' or ')}`);
  date(content.reviewedOn, 'questions.reviewedOn');
  const audit = repositoryPath(content.audit, 'questions.audit');
  const registers = readAudit ? readAudit(audit) : null;
  const packages = new Set(workPackageIds);
  const followUps = followUpIds ? new Set(followUpIds) : null;
  assert.ok(Array.isArray(content.items), 'questions.items: expected array');
  let previous = null;
  for (const [index, item] of content.items.entries()) {
    object(item, itemFields, `questions.items[${index}]`);
    assert.ok(typeof item.id === 'string' && /^Q-[0-9]{2,}$/.test(item.id), `questions.items[${index}].id: expected Q-NN`);
    const { id } = item;
    if (previous) {
      assert.notEqual(id, previous.id, `${id}: duplicate question ID`);
      assert.ok(Number(id.slice(2)) > Number(previous.id.slice(2)), `${id}: out of order after ${previous.id}`);
    }
    previous = item;
    for (const key of ['topic', 'question', 'currentAnswer', 'decider']) text(item[key], `${id}.${key}`);
    assert.ok(kinds.includes(item.kind), `${id}.kind: expected fact, rule or decision`);
    assert.ok(states.includes(item.state), `${id}.state: expected open, answered, decided or validated`);
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
    if (item.state === 'decided') {
      assert.equal(item.kind, 'decision', `${id}: a decided record must be a decision`);
      assert.ok(item.sources.some(source => source.startsWith('delivery/specs/')), `${id}: a decided record must cite a source under delivery/specs/`);
    }
    date(item.reviewedOn, `${id}.reviewedOn`);
    assert.ok(item.reviewedOn <= content.reviewedOn, `${id}: reviewed after registry review`);
    if (item.state === 'validated') {
      object(item.validation, ['validatedOn', 'validatedBy', 'note'], `${id}.validation`);
      date(item.validation.validatedOn, `${id}.validation.validatedOn`);
      assert.ok(item.validation.validatedOn <= item.reviewedOn, `${id}: validated after the item review; review the item again`);
      assert.ok(typeof item.validation.validatedBy === 'string' && login.test(item.validation.validatedBy), `${id}.validation.validatedBy: expected the GitHub login of the person who validated`);
      text(item.validation.note, `${id}.validation.note`);
    } else {
      assert.equal(item.validation, null, `${id}: only a validated record declares a validation`);
    }
    if (content.schemaVersion >= 2) validateRecommendation(item, sourceExists);
  }
  return content;
}

/**
 * Whether a question shows a recommendation. A recorded one stays visible after the decision, as its
 * history. Without one, only a rule or a decision still pending lacks it: a fact is answered with
 * evidence, and a decided or validated record has nothing left to recommend.
 */
function recommendationStatus(item) {
  if (item.recommendation) return item.recommendation.endorsement ? 'endorsed' : 'draft';
  return item.kind === 'fact' || item.state === 'decided' || item.state === 'validated' ? 'not_applicable' : 'none';
}

/**
 * Offline view of the register: each question belongs to the earliest roadmap phase of its packages
 * and is ordered by phase, priority and identifier. Nothing is validated, assigned or answered here.
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
  validateQuestionsContent(snapshot.content, { workPackageIds: works.keys() });
  const actions = new Map((followUp?.items || []).map(action => [action.id, action]));
  const items = snapshot.content.items.map(item => {
    const packages = item.workPackages.map(id => works.get(id));
    const phases = [...new Set(packages.map(work => work.phase))].sort((a, b) => phaseOrder.get(a) - phaseOrder.get(b));
    const phase = progress.phases[phaseOrder.get(phases[0])];
    // Schema 1 predates recommendations: none is shown for it.
    const recommendation = item.recommendation ?? null;
    return { ...item, recommendation, recommendationStatus: recommendationStatus({ ...item, recommendation }), packages, phases, phase: phase.id, phaseTitle: phase.title, phaseHref: phase.href, followUpAction: item.followUp ? actions.get(item.followUp) || null : null };
  }).sort((a, b) => phaseOrder.get(a.phase) - phaseOrder.get(b.phase) || priorities.indexOf(a.priority) - priorities.indexOf(b.priority) || Number(a.id.slice(2)) - Number(b.id.slice(2)));
  const groups = progress.phases.map(phase => ({ id: phase.id, title: phase.title, href: phase.href, items: items.filter(item => item.phase === phase.id) })).filter(group => group.items.length);
  return {
    source: snapshot.source,
    integration: snapshot.integration,
    reviewedOn: snapshot.content.reviewedOn,
    audit: snapshot.content.audit,
    items,
    groups,
    phases: progress.phases.filter(phase => items.some(item => item.phases.includes(phase.id))),
    deciders: [...new Set(items.map(item => item.decider))].sort((a, b) => a.localeCompare(b, 'es')),
    scopes: scopes.filter(scope => items.some(item => item.recommendation?.scope === scope)),
    counts: {
      total: items.length,
      ...Object.fromEntries(states.map(state => [state, items.filter(item => item.state === state).length])),
      pendingValidation: items.filter(item => item.validation === null).length,
      unassigned: items.filter(item => item.owner === null).length,
      recommended: items.filter(item => item.recommendation !== null).length,
      endorsed: items.filter(item => item.recommendationStatus === 'endorsed').length,
      unrecommended: items.filter(item => item.recommendationStatus === 'none').length,
    },
  };
}

export function loadQuestions(root, progress, followUp = null) {
  return deriveQuestions(JSON.parse(fs.readFileSync(path.join(root, 'portal/data/project-questions.json'), 'utf8')), progress, followUp);
}
