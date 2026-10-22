import assert from 'node:assert/strict';
import test from 'node:test';
import { routeAroundObstacles } from './route-layout.js';

const node = (id, x, y, width = 100, height = 100) => ({ id, type: 'rectangle', x, y, width, height, customData: { c4NodeId: id } });
const edge = () => ({ id: 'source_target', type: 'arrow', x: 100, y: 50, points: [[0, 0], [300, 0]], customData: { from: 'source', to: 'target', label: 'Contrato sin cambios' }, startBinding: { elementId: 'source', focus: 0, gap: 0 }, endBinding: { elementId: 'target', focus: 0, gap: 0 } });

test('keeps an unobstructed relationship and its nodes byte-for-byte unchanged', () => {
  const input = [node('source', 0, 0), node('target', 400, 0), edge()];
  const output = routeAroundObstacles(input);
  assert.deepEqual(output, input);
  assert.notEqual(output, input);
});

test('routes around an unrelated node while preserving anchors, bindings and inputs', () => {
  const obstacle = node('obstacle', 200, -20, 100, 140);
  const input = [node('source', 0, 0), node('target', 400, 0), obstacle, edge()];
  const snapshot = structuredClone(input), output = routeAroundObstacles(input);
  const arrow = output.find(element => element.type === 'arrow');
  assert.deepEqual(input, snapshot);
  assert.deepEqual(output.slice(0, 3), input.slice(0, 3));
  assert.deepEqual(arrow.startBinding, input[3].startBinding);
  assert.deepEqual(arrow.endBinding, input[3].endBinding);
  assert.deepEqual(arrow.customData, input[3].customData);
  const points = arrow.points.map(point => [arrow.x + point[0], arrow.y + point[1]]);
  assert.deepEqual(points[0], [100, 50]);
  assert.deepEqual(points.at(-1), [400, 50]);
  assert.ok(points.some(point => point[1] < obstacle.y || point[1] > obstacle.y + obstacle.height));
  for (let index = 1; index < points.length; index++) {
    const [a, b] = [points[index - 1], points[index]];
    assert.ok(a[0] === b[0] || a[1] === b[1], 'Route segments must be orthogonal');
    // Midpoint of the clipped horizontal/vertical range cannot enter the blocker.
    if (a[1] === b[1] && a[1] > -20 && a[1] < 120) assert.ok(Math.max(a[0], b[0]) <= 200 || Math.min(a[0], b[0]) >= 300);
    if (a[0] === b[0] && a[0] > 200 && a[0] < 300) assert.ok(Math.max(a[1], b[1]) <= -20 || Math.min(a[1], b[1]) >= 120);
  }
  assert.deepEqual(routeAroundObstacles(input), output, 'Repair must be deterministic');
  assert.deepEqual(routeAroundObstacles(output), output, 'A repaired route must remain stable');
});

test('moves a colliding label with its background and preserves its content', () => {
  const label = { id: 'label-source_target', type: 'text', x: 205, y: 40, width: 90, height: 24, text: 'Contrato', groupIds: ['relation-source_target'] };
  const background = { id: 'label-bg-source_target', type: 'rectangle', x: 200, y: 35, width: 100, height: 34 };
  const input = [node('source', 0, 0), node('target', 400, 0), node('obstacle', 200, -20, 100, 140), edge(), label, background];
  const output = routeAroundObstacles(input), repaired = output[4], backdrop = output[5];
  assert.equal(repaired.text, label.text);
  assert.deepEqual(repaired.groupIds, label.groupIds);
  assert.ok(repaired.x !== label.x || repaired.y !== label.y);
  assert.equal(backdrop.x - repaired.x, background.x - label.x);
  assert.equal(backdrop.y - repaired.y, background.y - label.y);
  for (const box of output.filter(element => element.customData?.c4NodeId)) {
    assert.ok(repaired.x + repaired.width <= box.x || repaired.x >= box.x + box.width || repaired.y + repaired.height <= box.y || repaired.y >= box.y + box.height);
  }
});
