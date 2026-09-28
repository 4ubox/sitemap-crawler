import he from "he";
import * as cheerio from "cheerio";

const LINK_RE = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
// text between </a> and end of line, e.g. "  28-Sep-2026 12:00   1234" or " -"
const META_RE = /(\d{2}-[A-Za-z]{3}-\d{4}\s+\d{2}:\d{2})\s+([\d-]+)/;

function stripTags(s) {
  return s.replace(/<[^>]*>/g, "").trim();
}

function isSkippable(href, text) {
  if (!href || href.startsWith("#") || href.startsWith("?")) return true;

  const h = href.toLowerCase();
  const t = text.toLowerCase();

  if (h.startsWith("mailto:") || h.startsWith("javascript:")) return true;
  if (href === "../" || text === "../" || t === "parent directory") return true;

  return false;
}

/**
 * Parse nginx autoindex_format json: [{name, type, mtime, size}, ...].
 */
export function parseListingJson(data) {
  if (!Array.isArray(data)) return null;

  const out = [];
  for (const row of data) {
    if (!row || typeof row.name !== "string") continue;

    const type = String(row.type ?? "").toLowerCase();
    const isDir = type === "directory" || type === "dir";
    const href = isDir && !row.name.endsWith("/") ? row.name + "/" : row.name;

    out.push({
      href,
      text: row.name,
      type,
      size: typeof row.size === "number" ? row.size : null,
      isDir,
      modified: row.mtime,
    });
  }
  return out;
}

/**
 * Parse one nginx autoindex HTML page.
 * Returns [{ text, href, type, size, isDir, modified }].
 */
export function parseListingHtml(html) {
  const out = [];

  const $ = cheerio.load(html);
  $("table tr").each((_, row) => {
    const $row = $(row);
    const $link = $row.find("a[href]").first();
    if (!$link.length) return;

    const $cells = $row.find("td");
    const $img = $row.find("img[alt]");
    const type = $img.attr("alt").trim();
    const href = $link.attr("href").trim();
    const text = $link.text().trim();
    const isDir = href.endsWith("/") || text.endsWith("/");

    if (isSkippable(href, text)) return;
    if ($cells.length < 4) return;

    out.push({
      text,
      href,
      type: type.replace(/[^A-Z0-9a-z-_]+/g, ""),
      size: $($cells[3]).text().trim(),
      isDir,
      modified: $($cells[2]).text().trim(),
    });
  });

  return out;
}
