# Rynler token-cost calculator

A small, browser-only calculator maintained by Rynler. Enter your token counts and current input/output rates in USD per million tokens. The calculator returns the arithmetic, without a provider ranking or built-in prices.

## Method

```
input cost  = input tokens  / 1,000,000 × input rate
output cost = output tokens / 1,000,000 × output rate
total       = input cost + output cost
```

The result is an estimate for the entered quantities. It excludes taxes, minimum purchases, extra provider fees, cache-specific rules, failed requests and retries. Verify a real bill against the provider's usage records. Positive results smaller than the display precision are shown as a threshold, not zero.

Inputs stay in the browser. The calculator makes no API calls and uses no analytics, cookies or stored form data. Hosting providers still handle normal web request metadata. External links open the linked site's normal experience.

## Run and check

Node.js 22 or newer is required for the build and tests. No package installation is needed.

```sh
npm test
npm run build
python3 -m http.server 8080 --directory dist --bind 127.0.0.1
```

The default build is a preview with `noindex`. After reviewing the publication URL and source repository, build the indexed release with:

```sh
CALCULATOR_SITE_URL=https://OWNER.github.io/REPOSITORY/ \
CALCULATOR_SOURCE_URL=https://github.com/OWNER/REPOSITORY \
node scripts/build.mjs --publish-ready
```

Only `dist/` is deployed. The build includes the code, method, license, canonical, robots and sitemap. The repository has a manual GitHub Pages workflow; enable Pages with GitHub Actions as its source before dispatching it. No API credentials are needed.

## Rynler documentation

- [Current pricing method](https://rynler.com/pricing?src=p2-calculator)
- [API reference](https://rynler.com/api-reference)
- [Quickstart](https://rynler.com/docs/quickstart)
- [Service status](https://rynler.com/status)
- [Release notes and RSS](https://rynler.com/changelog)

This is Rynler's own tool, not an independent product evaluation. The test fixtures are synthetic arithmetic examples, not prices or measurements from an API.

## Source files

`calculate.mjs` contains the calculation and validation. `app.mjs` connects it to the accessible HTML form. `tests/calculate.test.mjs` covers the arithmetic and invalid inputs. `scripts/build.mjs` produces the static site from an explicit file list.

## License

MIT. See [LICENSE](LICENSE).

## Evaluate an API before comparing its bill

Read the [complete inference evaluation guide](evaluation/README.md) for request compatibility, workload acceptance, usage reconciliation and evidence boundaries. It contains no measured cross-provider results.
