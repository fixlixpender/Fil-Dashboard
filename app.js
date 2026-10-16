const LS_KEY = "projectDashboard.v1";

const $ = (s) => document.querySelector(s);

const projectForm = $("#projectForm");
const projectInput = $("#projectInput");
const projectList = $("#projectList");
const projectCount = $("#projectCount");

const activeProjectName = $("#activeProjectName");
const todoStats = $("#todoStats");
const todoProgress = $("#todoProgress");
const todoForm = $("#todoForm");
const todoInput = $("#todoInput");
const todoDueInput = $("#todoDueInput");
const todoAddBtn = $("#todoAddBtn");
const todoList = $("#todoList");
const clearDoneBtn = $("#clearDoneBtn");
const dateFilterBar = $("#dateFilterBar");
const dateFilterLabel = $("#dateFilterLabel");
const clearDateFilter = $("#clearDateFilter");

const timerDisplay = $("#timerDisplay");
const timerProgress = $("#timerProgress");
const timerState = $("#timerState");
const inH = $("#inH"), inM = $("#inM"), inS = $("#inS");
const setBtn = $("#setBtn");
const startPauseBtn = $("#startPauseBtn");
const resetBtn = $("#resetBtn");

let state = load() || {
  projects: [],
  activeProjectId: null,
  theme: "ocean",
  darkMode: false,
  timerSeconds: 1500,
};

if (typeof state.darkMode !== "boolean") state.darkMode = state.theme === "midnight";

if (!state.projects) state.projects = [];

// --- persistence ---
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

// --- helpers ---
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const activeProject = () => state.projects.find(p => p.id === state.activeProjectId) || null;
const esc = (s) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// date helpers (local, YYYY-MM-DD)
const pad2 = (n) => String(n).padStart(2, "0");
const toISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const isoToDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtShort = (iso) => {
  if (!iso) return "";
  try {
    return isoToDate(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch { return iso; }
};
function normalizeTodos() {
  for (const p of state.projects) {
    if (!Array.isArray(p.todos)) p.todos = [];
    for (const t of p.todos) {
      if (typeof t.due !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t.due)) t.due = null;
    }
  }
}
normalizeTodos();

// --- themes + dark mode ---
function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  document.documentElement.classList.toggle("dark", !!state.darkMode);
  document.querySelectorAll("[data-set-theme]").forEach(b =>
    b.classList.toggle("active", b.dataset.setTheme === state.theme));
  const t = $("#darkToggle");
  if (t) {
    t.textContent = state.darkMode ? "☀️ Light" : "🌙 Dark";
    t.setAttribute("aria-pressed", String(!!state.darkMode));
  }
}
document.querySelectorAll("[data-set-theme]").forEach(b =>
  b.addEventListener("click", () => { state.theme = b.dataset.setTheme; save(); applyTheme(); }));
$("#darkToggle")?.addEventListener("click", () => {
  state.darkMode = !state.darkMode;
  save(); applyTheme();
});

// --- projects ---
projectForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = projectInput.value.trim();
  if (!name) return;
  const p = { id: uid(), name, createdAt: Date.now(), todos: [] };
  state.projects.unshift(p);
  state.activeProjectId = p.id;
  projectInput.value = "";
  save(); render();
});

function renderProjects() {
  projectCount.textContent = state.projects.length;
  if (!state.projects.length) {
    projectList.innerHTML = `<div class="empty">No projects yet.<br/>Create your first folder above.</div>`;
    return;
  }
  projectList.innerHTML = state.projects.map(p => {
    const open = p.todos.filter(t => !t.done).length;
    return `
      <button class="project-item ${p.id === state.activeProjectId ? "active" : ""}" data-id="${p.id}">
        <span class="folder">📁</span>
        <span class="name">${esc(p.name)}</span>
        <span class="count">${open} open</span>
        <span class="icon-btn" data-del="${p.id}" title="Delete project">✕</span>
      </button>`;
  }).join("");
}

