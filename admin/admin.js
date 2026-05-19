// /admin/admin.js

const firebaseConfig = {
  apiKey: "AIzaSyDuPgwpIZfAoo_88NhfC4VfpOObPUVNnNM",
  authDomain: "stir-my-coffee.firebaseapp.com",
  projectId: "stir-my-coffee"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

// =====================================
// CONFIG
// =====================================

const ADMIN_EMAIL = "hello@stirmycoffee.com";

// =====================================
// BOOT SEQUENCE
// =====================================

const bootLines = [
  "LINKING FIRESTORE NODES...",
  "SCANNING ACTIVE OUTPOSTS...",
  "VERIFYING NETWORK INTEGRITY...",
  "LOADING INCIDENT QUEUE...",
  "SYNCING COFFEENOMICS...",
  "ESTABLISHING TACTICAL LINK...",
  "BEACON TELEMETRY ONLINE...",
  "TACTICAL LINK ESTABLISHED"
];

// =====================================
// GLOBAL STATE & DOM ELEMENTS
// =====================================

let allLocations = [];

// Explicitly declared DOM references to prevent ReferenceErrors
let emailInput, passwordInput, loginView, app, searchInput;
let metricLocations, metricVotes, metricReports, metricAccuracy;

// =====================================
// BOOT
// =====================================

window.addEventListener("load", async () => {

  // Bind form inputs and view structures
  emailInput = document.getElementById("emailInput") || document.querySelector("input[type='email']");
  passwordInput = document.getElementById("passwordInput") || document.querySelector("input[type='password']");
  loginView = document.getElementById("loginView");
  app = document.getElementById("app");
  searchInput = document.getElementById("searchInput");

  // Bind metrics elements
  metricLocations = document.getElementById("metricLocations");
  metricVotes = document.getElementById("metricVotes");
  metricReports = document.getElementById("metricReports");
  metricAccuracy = document.getElementById("metricAccuracy");

  const container =
    document.getElementById("bootLines");

  for (const line of bootLines) {

    await delay(450);

    const div =
      document.createElement("div");

    div.textContent = line;

    container.appendChild(div);
  }

  await delay(800);

  document.getElementById("bootScreen")
    .style.display = "none";

  if (loginView) {
    loginView.classList.remove("hidden");
  }
});

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// =====================================
// LOGIN
// =====================================

// Safely bind event listeners and handle default form submissions
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault(); 
    login();
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
}

function login() {
  if (!emailInput || !passwordInput) {
    console.error("Authentication DOM inputs are missing.");
    return;
  }

  const email =
    emailInput.value.trim();

  const password =
    passwordInput.value;

  auth.signInWithEmailAndPassword(
    email,
    password
  )
  .catch(err => {
    console.error(err);
    alert(err.message);
  });
}

function logout() {
  auth.signOut();
}

auth.onAuthStateChanged(user => {

  // Guard rails in case DOM elements aren't initialized yet
  if (!loginView || !app) return;

  // Block non-admins
  if (user && user.email !== ADMIN_EMAIL) {

    alert("Unauthorized operator.");

    auth.signOut();

    return;
  }

  if (user) {

    loginView.classList.add("hidden");

    app.classList.remove("hidden");

    addEvent(
      `OPERATOR LINKED — ${user.email}`
    );

    // Force token refresh before init
    user.getIdToken(true)
      .then(() => init())
      .catch(err => {

        console.error(err);

        addEvent(
          "AUTH TOKEN FAILURE"
        );

      });

  } else {

    app.classList.add("hidden");

    loginView.classList.remove("hidden");
  }

});

// =====================================
// INIT
// =====================================

async function init() {

  try {

    const results =
      await Promise.allSettled([

        loadMetrics(),

        loadReports(),

        loadLocations(),

        loadBeaconStats()

      ]);

    results.forEach(result => {

      if (
        result.status === "rejected"
      ) {

        console.error(
          result.reason
        );

        addEvent(
          `MODULE ERROR`
        );

      }

    });

    startFakeFeed();

    addEvent(
      "TACTICAL SYSTEMS ONLINE"
    );

  } catch(err) {

    console.error(err);

    addEvent(
      "SYSTEM ERROR DETECTED"
    );

  }

}

// =====================================
// METRICS
// =====================================

