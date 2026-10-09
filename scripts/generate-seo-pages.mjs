// SEO page generator — pricing pages (T3) and comparison pages (T1).
// Zero dependencies. Reads content/prices.json + content/compare-pairs.json,
// writes static HTML into dist/ (or SEO_OUT_DIR) and merges URLs into sitemap.xml.
// Usage: node scripts/build.mjs --publish-ready && node scripts/generate-seo-pages.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = resolve(process.env.SEO_OUT_DIR || resolve(root, 'dist'));
const site = (process.env.CALCULATOR_SITE_URL || 'https://rynler.com/').replace(/\/?$/, '/');

const prices = JSON.parse(readFileSync(resolve(root, 'content/prices.json'), 'utf8'));
const pairs = JSON.parse(readFileSync(resolve(root, 'content/compare-pairs.json'), 'utf8'));
const byId = new Map(prices.models.map((m) => [m.id, m]));

const esc = (t) => String(t).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (n >= 100 ? n.toFixed(2) : n >= 1 ? n.toFixed(2) : n.toFixed(3));
const displayName = (m) => {
  const acronyms = { gpt: 'GPT', api: 'API', llm: 'LLM', nemo: 'Nemo', saba: 'Saba', instruct: 'Instruct', turbo: 'Turbo' };
  const pretty = m.model.split('-').map((w) => (/^\d/.test(w) ? w : acronyms[w.toLowerCase()] || w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  return `${providerName(m.provider)} ${pretty}`;
};
const providerName = (p) => ({ 'x-ai': 'xAI', 'meta-llama': 'Meta Llama', 'mistralai': 'Mistral AI', 'z-ai': 'Z AI', 'moonshotai': 'Moonshot AI', 'qwen': 'Qwen', 'deepseek': 'DeepSeek', 'openai': 'OpenAI', 'anthropic': 'Anthropic', 'google': 'Google', 'cohere': 'Cohere', 'amazon': 'Amazon', 'microsoft': 'Microsoft' }[p] || p);
const year = new Date().getFullYear();

const BASE_CSS = `:root{font:16px system-ui,sans-serif;color:#e9e9e9;background:#101010}*{box-sizing:border-box}body{margin:0;padding:clamp(20px,5vw,60px)}main{max-width:860px;margin:auto}h1{font-size:clamp(28px,4.5vw,44px);line-height:1.15}h2{margin-top:2.2em}p,li{line-height:1.65;color:#bcbcbc}a{color:#b8d4ff}nav.crumbs{font-size:13px;color:#888}table{border-collapse:collapse;width:100%;margin:18px 0}td,th{border:1px solid #555;padding:11px 12px;text-align:left}th{background:#1a1a1a}form.calc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:26px 0}label{font-size:14px;display:flex;flex-direction:column;gap:8px}input{width:100%;font:inherit;color:#fff;background:#1a1a1a;border:1px solid #555;border-radius:6px;padding:11px}input:focus{outline:2px solid #b8d4ff;outline-offset:2px}.result{border:1px solid #555;border-radius:8px;padding:22px;background:#191919;margin:18px 0}.result strong{display:block;font-size:32px;margin:5px 0}.note{font-size:13px;color:#999}footer{margin-top:70px;border-top:1px solid #555;padding-top:24px;font-size:14px}@media(max-width:600px){form.calc{grid-template-columns:1fr}}`;

const page = ({ title, description, canonical, crumbs, body, ld }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="robots" content="index, follow">
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">
<style>${BASE_CSS}</style>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head><body><main>
<nav class="crumbs">${crumbs}</nav>
${body}
<footer>
<p><a href="${site}">Rynler</a> · <a href="${site}models/">All model prices</a> · <a href="${site}compare/">Comparisons</a> · <a href="https://rynler.com/pricing?src=p3-seo">Pricing method</a></p>
<p class="note">Prices compiled on ${esc(prices.fetched_at)} from public provider documentation (${esc(prices.source)}). Rates change: verify against the official price page before committing to a workload. Estimates exclude taxes, platform fees, cache rules, minimum purchases, failures and retries.</p>
</footer>
</main></body></html>
`;

const calculatorForm = (m) => `
<form class="calc" data-in="${m.input_per_1m}" data-out="${m.output_per_1m}" onsubmit="return false">
  <label>Input tokens<input type="number" min="0" step="1" value="1000000" oninput="seoCalc(this.form)"></label>
  <label>Output tokens<input type="number" min="0" step="1" value="250000" oninput="seoCalc(this.form)"></label>
  <label>Input rate USD / 1M tokens<input type="number" min="0" step="any" value="${m.input_per_1m}" oninput="seoCalc(this.form)"></label>
  <label>Output rate USD / 1M tokens<input type="number" min="0" step="any" value="${m.output_per_1m}" oninput="seoCalc(this.form)"></label>
</form>
<div class="result" aria-live="polite"><span>Estimated token cost in USD</span><strong class="total">—</strong><span class="formula"></span></div>
<script>
function seoCalc(f){const v=n=>parseFloat(f.querySelector('input:nth-of-type('+n+')',f).closest('label').querySelector('input').value)||0;
const ins=parseFloat(f.querySelectorAll('input')[0].value)||0, outs=parseFloat(f.querySelectorAll('input')[1].value)||0;
const ri=parseFloat(f.querySelectorAll('input')[2].value)||0, ro=parseFloat(f.querySelectorAll('input')[3].value)||0;
const t=ins*ri/1e6+outs*ro/1e6;
const box=f.nextElementSibling; box.querySelector('.total').textContent=isFinite(t)?('$'+(Math.round(t*100)/100).toLocaleString('en-US')):'—';
box.querySelector('.formula').textContent=isFinite(t)?(ins.toLocaleString('en-US')+' × $'+ri+' / 1M + '+outs.toLocaleString('en-US')+' × $'+ro+' / 1M'):'';}
document.querySelectorAll('form.calc').forEach(seoCalc);
</script>`;

const faqLd = (pairsQa) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: pairsQa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

const modelPage = (m) => {
  const name = displayName(m);
  const cacheRow = m.cache_read_per_1m ? `<tr><td>Cached input</td><td>$${money(m.cache_read_per_1m)}</td></tr>` : '';
  const comps = pairs.pairs.filter((p) => p.a === m.id || p.b === m.id).slice(0, 4);
  const compLinks = comps.length ? `<h2>${esc(name)} compared</h2><ul>${comps.map((p) => {
    const other = byId.get(p.a === m.id ? p.b : p.a);
    return other ? `<li><a href="${site}compare/${esc(p.slug)}.html">${esc(displayName(other))} vs ${esc(name)} cost</a></li>` : '';
  }).join('')}</ul>` : '';
  const body = `
<h1>${esc(name)} pricing: $${money(m.input_per_1m)} input, $${money(m.output_per_1m)} output per 1M tokens (${year})</h1>
<p>${esc(name)} is priced per million tokens: <strong>$${money(m.input_per_1m)}</strong> for input (prompt) tokens and <strong>$${money(m.output_per_1m)}</strong> for output (completion) tokens. This page shows the plain arithmetic for your own token quantities, with a calculator you can re-rate at any time.</p>
<h2>${esc(name)} token prices</h2>
<table><thead><tr><th>Billing unit</th><th>USD per 1M tokens</th></tr></thead><tbody>
<tr><td>Input (prompt)</td><td>$${money(m.input_per_1m)}</td></tr>
<tr><td>Output (completion)</td><td>$${money(m.output_per_1m)}</td></tr>
${cacheRow}
</tbody></table>
<p class="note">Compiled ${esc(prices.fetched_at)} · source: ${esc(prices.source)} (${esc(m.id)}). Output tokens cost ${(m.output_per_1m / m.input_per_1m).toFixed(1)}× input tokens on this model.</p>
<h2>${esc(name)} cost calculator</h2>
<p>Enter your own token counts. Inputs stay in this browser; nothing is sent anywhere.</p>
${calculatorForm(m)}
<h2>Worked example</h2>
<p>One million input tokens and 250,000 output tokens cost <strong>$${money(m.input_per_1m + m.output_per_1m * 0.25)}</strong>: 1 × $${money(m.input_per_1m)} + 0.25 × $${money(m.output_per_1m)}. A daily workload of that size costs about $${money((m.input_per_1m + m.output_per_1m * 0.25) * 30)} per month at 30 runs.</p>
${compLinks}
<h2>FAQ</h2>
<ul>
<li><strong>How much does ${esc(name)} cost per million tokens?</strong> $${money(m.input_per_1m)} per 1M input tokens and $${money(m.output_per_1m)} per 1M output tokens.</li>
<li><strong>How is the ${esc(name)} token bill calculated?</strong> input tokens × input rate / 1,000,000 + output tokens × output rate / 1,000,000. Taxes, fees, cache rules and retries are excluded.</li>
<li><strong>Why do output tokens cost more?</strong> Generation is compute-heavy per token; on ${esc(name)} output is ${(m.output_per_1m / m.input_per_1m).toFixed(1)}× the input rate.</li>
</ul>`;
  return page({
    title: `${name} Pricing ${year}: $${money(m.input_per_1m)} / 1M Input Tokens`,
    description: `${name} API pricing per 1M tokens: $${money(m.input_per_1m)} input, $${money(m.output_per_1m)} output. Live cost calculator and worked examples.`,
    canonical: `${site}models/${m.model}-pricing`,
    crumbs: `<a href="${site}">Rynler</a> › <a href="${site}models/">Models</a> › ${esc(name)}`,
    body,
    ld: faqLd([
      [`How much does ${name} cost per million tokens?`, `$${money(m.input_per_1m)} per 1M input tokens and $${money(m.output_per_1m)} per 1M output tokens (compiled ${prices.fetched_at}).`],
      [`How is the ${name} token bill calculated?`, 'input tokens × input rate / 1,000,000 + output tokens × output rate / 1,000,000.'],
      [`Why do output tokens cost more than input tokens?`, `Output generation is compute-heavy per token; on ${name} the output rate is ${(m.output_per_1m / m.input_per_1m).toFixed(1)}× the input rate.`],
    ]),
  });
};

const comparePage = (p) => {
  const a = byId.get(p.a), b = byId.get(p.b);
  if (!a || !b) return null;
  const an = displayName(a), bn = displayName(b);
  const cheapIn = a.input_per_1m <= b.input_per_1m ? a : b;
  const exA = a.input_per_1m + a.output_per_1m * 0.25, exB = b.input_per_1m + b.output_per_1m * 0.25;
  const cheaper = exA <= exB ? an : bn, dear = exA <= exB ? bn : an;
  const diff = Math.abs(exA - exB);
  const body = `
<h1>${esc(an)} vs ${esc(bn)} cost: API pricing compared (${year})</h1>
<p>Plain arithmetic, compiled ${esc(prices.fetched_at)}: ${esc(an)} costs <strong>$${money(a.input_per_1m)} / 1M input</strong> and <strong>$${money(a.output_per_1m)} / 1M output</strong>; ${esc(bn)} costs <strong>$${money(b.input_per_1m)} / 1M input</strong> and <strong>$${money(b.output_per_1m)} / 1M output</strong>.</p>
<h2>Price table</h2>
<table><thead><tr><th>Model</th><th>Input / 1M</th><th>Output / 1M</th><th>1M in + 250k out</th></tr></thead><tbody>
<tr><td><a href="${site}models/${a.model}-pricing.html">${esc(an)}</a></td><td>$${money(a.input_per_1m)}</td><td>$${money(a.output_per_1m)}</td><td>$${money(exA)}</td></tr>
<tr><td><a href="${site}models/${b.model}-pricing.html">${esc(bn)}</a></td><td>$${money(b.input_per_1m)}</td><td>$${money(b.output_per_1m)}</td><td>$${money(exB)}</td></tr>
</tbody></table>
<h2>What the numbers say</h2>
<p>On a mixed workload of 1M input and 250k output tokens, <strong>${esc(cheaper)}</strong> comes out $${money(diff)} cheaper per run than ${esc(dear)}. If your workload is input-heavy (retrieval, classification, long context), compare the input column first — ${esc(cheapIn.model)} has the lower input rate at $${money(cheapIn.input_per_1m)} per 1M. If it is generation-heavy, the output column dominates and the gap flips.</p>
<h2>Cost calculator</h2>
<p>Re-rate the comparison with your own token mix:</p>
${calculatorForm(a)}
<h2>FAQ</h2>
<ul>
<li><strong>Which is cheaper, ${esc(an)} or ${esc(bn)}?</strong> For 1M input + 250k output tokens: $${money(exA)} vs $${money(exB)} — ${esc(cheaper)} is cheaper on that mix.</li>
<li><strong>How much more do output tokens cost?</strong> ${esc(an)}: ${(a.output_per_1m / a.input_per_1m).toFixed(1)}× input. ${esc(bn)}: ${(b.output_per_1m / b.input_per_1m).toFixed(1)}× input.</li>
</ul>`;
  return page({
    title: `${an} vs ${bn} Cost ${year}: API Pricing Compared`,
    description: `${an} vs ${bn} API cost per 1M tokens: $${money(a.input_per_1m)} vs $${money(b.input_per_1m)} input, $${money(a.output_per_1m)} vs $${money(b.output_per_1m)} output. Table + calculator.`,
    canonical: `${site}compare/${p.slug}`,
    crumbs: `<a href="${site}">Rynler</a> › <a href="${site}compare/">Compare</a> › ${esc(an)} vs ${esc(bn)}`,
    body,
    ld: faqLd([
      [`Which is cheaper: ${an} or ${bn}?`, `For 1M input + 250k output tokens: ${an} $${money(exA)} vs ${bn} $${money(exB)} (compiled ${prices.fetched_at}).`],
      [`What is the output-to-input price ratio?`, `${an}: ${(a.output_per_1m / a.input_per_1m).toFixed(1)}×. ${bn}: ${(b.output_per_1m / b.input_per_1m).toFixed(1)}×.`],
    ]),
  });
};

// ---- emit ----
const urls = [];
mkdirSync(resolve(out, 'models'), { recursive: true });
mkdirSync(resolve(out, 'compare'), { recursive: true });

for (const m of prices.models) {
  writeFileSync(resolve(out, 'models', `${m.model}-pricing.html`), modelPage(m));
  urls.push(`${site}models/${m.model}-pricing`);
}
let written = 0;
for (const p of pairs.pairs) {
  const html = comparePage(p);
  if (!html) continue;
  writeFileSync(resolve(out, 'compare', `${p.slug}.html`), html);
  urls.push(`${site}compare/${p.slug}`);
  written++;
}

const sitemapPath = resolve(out, 'sitemap.xml');
if (existsSync(sitemapPath)) {
  const current = readFileSync(sitemapPath, 'utf8');
  const entries = urls.map((u) => `<url><loc>${esc(u)}</loc></url>`).join('');
  const merged = current.includes('</urlset>') ? current.replace('</urlset>', `${entries}</urlset>`) : current + entries + '\n';
  writeFileSync(sitemapPath, merged);
  console.log(`Sitemap merged: +${urls.length} URLs`);
} else {
  writeFileSync(resolve(out, 'sitemap-seo.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${esc(u)}</loc></url>`).join('')}</urlset>\n`);
  console.log('No sitemap.xml in output (preview build) — wrote sitemap-seo.xml instead');
}
console.log(`SEO pages written: ${prices.models.length} pricing + ${written} comparisons -> ${out}`);
