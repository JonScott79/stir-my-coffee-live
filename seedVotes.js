const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function generateLocationId(name, lat, lng) {
  return `${name}_${Number(lat).toFixed(5)}_${Number(lng).toFixed(5)}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

async function migrateUserVotes() {
  console.log("🚀 Migrating remaining user votes...\n");

  const voteSnap = await db.collection("votes").get();

  let batch = db.batch();
  let count = 0;
  let skipped = 0;

  for (const doc of voteSnap.docs) {
    const vote = doc.data();
    const oldId = doc.id;

    // ✅ Skip already-correct IDs (lat/lng format)
    const parts = oldId.split("_");
    if (parts.length === 3 && !isNaN(parts[1]) && !isNaN(parts[2])) {
      continue;
    }

    // 🔥 Try to find matching location by SAME ID
    const locDoc = await db.collection("locations").doc(oldId).get();

    if (!locDoc.exists) {
      console.log("❌ No location for:", oldId);
      skipped++;
      continue;
    }

    const d = locDoc.data();

    if (!d.name || d.lat == null || d.lng == null) {
      console.log("❌ Bad location data:", oldId);
      skipped++;
      continue;
    }

    const newId = generateLocationId(d.name, d.lat, d.lng);

    // 🛑 Skip if already exists (avoid overwrite spam)
    const existing = await db.collection("votes").doc(newId).get();
    if (existing.exists) {
      continue;
    }

    const newRef = db.collection("votes").doc(newId);

    batch.set(newRef, vote, { merge: true });

    count++;

    if (count % 500 === 0) {
      await batch.commit();
      console.log(`✔ Migrated ${count}`);
      batch = db.batch();
    }
  }

  await batch.commit();

  console.log("\n🔥 USER MIGRATION COMPLETE");
  console.log(`✔ Migrated: ${count}`);
  console.log(`❌ Skipped: ${skipped}`);
}

migrateUserVotes().catch(console.error);