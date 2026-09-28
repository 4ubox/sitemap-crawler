// ---------------------------------------------------------------- output

export function createChunks(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function xmlEscape(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function sitemapXml(urls) {
  const body = [].concat(urls).map((u) =>
    [
      //
      "\t<url>",
      `\t\t<loc>${xmlEscape(u?.href)}</loc>`,
      u?.modified ? `\t\t<lastmod>${u?.modified}</lastmod>` : ``,
      "\t</url>",
    ].join(`\n`),
  );

  return [
    //
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body.join(`\n`),
    `</urlset>`,
  ].join(`\n`);
}

export function sitemapMasterXml(files) {
  const body = [].concat(files).map((f) =>
    [
      //
      `\t<sitemap>`,
      `\t\t<loc>${xmlEscape(f)}</loc>`,
      `\t</sitemap>`,
    ].join(`\n`),
  );

  return [
    //
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body.join("\n"),
    `</sitemapindex>`,
  ].join(`\n`);
}
