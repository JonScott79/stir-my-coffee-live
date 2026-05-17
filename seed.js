const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ========================
// 🔧 ID SYSTEM
// ========================
function generateLocationId(name, lat, lng) {
  return `${name}_${Number(lat).toFixed(5)}_${Number(lng).toFixed(5)}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

// ========================
// 🧼 CLEAN NAME
// ========================
function cleanName(name) {
  return name.trim().replace(/\s+/g, " ");
}

// ========================
// 🚀 SEED KRISPY KREME ONLY
// ========================
async function seedKrispyKreme() {
  const filePath = path.join(__dirname, "data", "Krispy_Kreme.json");

  if (!fs.existsSync(filePath)) {
    console.log("❌ Krispy_Kreme.json not found");
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath));

  const existingSnap = await db.collection("locations").get();
  const existingIds = new Set(existingSnap.docs.map(d => d.id));

  const seenIds = new Set();

  let batch = db.batch();
  let count = 0;
  let skipped = 0;

  for (const node of data.elements) {
    if (!node.lat || !node.lon) {
      skipped++;
      continue;
    }

    let name = node.tags?.brand || node.tags?.name;
    if (!name) {
      skipped++;
      continue;
    }

    name = cleanName(name);

    const lat = node.lat;
    const lng = node.lon;

    const id = generateLocationId(name, lat, lng);

    if (existingIds.has(id) || seenIds.has(id)) {
      skipped++;
      continue;
    }

    seenIds.add(id);

    const locRef = db.collection("locations").doc(id);
    const voteRef = db.collection("votes").doc(id);

    // 📍 LOCATION
    batch.set(locRef, {
      name,
      lat,
      lng,
      city: "",
      state: ""
    });

    // ⭐ SEEDED VOTES
    batch.set(voteRef, {
      upvotes: 1,
      downvotes: 0,
      speedTotal: 4,
      speedVotes: 1
    });

    count++;

    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`✔ Committed ${count}`);
    }
  }

  await batch.commit();

  console.log(`🔥 DONE — Added ${count}`);
  console.log(`⚠️ Skipped ${skipped}`);
}

seedKrispyKreme().catch(console.error);