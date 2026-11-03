import manifest from '../../../../data/product-reference/manifest.json';
import branchApi from '../../../../data/product-reference/openapi/branch-api.json';
import countryApi from '../../../../data/product-reference/openapi/country-api.json';
import database from '../../../../data/product-reference/database/schema.json';
import type {ProductBundle} from '../../../../tools/product-reference/bundle.mjs';

// validate-content verifies these exact files and their hashes before Astro runs.
// Static imports keep rendering independent of the bundler's temporary directory.
export const productReference = {
  manifest,
  apis: [{id: 'branch-api', document: branchApi}, {id: 'country-api', document: countryApi}],
  database,
} as Omit<ProductBundle, 'files'>;