projectList.addEventListener("click", (e) => {
  const del = e.target.closest("[data-del]");
  if (del) {
    e.stopPropagation();
    const id = del.getAttribute("data-del");
    if (!confirm("Delete this project and its todos?")) return;
    state.projects = state.projects.filter(p => p.id !== id);
    if (state.activeProjectId === id) state.activeProjectId = state.projects[0]?.id || null;
    save(); render();
    return;
  }
  const item = e.target.closest(".project-item");
  if (item) {
    state.activeProjectId = item.dataset.id;
    save(); render();
  }
});

// --- todos + date filter ---
let filterDateISO = null; // YYYY-MM-DD or null = show all

todoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const p = activeProject();
  if (!p) return;
  const text = todoInput.value.trim();
  if (!text) return;
  const due = (todoDueInput?.value || "").trim() || filterDateISO || null;
  p.todos.unshift({ id: uid(), text, done: false, createdAt: Date.now(), due });
  todoInput.value = "";
  // keep due input in sync with active filter for fast entry
  if (todoDueInput) todoDueInput.value = filterDateISO || todoDueInput.value;
  save(); render();
});

todoList.addEventListener("click", (e) => {
  const p = activeProject();
  if (!p) return;
  const li = e.target.closest("li[data-tid]");
  if (!li) return;
  const tid = li.dataset.tid;
  if (e.target.matches('input[type="checkbox"]')) {
    const t = p.todos.find(t => t.id === tid);
    if (t) { t.done = e.target.checked; save(); render(); }
  }
  if (e.target.closest("[data-tdel]")) {
    p.todos = p.todos.filter(t => t.id !== tid);
    save(); render();
  }
});

todoList.addEventListener("change", (e) => {
  const p = activeProject();
  if (!p) return;
  const inp = e.target.closest("[data-due-edit]");
  if (!inp) return;
  const li = inp.closest("li[data-tid]");
  const t = p.todos.find(t => t.id === li?.dataset.tid);
  if (!t) return;
  t.due = inp.value || null;
  save(); render();
});

clearDateFilter?.addEventListener("click", () => {
  filterDateISO = null;
  if (todoDueInput) todoDueInput.value = "";
  renderTodos();
  renderCalendar();
});

clearDoneBtn.addEventListener("click", () => {
  const p = activeProject();
  if (!p) return;
  p.todos = p.todos.filter(t => !t.done);
  save(); render();
});

function renderTodos() {
  const p = activeProject();
  const hasProject = !!p;
  todoInput.disabled = !hasProject;
  todoAddBtn.disabled = !hasProject;
  if (todoDueInput) todoDueInput.disabled = !hasProject;

  if (!p) {
    activeProjectName.textContent = "No project";
    todoStats.textContent = "Create a project to get started.";
    todoProgress.style.width = "0%";
    todoList.innerHTML = `<div class="empty">Your tasks will appear here.</div>`;
    dateFilterBar?.classList.add("hidden");
    return;
  }
  activeProjectName.textContent = "📁 " + p.name;
  const total = p.todos.length;
  const done = p.todos.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  todoProgress.style.width = pct + "%";

  const todayISO = toISODate(new Date());
  const list = filterDateISO ? p.todos.filter(t => t.due === filterDateISO) : p.todos;

  if (dateFilterBar) {
    const show = !!filterDateISO;
    dateFilterBar.classList.toggle("hidden", !show);
    if (show) {
      const n = list.length;
      const open = list.filter(t => !t.done).length;
      dateFilterLabel.textContent = `${fmtShort(filterDateISO)} • ${open} open / ${n} total`;
    }
  }

  if (!total) {
    todoStats.textContent = "No tasks yet — add one above.";
    todoList.innerHTML = `<div class="empty">No tasks yet.</div>`;
    return;
  }
  if (filterDateISO) {
    const open = list.filter(t => !t.done).length;
    todoStats.textContent = `${open} open • ${list.length - open} done for ${fmtShort(filterDateISO)} • ${pct}% total complete`;
  } else {
    todoStats.textContent = `${total - done} open • ${done} done • ${pct}% complete`;
  }

  if (!list.length) {
    todoList.innerHTML = `<div class="empty">No tasks due ${esc(fmtShort(filterDateISO))}.<br/>Add one above — it will default to this date.</div>`;
    return;
  }
  todoList.innerHTML = list.map(t => {
    const overdue = t.due && !t.done && t.due < todayISO;
    const dueChip = t.due
      ? `<span class="due has-date${overdue ? " overdue" : ""}" title="Due ${t.due}">📅 ${esc(fmtShort(t.due))}</span>`
      : `<span class="due" title="No due date">No date</span>`;
    return `
    <li data-tid="${t.id}" class="${t.done ? "done" : ""}">
      <input type="checkbox" ${t.done ? "checked" : ""} aria-label="done" />
      <span class="label">${esc(t.text)}</span>
      ${dueChip}
      <input type="date" class="due-edit" data-due-edit value="${t.due || ""}" title="Set due date" />
      <button class="icon-btn" data-tdel title="Delete">✕</button>
    </li>`;
  }).join("");
}

