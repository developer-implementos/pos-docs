/** Portable SVG renderer. Geometry and routes are derived without mutating the model. */
const COLORS = { sync: '#0545BA', async: '#087B72', data: '#6B4CB4', local: '#64748B' };
const KINDS = { app: 'APLICACIÓN', data: 'DATOS', infra: 'INFRAESTRUCTURA', external: 'SISTEMA EXTERNO', component: 'COMPONENTE INTERNO', process: 'PROCESO NATIVO', responsibility: 'RESPONSABILIDAD' };
const STATUS = { proposed: 'Propuesto', conditional: 'Condicional', unresolved: 'Por definir' };
const MODES = { sync: 'Petición / respuesta', async: 'Entrega diferida', data: 'Acceso a datos', local: 'Dentro del proceso o puesto' };
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
const round = value => Math.round(value * 10) / 10;
const boxEnd = box => ({ right: box.x + box.width, bottom: box.y + box.height });
const inflate = (box, padding) => ({ x: box.x - padding, y: box.y - padding, width: box.width + padding * 2, height: box.height + padding * 2 });
const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function textWidth(text, size) {
  return [...text].reduce((width, character) => width + (/\s/u.test(character) ? .31 : /[ilI.,:;!|'`]/u.test(character) ? .29 : /[MW@#%]/u.test(character) ? .86 : /[A-ZÁÉÍÓÚÑ]/u.test(character) ? .67 : .55) * size, 0);
}

function wrap(text, width, size, maximum = Infinity) {
  const lines = [];
  let line = '';
  for (const word of String(text ?? '').trim().split(/\s+/u)) {
    if (!word) continue;
    if (line && textWidth(`${line} ${word}`, size) > width) { lines.push(line); line = ''; }
    let remaining = word;
    while (textWidth(remaining, size) > width) {
      let end = remaining.length;
      while (end > 1 && textWidth(remaining.slice(0, end), size) > width) end--;
      if (line) { lines.push(line); line = ''; }
      lines.push(remaining.slice(0, end)); remaining = remaining.slice(end);
    }
    line = line ? `${line} ${remaining}` : remaining;
  }
  if (line) lines.push(line);
  if (lines.length <= maximum) return lines;
  const result = lines.slice(0, maximum);
  let last = result.at(-1);
  while (last.length && textWidth(`${last}…`, size) > width) last = last.slice(0, -1);
  result[result.length - 1] = last.replace(/\s+$/u, '') + '…';
  return result;
}

function card(node, x, y, width, compact = false) {
  if (compact) {
    const title = wrap(node.title, width - 44, 26, 2);
    return { ...node, x, y, width, height: 78 + title.length * 30, text: { title, technology: [], summary: [], titleY: 65, technologyY: 0, summaryY: 0 } };
  }
  const title = wrap(node.title, width - 44, 24, 2);
  const technology = wrap(node.technology, width - 44, 18, 2);
  const summary = wrap(node.summary, width - 44, 19, 3);
  const titleY = 63;
  const technologyY = titleY + (title.length - 1) * 30 + 29;
  const summaryY = technologyY + Math.max(technology.length, 1) * 23 + 13;
  const height = Math.max(174, summaryY + Math.max(summary.length - 1, 0) * 25 + 25);
  return { ...node, x, y, width, height, text: { title, technology, summary, titleY, technologyY, summaryY } };
}

function segmentEnters(a, b, box) {
  if (a[0] === b[0]) return a[0] > box.x && a[0] < box.x + box.width && Math.max(a[1], b[1]) > box.y && Math.min(a[1], b[1]) < box.y + box.height;
  if (a[1] === b[1]) return a[1] > box.y && a[1] < box.y + box.height && Math.max(a[0], b[0]) > box.x && Math.min(a[0], b[0]) < box.x + box.width;
  throw new Error('Architecture routes must be orthogonal');
}

function compact(points) {
  const result = [];
  for (const point of points) {
    if (result.length && point[0] === result.at(-1)[0] && point[1] === result.at(-1)[1]) continue;
    if (result.length > 1) {
      const [a, b] = result.slice(-2);
      if ((a[0] === b[0] && b[0] === point[0]) || (a[1] === b[1] && b[1] === point[1])) result.pop();
    }
    result.push(point);
  }
  return result;
}

class Queue {
  items = [];
  push(item) {
    let index = this.items.length; this.items.push(item);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.items[parent].cost <= item.cost) break;
      this.items[index] = this.items[parent]; index = parent;
    }
    this.items[index] = item;
  }
  pop() {
    const result = this.items[0], last = this.items.pop();
    if (this.items.length) {
      let index = 0;
      while (index * 2 + 1 < this.items.length) {
        let child = index * 2 + 1;
        if (child + 1 < this.items.length && this.items[child + 1].cost < this.items[child].cost) child++;
        if (this.items[child].cost >= last.cost) break;
        this.items[index] = this.items[child]; index = child;
      }
      this.items[index] = last;
    }
    return result;
  }
}

function congestion(a, b, used) {
  let cost = 0;
  for (const [c, d] of used) {
    const horizontal = a[1] === b[1], otherHorizontal = c[1] === d[1];
    if (horizontal === otherHorizontal) {
      const axis = horizontal ? 0 : 1, fixed = 1 - axis;
      if (a[fixed] === c[fixed]) cost += Math.max(0, Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis])) - Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]))) * 3;
    } else {
      const [h1, h2, v1, v2] = horizontal ? [a, b, c, d] : [c, d, a, b];
      if (v1[0] > Math.min(h1[0], h2[0]) && v1[0] < Math.max(h1[0], h2[0]) && h1[1] > Math.min(v1[1], v2[1]) && h1[1] < Math.max(v1[1], v2[1])) cost += 40;
    }
  }
  return cost;
}

