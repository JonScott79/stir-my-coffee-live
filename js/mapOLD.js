// ========================
// GLOBAL STATE
// ========================

let allLocations = [];
let staticLocations = [];
let hasFitBounds = false;
let activeMarker = null;
let votesData = {};

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

const markers = L.markerClusterGroup();
map.addLayer(markers);

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
// LOAD LOCATIONS
// ========================

async function loadLocationsRealtime() {
  const locationsRef = collection(db, "locations");
  const votesRef = collection(db, "votes");

  let locationsData = [];

  function combineAndRender() {
    let combined = [...staticLocations];

    if (locationsData.length) {
      const customLocations = locationsData.map(d => {
        const id = d.id || generateLocationId(d.name, d.lat, d.lng);
        const v = votesData[id] || {};

        return {
          id,
          name: d.name,
          lat: Number(d.lat),
          lng: Number(d.lng),
          ...v
        };
      });

      combined = [...combined, ...customLocations];
    }

    allLocations = combined.map(loc => {
      const lat = Number(loc.lat);
      const lng = Number(loc.lng);

      const id = loc.id || generateLocationId(loc.name, lat, lng);
      const v = votesData[id] || {};

      const up = v.upvotes || 0;
      const down = v.downvotes || 0;
      const total = up + down;

      // 🔥 FIXED HERE (speedVotes instead of speedCount)
      const speedTotal = v.speedTotal || 0;
      const speedVotes = v.speedVotes || 0;

      return {
        ...loc,
        id,
        lat,
        lng,
        percent: total ? Math.round((up / total) * 100) : 0,
        speed: speedVotes ? (speedTotal / speedVotes) : 0,
        votes: total
      };
    });

    render();
  }

  // STATIC
  const res = await fetch("./coffeeLocations.json");
  const data = await res.json();

  staticLocations = data.map(loc => ({
    ...loc,
    id: generateLocationId(loc.name, loc.lat, loc.lng)
  }));

  combineAndRender();

  // FIREBASE LOCATIONS
  onSnapshot(locationsRef, snapshot => {
    locationsData = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    combineAndRender();
  });

  // FIREBASE VOTES
  onSnapshot(votesRef, snapshot => {
    votesData = {};
    snapshot.forEach(docSnap => {
      votesData[docSnap.id] = docSnap.data();
    });
    combineAndRender();
  });
}

// ========================
// RENDER
// ========================

function render() {
  markers.clearLayers();

  for (const loc of allLocations) {
    const marker = L.circleMarker([loc.lat, loc.lng], {
      radius: window.innerWidth < 600 ? 4 : 6,
      fillColor: "#4b2e2b",
      fillOpacity: 0.9,
      color: "#fff",
      weight: 1
    });

    marker.bindPopup(`
      <b>${loc.name}</b><br><br>

      <b>Accuracy:</b> ${loc.percent}% (${loc.votes} votes)<br>
      <b>Speed:</b> ${loc.speed ? loc.speed.toFixed(1) : "N/A"} ⭐<br><br>

      <div class="vote-inline">
        <button onclick="vote(event, '${loc.id}', true)">👍</button>
        <button onclick="vote(event, '${loc.id}', false)">👎</button>
      </div>

      <br>

<div class="stars">
  ${Array.from({ length: 5 }, (_, i) => {
    const rounded = Math.round(loc.speed || 0);
    const filled = i + 1 <= rounded ? "★" : "☆";

    return `
      <span
        role="button"
        tabindex="0"
        aria-label="Rate ${i + 1} stars"
        onclick="rateSpeed(event, '${loc.id}', ${i + 1})"
        onkeypress="if(event.key==='Enter'){rateSpeed(event, '${loc.id}', ${i + 1})}">
        ${filled}
      </span>
    `;
  }).join("")}
</div>

      <br>

      <button onclick="reportLocation('${loc.id}')">🚩 Report</button>
    `);

    markers.addLayer(marker);
  }
}

// ========================
// VOTE
// ========================

window.vote = function (event, id, up) {
  event.stopPropagation();

  if (!canVote(id)) return alert("⏳ Wait 24h");

  recordVote(id);

  setDoc(doc(db, "votes", id), {
    upvotes: increment(up ? 1 : 0),
    downvotes: increment(!up ? 1 : 0)
  }, { merge: true });
};

// ========================
// SPEED
// ========================

window.rateSpeed = async (event, id, rating) => {
  event.stopPropagation();

  await setDoc(doc(db, "votes", id), {
    speedTotal: increment(rating),
    speedCount: increment(1)
  }, { merge: true });
};

// ========================
// REPORT
// ========================

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

window.addEventListener("DOMContentLoaded", loadLocationsRealtime);