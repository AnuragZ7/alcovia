import test from 'node:test';
import assert from 'node:assert/strict';
import { isNewerOrEqual, isStrictlyNewer, mergeVectors } from './versionVector';

test('recognizes a causally newer vector', () => {
  assert.equal(isNewerOrEqual({ A: 2, B: 1 }, { A: 1, B: 1 }), true);
  assert.equal(isStrictlyNewer({ A: 2, B: 1 }, { A: 1, B: 1 }), true);
});

test('recognizes concurrent vectors as incomparable', () => {
  assert.equal(isNewerOrEqual({ A: 2 }, { B: 2 }), false);
  assert.equal(isNewerOrEqual({ B: 2 }, { A: 2 }), false);
});

test('merges causal knowledge without wall-clock timestamps', () => {
  assert.deepEqual(mergeVectors({ A: 2, B: 1 }, { A: 1, C: 4 }), { A: 2, B: 1, C: 4 });
});