function route(start, end, boxes, channels, used) {
  const xs = [...new Set([start[0], end[0], ...channels.x, ...boxes.flatMap(box => [box.x, box.x + box.width])])].sort((a, b) => a - b);
  const ys = [...new Set([start[1], end[1], ...channels.y, ...boxes.flatMap(box => [box.y, box.y + box.height])])].sort((a, b) => a - b);
  const width = xs.length, count = width * ys.length;
  const point = index => [xs[index % width], ys[Math.floor(index / width)]];
  const allowed = Array.from({ length: count }, (_, index) => { const [x, y] = point(index); return !boxes.some(box => x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height); });
  const first = ys.indexOf(start[1]) * width + xs.indexOf(start[0]), last = ys.indexOf(end[1]) * width + xs.indexOf(end[0]);
  if (!allowed[first] || !allowed[last]) throw new Error(`Architecture route endpoint is inside an obstacle: ${JSON.stringify({ start, end, blockedStart: !allowed[first], blockedEnd: !allowed[last] })}`);
  const costs = new Float64Array(count * 3).fill(Infinity), previous = new Int32Array(count * 3).fill(-1), queue = new Queue();
  costs[first * 3] = 0; queue.push({ state: first * 3, cost: 0 });
  let final = -1;
  while (queue.items.length) {
    const item = queue.pop();
    if (item.cost !== costs[item.state]) continue;
    const index = Math.floor(item.state / 3), direction = item.state % 3;
    if (index === last) { final = item.state; break; }
    const x = index % width, y = Math.floor(index / width), current = point(index), neighbours = [];
    if (x > 0) neighbours.push([index - 1, 1]);
    if (x + 1 < width) neighbours.push([index + 1, 1]);
    if (y > 0) neighbours.push([index - width, 2]);
    if (y + 1 < ys.length) neighbours.push([index + width, 2]);
    for (const [next, nextDirection] of neighbours) {
      if (!allowed[next]) continue;
      const target = point(next);
      if (boxes.some(box => segmentEnters(current, target, box))) continue;
      const cost = item.cost + Math.abs(current[0] - target[0]) + Math.abs(current[1] - target[1]) + (direction && direction !== nextDirection ? 52 : 0) + congestion(current, target, used);
      const state = next * 3 + nextDirection;
      if (cost >= costs[state]) continue;
      costs[state] = cost; previous[state] = item.state; queue.push({ state, cost });
    }
  }
  if (final < 0) throw new Error('No unobstructed architecture route');
  const points = [];
  for (let state = final; state >= 0; state = previous[state]) points.push(point(Math.floor(state / 3)));
  return compact(points.reverse());
}

