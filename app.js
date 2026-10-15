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
const todoAddBtn = $("#todoAddBtn");
const todoList = $("#todoList");
const clearDoneBtn = $("#clearDoneBtn");

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

// --- todos ---
todoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const p = activeProject();
  if (!p) return;
  const text = todoInput.value.trim();
  if (!text) return;
  p.todos.unshift({ id: uid(), text, done: false, createdAt: Date.now() });
  todoInput.value = "";
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

  if (!p) {
    activeProjectName.textContent = "No project";
    todoStats.textContent = "Create a project to get started.";
    todoProgress.style.width = "0%";
    todoList.innerHTML = `<div class="empty">Your tasks will appear here.</div>`;
    return;
  }
  activeProjectName.textContent = "📁 " + p.name;
  const total = p.todos.length;
  const done = p.todos.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  todoStats.textContent = total ? `${total - done} open • ${done} done • ${pct}% complete` : "No tasks yet — add one above.";
  todoProgress.style.width = pct + "%";

  if (!total) {
    todoList.innerHTML = `<div class="empty">No tasks yet.</div>`;
    return;
  }
  todoList.innerHTML = p.todos.map(t => `
    <li data-tid="${t.id}" class="${t.done ? "done" : ""}">
      <input type="checkbox" ${t.done ? "checked" : ""} aria-label="done" />
      <span class="label">${esc(t.text)}</span>
      <button class="icon-btn" data-tdel title="Delete">✕</button>
    </li>`).join("");
}

function render() {
  renderProjects();
  renderTodos();
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

// seed demo if empty (first run only)
if (!localStorage.getItem(LS_KEY)) {
  const demo = { id: uid(), name: "Website Redesign", createdAt: Date.now(), todos: [
    { id: uid(), text: "Draft homepage layout", done: true, createdAt: Date.now() },
    { id: uid(), text: "Pick colour palette", done: false, createdAt: Date.now() },
    { id: uid(), text: "Set up countdown for launch", done: false, createdAt: Date.now() },
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
