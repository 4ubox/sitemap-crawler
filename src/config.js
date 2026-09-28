const BASE_URL = (process.env.BASE_URL ?? "").trim().replace(/\/+$/, "");
if (!BASE_URL) {
  console.error("error: BASE_URL environment variable is required");
  process.exit(1);
}

export const CFG = {
  base: BASE_URL,
  maxUrlsPerSitemap: envInt("MAX_URLS_PER_SITEMAP", 50_000),
  maxDepth: envInt("MAX_DEPTH", 50),
  timeoutMs: envInt("TIMEOUT_MS", 30_000),
  concurrency: envInt("CONCURRENCY", 10),
  outDir: process.env.OUTPUT_DIR || "output",
  includeDirs: ["1", "true", "yes"].includes((process.env.INCLUDE_DIRS ?? "").toLowerCase()),
  ua: process.env.USER_AGENT || `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:156.0) Gecko/20100101 Firefox/156.0`,
};

function envInt(name, fallback) {
  const v = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
