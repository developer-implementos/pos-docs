import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { productRepository } from './follow-up.mjs';
import { internalReferences } from './questions.mjs';

export const rulesSourcePath = 'delivery/business-rules.json';
export const rulesDataPath = 'portal/data/project-rules.json';
export const decisionStates = { abierta: 'Con pregunta abierta', resuelta: 'Resuelta', 'sin-pregunta': 'Sin pregunta' };
export const disclosureNames = { public: 'Pública', internal: 'Interna' };
export const ruleTypes = { validacion: 'Validación', operacion: 'Operación', negocio: 'Negocio', parametro: 'Parámetro', integracion: 'Integración', seguridad: 'Seguridad' };
export const ruleKinds = { capacidad: 'Capacidad', parametro: 'Parámetro', defecto: 'Defecto del legacy' };
export const criticalities = { alta: 'Alta', media: 'Media', baja: 'Baja' };
export const ruleOrigins = { catalogo: 'Catálogo', descubierta: 'Descubierta en el legacy' };
export const verificationStates = { CONFIRMADO: 'Confirmado', 'PARCIALMENTE CONFIRMADO': 'Parcialmente confirmado', REFUTADO: 'Refutado', 'NO VERIFICADO': 'No verificado', BLOQUEADO: 'Bloqueado' };
export const evidenceStates = { si: 'Sí', parcial: 'Parcial', no: 'No', 'no-verificado': 'No verificado' };
export const withoutPhase = 'sin-fase';
// Register schema 2 of POS Platform, the first one that classifies its rules.
const registerSchema = 2;
const snapshotSchema = 1;
const ruleId = /^[A-Z]{3}-\d{3}$/;
const questionId = /^Q-\d{2,}$/;
const parityId = /^P-\d{2,}$/;
const followUpId = /^FOLLOWUP-\d{3,}$/;
const workPackageId = /^F\d{2}-\d{2}$/;
// Same rule as tools/check-business-rules.mjs of POS Platform: a public title must not disclose a
// missing, disabled, client-only or bypassable control.
const disclosingTitle = /\(frontend\)|sin autenticaci|no se valida|no aplicad|desactivad|credencial|contraseña inicial/i;

/*
 * The closed list of what POS Docs publishes of each rule, from the publication contract of
 * delivery/README.md in POS Platform. Anything else, such as the legacy behavior, its evidence, notes,
 * candidate questions or proposals, stays in the product.
 */
const publishedFields = {
  public: ['id', 'area', 'disclosure', 'title', 'type', 'kind', 'criticality', 'origin', 'workPackage', 'legacyVerification', 'posPlatform', 'questions', 'parity', 'followUps'],
  internal: ['id', 'area', 'disclosure', 'workPackage', 'questions'],
};
const registerFields = ['schemaVersion', 'reviewedOn', 'posPlatformRevision', 'areas', 'rules'];

