import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {digest, loadBundle, operations, productRepository, validateOpenApi} from './bundle.mjs';

const api = () => ({openapi: '3.0.0', info: {title: 'Fixture API', version: '1'}, paths: {'/items': {parameters: [{name: 'x-request', in: 'header'}], get: {operationId: 'listItems', responses: {200: {description: 'List'}}, security: []}}}, security: [{bearer: []}]});
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-reference-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, value) => {
    const bytes = Buffer.from(JSON.stringify(value));
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), bytes);
    return {file, sha256: digest(bytes)};
  };
  const manifest = {schemaVersion: 1, source: {repository: productRepository, commit: 'a'.repeat(40)},
    apis: ['branch-api', 'country-api'].map(id => ({id, ...write(`openapi/${id}.json`, api())})),
    database: write('database/schema.json', {schemaVersion: 1, databases: [{id: 'branch', app: 'branch-api', migrations: [], tables: []}]})};
  write('manifest.json', manifest);
  return {root, write, manifest};
}

test('public reference verifies all hashes and retains relative routes and explicit public authentication', t => {
  const {root} = fixture(t);
  const bundle = loadBundle(root);
  assert.equal(bundle.apis.length, 2);
  const [operation] = operations(bundle.apis[0].document);
  assert.equal(operation.method, 'GET');
  assert.deepEqual(operation.security, []);
  assert.equal(operation.parameters[0].name, 'x-request');
});
test('rejects corrupted artifacts before publishing', t => {
  const {root, write} = fixture(t);
  write('openapi/branch-api.json', {...api(), info: {title: 'Changed'}});
  assert.throws(() => loadBundle(root), /checksum mismatch/u);
});
test('manifest cannot redirect the reader outside its allowlisted files', t => {
  const {root, write, manifest} = fixture(t);
  manifest.apis[0].file = '../../private.json';
  write('manifest.json', manifest);
  assert.throws(() => loadBundle(root), /artifact path/u);
});
test('requires corporate provenance and an immutable revision', t => {
  const {root, write, manifest} = fixture(t);
  manifest.source.commit = 'main';
  write('manifest.json', manifest);
  assert.throws(() => loadBundle(root), /immutable commit/u);
});
test('rejects remote schema resolution and operational server addresses', () => {
  const document = api();
  document.components = {schemas: {Remote: {$ref: 'https://example.test/private'}}};
  assert.throws(() => validateOpenApi(document), /External schema/u);
  delete document.components;
  document.servers = [{url: 'https://example.test'}];
  assert.throws(() => validateOpenApi(document), /Environment URLs/u);
});
test('rejects duplicate operation IDs rather than silently merging distinct operations', () => {
  const document = api();
  document.paths['/other'] = {post: document.paths['/items'].get};
  assert.throws(() => validateOpenApi(document), /Duplicate operationId/u);
});
test('operation parameters override inherited parameters with the same name and location', () => {
  const document = api();
  document.paths['/items'].get.parameters = [{name: 'x-request', in: 'header', required: true}];
  const [operation] = operations(document);
  assert.equal(operation.parameters.length, 1);
  assert.equal(operation.parameters[0].required, true);
});
test('rejects dangling local references even if the snapshot hashes are valid', () => {
  const document = api();
  document.components = {schemas: {Broken: {$ref: '#/components/schemas/Missing'}}};
  assert.throws(() => validateOpenApi(document), /Unresolved OpenAPI reference/u);
});
