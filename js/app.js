// ========================
// GLOBAL STATE
// ========================

const voted = new Set();

let allLocations = [];
let userLat = null;
let userLng = null;

const DISPLAY_LIMIT = 10;
const MAX_DISTANCE_MILES = 5;

// ========================
// Voting Limitation
// ========================

const VOTE_LIMIT_HOURS = 24;

function getVoteHistory() {
  return JSON.parse(localStorage.getItem("voteHistory") || "{}");
}

function saveVoteHistory(history) {
  localStorage.setItem("voteHistory", JSON.stringify(history));
}

function canVote(id) {
  const history = getVoteHistory();
  const lastVote = history[id];

  if (!lastVote) return true;

  const now = Date.now();
  const hoursPassed = (now - lastVote) / (1000 * 60 * 60);

  return hoursPassed >= VOTE_LIMIT_HOURS;
}

function recordVote(id) {
  const history = getVoteHistory();
  history[id] = Date.now();
  saveVoteHistory(history);
}

// ========================
// USER location
// ========================

function goToUser() {
  getUserLocation().then(location => {
    userLat = location.lat;
    userLng = location.lng;

    console.log("📍 Re-centered to user:", userLat, userLng);

    updateDistancesAndSort();
  });
}

// ========================
// INIT
// ========================

window.addEventListener("load", () => {
  console.log("🔥 WINDOW LOADED");
  init();
});

async function init() {
  showLoading();

  await loadLocations();

  const location = await getUserLocation();

  userLat = location.lat;
  userLng = location.lng;

  console.log("📍 User location:", userLat, userLng);

  updateDistancesAndSort();

  subscribeToVotes();
}

// ========================
// LOADING UI
// ========================

function showLoading() {
  const el = document.getElementById("topPickCard");
  if (el) {
    el.innerHTML = "📍 Finding best coffee near you...";
  }
}

// ========================
// LOAD DATA
// ========================

function getTopPicks(locations) {
  if (!locations.length) return {};

  const fastest = [...locations].sort((a, b) => (b.speed || 0) - (a.speed || 0))[0];

  const best = [...locations].sort((a, b) => (b.percent || 0) - (a.percent || 0))[0];

  const overall = [...locations].sort((a, b) => b.score - a.score)[0];

  return { fastest, best, overall };
}

async function loadVotes() {
  const snapshot = await db.collection("votes").get();
  const voteMap = {};

  snapshot.forEach(doc => {
    voteMap[doc.id] = doc.data();
  });

  return voteMap;
}

async function getAddress(lat, lng) {
  const key = `addr_${lat}_${lng}`;

  // ✅ 1. CACHE
  const cached = localStorage.getItem(key);
  if (cached) {
    return cached;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );

    const data = await res.json();

    // ⚠️ safety check
    if (!data || !data.address) return null;

    const addr = data.address;

    const streetAddress = [
      addr.house_number,
      addr.road
    ].filter(Boolean).join(" ");

    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.hamlet ||   // 🔥 add this for small areas
      "";

    const fullAddress = [streetAddress, city]
      .filter(Boolean)
      .join(", ");

    // ✅ cache only if valid
    if (fullAddress) {
      localStorage.setItem(key, fullAddress);
    }

    return fullAddress || null;

  } catch (err) {
    console.error("Address lookup failed:", err);
    return null;
  }
}

async function loadAddressesForVisible(locations) {
  let updated = false;

  for (const loc of locations) {
    // ✅ Skip if already has a real address
if (loc.street !== null) continue;

    // ✅ Prevent duplicate in-flight requests
    if (loc.loadingAddress) continue;

    // ✅ Retry cooldown (5 seconds)
    if (loc.lastAddressAttempt && Date.now() - loc.lastAddressAttempt < 5000) continue;

    loc.loadingAddress = true;
    loc.lastAddressAttempt = Date.now();

    try {
      const addr = await getAddress(loc.lat, loc.lng);

      if (addr) {
        loc.street = addr;
      } else {
        // ❌ DO NOT lock it into "Unknown"
        if (!loc.street) loc.street = null;
      }

    } catch {
      // same logic on failure
      if (!loc.street) loc.street = null;
    }

    loc.loadingAddress = false;
    updated = true;
  }

  // ✅ Only rerender once after batch
  if (updated) {
    updateDistancesAndSort();
  }
}

async function loadLocations() {
  console.log("LOAD LOCATIONS START");

  try {
    // ✅ Load static locations
    const response = await fetch("./coffeeLocations.json");
    const staticData = await response.json();

    // ✅ Load Firebase locations
    const snapshot = await db.collection("locations").get();
    const firebaseData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // ✅ Combine both
    const combined = [...staticData, ...firebaseData];

    let votes = {};
    try {
      votes = await loadVotes();
    } catch {
      console.warn("Votes failed to load");
    }

    allLocations = combined.map(loc => {
      const v = votes[loc.id] || {};
      const up = v.upvotes || 0;
      const down = v.downvotes || 0;
      const total = up + down;

      return {
        ...loc,
        street: null,
        percent: total ? Math.round((up / total) * 100) : 0,
        speed: 0,
        votes: total,
        distance: 0
      };
    });

  } catch (err) {
    console.error("LOAD FAILED:", err);
  }
}
// ========================
// GEOLOCATION
// ========================

function getUserLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve({ lat: 42.1, lng: -71.8 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }),
      () => resolve({ lat: 42.1, lng: -71.8 }),
      { timeout: 5000 }
    );
  });
}

// ========================
// DISTANCE + SORT
// ========================


function updateDistancesAndSort() {
  if (!userLat || !userLng) return;

  // ✅ update distances + scores
  allLocations.forEach(loc => {
    loc.distance = getDistance(userLat, userLng, loc.lat, loc.lng);
    loc.score = calculateScore(loc);
  });

  // 🔥 NEW: FILTER by distance FIRST
  const nearby = allLocations.filter(loc => loc.distance <= MAX_DISTANCE_MILES);

  // ⚠️ fallback if nothing nearby
  const workingSet = nearby.length > 0 ? nearby : allLocations;

// 🔥 SORT FOR TOP PICKS (smart ranking)
const sortedByScore = [...workingSet].sort((a, b) => b.score - a.score);

// 🔥 get top picks from smart ranking
const picks = getTopPicks(sortedByScore);
renderTopPicksPanel(picks);

// 🔥 SORT FOR LEFT PANEL (distance ONLY)
const sortedByDistance = [...workingSet].sort((a, b) => a.distance - b.distance);

// 🔥 render list as closest first
renderList(sortedByDistance);

const visible = sortedByDistance.slice(0, DISPLAY_LIMIT);
loadAddressesForVisible(visible);
}

// ========================
// DISTANCE CALC
// ========================

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = x => x * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ========================
// RENDER
// ========================

function renderTopPicksPanel({ fastest, best, overall }) {
  const el = document.getElementById("topPickCard");
  if (!el) return;

  el.innerHTML = `
    ${renderMiniCard("⚡ Fastest", fastest)}
    ${renderMiniCard("⭐ Best Quality", best)}
    ${renderMiniCard("🧠 Best Overall", overall)}
  `;
}

function renderMiniCard(title, shop) {
  if (!shop) return `<div class="mini-card">${title}<br>—</div>`;

  return `
    <div class="mini-card" onclick="openDirections(event, ${shop.lat}, ${shop.lng})">
      
      <div class="mini-title">${title}</div>

      <div class="name">
        ${shop.name}
        <span class="mini-address">(${shop.street || "..."})</span>
      </div>

      <div class="meta">
        <span>🌀 ${shop.percent ? shop.percent + "%" : "—"}</span>
        <span>⭐ ${shop.speed ? shop.speed.toFixed(1) : "—"}</span>
        <span>📍 ${shop.distance?.toFixed(1)} mi</span>
      </div>

    </div>
  `;
}

function renderList(locations) {
  const list = document.getElementById("listContainer");
  if (!list) return;

  list.innerHTML = locations
    .slice(0, DISPLAY_LIMIT)
    .map(l => {
      const canUserVote = canVote(l.id);
      const voteDisabled = canUserVote ? "" : "disabled";

      const canUserRate = canRateSpeed(l.id);

      return `
        <div class="location-card" onclick="selectLocation('${l.id}')">
          
          <div class="card-header">
            <div class="name">${l.name}</div>
          </div>

          <div class="street">
            📍 ${
              l.street
                ? `${l.street} · ${l.distance?.toFixed(1) ?? "—"} mi`
                : `${l.distance?.toFixed(1) ?? "—"} mi`
            }
          </div>

          <div class="meta">

            <span class="vote-inline">
              <button ${voteDisabled} onclick="vote(event, '${l.id}', true)">👍</button>
              <button ${voteDisabled} onclick="vote(event, '${l.id}', false)">👎</button>
            </span>

            <span class="quality ${getRatingClass(l.percent)}">
              🌀 ${l.percent ? l.percent + "%" : "—"}
            </span>

            <span class="stars">
              ${Array.from({ length: 5 }, (_, i) => {
                const rounded = Math.round(l.speed);
                const filled = i + 1 <= rounded ? "★" : "☆";

                const disabledStyle = !canUserRate
                  ? 'style="opacity:0.4;pointer-events:none;"'
                  : "";

                return `<span ${disabledStyle} onclick="rateSpeed(event, '${l.id}', ${i + 1})">${filled}</span>`;
              }).join("")}
            </span>

            <span class="directions" onclick="openDirections(event, ${l.lat}, ${l.lng})">
              🚗
            </span>

            <span>👥 ${l.votes}</span>

          </div>
        </div>
      `;
    }).join("");
}

