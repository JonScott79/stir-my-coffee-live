const admin = require("firebase-admin");
const fs = require("fs");

// 🔑 Load service account
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 🔥 SAME ID FUNCTION (DO NOT CHANGE)
function generateLocationId(name, lat, lng) {
  return `${name}_${Number(lat).toFixed(5)}_${Number(lng).toFixed(5)}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

// 📍 Load your static locations
const locations = JSON.parse(
  fs.readFileSync("./coffeeLocations.json", "utf8")
);

async function seed() {
  console.log(`Seeding ${locations.length} locations...\n`);

  let batch = db.batch();
  let count = 0;

  for (const loc of locations) {
    const lat = Number(loc.lat);
    const lng = Number(loc.lng);

    const id = generateLocationId(loc.name, lat, lng);

    const ref = db.collection("votes").doc(id);

    batch.set(ref, {
      upvotes: 1,
      downvotes: 0,
      speedTotal: 5,
      speedVotes: 1
    }, { merge: true });

    count++;

    // 🔥 Firestore batch limit = 500
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`✔ Committed ${count}`);
      batch = db.batch();
    }
  }

  // Final batch
  await batch.commit();

  console.log("\n🔥 SEED COMPLETE");
}

seed().catch(console.error);