async function loadMetrics() {

  const locationsSnap =
    await db.collection("locations")
      .get();

  const votesSnap =
    await db.collection("votes")
      .get();

  const reportsSnap =
    await db.collection("reports")
      .get();

  let totalVotes = 0;

  let totalAccuracy = 0;

  let counted = 0;

  votesSnap.forEach(doc => {

    const d = doc.data();

    const up =
      d.upvotes || 0;

    const down =
      d.downvotes || 0;

    const total =
      up + down;

    totalVotes += total;

    if (total > 0) {

      totalAccuracy +=
        (up / total) * 100;

      counted++;
    }
  });

  const avgAccuracy =
    counted
      ? Math.round(totalAccuracy / counted)
      : 0;

  metricLocations.textContent =
    locationsSnap.size;

  metricVotes.textContent =
    totalVotes;

  metricReports.textContent =
    reportsSnap.size;

  metricAccuracy.textContent =
    avgAccuracy + "%";

  addEvent(
    "TACTICAL METRICS SYNCHRONIZED"
  );
}

// =====================================
// REPORTS
// =====================================

async function loadReports() {

  const container =
    document.getElementById(
      "reportsContainer"
    );

  const snapshot =
    await db.collection("reports")
      .orderBy("timestamp", "desc")
      .limit(25)
      .get();

  container.innerHTML = "";

  if (snapshot.empty) {

    container.innerHTML = `
      <div class="event">
        NO ACTIVE INCIDENTS
      </div>
    `;

    return;
  }

  snapshot.forEach(doc => {

    const d = doc.data();

    const div =
      document.createElement("div");

    div.className = "report-item";

    div.innerHTML = `

      <div>
        <strong>
          ${d.name || "Unknown Outpost"}
        </strong>
      </div>

      <div class="report-reason">
        ${d.reason || "Unknown"}
      </div>

      <div style="
        margin-top:12px;
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      ">

        <button
          class="view-btn"
          onclick="viewLocation(
            ${d.lat},
            ${d.lng}
          )">

          VIEW

        </button>

        <button
          class="hide-btn"
          onclick="hideLocation(
            '${d.locationId}'
          )">

          HIDE

        </button>

        <button
          class="ignore-btn"
          onclick="ignoreReport(
            '${doc.id}'
          )">

          IGNORE

        </button>

        <button
          class="delete-btn"
          onclick="deleteReportedLocation(
            '${d.locationId}',
            '${doc.id}'
          )">

          DELETE

        </button>

      </div>
    `;

    container.appendChild(div);

  });

  addEvent(
    `${snapshot.size} INCIDENTS LOADED`
  );

}
async function ignoreReport(reportId) {

  const ok =
    confirm(
      "IGNORE THIS INCIDENT?"
    );

  if (!ok) return;

  try {

    await db.collection("reports")
      .doc(reportId)
      .delete();

    addEvent(
      "INCIDENT DISMISSED"
    );

    await loadReports();

    await loadMetrics();

  } catch(err) {

    console.error(err);

    alert(
      "Ignore failed"
    );

  }

}

// =====================================
// LOCATIONS
// =====================================

async function loadLocations() {

  const snapshot =
    await db.collection("locations")
      .limit(200)
      .get();

  allLocations =
    snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  renderLocations(allLocations);

  addEvent(
    `${allLocations.length} OUTPOSTS LINKED`
  );
}

function renderLocations(list) {

  const container =
    document.getElementById(
      "locationsContainer"
    );

  container.innerHTML = "";

  list.forEach(loc => {

    const div =
      document.createElement("div");

    div.className =
      "location-card";

    div.innerHTML = `

      <div class="location-name">
        ${loc.name || "Unnamed"}
      </div>

      <div class="location-meta">
        ${loc.city || "Unknown"},
        ${loc.state || ""}
      </div>

      <div class="location-actions">

        <button
          class="view-btn"
          onclick="viewLocation(
            ${loc.lat},
            ${loc.lng}
          )">

          VIEW

        </button>

        <button
          class="hide-btn"
          onclick="hideLocation(
            '${loc.id}'
          )">

          HIDE

        </button>

        <button
          class="delete-btn"
          onclick="deleteLocation(
            '${loc.id}'
          )">

          DELETE

        </button>

      </div>
    `;

    container.appendChild(div);
  });
}

// =====================================
// SEARCH
// =====================================