function renderTopPick(shop) {
  const el = document.getElementById("topPickCard");
  if (!shop || !el) return;

  el.innerHTML = `
    <div class="name">${shop.name}</div>
    <div class="meta">
      <span class="quality ${getRatingClass(shop.percent)}">
        🌀 ${shop.percent ? shop.percent + "%" : "—"}
      </span>
      <span class="stars">${renderStars(shop.id, shop.speed)}</span>
      <span>📍 ${shop.distance?.toFixed(1) ?? "—"} mi</span>
      <span>👥 ${shop.votes}</span>
    </div>
  `;
}

// ========================
// FIREBASE REALTIME
// ========================

function subscribeToVotes() {
  db.collection("votes").onSnapshot(snapshot => {
    console.log("🔥 SNAPSHOT TRIGGERED");

    const votes = {};

    snapshot.forEach(doc => {
      votes[doc.id] = doc.data();
    });

    console.log("🔥 VOTE MAP:", votes);

    // ✅ APPLY votes safely (no object replacement)
    allLocations.forEach(loc => {
      const v = votes[loc.id];
      if (!v) return;

      const up = v.upvotes || 0;
      const down = v.downvotes || 0;
      const total = up + down;

      const speedTotal = v.speedTotal || 0;
      const speedVotes = v.speedVotes || 0;

      loc.percent = total ? Math.round((up / total) * 100) : 0;
      loc.votes = total;
      loc.speed = speedVotes ? (speedTotal / speedVotes) : 0;
    });

    console.log("🔥 AFTER MERGE:", allLocations.slice(0, 5));

    updateDistancesAndSort();
  });
}

// ========================
// VOTING
// ========================

function vote(e, id, up) {
  e.stopPropagation();

  if (!canVote(id)) {
    alert("⏳ You can vote again on this shop in 24 hours.");
    return;
  }

  recordVote(id);

  const ref = db.collection("votes").doc(id);

  ref.set({
    upvotes: firebase.firestore.FieldValue.increment(up ? 1 : 0),
    downvotes: firebase.firestore.FieldValue.increment(!up ? 1 : 0)
  }, { merge: true })
  .then(() => console.log("✅ Vote saved:", id))
  .catch(err => console.error("❌ Vote failed:", err));

  e.target.classList.add("pop");
  setTimeout(() => e.target.classList.remove("pop"), 300);
}

// ========================
// HELPERS
// ========================


function renderStars(id, rating) {
  return Array.from({ length: 5 }, (_, i) => {
    const rounded = Math.round(rating);
const filled = i + 1 <= rounded ? "★" : "☆";
    return `<span onclick="rateSpeed(event, '${id}', ${i + 1})">${filled}</span>`;
  }).join("");
}

function rateSpeed(e, id, rating) {
  e.stopPropagation();

  if (!canRateSpeed(id)) {
    alert("⏳ You already rated speed here. Try again later.");
    return;
  }

  recordSpeedRating(id);

  const ref = db.collection("votes").doc(id);

  ref.set({
    speedTotal: firebase.firestore.FieldValue.increment(rating),
    speedVotes: firebase.firestore.FieldValue.increment(1)
  }, { merge: true })
  .then(() => console.log("⭐ Speed saved:", id, rating))
  .catch(err => console.error("❌ Speed failed:", err));

  e.target.classList.add("pop");
  setTimeout(() => e.target.classList.remove("pop"), 300);
}

function getRatingClass(percent) {
  if (!percent) return "none";
  if (percent >= 80) return "good";
  if (percent >= 50) return "mid";
  return "bad";
}

function openDirections(e, lat, lng) {
  e.stopPropagation();
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
}

function calculateScore(shop) {
  return (
    (shop.percent || 0) * 0.5 +
    (shop.speed || 0) * 20 * 0.3 +
    (shop.distance > 0 ? Math.max(0, 100 - shop.distance * 20) : 0) * 0.2
  );
}

const SPEED_LIMIT_HOURS = 24;

function getSpeedHistory() {
  return JSON.parse(localStorage.getItem("speedHistory") || "{}");
}

function saveSpeedHistory(history) {
  localStorage.setItem("speedHistory", JSON.stringify(history));
}

function canRateSpeed(id) {
  const history = getSpeedHistory();
  const last = history[id];

  if (!last) return true;

  const now = Date.now();
  const hoursPassed = (now - last) / (1000 * 60 * 60);

  return hoursPassed >= SPEED_LIMIT_HOURS;
}

function recordSpeedRating(id) {
  const history = getSpeedHistory();
  history[id] = Date.now();
  saveSpeedHistory(history);
}

// Buttons

function goToMap() {
  window.location.href = "/map.html";
}

let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  console.log("🔥 INSTALL READY");

  const btn = document.getElementById("installBtn");
  if (btn) btn.style.display = "block";
});

window.addEventListener("load", () => {
  const btn = document.getElementById("installBtn");

  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (!deferredPrompt) {
      alert("To install: use browser menu → Add to Home Screen");
      return;
    }

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log("User choice:", outcome);

    deferredPrompt = null;
  });
});