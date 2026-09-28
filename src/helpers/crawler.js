import { CFG } from "../config.js";
import { parseListingHtml, parseListingJson } from "./parser.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const baseUrl = new URL(CFG.base);
const basePath = baseUrl.pathname.endsWith("/") ? baseUrl.pathname : baseUrl.pathname + "/";

const entries = new Map(); // normalized URL -> { href, size, modified }
const seen = new Set(); // normalized URLs, guarantees one fetch each
const queue = []; // { href, depth }
let ptr = 0;
let inFlight = 0;
let maxDepthReached = 0;
let fetchCount = 0;
let errorCount = 0;

/** Stay inside the served tree: same origin and under the base path. */
function inScope(raw) {
  try {
    const u = new URL(raw);
    if (u.origin !== baseUrl.origin) return false;

    const p = u.pathname;
    return p === baseUrl.pathname || p.startsWith(basePath);
  } catch (e) {
    console.log("🚀 ~ inScope ~ e:", e);
    return false;
  }
}

/** Canonical key for dedupe: strip query string and fragment. */
function normalize(raw) {
  const u = new URL(raw);
  u.hash = "";
  u.search = "";

  return u.toString();
}

function enqueue(raw, depth) {
  if (depth > CFG.maxDepth) return;

  const key = normalize(raw);
  if (seen.has(key)) return;

  seen.add(key);
  queue.push({ href: key, depth });
}

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CFG.timeoutMs);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": CFG.ua, Accept: "text/html,application/json" },
      redirect: "follow",
    });
  } finally {
    clearTimeout(t);
  }
}

async function crawlDir({ href, depth }) {
  maxDepthReached = Math.max(maxDepthReached, depth);

  let res;
  try {
    res = await fetchWithTimeout(href);
    fetchCount++;
  } catch (err) {
    errorCount++;
    console.error(`fetch failed (${err.name}): ${href}`);
    return;
  }
  if (!res.ok) {
    errorCount++;
    console.error(`http ${res.status}: ${href}`);
    return;
  }

  const ct = (res.headers.get("content-type") || "").toLowerCase();
  let links;
  try {
    if (ct.includes("json")) {
      links = parseListingJson(await res.json());
    } else {
      links = parseListingHtml(await res.text());
    }
  } catch (err) {
    errorCount++;
    console.error(`parse failed: ${href} (${err.message})`);
    return;
  }
  if (!links) return;

  for (const link of links) {
    let abs;
    try {
      abs = new URL(link.href, href).toString();
    } catch {
      continue;
    }

    if (!inScope(abs)) continue;

    const key = normalize(abs);
    if (seen.has(key)) continue;

    if (link.isDir) {
      if (CFG.includeDirs && key !== normalize(CFG.base)) {
        entries.set(key, { ...link, href: key });
      }

      enqueue(key, depth + 1);
    } else {
      // ensure the normalized URL wins over any query-string variants
      entries.set(key, { ...link, href: key });
    }
  }
}

export async function crawl() {
  enqueue(CFG.base + "/", 0);

  const workers = Array.from({ length: CFG.concurrency }, async () => {
    for (;;) {
      let item = null;
      if (ptr < queue.length) {
        item = queue[ptr++];
        inFlight++;
      } else if (inFlight === 0) {
        break;
      } else {
        await sleep(50);
        continue;
      }
      try {
        await crawlDir(item);
      } catch (err) {
        errorCount++;
        console.error(`crawl error: ${item.href} (${err.message})`);
      } finally {
        inFlight--;
      }
    }
  });

  await Promise.all(workers);

  const stats = {
    maxDepthReached,
    pagesFetched: seen.size,
    fetchCount,
    errorCount,
  };

  return { entries, stats };
}
