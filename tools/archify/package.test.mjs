import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { packageDiagram } from './package.mjs';

const entry = { id: 'sample', title: 'Prueba', description: 'Alcance', source: '/guide/proposal/architecture/', status: 'proposed' };
const page = body => `<html><head><meta name="generator" content="archify 3.2.0"></head><body>${body}</body></html>`;

test('executable scripts and style sheets become deterministic local assets without changing their bytes', () => {
  const code = 'window.example = "verificado";';
  const input = page(`<script>${code}</script><script>${code}</script><script id="data" type="application/json">{"value":true}</script>`).replace('</head>', '<style id="theme">body{color:blue}</style></head>');
  const result = packageDiagram(input, entry, { nodes: {}, edges: {} });
  const hash = createHash('sha256').update(code).digest('hex').slice(0,24);
  assert.equal(result.assets.get(`${hash}.js`), code);
  assert.equal(result.assets.size, 2);
  assert.equal(result.html.match(new RegExp(`${hash}.js`, 'g')).length, 2);
  assert.ok(result.html.includes('id="data" type="application/json"'));
  assert.ok(!/<script(?![^>]*(?:src=|application\/json))[^>]*>/i.test(result.html));
  assert.deepEqual(packageDiagram(input, entry, { nodes: {}, edges: {} }), result);
});

test('native SVG and font styles remain available for the upstream export feature', () => {
  const input = page('<svg><style>.node{fill:blue}</style></svg>').replace('</head>', '<style id="archify-fonts">@font-face{font-family:test}</style></head>');
  const result = packageDiagram(input, entry, { nodes: {}, edges: {} });
  assert.ok(result.html.includes('<svg><style>.node{fill:blue}</style></svg>'));
  assert.ok(result.html.includes('<style id="archify-fonts">@font-face{font-family:test}</style>'));
});

test('upstream changes cannot silently introduce remote dependencies or inline handlers', () => {
  for (const body of ['<script src="https://example.com/runtime.js"></script>', '<button onclick="run()">Run</button>', '<img src="https://example.com/image.png">', '<a href="javascript:run()">Run</a>']) {
    assert.throws(() => packageDiagram(page(body), entry, { nodes: {}, edges: {} }));
  }
  assert.throws(() => packageDiagram('<html></html>', entry, {}), /version/);
});

test('detail payload and metadata cannot escape their text or inert JSON containers', () => {
  const result = packageDiagram(page(''), { ...entry, title: '<img src=x onerror=alert(1)>', source: '/guide/?value="quoted"' }, { nodes: { example: { description: '</script><script>alert(1)</script>' } }, edges: {} });
  assert.ok(!result.html.includes('<script>alert(1)'));
  assert.ok(result.html.includes('\\u003c/script\\u003e'));
  assert.ok(result.html.includes('&lt;img'));
  assert.ok(result.html.includes('&quot;quoted&quot;'));
});

test('SQL dollar expressions stay literal when inserting JSON into the HTML document', () => {
  const sql = "CHECK (identifier ~ '^[a-z]+$'::text); $& $` $$";
  const details = { nodes: { table: { description: sql, constraints: [sql] } }, edges: {} };
  const result = packageDiagram(page(''), { ...entry, title: sql }, details);
  const embedded = result.html.match(/<script type="application\/json" id="pos-docs-details">([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(JSON.parse(embedded), details);
  assert.equal((result.html.match(/<\/html>/g) || []).length, 1);
});
