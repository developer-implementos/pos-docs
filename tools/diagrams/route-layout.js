/* Deterministic layout repair. Keeps node geometry, identities and bindings intact. */
const EPSILON = 0.001;
const samePoint = (a, b) => Math.abs(a[0] - b[0]) < EPSILON && Math.abs(a[1] - b[1]) < EPSILON;
const pointInside = (point, box) => point[0] > box.x + EPSILON && point[0] < box.x + box.width - EPSILON && point[1] > box.y + EPSILON && point[1] < box.y + box.height - EPSILON;
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const expand = (box, gap) => ({ x: box.x - gap, y: box.y - gap, width: box.width + gap * 2, height: box.height + gap * 2 });

function segmentEnters(a, b, box) {
  let low = 0, high = 1;
  for (let axis = 0; axis < 2; axis++) {
    const min = (axis ? box.y : box.x) + EPSILON;
    const max = (axis ? box.y + box.height : box.x + box.width) - EPSILON;
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < EPSILON) {
      if (a[axis] <= min || a[axis] >= max) return false;
    } else {
      let first = (min - a[axis]) / delta, last = (max - a[axis]) / delta;
      if (first > last) [first, last] = [last, first];
      low = Math.max(low, first); high = Math.min(high, last);
      if (low >= high) return false;
    }
  }
  return high > 0 && low < 1;
}

function compact(points) {
  const result = [];
  for (const point of points) {
    if (result.length && samePoint(result.at(-1), point)) continue;
    if (result.length > 1) {
      const a = result.at(-2), b = result.at(-1);
      const vertical = Math.abs(a[0] - b[0]) < EPSILON && Math.abs(b[0] - point[0]) < EPSILON;
      const horizontal = Math.abs(a[1] - b[1]) < EPSILON && Math.abs(b[1] - point[1]) < EPSILON;
      if (vertical || horizontal) result.pop();
    }
    result.push(point);
  }
  return result;
}

class MinHeap {
  values = [];
  push(value) {
    let index = this.values.length;
    this.values.push(value);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.values[parent].cost <= value.cost) break;
      this.values[index] = this.values[parent]; index = parent;
    }
    this.values[index] = value;
  }
  pop() {
    const result = this.values[0], last = this.values.pop();
    if (this.values.length) {
      let index = 0;
      while (index * 2 + 1 < this.values.length) {
        let child = index * 2 + 1;
        if (child + 1 < this.values.length && this.values[child + 1].cost < this.values[child].cost) child++;
        if (this.values[child].cost >= last.cost) break;
        this.values[index] = this.values[child]; index = child;
      }
      this.values[index] = last;
    }
    return result;
  }
}

function manhattanRoute(start, end, obstacles, bendPenalty) {
  // Coordinates at inflated obstacle boundaries make a finite visibility grid.
  // Neighbour edges only connect adjacent coordinates; no hidden diagonal jumps.
  const xs = [...new Set([start[0], end[0], ...obstacles.flatMap(box => [box.x, box.x + box.width])])].sort((a, b) => a - b);
  const ys = [...new Set([start[1], end[1], ...obstacles.flatMap(box => [box.y, box.y + box.height])])].sort((a, b) => a - b);
  const width = xs.length, point = index => [xs[index % width], ys[Math.floor(index / width)]];
  const startIndex = ys.indexOf(start[1]) * width + xs.indexOf(start[0]);
  const endIndex = ys.indexOf(end[1]) * width + xs.indexOf(end[0]);
  const count = xs.length * ys.length;
  const allowed = Array.from({ length: count }, (_, index) => !obstacles.some(box => pointInside(point(index), box)));
  if (!allowed[startIndex] || !allowed[endIndex]) return null;
  const costs = new Float64Array(count * 3).fill(Infinity), previous = new Int32Array(count * 3).fill(-1);
  const heap = new MinHeap();
  costs[startIndex * 3] = 0; heap.push({ state: startIndex * 3, cost: 0 });
  let final = -1;
  while (heap.values.length) {
    const item = heap.pop(), index = Math.floor(item.state / 3), direction = item.state % 3;
    if (item.cost !== costs[item.state]) continue;
    if (index === endIndex) { final = item.state; break; }
    const x = index % width, y = Math.floor(index / width), current = point(index);
    const neighbours = [];
    if (x > 0) neighbours.push([index - 1, 1]);
    if (x + 1 < width) neighbours.push([index + 1, 1]);
    if (y > 0) neighbours.push([index - width, 2]);
    if (y + 1 < ys.length) neighbours.push([index + width, 2]);
    for (const [next, nextDirection] of neighbours) {
      if (!allowed[next]) continue;
      const target = point(next);
      if (obstacles.some(box => segmentEnters(current, target, box))) continue;
      const cost = item.cost + Math.abs(current[0] - target[0]) + Math.abs(current[1] - target[1]) + (direction && direction !== nextDirection ? bendPenalty : 0);
      const state = next * 3 + nextDirection;
      if (cost + EPSILON >= costs[state]) continue;
      costs[state] = cost; previous[state] = item.state; heap.push({ state, cost });
    }
  }
  if (final < 0) return null;
  const points = [];
  for (let state = final; state >= 0; state = previous[state]) points.push(point(Math.floor(state / 3)));
  return compact(points.reverse());
}

