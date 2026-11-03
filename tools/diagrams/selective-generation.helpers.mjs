import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import collection from './collection.json' with { type: 'json' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, 'docs/diagramas-excalidraw');
export const sceneFiles = collection.boards.flatMap(board => ['.excalidraw', '.svg'].map(extension => board.file + extension));

export function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-c4-selection-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const tools = path.join(directory, 'tools/diagrams');
  const output = path.join(directory, 'docs/diagramas-excalidraw');
  fs.mkdirSync(tools, { recursive: true });
  fs.mkdirSync(output, { recursive: true });
  for (const name of ['collection.cjs', 'collection.json', 'generation-selection.cjs', 'render-c4.cjs', 'generate-excalidraw.cjs', 'layout-browser.js', 'excalidraw-browser.js', 'route-layout.js']) {
    fs.copyFileSync(path.join(root, 'tools/diagrams', name), path.join(tools, name));
  }
  fs.cpSync(path.join(root, 'tools/diagrams/models'), path.join(tools, 'models'), { recursive: true });
  fs.cpSync(path.join(source, 'mermaid'), path.join(output, 'mermaid'), { recursive: true });
  for (const name of [...sceneFiles, collection.atlas + '.excalidraw']) fs.copyFileSync(path.join(source, name), path.join(output, name));
  return { directory, tools, output };
}

export function run(directory, script, args, env = {}) {
  return spawnSync(process.execPath, [path.join(directory, 'tools/diagrams', script), ...args], {
    cwd: directory,
    env: {
      ...process.env,
      EXCALIDRAW_RUNTIME: process.env.EXCALIDRAW_RUNTIME || path.join(root, 'tools/diagrams/runtime'),
      PLAYWRIGHT_MODULE_PATH: process.env.PLAYWRIGHT_MODULE_PATH || path.join(root, 'apps/starlight/node_modules/playwright'),
      ...env,
    },
    encoding: 'utf8', timeout: 180_000,
  });
}
