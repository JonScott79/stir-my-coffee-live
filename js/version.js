window.APP_VERSION = "v3.1.2";

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("appVersion");
  if (el && window.APP_VERSION) {
    el.textContent = window.APP_VERSION;
  }
});