function object(value, keys, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label}: unexpected or missing fields`);
}

function oneOf(value, values, label) {
  assert.ok(Object.hasOwn(values, value), `${label}: expected ${Object.keys(values).join(', ')}`);
}

function date(value, label) {
  assert.ok(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), `${label}: expected ISO date`);
  const parsed = new Date(`${value}T00:00:00Z`);
  assert.ok(!Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value, `${label}: invalid date`);
}

function identifiers(value, pattern, label) {
  assert.ok(Array.isArray(value) && value.every(item => typeof item === 'string' && pattern.test(item)), `${label}: expected identifiers like ${pattern.source}`);
  assert.equal(new Set(value).size, value.length, `${label}: duplicate entries`);
  return value;
}

function title(value, label) {
  assert.ok(typeof value === 'string' && value.length > 0 && value.length <= 2000 && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value), `${label}: required single-line text without control characters`);
  const [reference] = internalReferences(value);
  assert.ok(!reference, reference && `${label}: "${reference.match}" is a ${reference.kind}; POS Docs publishes this text, so describe the role instead`);
  const weak = value.match(disclosingTitle);
  assert.ok(!weak, weak && `${label}: "${weak[0]}" discloses a weak control; the rule must be internal`);
}

/**
 * Hash of the published projection, with the serialization of the other snapshots. The immutable
 * revision identifies the full register; this hash lets the build detect an edited projection.
 */
export function rulesContentHash(content) {
  return createHash('sha256').update(JSON.stringify(content), 'utf8').digest('hex');
}

/**
 * Builds the public projection of the product register. It reads only the fields it publishes and
 * fails closed: an unknown schema or disclosure, a security rule or defect marked public, or a
 * public title that reveals a weak control stops the import.
 */
export function projectRules(content) {
  assert.ok(content && typeof content === 'object' && !Array.isArray(content), 'rules register: expected object');
  assert.equal(content.schemaVersion, registerSchema, `rules register: unsupported schema version; expected ${registerSchema}`);
  date(content.reviewedOn, 'rules register.reviewedOn');
  assert.match(String(content.posPlatformRevision), /^[a-f0-9]{7,40}$/, 'rules register.posPlatformRevision: expected a commit');
  assert.ok(content.areas && typeof content.areas === 'object' && !Array.isArray(content.areas), 'rules register.areas: expected object');
  const areas = Object.fromEntries(Object.entries(content.areas).map(([code, name]) => {
    assert.match(code, /^[A-Z]{3}$/, `rules register.areas: ${code} must be three capital letters`);
    title(name, `rules register.areas.${code}`);
    return [code, name];
  }));
  assert.ok(Array.isArray(content.rules) && content.rules.length > 0, 'rules register.rules: expected a nonempty list');
  const rules = content.rules.map((rule, index) => {
    assert.ok(rule && typeof rule === 'object' && typeof rule.id === 'string' && ruleId.test(rule.id), `rules[${index}].id: expected AAA-NNN`);
    const { id } = rule;
    oneOf(rule.disclosure, disclosureNames, `${id}.disclosure`);
    oneOf(rule.type, ruleTypes, `${id}.type`);
    oneOf(rule.kind, ruleKinds, `${id}.kind`);
    if (rule.type === 'seguridad' || rule.kind === 'defecto') assert.equal(rule.disclosure, 'internal', `${id}: a security rule or a legacy defect is internal`);
    const links = rule.links ?? {};
    const shared = { id, area: rule.area, disclosure: rule.disclosure, workPackage: rule.workPackage, questions: [...(links.questions ?? [])] };
    if (rule.disclosure === 'internal') return shared;
    const { specified, implemented, tested } = rule.posPlatform ?? {};
    return {
      ...shared,
      title: rule.title,
      type: rule.type,
      kind: rule.kind,
      criticality: rule.criticality,
      origin: rule.origin,
      legacyVerification: rule.legacy?.verification,
      posPlatform: { specified: specified?.state, implemented: implemented?.state, tested: tested?.state },
      parity: [...(links.parity ?? [])],
      followUps: [...(links.followUps ?? [])],
    };
  });
  const register = { schemaVersion: registerSchema, reviewedOn: content.reviewedOn, posPlatformRevision: content.posPlatformRevision, areas, rules };
  validateRulesRegister(register);
  return register;
}

/**
 * Validates a published projection: exactly the fields its disclosure allows, with known values. The
 * build repeats it, so a snapshot edited after its import cannot add text that the product keeps.
 */
export function validateRulesRegister(register, { workPackageIds = null } = {}) {
  object(register, registerFields, 'Rules register');
  assert.equal(register.schemaVersion, registerSchema, `Rules register: unsupported schema version; expected ${registerSchema}`);
  date(register.reviewedOn, 'Rules register.reviewedOn');
  assert.match(String(register.posPlatformRevision), /^[a-f0-9]{7,40}$/, 'Rules register.posPlatformRevision: expected a commit');
  object(register.areas, Object.keys(register.areas ?? {}), 'Rules register.areas');
  const areas = Object.keys(register.areas);
  assert.ok(areas.length > 0, 'Rules register.areas: expected at least one area');
  for (const code of areas) {
    assert.match(code, /^[A-Z]{3}$/, `Rules register.areas: ${code} must be three capital letters`);
    title(register.areas[code], `Rules register.areas.${code}`);
  }
  const packages = workPackageIds ? new Set(workPackageIds) : null;
  assert.ok(Array.isArray(register.rules) && register.rules.length > 0, 'Rules register.rules: expected a nonempty list');
  const ids = new Set();
  for (const [index, rule] of register.rules.entries()) {
    assert.ok(rule && typeof rule === 'object' && typeof rule.id === 'string' && ruleId.test(rule.id), `rules[${index}].id: expected AAA-NNN`);
    const { id } = rule;
    assert.ok(!ids.has(id), `${id}: duplicate rule ID`);
    ids.add(id);
    oneOf(rule.disclosure, disclosureNames, `${id}.disclosure`);
    object(rule, publishedFields[rule.disclosure], `${id}: a ${rule.disclosure} rule`);
    assert.equal(rule.area, id.slice(0, 3), `${id}.area: must match the identifier prefix`);
    assert.ok(areas.includes(rule.area), `${id}.area: unknown area ${rule.area}`);
    assert.ok(rule.workPackage === null || (typeof rule.workPackage === 'string' && workPackageId.test(rule.workPackage)), `${id}.workPackage: expected null or Fxx-xx`);
    if (packages && rule.workPackage !== null) assert.ok(packages.has(rule.workPackage), `${id}.workPackage: unknown package ${rule.workPackage} in the POS Docs roadmap`);
    identifiers(rule.questions, questionId, `${id}.questions`);
    if (rule.disclosure === 'internal') continue;
    title(rule.title, `${id}.title`);
    oneOf(rule.type, ruleTypes, `${id}.type`);
    oneOf(rule.kind, ruleKinds, `${id}.kind`);
    assert.ok(rule.type !== 'seguridad' && rule.kind !== 'defecto', `${id}: a security rule or a legacy defect is internal`);
    oneOf(rule.criticality, criticalities, `${id}.criticality`);
    oneOf(rule.origin, ruleOrigins, `${id}.origin`);
    oneOf(rule.legacyVerification, verificationStates, `${id}.legacyVerification`);
    object(rule.posPlatform, ['specified', 'implemented', 'tested'], `${id}.posPlatform`);
    for (const [key, state] of Object.entries(rule.posPlatform)) oneOf(state, evidenceStates, `${id}.posPlatform.${key}`);
    identifiers(rule.parity, parityId, `${id}.parity`);
    identifiers(rule.followUps, followUpId, `${id}.followUps`);
  }
  return register;
}

/**
 * Decision state of a rule, as POS Platform derives it: `resuelta` once every rule or decision
 * question it links is decided or validated. A fact question gives context but never decides.
 */
export function decisionOf(rule, questions) {
  const deciding = rule.questions.map(id => {
    const question = questions.get(id);
    assert.ok(question, `${rule.id}: ${id} is not in the published questions`);
    return question;
  }).filter(question => question.kind !== 'fact');
  if (deciding.length === 0) return 'sin-pregunta';
  return deciding.every(question => ['decided', 'validated'].includes(question.state)) ? 'resuelta' : 'abierta';
}

/**
 * Offline view of the projection. Each rule belongs to the phase of its package; the decision comes
 * from the questions snapshot, which must come from the same product revision.
 */
export function deriveRules(snapshot, progress, questions) {
  object(snapshot, ['schemaVersion', 'source', 'integration', 'sha256', 'register'], 'Rules snapshot');
  assert.equal(snapshot.schemaVersion, snapshotSchema, 'Unsupported rules snapshot schema');
  object(snapshot.source, ['repository', 'revision', 'path'], 'Rules source');
  assert.equal(snapshot.source.repository, productRepository, 'Rules require the corporate product repository');
  assert.equal(snapshot.source.path, rulesSourcePath, 'Unexpected rules source path');
  assert.match(snapshot.source.revision, /^[a-f0-9]{40}$/, 'Rules source requires an immutable revision');
  assert.match(snapshot.sha256, /^[a-f0-9]{64}$/, 'Rules snapshot requires the hash of its projection');
  assert.equal(snapshot.sha256, rulesContentHash(snapshot.register), 'Rules projection hash mismatch: import the snapshot again instead of editing it');
  object(snapshot.integration, ['reference', 'included'], 'Rules integration');
  assert.equal(snapshot.integration.reference, 'main', 'Rules integration must refer to main');
  assert.equal(typeof snapshot.integration.included, 'boolean', 'Rules integration must state whether main contains the revision');
  assert.ok(Array.isArray(progress?.workPackages) && Array.isArray(progress?.phases), 'Rules require the roadmap projection of the project progress');
  assert.ok(questions?.source && Array.isArray(questions.items), 'Rules require the published questions, where each rule is decided');
  assert.equal(questions.source.revision, snapshot.source.revision, 'Rules and questions must be imported from the same product revision');
  const works = new Map(progress.workPackages.map(work => [work.id, work]));
  const register = validateRulesRegister(snapshot.register, { workPackageIds: works.keys() });
  const questionMap = new Map(questions.items.map(item => [item.id, item]));
  const phaseOrder = new Map(progress.phases.map((phase, index) => [phase.id, index]));
  const items = register.rules.map(rule => {
    const work = rule.workPackage ? works.get(rule.workPackage) : null;
    return {
      ...rule,
      work,
      phase: work ? work.phase : withoutPhase,
      decision: decisionOf(rule, questionMap),
      linkedQuestions: rule.questions.map(id => questionMap.get(id)),
    };
  });
  const rank = item => item.phase === withoutPhase ? progress.phases.length : phaseOrder.get(item.phase);
  const areaOrder = Object.keys(register.areas);
  items.sort((a, b) => rank(a) - rank(b) || areaOrder.indexOf(a.area) - areaOrder.indexOf(b.area) || Number(a.id.slice(4)) - Number(b.id.slice(4)));
  const groups = [
    ...progress.phases.map(phase => ({ id: phase.id, title: phase.title, href: phase.href, items: items.filter(item => item.phase === phase.id) })),
    { id: withoutPhase, title: 'Sin fase', href: null, items: items.filter(item => item.phase === withoutPhase) },
  ].filter(group => group.items.length);
  const visible = items.filter(item => item.disclosure === 'public');
  const count = (list, select) => list.reduce((counts, item) => ({ ...counts, [select(item)]: (counts[select(item)] ?? 0) + 1 }), {});
  return {
    source: snapshot.source,
    integration: snapshot.integration,
    reviewedOn: register.reviewedOn,
    posPlatformRevision: register.posPlatformRevision,
    areas: register.areas,
    items,
    groups,
    phases: groups.map(({ id, title }) => ({ id, title })),
    counts: {
      total: items.length,
      disclosure: { public: visible.length, internal: items.length - visible.length },
      decisions: Object.fromEntries(Object.keys(decisionStates).map(state => [state, items.filter(item => item.decision === state).length])),
      legacy: count(visible, item => item.legacyVerification),
      implemented: count(visible, item => item.posPlatform.implemented),
      discovered: visible.filter(item => item.origin === 'descubierta').length,
      withCapability: visible.filter(item => item.parity.length > 0).length,
    },
  };
}

export function loadRules(root, progress, questions) {
  const file = path.join(root, rulesDataPath);
  if (!fs.existsSync(file)) return null;
  return deriveRules(JSON.parse(fs.readFileSync(file, 'utf8')), progress, questions);
}
