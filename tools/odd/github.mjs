import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { maximumDocumentBytes, parseReference, validateDocument } from './check.mjs';
export class GitHubMetadataError extends Error {
  constructor(status) {
    super(`GitHub metadata request failed with HTTP ${status}`);
    this.name = 'GitHubMetadataError';
    this.status = status;
  }
}

/** Read immutable Git objects as bounded text, never checkout or execute PR content. */
export function createGitHubOddReader({ read, token }) {
  assert.equal(typeof read, 'function', 'A trusted metadata reader is required');
  const trees = new Map();
  const documents = new Map();
  const revisionPattern = /^[a-f0-9]{40}$/;
  async function request(endpoint, context) {
    try {
      return await read(endpoint, token);
    } catch (error) {
      const detail =
        error instanceof GitHubMetadataError ? `HTTP ${error.status}` : 'metadata request failed';
      throw new Error(
        `Cannot read ODD ${context}: ${detail}. Required source access must be available; a denied or missing repository is not an absent document.`,
        { cause: error },
      );
    }
  }
  async function tree(repository, revision) {
    assert.ok(
      ['developer-implementos/pos-platform', 'developer-implementos/pos-docs'].includes(repository),
      'ODD sources must belong to a supported company repository',
    );
    assert.match(revision, revisionPattern, 'ODD sources require a full immutable commit SHA');
    const key = `${repository}@${revision}`;
    if (!trees.has(key))
      trees.set(
        key,
        (async () => {
          const commit = await request(`/repos/${repository}/git/commits/${revision}`, key);
          assert.equal(commit.sha, revision, 'GitHub returned another ODD source commit');
          assert.match(commit.tree?.sha ?? '', revisionPattern, 'ODD source commit has no valid Git tree');
          const result = await request(`/repos/${repository}/git/trees/${commit.tree.sha}?recursive=1`, key);
          assert.equal(result.sha, commit.tree.sha, 'GitHub returned another ODD source tree');
          assert.equal(
            result.truncated,
            false,
            'ODD validation requires a complete Git tree, not a truncated response',
          );
          assert.ok(Array.isArray(result.tree), 'ODD source tree entries are required');
          const entries = new Map();
          for (const entry of result.tree) {
            assert.ok(
              typeof entry.path === 'string' && !entries.has(entry.path),
              'Invalid or duplicate Git tree path',
            );
            entries.set(entry.path, entry);
          }
          return entries;
        })(),
      );
    return trees.get(key);
  }
  async function document(repository, revision, path, { optional = false } = {}) {
    parseReference(path);
    const entries = await tree(repository, revision);
    for (const boundary of ['odd', 'odd/tasks']) {
      const ancestor = entries.get(boundary);
      assert.ok(
        !ancestor || (ancestor.type === 'tree' && ancestor.mode === '040000'),
        'ODD source paths must not traverse symlinks or submodules',
      );
    }
    const entry = entries.get(path);
    if (!entry && optional) return undefined;
    assert.ok(entry, `Required ODD document does not exist at ${repository}@${revision}/${path}`);
    assert.ok(
      entry.type === 'blob' && ['100644', '100755'].includes(entry.mode),
      'ODD source must be a regular file, not a symlink or submodule',
    );
    assert.match(entry.sha, revisionPattern, 'Invalid ODD blob identity');
    assert.ok(
      Number.isSafeInteger(entry.size) && entry.size >= 0 && entry.size <= maximumDocumentBytes,
      'ODD source exceeds 256 KiB or has no bounded size',
    );
    const key = `${repository}:${entry.sha}`;
    if (!documents.has(key))
      documents.set(
        key,
        (async () => {
          const blob = await request(
            `/repos/${repository}/git/blobs/${entry.sha}`,
            `${repository}@${revision}/${path}`,
          );
          assert.equal(blob.sha, entry.sha, 'GitHub returned another ODD source blob');
          assert.equal(blob.encoding, 'base64', 'ODD source blob must use base64 encoding');
          assert.ok(
            typeof blob.content === 'string' && blob.content.length <= maximumDocumentBytes * 2,
            'ODD encoded source exceeds its size limit',
          );
          const bytes = Buffer.from(blob.content, 'base64');
          assert.ok(
            bytes.length <= maximumDocumentBytes && bytes.length === entry.size && bytes.length === blob.size,
            'ODD blob size disagrees with its Git tree',
          );
          const digest = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
          assert.equal(digest, entry.sha, 'ODD blob content does not match its immutable Git identity');
          return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        })(),
      );
    return documents.get(key);
  }
  return { tree, document };
}

export async function validateOddChanges({ source, repository, base, head }) {
  const before = await source.tree(repository, base);
  const after = await source.tree(repository, head);
  for (const boundary of ['odd', 'odd/tasks']) {
    const entry = after.get(boundary);
    assert.ok(
      !entry || (entry.type === 'tree' && entry.mode === '040000'),
      'ODD source directories must not become symlinks or submodules',
    );
  }
  const paths = new Set([...before.keys(), ...after.keys()].filter((path) => path.startsWith('odd/tasks/')));
  for (const path of paths) {
    const previous = before.get(path);
    const current = after.get(path);
    if (previous?.sha === current?.sha && previous?.mode === current?.mode) continue;
    parseReference(path);
    assert.ok(current, `ODD task history must not be removed or moved: ${path}`);
    const text = await source.document(repository, head, path);
    const prior = previous ? await source.document(repository, base, path) : undefined;
    validateDocument(text, { previous: prior });
  }
}
