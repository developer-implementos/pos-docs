import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  checkWorkspace,
  maximumDocumentBytes,
  parseReference,
  readLocalDocument,
  validateDeclaration,
  validateDocument,
} from './check.mjs';

const document = `# Corregir un contrato de entrega

Objetivo: conservar la idempotencia de la venta. Issue: https://github.com/developer-implementos/pos-platform/issues/122.

## Specs

- S1. Conservar el resultado de una solicitud repetida.
- S2. Comprobar la recuperación después de una respuesta perdida.

## Tasks

- [ ] T1 · S1,S2 · route:delegated · Implementar y probar recuperación · status:in_progress · evidence: implementación pendiente de pruebas de repetición.
- [ ] T2 · S2 · route:inline · Revisar contrato con consumidores · status:pending · evidence: revisión aún no realizada.

## Log

- L1 · 2026-11-03 · Solicitud original, literal:

> Quiero recuperar el resultado sin duplicar la venta.

- L2 · 2026-11-03 · Se delimitó el contrato; no acredita implementación ni aceptación.
`;
const declaration = 'ODD-Task: odd/tasks/recover-sale.md';
const github = `https://github.com/developer-implementos/pos-platform/blob/${'a'.repeat(40)}/odd/tasks/recover-sale.md`;

test('preserves specs, task routing and the original request without claiming verification', () => {
  const parsed = validateDocument(document);
  assert.deepEqual(
    parsed.specs.map((spec) => spec.id),
    ['S1', 'S2'],
  );
  assert.deepEqual(parsed.tasks[0], {
    id: 'T1',
    specs: ['S1', 'S2'],
    route: 'delegated',
    description: 'Implementar y probar recuperación',
    status: 'in_progress',
    evidence: 'implementación pendiente de pruebas de repetición.',
  });
  assert.deepEqual(parsed.logEntries, ['L1', 'L2']);
  assert.equal(parsed.originalRequest, 'Quiero recuperar el resultado sin duplicar la venta.');
  assert.equal(parsed.acceptance, undefined);
});

test('rejects malformed, duplicated and missing structure or task references', () => {
  for (const [source, error] of [
    [document.replace('## Specs', '## Especificaciones'), /Specs/],
    [document.replace('## Specs', '## Specs\n## Specs'), /Specs/],
    [document.replace('- S1.', '- S0.'), /specification/],
    [document.replace('- S2.', '- S1.'), /Duplicate specification/],
    [document.replace('S1,S2 ·', 'S1,S9 ·'), /unknown specification/],
    [document.replace('S1,S2 ·', 'S1,S1 ·'), /Duplicate specification reference/],
    [document.replace('T2 ·', 'T1 ·'), /Duplicate task/],
    [document.replace('route:delegated', 'route:guess'), /Each task/],
    [document.replace(' · status:pending', ' · status:pending · status:pending'), /must not repeat/],
    [document.replace(' · status:pending', ' · route:inline · status:pending'), /must not repeat/],
    [
      document.replace(
        'evidence: revisión aún no realizada.',
        `evidence: sin pruebas · commit: ${'a'.repeat(40)}`,
      ),
      /must not repeat/,
    ],
    [document.replace('status:pending', 'status:complete'), /Each task/],
    [document.replace(' · status:pending', '\n    · status:pending'), /Each task/],
    [document.replace('[ ] T2', '[x] T2'), /checkbox and status/],
    [document.replace('evidence: revisión aún no realizada.', 'commit: abc1234'), /full immutable SHA/],
    [document.replace('L2 ·', 'L1 ·'), /Duplicate log/],
    [document.replace('L2 ·', 'L3 ·'), /sequential append/],
    [document.replace('> Quiero recuperar', 'Quiero recuperar'), /original request/],
  ])
    assert.throws(() => validateDocument(source), error);
});

