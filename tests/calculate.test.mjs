import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTokenCost, formatUsd } from '../calculate.mjs';
// Synthetic arithmetic fixtures. These are not Rynler rates or API runs.
test('computes separate input and output costs per million tokens', () => {
  assert.deepEqual(calculateTokenCost({ inputTokens: 1_000_000, outputTokens: 500_000, inputRate: 2, outputRate: 4 }), { input: 2, output: 2, total: 4 });
});
test('accepts zero without turning tiny positive bills into zero', () => {
  assert.equal(calculateTokenCost({ inputTokens: 0, outputTokens: 0, inputRate: 0, outputRate: 0 }).total, 0);
  assert.equal(formatUsd(0), '$0.00');
  assert.equal(formatUsd(1e-9), '< $0.000001');
});
test('rejects fractional, negative, unsafe, non-finite and overflowing inputs', () => {
  const input = { inputTokens: 10, outputTokens: 10, inputRate: 1, outputRate: 1 };
  for (const patch of [{ inputTokens: 1.5 }, { outputTokens: -1 }, { inputTokens: Number.MAX_SAFE_INTEGER + 1 }, { inputRate: NaN }, { outputRate: Infinity }, { inputRate: -1 }, { inputTokens: Number.MAX_SAFE_INTEGER, inputRate: Number.MAX_VALUE }]) {
    assert.throws(() => calculateTokenCost({ ...input, ...patch }));
  }
});