function port(node, side, index, count) {
  const fraction = (index + 1) / (count + 1), end = boxEnd(node);
  if (side === 'left' || side === 'right') return [side === 'left' ? node.x : end.right, round(node.y + 32 + (node.height - 64) * fraction)];
  return [round(node.x + 32 + (node.width - 64) * fraction), side === 'top' ? node.y : end.bottom];
}
function outside(point, side, distance = 30) {
  return [point[0] + (side === 'right' ? distance : side === 'left' ? -distance : 0), point[1] + (side === 'bottom' ? distance : side === 'top' ? -distance : 0)];
}

function labelFor(edge, points, occupied, width, height, otherSegments, compact = false) {
  const title = compact ? [] : wrap(edge.title, 168, 17, 2);
  const protocol = String(edge.protocolLabel ?? edge.protocol ?? '').trim();
  if (!protocol || textWidth(protocol, 15) > 168) throw new Error(`Architecture edge ${edge.id} requires a concise protocol label`);
  const box = { width: compact ? 220 : 220, height: compact ? 48 : title.length > 1 ? 82 : 60 };
  const candidates = [];
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1], b = points[index], length = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    const ratios = [...new Set([.5, .25, .75, ...Array.from({ length: Math.max(2, Math.ceil(length / 28)) }, (_, step) => (step + .5) / Math.max(2, Math.ceil(length / 28)))])];
    for (const ratio of ratios) {
      const x = a[0] + (b[0] - a[0]) * ratio, y = a[1] + (b[1] - a[1]) * ratio;
      for (const shift of [0, -1, 1]) {
        const candidate = { x: round(x - box.width / 2 + (a[0] === b[0] ? shift * (box.width / 2 + 8) : 0)), y: round(y - box.height / 2 + (a[1] === b[1] ? shift * (box.height / 2 + 8) : 0)), ...box };
        if (candidate.x < 16 || candidate.y < 194 || candidate.x + box.width > width - 16 || candidate.y + box.height > height - 110) continue;
        if (occupied.some(other => overlap(inflate(candidate, 5), other))) continue;
        const crossings = otherSegments.filter(([c, d]) => segmentEnters(c, d, inflate(candidate, 3))).length;
        candidates.push({ ...candidate, title, protocol, crossings, score: length - Math.abs(shift) * 80 - Math.abs(ratio - .5) * 30 - crossings * 10000 });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
  if (!candidates.length) throw new Error(`No readable label position for architecture edge ${edge.id}`);
  return candidates[0];
}

/** A guided step is a small graph, not a tall excerpt of the complete deployment. */
function layoutFlow(model) {
  const columns = Math.min(3, model.nodes.length), margin = 70, cardWidth = 330, gapX = 270;
  const rowHeight = model.layoutGap ?? 260, top = 278;
  const width = margin * 2 + columns * cardWidth + Math.max(0, columns - 1) * gapX;
  const nodes = model.nodes.map((node, index) => {
    const column = index % columns, row = Math.floor(index / columns);
    const element = card(node, margin + column * (cardWidth + gapX), top + row * rowHeight, cardWidth, true);
    return { ...element, height: 140, column, row, text: { ...element.text, titleY: 77 } };
  });
  const rows = Math.ceil(nodes.length / columns), legendColumns = Math.max(1, Math.floor((width - 140) / 570)), legendRows = Math.ceil(4 / legendColumns);
  const height = top + (rows - 1) * rowHeight + 140 + 100;
  const byId = new Map(nodes.map(node => [node.id, node])), ports = new Map();
  const edges = model.edges.map((edge, index) => {
    const from = byId.get(edge.from), to = byId.get(edge.to);
    if (!from || !to || from === to) throw new Error(`Invalid flow endpoints: ${edge.id}`);
    const horizontal = from.row === to.row;
    const fromSide = horizontal ? (to.column > from.column ? 'right' : 'left') : (to.row > from.row ? 'bottom' : 'top');
    const toSide = horizontal ? (to.column > from.column ? 'left' : 'right') : (to.row > from.row ? 'top' : 'bottom');
    const result = { ...edge, number: edge.number ?? index + 1, fromSide, toSide };
    for (const [node, side, endpoint] of [[from, fromSide, 'start'], [to, toSide, 'end']]) {
      const key = `${node.id}:${side}`; if (!ports.has(key)) ports.set(key, []);
      ports.get(key).push({ edge: result, endpoint, node, side });
    }
    return result;
  });
  for (const attachments of ports.values()) attachments.forEach((entry, index) => { entry.edge[entry.endpoint] = port(entry.node, entry.side, index, attachments.length); });
  const channels = { x: [24, width - 24], y: [246, height - 142] };
  for (const node of nodes) { channels.x.push(node.x - 32, node.x + node.width + 32); channels.y.push(node.y - 32, node.y + node.height + 32); }
  const obstacles = nodes.map(node => inflate(node, 20)), used = [];
  for (const edge of edges) {
    edge.points = compact([edge.start, ...route(outside(edge.start, edge.fromSide), outside(edge.end, edge.toSide), obstacles, channels, used), edge.end]);
    for (let index = 1; index < edge.points.length; index++) {
      if (nodes.some(node => node.id !== edge.from && node.id !== edge.to && segmentEnters(edge.points[index - 1], edge.points[index], node))) throw new Error(`Flow ${edge.id} crosses a node`);
      used.push([edge.points[index - 1], edge.points[index]]);
    }
    edge.path = edge.points.map(([x, y], index) => `${index ? 'L' : 'M'} ${round(x)} ${round(y)}`).join(' ');
  }
  const occupied = [...nodes];
  for (const edge of [...edges].sort((a, b) => a.points.length - b.points.length || a.number - b.number)) {
    try { edge.label = labelFor(edge, edge.points, occupied, width, height, edges.filter(other => other !== edge).flatMap(other => other.points.slice(1).map((point, index) => [other.points[index], point])), true); }
    catch (error) { if (!error.message.startsWith('No readable label position') || rowHeight >= 380) throw error; return layoutFlow({ ...model, layoutGap: rowHeight + 40 }); }
    occupied.push(edge.label);
  }
  return { width, height, nodes, edges, groups: [], scopes: [], legendColumns, legendRows };
}

/** Coordinates are SVG user units. `nodes` and `edges` retain the original model fields. */
export function layoutArchitecture(model) {
  if (model.flow) return layoutFlow(model);
  const isCompact = model.compact === true;
  const margin = 70, columnWidth = isCompact ? 250 : 570, gutter = 230, top = 278, gap = model.layoutGap ?? (isCompact ? 104 : 156);
  if (!Array.isArray(model.groups) || !Array.isArray(model.nodes) || !Array.isArray(model.edges)) throw new Error('Architecture requires groups, nodes and edges');
  const ids = new Set();
  for (const item of [...model.groups, ...model.nodes, ...model.edges]) {
    if (!item.id || ids.has(item.id)) throw new Error(`Duplicate or missing architecture ID: ${item.id}`);
    ids.add(item.id);
  }
  const knownNodes = new Map(model.nodes.map(node => [node.id, node]));
  const groupIds = new Set(model.groups.map(group => group.id));
  for (const node of model.nodes) {
    if (!groupIds.has(node.group)) throw new Error(`Unknown group for ${node.id}`);
    if (node.owner && (!knownNodes.has(node.owner) || knownNodes.get(node.owner).group !== node.group || knownNodes.get(node.owner).owner)) throw new Error(`Invalid process owner for ${node.id}`);
  }
  const nodes = [], scopes = [];
  const groups = model.groups.map((group, column) => {
    const x = margin + column * (columnWidth + gutter);
    let y = top;
    for (const node of model.nodes.filter(node => node.group === group.id && !node.owner)) {
      const children = model.nodes.filter(child => child.owner === node.id);
      if (children.length) {
        const start = y;
        y += 42;
        const parent = card(node, x + 16, y, columnWidth - 32, isCompact); nodes.push({ ...parent, column });
        y += parent.height + gap;
        for (const child of children) {
          const element = card(child, x + 42, y, columnWidth - 84, isCompact); nodes.push({ ...element, column });
          y += element.height + gap;
        }
        y -= gap - 24;
        scopes.push({ id: `scope-${node.id}`, owner: node.id, title: `Dentro de ${node.title} · mismo proceso`, x, y: start, width: columnWidth, height: y - start });
        y += gap;
      } else {
        const element = card(node, x + 16, y, columnWidth - 32, isCompact); nodes.push({ ...element, column });
        y += element.height + gap;
      }
    }
    return { ...group, column, x: x - 16, y: 176, width: columnWidth + 32, height: y - 176 - gap + 28 };
  });
  const width = margin * 2 + model.groups.length * columnWidth + (model.groups.length - 1) * gutter;
  const legendColumns = Math.max(1, Math.floor((width - 140) / 570));
  const legendRows = Math.ceil(4 / legendColumns);
  const height = Math.max(...groups.map(group => group.y + group.height)) + 170 + (legendRows - 1) * 42;
  const byId = new Map(nodes.map(node => [node.id, node]));
  const ports = new Map();
  const edges = model.edges.map((edge, index) => {
    const from = byId.get(edge.from), to = byId.get(edge.to);
    if (!from || !to || from === to) throw new Error(`Invalid endpoints for ${edge.id}`);
    const direction = Math.sign(to.column - from.column);
    let fromSide, toSide;
    if (direction) { fromSide = direction > 0 ? 'right' : 'left'; toSide = direction > 0 ? 'left' : 'right'; }
    else {
      const between = nodes.some(node => node.column === from.column && node !== from && node !== to && node.y > Math.min(from.y, to.y) && node.y < Math.max(from.y, to.y));
      if (!between) { fromSide = to.y > from.y ? 'bottom' : 'top'; toSide = to.y > from.y ? 'top' : 'bottom'; }
      else { fromSide = index % 2 ? 'left' : 'right'; toSide = fromSide; }
    }
    const result = { ...edge, number: edge.number ?? index + 1, fromSide, toSide };
    for (const [node, side, endpoint] of [[from, fromSide, 'start'], [to, toSide, 'end']]) {
      const key = `${node.id}:${side}`;
      if (!ports.has(key)) ports.set(key, []);
      ports.get(key).push({ edge: result, endpoint, node, side });
    }
    return result;
  });
  for (const attachments of ports.values()) attachments.forEach((entry, index) => { entry.edge[entry.endpoint] = port(entry.node, entry.side, index, attachments.length); });
  const channels = { x: [24, width - 24], y: [262, height - 142] };
  for (const group of groups) for (const offset of [-86, -54, -22, group.width + 22, group.width + 54, group.width + 86]) { const x = group.x + offset; if (x > 16 && x < width - 16) channels.x.push(x); }
  for (const node of nodes) channels.y.push(node.y - 42, node.y + node.height + 42);
  const headings = [...groups.map(group => ({ x: group.x, y: group.y, width: group.width, height: 86 })), ...scopes.map(scope => ({ ...scope, height: 34 }))];
  const obstacles = [...nodes.map(node => inflate(node, 20)), ...headings];
  const used = [];
  for (const edge of edges) {
    const start = outside(edge.start, edge.fromSide), end = outside(edge.end, edge.toSide);
    const points = compact([edge.start, ...route(start, end, obstacles, channels, used), edge.end]);
    for (let index = 1; index < points.length; index++) {
      const blockers = nodes.filter(node => node.id !== edge.from && node.id !== edge.to);
      if (blockers.some(node => segmentEnters(points[index - 1], points[index], node))) throw new Error(`Route ${edge.id} crosses a node`);
      used.push([points[index - 1], points[index]]);
    }
    edge.points = points;
    edge.path = points.map(([x, y], index) => `${index ? 'L' : 'M'} ${round(x)} ${round(y)}`).join(' ');
  }
  const occupied = [...nodes, ...headings];
  for (const edge of [...edges].sort((a, b) => a.points.length - b.points.length || a.number - b.number)) {
    const otherSegments = edges.filter(other => other.id !== edge.id).flatMap(other => other.points.slice(1).map((point, index) => [other.points[index], point]));
    try {
      edge.label = labelFor(edge, edge.points, occupied, width, height, otherSegments, isCompact);
    } catch (error) {
      if (!error.message.startsWith('No readable label position') || gap >= 316) throw error;
      // Reflow the whole projection deterministically; never relax collision checks.
      return layoutArchitecture({ ...model, layoutGap: gap + 40 });
    }
    occupied.push(edge.label);
  }
  return { width, height, groups, scopes, nodes, edges, legendColumns, legendRows };
}

function textLines(lines, x, y, size, lineHeight, className) {
  return `<text class="${className}" x="${x}" y="${y}" font-size="${size}">${lines.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${escape(line)}</tspan>`).join('')}</text>`;
}
function accessibility(item, kind, interactive) {
  const description = kind === 'node'
    ? [item.technology, item.summary, item.description, ...(item.responsibilities ?? []).map(value => `Responsabilidad: ${value}`), ...(item.data ?? []).map(value => `Datos: ${value}`), ...(item.failure ?? []).map(value => `Fallo: ${value}`)].filter(Boolean).join('. ')
    : [item.protocol, item.summary, item.description].filter(Boolean).join('. ');
  const label = kind === 'node' ? `${item.title}. ${STATUS[item.status] ?? item.status}. ${item.summary}` : `Relación ${item.number}: ${item.title}. ${item.from} a ${item.to}. ${item.protocol ?? ''}`;
  return `data-item-id="${escape(item.id)}" data-item-kind="${kind}"${interactive ? ` tabindex="0" role="button" aria-label="${escape(label)}"` : ''}><title>${escape(item.title)}</title><desc>${escape(description)}</desc>`;
}

/** Produces an SVG usable both inline (selectable) and as a standalone download. */
export function renderArchitecture(model, { interactive = false } = {}) {
  const layout = layoutArchitecture(model);
  const { width, height } = layout;
  const rectanglePath = box => `M ${box.x} ${box.y} h ${box.width} v ${box.height} h ${-box.width} Z`;
  const masks = `<mask id="architecture-label-clearance" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#fff"/>${layout.edges.map(edge => { const box = inflate(edge.label, 2); return `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="#000"/>`; }).join('')}</mask><clipPath id="architecture-route-hit-area" clipPathUnits="userSpaceOnUse"><path clip-rule="evenodd" fill-rule="evenodd" d="${rectanglePath({ x: 0, y: 0, width, height })} ${[...layout.nodes, ...layout.edges.map(edge => inflate(edge.label, 1))].map(rectanglePath).join(' ')}"/></clipPath>`;
  const definitions = `<defs><style>
    .architecture-svg{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172B49;background:#fff}
    .architecture-title,.architecture-node-title,.architecture-group-title{font-weight:700;fill:#172B49}
    .architecture-summary,.architecture-tech{fill:#435771}.architecture-tech{font-weight:500}
    .architecture-kind{font-weight:700;letter-spacing:1px;fill:#536984}.architecture-status{font-weight:600;fill:#64748B}
    .architecture-node-box{fill:#fff;stroke:#B4C5E3;stroke-width:2}.architecture-node[data-status="conditional"] .architecture-node-box,.architecture-node[data-status="unresolved"] .architecture-node-box{stroke-dasharray:8 5}
    .architecture-node[data-node-kind="app"] .architecture-node-box{stroke:#0545BA;stroke-width:3}.architecture-node[data-node-kind="data"] .architecture-node-box{fill:#F5F2FC;stroke:#9D89C8}
    .architecture-node[data-node-kind="external"] .architecture-node-box{fill:#F7F8FA;stroke:#AAB6C7}.architecture-node[data-status="unresolved"] .architecture-node-box{fill:#FFFCF5;stroke:#C5A256}
    .architecture-node[data-status="conditional"] .architecture-status{fill:#825D13}.architecture-node[data-status="unresolved"] .architecture-status{fill:#825D13}
    .architecture-edge-line{fill:none;stroke-width:2.6;stroke-linejoin:round;stroke-linecap:round}.architecture-edge-hit{fill:none;stroke:transparent;stroke-width:26;pointer-events:stroke}
    .architecture-edge-label{fill:#fff;stroke:#D4DDEB;stroke-width:1.4}.architecture-label-text{fill:#243B5A;font-weight:600}.architecture-label-protocol{fill:#435771;font-weight:500}.architecture-label-number{fill:#fff;font-weight:700}
    [data-item-id]{outline:none}[role="button"]{cursor:pointer}
    .architecture-node:is(:focus-visible,.is-selected,[aria-pressed="true"],[data-selected="true"]) .architecture-node-box{stroke:#0545BA;stroke-width:5;fill:#E9F0FE}
    .architecture-edge:is(:focus-visible,.is-selected,[aria-pressed="true"],[data-selected="true"]) .architecture-edge-line{stroke-width:5}
    .architecture-edge:is(:focus-visible,.is-selected,[aria-pressed="true"],[data-selected="true"]) .architecture-edge-label{stroke:#0545BA;stroke-width:3;fill:#E9F0FE}
    .architecture-node:is(.is-highlighted,.is-related) .architecture-node-box{stroke-width:4;stroke:#0545BA}.architecture-edge:is(.is-highlighted,.is-related) .architecture-edge-line{stroke-width:4}
    [data-item-id].is-muted{opacity:.2}
  </style>${masks}${Object.entries(COLORS).map(([mode, color]) => `<marker id="architecture-arrow-${mode}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M 1 1 L 11 6 L 1 11 Z" fill="${color}"/></marker>`).join('')}</defs>`;
  const groups = layout.groups.map(group => `<g class="architecture-group"><rect x="${group.x}" y="${group.y}" width="${group.width}" height="${group.height}" rx="18" fill="#F8FAFE" stroke="#DCE5F3" stroke-width="2"/>${textLines(wrap(group.title, group.width - 44, model.compact ? 22 : 25, 2), group.x + 22, group.y + 34, model.compact ? 22 : 25, 27, 'architecture-group-title')}${model.compact ? '' : textLines(wrap(group.subtitle, group.width - 44, 18, 2), group.x + 22, group.y + 61, 18, 23, 'architecture-summary')}</g>`).join('');
  const scopes = layout.scopes.map(scope => `<g class="architecture-scope"><rect x="${scope.x}" y="${scope.y}" width="${scope.width}" height="${scope.height}" rx="12" fill="#F0F5FF" stroke="#ADC3EB" stroke-width="2"/>${textLines(wrap(scope.title, scope.width - 24, 16, 1), scope.x + 12, scope.y + 26, 16, 22, 'architecture-kind')}</g>`).join('');
  const nodes = layout.nodes.map(node => `<g class="architecture-node" data-node-kind="${escape(node.kind)}" data-status="${escape(node.status)}"${node.owner ? ` data-owner="${escape(node.owner)}"` : ''} ${accessibility(node, 'node', interactive)}<rect class="architecture-node-box" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="12"/>${textLines([model.compact && node.kind === 'external' ? 'EXTERNO' : KINDS[node.kind] ?? node.kind], node.x + 22, node.y + 27, 13, 18, 'architecture-kind')}<text class="architecture-status" x="${node.x + node.width - 22}" y="${node.y + 27}" font-size="14" text-anchor="end">${escape(STATUS[node.status] ?? node.status)}</text>${model.flow ? textLines([node.owner ? `Dentro de ${node.owner}` : model.groups.find(group => group.id === node.group)?.title ?? ''], node.x + 22, node.y + 48, 13, 18, 'architecture-tech') : ''}${textLines(node.text.title, node.x + 22, node.y + node.text.titleY, model.compact ? 26 : 24, 30, 'architecture-node-title')}${textLines(node.text.technology, node.x + 22, node.y + node.text.technologyY, 18, 23, 'architecture-tech')}${textLines(node.text.summary, node.x + 22, node.y + node.text.summaryY, 19, 25, 'architecture-summary')}</g>`).join('');
  const edges = layout.edges.map(edge => {
    const label = edge.label, color = COLORS[edge.mode] ?? COLORS.sync;
    return `<g class="architecture-edge" data-from="${escape(edge.from)}" data-to="${escape(edge.to)}" data-relation="${escape(edge.relation ?? 'communication')}" data-mode="${escape(edge.mode)}" data-status="${escape(edge.status)}" ${accessibility(edge, 'edge', interactive)}<path class="architecture-edge-hit" d="${edge.path}" clip-path="url(#architecture-route-hit-area)"/><path class="architecture-edge-line" d="${edge.path}" stroke="${color}"${edge.mode === 'async' || edge.status !== 'proposed' ? ' stroke-dasharray="9 6"' : ''} ${edge.relation === 'evaluation' ? '' : `marker-end="url(#architecture-arrow-${edge.mode in COLORS ? edge.mode : 'sync'})"`} mask="url(#architecture-label-clearance)" pointer-events="none"/><rect class="architecture-edge-label" x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" rx="9"/><rect x="${label.x + 7}" y="${label.y + (label.height - 26) / 2}" width="29" height="26" rx="6" fill="${color}"/><text class="architecture-label-number" x="${label.x + 21.5}" y="${label.y + label.height / 2 + 5.5}" text-anchor="middle" font-size="14">${edge.number}</text>${textLines(label.title, label.x + 44, label.y + 22, 17, 22, 'architecture-label-text')}${textLines([label.protocol], label.x + 44, model.compact ? label.y + 29 : label.y + 43 + (label.title.length - 1) * 22, model.compact ? 16 : 15, 20, 'architecture-label-protocol')}</g>`;
  }).join('');
  const legendY = height - 116 - (layout.legendRows - 1) * 42;
  const legend = `<g aria-label="Leyenda"><path d="M 70 ${legendY - 25} H ${width - 70}" stroke="#DCE5F3" stroke-width="2"/>${Object.entries(MODES).map(([mode, title], index) => { const x = 70 + index % layout.legendColumns * 570, y = legendY + Math.floor(index / layout.legendColumns) * 42; return `<path d="M ${x} ${y} h 48" stroke="${COLORS[mode]}" stroke-width="3"${mode === 'async' ? ' stroke-dasharray="9 6"' : ''} marker-end="url(#architecture-arrow-${mode})"/><text x="${x + 64}" y="${y + 6}" font-size="19" fill="#435771">${escape(title)}</text>`; }).join('')}${textLines(wrap('Borde discontinuo: condicional o por definir. Asociación sin flecha: evaluación; no asigna emisor.', width - 140, 18, 2), 70, height - 68, 18, 22, 'architecture-summary')}${textLines(wrap(model.flow ? 'Cada componente indica su aplicación. La ficha conserva responsabilidades y contratos completos.' : model.compact ? 'Vista base: componentes agregados a su aplicación. Selecciona una conexión para consultar su propósito y contrato.' : 'Las fronteras internas agrupan componentes del mismo proceso. Las flechas indican quién inicia el contrato.', width - 140, 18, 2), 70, height - 30, 18, 22, 'architecture-summary')}</g>`;
  const flowLegend = `<g aria-label="Leyenda del recorrido"><path d="M 70 ${height - 78} H ${width - 70}" stroke="#DCE5F3"/>${textLines(wrap('Flecha: iniciador del contrato. Sin flecha: evaluación. Los componentes indican su aplicación.', width - 140, 18, 2), 70, height - 47, 18, 22, 'architecture-summary')}${textLines(wrap('Propuesta: cada capacidad conserva sus condiciones de autorización, homologación y recuperación.', width - 140, 16, 2), 70, height - 20, 16, 20, 'architecture-summary')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="architecture-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"${interactive ? ' data-interactive="true" role="group"' : ' role="img"'} aria-labelledby="architecture-title architecture-description"><title id="architecture-title">${escape(model.title)}</title><desc id="architecture-description">${escape(model.subtitle)}. ${layout.nodes.length} elementos y ${layout.edges.length} relaciones. ${interactive ? 'Selecciona un elemento o una relación para consultar sus responsabilidades, datos y fallos.' : 'Diagrama vectorial de la arquitectura propuesta; los componentes y capacidades condicionales se identifican en cada tarjeta.'}</desc>${definitions}<rect width="${width}" height="${height}" fill="#fff"/>${textLines([model.title], 70, 72, 40, 48, 'architecture-title')}${textLines(wrap(model.subtitle, width - 140, 22, 2), 70, 111, 22, 30, 'architecture-summary')}${groups}${scopes}${nodes}${edges}${model.flow ? flowLegend : legend}</svg>`;
}
