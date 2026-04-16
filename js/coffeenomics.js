let locationMap = {};

// ========================
// SAME ID SYSTEM
// ========================
function generateLocationId(name, lat, lng) {
  return `${name}_${Number(lat).toFixed(5)}_${Number(lng).toFixed(5)}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

// ========================
// LOAD EVERYTHING PROPERLY
// ========================
async function loadCoffeenomics() {

  // ========================
  // 🔥 STEP 1: FIREBASE LOCATIONS (ONLY ONCE)
  // ========================
  const locSnap = await db.collection("locations").get();

  locSnap.forEach(doc => {
    const d = doc.data();

locationMap[doc.id] = {
  name: d.name || "Unknown",
  city: d.city || "",
  state: d.state || "",
  lat: Number(d.lat),
  lng: Number(d.lng)
};
  });

  // ========================
  // 🔥 STEP 2: VOTES
  // ========================
  const voteSnap = await db.collection("votes").get();

  const shops = [];

  voteSnap.forEach(doc => {
    const d = doc.data();

    const up = d.upvotes || 0;
    const down = d.downvotes || 0;
    const total = up + down;

    if (!total) return;

    const percent = Math.round((up / total) * 100);

    const speed = d.speedVotes
      ? d.speedTotal / d.speedVotes
      : 0;

    // ✅ STRICT MATCH ONLY
    const loc = locationMap[doc.id] || null;

    if (!loc) {
      console.warn("Missing location for vote:", doc.id);
      return;
    }

    shops.push({
      id: doc.id,
      name: loc.name,
      city: loc.city,
      state: loc.state,
      percent,
      speed,
      votes: total,
      score: percent * Math.log(total + 1)
    });
  });

  const stats = buildStats(shops);
  renderCoffeenomics(stats);
}
// ========================
// STATS ENGINE
// ========================
function buildStats(shops) {
  return {
    bestOverall: [...shops].sort((a,b)=>b.score-a.score).slice(0,5),
    worstOverall: [...shops].sort((a,b)=>a.percent-b.percent).slice(0,5),
    fastest: [...shops].sort((a,b)=>b.speed-a.speed).slice(0,5),
    chaos: [...shops]
      .sort((a,b)=>Math.abs(a.percent-50)-Math.abs(b.percent-50))
      .slice(0,5),
    elite: shops
      .filter(s => s.percent >= 90 && s.votes >= 3)
      .sort((a,b)=>b.percent-a.percent)
      .slice(0,5),
    trash: shops
      .filter(s => s.percent <= 30 && s.votes >= 3)
      .sort((a,b)=>a.percent-b.percent)
      .slice(0,5)
  };
}

// ========================
// DISPLAY
// ========================
function formatName(shop) {

  let locationLine = "";

  if (shop.city && shop.state) {
    locationLine = `${shop.city}, ${shop.state}`;
  } else {
    // fallback to clean name instead of ID garbage
    locationLine = "";
  }

  return `
    <strong>${shop.name}</strong>
    ${locationLine ? `<div style="font-size:12px;color:#666;">${locationLine}</div>` : ""}
  `;
}

// ========================
// RENDER
// ========================
function renderCoffeenomics(stats) {
  renderList("bestOverall", stats.bestOverall);
  renderList("worstOverall", stats.worstOverall);
  renderList("fastest", stats.fastest);
  renderList("chaos", stats.chaos);
  renderList("elite", stats.elite);
  renderList("trash", stats.trash);
}

function renderList(id, list) {
  const el = document.getElementById(id);

  el.innerHTML = list.map(s => `
    <div class="stat">
      ${formatName(s)}
      <div>🎯 ${s.percent}% (${s.votes})</div>
    </div>
  `).join("");
}

// TEMPORARY! DELETEME AFTER SEEDING

async function seedLocationsFromJSON() {
  const res = await fetch("./coffeeLocations.json");
  const data = await res.json();

  // 🔥 get all vote IDs first
  const voteSnap = await db.collection("votes").get();
  const voteIds = new Set();

  voteSnap.forEach(doc => {
    voteIds.add(doc.id);
  });

  const batch = db.batch();
  let count = 0;

  data.forEach(loc => {
    const id = generateLocationId(loc.name, loc.lat, loc.lng);

    // ✅ ONLY seed if vote exists
    if (!voteIds.has(id)) return;

    const ref = db.collection("locations").doc(id);

    batch.set(ref, {
      name: loc.name,
      lat: Number(loc.lat),
      lng: Number(loc.lng),
      city: loc.city || "",
      state: loc.state || ""
    });

    count++;
  });

  await batch.commit();

  console.log(`🔥 Seeded ${count} matching locations`);
}