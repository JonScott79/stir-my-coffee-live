// ========================
// THEMES
// ========================

function setThemeLink(linkEl, href, fallbackHref = "") {
  if (!linkEl) return;

  linkEl.onerror = null;
  linkEl.onload = null;

  linkEl.onerror = () => {
    console.warn(`❌ Failed to load theme: ${href}`);

    if (fallbackHref && linkEl.href !== window.location.origin + "/" + fallbackHref) {
      console.log(`↩️ Falling back to: ${fallbackHref}`);
      linkEl.href = fallbackHref;
    } else {
      console.warn("🚨 Fallback also failed, removing theme.");
      linkEl.href = "";
    }
  };

  linkEl.href = href;
}

function applyTheme(base, holiday = null) {
  const fade = document.getElementById("themeFade");
  const baseLink = document.getElementById("baseTheme");
  const holidayLink = document.getElementById("holidayTheme");

  if (fade) fade.classList.add("active");

  setTimeout(() => {
    setThemeLink(baseLink, `css/${base}_style.css`, "css/styles.css");

    if (holiday) {
      setThemeLink(holidayLink, `css/${holiday}_style.css`);
    } else if (holidayLink) {
      holidayLink.href = "";
    }

    setTimeout(() => {
      if (fade) fade.classList.remove("active");
    }, 50);

  }, 200);
}

function autoTheme() {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  let base = "spring";
  let holiday = null;

  if (month === 11 || month <= 1) base = "winter";
  else if (month >= 2 && month <= 4) base = "spring";
  else if (month >= 5 && month <= 7) base = "summer";
  else base = "fall";

  if (month === 9) holiday = "halloween";
  else if (month === 11 && day <= 25) holiday = "christmas";
  else if (month === 1 && day >= 10 && day <= 14) holiday = "valentines";
  else if (month === 2 && day >= 15 && day <= 19) holiday = "stpatricks";
  else if ((month === 2 && day > 20) || (month === 3 && day < 20)) holiday = "easter";
  else if (month === 6 && day >= 2 && day <= 6) holiday = "july4";
  else if (month === 10 && day >= 10 && day <= 12) holiday = "veterans";
  else if (month === 1) holiday = "blackhistorymonth";

  applyTheme(base, holiday);
}

// 🔥 THIS is the key for all pages
window.addEventListener("load", autoTheme);