test('allows completed tasks with an exact commit and retains pending human review separately', () => {
  const completed = document
    .replace('[ ] T1', '[x] T1')
    .replace('status:in_progress', 'status:done')
    .replace('evidence: implementación pendiente de pruebas de repetición.', `commit: ${'b'.repeat(40)}`);
  assert.equal(validateDocument(completed).tasks[0].commit, 'b'.repeat(40));
  assert.equal(validateDocument(completed).tasks[1].status, 'pending');
});

test('log history is append-only even when current specs and tasks evolve', () => {
  const updated =
    document.replace('status:pending', 'status:blocked') +
    '\n- L3 · 2026-11-03 · Falta una respuesta; continúa la prueba independiente.\n';
  assert.equal(validateDocument(updated, { previous: document }).logEntries.length, 3);
  assert.doesNotThrow(() => validateDocument(document.replaceAll('\n', '\r\n'), { previous: document }));
  for (const changed of [
    document.replace('Quiero recuperar', 'Solicité recuperar'),
    document.replace('no acredita implementación', 'acredita implementación'),
    document.replace(/\n- L2 ·[^\n]+\n/, '\n'),
    document.trimEnd() + ' Se agrega algo a la entrada histórica.\n',
  ])
    assert.throws(() => validateDocument(changed, { previous: document }), /append-only/);
  assert.throws(
    () =>
      validateDocument(document + '\nAn extra paragraph changes the last record.\n', { previous: document }),
    /new sequential Log entry/,
  );
});

test('documents and PR declarations reject oversized or non-text input', async () => {
  assert.throws(() => validateDocument('a'.repeat(maximumDocumentBytes + 1)), /exceeds/);
  assert.throws(() => validateDocument(document + '\0'), /NUL/);
  assert.throws(() => validateDocument({ content: document }), /must be text/);
  await assert.rejects(validateDeclaration('x'.repeat(maximumDocumentBytes + 1)), /exceeds/);
});

test('only local task paths and immutable company GitHub blob references are accepted', () => {
  assert.deepEqual(parseReference('odd/tasks/recover-sale.md'), {
    kind: 'local',
    path: 'odd/tasks/recover-sale.md',
  });
  assert.deepEqual(parseReference(github), {
    kind: 'github',
    repository: 'developer-implementos/pos-platform',
    revision: 'a'.repeat(40),
    path: 'odd/tasks/recover-sale.md',
    url: github,
  });
  assert.equal(
    parseReference(github.replace('/pos-platform/', '/pos-docs/')).repository,
    'developer-implementos/pos-docs',
  );
  for (const value of [
    '../odd/tasks/recover-sale.md',
    'odd/tasks/../recover-sale.md',
    '/odd/tasks/recover-sale.md',
    'odd\\tasks\\recover-sale.md',
    'odd/tasks/RecoverSale.md',
    'odd/tasks/recover-sale.md\n',
    'odd/tasks/%2e%2e/recover-sale.md',
    github.replace('a'.repeat(40), 'main'),
    github.replace('a'.repeat(40), 'aaaaaaa'),
    github.replace('github.com/', 'github.com.evil.test/'),
    github.replace('developer-implementos', 'another-org'),
    github + '?raw=true',
    github + '#Log',
    'file:///odd/tasks/recover-sale.md',
    'https://example.test/task.md',
  ])
    assert.throws(() => parseReference(value));
});

test('declarations must be visible, unique and backed by an actual task document', async () => {
  const load = { readDocument: async () => document };
  const result = await validateDeclaration(declaration, load);
  assert.equal(result.kind, 'document');
  for (const body of [
    `<!-- ${declaration} -->`,
    `\`\`\`\n${declaration}\n\`\`\``,
    `> ${declaration}`,
    `    ${declaration}`,
    declaration + '\n' + declaration,
    'ODD-Task:',
    'ODD-Task: inline\n<!-- ODD-Reason: Un cambio pequeño con una explicación escondida. -->',
    'ODD-Task: inline\nODD-Reason: TODO completar una justificación del alcance.',
    'ODD-Task: inline\nODD-Reason: Un cambio de etiqueta visible y sin contrato nuevo.\nODD-Reason: Segundo motivo.',
  ])
    await assert.rejects(validateDeclaration(body, load));
  await assert.rejects(validateDeclaration(declaration), /trusted text loader/);
  await assert.rejects(
    validateDeclaration(declaration, { readDocument: async () => undefined }),
    /must be text/,
  );
  await assert.rejects(
    validateDeclaration(declaration, {
      readDocument: async () => {
        throw new Error('Missing task document');
      },
    }),
    /Missing task document/,
  );
});

