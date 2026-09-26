// Rates and token counts are supplied by the reader, never provider defaults.
export function calculateTokenCost({ inputTokens, outputTokens, inputRate, outputRate }) {
  for (const tokens of [inputTokens, outputTokens]) {
    if (!Number.isSafeInteger(tokens) || tokens < 0) throw new Error('Token counts must be non-negative whole numbers.');
  }
  for (const rate of [inputRate, outputRate]) {
    if (!Number.isFinite(rate) || rate < 0) throw new Error('Rates must be finite, non-negative numbers.');
  }
  const input = inputTokens / 1_000_000 * inputRate;
  const output = outputTokens / 1_000_000 * outputRate;
  const total = input + output;
  if (!Number.isFinite(total)) throw new Error('Values are too large to calculate.');
  if ((inputTokens > 0 && inputRate > 0 && input === 0) || (outputTokens > 0 && outputRate > 0 && output === 0)) throw new Error('Values are too small to represent.');
  return { input, output, total };
}

export function formatUsd(value) {
  if (value > 0 && value < 0.000001) return '< $0.000001';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 6 }).format(value);
}
