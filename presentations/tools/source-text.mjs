import { createHash } from 'node:crypto';

/** Git text sources have the same reviewed meaning on LF and CRLF checkouts. */
export const canonicalSourceText = text => text.replace(/\r\n/g, '\n');
export const sourceDigest = text => createHash('sha256').update(canonicalSourceText(text)).digest('hex');
