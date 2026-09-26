import { calculateTokenCost, formatUsd } from './calculate.mjs';
const form = document.getElementById('calc');
const total = document.getElementById('total');
const formula = document.getElementById('formula');
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', () => {
  const names = ['inputTokens', 'outputTokens', 'inputRate', 'outputRate'];
  const raw = Object.fromEntries(names.map(name => [name, form.elements.namedItem(name).value.trim()]));
  if (Object.values(raw).some(value => value === '')) {
    total.textContent = 'Enter all fields'; formula.textContent = ''; return;
  }
  try {
    const result = calculateTokenCost(Object.fromEntries(Object.entries(raw).map(([name, value]) => [name, Number(value)])));
    total.textContent = formatUsd(result.total);
    formula.textContent = `Input ${formatUsd(result.input)} + output ${formatUsd(result.output)}`;
  } catch (error) {
    total.textContent = 'Check your values'; formula.textContent = error.message;
  }
});