function absolutePoints(arrow) {
  return arrow.points.map(point => [arrow.x + point[0], arrow.y + point[1]]);
}

function portOutside(anchor, node, distance) {
  if (!node) return anchor;
  const sides = [
    { gap: Math.abs(anchor[0] - node.x), point: [Math.min(anchor[0], node.x) - distance, anchor[1]] },
    { gap: Math.abs(anchor[0] - node.x - node.width), point: [Math.max(anchor[0], node.x + node.width) + distance, anchor[1]] },
    { gap: Math.abs(anchor[1] - node.y), point: [anchor[0], Math.min(anchor[1], node.y) - distance] },
    { gap: Math.abs(anchor[1] - node.y - node.height), point: [anchor[0], Math.max(anchor[1], node.y + node.height) + distance] },
  ];
  sides.sort((a, b) => a.gap - b.gap);
  return sides[0].point;
}

function labelCandidates(label, points, gap) {
  const positions = [];
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1], b = points[index];
    for (const ratio of [0.5, 0.25, 0.75, 0, 1]) {
      const x = a[0] + (b[0] - a[0]) * ratio, y = a[1] + (b[1] - a[1]) * ratio;
      // Both sides of a segment are considered. Labels stay adjacent to their
      // relationship instead of being pushed into an unrelated diagram corner.
      if (Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1])) {
        positions.push({ x: x - label.width / 2, y: y - label.height - gap });
        positions.push({ x: x - label.width / 2, y: y + gap });
      } else {
        positions.push({ x: x + gap, y: y - label.height / 2 });
        positions.push({ x: x - label.width - gap, y: y - label.height / 2 });
      }
    }
  }
  return positions.sort((a, b) => Math.hypot(a.x - label.x, a.y - label.y) - Math.hypot(b.x - label.x, b.y - label.y));
}

/** Returns a copy; only obstructed routes and colliding relationship labels move. */
export function routeAroundObstacles(elements, { clearance = 18, labelGap = 12, placeLabels = true } = {}) {
  const output = structuredClone(elements);
  const nodes = output.filter(element => element.customData?.c4NodeId);
  const nodesById = new Map(nodes.map(node => [node.id, node]));
  const arrows = output.filter(element => element.type === 'arrow' && element.customData?.from && element.customData?.to);
  const moved = new Set();
  for (const arrow of arrows) {
    const source = arrow.customData.from, target = arrow.customData.to;
    const obstacles = nodes.filter(node => node.id !== source && node.id !== target);
    const points = absolutePoints(arrow);
    if (!points.slice(1).some((point, index) => obstacles.some(node => segmentEnters(points[index], point, node)))) continue;
    const start = points[0], end = points.at(-1);
    const startPort = portOutside(start, nodesById.get(source), clearance * 2);
    const endPort = portOutside(end, nodesById.get(target), clearance * 2);
    let route = manhattanRoute(startPort, endPort, nodes.map(node => expand(node, clearance)), clearance * 2);
    if (route) route = compact([start, ...route, end]);
    // Very close adjacent nodes can leave no inflated port. Retry with exact
    // endpoint anchors and only unrelated obstacles; never relax intersection.
    if (!route || route.slice(1).some((point, index) => obstacles.some(node => segmentEnters(route[index], point, node)))) {
      route = manhattanRoute(start, end, obstacles.map(node => expand(node, clearance)), clearance * 2);
    }
    if (!route) throw new Error(`No unobstructed route for ${arrow.id}`);
    arrow.x = route[0][0]; arrow.y = route[0][1];
    arrow.points = route.map(point => [point[0] - arrow.x, point[1] - arrow.y]);
    arrow.width = Math.max(...route.map(point => point[0])) - Math.min(...route.map(point => point[0]));
    arrow.height = Math.max(...route.map(point => point[1])) - Math.min(...route.map(point => point[1]));
    moved.add(arrow.id);
  }
  if (!placeLabels) return output;
  const labels = output.filter(element => element.type === 'text' && element.id.startsWith('label-') && !element.id.startsWith('label-bg-'));
  const fixed = [...nodes, ...output.filter(element => element.type === 'text' && element.id.endsWith('-title'))];
  const occupied = [];
  for (const label of labels) {
    const arrowId = label.id.slice('label-'.length), arrow = arrows.find(element => element.id === arrowId);
    const otherLabels = labels.filter(other => other !== label && !occupied.includes(other));
    const blockers = [...fixed, ...occupied, ...otherLabels];
    if (arrow && (moved.has(arrowId) || blockers.some(box => overlaps(expand(label, labelGap / 2), box)))) {
      const candidates = labelCandidates(label, absolutePoints(arrow), labelGap);
      const position = candidates.find(candidate => !blockers.some(box => overlaps(expand({ ...candidate, width: label.width, height: label.height }, labelGap / 2), box)));
      if (!position) throw new Error(`No collision-free label position for ${arrowId}`);
      const background = output.find(element => element.id === 'label-bg-' + arrowId);
      if (background) { background.x += position.x - label.x; background.y += position.y - label.y; }
      label.x = position.x; label.y = position.y;
    }
    occupied.push(label);
  }
  return output;
}
