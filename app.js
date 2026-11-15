"use strict";
const $ = (id) => document.getElementById(id);
const ns = "http://www.w3.org/2000/svg";
const BLACK = "#000000";
const PINK = "#FF0088";
let payload = $("data").value;
let code = null;
let cells = null;
let busy = false;
let cursorX = 0;
let cursorY = 0;
let regions = [];
let selectedRegion = null;

function status(message) {
  $("status").textContent = message;
}
function lock(value) {
  busy = value;
  $("work-state").textContent = value ? "בודק… אפשר להמשיך לנווט" : "מוכן";
  matrix.setAttribute("aria-busy", String(value));
  syncAvailability();
}
function syncAvailability() {
  for (const item of menuItems) {
    const command = item.dataset.command;
    const unavailable = busy || !cells ||
      (command === "Delete" && !selectedRegion) ||
      (/^Digit/.test(command) && !regions[Number(command.slice(-1)) - 1]);
    item.setAttribute("aria-disabled", String(unavailable));
  }
}
function clearRegions() {
  selectedRegion = null;
  regions = [];
  showRegions();
}
function eraseRegion(original, region) {
  const next = Uint8Array.from(original);
  const size = code.modules.size;
  for (let y = region.y; y < region.y + region.h; y++) {
    for (let x = region.x; x < region.x + region.w; x++) {
      next[y * size + x] = 0;
    }
  }
  return next;
}
function element(tag, attrs) {
  const node = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}