searchInput.addEventListener(
  "input",
  () => {

    const term =
      searchInput.value
        .toLowerCase();

    const filtered =
      allLocations.filter(l =>
        (l.name || "")
          .toLowerCase()
          .includes(term)
      );

    renderLocations(filtered);
  }
);

// =====================================
// ACTIONS
// =====================================

function viewLocation(lat, lng) {

  window.open(
    `../map.html?lat=${lat}&lng=${lng}`,
    "_blank"
  );
}

async function hideLocation(id) {

  try {

    await db.collection("locations")
      .doc(id)
      .update({
        hidden: true
      });

    addEvent(
      `OUTPOST HIDDEN — ${id}`
    );

    loadLocations();

  } catch (err) {

    console.error(err);

    alert("Hide failed");
  }
}

async function deleteLocation(id) {

  const ok =
    confirm(
      "DELETE OUTPOST FROM NETWORK?"
    );

  if (!ok) return;

  try {

    await db.collection("locations")
      .doc(id)
      .delete();

    addEvent(
      `OUTPOST DELETED — ${id}`
    );

    loadLocations();

  } catch (err) {

    console.error(err);

    alert("Delete failed");
  }
}

async function deleteReportedLocation(
  locationId,
  reportId
) {

  const ok =
    confirm(
      "DELETE REPORTED OUTPOST?"
    );

  if (!ok) return;

  try {

    await db.collection("locations")
      .doc(locationId)
      .delete();

    await db.collection("reports")
      .doc(reportId)
      .delete();

    addEvent(
      "OUTPOST REMOVED FROM NETWORK"
    );

    loadReports();

    loadLocations();

  } catch (err) {

    console.error(err);

    alert("Delete failed");
  }
}

// =====================================
// QR / BEACON TELEMETRY
// =====================================

async function loadBeaconStats() {

  const today =
    new Date();

  today.setHours(0,0,0,0);

  const snap =
    await db.collection("qrScans")
      .get();

  const stickerCounts = {};

  let todayCount = 0;

  snap.forEach(doc => {

    const d = doc.data();

    if (!d.sticker) return;

    stickerCounts[d.sticker] =
      (stickerCounts[d.sticker] || 0) + 1;

    if (
      d.timestamp >= today.getTime()
    ) {

      todayCount++;
    }
  });

  // DAILY COUNTER

  const metric =
    document.getElementById(
      "metricHits"
    );

  if (metric) {

    metric.textContent =
      todayCount;
  }

  // SORT

  const sorted =
    Object.entries(stickerCounts)
      .sort((a,b)=>b[1]-a[1]);

  // RENDER

  const container =
    document.getElementById(
      "stickerStats"
    );

  if (!container) return;

  if (!sorted.length) {

    container.innerHTML = `
      <div class="event">
        NO BEACON TELEMETRY DETECTED
      </div>
    `;

    return;
  }

  container.innerHTML =
    sorted.map(([id,count]) => `

      <div class="report-item">

        <strong>
          ${id}
        </strong>

        <div class="report-reason">
          ${count} beacon pings
        </div>

      </div>

    `).join("");

  addEvent(
    "BEACON TELEMETRY SYNCHRONIZED"
  );
}

// =====================================
// EVENT FEED
// =====================================

function addEvent(message) {

  const feed =
    document.getElementById(
      "eventFeed"
    );

  if (!feed) return;

  const div =
    document.createElement("div");

  div.className = "event";

  const time =
    new Date()
      .toLocaleTimeString();

  div.textContent =
    `[${time}] ${message}`;

  feed.prepend(div);

  while (feed.children.length > 30) {

    feed.removeChild(
      feed.lastChild
    );
  }
}

// =====================================
// ATMOSPHERIC FEED
// =====================================

const fakeEvents = [

  "Beacon Ping — QR014",
  "Vote Registered — Boston",
  "Incident Filed — Dunkin",
  "New Outpost Added — Worcester",
  "Regional rankings updated",
  "Operator activity detected",
  "Morning rush conditions elevated",
  "Network stability holding",
  "Sector activity spike detected",
  "Coffee telemetry updated"
];

let feedStarted = false;

function startFakeFeed() {

  if (feedStarted) return;

  feedStarted = true;

  setInterval(() => {

    const msg =
      fakeEvents[
        Math.floor(
          Math.random() *
          fakeEvents.length
        )
      ];

    addEvent(msg);

  }, 5000);
}