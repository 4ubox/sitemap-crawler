# nginx sitemap crawler

Crawls an nginx autoindex directory tree (full depth) and generates a sitemap
in XML and JSON format. Runs daily via GitHub Actions and publishes the
results to the `sitemap-output` branch.

## How it works

`generate.js` (Node 18+, zero dependencies):

1. Fetches the nginx directory listing at `BASE_URL`.
2. Parses every link and recursively descends into subdirectories.
3. Emits `sitemap.xml` (+ `sitemap-00001.xml` … chunks with a sitemap index
   when there are more than 50,000 URLs) and `sitemap.json`
   (`{ generated_at, base_url, count, entries[] }`).

Guarantees:

- **Query strings and fragments are stripped before comparison**, so each
  unique URL is fetched exactly once (nginx `?C=M;O=D` sort links, `?v=2`
  cache-busters, etc. never cause duplicates).
- Crawling never leaves the base URL's origin/path subtree.
- `lastmod` is parsed from the autoindex date column when present.

## Run locally

```bash
BASE_URL=https://example.com/files node generate.js
# or: cp .env.example .env  (then use a loader of your choice)
```

Optional env vars: `MAX_DEPTH` (default 50), `CONCURRENCY` (default 10),
`TIMEOUT_MS` (default 30000), `OUTPUT_DIR` (default `out`),
`INCLUDE_DIRS=1` to also list directories themselves.

## GitHub setup

1. Push this repo to GitHub.
2. Add a repository secret **`NGINX_BASE_URL`** — the root URL of the
   nginx-served directory (Settings → Secrets and variables → Actions).
3. The workflow `.github/workflows/daily-sitemap.yml` runs every day at
   03:00 UTC (or on demand via *Run workflow*), generates the sitemap, and
   force of habit-free pushes it to the **`sitemap-output`** branch — the
   branch holds only `sitemap.xml` (+ chunks) and `sitemap.json`, ready to
   check or parse.

The workflow only commits when the output actually changed.

## Later: sanitized titles

`sitemap.json` entries already carry a `title` field (currently `null`).
Implement the `toTitle(url)` stub at the top of `generate.js` to derive a
sanitized title from the filename, and it will flow into the JSON output
automatically.
