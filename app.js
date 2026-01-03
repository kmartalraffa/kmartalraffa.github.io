/* --------------------------------------------------
   GLOBAL STATE
-------------------------------------------------- */

let inventory = [];
let headers = [];
let html5QrCode = null;
let currentGroupRows = [];

/* --------------------------------------------------
   INITIALIZATION
-------------------------------------------------- */

window.onload = function () {
  fetchData();

  // PWA service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((err) => console.error("SW registration failed:", err));
  }

  lucide.createIcons();
};

/* --------------------------------------------------
   CAMERA SYSTEM
-------------------------------------------------- */

function toggleCamera() {
  const container = document.getElementById("reader-container");
  if (!container.classList.contains("hidden")) {
    stopCamera();
  } else {
    startCamera();
  }
}

function startCamera() {
  document.getElementById("reader-container").classList.remove("hidden");
  const btn = document.getElementById("camera-toggle-btn");

  btn.disabled = true;
  btn.classList.add("opacity-50", "scale-95");

  html5QrCode = new Html5Qrcode("reader");

  const config = {
    fps: 30,
    qrbox: { width: 250, height: 120 },
    aspectRatio: 1.0,
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
  };

  html5QrCode
    .start({ facingMode: "environment" }, config, onScanSuccess, () => {})
    .catch(() => stopCamera());
}

function stopCamera() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      html5QrCode = null;
    });
  }

  document.getElementById("reader-container").classList.add("hidden");

  const btn = document.getElementById("camera-toggle-btn");
  btn.disabled = false;
  btn.classList.remove("opacity-50", "scale-95");
}

function onScanSuccess(decodedText) {
  const input = document.getElementById("unified-search-input");
  input.value = decodedText;
  stopCamera();
  handleSearch();

  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

/* --------------------------------------------------
   FETCH GOOGLE SHEET
-------------------------------------------------- */

async function fetchData() {
  const sheetId = document.getElementById("sheet-id").value;
  const gid = document.getElementById("gid-id").value;

  const statusText = document.getElementById("status-text");
  const statusDot = document.getElementById("status-dot");
  const statusPill = document.getElementById("status-pill");

  statusText.innerText = "Syncing…";
  statusDot.className = "w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse";

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(csvUrl);

    if (!response.ok) throw new Error("Sync failed");

    const rawText = await response.text();
    const data = parseCSV(rawText);

    inventory = data;
    headers = Object.keys(data[0]);

    statusText.innerText = `Online • ${inventory.length} Items`;
    statusDot.className = "w-2.5 h-2.5 rounded-full bg-green-500";
    statusPill.classList.add("bg-green-50");

    const now = new Date();
    document.getElementById("last-update-time").innerText =
      now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    document.getElementById("last-update-container").classList.remove("hidden");
  } catch (err) {
    statusText.innerText = "Connection Error";
    statusDot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
  }
}

/* --------------------------------------------------
   SEARCH ENGINE
-------------------------------------------------- */

function handleSearch() {
  const term = document
    .getElementById("unified-search-input")
    .value.trim()
    .toLowerCase();

  const resCon = document.getElementById("result-container");
  const listCon = document.getElementById("list-container");
  const noRes = document.getElementById("no-result");

  resCon.classList.add("hidden");
  listCon.classList.add("hidden");
  noRes.classList.add("hidden");

  if (!term || inventory.length === 0) return;

  let matchedRows = [];

  if (/^\d+$/.test(term)) {
    matchedRows = inventory.filter(
      (row) => String(row["ItemBarCode"] || "").toLowerCase() === term
    );
  } else {
    if (term.length < 3) return;
    const tokens = term.split(/\s+/).filter(Boolean);

    matchedRows = inventory.filter((row) => {
      const name = String(row["ItemName"] || "").toLowerCase();
      return tokens.every((t) => name.includes(t));
    });
  }

  if (matchedRows.length === 0) {
    noRes.classList.remove("hidden");
    return;
  }

  const groups = {};
  matchedRows.forEach((row) => {
    const name = String(row["ItemName"] || "").trim();
    if (!groups[name]) groups[name] = [];
    groups[name].push(row);
  });

  const groupNames = Object.keys(groups);

  if (groupNames.length === 1) {
    const groupRows = completeGroupByName(groupNames[0]);
    currentGroupRows = groupRows;
    renderSingleGroup(groupRows);
  } else {
    renderGroupList(groups);
  }
}

