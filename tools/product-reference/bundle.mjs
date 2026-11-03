import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export const productRepository = 'https://github.com/developer-implementos/pos-platform';
export const snapshotRoot = new URL('../../data/product-reference/', import.meta.url);
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const expectedApis = ['branch-api', 'country-api'];
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);

function readFile(directory, relative) {
  const absolute = path.join(directory, relative);
  const actual = fs.realpathSync(absolute);
  const inside = path.relative(fs.realpathSync(directory), actual);
  assert.ok(inside && !inside.startsWith('..') && !path.isAbsolute(inside), 'Snapshot file escapes its directory');
  assert.ok(!fs.lstatSync(absolute).isSymbolicLink(), 'Snapshot files cannot be symbolic links');
  assert.ok(fs.statSync(actual).size <= 12 * 1024 * 1024, 'Snapshot file exceeds the public artifact budget');
  return fs.readFileSync(actual);
}

export function validateOpenApi(document) {
  assert.match(document.openapi ?? '', /^3\.[01]\.\d+$/u, 'Expected an OpenAPI 3 document');
  assert.ok(document.info?.title && document.paths && typeof document.paths === 'object', 'Missing API metadata');
  assert.ok(document.info.description === undefined || typeof document.info.description === 'string', 'Invalid API description');
  const ids = new Set();
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (key === '$ref') {
        assert.ok(typeof item === 'string' && item.startsWith('#/'), 'External schema references cannot be published');
        const target = item.slice(2).split('/').reduce((node, part) => node?.[part.replaceAll('~1', '/').replaceAll('~0', '~')], document);
        assert.ok(target && typeof target === 'object', 'Unresolved OpenAPI reference');
      }
      if (key === 'externalValue') throw new Error('External examples cannot be published');
      if (key === 'servers') {
        assert.ok(Array.isArray(item), 'Invalid API servers');
        for (const server of item) assert.ok(typeof server.url === 'string' && server.url.startsWith('/') && !server.url.startsWith('//'), 'Environment URLs cannot be published');
      }
      walk(item);
    }
  };
  walk(document);
  for (const [route, item] of Object.entries(document.paths)) {
    assert.ok(route.startsWith('/'), 'API paths must be relative to the application');
    for (const [method, operation] of Object.entries(item)) {
      if (!methods.has(method)) continue;
      assert.ok(typeof operation.operationId === 'string' && operation.operationId.length > 0, 'Every operation needs a stable operationId');
      assert.ok(!ids.has(operation.operationId), 'Duplicate operationId');
      ids.add(operation.operationId);
      assert.ok(operation.responses && Object.keys(operation.responses).length, 'Every operation needs response contracts');
      for (const field of ['summary', 'description']) assert.ok(operation[field] === undefined || typeof operation[field] === 'string', `Invalid operation ${field}`);
    }
  }
  assert.ok(ids.size > 0, 'Empty API reference');
  return document;
}

export function loadBundle(directory = snapshotRoot) {
  const root = directory instanceof URL ? fileURLToPath(directory) : path.resolve(directory);
  const manifestBytes = readFile(root, 'manifest.json');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schemaVersion, 1, 'Unsupported product reference version');
  assert.equal(manifest.source?.repository, productRepository, 'Unexpected product repository');
  assert.match(manifest.source?.commit ?? '', /^[a-f0-9]{40}$/u, 'Product reference requires an immutable commit');
  assert.deepEqual(manifest.apis?.map(api => api.id).sort(), expectedApis, 'Expected the two product HTTP APIs');
  assert.equal(manifest.database?.file, 'database/schema.json', 'Unexpected database artifact');
  const files = new Map([['manifest.json', manifestBytes]]);
  const readArtifact = entry => {
    assert.match(entry.sha256 ?? '', /^[a-f0-9]{64}$/u, 'Missing artifact checksum');
    const bytes = readFile(root, entry.file);
    assert.equal(digest(bytes), entry.sha256, `Artifact checksum mismatch: ${entry.file}`);
    files.set(entry.file, bytes);
    return JSON.parse(bytes);
  };
  const apis = manifest.apis.map(entry => {
    assert.equal(entry.file, `openapi/${entry.id}.json`, 'Unexpected API artifact path');
    return {id: entry.id, document: validateOpenApi(readArtifact(entry))};
  });
  const database = readArtifact(manifest.database);
  assert.equal(database.schemaVersion, 1, 'Unsupported database reference version');
  assert.ok(Array.isArray(database.databases) && database.databases.length > 0, 'Missing database schemas');
  for (const db of database.databases) {
    assert.ok(typeof db.id === 'string' && typeof db.app === 'string' && Array.isArray(db.tables) && Array.isArray(db.migrations), 'Incomplete database reference');
    assert.ok(db.migrations.every(migration => typeof migration.id === 'string' && /^[a-f0-9]{64}$/u.test(migration.checksum)), 'Invalid migration provenance');
    const tables = new Map(db.tables.map(table => [`${table.schema}.${table.name}`, table]));
    assert.equal(tables.size, db.tables.length, 'Duplicate physical table');
    for (const table of db.tables) {
      assert.ok(table.schema && table.name && table.context && Array.isArray(table.columns), 'Incomplete table reference');
      assert.ok(!Object.hasOwn(table, 'rows') && !Object.hasOwn(table, 'data'), 'Business rows are not documentation');
      const names = new Set(table.columns.map(column => column.name));
      assert.equal(names.size, table.columns.length, 'Duplicate physical column');
      for (const column of table.columns) {
        assert.ok(typeof column.name === 'string' && typeof column.type === 'string' && typeof column.nullable === 'boolean', 'Invalid column definition');
        for (const field of ['default', 'comment']) assert.ok(column[field] === null || typeof column[field] === 'string', `Invalid column ${field}`);
      }
      assert.ok(Array.isArray(table.constraints) && Array.isArray(table.indexes), 'Missing table constraints or indexes');
      for (const constraint of table.constraints) {
        assert.ok(typeof constraint.name === 'string' && typeof constraint.type === 'string' && typeof constraint.definition === 'string', 'Invalid constraint');
        assert.ok(Array.isArray(constraint.columns) && constraint.columns.every(column => names.has(column)), 'Constraint names an unknown column');
        if (constraint.references) {
          const target = tables.get(`${constraint.references.schema}.${constraint.references.table}`);
          assert.ok(target && constraint.references.columns.length === constraint.columns.length && constraint.references.columns.every(name => target.columns.some(column => column.name === name)), 'Invalid foreign key target');
        }
      }
      assert.ok(table.indexes.every(index => typeof index.name === 'string' && typeof index.definition === 'string'), 'Invalid index definition');
    }
  }
  return {manifest, apis, database, files};
}

export function operations(document) {
  return Object.entries(document.paths).flatMap(([route, item]) => Object.entries(item)
    .filter(([method]) => methods.has(method))
    .map(([method, operation]) => ({route, method: method.toUpperCase(), ...operation,
      parameters: [...new Map([...(item.parameters || []), ...(operation.parameters || [])]
        .map(parameter => [parameter.$ref || `${parameter.in}:${parameter.name}`, parameter])).values()],
      security: operation.security ?? document.security ?? []})))
    .sort((left, right) => left.route.localeCompare(right.route, 'en') || left.method.localeCompare(right.method, 'en'));
}
