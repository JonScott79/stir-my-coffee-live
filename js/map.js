// ========================
// GLOBALS
// ========================



window.reportLocation = async (id) => {
  try {
    const loc = allLocations.find(l => l.id === id);

    await addDoc(collection(db, "reports"), {
      locationId: id,
      name: loc?.name || "Unknown",
      lat: loc?.lat,
      lng: loc?.lng,
      timestamp: Date.now()
    });

    alert("✅ Location reported. Thanks!");

  } catch (err) {
    console.error("❌ REPORT FAILED:", err);
    alert("❌ Report failed — check console");
    throw err; // 🔥 important for button recovery
  }
};







let isAddingMode = false;


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

const markers = L.markerClusterGroup({
  iconCreateFunction: function (cluster) {
    const count = cluster.getChildCount();

    return L.divIcon({
      html: `<div class="cluster-icon">${count}</div>`,
      className: "custom-cluster",
      iconSize: L.point(40, 40)
    });
  }
});
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
  radius: 6,
  fillColor: "#4b2e2b", // your brand color
  fillOpacity: 0.9,
  color: "#fff",
  weight: 1
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
  const popup = L.popup()
    .setLatLng([loc.lat, loc.lng])
    .setContent(`
      <b>${loc.name}</b><br><br>
      <button class="reportBtn">🚩 Report Location</button>
    `)
    .openOn(map);

  setTimeout(() => {
    const popupEl = document.querySelector(".leaflet-popup");
    const btn = popupEl?.querySelector(".reportBtn");

    if (btn) {
      btn.onclick = async () => {
        btn.disabled = true;

        try {
          await reportLocation(loc.id);
        } catch (err) {
          btn.disabled = false;
        }
      };
    }
  }, 0);
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
  isAddingMode = true;
  document.getElementById("submitPanel").style.display = "block";
};

window.closeSubmitForm = () => {
  document.getElementById("submitPanel").style.display = "none";
};

map.on("click", (e) => {
  if (!isAddingMode) return; // 🚫 BLOCK unless adding

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
    radius: 6,
    fillColor: "#4b2e2b",
    fillOpacity: 0.9,
    color: "#fff",
    weight: 1
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

window.closeSubmitForm = () => {
  isAddingMode = false;
  document.getElementById("submitPanel").style.display = "none";

  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
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