import fs from 'node:fs';
import path from 'node:path';
import { readerJourneys } from './policy.mjs';

export function validateJourneyTargets(body, output) {
  const root = fs.realpathSync(output);
  const journeys = readerJourneys(body);
  for (const journey of journeys) {
    const [pathname, anchor] = journey.split('#');
    const target = path.join(root, pathname.slice(1), 'index.html');
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error(`Reader journey has no generated HTML: ${journey}`);
    const realTarget = fs.realpathSync(target);
    const relative = path.relative(root, realTarget);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Reader journey escapes the documentation artifact.');
    if (anchor) {
      const ids = [...fs.readFileSync(realTarget, 'utf8').matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)].map(match => match[2]);
      if (!ids.includes(decodeURIComponent(anchor))) throw new Error(`Reader journey anchor is absent from generated HTML: ${journey}`);
    }
  }
  return journeys;
}
