// ========================
// LOADING MESSAGES
// ========================

const loadingMessages = [
  "Brewing your map ☕",
  "Grinding the beans...",
  "Stirring the data...",
  "Finding fast coffee...",
  "Condensing road rage...",
  "Calculating caffeine routes...",
  "Optimizing your morning...",
  "Avoiding slow baristas...",
  "Scanning for elite coffee...",
  "Fueling your commute...",
  "Locating liquid motivation...",
  "Balancing speed vs quality...",
  "Measuring stir efficiency...",
  "Reducing coffee disappointment..."
];

// ========================
// FIREBASE
// ========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyDuPgwpIZfAoo_88NhfC4VfpOObPUVNnNM",
  authDomain: "stir-my-coffee.firebaseapp.com",
  projectId: "stir-my-coffee",
  storageBucket: "stir-my-coffee.firebasestorage.app",
  messagingSenderId: "466856067497",
  appId: "1:466856067497:web:4f6e5b4825b380530984b8"
});

const db = getFirestore(app);

// ========================
// MAP SETUP
// ========================

const map = L.map("map").setView([39, -98], 4);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const markers = L.markerClusterGroup();
map.addLayer(markers);

// ========================
// STATE
// ========================

let allLocations = [];
let votesCache = {};
let newShopCoords = null;
let userLocation = null;

const closestList = document.getElementById("closestList");

// ========================
// LOADING UI
// ========================

function showLoading() {
  const text = document.getElementById("loadingText");
  if (text) {
    text.innerText =
      loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
  }
}

function hideLoading() {
  const screen = document.getElementById("loadingScreen");
  if (screen) screen.style.display = "none";
}

// ========================
// LOAD LOCATIONS
// ========================

async function loadLocations() {
  console.log("Loading locations...");

  const res = await fetch("coffeeLocations.json");
  const staticLocations = (await res.json()).map((loc, i) => ({
    ...loc,
    id: loc.id || `static_${i}`
  }));

  const snap = await getDocs(collection(db, "locations"));
  const customLocations = snap.docs.map(d => ({
    ...d.data(),
    id: d.id
  }));

  allLocations = [...staticLocations, ...customLocations];

  console.log("Locations loaded:", allLocations.length);
}

// ========================
// VOTES
// ========================

async function getVoteData(id) {
  if (votesCache[id]) return votesCache[id];

  try {
    const ref = doc(db, "votes", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      votesCache[id] = { votes: 0, percent: 0 };
      return votesCache[id];
    }

    const d = snap.data();
    const votes = d.votes || 0;
    const stirs = d.stirs || 0;

    const data = {
      votes,
      percent: votes ? Math.round((stirs / votes) * 100) : 0
    };

    votesCache[id] = data;
    return data;

  } catch (err) {
    console.warn("Vote fetch failed:", err);
    return { votes: 0, percent: 0 };
  }
}

// ========================
// RENDER MAP
// ========================

function render() {
  markers.clearLayers();

  for (let loc of allLocations) {
    const marker = L.circleMarker([loc.lat, loc.lng], {
      radius: 8,
      fillColor: "#aaa",
      fillOpacity: 0.9,
      color: "#333"
    });

    marker.on("click", () => showPopup(loc));

    markers.addLayer(marker);
  }

  if (userLocation) updateClosest();
}

// ========================
// POPUP
// ========================

function showPopup(loc) {
  getVoteData(loc.id).then(s => {
    L.popup()
      .setLatLng([loc.lat, loc.lng])
      .setContent(`
        <b>${loc.name}</b><br>
        Stir: ${s.votes ? s.percent + "%" : "—"}<br>
        <button onclick="vote(event,'${loc.id}',true)">👍</button>
        <button onclick="vote(event,'${loc.id}',false)">👎</button>
      `)
      .openOn(map);
  });
}

// ========================
// VOTE
// ========================

window.vote = async (e, id, yes) => {
  let ref = doc(db, "votes", id);
  let snap = await getDoc(ref);
  let d = snap.exists() ? snap.data() : {};

  let votes = (d.votes || 0) + 1;
  let stirs = (d.stirs || 0) + (yes ? 1 : 0);

  await setDoc(ref, { ...d, votes, stirs });

  votesCache[id] = {
    votes,
    percent: Math.round((stirs / votes) * 100)
  };

  render();
};

// ========================
// CLOSEST PANEL
// ========================

function updateClosest() {
  if (!userLocation || !closestList) return;

  let list = allLocations
    .map(loc => {
      const d = map.distance([loc.lat, loc.lng], userLocation);
      const s = votesCache[loc.id] || { percent: 0 };

      return {
        ...loc,
        d,
        percent: s.percent
      };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);

  closestList.innerHTML = list.map(l => `
    <div class="location-card" onclick="focusLocation('${l.id}')">
      <div>${l.name}</div>
      <div>${(l.d / 1609).toFixed(2)} mi</div>
      <button onclick="openDirections(event, ${l.lat}, ${l.lng})">📍</button>
    </div>
  `).join("");
}

window.focusLocation = (id) => {
  const loc = allLocations.find(l => l.id === id);
  if (!loc) return;

  map.flyTo([loc.lat, loc.lng], 16);
  showPopup(loc);
};

window.openDirections = (e, lat, lng) => {
  e.stopPropagation();
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
};

// ========================
// GEOLOCATION
// ========================

window.goToUser = () => {
  navigator.geolocation.getCurrentPosition(pos => {
    userLocation = [pos.coords.latitude, pos.coords.longitude];
    map.flyTo(userLocation, 14);
    updateClosest();
  });
};

// ========================
// ADD LOCATION
// ========================

window.openSubmitForm = () => {
  document.getElementById("submitPanel").style.display = "block";
};

window.closeSubmitForm = () => {
  document.getElementById("submitPanel").style.display = "none";
};

map.on("click", (e) => {
  newShopCoords = e.latlng;
  console.log("Selected:", newShopCoords);
});

window.submitShop = async () => {
  const name = document.getElementById("shopName").value;

  if (!name || !newShopCoords) {
    alert("Click map + enter name");
    return;
  }

  await addDoc(collection(db, "locations"), {
    name,
    lat: newShopCoords.lat,
    lng: newShopCoords.lng,
    source: "user"
  });

  alert("Added!");

  await loadLocations();
  render();
};

// ========================
// INIT
// ========================

async function init() {
  console.log("INIT START");

  showLoading();

  try {
    await loadLocations();
    render();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        userLocation = [pos.coords.latitude, pos.coords.longitude];
        updateClosest();
      });
    }

  } catch (err) {
    console.error("INIT FAILED:", err);
  }

  hideLoading();
}

init();