function render() {
  renderProjects();
  renderTodos();
  if (typeof renderCalendar === "function") renderCalendar();
  if (typeof renderAgenda === "function") renderAgenda();
}

// --- upcoming agenda (under projects, opposite calendar) ---
const agendaList = $("#agendaList");
const agendaCount = $("#agendaCount");
const agendaScopeBtn = $("#agendaScope");
let agendaScope = "all"; // 'all' | 'active'

agendaScopeBtn?.addEventListener("click", () => {
  agendaScope = agendaScope === "all" ? "active" : "all";
  renderAgenda();
});

agendaList?.addEventListener("click", (e) => {
  const box = e.target.closest('input[type="checkbox"]');
  if (box) {
    const item = box.closest("[data-agenda]");
    if (!item) return;
    const [pid, tid] = item.dataset.agenda.split("::");
    const proj = state.projects.find(p => p.id === pid);
    const t = proj?.todos.find(t => t.id === tid);
    if (t) { t.done = box.checked; save(); render(); }
    return;
  }
  const item = e.target.closest("[data-agenda]");
  if (!item) return;
  const [pid, tid] = item.dataset.agenda.split("::");
  const proj = state.projects.find(p => p.id === pid);
  if (!proj) return;
  const t = proj.todos.find(t => t.id === tid);
  state.activeProjectId = pid;
  if (t?.due) {
    filterDateISO = t.due;
    const d = isoToDate(t.due);
    selectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    viewY = selectedDate.getFullYear(); viewM = selectedDate.getMonth();
    if (todoDueInput) todoDueInput.value = t.due;
  } else {
    filterDateISO = null;
  }
  save(); render();
  document.querySelector(".todos")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

function renderAgenda() {
  if (!agendaList) return;
  if (agendaScopeBtn) agendaScopeBtn.textContent = agendaScope === "all" ? "All projects" : "Active project";

  const todayISO = toISODate(new Date());
  const tomorrowD = new Date(); tomorrowD.setDate(tomorrowD.getDate() + 1);
  const tomorrowISO = toISODate(tomorrowD);

  let pool = [];
  const inScope = agendaScope === "active"
    ? state.projects.filter(p => p.id === state.activeProjectId)
    : state.projects;
  for (const p of inScope) {
    for (const t of (p.todos || [])) {
      if (t.done) continue;
      pool.push({ p, t });
    }
  }
  if (agendaCount) agendaCount.textContent = String(pool.length);

  if (!pool.length) {
    agendaList.innerHTML = `<div class="empty">All clear — no open tasks${agendaScope === "active" ? " in this project" : ""}.</div>`;
    return;
  }

  pool.sort((a, b) => {
    const da = a.t.due || "9999-12-31", db = b.t.due || "9999-12-31";
    if (da !== db) return da < db ? -1 : 1;
    return (a.t.createdAt || 0) - (b.t.createdAt || 0);
  });
  const shown = pool.slice(0, 30);

  let html = "";
  let lastGroup = "";
  for (const { p, t } of shown) {
    let group, cls = "";
    if (!t.due) group = "No date";
    else if (t.due < todayISO) { group = "Overdue"; cls = "overdue-h"; }
    else if (t.due === todayISO) group = `Today • ${fmtShort(t.due)}`;
    else if (t.due === tomorrowISO) group = `Tomorrow • ${fmtShort(t.due)}`;
    else group = fmtLong(isoToDate(t.due));
    if (group !== lastGroup) {
      html += `<div class="agenda-group${cls ? " " + cls : ""}">${esc(group)}</div>`;
      lastGroup = group;
    }
    const overdue = t.due && t.due < todayISO;
    const isToday = t.due === todayISO;
    html += `
      <button class="agenda-item${overdue ? " is-overdue" : ""}${isToday ? " is-today" : ""}" data-agenda="${p.id}::${t.id}" title="Open ${esc(p.name)} • ${t.due || "no date"}">
        <input type="checkbox" aria-label="mark done" />
        <span class="label">${esc(t.text)}</span>
        <span class="proj">${esc(p.name)}</span>
        <span class="due${t.due ? " has-date" : ""}${overdue ? " overdue" : ""}">${t.due ? "📅 " + esc(fmtShort(t.due)) : "No date"}</span>
      </button>`;
  }
  if (pool.length > shown.length) {
    html += `<p class="hint">+ ${pool.length - shown.length} more open tasks.</p>`;
  }
  agendaList.innerHTML = html;
}

// --- timer ---
let total = state.timerSeconds || 1500;
let remaining = total;
let tickId = null;
let running = false;

function fmt(s) {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}
function paintTimer() {
  timerDisplay.textContent = fmt(remaining);
  const pct = total ? 100 - Math.round((remaining / total) * 100) : 0;
  timerProgress.style.width = pct + "%";
  timerState.textContent = running ? "running" : (remaining < total ? "paused" : "idle");
  startPauseBtn.textContent = running ? "Pause" : "Start";
}
function setFromInputs() {
  const h = Math.max(0, Math.min(23, +inH.value || 0));
  const m = Math.max(0, Math.min(59, +inM.value || 0));
  const s = Math.max(0, Math.min(59, +inS.value || 0));
  total = h * 3600 + m * 60 + s;
  if (!total) total = 60;
  remaining = total;
  state.timerSeconds = total;
  save();
  stopTick();
  paintTimer();
}
function stopTick() { running = false; if (tickId) clearInterval(tickId); tickId = null; }
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((d, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = i === 2 ? 880 : 660;
      const t = ctx.currentTime + d;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.start(t); o.stop(t + 0.25);
    });
  } catch {}
}

