#!/usr/bin/env node
/**
 * generate.js — crawl an nginx autoindex directory tree and emit
 * sitemap XML + JSON.
 *
 * Config via environment (see .env.example):
 *   BASE_URL               (required) root of the nginx-served directory
 *   MAX_URLS_PER_SITEMAP   max urls for a single file              (default 50000)
 *   MAX_DEPTH              max directory depth to descend          (default 50)
 *   CONCURRENCY            parallel HTTP fetches                   (default 10)
 *   TIMEOUT_MS             per-request fetch timeout               (default 30000)
 *   OUTPUT_DIR             where to write results                  (default "out")
 *   INCLUDE_DIRS           "1" to also list directories themselves (default off)
 *   USER_AGENT             HTTP user agent
 *
 * Guarantees:
 *   - query strings and fragments are stripped before URLs are compared,
 *     so each unique URL is fetched exactly once;
 *   - crawling never leaves the base URL's origin/path subtree.
 *
 * Output:
 *   out/sitemap.xml        single sitemap, or a sitemap index when chunked
 *   out/sitemap-00001.xml  chunk files (only when > 50k URLs)
 *   out/sitemap.json       { generated_at, base_url, count, entries[] }
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {} from "./helpers/date.js";
import { createChunks, sitemapXml, sitemapMasterXml } from "./helpers/output.js";
import { crawl } from "./helpers/crawler.js";
import { CFG } from "./config.js";

async function main() {
  const started = Date.now();
  console.log(`Crawling started: ${CFG.base}`, `(depth<=${CFG.maxDepth}, x${CFG.concurrency})`);
  console.log(`please wait...`);

  // all crawling happens here
  const { entries, stats } = await crawl();

  const sorted = [...entries.values()].sort((a, b) => (a?.url < b?.url ? -1 : 1));
  mkdirSync(CFG.outDir, { recursive: true });

  // save as json
  const json = {
    generated_at: new Date().toISOString(),
    base_url: CFG.base,
    count: sorted.length,
    entries: sorted.map((e) => ({
      ...e,
      title: e.href,
    })),
  };

  writeFileSync(join(CFG.outDir, "sitemap.json"), JSON.stringify(json, null, 2) + "\n");

  // save as xml
  const chunks = createChunks(sorted, CFG.maxUrlsPerSitemap);
  // records <= 50,000, hence single file
  if (chunks.length <= 1) {
    writeFileSync(join(CFG.outDir, "sitemap.xml"), sitemapXml(sorted));
  }
  // records > 50,000, hence sub-file with a master file
  else {
    const names = chunks.map((_, i) => `sitemap-${String(i + 1).padStart(5, "0")}.xml`);
    chunks.forEach((c, i) => writeFileSync(join(CFG.outDir, names[i]), sitemapXml(c)));

    // sitemap.xml becomes the index, so one entry point always exists
    writeFileSync(join(CFG.outDir, "sitemap.xml"), sitemapMasterXml(names));
  }

  const secs = ((Date.now() - started) / 1000).toFixed(1);

  console.log(
    //
    `DONE:`,
    `${sorted.length} urls,`,
    `${stats.pagesFetched} pages fetched,`,
    `max-depth ${stats.maxDepthReached},`,
    `took ${secs}s,`,
    `${stats.errorCount} errors,`,
    `saved at '${CFG.outDir}/'`,
  );

  // modified = parseNginxDate(mm[1]);
  // size = mm[2] === "-" ? null : parseInt(mm[2], 10);
  // if (!Number.isFinite(size)) size = null;
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
