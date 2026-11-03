import fs from 'node:fs';
import { validateOwners } from './policy.mjs';

const owners = fs.readFileSync(new URL('../../.github/CODEOWNERS', import.meta.url), 'utf8');
const result = validateOwners(owners);
console.log(`Editorial ownership: ${result.areas} patterns validated; remote permissions are reviewed separately.`);