setBtn.addEventListener("click", setFromInputs);
resetBtn.addEventListener("click", () => { remaining = total; stopTick(); paintTimer(); });
startPauseBtn.addEventListener("click", () => {
  if (running) { stopTick(); paintTimer(); return; }
  if (remaining <= 0) remaining = total;
  running = true;
  tickId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      remaining = 0; stopTick(); paintTimer(); beep();
      timerState.textContent = "done";
      return;
    }
    paintTimer();
  }, 1000);
  paintTimer();
});
document.querySelectorAll("[data-preset]").forEach(b =>
  b.addEventListener("click", () => {
    const v = +b.dataset.preset;
    inH.value = Math.floor(v / 3600);
    inM.value = Math.floor((v % 3600) / 60);
    inS.value = v % 60;
    setFromInputs();
  }));

// --- calendar ---
const calGrid = $("#calGrid");
const calLabel = $("#calLabel");
const calSelected = $("#calSelected");
const calPrev = $("#calPrev");
const calNext = $("#calNext");
const calTodayBtn = $("#calTodayBtn");

const today = new Date();
let viewY = today.getFullYear();
let viewM = today.getMonth(); // 0-11
let selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtLong(d) {
  return d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}
function renderCalendar() {
  if (!calGrid) return;
  const monthName = new Date(viewY, viewM, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  calLabel.textContent = monthName;

  // due counts for active project: iso -> { total, open }
  const dueMap = new Map();
  const p = typeof activeProject === "function" ? activeProject() : null;
  if (p) {
    for (const t of p.todos) {
      if (!t.due) continue;
      const e = dueMap.get(t.due) || { total: 0, open: 0 };
      e.total += 1;
      if (!t.done) e.open += 1;
      dueMap.set(t.due, e);
    }
  }

  // Monday-first offset: JS getDay() 0=Sun..6=Sat -> Mo=0..Su=6
  const first = new Date(viewY, viewM, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const daysInPrev = new Date(viewY, viewM, 0).getDate();

  const cells = [];
  for (let i = offset - 1; i >= 0; i--) {
    cells.push({ d: daysInPrev - i, other: true, date: new Date(viewY, viewM - 1, daysInPrev - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ d, other: false, date: new Date(viewY, viewM, d) });
  }
  while (cells.length % 7 !== 0) {
    const n = cells.length - (offset + daysInMonth) + 1;
    cells.push({ d: n, other: true, date: new Date(viewY, viewM + 1, n) });
  }

  calGrid.innerHTML = cells.map(c => {
    const isToday = sameDay(c.date, today);
    const isSel = sameDay(c.date, selectedDate);
    const iso = toISODate(c.date);
    const info = dueMap.get(iso);
    return `<button class="cal-day${c.other ? " other" : ""}${isToday ? " today" : ""}${isSel ? " selected" : ""}${info && info.open > 0 ? " has-open" : ""}" data-cal="${c.date.getFullYear()}-${c.date.getMonth()}-${c.date.getDate()}" aria-label="${fmtLong(c.date)}${info ? `, ${info.open} open` : ""}">${c.d}${info ? `<span class="dot"></span>` : ""}</button>`;
  }).join("");

  if (selectedDate) {
    const iso = toISODate(selectedDate);
    const info = dueMap.get(iso);
    const parts = [`Selected: ${fmtLong(selectedDate)}`];
    if (info) parts.push(`${info.open} open / ${info.total} due`);
    if (typeof filterDateISO !== "undefined" && filterDateISO) parts.push(`• filtering`);
    else parts.push(`• click a day to filter`);
    calSelected.textContent = parts.join(" ");
  } else {
    calSelected.textContent = "Click a day to filter todos. Click again to show all.";
  }
}

calGrid?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cal]");
  if (!btn) return;
  const [y, m, d] = btn.dataset.cal.split("-").map(Number);
  selectedDate = new Date(y, m, d);
  viewY = y; viewM = m;
  const iso = toISODate(selectedDate);
  // toggle filter: click same date again -> show all
  filterDateISO = (filterDateISO === iso) ? null : iso;
  if (todoDueInput) todoDueInput.value = filterDateISO || iso;
  save();
  renderTodos();
  renderCalendar();
});
calPrev?.addEventListener("click", () => {
  viewM -= 1;
  if (viewM < 0) { viewM = 11; viewY -= 1; }
  renderCalendar();
});
calNext?.addEventListener("click", () => {
  viewM += 1;
  if (viewM > 11) { viewM = 0; viewY += 1; }
  renderCalendar();
});
calTodayBtn?.addEventListener("click", () => {
  viewY = today.getFullYear(); viewM = today.getMonth();
  selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  filterDateISO = toISODate(selectedDate);
  if (todoDueInput) todoDueInput.value = filterDateISO;
  renderTodos();
  renderCalendar();
});
// seed demo if empty (first run only)
if (!localStorage.getItem(LS_KEY)) {
  const t = new Date();
  const isoToday = toISODate(t);
  const tomorrow = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
  const isoTomorrow = toISODate(tomorrow);
  const demo = { id: uid(), name: "Website Redesign", createdAt: Date.now(), todos: [
    { id: uid(), text: "Draft homepage layout", done: true, createdAt: Date.now(), due: isoToday },
    { id: uid(), text: "Pick colour palette", done: false, createdAt: Date.now(), due: isoToday },
    { id: uid(), text: "Set up countdown for launch", done: false, createdAt: Date.now(), due: isoTomorrow },
  ]};
  state.projects = [demo];
  state.activeProjectId = demo.id;
  save();
}

// init timer inputs from state
inH.value = Math.floor(total / 3600);
inM.value = Math.floor((total % 3600) / 60);
inS.value = total % 60;

applyTheme();
render();
paintTimer();
