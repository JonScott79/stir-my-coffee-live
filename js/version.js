window.APP_VERSION = "v2.6.0";

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("appVersion");
  if (el && window.APP_VERSION) {
    el.textContent = window.APP_VERSION;
  }
});