import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { configuration } from './engram.mjs';

test('memory is private and launch paths are independent of the current working directory', () => {
  const outside = path.resolve('/private-pos-memory');
  const repo = path.resolve('/repository');
  const config = configuration({ platform: 'linux', home: outside, env: {}, repository: repo });
  assert.equal(config.repository, repo);
  assert.ok(config.data.startsWith(outside));
  assert.match(config.executable, /3\.6\.1/);
});
test('rejects relative overrides and memory within the repository', () => {
  const repository = path.resolve('/repository');
  for (const env of [
    { POS_ENGRAM_DATA_DIR: 'relative' },
    { POS_ENGRAM_EXECUTABLE: 'engram' },
    { POS_ENGRAM_DATA_DIR: path.join(repository, '.engram') },
    { POS_ENGRAM_DATA_DIR: repository },
  ]) {
    assert.throws(() =>
      configuration({ platform: 'linux', home: path.resolve('/private'), env, repository }),
    );
  }
});
