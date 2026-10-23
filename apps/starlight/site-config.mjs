/** Canonical public location. Preview domains must not become published canonical URLs. */
if (process.env.VERCEL === '1' && !process.env.PUBLIC_SITE_URL) {
  throw new Error('Set PUBLIC_SITE_URL to the approved public HTTPS origin before deploying to Vercel.');
}
const configuredSite = process.env.PUBLIC_SITE_URL || 'https://pos-docs.example.invalid';
const site = new URL(configuredSite);
if (site.protocol !== 'https:' || site.username || site.password || site.pathname !== '/' || site.search || site.hash) {
  throw new Error('PUBLIC_SITE_URL must be an HTTPS origin without a path, credentials, query or fragment.');
}
if (process.env.VERCEL === '1' && (site.hostname === 'invalid' || site.hostname.endsWith('.invalid'))) {
  throw new Error('The reserved local documentation origin cannot be deployed. Configure PUBLIC_SITE_URL.');
}

export const docsOrigin = site.origin;
export const repositoryOrigin = 'https://github.com/developer-implementos/pos-docs';
export const productRepositoryOrigin = 'https://github.com/developer-implementos/pos-platform';
export const productEvidenceOrigins = [productRepositoryOrigin, 'https://github.com/floxcristian/pos-platform'];
export const presentationOrigin = 'https://presentation-gamma-rust.vercel.app';
export const presentationRepository = 'https://github.com/floxcristian/pos-architecture';