test('inline declarations explain a small change without inventing a task or invoking loaders', async () => {
  const reason = 'Corrige una etiqueta visible, sin cambiar contratos ni comportamiento.';
  const result = await validateDeclaration(`ODD-Task: inline\nODD-Reason: ${reason}`, {
    readDocument: () => {
      assert.fail('Inline work must not load a fabricated document');
    },
  });
  assert.deepEqual(result, { kind: 'inline', reason });
});

test('pinned references use injected text loaders and compare prior log content', async () => {
  const calls = [];
  const declarationWithReference = `ODD-Task: ${github}`;
  await validateDeclaration(declarationWithReference, {
    readDocument: async (reference) => {
      calls.push(reference);
      return document + '\n- L3 · 2026-11-03 · Nueva evidencia.\n';
    },
    readPreviousDocument: async (reference) => {
      calls.push(reference);
      return document;
    },
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], parseReference(github));
  assert.deepEqual(calls[1], calls[0]);
  await assert.rejects(
    validateDeclaration(declarationWithReference, {
      readDocument: async () => document.replace('Quiero recuperar', 'Otra solicitud'),
      readPreviousDocument: async () => document,
    }),
    /append-only/,
  );
});

async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'pos-odd-check-'));
  try {
    await mkdir(path.join(root, 'odd/tasks'), { recursive: true });
    await writeFile(path.join(root, 'odd/tasks/recover-sale.md'), document);
    await run(root);
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('pos-odd-check-'));
    await rm(root, { recursive: true, force: true });
  }
}

test('the local check reads bounded task text without executing embedded commands', async () => {
  await fixture(async (root) => {
    const textWithCommand = document.replace(
      '## Specs',
      "Texto de ejemplo, no ejecutable: `node -e 'process.exit(19)'`.\n\n## Specs",
    );
    await writeFile(path.join(root, 'odd/tasks/recover-sale.md'), textWithCommand);
    assert.deepEqual(await checkWorkspace(root), [{ path: 'odd/tasks/recover-sale.md', specs: 2, tasks: 2 }]);
    assert.equal(await readLocalDocument(root, parseReference('odd/tasks/recover-sale.md')), textWithCommand);
    await assert.rejects(readLocalDocument(root, parseReference(github)), /does not fetch/);
    await assert.rejects(readLocalDocument(root, { kind: 'local', path: '../escape.md' }), /Invalid local/);
    await writeFile(path.join(root, 'odd/tasks/oversized.md'), 'x'.repeat(maximumDocumentBytes + 1));
    await assert.rejects(checkWorkspace(root), /bounded regular text/);
  });
});

test('directory junctions or symlinks are rejected instead of reading their targets', async () => {
  await fixture(async (root) => {
    const target = path.join(root, 'elsewhere');
    await mkdir(target);
    await writeFile(path.join(target, 'escape.md'), document);
    await symlink(
      target,
      path.join(root, 'odd/tasks/link'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    await assert.rejects(checkWorkspace(root), /symlinks or junctions/);
    assert.equal(await readFile(path.join(target, 'escape.md'), 'utf8'), document);
  });
  await fixture(async (root) => {
    await rename(path.join(root, 'odd/tasks'), path.join(root, 'real-tasks'));
    await symlink(
      path.join(root, 'real-tasks'),
      path.join(root, 'odd/tasks'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    await assert.rejects(
      readLocalDocument(root, parseReference('odd/tasks/recover-sale.md')),
      /symlinks or junctions/,
    );
  });
});
