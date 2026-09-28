// ------------------------------------------------------------ date helpers

const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Parse nginx autoindex dates like "28-Sep-2026 12:00" -> "2026-09-28". */
export function parseNginxDate(s) {
  const m = /^(\d{2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}):(\d{2})/.exec((s ?? "").trim());
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  const d = new Date(Date.UTC(+m[3], month, +m[1], +m[4], +m[5]));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Best-effort lastmod -> "YYYY-MM-DD" for sitemap <lastmod>. */
export function toLastmod(v) {
  if (v == null) return null;
  if (typeof v === "string") {
    const n = parseNginxDate(v);
    if (n) return n;
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
    return null;
  }
  if (typeof v === "number") {
    const ms = v < 1e12 ? v * 1000 : v; // epoch seconds vs ms
    return new Date(ms).toISOString().slice(0, 10);
  }
  return null;
}