function completeGroupByName(itemName) {
  return inventory.filter(
    (row) => String(row["ItemName"] || "").trim() === itemName
  );
}

/* --------------------------------------------------
   RENDER SINGLE GROUP
-------------------------------------------------- */

function renderSingleGroup(groupRows) {
  const container = document.getElementById("result-container");
  const titleEl = document.getElementById("result-title");
  const subtitleEl = document.getElementById("result-subtitle");
  const detailsEl = document.getElementById("result-details");
  const openPopupBtn = document.getElementById("open-group-popup-btn");

  container.classList.remove("hidden");

  const itemName = groupRows[0]["ItemName"];
  const mainRow =
    groupRows.find((r) => String(r["CF"]) === "1") || groupRows[0];

  const mainStock = Number(mainRow["LiveStock"] || 0);

  titleEl.innerText = itemName;
  subtitleEl.innerText = `${groupRows.length} variants • CF-based stock`;

  detailsEl.innerHTML = `
    <div class="py-4 flex justify-between">
      <span class="text-[10px] font-black text-slate-400 uppercase">Barcode</span>
      <span class="text-xs font-mono">${mainRow["ItemBarCode"]}</span>
    </div>

    <div class="py-4 flex justify-between">
      <span class="text-[10px] font-black text-slate-400 uppercase">Cost</span>
      <span class="text-xl font-black">${mainRow["CostPrice"]}</span>
    </div>

    <div class="py-4 flex justify-between">
      <span class="text-[10px] font-black text-slate-400 uppercase">MRP</span>
      <span class="text-xl font-black">${mainRow["MRP"]}</span>
    </div>

    <div class="py-4 flex justify-between">
      <span class="text-[10px] font-black text-slate-400 uppercase">Main Stock</span>
      <span class="text-base font-bold">${mainStock}</span>
    </div>
  `;

  openPopupBtn.classList.remove("hidden");
  openPopupBtn.onclick = () => openItemModal(groupRows);

  lucide.createIcons();
}

/* --------------------------------------------------
   MULTIPLE MATCH LIST
-------------------------------------------------- */

function renderGroupList(groups) {
  const container = document.getElementById("list-container");
  const listWrap = document.getElementById("match-list");

  container.classList.remove("hidden");
  listWrap.innerHTML = "";

  Object.keys(groups).forEach((name) => {
    const rows = completeGroupByName(name);
    const mainRow =
      rows.find((r) => String(r["CF"]) === "1") || rows[0];

    const div = document.createElement("div");
    div.className =
      "p-5 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer";

    div.innerHTML = `
      <div>
        <p class="font-bold">${name}</p>
        <p class="text-[11px] font-mono text-slate-400">${mainRow["ItemBarCode"]}</p>
      </div>
      <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i>
    `;

    div.onclick = () => {
      currentGroupRows = rows;
      renderSingleGroup(rows);
      container.classList.add("hidden");
    };

    listWrap.appendChild(div);
  });

  lucide.createIcons();
}

/* --------------------------------------------------
   POPUP MODAL
-------------------------------------------------- */

