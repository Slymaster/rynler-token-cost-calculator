# SEO pages — usage

Generates static pricing pages (T3) and comparison pages (T1) from `content/prices.json`.
Kept out of `scripts/build.mjs`'s export manifest on purpose: the calculator package stays
exactly as reviewed; the SEO layer is additive.

## Generate

```sh
# preview (noindex calculator + seo pages in dist/, standalone sitemap-seo.xml)
node scripts/build.mjs
node scripts/generate-seo-pages.mjs

# published (sitemap.xml merged with all SEO URLs)
CALCULATOR_SITE_URL=https://rynler.com/ \
CALCULATOR_SOURCE_URL=https://github.com/Slymaster/rynler-token-cost-calculator \
node scripts/build.mjs --publish-ready
node scripts/generate-seo-pages.mjs
```

Output: `dist/models/{model}-pricing.html` (245 pages), `dist/compare/{slug}.html` (25 pages).

## Update prices

`content/prices.json` is compiled from `https://openrouter.ai/api/v1/models` (public, keyless).
Re-fetch and re-run the generator when models change (monthly is plenty). Fields:
`input_per_1m`, `output_per_1m`, optional `cache_read_per_1m` — USD per 1M tokens.

## Add a comparison page

Add a pair to `content/compare-pairs.json` (`a`/`b` = ids from `prices.json`), re-run.
Pairs with unknown ids are skipped silently — check the written count.

## Content layer

`content/articles/` holds the T6 articles for off-site publication (dev.to, Medium,
Hashnode, LinkedIn Articles — no canonical, the parasite page should rank itself).
On-site copies can be added later under `/blog/` with `rel=canonical` to rynler.com.

## Keyword map

`/home/sly/git/rynler-keyword-map.md` — 1,726 harvested queries, classified by page template.
The generator covers the T3 + T1 backbone; T2/T4/T6/T7 templates come next.
