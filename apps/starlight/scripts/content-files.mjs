import fs from 'node:fs';
import path from 'node:path';

/** Shared by the writer and inventory: a route may live at the content root. */
export const generatedPageFile = page => `${page.route}${page.flow ? '.mdx' : '.md'}`;

/** Only exact generated outputs are excluded; other files still participate in collision detection. */
export function authoredPageFiles(directory, pages) {
  const generated = new Set(pages.map(generatedPageFile));
  const authored = [];
  const visit = (current, prefix = '') => {
    for (const entry of fs.readdirSync(current, {withFileTypes: true})) {
      const relative = prefix + entry.name;
      if (entry.isDirectory()) visit(path.join(current, entry.name), relative + '/');
      else if (entry.isFile() && /\.mdx?$/.test(relative) && !generated.has(relative)) authored.push(relative);
    }
  };
  visit(directory);
  return authored;
}
