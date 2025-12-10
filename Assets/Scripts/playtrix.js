/* ==========================================================
   PLAYTRIX OS · CORE SCRIPT (v2.0)
   Password gate · Console cards · Tools deck
   - Lock screen
   - Draggable console cards + link drop
   - Draggable tool rows + pills
   - Add / delete tools
   ========================================================== */

/* ----------------------------------------------------------
   CONFIG
---------------------------------------------------------- */

const PLAYTRIX_ACCESS_CODE = "Carol189"; // change if you like

/* Utility: stable key from a heading or label */
function playtrixSlug(text, fallback) {
  if (!text) return fallback;
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[\/\s]+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-");
  return slug || fallback;
}

/* ==========================================================
   1. PASSWORD LOCK (index overlay)
========================================================== */

function initPlaytrixLock() {
  const lockOverlay = document.getElementById("pt-lock");
  const form        = document.getElementById("pt-lock-form");
  const pass        = document.getElementById("pt-pass");
  const error       = document.getElementById("pt-lock-error");

  if (!lockOverlay || !form || !pass) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const entered = pass.value.trim();

    if (!entered) {
      if (error) error.textContent = "Please enter your access code.";
      shake(lockOverlay);
      return;
    }

    if (entered.toLowerCase() === PLAYTRIX_ACCESS_CODE.toLowerCase()) {
      if (error) error.textContent = "";
      lockOverlay.classList.add("pt-lock-open");
      document.dispatchEvent(new Event("playtrix-unlocked"));
      setTimeout(() => lockOverlay.remove(), 280);
    } else {
      if (error) error.textContent = "Incorrect code. Please try again.";
      pass.value = "";
      pass.focus();
      shake(lockOverlay);
    }
  });

  function shake(el) {
    el.classList.remove("pt-lock-shake");
    void el.offsetWidth; // reflow
    el.classList.add("pt-lock-shake");
  }
}

/* ==========================================================
   2. PLAYTRIX CONSOLE (main grid)
   - drag cards to reorder
   - drop URLs on a card to store link
   - click button to open / set link
========================================================== */

function initPlaytrixConsole() {
  const grid = document.getElementById("pt-card-grid");
  if (!grid) return;

  let draggedCard = null;

  // restore order
  const savedOrderRaw = localStorage.getItem("playtrixCardOrder");
  if (savedOrderRaw) {
    try {
      const savedOrder = JSON.parse(savedOrderRaw);
      const cards = Array.from(grid.querySelectorAll(".pt-card"));
      savedOrder.forEach((key) => {
        const card = cards.find((c) => c.dataset.storageKey === key);
        if (card) grid.appendChild(card);
      });
    } catch {
      // ignore parse errors
    }
  }

  const cards = Array.from(grid.querySelectorAll(".pt-card"));

  cards.forEach((card) => {
    const storageKey = card.dataset.storageKey;
    const button     = card.querySelector(".pt-card-open");

    // ensure draggable
    card.setAttribute("draggable", "true");

    // restore link
    if (storageKey) {
      const stored = localStorage.getItem("playtrixLink_" + storageKey);
      if (stored) {
        card.dataset.link = stored;
        card.classList.add("pt-card-linked");
        if (button) button.textContent = "Open link";
      }
    }

    card.addEventListener("dragstart", (e) => {
      draggedCard = card;
      card.classList.add("pt-card-dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/playtrix-card", storageKey || "");
      }
    });

    card.addEventListener("dragend", () => {
      if (draggedCard === card) {
        card.classList.remove("pt-card-dragging");
        draggedCard = null;
        saveCardOrder();
      }
    });

    // external link drop onto card
    card.addEventListener("dragover", (e) => {
      const dt = e.dataTransfer;
      if (!dt) return;
      if (Array.from(dt.types).includes("text/playtrix-card")) return;
      e.preventDefault();
      card.classList.add("pt-card-drop-target");
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("pt-card-drop-target");
    });

    card.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      if (!dt) return;
      if (Array.from(dt.types).includes("text/playtrix-card")) return;

      e.preventDefault();
      card.classList.remove("pt-card-drop-target");

      let uri = dt.getData("text/uri-list") || dt.getData("text/plain");
      if (!uri) {
        alert("I can only store links dragged from your browser / web pages right now.");
        return;
      }

      const clean = uri.trim();
      if (!clean || !storageKey) return;

      localStorage.setItem("playtrixLink_" + storageKey, clean);
      card.dataset.link = clean;
      card.classList.add("pt-card-linked");
      if (button) button.textContent = "Open link";
    });

    // button click: open or set link manually
    if (button) {
      button.addEventListener("click", () => {
        const existing = card.dataset.link;
        if (existing) {
          window.open(existing, "_blank", "noopener");
          return;
        }

        if (!storageKey) return;
        const pasted = prompt(
          "No link saved yet.\n\nPaste a link for this card (for example from OneDrive 'Copy link' or your browser address bar):"
        );
        if (!pasted) return;

        const clean = pasted.trim();
        if (!clean) return;

        localStorage.setItem("playtrixLink_" + storageKey, clean);
        card.dataset.link = clean;
        card.classList.add("pt-card-linked");
        button.textContent = "Open link";
      });
    }
  });

  grid.addEventListener("dragover", (e) => {
    if (!draggedCard) return;
    e.preventDefault();
    const after = getDragAfterElement(grid, e.clientY);
    if (after == null) {
      grid.appendChild(draggedCard);
    } else {
      grid.insertBefore(draggedCard, after);
    }
  });

  grid.addEventListener("drop", (e) => {
    if (!draggedCard) return;
    e.preventDefault();
  });

  function getDragAfterElement(container, y) {
    const elements = [
      ...container.querySelectorAll(".pt-card:not(.pt-card-dragging)")
    ];

    return elements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }

  function saveCardOrder() {
    const order = [...grid.children].map((c) => c.dataset.storageKey || "");
    localStorage.setItem("playtrixCardOrder", JSON.stringify(order));
  }
}

