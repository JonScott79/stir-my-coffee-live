import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ========================
// FIREBASE
// ========================

const app = initializeApp({
  apiKey: "AIzaSyDuPgwpIZfAoo_88NhfC4VfpOObPUVNnNM",
  authDomain: "stir-my-coffee.firebaseapp.com",
  projectId: "stir-my-coffee"
});

const db = getFirestore(app);

// ========================
// MAP
// ========================

const map = L.map("map").setView([39, -98], 4);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const markers = L.markerClusterGroup();
map.addLayer(markers);

// ========================
// STATE
// ========================

let allLocations = [];
let staticLocations = [];
let votesCache = {};
let newShopCoords = null;
let userLocation = null;
let tempMarker = null;

// ========================
// LOAD LOCATIONS
// ========================

async function loadLocationsRealtime() {
  const locationsRef = collection(db, "locations");

  // Static
  try {
    const res = await fetch("./coffeeLocations.json");
    const data = await res.json();

    staticLocations = data.map((loc, i) => ({
      ...loc,
      id: loc.id || `static_${i}`,
      isFirebase: false
    }));

    console.log("✅ Static loaded:", staticLocations.length);
  } catch (err) {
    console.warn("❌ Static load failed:", err);
  }

  // Firebase realtime
// Firebase realtime
onSnapshot(locationsRef, snapshot => {
  const customLocations = snapshot.docs.map(d => {
    const data = d.data();

    console.log("🔥 FIREBASE DOC:", data);

    let lat = Number(data.lat ?? data.latitude ?? data.location?.lat);
    let lng = Number(data.lng ?? data.long ?? data.longitude ?? data.location?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn("⚠️ FIXING BAD DATA:", data);
      lat = 0;
      lng = 0;
    }

    console.log("👉 FINAL COORDS:", { lat, lng });

    return {
      id: d.id,
      name: data.name || "Unnamed Shop",
      lat,
      lng,
      isFirebase: true
    };
  });

  console.log("🔥 Firebase locations:", customLocations.length);

  allLocations = [...staticLocations, ...customLocations];

  console.log("🔥 Total locations:", allLocations.length);

  render();

  const group = new L.featureGroup(markers.getLayers());
  if (group.getLayers().length > 0) {
    map.fitBounds(group.getBounds(), {
      padding: [50, 50],
      maxZoom: 14
    });
  }
});

} // ✅ THIS WAS MISSING

// ========================
// VOTES
// ========================

async function getVoteData(id) {
  if (votesCache[id]) return votesCache[id];

  const ref = doc(db, "votes", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return (votesCache[id] = { votes: 0, percent: 0 });
  }

  const d = snap.data();
  const votes = d.votes || 0;
  const stirs = d.stirs || 0;

  return (votesCache[id] = {
    votes,
    percent: votes ? Math.round((stirs / votes) * 100) : 0
  });
}

// ========================
// RENDER
// ========================

function render() {
  markers.clearLayers();

  console.log("=== RENDER START ===");

  for (let loc of allLocations) {
    if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
      console.warn("❌ STILL BAD:", loc);
      continue;
    }

    // 🚫 prevent bad fallback coords from polluting map
    if (loc.lat === 0 && loc.lng === 0) {
      console.warn("🚫 SKIPPING ZERO COORD:", loc);
      continue;
    }

const marker = L.circleMarker([loc.lat, loc.lng], {
  radius: loc.isFirebase ? 16 : 4,
  fillColor: loc.isFirebase ? "#ff0000" : "#aaa",
  fillOpacity: 1,
  color: "#000"
});

    marker.on("click", () => showPopup(loc));
    markers.addLayer(marker);
  }

  console.log("=== RENDER END ===");
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
// GEOLOCATION
// ========================

window.goToUser = () => {
  navigator.geolocation.getCurrentPosition(pos => {
    userLocation = [pos.coords.latitude, pos.coords.longitude];
    map.flyTo(userLocation, 14);
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

  if (tempMarker) map.removeLayer(tempMarker);

  tempMarker = L.marker(e.latlng)
    .addTo(map)
    .bindPopup("📍 New shop here")
    .openPopup();
});

window.submitShop = async () => {
  const name = document.getElementById("shopName").value;

  if (!name || !newShopCoords) {
    alert("Click map + enter name");
    return;
  }

  const marker = L.circleMarker([newShopCoords.lat, newShopCoords.lng], {
    radius: 8,
    fillColor: "#2ecc71",
    fillOpacity: 0.9,
    color: "#2ecc71"
  });

  marker.bindPopup(`<b>${name}</b><br>Pending votes`);
  markers.addLayer(marker);

  await addDoc(collection(db, "locations"), {
    name,
    lat: newShopCoords.lat,
    lng: newShopCoords.lng
  });

  alert("Added!");
};

// ========================
// NAV
// ========================

window.goToList = () => {
  window.location.href = "/";
};

// ========================
// INIT
// ========================

async function init() {
  await loadLocationsRealtime();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      userLocation = [pos.coords.latitude, pos.coords.longitude];

      map.flyTo(userLocation, 14, { duration: 0.6 });

      L.circleMarker(userLocation, {
        radius: 6,
        fillColor: "#007bff",
        fillOpacity: 1,
        color: "#fff",
        weight: 2
      }).addTo(map);
    });
  }
}

init();