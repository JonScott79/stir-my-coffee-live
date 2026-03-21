const fs = require("fs");

const BASE_URL = "https://stirmycoffee.com";
const LOCATIONS_FILE = "./coffeeLocations.json";
const OUTPUT_DIR = "./";

const MAX_URLS_PER_FILE = 20000; // safe split size

// 🔥 Load data
const locations = JSON.parse(fs.readFileSync(LOCATIONS_FILE, "utf-8"));

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
// LOCATION SITEMAPS
// =========================
const chunks = [];

for (let i = 0; i < locations.length; i += MAX_URLS_PER_FILE) {
  chunks.push(locations.slice(i, i + MAX_URLS_PER_FILE));
}

const sitemapFiles = [];

chunks.forEach((chunk, index) => {
  const fileName = `sitemap-locations-${index + 1}.xml`;

  const urls = chunk.map(loc => `
    <url>
      <loc>${BASE_URL}/shop/${loc.id}</loc>
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

console.log("✅ Sitemap generated successfully!");