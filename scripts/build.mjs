import { readFileSync, mkdirSync, copyFileSync, writeFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = resolve(process.env.CALCULATOR_OUT_DIR || resolve(root, 'dist'));
const publish = process.argv.includes('--publish-ready');
const siteArg = process.env.CALCULATOR_SITE_URL;
const sourceArg = process.env.CALCULATOR_SOURCE_URL;
const allowed = new Set(['index.html','app.mjs','calculate.mjs','README.md','LICENSE','robots.txt','sitemap.xml','.nojekyll']);
const allowedDirs = new Set(['models', 'compare', 'calculators', 'blog']);
const indexnowKey = (() => { try { return readFileSync(resolve(root, 'content/indexnow-key.txt'), 'utf8').trim() + '.txt'; } catch { return null; } })();
const allowedExtra = new Set(['sitemap-seo.xml', ...(indexnowKey ? [indexnowKey] : [])]);
if (existsSync(out)) for (const entry of readdirSync(out, { withFileTypes:true })) {
  if (entry.isDirectory() && allowedDirs.has(entry.name)) continue;
  if (entry.isFile() && allowedExtra.has(entry.name)) continue;
  if (!entry.isFile() || !allowed.has(entry.name)) throw new Error(`Unexpected output artifact: ${entry.name}`);
}
let metadata = '';
let robots = 'User-agent: *\nDisallow: /\n';
if (publish) {
  if (!siteArg || !sourceArg) throw new Error('Set CALCULATOR_SITE_URL and CALCULATOR_SOURCE_URL for a reviewed publication.');
  const site = new URL(siteArg), source = new URL(sourceArg);
  for (const url of [site, source]) if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Publication URLs must be plain HTTPS URLs.');
  if (!site.pathname.endsWith('/')) throw new Error('Site URL must end with /.');
  if (source.hostname !== 'github.com') throw new Error('Use the reviewed GitHub source repository URL.');
  const escape = text => text.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[char]);
  metadata = `<link rel="canonical" href="${escape(site.href)}"><meta property="og:type" content="website"><meta property="og:title" content="LLM API token-cost calculator | Rynler"><meta property="og:url" content="${escape(site.href)}"><meta property="og:description" content="Estimate token costs using your own workload and current rates."><link rel="author" href="${escape(source.href)}">`;
  robots = `User-agent: *\nAllow: /\nSitemap: ${site.href}sitemap.xml\n`;
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(site.href)}</loc></url></urlset>\n`);
}
mkdirSync(out, { recursive: true });
if (!publish) rmSync(resolve(out, 'sitemap.xml'), { force: true });
let html = readFileSync(resolve(root, 'index.html'), 'utf8').replace('<!-- release-metadata -->', metadata);
if (publish) html = html.replace('noindex, follow', 'index, follow');
writeFileSync(resolve(out, 'index.html'), html);
for (const file of ['app.mjs', 'calculate.mjs', 'README.md', 'LICENSE']) copyFileSync(resolve(root, file), resolve(out, file));
writeFileSync(resolve(out, 'robots.txt'), robots);
writeFileSync(resolve(out, '.nojekyll'), '');
console.log(`Calculator ${publish ? 'publication' : 'noindex preview'} built: ${out}`);
