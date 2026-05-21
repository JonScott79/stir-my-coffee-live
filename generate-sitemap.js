const fs = require("fs");
const path = require("path");

const BASE_URL = "https://stirmycoffee.com";
const OUTPUT_DIR = "./";
const LOCATIONS_DIR = path.join(__dirname, "locations");

const MAX_URLS_PER_FILE = 20000;

// 🔥 Today's date
const today = new Date().toISOString().split("T")[0];

// =========================
// MAIN PAGES
// =========================
const mainPages = [
  { loc: `${BASE_URL}/`, priority: "1.0" },
  { loc: `${BASE_URL}/about.html`, priority: "0.8" },
  { loc: `${BASE_URL}/legal.html`, priority: "0.5" }
];

const buildUrl = ({ loc, priority }) => `
  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    ${priority ? `<priority>${priority}</priority>` : ""}
  </url>
`;

const mainXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${mainPages.map(buildUrl).join("")}
</urlset>`;

fs.writeFileSync(`${OUTPUT_DIR}sitemap-main.xml`, mainXml);

// =========================
// LOCATION FILES (REAL FILES)
// =========================
const files = fs.readdirSync(LOCATIONS_DIR);

// Optional: filter only .html files
const htmlFiles = files.filter(f => f.endsWith(".html"));

// Split into chunks
const chunks = [];
for (let i = 0; i < htmlFiles.length; i += MAX_URLS_PER_FILE) {
  chunks.push(htmlFiles.slice(i, i + MAX_URLS_PER_FILE));
}

const sitemapFiles = [];

// =========================
// GENERATE LOCATION SITEMAPS
// =========================
chunks.forEach((chunk, index) => {
  const fileName = `sitemap-locations-${index + 1}.xml`;

  const urls = chunk.map(file => `
    <url>
      <loc>${BASE_URL}/locations/${file}</loc>
      <lastmod>${today}</lastmod>
    </url>
  `).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`;

  fs.writeFileSync(`${OUTPUT_DIR}${fileName}`, xml);
  sitemapFiles.push(fileName);
});

// =========================
// SITEMAP INDEX
// =========================
const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <sitemap>
    <loc>${BASE_URL}/sitemap-main.xml</loc>
  </sitemap>

  ${sitemapFiles.map(file => `
  <sitemap>
    <loc>${BASE_URL}/${file}</loc>
  </sitemap>
  `).join("")}

</sitemapindex>`;

fs.writeFileSync(`${OUTPUT_DIR}sitemap.xml`, indexXml);

// =========================
// DONE
// =========================
console.log(`🔥 Sitemap generated!`);
console.log(`📄 Main pages: ${mainPages.length}`);
console.log(`📍 Location pages: ${htmlFiles.length}`);
console.log(`🧩 Sitemap files: ${sitemapFiles.length}`);