// SEO page generator — pricing pages (T3), comparison pages (T1), scenario calculators (T2),
// blog pages (T6), hub pages, and the IndexNow key file.
// Zero dependencies. Reads content/*.json + content/articles/*.md, writes static HTML into
// dist/ (or SEO_OUT_DIR) and merges URLs into sitemap.xml.
// Usage: node scripts/build.mjs --publish-ready && node scripts/generate-seo-pages.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = resolve(process.env.SEO_OUT_DIR || resolve(root, 'dist'));
const site = (process.env.CALCULATOR_SITE_URL || 'https://rynler.com/').replace(/\/?$/, '/');

const prices = JSON.parse(readFileSync(resolve(root, 'content/prices.json'), 'utf8'));
const pairs = JSON.parse(readFileSync(resolve(root, 'content/compare-pairs.json'), 'utf8'));
const scenarios = JSON.parse(readFileSync(resolve(root, 'content/calculator-scenarios.json'), 'utf8'));
const byId = new Map(prices.models.map((m) => [m.id, m]));

const esc = (t) => String(t).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (n >= 100 ? n.toFixed(2) : n >= 1 ? n.toFixed(2) : n.toFixed(3));
const providerName = (p) => ({ 'x-ai': 'xAI', 'meta-llama': 'Meta', 'mistralai': 'Mistral', 'z-ai': 'Z AI', 'moonshotai': 'Moonshot AI', 'qwen': 'Qwen', 'deepseek': 'DeepSeek', 'openai': 'OpenAI', 'anthropic': 'Anthropic', 'google': 'Google', 'cohere': 'Cohere', 'amazon': 'Amazon', 'microsoft': 'Microsoft' }[p] || p);
const displayName = (m) => {
  const acronyms = { gpt: 'GPT', api: 'API', llm: 'LLM', nemo: 'Nemo', saba: 'Saba', instruct: 'Instruct', turbo: 'Turbo', deepseek: 'DeepSeek', qwen: 'Qwen', mistral: 'Mistral', llama: 'Llama', nova: 'Nova', grok: 'Grok', gemini: 'Gemini' };
  const pretty = m.model.split('-').map((w) => (/^\d/.test(w) ? w : acronyms[w.toLowerCase()] || w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  const brand = providerName(m.provider);
  return pretty.toLowerCase().startsWith(brand.toLowerCase()) ? pretty : `${brand} ${pretty}`;
};
const year = new Date().getFullYear();

const BASE_CSS = `:root{font:16px system-ui,sans-serif;color:#e9e9e9;background:#101010}*{box-sizing:border-box}body{margin:0;padding:clamp(20px,5vw,60px)}main{max-width:860px;margin:auto}h1{font-size:clamp(28px,4.5vw,44px);line-height:1.15}h2{margin-top:2.2em}p,li{line-height:1.65;color:#bcbcbc}a{color:#b8d4ff}nav.crumbs{font-size:13px;color:#888}table{border-collapse:collapse;width:100%;margin:18px 0}td,th{border:1px solid #555;padding:11px 12px;text-align:left}th{background:#1a1a1a}form.calc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:26px 0}label{font-size:14px;display:flex;flex-direction:column;gap:8px}input{width:100%;font:inherit;color:#fff;background:#1a1a1a;border:1px solid #555;border-radius:6px;padding:11px}input:focus{outline:2px solid #b8d4ff;outline-offset:2px}.result{border:1px solid #555;border-radius:8px;padding:22px;background:#191919;margin:18px 0}.result strong{display:block;font-size:32px;margin:5px 0}.note{font-size:13px;color:#999}pre{overflow:auto;padding:16px;background:#1a1a1a;border-radius:8px}code{background:#1a1a1a;padding:2px 5px;border-radius:4px}footer{margin-top:70px;border-top:1px solid #555;padding-top:24px;font-size:14px}.hub li{margin:6px 0}@media(max-width:600px){form.calc{grid-template-columns:1fr}}`;

const page = ({ title, description, canonical, crumbs, body, ld }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="robots" content="index, follow">
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">
<style>${BASE_CSS}</style>
${ld ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>` : ''}
</head><body><main>
<nav class="crumbs">${crumbs}</nav>
${body}
<footer>
<p><a href="${site}">Rynler</a> · <a href="${site}models/">All model prices</a> · <a href="${site}compare/">Comparisons</a> · <a href="${site}calculators/">Calculators</a> · <a href="${site}blog/">Blog</a> · <a href="https://rynler.com/pricing?src=p3-seo">Pricing method</a></p>
<p class="note">Prices compiled on ${esc(prices.fetched_at)} from public provider documentation (${esc(prices.source)}). Rates change: verify against the official price page before committing to a workload. Estimates exclude taxes, platform fees, cache rules, minimum purchases, failures and retries.</p>
</footer>
</main></body></html>
`;

const calculatorForm = (m, d = {}) => {
  const inTok = d.inTok ?? 1000000, outTok = d.outTok ?? 250000;
  return `
<form class="calc" onsubmit="return false">
  <label>Input tokens<input type="number" min="0" step="1" value="${inTok}" oninput="seoCalc(this.form)"></label>
  <label>Output tokens<input type="number" min="0" step="1" value="${outTok}" oninput="seoCalc(this.form)"></label>
  <label>Input rate USD / 1M tokens<input type="number" min="0" step="any" value="${m.input_per_1m}" oninput="seoCalc(this.form)"></label>
  <label>Output rate USD / 1M tokens<input type="number" min="0" step="any" value="${m.output_per_1m}" oninput="seoCalc(this.form)"></label>
</form>
<div class="result" aria-live="polite"><span>Estimated token cost in USD</span><strong class="total">—</strong><span class="formula"></span></div>
<script>
function seoCalc(f){const ins=parseFloat(f.querySelectorAll('input')[0].value)||0, outs=parseFloat(f.querySelectorAll('input')[1].value)||0;
const ri=parseFloat(f.querySelectorAll('input')[2].value)||0, ro=parseFloat(f.querySelectorAll('input')[3].value)||0;
const t=ins*ri/1e6+outs*ro/1e6;
const box=f.nextElementSibling; box.querySelector('.total').textContent=isFinite(t)?('$'+(Math.round(t*100)/100).toLocaleString('en-US')):'—';
box.querySelector('.formula').textContent=isFinite(t)?(ins.toLocaleString('en-US')+' × $'+ri+' / 1M + '+outs.toLocaleString('en-US')+' × $'+ro+' / 1M'):'';}
document.querySelectorAll('form.calc').forEach(seoCalc);
</script>`;
};

const faqLd = (qa) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

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

const scenarioPage = (s) => {
  const m = byId.get(s.model_id);
  if (!m) return null;
  const name = displayName(m);
  const perRun = (s.inTok * m.input_per_1m + s.outTok * m.output_per_1m) / 1e6;
  const monthly = perRun * s.runs_per_day * 30;
  const body = `
<h1>${esc(s.title)}</h1>
<p>${esc(s.angle)} Every number below is arithmetic you can inspect and re-rate — your tokens, your rates, your browser.</p>
<h2>Monthly estimate</h2>
<table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>
<tr><td>Model (re-rateable below)</td><td><a href="${site}models/${m.model}-pricing.html">${esc(name)}</a></td></tr>
<tr><td>Tokens per run</td><td>${s.inTok.toLocaleString('en-US')} input + ${s.outTok.toLocaleString('en-US')} output</td></tr>
<tr><td>Cost per run</td><td>$${money(perRun)}</td></tr>
<tr><td>Runs per day</td><td>${s.runs_per_day}</td></tr>
<tr><td><strong>Estimated monthly cost</strong></td><td><strong>$${money(monthly)}</strong> (${s.runs_per_day * 30} runs × $${money(perRun)})</td></tr>
</tbody></table>
<h2>Calculator</h2>
${calculatorForm(m, { inTok: s.inTok, outTok: s.outTok })}
<h2>How this is computed</h2>
<p>The formula is the same for every provider and every workload:</p>
<pre><code>monthly = (input tokens × input rate + output tokens × output rate)
          / 1,000,000 × runs per day × 30</code></pre>
<p>On ${esc(name)} at $${money(m.input_per_1m)} input and $${money(m.output_per_1m)} output per 1M tokens, one run of ${s.inTok.toLocaleString('en-US')} + ${s.outTok.toLocaleString('en-US')} tokens costs $${money(perRun)}. Output tokens are ${(m.output_per_1m / m.input_per_1m).toFixed(1)}× the input rate here, so generation-heavy runs move the number fast.</p>
<h2>Related</h2>
<ul>
<li><a href="${site}models/${m.model}-pricing.html">${esc(name)} pricing page</a></li>
<li><a href="${site}calculators/">More cost calculators</a> · <a href="${site}compare/">Model comparisons</a></li>
</ul>
<h2>FAQ</h2>
<ul>
<li><strong>How much does this workload cost per month?</strong> About $${money(monthly)} at ${s.runs_per_day} runs/day on ${esc(name)} — re-rate with your own numbers in the calculator above.</li>
<li><strong>What drives the number up?</strong> Output tokens (priced ${(m.output_per_1m / m.input_per_1m).toFixed(1)}× input on this model) and context resend in multi-turn workloads.</li>
</ul>`;
  return page({
    title: s.title,
    description: `${s.title.split(':')[0]}: estimate per-run and monthly LLM token costs from real rates. Interactive calculator, formula, and worked numbers.`,
    canonical: `${site}calculators/${s.slug}`,
    crumbs: `<a href="${site}">Rynler</a> › <a href="${site}calculators/">Calculators</a> › ${esc(s.title.split(':')[0])}`,
    body,
    ld: faqLd([
      [`How much does this workload cost per month?`, `About $${money(monthly)} at ${s.runs_per_day} runs/day on ${name} (compiled ${prices.fetched_at}).`],
      [`What is the formula?`, 'monthly = (input tokens × input rate + output tokens × output rate) / 1,000,000 × runs per day × 30.'],
    ]),
  });
};

// Minimal markdown → HTML (headings, paragraphs, lists, code fences, bold/italic/links/code).
const mdToHtml = (md) => {
  const lines = md.split('\n');
  let html = '', inCode = false, inList = false;
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('```')) { html += inCode ? '</code></pre>' : '<pre><code>'; inCode = !inCode; continue; }
    if (inCode) { html += esc(raw) + '\n'; continue; }
    if (/^- /.test(line)) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(line.slice(2))}</li>`; continue; }
    if (inList) { html += '</ul>'; inList = false; }
    if (/^### /.test(line)) { html += `<h3>${inline(line.slice(4))}</h3>`; continue; }
    if (/^## /.test(line)) { html += `<h2>${inline(line.slice(3))}</h2>`; continue; }
    if (/^# /.test(line)) { html += `<h1>${inline(line.slice(2))}</h1>`; continue; }
    if (line === '' || line === '---') continue;
    html += `<p>${inline(line)}</p>`;
  }
  if (inList) html += '</ul>';
  if (inCode) html += '</code></pre>';
  return html;
};

const articlePage = (file) => {
  const raw = readFileSync(resolve(root, 'content/articles', file), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta = {};
  let body = raw;
  if (fm) {
    for (const line of fm[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*"?([^"]*)"?\s*$/);
      if (kv) meta[kv[1]] = kv[2];
    }
    body = fm[2];
  }
  const slug = file.replace(/\.md$/, '');
  const title = meta.title || slug;
  return {
    html: page({
      title,
      description: meta.description || title,
      canonical: `${site}blog/${slug}`,
      crumbs: `<a href="${site}">Rynler</a> › <a href="${site}blog/">Blog</a> › ${esc(title.slice(0, 40))}…`,
      body: `<article>${mdToHtml(body)}</article>
<h2>Keep going</h2>
<ul>
<li><a href="${site}calculators/">Cost calculators</a> · <a href="${site}models/">Model price list</a> · <a href="${site}compare/">Comparisons</a></li>
<li><a href="https://github.com/Slymaster/rynler-token-cost-calculator">The browser-only token-cost calculator</a> — your rates, your counts, no accounts.</li>
</ul>`,
      ld: null,
    }),
    slug,
  };
};

const hubPage = ({ heading, intro, items, canonical, crumbs }) => page({
  title: heading,
  description: intro,
  canonical,
  crumbs,
  body: `<h1>${esc(heading)}</h1><p>${esc(intro)}</p><ul class="hub">${items.join('')}</ul>`,
  ld: null,
});

// ---- emit ----
const urls = [];
mkdirSync(resolve(out, 'models'), { recursive: true });
mkdirSync(resolve(out, 'compare'), { recursive: true });
mkdirSync(resolve(out, 'calculators'), { recursive: true });
mkdirSync(resolve(out, 'blog'), { recursive: true });

for (const m of prices.models) {
  writeFileSync(resolve(out, 'models', `${m.model}-pricing.html`), modelPage(m));
  urls.push(`${site}models/${m.model}-pricing`);
}
let nCompare = 0;
for (const p of pairs.pairs) {
  const html = comparePage(p);
  if (!html) continue;
  writeFileSync(resolve(out, 'compare', `${p.slug}.html`), html);
  urls.push(`${site}compare/${p.slug}`);
  nCompare++;
}
let nScen = 0;
for (const s of scenarios.scenarios) {
  const html = scenarioPage(s);
  if (!html) continue;
  writeFileSync(resolve(out, 'calculators', `${s.slug}.html`), html);
  urls.push(`${site}calculators/${s.slug}`);
  nScen++;
}
const articleFiles = readdirSync(resolve(root, 'content/articles')).filter((f) => f.endsWith('.md'));
for (const file of articleFiles) {
  const { html, slug } = articlePage(file);
  writeFileSync(resolve(out, 'blog', `${slug}.html`), html);
  urls.push(`${site}blog/${slug}`);
}

writeFileSync(resolve(out, 'models', 'index.html'), hubPage({
  heading: `LLM Model Pricing List (${year}) — ${prices.models.length} Models`,
  intro: 'Every model price on this site: input and output rates per million tokens, each with a live calculator. Compiled from public provider documentation.',
  items: prices.models.map((m) => `<li><a href="${site}models/${m.model}-pricing.html">${esc(displayName(m))}</a> — $${money(m.input_per_1m)} in / $${money(m.output_per_1m)} out per 1M</li>`),
  canonical: `${site}models/`,
  crumbs: `<a href="${site}">Rynler</a> › Models`,
}));
urls.push(`${site}models/`);

writeFileSync(resolve(out, 'compare', 'index.html'), hubPage({
  heading: `LLM Cost Comparisons (${year})`,
  intro: 'Pairwise API cost comparisons: input, output and a worked workload for every pair.',
  items: pairs.pairs.map((p) => {
    const a = byId.get(p.a), b = byId.get(p.b);
    return a && b ? `<li><a href="${site}compare/${p.slug}.html">${esc(displayName(a))} vs ${esc(displayName(b))}</a></li>` : '';
  }),
  canonical: `${site}compare/`,
  crumbs: `<a href="${site}">Rynler</a> › Compare`,
}));
urls.push(`${site}compare/`);

writeFileSync(resolve(out, 'calculators', 'index.html'), hubPage({
  heading: `LLM Cost Calculators (${year})`,
  intro: 'Per-use-case cost calculators: coding agents, chat bots, RAG pipelines, monthly budgets. Every page re-rates to your own numbers.',
  items: scenarios.scenarios.map((s) => `<li><a href="${site}calculators/${s.slug}.html">${esc(s.title.split(':')[0])}</a></li>`),
  canonical: `${site}calculators/`,
  crumbs: `<a href="${site}">Rynler</a> › Calculators`,
}));
urls.push(`${site}calculators/`);

writeFileSync(resolve(out, 'blog', 'index.html'), hubPage({
  heading: 'LLM Cost Engineering Blog',
  intro: 'Essays on LLM cost arithmetic, optimization layers and pricing mechanics.',
  items: articleFiles.map((f) => {
    const slug = f.replace(/\.md$/, '');
    return `<li><a href="${site}blog/${slug}.html">${esc(slug.replace(/-/g, ' '))}</a></li>`;
  }),
  canonical: `${site}blog/`,
  crumbs: `<a href="${site}">Rynler</a> › Blog`,
}));
urls.push(`${site}blog/`);

const key = readFileSync(resolve(root, 'content/indexnow-key.txt'), 'utf8').trim();
writeFileSync(resolve(out, `${key}.txt`), key);

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
console.log(`SEO pages: ${prices.models.length} pricing + ${nCompare} comparisons + ${nScen} calculators + ${articleFiles.length} articles + 5 hubs -> ${out}`);
