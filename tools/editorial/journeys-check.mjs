import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateJourneyTargets } from './journeys.mjs';

const args = process.argv.slice(2);
if (args.length !== 2 || !['--body-file', '--event-file'].includes(args[0])) {
  throw new Error('Usage: journeys-check.mjs --body-file <markdown> | --event-file <json>; run after npm run build.');
}
const raw = fs.readFileSync(args[1], 'utf8');
let body = raw;
if (args[0] === '--event-file') {
  const event = JSON.parse(raw);
  if (event.repository?.full_name !== 'developer-implementos/pos-docs' || event.pull_request?.base?.ref !== 'main') {
    throw new Error('Expected a POS Docs pull request event targeting main.');
  }
  body = event.pull_request.body;
}
const journeys = validateJourneyTargets(body, fileURLToPath(new URL('../../dist/', import.meta.url)));
console.log(`Editorial reader journeys: ${journeys.length} HTML routes/anchors verified in the generated artifact.`);