/* ==========================================================
   3. TOOLS · PILLS
   - drag pills left/right within row
   - drop URLs onto pill
   - click pill to open / set link
   - + Add tool (name + optional link)
   - right-click to delete tool
========================================================== */

function initPlaytrixTools() {
  const rows = document.querySelectorAll(".pt-tools-chips");
  if (!rows.length) return;

  rows.forEach((row, index) => {
    const section = row.closest(".pt-tools-row");
    const headingText = section?.querySelector("h2")?.textContent || "";
    const rowKey =
      section?.dataset.toolsSection ||
      playtrixSlug(headingText, "row" + index);

    if (section && !section.dataset.toolsSection) {
      section.dataset.toolsSection = rowKey;
    }

    const extrasStorageKey = "playtrixToolsExtras_" + rowKey;
    const orderStorageKey  = "playtrixToolsOrder_" + rowKey;

    let extrasMeta = [];
    try {
      const rawExtras = localStorage.getItem(extrasStorageKey);
      if (rawExtras) extrasMeta = JSON.parse(rawExtras) || [];
    } catch {
      extrasMeta = [];
    }

    const chipsContainer = row;

    // rebuild extra pills from meta (user-added tools)
    extrasMeta.forEach((meta) => {
      if (!meta || !meta.key || !meta.label) return;
      if (row.querySelector(`[data-tool-key="${meta.key}"]`)) return; // skip if already there
      const pill = document.createElement("button");
      pill.className = "pt-tool-pill";
      pill.dataset.toolKey = meta.key;
      pill.textContent = meta.label;
      chipsContainer.appendChild(pill);
    });

    // restore pill order
    const savedRaw = localStorage.getItem(orderStorageKey);
    if (savedRaw) {
      try {
        const saved = JSON.parse(savedRaw);
        if (Array.isArray(saved) && saved.length) {
          const pillsNow = Array.from(row.querySelectorAll(".pt-tool-pill"));
          saved.forEach((key) => {
            const pill = pillsNow.find((p) => p.dataset.toolKey === key);
            if (pill) row.appendChild(pill);
          });
        }
      } catch {
        // ignore
      }
    }

    let draggedPill = null;

    function saveExtrasMeta() {
      localStorage.setItem(extrasStorageKey, JSON.stringify(extrasMeta));
    }

    function saveRowOrder() {
      const order = [...row.children]
        .filter((el) => el.classList.contains("pt-tool-pill"))
        .map((el) => el.dataset.toolKey || "");
      localStorage.setItem(orderStorageKey, JSON.stringify(order));
    }

    function setupPill(pill) {
      const key = pill.dataset.toolKey;

      pill.setAttribute("draggable", "true");

      // restore link
      if (key) {
        const stored = localStorage.getItem("playtrixTool_" + key);
        if (stored) {
          pill.dataset.link = stored;
          pill.classList.add("pt-tool-linked");
        }
      }

      // drag within row
      pill.addEventListener("dragstart", (e) => {
        draggedPill = pill;
        pill.classList.add("pt-tool-pill-dragging");
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/playtrix-tool", key || "");
        }
      });

      pill.addEventListener("dragend", () => {
        if (draggedPill === pill) {
          pill.classList.remove("pt-tool-pill-dragging");
          draggedPill = null;
          saveRowOrder();
        }
      });

      // external link drop onto pill
      pill.addEventListener("dragover", (e) => {
        const dt = e.dataTransfer;
        if (!dt) return;
        if (Array.from(dt.types).includes("text/playtrix-tool")) return;
        e.preventDefault();
        pill.classList.add("pt-tool-pill-drop-target");
      });

      pill.addEventListener("dragleave", () => {
        pill.classList.remove("pt-tool-pill-drop-target");
      });

      pill.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        if (!dt) return;
        if (Array.from(dt.types).includes("text/playtrix-tool")) return;

        e.preventDefault();
        pill.classList.remove("pt-tool-pill-drop-target");

        let uri = dt.getData("text/uri-list") || dt.getData("text/plain");
        if (!uri) {
          alert("I can only store links dragged from web pages / web apps here.");
          return;
        }

        const clean = uri.trim();
        if (!clean || !key) return;

        localStorage.setItem("playtrixTool_" + key, clean);
        pill.dataset.link = clean;
        pill.classList.add("pt-tool-linked");
      });

      // click: open or set link (never touch label)
      pill.addEventListener("click", () => {
        const existing = pill.dataset.link;
        if (existing) {
          window.open(existing, "_blank", "noopener");
          return;
        }

        if (!key) return;
        const pasted = prompt(
          "No link saved yet for this tool.\n\nPaste a link (for example the web version of this app):"
        );
        if (!pasted) return;

        const clean = pasted.trim();
        if (!clean) return;

        localStorage.setItem("playtrixTool_" + key, clean);
        pill.dataset.link = clean;
        pill.classList.add("pt-tool-linked");
      });

      // right-click: delete tool
      pill.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (!confirm(`Delete "${pill.textContent}"?`)) return;

        const key = pill.dataset.toolKey;

        if (key) {
          localStorage.removeItem("playtrixTool_" + key);
        }

        extrasMeta = extrasMeta.filter((meta) => meta.key !== key);
        saveExtrasMeta();

        pill.remove();
        saveRowOrder();
      });
    }

    // wire existing pills
    Array.from(row.querySelectorAll(".pt-tool-pill")).forEach((pill) =>
      setupPill(pill)
    );

    // row-level dragover for pills
    row.addEventListener("dragover", (e) => {
      if (!draggedPill) return;
      e.preventDefault();
      const after = getAfterPill(row, e.clientX);
      if (after == null) {
        row.appendChild(draggedPill);
      } else {
        row.insertBefore(draggedPill, after);
      }
    });

    row.addEventListener("drop", (e) => {
      if (!draggedPill) return;
      e.preventDefault();
    });

    function getAfterPill(container, x) {
      const others = [
        ...container.querySelectorAll(".pt-tool-pill:not(.pt-tool-pill-dragging)")
      ];

      return others.reduce(
        (closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = x - box.left - box.width / 2;
          if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
          }
          return closest;
        },
        { offset: Number.NEGATIVE_INFINITY, element: null }
      ).element;
    }

    // ADD TOOL BUTTON in row header
    if (section) {
      const header = section.querySelector(".pt-tools-row-header");
      if (header && !header.querySelector(".pt-tools-add")) {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "pt-tools-add";
        addBtn.textContent = "+ Add tool";
        header.appendChild(addBtn);

        addBtn.addEventListener("click", () => {
          const label = prompt(
            "Tool name (e.g. 'Guardian', 'Irish Times', 'YouTube Music'):"
          );
          if (!label) return;

          const link = prompt(
            "Optional: paste a link for this tool now.\n\nYou can leave this blank and drag a link onto the button later."
          );

          const key = rowKey + "-" + Date.now();
          const pill = document.createElement("button");
          pill.className = "pt-tool-pill";
          pill.dataset.toolKey = key;
          pill.textContent = label.trim();
          chipsContainer.appendChild(pill);

          extrasMeta.push({ key, label: label.trim() });
          saveExtrasMeta();

          if (link && link.trim()) {
            const clean = link.trim();
            pill.dataset.link = clean;
            pill.classList.add("pt-tool-linked");
            localStorage.setItem("playtrixTool_" + key, clean);
          }

          setupPill(pill);
          saveRowOrder();
        });
      }
    }
  });
}

