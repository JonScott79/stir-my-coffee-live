const fs = require("fs");
const path = require("path");

// ========================
// 🔥 CONFIG
// ========================
const NAME = "Krispy Kreme";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter"
];

// ========================
// 📁 ENSURE DATA DIR
// ========================
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// ========================
// 🔧 BUILD QUERY
// ========================
function buildQuery() {
  return `[out:json][timeout:25];
(
  node["brand"~"Krispy Kreme",i](24,-125,50,-66);
  node["name"~"Krispy Kreme",i](24,-125,50,-66);
);
out;`;
}

// ========================
// 🌐 FETCH WITH RETRY
// ========================
async function fetchData(attempt = 0) {
  const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
  const query = buildQuery();

  console.log(`🌐 ${NAME} → ${endpoint}`);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "StirMyCoffee/1.0 (contact: dev@stirmycoffee.com)"
      },
      body: "data=" + encodeURIComponent(query)
    });

    const text = await res.text();

    // 🔍 DEBUG SAFETY
    if (!text.startsWith("{")) {
      console.error(`❌ Non-JSON response:`);
      console.error(text.substring(0, 500));
      throw new Error("Bad response");
    }

    const data = JSON.parse(text);

    const filePath = path.join(dataDir, "Krispy_Kreme.json");

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`✔ ${NAME}: ${data.elements.length} locations\n`);
    return;

  } catch (err) {
    console.log(`❌ Failed (attempt ${attempt + 1})`);

    if (attempt >= 5) {
      console.log(`💀 Skipping after retries`);
      return;
    }

    // 🔥 Backoff
    await new Promise(r => setTimeout(r, 6000 + attempt * 2000));

    return fetchData(attempt + 1);
  }
}

// ========================
// 🚀 RUN
// ========================
async function run() {
  await fetchData();
  console.log("🔥 DONE");
}

run();