/* JS/COFFEENOMICS.JS */

let locationMap = {};
let processedShops = [];
let coffeenomicsStats = {};
let activeCategory = "best";

window.addEventListener("DOMContentLoaded", () => {
  loadCoffeenomics();
});

// Calculate Location ID helper
function generateLocationId(name, lat, lng) {
  return `${name}_${Number(lat).toFixed(5)}_${Number(lng).toFixed(5)}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

// Fetch dynamic data from Firestore
async function loadCoffeenomics() {
  try {
    const locSnap = await db.collection("locations").get();
    locSnap.forEach(doc => {
      const d = doc.data();
      locationMap[doc.id] = {
        name: d.name || "Unknown Outpost",
        city: d.city || "",
        state: d.state || "",
        lat: Number(d.lat),
        lng: Number(d.lng)
      };
    });

    const voteSnap = await db.collection("votes").get();
    processedShops = [];

    voteSnap.forEach(doc => {
      const d = doc.data();
      const up = d.upvotes || 0;
      const down = d.downvotes || 0;
      const total = up + down;

      if (!total) return;

      const percent = Math.round((up / total) * 100);
      const speed = d.speedVotes ? (d.speedTotal / d.speedVotes) : 0;
      const loc = locationMap[doc.id] || null;

      if (!loc) return;

      processedShops.push({
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

    coffeenomicsStats = buildStats(processedShops);
    renderActiveList();
  } catch (error) {
    console.error("Firestore loading error:", error);
    const container = document.getElementById("recordsContainer");
    if (container) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--error); font-weight:800;">Precinct link offline. Check network.</div>`;
    }
  }
}

// Build stats maps
function buildStats(shops) {
  return {
    best: [...shops].sort((a, b) => b.score - a.score).slice(0, 8),
    worst: [...shops].sort((a, b) => a.percent - b.percent).slice(0, 8),
    fastest: [...shops].sort((a, b) => b.speed - a.speed).slice(0, 8),
    chaos: [...shops].sort((a, b) => Math.abs(a.percent - 50) - Math.abs(b.percent - 50)).slice(0, 8),
    elite: shops.filter(s => s.percent >= 90 && s.votes >= 3).sort((a, b) => b.percent - a.percent).slice(0, 8)
  };
}

// Switch category trigger
window.switchRecordsCategory = function (category) {
  activeCategory = category;
  
  // Update active chips CSS
  document.querySelectorAll(".sort-chip").forEach(btn => btn.classList.remove("active"));
  document.getElementById("tab_" + category)?.classList.add("active");
  
  renderActiveList();
};

// Render active list items to records container
function renderActiveList() {
  const container = document.getElementById("recordsContainer");
  if (!container) return;

  const currentList = coffeenomicsStats[activeCategory] || [];
  if (currentList.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">No reports logged in this category.</div>`;
    return;
  }

  container.innerHTML = currentList.map((shop, idx) => {
    let scoreDisplay = "";
    let alertBorder = "";

    if (activeCategory === "fastest") {
      scoreDisplay = `Patrol Speed: <strong>${shop.speed.toFixed(1)} / 5 ⭐</strong>`;
    } else {
      scoreDisplay = `Stir Score: <strong>${shop.percent}% Accuracy</strong>`;
    }

    if (activeCategory === "worst") {
      alertBorder = "border-color: var(--error); background: rgba(198,40,40,0.01);";
    } else if (activeCategory === "elite" || activeCategory === "best") {
      alertBorder = "border-color: var(--success); background: rgba(46,125,50,0.01);";
    }

    // Dynamic rank tags
    let rankBadge = "PATROL MEMBER";
    if (shop.percent >= 90) rankBadge = "ELITE OUTPOST 🎖️";
    else if (shop.percent <= 40) rankBadge = "CRIME SCENE 🚨";
    else if (shop.speed >= 4.0) rankBadge = "FAST PATROL ⚡";

    return `
      <div class="card" style="margin-bottom:0; display:flex; justify-content:space-between; align-items:center; gap:20px; ${alertBorder}">
        <div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
            <strong style="font-size:16px;">#${idx+1} ${shop.name}</strong>
            <span class="badge-tag" style="font-size:9px; padding:2px 6px;">${rankBadge}</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted);">${shop.city || "Unknown Sector"}, ${shop.state || "HQ"}</div>
        </div>
        <div style="text-align:right; font-size:13px;">
          <div>${scoreDisplay}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${shop.votes} reports</div>
        </div>
      </div>
    `;
  }).join("");
}