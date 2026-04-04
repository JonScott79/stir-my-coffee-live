// ========================
// GLOBAL STATE
// ========================

let isAddingMode = false;
let allLocations = [];
let staticLocations = [];
let newShopCoords = null;
let userLocation = null;
let tempMarker = null;
let hasFitBounds = false;

// ========================
// FIREBASE
// ========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyDuPgwpIZfAoo_88NhfC4VfpOObPUVNnNM",
  authDomain: "stir-my-coffee.firebaseapp.com",
  projectId: "stir-my-coffee"
});

const db = getFirestore(app);

// ========================
// MAP SETUP (🌍 GLOBAL)
// ========================

const map = L.map("map", {
  zoomControl: false
}).setView([20, 0], 2);

// Add zoom control manually in bottom-right
L.control.zoom({
  position: "bottomright"
}).addTo(map);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const markers = L.markerClusterGroup({
  iconCreateFunction: cluster => {
    return L.divIcon({
      html: `<div class="cluster-icon">${cluster.getChildCount()}</div>`,
      className: "custom-cluster",
      iconSize: L.point(40, 40)
    });
  }
});

map.addLayer(markers);

// ========================
// LOAD LOCATIONS
// ========================

async function loadLocationsRealtime() {
  const locationsRef = collection(db, "locations");

  // Static locations
  try {
    const res = await fetch("./coffeeLocations.json");
    const data = await res.json();

    staticLocations = data.map((loc, i) => ({
      ...loc,
      id: loc.id || `static_${i}`
    }));
  } catch (err) {
    console.warn("❌ Static load failed:", err);
  }

  // Firebase realtime locations
  onSnapshot(locationsRef, snapshot => {
    const customLocations = snapshot.docs
      .map(doc => {
        const data = doc.data();

        const lat = Number(data.lat ?? data.latitude ?? data.location?.lat);
        const lng = Number(data.lng ?? data.long ?? data.longitude ?? data.location?.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          console.warn("❌ BAD DATA:", data);
          return null;
        }

        return {
          id: doc.id,
          name: data.name || "Unnamed Shop",
          lat,
          lng
        };
      })
      .filter(Boolean);

    allLocations = [...staticLocations, ...customLocations];

    render();

    // ✅ Fit bounds ONLY ONCE
    const group = new L.featureGroup(markers.getLayers());
    if (!hasFitBounds && group.getLayers().length > 0) {
      map.fitBounds(group.getBounds(), {
        padding: [50, 50],
        maxZoom: 14
      });
      hasFitBounds = true;
    }
  });
}

// ========================
// RENDER
// ========================

function render() {
  markers.clearLayers();

  for (const loc of allLocations) {
    const marker = L.circleMarker([loc.lat, loc.lng], {
      radius: 6,
      fillColor: "#4b2e2b",
      fillOpacity: 0.9,
      color: "#fff",
      weight: 1
    });

    marker.bindPopup(createPopupContent(loc));

    let hoverTimeout;

    marker.on("mouseover", function () {
      clearTimeout(hoverTimeout);
      this.openPopup();
    });

    marker.on("mouseout", function () {
      hoverTimeout = setTimeout(() => {
        this.closePopup();
      }, 150);
    });

    markers.addLayer(marker);
  }
}

// ========================
// POPUP
// ========================

function createPopupContent(loc) {
  return `
    <b>${loc.name}</b><br><br>
    <button onclick="reportLocation('${loc.id}')">🚩 Report Location</button>
  `;
}

// ========================
// REPORT SYSTEM
// ========================

window.reportLocation = async (id) => {
  if (!confirm("Report this location?")) return;

  try {
    await addDoc(collection(db, "reports"), {
      locationId: id,
      timestamp: Date.now()
    });

    alert("✅ Report submitted");
  } catch (err) {
    console.error("Report failed:", err);
    alert("❌ Failed to report");
  }
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
  isAddingMode = false;
  document.getElementById("submitPanel").style.display = "none";

  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
};

map.on("click", e => {
  if (!isAddingMode) return;

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

  await addDoc(collection(db, "locations"), {
    name,
    lat: newShopCoords.lat,
    lng: newShopCoords.lng
  });

  alert("✅ Added!");
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