/* ==========================================================
   4. TOOLS · ROW DRAGGING
   - drag whole categories up/down
========================================================== */

function initPlaytrixToolSections() {
  const main = document.querySelector(".pt-tools-main");
  if (!main) return;

  let sections = Array.from(main.querySelectorAll(".pt-tools-row"));
  if (!sections.length) return;

  const sectionOrderKey = "playtrixToolsSectionOrder";

  // restore order
  const savedRaw = localStorage.getItem(sectionOrderKey);
  if (savedRaw) {
    try {
      const saved = JSON.parse(savedRaw);
      if (Array.isArray(saved) && saved.length) {
        saved.forEach((key) => {
          const section = sections.find((s) => {
            const headingText = s.querySelector("h2")?.textContent || "";
            const currentKey =
              s.dataset.toolsSection || playtrixSlug(headingText, "");
            if (!s.dataset.toolsSection) {
              s.dataset.toolsSection = currentKey;
            }
            return currentKey === key;
          });
          if (section) main.appendChild(section);
        });
        sections = Array.from(main.querySelectorAll(".pt-tools-row"));
      }
    } catch {
      // ignore
    }
  }

  let draggedSection = null;

  sections.forEach((section, index) => {
    const headingText = section.querySelector("h2")?.textContent || "";
    const key =
      section.dataset.toolsSection ||
      playtrixSlug(headingText, "section" + index);
    section.dataset.toolsSection = key;

    const header = section.querySelector(".pt-tools-row-header");
    if (!header) return;

    header.setAttribute("draggable", "true");

    header.addEventListener("dragstart", (e) => {
      draggedSection = section;
      section.classList.add("pt-tools-row-dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/playtrix-section", key);
      }
    });

    header.addEventListener("dragend", () => {
      if (draggedSection === section) {
        section.classList.remove("pt-tools-row-dragging");
        draggedSection = null;
        saveSectionOrder();
      }
    });
  });

  main.addEventListener("dragover", (e) => {
    const dt = e.dataTransfer;
    if (!draggedSection || !dt) return;
    if (!Array.from(dt.types).includes("text/playtrix-section")) return;

    e.preventDefault();
    const after = getAfterSection(main, e.clientY);
    if (after == null) {
      main.appendChild(draggedSection);
    } else {
      main.insertBefore(draggedSection, after);
    }
  });

  main.addEventListener("drop", (e) => {
    if (!draggedSection) return;
    e.preventDefault();
  });

  function getAfterSection(container, y) {
    const others = [
      ...container.querySelectorAll(".pt-tools-row:not(.pt-tools-row-dragging)")
    ];

    return others.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }

  function saveSectionOrder() {
    const order = [...main.querySelectorAll(".pt-tools-row")].map(
      (s) => s.dataset.toolsSection || ""
    );
    localStorage.setItem(sectionOrderKey, JSON.stringify(order));
  }
}

