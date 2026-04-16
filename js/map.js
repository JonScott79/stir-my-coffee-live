// ========================
// GLOBAL STATE
// ========================

let allLocations = [];
let staticLocations = [];
let hasFitBounds = false;
let activeMarker = null;
let votesData = {};
let selectedLatLng = null;

// ========================
// HEADER
// ========================

function setHeader(text) {
  const el = document.getElementById("mapInstructions");
  if (el) el.textContent = text;
}

// ========================
// STABLE LOCATION ID
// ========================

function generateLocationId(name, lat, lng) {
  return `${name}_${Number(lat).toFixed(5)}_${Number(lng).toFixed(5)}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

// ========================
// VOTE LIMIT SYSTEM
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

  const hoursPassed = (Date.now() - lastVote) / (1000 * 60 * 60);
  return hoursPassed >= VOTE_LIMIT_HOURS;
}

function recordVote(id) {
  const history = getVoteHistory();
  history[id] = Date.now();
  saveVoteHistory(history);
}

// ========================
// FIREBASE
// ========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  setDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyDuPgwpIZfAoo_88NhfC4VfpOObPUVNnNM",
  authDomain: "stir-my-coffee.firebaseapp.com",
  projectId: "stir-my-coffee"
});

const db = getFirestore(app);

// ========================
// MAP
// ========================

const map = L.map("map", { zoomControl: false }).setView([20, 0], 2);

L.control.zoom({ position: "bottomright" }).addTo(map);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const markers = L.markerClusterGroup({
  iconCreateFunction: function (cluster) {
    return L.divIcon({
      html: `<div class="cluster-icon">${cluster.getChildCount()}</div>`,
      className: "custom-cluster",
      iconSize: [42, 42]
    });
  }
});
map.addLayer(markers);

// ========================
// AUTO CENTER
// ========================

let hasCentered = false;

navigator.geolocation.getCurrentPosition(
  (pos) => {
    if (hasCentered) return;

    if (map.getZoom() <= 3) {
      const latlng = [pos.coords.latitude, pos.coords.longitude];
      map.setView(latlng, 13);
      hasCentered = true;
    }
  },
  () => {}
);

// ========================
// MAP CLICK (ADD FLOW)
// ========================

map.on("click", (e) => {
  selectedLatLng = e.latlng;
  document.getElementById("submitPanel").style.display = "block";
  setHeader("Select chain • Submit");
});

// ========================
// HEADER BUTTONS
// ========================

window.goToUser = () => {
  navigator.geolocation.getCurrentPosition(pos => {
    const latlng = [pos.coords.latitude, pos.coords.longitude];
    map.flyTo(latlng, 14, { duration: 1.2 });
  });
};

window.goToList = () => {
  window.location.href = "index.html";
};

// ========================
// ADD LOCATION SYSTEM
// ========================

window.handleChainChange = function () {
  const chain = document.getElementById("shopChain").value;
  const nameInput = document.getElementById("shopName");

  if (chain === "Other") {
    nameInput.disabled = false;
    nameInput.value = "";
  } else if (chain) {
    nameInput.disabled = true;
    nameInput.value = chain;
  } else {
    nameInput.disabled = true;
    nameInput.value = "";
  }
};

window.closeSubmitForm = function () {
  document.getElementById("submitPanel").style.display = "none";
  selectedLatLng = null;
  setHeader("Tap map to add • Tap shops to vote");
};

window.submitShop = async function () {
  const chain = document.getElementById("shopChain").value;
  const name = document.getElementById("shopName").value;

  if (!selectedLatLng) return alert("Click map first");
  if (!chain) return alert("Select a chain");
  if (!name) return alert("Enter shop name");

  try {
    // 🔥 NEW: get city/state BEFORE saving
    const { city, state } = await getCityState(
      selectedLatLng.lat,
      selectedLatLng.lng
    );

    await addDoc(collection(db, "locations"), {
      name,
      lat: selectedLatLng.lat,
      lng: selectedLatLng.lng,
      chain,
      city: city || "",
      state: state || "",
      timestamp: Date.now()
    });

    closeSubmitForm();

  } catch (err) {
    console.error(err);
    alert("Error adding location");
  }
};

// ========================
// LOAD LOCATIONS
// ========================

async function loadLocationsRealtime() {
  const locationsRef = collection(db, "locations");
  const votesRef = collection(db, "votes");

  let locationsData = [];
  let votesReady = false;
  let locationsReady = false;

  function combineAndRender() {
    // 🚫 WAIT until BOTH are loaded
    if (!votesReady || !locationsReady) return;

    // 🔍 DEBUG (you can remove later)
    const bad = locationsData.filter(d => !d.lat || !d.lng);
    if (bad.length) {
      console.warn("⚠️ Bad locations skipped:", bad.length, bad.slice(0, 5));
    }

    const combined = locationsData
      // 🔥 CRITICAL FIX (prevents render crash)
      .filter(d => d.lat && d.lng)
      .map(d => {
        const id = d.id;
        const v = votesData[id] || {};

        const up = v.upvotes || 0;
        const down = v.downvotes || 0;
        const total = up + down;

        const speedTotal = v.speedTotal || 0;
        const speedVotes = v.speedVotes || 0;

        return {
          id,
          name: d.name || "Unknown",
          lat: Number(d.lat),
          lng: Number(d.lng),
          percent: total ? Math.round((up / total) * 100) : 0,
          speed: speedVotes ? (speedTotal / speedVotes) : 0,
          votes: total
        };
      });

    allLocations = combined;

    console.log("🔥 Rendering locations:", allLocations.length);

    render();
  }

  // ========================
  // 🔥 LOCATIONS LISTENER
  // ========================
  onSnapshot(locationsRef, snapshot => {
    locationsData = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    console.log("📍 Locations loaded:", locationsData.length);

    locationsReady = true;
    combineAndRender();
  });

  // ========================
  // 🔥 VOTES LISTENER
  // ========================
  onSnapshot(votesRef, snapshot => {
    votesData = {};

    snapshot.forEach(docSnap => {
      votesData[docSnap.id] = docSnap.data();
    });

    console.log("🗳 Votes loaded:", Object.keys(votesData).length);

    votesReady = true;
    combineAndRender();
  });
}

// ========================
// RENDER (FIXED 🔥)
// ========================

function render() {
  markers.clearLayers();

  for (const loc of allLocations) {
    const marker = L.circleMarker([loc.lat, loc.lng], {
      radius: window.innerWidth < 600 ? 9 : 7,
      fillColor: "#4b2e2b",
      fillOpacity: 0.9,
      color: "#fff",
      weight: 1
    });

    marker.on("click", () => {
      setHeader("Vote or rate this shop");
    });

    // ========================
    // 🔥 DISABLE LOGIC
    // ========================

    const voteDisabled = canVote(loc.id)
      ? ""
      : "disabled title='Already voted (24h cooldown)'";

    const speedDisabled = canRateSpeed(loc.id)
      ? ""
      : "style='opacity:0.4;pointer-events:none;' title='Already rated (24h cooldown)'";

    // ========================
    // POPUP
    // ========================

    marker.bindPopup(`
      <b>${loc.name}</b><br><br>

      <b>Accuracy:</b> ${loc.percent}% (${loc.votes} votes)<br>
      <b>Speed:</b> ${loc.speed ? loc.speed.toFixed(1) : "N/A"} ⭐<br><br>

      <div class="vote-inline">
        <button ${voteDisabled}
          onclick="vote(event, '${loc.id}', true)">
          👍
        </button>

        <button ${voteDisabled}
          onclick="vote(event, '${loc.id}', false)">
          👎
        </button>
      </div>

      <br>

      <div class="stars">
        ${Array.from({ length: 5 }, (_, i) => {
          const rounded = Math.round(loc.speed || 0);
          const filled = i + 1 <= rounded ? "★" : "☆";

          return `<span ${speedDisabled}
            onclick="rateSpeed(event, '${loc.id}', ${i + 1})">
            ${filled}
          </span>`;
        }).join("")}
      </div>

      <br>

      <button onclick="reportLocation('${loc.id}')">🚩 Report</button>
    `);

    markers.addLayer(marker);
  }
}

// ========================
// INTERACTIONS
// ========================

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

  const hoursPassed = (Date.now() - last) / (1000 * 60 * 60);
  return hoursPassed >= SPEED_LIMIT_HOURS;
}

function recordSpeedRating(id) {
  const history = getSpeedHistory();
  history[id] = Date.now();
  saveSpeedHistory(history);
}

window.vote = function (event, id, up) {
  event.stopPropagation();

  // 🚫 HARD BLOCK
  if (!canVote(id)) {
    alert("⏳ You can vote again on this shop in 24 hours.");
    return;
  }

  // ✅ RECORD LOCALLY FIRST (CRITICAL)
  recordVote(id);

  // ⚡ OPTIONAL: instant feedback (nice UX)
  const btn = event.target;
  btn.classList.add("pop");
  setTimeout(() => btn.classList.remove("pop"), 300);

  // 🔥 FIREBASE WRITE
  setDoc(doc(db, "votes", id), {
    upvotes: increment(up ? 1 : 0),
    downvotes: increment(!up ? 1 : 0)
  }, { merge: true });
};

window.rateSpeed = async (event, id, rating) => {
  event.stopPropagation();

  if (!canRateSpeed(id)) {
    alert("⏳ You already rated speed here. Try again later.");
    return;
  }

  recordSpeedRating(id);

  const el = event.target;
  el.classList.add("pop");
  setTimeout(() => el.classList.remove("pop"), 300);

  await setDoc(doc(db, "votes", id), {
    speedTotal: increment(rating),
    speedVotes: increment(1)
  }, { merge: true });

  // 🔥 FORCE UI REFRESH (THIS IS WHAT YOU WERE MISSING)
  render();
};

window.reportLocation = async (id) => {
  const reason = prompt("1 Wrong\n2 Duplicate\n3 Closed\n4 Bad\n5 Other");
  if (!reason) return;

  await addDoc(collection(db, "reports"), {
    locationId: id,
    reason,
    timestamp: Date.now()
  });
};

// ========================
// INIT
// ========================

window.addEventListener("DOMContentLoaded", () => {
  setHeader("Tap map to add • Tap shops to vote");
  loadLocationsRealtime();
});

// ========================
// GeoCoding
// ========================

async function getCityState(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );

    const data = await res.json();
    if (!data || !data.address) return {};

    const addr = data.address;

    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.hamlet ||
      "";

    const state =
      addr.state ||
      addr.region ||
      "";

    return { city, state };

  } catch (err) {
    console.warn("Geocode failed:", err);
    return {};
  }
}