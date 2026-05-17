// ========================
// THEMES
// ========================

function setThemeLink(linkEl, href) {
  if (!linkEl) return;

  linkEl.onerror = () => {
    console.warn(`❌ Failed to load theme: ${href}`);
    linkEl.href = "";
  };

  linkEl.href = href;
}

function autoTheme() {

  const now = new Date();

  const month = now.getMonth();
  const day = now.getDate();

  let holiday = null;

  /* VALENTINES */
  if (month === 1 && day >= 10 && day <= 14) {
    holiday = "valentines";
  }

  /* BLACK HISTORY MONTH */
  else if (month === 1) {
    holiday = "blackhistorymonth";
  }

  /* ST PATRICKS */
  else if (month === 2 && day >= 15 && day <= 19) {
    holiday = "stpatricks";
  }

  /* EASTER */
  else if (
    (month === 2 && day > 20) ||
    (month === 3 && day < 20)
  ) {
    holiday = "easter";
  }

  /* MEMORIAL DAY */
  else if (month === 4 && day >= 24) {
    holiday = "memorial";
  }

  /* JULY 4 */
  else if (month === 6 && day >= 2 && day <= 6) {
    holiday = "july4";
  }

  /* HALLOWEEN */
  else if (month === 9) {
    holiday = "halloween";
  }

  /* VETERANS DAY */
  else if (month === 10 && day >= 10 && day <= 12) {
    holiday = "veterans";
  }

  /* THANKSGIVING */
  else if (month === 10 && day >= 20) {
    holiday = "thanksgiving";
  }

  /* CHRISTMAS */
  else if (month === 11 && day <= 25) {
    holiday = "christmas";
  }

  /* LOAD THEME */
  if (holiday) {

    const holidayLink =
      document.getElementById("holidayTheme");

    setThemeLink(
      holidayLink,
      `css/${holiday}_style.css`
    );

    /* HOLIDAY GREETING */
    const greeting =
      document.getElementById("holidayGreeting");

    const greetings = {

      valentines:
        "💘 Happy Valentine's Day!",

      blackhistorymonth:
        "✊ Celebrating Black History Month",

      stpatricks:
        "☘️ Happy St. Patrick's Day!",

      easter:
        "🐣 Happy Easter!",

      memorial:
        "🇺🇸 Honoring Memorial Day",

      july4:
        "🎆 Happy Fourth of July!",

      halloween:
        "🎃 Happy Halloween!",

      veterans:
        "🪖 Honoring Veterans Day",

      thanksgiving:
        "🦃 Happy Thanksgiving!",

      christmas:
        "🎄 Merry Christmas!"
    };

    if (greeting) {
      greeting.textContent =
        greetings[holiday] || "";
    }
  }
}

window.addEventListener("load", autoTheme);