// /admin/admin.js

const firebaseConfig = {
  apiKey: "AIzaSyDuPgwpIZfAoo_88NhfC4VfpOObPUVNnNM",
  authDomain: "stir-my-coffee.firebaseapp.com",
  projectId: "stir-my-coffee"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

const ADMIN_EMAIL = "hello@stirmycoffee.com";

const bootLines = [
  "LINKING FIRESTORE NODES...",
  "VERIFYING NETWORK INTEGRITY...",
  "LOADING INCIDENT QUEUE...",
  "SYNCING COFFEENOMICS...",
  "BEACON TELEMETRY ONLINE...",
  "TACTICAL LINK ESTABLISHED"
];

let emailInput;
let passwordInput;
let loginView;
let app;

let metricLocations;
let metricVotes;
let metricReports;
let metricAccuracy;

let initialized = false;
let bootFinished = false;



// =====================================
// DOM
// =====================================

function cacheElements() {

  emailInput = document.getElementById("emailInput");
  passwordInput = document.getElementById("passwordInput");

  loginView = document.getElementById("loginView");
  app = document.getElementById("app");

  metricLocations = document.getElementById("metricLocations");
  metricVotes = document.getElementById("metricVotes");
  metricReports = document.getElementById("metricReports");
  metricAccuracy = document.getElementById("metricAccuracy");

}



// =====================================
// BOOT
// =====================================

window.addEventListener("load", async () => {

  cacheElements();

  bindButtons();

  await runBootSequence();

});

async function runBootSequence() {

  const container =
    document.getElementById(
      "bootLines"
    );

  if (!container) return;

  container.innerHTML = "";

  for (const line of bootLines) {

    await delay(300);

    const div =
      document.createElement(
        "div"
      );

    div.textContent = line;

    container.appendChild(div);

  }

  await delay(500);

  document
    .getElementById(
      "bootScreen"
    )
    .style.display = "none";

  bootFinished = true;

}

function delay(ms) {

  return new Promise(
    resolve => {

      setTimeout(
        resolve,
        ms
      );

    }
  );

}



// =====================================
// AUTH
// =====================================

function bindButtons() {

  document
    .getElementById(
      "loginBtn"
    )
    ?.addEventListener(
      "click",
      e => {

        e.preventDefault();

        login();

      }
    );

  document
    .getElementById(
      "logoutBtn"
    )
    ?.addEventListener(
      "click",
      logout
    );

  passwordInput
    ?.addEventListener(
      "keydown",
      e => {

        if (
          e.key === "Enter"
        ) {

          login();

        }

      }
    );

}

async function login() {

  const email =
    emailInput.value
      .trim();

  const password =
    passwordInput.value;

  if (
    !email ||
    !password
  ) {

    alert(
      "Enter email and password"
    );

    return;

  }

  try {

    await auth
      .signInWithEmailAndPassword(
        email,
        password
      );

  }

  catch(err){

    console.error(err);

    alert(
      err.message
    );

  }

}

function logout() {

  initialized = false;

  auth.signOut();

}

auth.onAuthStateChanged(
async user => {

  if (
    !loginView ||
    !app
  ) return;

  while (!bootFinished) {

    await delay(100);

  }

  if (!user) {

    app.classList.add(
      "hidden"
    );

    loginView.classList.remove(
      "hidden"
    );

    return;

  }

  const email =
    user.email
      .trim()
      .toLowerCase();

  if (
    email !==
    ADMIN_EMAIL
      .toLowerCase()
  ) {

    alert(
      "Unauthorized"
    );

    await auth.signOut();

    return;

  }

  loginView.classList.add(
    "hidden"
  );

  app.classList.remove(
    "hidden"
  );

  if (!initialized) {

    initialized = true;

    await init();

  }

});



// =====================================
// INIT
// =====================================

async function init() {

  await Promise.allSettled([

    loadMetrics(),
    loadReports(),
    loadBeaconStats()

  ]);

  addEvent(
    "TACTICAL SYSTEMS ONLINE"
  );

  startFakeFeed();

}



// =====================================
// METRICS
// =====================================

async function loadMetrics() {

  const [
    locations,
    votes,
    reports
  ] = await Promise.all([

    db.collection(
      "locations"
    ).get(),

    db.collection(
      "votes"
    ).get(),

    db.collection(
      "reports"
    ).get()

  ]);

  metricLocations.textContent =
    locations.size;

  metricReports.textContent =
    reports.size;

  let total = 0;

  votes.forEach(doc=>{

    const d =
      doc.data();

    total +=
      (d.upvotes || 0) +
      (d.downvotes || 0);

  });

  metricVotes.textContent =
    total;

  metricAccuracy.textContent =
    "100%";

}



// =====================================
// REPORTS
// =====================================

async function loadReports(){

  const container =
    document.getElementById(
      "reportsContainer"
    );

  container.innerHTML =
    "Loading incidents...";

  const snapshot =
    await db
      .collection(
        "reports"
      )
      .get();

  container.innerHTML="";

  if (
    snapshot.empty
  ){

    container.innerHTML=`
      <div class="event">
        NO INCIDENTS
      </div>
    `;

    return;
  }

  snapshot.forEach(doc=>{

    const div =
      document.createElement(
        "div"
      );

    div.className =
      "report-item";

    div.innerHTML=`
      <strong>
        Report
      </strong>

      <div>
        ${doc.data().reason || ""}
      </div>
    `;

    container.appendChild(
      div
    );

  });

}



// =====================================
// TELEMETRY
// =====================================

async function loadBeaconStats(){

  document.getElementById(
    "stickerStats"
  ).innerHTML=`

    <div class="event">

      TELEMETRY ONLINE

    </div>

  `;

}



// =====================================
// EVENT FEED
// =====================================

function addEvent(message){

  const feed =
    document.getElementById(
      "eventFeed"
    );

  if(!feed)
    return;

  const div =
    document.createElement(
      "div"
    );

  div.className =
    "event";

  div.textContent =
    "[" +
    new Date()
      .toLocaleTimeString() +
    "] " +
    message;

  feed.prepend(
    div
  );

}

const fakeEvents=[

  "Vote Registered",
  "Beacon Ping",
  "Operator Activity"

];

let started=false;

function startFakeFeed(){

  if(started)
    return;

  started=true;

  setInterval(()=>{

    const msg=
      fakeEvents[
        Math.floor(
          Math.random() *
          fakeEvents.length
        )
      ];

    addEvent(msg);

  },5000);

}