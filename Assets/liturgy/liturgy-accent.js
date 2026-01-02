(() => {
  const fallback = "#2f7d4e";
  const colorMap = {
    green: "#2f7d4e",
    violet: "#6a4b7a",
    purple: "#6a4b7a",
    white: "#c9b37e",
    red: "#a43b3b",
    rose: "#c7788a",
    black: "#3a3a3a",
    gold: "#b38b2d",
  };

  const getLondonDateParts = () => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const map = {};
    parts.forEach((part) => {
      map[part.type] = part.value;
    });
    return { year: map.year, month: map.month, day: map.day };
  };

  const getCalendar = () => {
    const html = document.documentElement;
    const attr = html.getAttribute("data-liturgical-calendar");
    const meta = document.querySelector("meta[name=\"wl-liturgy-calendar\"]");
    const value = attr || (meta ? meta.getAttribute("content") : "");
    return (value && value.trim()) || "general-en";
  };

  const getColourFromResponse = (data) => {
    if (!data || typeof data !== "object") {
      return null;
    }
    if (data.colour || data.color) {
      return (data.colour || data.color).toString().toLowerCase();
    }
    if (Array.isArray(data.celebrations) && data.celebrations.length) {
      const item = data.celebrations[0];
      if (item && (item.colour || item.color)) {
        return (item.colour || item.color).toString().toLowerCase();
      }
    }
    return null;
  };

  const applyAccent = (colour) => {
    const key = colour ? colour.toLowerCase() : "green";
    const hex = colorMap[key] || fallback;
    document.documentElement.style.setProperty("--wl-liturgy-accent", hex);
  };

  let lastKey = null;

  const updateAccent = async () => {
    const { year, month, day } = getLondonDateParts();
    const key = `${year}-${month}-${day}`;
    if (key === lastKey) {
      return;
    }
    lastKey = key;
    try {
      const calendar = getCalendar();
      const url = `https://calapi.inadiutorium.cz/api/v0/en/calendars/${calendar}/${year}/${month}/${day}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        applyAccent("green");
        return;
      }
      const data = await res.json();
      const colour = getColourFromResponse(data);
      applyAccent(colour || "green");
    } catch (err) {
      applyAccent("green");
    }
  };

  updateAccent();
  setInterval(updateAccent, 5 * 60 * 1000);
})();
