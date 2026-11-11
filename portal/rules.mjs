import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { productRepository } from './follow-up.mjs';
import { internalReferences } from './questions.mjs';

export const rulesSourcePath = 'delivery/business-rules.json';
export const rulesDataPath = 'portal/data/project-rules.json';
export const decisionStates = { pendiente: 'Pendiente', aceptada: 'Aceptada', 'con-observacion': 'Con observación' };
export const verificationStates = { CONFIRMADO: 'Confirmado', 'PARCIALMENTE CONFIRMADO': 'Parcialmente confirmado', REFUTADO: 'Refutado', 'NO VERIFICADO': 'No verificado', BLOQUEADO: 'Bloqueado' };
export const evidenceStates = { si: 'Sí', parcial: 'Parcial', no: 'No', 'no-verificado': 'No verificado' };
export const ruleKinds = { capacidad: 'Capacidad', parametro: 'Parámetro', defecto: 'Defecto del legacy' };
export const ruleTypes = { validacion: 'Validación', operacion: 'Operación', negocio: 'Negocio', parametro: 'Parámetro', integracion: 'Integración', seguridad: 'Seguridad' };
export const ruleLayers = { backend: 'Backend', frontend: 'Frontend', ambos: 'Backend y frontend', 'base-de-datos': 'Base de datos' };
export const criticalities = { alta: 'Alta', media: 'Media', baja: 'Baja' };
export const coverages = { cubierta: 'Cubierta', 'cubierta-con-cambios': 'Cubierta con cambios', parcial: 'Parcial', 'no-considerada': 'No considerada', 'defecto-legacy': 'Defecto legacy' };
export const withoutPhase = 'sin-fase';
const origins = ['catalogo', 'descubierta'];
// Same rules as tools/check-business-rules.mjs in POS Platform.
const login = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const segment = /^(?!\.{1,2}$)[\w.@-]+$/;
const revision = /^[a-f0-9]{7,40}$/;
const lineRanges = /^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/;
const acceptanceEvidence = /^https:\/\/github\.com\/developer-implementos\/pos-platform\/(?:issues|pull)\/[1-9]\d*(?:#issuecomment-[1-9]\d*)?$/;
const secretPatterns = [
  ['Basic credential', /\bBasic\s+(?!<)[A-Za-z0-9+/]{8,}={0,2}/],
  ['quoted secret', /\b(?:password|passwd|secret|token|api[_-]?key|app[_-]?key)\w*\s*[:=]\s*['"](?!<)[^'"]{4,}['"]/i],
  ['environment secret', /\b[A-Z][A-Z\d_]*(?:PASSWORD|SECRET|TOKEN|API_KEY|APP_KEY)\s*=\s*(?!<)[^\s,;]{4,}/],
  ['encoded secret', /(?<![\w/.-])(?=[A-Za-z0-9+]*\d)(?=[A-Za-z0-9+]*[A-Z])(?=[A-Za-z0-9+]*[a-z])[A-Za-z0-9+]{24,}={0,2}(?![\w/.-])/],
  ['hexadecimal key', /(?<![\w/.-])[a-f0-9]{32,}(?![\w/.-])/],
  ['national identifier', /\b(?!66\.?666\.?666-6\b)\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/],
];
const topFields = ['schemaVersion', 'reviewedOn', 'audit', 'areas', 'legacyRevisions', 'posPlatformRevision', 'sourceArtifacts', 'contradictions', 'rules'];
const ruleFields = ['id', 'area', 'title', 'origin', 'sourceArtifacts', 'type', 'layer', 'criticality', 'kind', 'workPackage', 'legacy', 'businessQuestion', 'artifacts', 'posPlatform', 'decision', 'target', 'links', 'reviewedOn'];
const artifactFields = { catalog: ['coverage', 'gap', 'posPlatformNote'], closure: ['action', 'targetPhase', 'scope', 'priority', 'acceptanceCriterion'], answers: ['status', 'plan', 'current'], management: ['proposal', 'decider'] };

function object(value, keys, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label}: unexpected or missing fields`);
}

function text(value, label) {
  assert.ok(typeof value === 'string' && value.length > 0 && value.length <= 2000 && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value), `${label}: required single-line text without control characters`);
  const [found] = internalReferences(value);
  assert.ok(!found, found && `${label}: "${found.match}" is a ${found.kind}; POS Docs publishes this text, so describe the role instead`);
  for (const [kind, pattern] of secretPatterns) {
    const match = value.match(pattern);
    assert.ok(!match, match && `${label}: "${match[0].slice(0, 12)}…" looks like a ${kind}; it cannot be published`);
  }
}

const optionalText = (value, label) => value === null || text(value, label);

function date(value, label) {
  assert.ok(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), `${label}: expected ISO date`);
  const parsed = new Date(`${value}T00:00:00Z`);
  assert.ok(!Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value, `${label}: invalid date`);
}

function list(value, label) {
  assert.ok(Array.isArray(value), `${label}: expected list`);
  assert.equal(new Set(value).size, value.length, `${label}: duplicate entries`);
  return value;
}

function oneOf(value, values, label) {
  assert.ok(values.includes(value), `${label}: expected ${values.join(', ')}`);
}

function repositoryPath(value, label, { fragment = false } = {}) {
  text(value, label);
  const [file, anchor, ...rest] = value.split('#');
  assert.ok(rest.length === 0 && (anchor === undefined || (fragment && /^[\w.-]+$/.test(anchor))) && file.split('/').every(part => segment.test(part)), `${label}: expected a relative repository path${fragment ? ', optionally with #fragment' : ''}`);
  assert.ok(!file.startsWith('tmp/'), `${label}: tmp/ holds unversioned private evidence`);
  return file;
}

/** Same serialization rule as the other reviewed product registries, independent of JSON whitespace. */
export function rulesContentHash(content) {
  return createHash('sha256').update(JSON.stringify(content), 'utf8').digest('hex');
}

/**
 * The rules of POS Platform's validator (tools/check-business-rules.mjs). The import passes the
 * product context; the published snapshot is checked again with the POS Docs roadmap and questions.
 */
export function validateRulesContent(content, { workPackageIds, workPackageSource = 'the POS Docs roadmap', questionStates = null, followUpIds = null, sourceExists = null, readAudit = null }) {
  object(content, topFields, 'rules');
  assert.equal(content.schemaVersion, 1, 'rules: unsupported schema version');
  date(content.reviewedOn, 'rules.reviewedOn');
  const audit = repositoryPath(content.audit, 'rules.audit');
  const registers = readAudit ? readAudit(audit) : null;
  const areas = Object.keys(content.areas || {});
  assert.ok(areas.length > 0, 'rules.areas: expected at least one area');
  for (const code of areas) {
    assert.match(code, /^[A-Z]{3}$/, `rules.areas: ${code} must be three capital letters`);
    text(content.areas[code], `rules.areas.${code}`);
  }
  const repositories = new Set(Object.keys(content.legacyRevisions || {}));
  for (const repository of repositories) assert.match(content.legacyRevisions[repository], revision, `legacyRevisions.${repository}: expected a commit`);
  assert.match(content.posPlatformRevision, revision, 'posPlatformRevision: expected a commit');
  const artifacts = new Set();
  for (const [index, artifact] of list(content.sourceArtifacts, 'sourceArtifacts').entries()) {
    object(artifact, ['id', 'title', 'date', 'use'], `sourceArtifacts[${index}]`);
    assert.match(artifact.id, /^A\d+$/, `sourceArtifacts[${index}].id: expected A<number>`);
    artifacts.add(artifact.id);
    text(artifact.title, `${artifact.id}.title`);
    date(artifact.date, `${artifact.id}.date`);
    text(artifact.use, `${artifact.id}.use`);
  }
  const packages = new Set(workPackageIds);
  const followUps = followUpIds ? new Set(followUpIds) : null;
  assert.ok(Array.isArray(content.rules) && content.rules.length > 0, 'rules.rules: expected a nonempty list');
  const ids = new Set(content.rules.map(rule => rule?.id));
  const rank = id => areas.indexOf(id.slice(0, 3)) * 1000 + Number(id.slice(4));
  let previous = null;
  for (const [index, rule] of content.rules.entries()) {
    object(rule, ruleFields, `rules[${index}]`);
    assert.ok(typeof rule.id === 'string' && /^[A-Z]{3}-\d{3}$/.test(rule.id), `rules[${index}].id: expected AAA-NNN`);
    const { id } = rule;
    assert.equal(rule.area, id.slice(0, 3), `${id}.area: must match the identifier prefix`);
    assert.ok(areas.includes(rule.area), `${id}.area: unknown area`);
    if (previous) assert.ok(rank(id) > rank(previous), `${id}: duplicate or out of order after ${previous}`);
    previous = id;
    text(rule.title, `${id}.title`);
    oneOf(rule.origin, origins, `${id}.origin`);
    for (const artifact of list(rule.sourceArtifacts, `${id}.sourceArtifacts`)) assert.ok(artifacts.has(artifact), `${id}.sourceArtifacts: unknown artifact ${artifact}`);
    oneOf(rule.type, Object.keys(ruleTypes), `${id}.type`);
    oneOf(rule.layer, Object.keys(ruleLayers), `${id}.layer`);
    oneOf(rule.criticality, Object.keys(criticalities), `${id}.criticality`);
    oneOf(rule.kind, Object.keys(ruleKinds), `${id}.kind`);
    assert.ok(rule.workPackage === null || packages.has(rule.workPackage), `${id}.workPackage: unknown package ${rule.workPackage} in ${workPackageSource}`);
    object(rule.legacy, ['behavior', 'condition', 'observations', 'verification', 'note', 'evidence'], `${id}.legacy`);
    text(rule.legacy.behavior, `${id}.legacy.behavior`);
    for (const key of ['condition', 'observations', 'note']) optionalText(rule.legacy[key], `${id}.legacy.${key}`);
    oneOf(rule.legacy.verification, Object.keys(verificationStates), `${id}.legacy.verification`);
    for (const [position, evidence] of list(rule.legacy.evidence, `${id}.legacy.evidence`).entries()) {
      object(evidence, ['repository', 'path', 'lines'], `${id}.legacy.evidence[${position}]`);
      assert.ok(repositories.has(evidence.repository), `${id}.legacy.evidence[${position}]: ${evidence.repository} has no revision`);
      repositoryPath(evidence.path, `${id}.legacy.evidence[${position}].path`);
      assert.ok(evidence.lines === null || lineRanges.test(evidence.lines), `${id}.legacy.evidence[${position}].lines: expected null or 10-20,30`);
    }
    if (['CONFIRMADO', 'PARCIALMENTE CONFIRMADO', 'REFUTADO'].includes(rule.legacy.verification)) assert.ok(rule.legacy.evidence.length > 0, `${id}: ${rule.legacy.verification} requires legacy evidence`);
    optionalText(rule.businessQuestion, `${id}.businessQuestion`);
    object(rule.artifacts, Object.keys(artifactFields), `${id}.artifacts`);
    for (const [key, fields] of Object.entries(artifactFields)) {
      const value = rule.artifacts[key];
      if (value === null) continue;
      object(value, fields, `${id}.artifacts.${key}`);
      for (const field of fields) {
        if (key === 'catalog' && field === 'coverage') assert.ok(value.coverage === null || value.coverage in coverages, `${id}.artifacts.catalog.coverage: unknown coverage`);
        else optionalText(value[field], `${id}.artifacts.${key}.${field}`);
      }
    }
    object(rule.posPlatform, ['specified', 'implemented', 'tested', 'note'], `${id}.posPlatform`);
    for (const key of ['specified', 'implemented', 'tested']) {
      const value = rule.posPlatform[key];
      object(value, ['state', 'refs'], `${id}.posPlatform.${key}`);
      oneOf(value.state, Object.keys(evidenceStates), `${id}.posPlatform.${key}.state`);
      for (const [position, reference] of list(value.refs, `${id}.posPlatform.${key}.refs`).entries()) {
        const file = repositoryPath(reference, `${id}.posPlatform.${key}.refs[${position}]`, { fragment: true });
        if (sourceExists) assert.ok(sourceExists(file), `${id}.posPlatform.${key}.refs[${position}]: ${file} is not a repository file`);
      }
      if (['si', 'parcial'].includes(value.state)) assert.ok(value.refs.length > 0, `${id}.posPlatform.${key}: ${value.state} requires the files that show it`);
    }
    optionalText(rule.posPlatform.note, `${id}.posPlatform.note`);
    const { decision } = rule;
    object(decision, ['state', 'decider', 'acceptedBy', 'acceptedOn', 'evidence', 'observations'], `${id}.decision`);
    oneOf(decision.state, Object.keys(decisionStates), `${id}.decision.state`);
    text(decision.decider, `${id}.decision.decider`);
    for (const [position, observation] of list(decision.observations, `${id}.decision.observations`).entries()) {
      object(observation, ['author', 'date', 'text'], `${id}.decision.observations[${position}]`);
      assert.ok(typeof observation.author === 'string' && login.test(observation.author), `${id}.decision.observations[${position}].author: expected a GitHub login`);
      date(observation.date, `${id}.decision.observations[${position}].date`);
      text(observation.text, `${id}.decision.observations[${position}].text`);
    }
    optionalText(rule.target, `${id}.target`);
    if (decision.state === 'aceptada') {
      assert.ok(typeof decision.acceptedBy === 'string' && login.test(decision.acceptedBy), `${id}.decision.acceptedBy: expected the GitHub login of the person who accepted; an agent never accepts`);
      date(decision.acceptedOn, `${id}.decision.acceptedOn`);
      assert.ok(decision.acceptedOn <= rule.reviewedOn, `${id}: accepted after the rule review`);
      if (String(decision.evidence).startsWith('https://')) assert.match(decision.evidence, acceptanceEvidence, `${id}.decision.evidence: expected an issue, PR or comment of POS Platform`);
      else assert.ok(repositoryPath(decision.evidence, `${id}.decision.evidence`).startsWith('delivery/'), `${id}.decision.evidence: a meeting record lives under delivery/`);
      assert.ok(rule.target !== null, `${id}: an accepted rule states the expected behavior in target`);
      if (questionStates) for (const question of rule.links.questions) assert.notEqual(questionStates.get(question), 'open', `${id}: accepted while ${question} is still open`);
    } else {
      assert.ok(decision.acceptedBy === null && decision.acceptedOn === null && decision.evidence === null, `${id}: only an accepted rule declares an acceptance`);
    }
    if (decision.state === 'con-observacion') assert.ok(decision.observations.length > 0, `${id}: con-observacion requires the observation and its author`);
    object(rule.links, ['questions', 'parity', 'claims', 'followUps', 'issues', 'related'], `${id}.links`);
    for (const question of list(rule.links.questions, `${id}.links.questions`)) {
      assert.match(question, /^Q-\d{2,}$/, `${id}.links.questions: expected Q-NN`);
      if (questionStates) assert.ok(questionStates.has(question), `${id}.links.questions: ${question} is not in the questions register`);
    }
    for (const reference of list(rule.links.parity, `${id}.links.parity`)) {
      assert.match(reference, /^P-\d{2,}$/, `${id}.links.parity: expected P-NN`);
      if (registers) assert.ok(registers.parity.has(reference), `${id}.links.parity: ${reference} is not in ${audit}/paridad.csv`);
    }
    for (const reference of list(rule.links.claims, `${id}.links.claims`)) {
      assert.match(reference, /^C-\d{2,}$/, `${id}.links.claims: expected C-NN`);
      if (registers) assert.ok(registers.claims.has(reference), `${id}.links.claims: ${reference} is not in ${audit}/afirmaciones.csv`);
    }
    for (const reference of list(rule.links.followUps, `${id}.links.followUps`)) {
      assert.match(reference, /^FOLLOWUP-\d{3}$/, `${id}.links.followUps: expected FOLLOWUP-NNN`);
      if (followUps) assert.ok(followUps.has(reference), `${id}.links.followUps: ${reference} is not in delivery/follow-ups.json`);
    }
    for (const issue of list(rule.links.issues, `${id}.links.issues`)) assert.ok(Number.isInteger(issue) && issue > 0, `${id}.links.issues: expected issue numbers`);
    for (const other of list(rule.links.related, `${id}.links.related`)) assert.ok(other !== id && ids.has(other), `${id}.links.related: unknown rule ${other}`);
    date(rule.reviewedOn, `${id}.reviewedOn`);
    assert.ok(rule.reviewedOn <= content.reviewedOn, `${id}: reviewed after the register review`);
  }
  let previousContradiction = 0;
  for (const [index, item] of list(content.contradictions, 'contradictions').entries()) {
    object(item, ['id', 'rules', 'state', 'resolution', 'summary'], `contradictions[${index}]`);
    assert.match(item.id, /^X-\d{2,}$/, `contradictions[${index}].id: expected X-NN`);
    assert.ok(Number(item.id.slice(2)) > previousContradiction, `${item.id}: out of order`);
    previousContradiction = Number(item.id.slice(2));
    assert.ok(list(item.rules, `${item.id}.rules`).length > 0 && item.rules.every(rule => ids.has(rule)), `${item.id}.rules: expected known rules`);
    oneOf(item.state, ['open', 'resolved'], `${item.id}.state`);
    text(item.summary, `${item.id}.summary`);
    if (item.state === 'resolved') text(item.resolution, `${item.id}.resolution`);
    else assert.equal(item.resolution, null, `${item.id}: an open contradiction has no resolution`);
  }
  return content;
}

const count = (items, select) => items.reduce((counts, item) => {
  const key = select(item);
  counts[key] = (counts[key] || 0) + 1;
  return counts;
}, {});

/**
 * Offline view of the register: each rule belongs to the phase of its package, or to a final group
 * while its phase is undecided. Nothing is accepted, assigned or verified here.
 */
export function deriveRules(snapshot, progress, questions = null) {
  object(snapshot, ['schemaVersion', 'source', 'integration', 'content'], 'Rules snapshot');
  assert.equal(snapshot.schemaVersion, 1, 'Unsupported rules snapshot schema');
  object(snapshot.source, ['repository', 'revision', 'path', 'sha256'], 'Rules source');
  assert.equal(snapshot.source.repository, productRepository, 'Rules require the corporate product repository');
  assert.equal(snapshot.source.path, rulesSourcePath, 'Unexpected rules source path');
  assert.match(snapshot.source.revision, /^[a-f0-9]{40}$/, 'Rules source requires an immutable revision');
  assert.equal(snapshot.source.sha256, rulesContentHash(snapshot.content), 'Rules content hash mismatch');
  object(snapshot.integration, ['reference', 'included'], 'Rules integration');
  assert.equal(snapshot.integration.reference, 'main', 'Rules integration must refer to main');
  assert.equal(typeof snapshot.integration.included, 'boolean', 'Rules integration must state whether main contains the revision');
  assert.ok(Array.isArray(progress?.workPackages) && Array.isArray(progress?.phases), 'Rules require the roadmap projection of the project progress');
  const works = new Map(progress.workPackages.map(work => [work.id, work]));
  const questionItems = questions ? new Map(questions.items.map(item => [item.id, item])) : null;
  validateRulesContent(snapshot.content, { workPackageIds: works.keys(), questionStates: questionItems ? new Map([...questionItems].map(([id, item]) => [id, item.state])) : null });
  const { content } = snapshot;
  const items = content.rules.map(rule => {
    const work = rule.workPackage ? works.get(rule.workPackage) : null;
    return { ...rule, work, phase: work ? work.phase : withoutPhase, questions: rule.links.questions.map(id => questionItems?.get(id) || { id, state: null, topic: null }) };
  });
  const groups = [
    ...progress.phases.map(phase => ({ id: phase.id, title: phase.title, href: phase.href, items: items.filter(item => item.phase === phase.id) })),
    { id: withoutPhase, title: 'Sin fase asignada', href: null, items: items.filter(item => item.phase === withoutPhase) },
  ].filter(group => group.items.length);
  return {
    source: snapshot.source,
    integration: snapshot.integration,
    reviewedOn: content.reviewedOn,
    audit: content.audit,
    areas: content.areas,
    legacyRevisions: content.legacyRevisions,
    posPlatformRevision: content.posPlatformRevision,
    sourceArtifacts: content.sourceArtifacts,
    contradictions: content.contradictions,
    items,
    groups,
    phases: groups.map(group => ({ id: group.id, title: group.title })),
    deciders: [...new Set(items.map(item => item.decision.decider))].sort((a, b) => a.localeCompare(b, 'es')),
    counts: {
      total: items.length,
      discovered: items.filter(item => item.origin === 'descubierta').length,
      decisions: Object.fromEntries(Object.keys(decisionStates).map(state => [state, items.filter(item => item.decision.state === state).length])),
      legacy: count(items, item => item.legacy.verification),
      implemented: count(items, item => item.posPlatform.implemented.state),
      areas: count(items, item => item.area),
      openContradictions: content.contradictions.filter(item => item.state === 'open').length,
    },
  };
}

/** The register is optional until its first import; the section explains that state. */
export function loadRules(root, progress, questions = null) {
  const location = path.join(root, rulesDataPath);
  if (!fs.existsSync(location)) return null;
  return deriveRules(JSON.parse(fs.readFileSync(location, 'utf8')), progress, questions);
}