function makeSvg(preview = false) {
  const size = code.modules.size;
  const svg = element("svg", {
    xmlns: ns,
    "shape-rendering": "crispEdges",
    viewBox: "-4 -4 " + (size + 8) + " " + (size + 8),
    width: 800,
    height: 800,
    "aria-label": "קוד QR"
  });
  svg.append(element("rect", {
    x: -4, y: -4, width: size + 8, height: size + 8, fill: PINK
  }));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (cells[y * size + x]) {
        svg.append(element("rect", { x, y, width: 1, height: 1, fill: BLACK }));
      }
    }
  }
  if (preview && selectedRegion) {
    const r = selectedRegion;
    svg.append(element("rect", {
      x: r.x - .12, y: r.y - .12, width: r.w + .24, height: r.h + .24,
      fill: "none", stroke: PINK, "stroke-width": .24, "pointer-events": "none"
    }));
    svg.append(element("rect", {
      x: r.x - .27, y: r.y - .27, width: r.w + .54, height: r.h + .54,
      fill: "none", stroke: BLACK, "stroke-width": .16,
      "stroke-dasharray": ".6 .3", "pointer-events": "none"
    }));
  }
  if (preview) {
    svg.append(element("rect", {
      "data-cursor": "inner", x: cursorX - .10, y: cursorY - .10, width: 1.20, height: 1.20,
      fill: "none", stroke: PINK, "stroke-width": .20, "pointer-events": "none"
    }));
    svg.append(element("rect", {
      "data-cursor": "outer", x: cursorX - .22, y: cursorY - .22, width: 1.44, height: 1.44,
      fill: "none", stroke: BLACK, "stroke-width": .12, "pointer-events": "none"
    }));
  }
  return svg;
}
function paint() {
  if (!cells) return;
  $("qr").replaceChildren(makeSvg(true));
  paintCursor();
}
function paintCursor() {
  for (const [name, offset] of [["inner", .10], ["outer", .22]]) {
    const marker = matrix.querySelector?.('[data-cursor="' + name + '"]');
    marker?.setAttribute("x", cursorX - offset);
    marker?.setAttribute("y", cursorY - offset);
  }
  const protectedCell = Boolean(code.modules.reservedBit[cursorY * code.modules.size + cursorX]);
  $("cell-state").textContent = selectedRegion ? "אזור " + (regions.indexOf(selectedRegion) + 1) + " · Del למחיקה · 1–3 להחלפה" : protectedCell ? "מוגנת · עברו עם החצים" : "ניתנת לעריכה · רווח לשינוי";
  matrix.setAttribute("aria-label", "עורך QR, שורה " + (cursorY + 1) + ", עמודה " + (cursorX + 1) + (protectedCell ? ", משבצת מוגנת" : ", משבצת ניתנת לעריכה"));
  $("position").textContent =
    "X: " + String(cursorX + 1).padStart(2, "0") +
    " / Y: " + String(cursorY + 1).padStart(2, "0");
}
function resetCursor() {
  const size = code.modules.size;
  let best = -1;
  let nearest = Infinity;
  for (let i = 0; i < size * size; i++) {
    if (code.modules.reservedBit[i]) continue;
    const x = i % size;
    const y = Math.floor(i / size);
    const distance = Math.abs(x - Math.floor(size / 2)) +
      Math.abs(y - Math.floor(size / 2));
    if (distance < nearest) {
      best = i;
      nearest = distance;
    }
  }
  cursorX = best < 0 ? 0 : best % size;
  cursorY = best < 0 ? 0 : Math.floor(best / size);
}
function rebuild(nextPayload = payload) {
  if (busy) return;
  try {
    const nextCode = QREngine.create(nextPayload, {
      errorCorrectionLevel: "H",
      maskPattern: 0
    });
    code = nextCode;
    payload = nextPayload;
    clearRegions();
    cells = Uint8Array.from(code.modules.data);
    resetCursor();
    paint();
    syncAvailability();
    status("הקוד מוכן. חצים לתנועה, רווח לשינוי, Tab לתפריט.");
    return true;
  } catch (_) {
    status("לא ניתן ליצור קוד מהקישור הזה. נסו קישור קצר יותר.");
    return false;
  }
}
function moveCursor(dx, dy) {
  if (!cells) return;
  const size = code.modules.size;
  cursorX = Math.max(0, Math.min(size - 1, cursorX + dx));
  cursorY = Math.max(0, Math.min(size - 1, cursorY + dy));
  paintCursor();
}
async function verifies() {
  if (!cells) return false;
  const svg = makeSvg(false);
  const size = code.modules.size;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = (size + 8) * 8;
  const context = canvas.getContext("2d");
  if (!context) return false;
  const url = URL.createObjectURL(new Blob(
    [new XMLSerializer().serializeToString(svg)],
    { type: "image/svg+xml" }
  ));
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const decoded = QREngine.decode(pixels.data, pixels.width, pixels.height);
    return decoded?.data === payload;
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function flip(index) {
  if (busy || !cells) return;
  if (code.modules.reservedBit[index]) {
    status("המשבצת הזאת מוגנת. אפשר לעבור למשבצת אחרת.");
    return;
  }
  lock(true);
  status("בודק את השינוי…");
  cells[index] ^= 1;
  try {
    if (await verifies()) {
      clearRegions();
      status("השינוי נשמר. הקוד עדיין קריא.");
    } else {
      cells[index] ^= 1;
      status("השינוי בוטל כדי לשמור על קריאות הקוד.");
    }
  } catch (_) {
    cells[index] ^= 1;
    status("בדיקת הקוד נכשלה. השינוי בוטל.");
  } finally {
    paint();
    lock(false);
  }
}
function toggleCursor() {
  if (!cells || busy) return;
  flip(cursorY * code.modules.size + cursorX);
}
function showRegions() {
  const erase = $("erase");
  erase.setAttribute("aria-disabled", String(busy || !selectedRegion));
  // Keep the current menu location, even when its action becomes unavailable.
  Array.from($("regionResults").children).forEach((slot, index) => {
    const region = regions[index];
    const selected = Boolean(region && region === selectedRegion);
    const choice = slot.firstElementChild;
    choice.textContent = (index + 1) + " · " +
      (region ? region.w + "×" + region.h : "—");
    choice.setAttribute("aria-current", String(selected));
    choice.setAttribute("aria-disabled", String(busy || !region));
  });
}
function chooseRegion(index) {
  if (busy) return;
  if (!regions[index]) {
    status("אין אזור במספר הזה. לחצו F לחיפוש.");
    return;
  }
  selectedRegion = regions[index];
  showRegions();
  paint();
  status("אזור " + (index + 1) + " נבחר. 1–3 להחלפה, Del למחיקה.");
  focusControl(matrix);
}
function searchInWorker() {
  return new Promise((resolve, reject) => {
    let worker;
    let timer;
    const finish = (error, result) => {
      clearTimeout(timer);
      worker?.terminate();
      error ? reject(error) : resolve(result);
    };
    try {
      worker = new Worker("search-worker.js");
      timer = setTimeout(() => finish(new Error("Search timeout")), 60000);
      worker.onerror = () => finish(new Error("Search worker failed"));
      worker.onmessage = ({ data }) => {
        if (data.progress !== undefined) {
          status("בודק אזורים… " + data.progress + " בדיקות. אפשר לנווט בזמן ההמתנה.");
        } else if (data.error) finish(new Error(data.error));
        else finish(null, data.result);
      };
      worker.postMessage({
        size: code.modules.size,
        reserved: code.modules.reservedBit,
        dark: cells,
        payload
      });
    } catch (error) { finish(error); }
  });
}
async function findRegions() {
  if (!cells || busy) return;
  lock(true);
  status("מחפש שטחים גדולים שאפשר למחוק… אפשר להמשיך לנווט.");
  try {
    const result = await searchInWorker();
    regions = result.regions;
    selectedRegion = null;
    showRegions();
    status(regions.length
      ? "נמצאו " + regions.length + " אזורים. 1–3 לתצוגה ובחירה, Del למחיקה."
      : "לא נמצאו אזורים גדולים שאפשר למחוק בבטחה. אפשר לערוך משבצות.");
  } catch (_) {
    status("החיפוש נכשל. הקוד והבחירה נשמרו; לחצו F לניסיון נוסף.");
  } finally {
    lock(false);
    paint();
  }
}
async function deleteRegion() {
  if (busy || !cells || !selectedRegion) return;
  lock(true);
  const original = Uint8Array.from(cells);
  const chosen = selectedRegion;
  try {
    cells = eraseRegion(original, chosen);
    if (await verifies()) {
      clearRegions();
      status("האזור נמחק. הקוד עדיין קריא.");
    } else {
      cells = original;
      status("המחיקה בוטלה כדי לשמור על קריאות הקוד. הבחירה נשמרה.");
    }
  } catch (_) {
    cells = original;
    status("המחיקה נכשלה. הקוד הוחזר למצבו הקודם.");
  } finally {
    paint();
    lock(false);
  }
}
async function download(ext) {
  if (busy || !cells) return;
  lock(true);
  try {
    let blob = new Blob(
      [new XMLSerializer().serializeToString(makeSvg(false))],
      { type: "image/svg+xml" }
    );
    if (ext === "png") {
      const imageUrl = URL.createObjectURL(blob);
      const image = new Image();
      try {
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = imageUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 800;
        const context = canvas.getContext("2d");
        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0, 800, 800);
        blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("PNG unavailable");
      } finally {
        URL.revokeObjectURL(imageUrl);
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "qart." + ext;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status("הקובץ נשמר בפורמט " + ext.toUpperCase());
  } catch (_) {
    status("לא ניתן לשמור את הקובץ.");
  } finally {
    lock(false);
  }
}
const input = $("data");
const matrix = $("qr");
const menu = $("commands");
const menuItems = Array.from(document.querySelectorAll("#commands button[data-command]"));
function focusControl(control) {
  control.focus({ preventScroll: true });
  const context = control === matrix ? control.closest(".matrix") : control;
  const rect = context.getBoundingClientRect();
  if (rect.top < 12 || rect.bottom > window.innerHeight - 12) {
    context.scrollIntoView({ block: rect.height < window.innerHeight - 24 ? "nearest" : "start" });
  }
}
menu.addEventListener("focusin", (event) => {
  if (!menuItems.includes(event.target)) return;
  for (const item of menuItems) item.tabIndex = item === event.target ? 0 : -1;
});
menu.addEventListener("focusout", (event) => {
  if (menuItems.includes(event.relatedTarget)) return;
  // Preserve the last focused command for the next visit.
});
function moveMenu(item, dx, dy) {
  const rows = [];
  for (const candidate of menuItems) {
    // Disabled commands remain discoverable with an explanation.
    if (candidate.classList.contains("region-choice")) {
      const regionRow = rows.find((row) => row[0].classList.contains("region-choice"));
      if (regionRow) {
        regionRow.push(candidate);
        continue;
      }
    }
    rows.push([candidate]);
  }
  const rowIndex = rows.findIndex((row) => row.includes(item));
  if (rowIndex === -1) {
    focusControl(menuItems[0]);
    return;
  }
  const row = rows[(rowIndex + dy + rows.length) % rows.length];
  const column = dy
    ? Math.max(0, row.findIndex((candidate) => candidate.getAttribute("aria-current") === "true"))
    : (row.indexOf(item) - dx + row.length) % row.length;
  focusControl(row[column]);
}
function shortcut(event) {
  return /^[1-3]$/.test(event.key) ? "Digit" + event.key : event.code;
}
function runCommand(code) {
  if (busy) return;
  if (Object.hasOwn(commands, code)) commands[code]();
}
const directions = {
  ArrowUp: [0, -1], ArrowDown: [0, 1],
  ArrowLeft: [-1, 0], ArrowRight: [1, 0]
};
const commands = {
  Space: toggleCursor,
  KeyF: findRegions,
  Digit1: () => chooseRegion(0),
  Digit2: () => chooseRegion(1),
  Digit3: () => chooseRegion(2),
  Delete: () => selectedRegion ? deleteRegion() : status("בחרו אזור עם 1–3 לפני המחיקה."),
  KeyR: () => rebuild(),
  KeyP: () => download("png"),
  KeyS: () => download("svg")
};
$("prompt").addEventListener("submit", (event) => {
  event.preventDefault();
  if (busy) { status("הפעולה עדיין מתבצעת. הקישור שהקלדתם נשמר בשדה."); return; }
  const value = input.value.trim();
  if (!value) {
    status("הדביקו קישור או הקלידו טקסט ליצירת קוד.");
    return;
  }
  if (rebuild(value)) {
    input.value = value;
    focusControl(matrix);
  }
});
input.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== "Escape" || event.isComposing) return;
  event.preventDefault();
  input.value = payload;
  focusControl(matrix);
});
matrix.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
  if (event.key === "Escape") {
    event.preventDefault();
    focusControl(input);
    input.select();
  } else if (event.code === "KeyM") {
    event.preventDefault();
    focusControl(menuItems[0]);
  } else if (Object.hasOwn(directions, event.key)) {
    event.preventDefault();
    moveCursor(...directions[event.key]);
  } else if (Object.hasOwn(commands, shortcut(event))) {
    event.preventDefault();
    if (!event.repeat) runCommand(shortcut(event));
  }
});
for (const item of menuItems) {
  item.addEventListener("click", () => {
    if (busy) return;
    runCommand(item.dataset.command);
  });
}
menu.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
  const index = menuItems.indexOf(event.target);
  if (index < 0) return;
  if (event.key === "Escape" || event.code === "KeyM") {
    event.preventDefault();
    focusControl(matrix);
  } else if (Object.hasOwn(directions, event.key)) {
    event.preventDefault();
    const [dx, dy] = directions[event.key];
    moveMenu(event.target, dx, dy);
  } else if (Object.hasOwn(commands, shortcut(event)) && event.code !== "Space") {
    event.preventDefault();
    if (!event.repeat) runCommand(shortcut(event));
  } else if (event.repeat && (event.key === "Enter" || event.code === "Space")) {
    event.preventDefault();
  }
});
document.addEventListener("paste", (event) => {
  if (event.target === input || !document.querySelector("main").contains(event.target)) return;
  const value = event.clipboardData?.getData("text/plain");
  if (!value) return;
  event.preventDefault();
  input.value = value.trim();
  focusControl(input);
});
for (const button of document.querySelectorAll("[data-move]")) {
  button.addEventListener("click", () => {
    focusControl(matrix);
    if (button.dataset.move === "toggle") toggleCursor();
    else moveCursor(...directions[button.dataset.move]);
  });
}
rebuild();
status("מוכן להדבקה");
input.select();
