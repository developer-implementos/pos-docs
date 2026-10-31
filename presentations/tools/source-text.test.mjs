import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceDigest } from './source-text.mjs';

test('reviewed text hashes are stable across Git line endings but detect changed content', () => {
  assert.equal(sourceDigest('# Propuesta\r\nF01 en revisión.\r\n'), sourceDigest('# Propuesta\nF01 en revisión.\n'));
  assert.notEqual(sourceDigest('# Propuesta\nF01 en revisión.\n'), sourceDigest('# Propuesta\nF01 aceptada.\n'));
  assert.notEqual(sourceDigest('campo = 1;\n'), sourceDigest('campo = 2;\n'));
});