/* ==========================================================
   5. BOOTSTRAP
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initPlaytrixLock();
  initPlaytrixConsole();
  initPlaytrixTools();
  initPlaytrixToolSections();
  initPlaytrixClock();   // <-- ADD THIS
});


/* ==========================================================
   PLAYTRIX · LIVE CLOCK
========================================================== */

function initPlaytrixClock() {
  const timeEl = document.getElementById("pt-clock-time");
  const dateEl = document.getElementById("pt-clock-date");
  if (!timeEl || !dateEl) return;

  function updateClock() {
    const now = new Date();

    // time
    const hours   = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    timeEl.textContent = `${hours}:${minutes}`;

    // date
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    };
    dateEl.textContent = now.toLocaleDateString("en-GB", options);
  }

  updateClock();
  setInterval(updateClock, 1000);
}


function initPlaytrixClock() {
  const timeEl = document.getElementById("pt-clock-time");
  const dateEl = document.getElementById("pt-clock-date");
  if (!timeEl || !dateEl) return;

  function updateClock() {
    const now = new Date();
    const hours   = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    timeEl.textContent = `${hours}:${minutes}`;

    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    };
    dateEl.textContent = now.toLocaleDateString("en-GB", options);
  }

  updateClock();
  setInterval(updateClock, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  initPlaytrixLock();
  initPlaytrixConsole();
  initPlaytrixTools();
  initPlaytrixToolSections();
  initPlaytrixClock();   // ← this line is what makes it run on every page
});

