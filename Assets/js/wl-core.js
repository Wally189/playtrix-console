(() => {
  const utf8 = "utf-8";

  const intervals = [];
  const createPausableInterval = (callback, delay) => {
    let intervalId = setInterval(callback, delay);
    intervals.push({ callback, delay, get id() { return intervalId; }, set id(v) { intervalId = v; } });
    return intervalId;
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      intervals.forEach((interval) => clearInterval(interval.id));
    } else {
      intervals.forEach((interval) => {
        interval.callback();
        interval.id = setInterval(interval.callback, interval.delay);
      });
    }
  });

  const year = new Date().getFullYear();
  const yearEls = document.querySelectorAll("#year, [data-year]");
  yearEls.forEach((el) => {
    el.textContent = String(year);
  });

  const shareBtn = document.querySelector("[data-share]");
  if (shareBtn) {
    const hint = document.querySelector("[data-share-hint]");
    shareBtn.addEventListener("click", async () => {
      const url = location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url });
          return;
        } catch (err) {
          // Fall back to clipboard.
        }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(url);
          if (hint) {
            hint.textContent = "Link copied.";
          }
          return;
        } catch (err) {
          // Fall back to showing the URL below.
        }
      }
      if (hint) {
        hint.textContent = url;
      }
    });
  }

  const horaEls = document.querySelectorAll("[data-hora]");
  if (horaEls.length) {
    const firstSaturdayOfMonth = (yearVal, monthVal) => {
      const firstOfMonth = new Date(yearVal, monthVal, 1);
      const offset = (6 - firstOfMonth.getDay() + 7) % 7;
      return new Date(yearVal, monthVal, 1 + offset);
    };

    const getSaturdayRotationLabel = (date) => {
      if (date.getDay() !== 6) {
        return null;
      }
      const yearVal = date.getFullYear();
      const monthVal = date.getMonth();
      const firstSaturday = firstSaturdayOfMonth(yearVal, monthVal);
      const saturdayNumber = Math.floor((date.getDate() - firstSaturday.getDate()) / 7) + 1;
      if (saturdayNumber >= 5) {
        return "Free";
      }
      const anchorSaturday = firstSaturdayOfMonth(2026, 0);
      const dateMidnight = new Date(yearVal, monthVal, date.getDate());
      const weeksSinceAnchor = Math.floor(
        (dateMidnight - anchorSaturday) / (7 * 24 * 60 * 60 * 1000),
      );
      const rotationIndex = ((weeksSinceAnchor % 4) + 4) % 4;
      return ["A", "B", "C", "D"][rotationIndex];
    };

    const toMinutes = (hours, minutes) => hours * 60 + minutes;
    const formatRange = (start, end) => {
      const pad2 = (value) => String(value).padStart(2, "0");
      const startH = Math.floor(start / 60);
      const startM = start % 60;
      const endH = Math.floor(end / 60);
      const endM = end % 60;
      return `${pad2(startH)}:${pad2(startM)}-${pad2(endH)}:${pad2(endM)}`;
    };

    const schedule = [
      { start: toMinutes(5, 45), end: toMinutes(6, 15), label: "Laudes" },
      { start: toMinutes(6, 15), end: toMinutes(7, 15), label: "Prima" },
      { start: toMinutes(7, 15), end: toMinutes(8, 0), label: "Tertia" },
      { start: toMinutes(8, 0), end: toMinutes(10, 0), label: "Labora" },
      { start: toMinutes(10, 0), end: toMinutes(12, 0), label: "Labora" },
      { start: toMinutes(12, 0), end: toMinutes(14, 0), label: "Sexta" },
      { start: toMinutes(14, 0), end: toMinutes(16, 0), label: "Nona" },
      { start: toMinutes(16, 0), end: toMinutes(18, 0), label: "Vesperae" },
      { start: toMinutes(18, 0), end: toMinutes(18, 15), label: "Vesperae" },
      { start: toMinutes(18, 15), end: toMinutes(19, 45), label: "Studium" },
      { start: toMinutes(19, 45), end: toMinutes(21, 30), label: "Requies" },
      { start: toMinutes(21, 30), end: toMinutes(22, 30), label: "Completorium" },
      { start: toMinutes(22, 30), end: toMinutes(24, 0), label: "Silentium" },
      { start: toMinutes(0, 0), end: toMinutes(5, 45), label: "Silentium" },
    ];

    const formatHora = () => {
      const now = new Date();
      const current = toMinutes(now.getHours(), now.getMinutes());
      const entry = schedule.find((item) => current >= item.start && current < item.end);
      if (!entry) {
        return;
      }
      const range = formatRange(entry.start, entry.end);
      const saturdayLabel = getSaturdayRotationLabel(now);
      const label = saturdayLabel ? `${entry.label} - ${saturdayLabel}` : entry.label;
      horaEls.forEach((el) => {
        el.textContent = `${label} ú ${range}`;
      });
    };

    formatHora();
    createPausableInterval(formatHora, 60000);
  }

  const dateEls = document.querySelectorAll("[data-date]");
  if (dateEls.length) {
    const ordinal = (day) => {
      if (day % 100 >= 11 && day % 100 <= 13) {
        return `${day}th`;
      }
      switch (day % 10) {
        case 1:
          return `${day}st`;
        case 2:
          return `${day}nd`;
        case 3:
          return `${day}rd`;
        default:
          return `${day}th`;
      }
    };

    const formatDate = () => {
      const now = new Date();
      const lang = (document.documentElement.lang || "").toLowerCase();
      const path = (location.pathname || "").toLowerCase();
      const isIrish = lang.startsWith("ga") || path.includes("-ga");
      if (isIrish) {
        const gaWeekdays = [
          "Domhnach",
          "Luan",
          "Máirt",
          "Céadaoin",
          "Déardaoin",
          "Aoine",
          "Satharn",
        ];
        const gaMonths = [
          "Eanáir",
          "Feabhra",
          "Márta",
          "Aibreán",
          "Bealtaine",
          "Meitheamh",
          "Iúil",
          "Lúnasa",
          "Meán Fómhair",
          "Deireadh Fómhair",
          "Samhain",
          "Nollaig",
        ];
        const weekday = gaWeekdays[now.getDay()];
        const month = gaMonths[now.getMonth()];
        const day = now.getDate();
        const year = now.getFullYear();
        return `${weekday} ${day} ${month} ${year} AD`;
      }
      const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(now);
      const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(now);
      const day = ordinal(now.getDate());
      const year = now.getFullYear();
      return `${weekday} ${day} ${month} ${year} AD`;
    };

    const updateDate = () => {
      const value = formatDate();
      dateEls.forEach((el) => {
        el.textContent = value;
      });
    };

    updateDate();
    createPausableInterval(updateDate, 60000);
  }
})();