// IndexNow submission — pings search engines after every deploy.
// The key is not a secret: it must be publicly served at {site}{key}.txt (generator writes it).
// Usage: node scripts/submit-indexnow.mjs   (after generate-seo-pages.mjs, post-deploy is fine)

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const site = (process.env.CALCULATOR_SITE_URL || 'https://slymaster.github.io/rynler-token-cost-calculator/').replace(/\/?$/, '/');
const key = readFileSync(resolve(root, 'content/indexnow-key.txt'), 'utf8').trim();

const prices = JSON.parse(readFileSync(resolve(root, 'content/prices.json'), 'utf8'));
const pairs = JSON.parse(readFileSync(resolve(root, 'content/compare-pairs.json'), 'utf8'));
const scenarios = JSON.parse(readFileSync(resolve(root, 'content/calculator-scenarios.json'), 'utf8'));

const urls = [site, `${site}models/`, `${site}compare/`, `${site}calculators/`];
urls.push(...prices.models.map((m) => `${site}models/${m.model}-pricing`));
urls.push(...pairs.pairs.map((p) => `${site}compare/${p.slug}`));
urls.push(...scenarios.scenarios.map((s) => `${site}calculators/${s.slug}`));
urls.push(`${site}blog/claude-subscription-vs-api-cost`, `${site}blog/five-layers-of-llm-cost-optimization`, `${site}blog/why-output-tokens-cost-more`);

const host = new URL(site).hostname;
const payload = { host, key, keyLocation: `${site}${key}.txt`, urlList: urls.slice(0, 10000) };

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});
console.log(`IndexNow: ${res.status} ${res.statusText} — ${payload.urlList.length} URLs for ${host}`);
if (!res.ok) console.log(await res.text());