function openItemModal(groupRows) {
  const modal = document.getElementById("item-modal");
  const titleEl = document.getElementById("popup-title");
  const subtitleEl = document.getElementById("popup-subtitle");
  const summaryEl = document.getElementById("popup-summary");
  const rowsEl = document.getElementById("popup-rows");

  const itemName = groupRows[0]["ItemName"];
  const mainRow =
    groupRows.find((r) => String(r["CF"]) === "1") || groupRows[0];
  const mainStock = Number(mainRow["LiveStock"] || 0);

  titleEl.innerText = itemName;
  subtitleEl.innerText = `${groupRows.length} variants • CF-based stock`;

  summaryEl.innerHTML = `
    <div class="rounded-xl bg-slate-50 dark:bg-slate-900 px-3 py-2">
      <div class="text-[10px] uppercase text-slate-400">Main Stock</div>
      <div class="text-sm font-bold">${mainStock}</div>
    </div>

    <div class="rounded-xl bg-slate-50 dark:bg-slate-900 px-3 py-2">
      <div class="text-[10px] uppercase text-slate-400">Cost / MRP</div>
      <div class="text-sm font-bold">${mainRow["CostPrice"]} / ${mainRow["MRP"]}</div>
    </div>

    <div class="rounded-xl bg-slate-50 dark:bg-slate-900 px-3 py-2">
      <div class="text-[10px] uppercase text-slate-400">Group</div>
      <div class="text-[11px] font-semibold">${mainRow["GroupName"] || "—"}</div>
    </div>
  `;

  rowsEl.innerHTML = "";

  groupRows.forEach((row) => {
    const cf = Number(row["CF"] || 0);
    let stock = "-";

    if (cf === 1) stock = mainStock;
    else if (cf > 0) {
      const derived = mainStock / cf;
      stock = derived % 1 === 0 ? derived : derived.toFixed(2);
    }

    const tr = document.createElement("tr");
    tr.className =
      "hover:bg-slate-50 dark:hover:bg-slate-900 transition whitespace-nowrap";

    tr.innerHTML = `
      <td class="px-3 py-2">${cf}</td>
      <td class="px-3 py-2 font-mono text-[11px]">${row["ItemBarCode"]}</td>
      <td class="px-3 py-2 text-right">${row["CostPrice"]}</td>
      <td class="px-3 py-2 text-right">${row["MRP"]}</td>
      <td class="px-3 py-2 text-right font-semibold">${stock}</td>
    `;

    rowsEl.appendChild(tr);
  });

  modal.classList.remove("hidden");
  lucide.createIcons();
}

function closeItemModal() {
  document.getElementById("item-modal").classList.add("hidden");
}

/* --------------------------------------------------
   SHARE POPUP AS IMAGE
-------------------------------------------------- */

document.getElementById("share-btn").onclick = async () => {
  const card = document.getElementById("popup-card-wrapper");
  if (!card) return;

  try {
    const canvas = await html2canvas(card, {
      scale: window.devicePixelRatio > 2 ? 1.5 : 2,
      backgroundColor: null,
    });

    const dataUrl = canvas.toDataURL("image/png");

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], "item-details.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Item Details",
          files: [file],
        });
        return;
      }

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "item-details.png";
      a.click();
    });
  } catch (err) {
    alert("Sharing failed.");
  }
};

/* --------------------------------------------------
   CSV PARSER
-------------------------------------------------- */

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  const head = splitCSVLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = splitCSVLine(line);
    const obj = {};

    head.forEach((h, idx) => {
      obj[h.trim()] = values[idx] ? values[idx].trim() : "";
    });

    data.push(obj);
  }

  return data;
}

function splitCSVLine(line) {
  const parts = [];
  let current = "";
  let insideQuotes = false;

  for (let char of line) {
    if (char === '"') insideQuotes = !insideQuotes;
    else if (char === "," && !insideQuotes) {
      parts.push(current);
      current = "";
    } else current += char;
  }

  parts.push(current);
  return parts;
}

/* --------------------------------------------------
   VOICE SEARCH
-------------------------------------------------- */

let recognition = null;

if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    document.getElementById("unified-search-input").value = text;
    handleSearch();
  };
}

document.getElementById("voice-btn").onclick = () => {
  if (!recognition) {
    alert("Voice search not supported.");
    return;
  }
  recognition.start();
};

/* --------------------------------------------------
   DARK MODE LOGO
-------------------------------------------------- */

const logoImg = document.getElementById("app-logo");
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function setLogo(isDark) {
  logoImg.src = isDark ? "icon-512.png" : "icon-192.jpeg";
}

setLogo(darkQuery.matches);
darkQuery.addEventListener("change", (e) => setLogo(e.matches));
