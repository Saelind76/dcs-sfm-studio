/* DCS WWII SFM Studio - client.
 * This file contains NO aerodynamic formulas and NO master databases.
 * Every calculation is requested from the private backend via POST /api/compile.
 */
const API_BASE_URL = "https://dcs-sfm-engine-api.onrender.com";

/* ------------------------------------------------------------------ */
/* Form definitions (input metadata only: labels, defaults, limits)    */
/* ------------------------------------------------------------------ */
// f(key, label, default, min, max, step, unit)
const f = (k, l, d, min, max, step, u) => ({ k, l, d, min, max, step, u: u || "" });
const txt = (k, l, d, max) => ({ k, l, d, text: true, max });

const AIRCRAFT_TABS = [
  { id: "identity", label: "Identity", fields: [
    txt("designation", "Designation", "Custom WWII Fighter", 80),
    txt("theater", "Theater", "Custom Theater", 60),
    txt("nation", "Nation", "User Mod", 60),
    f("year", "Year", 1944, 1930, 1960, 1),
    txt("tactical_role", "Tactical role", "Fighter", 60),
    f("engines_count", "Engines count", 1, 1, 6, 1),
  ]},
  { id: "wing", label: "Wing", fields: [
    f("b", "Wingspan", 11.5, 4, 60, 0.01, "m"),
    f("S_ref", "Wing area", 22.5, 5, 300, 0.01, "m²"),
    f("c_root", "Root chord", 2.5, 0.5, 12, 0.01, "m"),
    f("c_tip", "Tip chord", 1.4, 0.2, 8, 0.01, "m"),
    f("theta_25", "Quarter-chord sweep", 2.0, -10, 35, 0.1, "deg"),
    f("t_c", "Thickness ratio (t/c)", 0.14, 0.06, 0.25, 0.005),
    f("i_w_deg", "Wing incidence", 2.0, -5, 8, 0.1, "deg"),
    f("Ka", "Airfoil technology factor (Ka)", 0.87, 0.75, 0.95, 0.01),
    f("alpha_0_prof", "Zero-lift AoA (airfoil)", -1.8, -6, 2, 0.1, "deg"),
    f("washout", "Washout", 2.0, -2, 6, 0.1, "deg"),
  ]},
  { id: "body", label: "Fuselage & Tail", fields: [
    f("L_F", "Fuselage length", 9.5, 4, 45, 0.01, "m"),
    f("D_F", "Fuselage diameter", 1.35, 0.5, 6, 0.01, "m"),
    f("L_N", "Nose length", 2.8, 0.5, 15, 0.01, "m"),
    f("S_ht", "Horizontal tail area", 4.2, 0.5, 60, 0.01, "m²"),
    f("S_vt", "Vertical tail area", 1.9, 0.3, 35, 0.01, "m²"),
    f("L_T", "Tail arm", 5.2, 1.5, 25, 0.01, "m"),
  ]},
  { id: "flaps", label: "Flaps & Gear", fields: [
    f("b_flap", "Flap span", 4.8, 0, 40, 0.01, "m"),
    f("delta_flap", "Flap deflection", 45, 0, 85, 1, "deg"),
    f("delta_CL", "Flap lift increment (ΔCL)", 0.65, 0, 2.2, 0.01),
    f("S_gear", "Landing gear frontal area", 0.5, 0, 6, 0.01, "m²"),
    f("cx_brk", "Airbrake drag increment", 0.0, 0, 0.25, 0.001),
  ]},
  { id: "weights", label: "Weights", fields: [
    f("M_empty", "Empty weight", 3200, 300, 50000, 1, "kg"),
    f("M_fuel_max", "Max internal fuel", 600, 20, 25000, 1, "kg"),
    f("M_nominal", "Nominal combat weight", 4200, 400, 70000, 1, "kg"),
    f("M_max", "Max takeoff weight", 5000, 500, 85000, 1, "kg"),
  ]},
  { id: "speeds", label: "Speeds", fields: [
    f("Vmax_SL", "Max speed, sea level", 520, 150, 850, 1, "km/h"),
    f("Vmax_Alt", "Max speed, altitude", 610, 160, 950, 1, "km/h"),
    f("Critical_Alt", "Critical altitude", 5800, 0, 14000, 1, "m"),
    f("Service_Ceiling", "Service ceiling", 11000, 2000, 16000, 1, "m"),
    f("V_stall", "Stall speed (clean)", 155, 70, 280, 1, "km/h"),
    f("Vy_max", "Initial climb rate", 15.5, 2, 35, 0.1, "m/s"),
  ]},
  { id: "coeffs", label: "Coefficients", fields: [
    f("C_fe", "Equivalent skin friction (Cfe)", 0.0045, 0.0025, 0.01, 0.0001),
    f("Delta_Cx_ref", "ΔCx refinement", 0.0045, 0, 0.02, 0.0001),
    f("Delta_Cx_misc", "ΔCx miscellaneous", 0.0035, 0, 0.02, 0.0001),
    f("Roll_Retention_M060", "Roll retention at M0.60", 0.38, 0.05, 0.9, 0.01),
    f("pb_2V", "Roll helix angle (pb/2V)", 0.088, 0.02, 0.2, 0.001),
    f("Mzalfa", "Pitch stability (Mzalfa)", 4.355, 2, 9, 0.001),
  ]},
];

const ENGINE_TABS = [
  { id: "basic", label: "Engine", fields: [
    txt("model", "Model name", "Custom Piston Engine", 80),
    txt("architecture", "Architecture", "14-Cyl Two-Row Air-Cooled Radial", 80),
    f("Displ", "Displacement", 28.0, 1, 120, 0.01, "L"),
    f("Stroke", "Stroke", 0.15, 0.05, 0.4, 0.001, "m"),
    f("k_Eps", "Compression ratio", 7.0, 4, 12, 0.1),
    f("Nominal_RPM", "Nominal RPM", 2700, 1000, 5000, 1, "rpm"),
    f("Nmg", "Idle RPM", 22, 10, 45, 0.1, "%"),
    f("N_indic_0", "Indicated power", 850000, 50000, 4000000, 1000, "W"),
    txt("firing_order", "Firing order", "1-10-5-14-9-4-13-8-3-12-7-2-11-6", 120),
  ]},
  { id: "boost", label: "Supercharger", fields: [
    f("k_boost", "Boost multiplier", 1.4, 1, 3.5, 0.01),
    f("hMaxEng", "Critical altitude", 5.5, 0, 14, 0.1, "km"),
    f("k_adiab_1", "Adiabatic coeff. stage 1", 0.0379, 0.005, 0.15, 0.0001),
    f("k_adiab_2", "Adiabatic coeff. stage 2", 0.0562, 0.005, 0.15, 0.0001),
    f("MAX_Manifold_P_1", "Max manifold pressure 1", 125000, 50000, 350000, 100, "Pa"),
    f("MAX_Manifold_P_2", "Max manifold pressure 2", 141325, 50000, 380000, 100, "Pa"),
    f("dpdh_m", "Pressure gradient", 1800, 300, 6000, 10, "Pa/m"),
    f("k_after_cool", "Aftercooler efficiency", 0.35, 0, 1, 0.01),
    f("k_cfug", "Centrifugal factor", 0.0015, 0.0001, 0.02, 0.0001),
    f("k_vel", "Ram recovery factor", 0.014, 0.001, 0.05, 0.001),
  ]},
  { id: "prop", label: "Propeller", fields: [
    f("D_prop", "Propeller diameter", 3.1, 1.5, 6, 0.01, "m"),
    f("MOI_prop", "Propeller inertia", 35, 5, 150, 0.1, "kg·m²"),
    f("k_gearbox_raw", "Gearbox ratio", 1.46, 0.2, 5, 0.01),
    f("prop_blades_count", "Blade count", 3, 2, 6, 1),
    f("prop_direction", "Rotation (1 / -1)", 1, -1, 1, 1),
    f("prop_pitch_min", "Pitch, fine", 20, 5, 40, 0.5, "deg"),
    f("prop_pitch_max", "Pitch, coarse", 55, 35, 80, 0.5, "deg"),
    f("prop_pitch_feather", "Pitch, feather", 85, 65, 90, 0.5, "deg"),
    f("k_reg", "Governor gain", 0.005, 0.0005, 0.05, 0.0005),
    f("Nu_1", "Propeller coeff. Nu_1", 0.88, 0.5, 1.2, 0.01),
    f("Nu_2", "Propeller coeff. Nu_2", 0.001, 0.0001, 0.01, 0.0001),
    f("dcx_eng", "Engine cooling drag", 0.02, 0.005, 0.06, 0.001),
  ]},
];

const OVERRIDES = [
  f("M_nominal", "M_nominal", "", 400, 70000, 1, "kg"),
  f("cx_brk", "cx_brk", "", 0, 0.25, 0.001),
  f("V_stall", "V_stall", "", 70, 280, 1, "km/h"),
  f("Vmax_SL", "Vmax_SL", "", 150, 850, 1, "km/h"),
  f("Vy_max", "Vy_max", "", 2, 35, 0.1, "m/s"),
];

const SUMMARY_CARDS = [
  ["Wing Loading", "wing_loading_kg_m2", "kg/m²"],
  ["Aspect Ratio", "aspect_ratio", ""],
  ["Cy0", "Cy0", ""],
  ["CyMax (clean)", "CyMax_clean", ""],
  ["Cx0", "Cx0_subsonic", ""],
  ["B4 @ M0.24", "B4_corner_M024", ""],
  ["Mzalfa", "Mzalfa", ""],
  ["Mzalfadt", "Mzalfadt", ""],
  ["M_CR", "M_CR", ""],
  ["M_DD", "M_DD", ""],
  ["Ny max / min", null, ""],
  ["Static Thrust", "thrust_sum_max_kgf", "kgf"],
  ["Vmax SL", "Vmax_SL_kmh", "km/h"],
  ["Vy max", "Vy_max_ms", "m/s"],
];

/* ------------------------------------------------------------------ */
/* State & helpers                                                     */
/* ------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const state = {
  mode: "preset",
  engineMode: "preset",
  theater: "ALL",
  catalog: { aircraft: [], engines: [] },
  lastLua: "",
  lastName: "Aircraft",
  chart: null,
  aircraftTab: "identity",
  engineTab: "basic",
};
const HANGAR_KEY = "dcs-sfm-studio.hangar.v1";

function el(tag, attrs, children) {
  const n = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else n.setAttribute(k, v);
  }
  (children || []).forEach((c) => n.appendChild(c));
  return n;
}

function setMsg(node, text, kind) {
  node.textContent = text || "";
  node.className = "msg" + (kind ? " " + kind : "");
}

function safeFileName(name) {
  return (name || "Aircraft").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "Aircraft";
}

/* ------------------------------------------------------------------ */
/* Server status & API                                                 */
/* ------------------------------------------------------------------ */
function setStatus(kind, text) {
  $("statusDot").className = "dot dot-" + kind;
  $("statusText").textContent = text;
}

async function apiFetch(path, options, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs || 20000);
  try {
    return await fetch(API_BASE_URL + path, { ...(options || {}), signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function pingServer() {
  setStatus("wait", "Waking up free tier server...");
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const r = await apiFetch("/api/health", {}, 15000);
      if (r.ok) { setStatus("ok", "Online"); return true; }
    } catch (e) { /* retry */ }
    await new Promise((res) => setTimeout(res, 4000));
  }
  setStatus("err", "Server unreachable. Retry in a minute.");
  return false;
}

async function loadCatalog() {
  const ok = await pingServer();
  if (!ok) return;
  try {
    const r = await apiFetch("/api/catalog", {}, 20000);
    if (!r.ok) throw new Error("HTTP " + r.status);
    state.catalog = await r.json();
    renderAircraftSelect();
    renderEngineSelect();
  } catch (e) {
    setMsg($("compileMsg"), "Could not load the catalog: " + e.message, "err");
  }
}

/* ------------------------------------------------------------------ */
/* Preset mode                                                         */
/* ------------------------------------------------------------------ */
function renderAircraftSelect() {
  const sel = $("aircraftSelect");
  const prev = sel.value;
  sel.textContent = "";
  const list = state.catalog.aircraft.filter((a) => state.theater === "ALL" || a.theater === state.theater);
  list.sort((a, b) => a.designation.localeCompare(b.designation));
  list.forEach((a) => {
    sel.appendChild(el("option", { value: a.designation, text: a.designation + " (" + a.common_name + ")" }));
  });
  sel.disabled = list.length === 0;
  if (prev && list.some((a) => a.designation === prev)) sel.value = prev;
  renderAircraftInfo();
}

function renderAircraftInfo() {
  const box = $("aircraftInfo");
  const a = state.catalog.aircraft.find((x) => x.designation === $("aircraftSelect").value);
  if (!a) { box.hidden = true; return; }
  box.textContent = "";
  box.appendChild(el("div", null, [el("b", { text: "Role: " }), document.createTextNode(a.role)]));
  box.appendChild(el("div", null, [el("b", { text: "Theater: " }), document.createTextNode(a.theater)]));
  box.appendChild(el("div", null, [el("b", { text: "Installed engine: " }), document.createTextNode(a.installed_engine)]));
  box.hidden = false;
}

function renderEngineSelect() {
  const sel = $("engineSelect");
  sel.textContent = "";
  state.catalog.engines
    .slice()
    .sort((a, b) => a.model.localeCompare(b.model))
    .forEach((e) => sel.appendChild(el("option", { value: e.model, text: e.model + " - " + e.architecture })));
  sel.disabled = state.catalog.engines.length === 0;
}

/* ------------------------------------------------------------------ */
/* Form builders                                                       */
/* ------------------------------------------------------------------ */
function fieldNode(prefix, def) {
  const id = prefix + "_" + def.k;
  const wrap = el("div", { class: "field" });
  const label = el("label", { for: id, text: def.l + (def.u ? " [" + def.u + "]" : "") });
  const input = el("input", { id, name: def.k });
  if (def.text) {
    input.type = "text";
    input.maxLength = def.max;
    input.value = def.d;
  } else {
    input.type = "number";
    input.min = def.min;
    input.max = def.max;
    input.step = def.step;
    input.inputMode = "decimal";
    input.value = def.d === "" ? "" : def.d;
    input.placeholder = def.d === "" ? "catalog value" : "";
  }
  wrap.appendChild(label);
  wrap.appendChild(input);
  return wrap;
}

function buildTabs(tabsDef, tabsNode, fieldsNode, prefix, stateKey) {
  tabsNode.textContent = "";
  fieldsNode.textContent = "";
  tabsDef.forEach((tab, i) => {
    const btn = el("button", { class: "subtab" + (i === 0 ? " active" : ""), type: "button", role: "tab", "data-tab": tab.id, text: tab.label });
    btn.addEventListener("click", () => {
      state[stateKey] = tab.id;
      tabsNode.querySelectorAll(".subtab").forEach((b) => b.classList.toggle("active", b === btn));
      fieldsNode.querySelectorAll(".tabpane").forEach((p) => { p.hidden = p.dataset.tab !== tab.id; });
    });
    tabsNode.appendChild(btn);
    const pane = el("div", { class: "tabpane grid-2", "data-tab": tab.id });
    pane.hidden = i !== 0;
    tab.fields.forEach((d) => pane.appendChild(fieldNode(prefix, d)));
    fieldsNode.appendChild(pane);
  });
}

function readForm(tabsDef, prefix) {
  const out = {};
  for (const tab of tabsDef) {
    for (const d of tab.fields) {
      const inp = $(prefix + "_" + d.k);
      if (d.text) {
        out[d.k] = inp.value.trim();
      } else {
        if (inp.value === "") throw new Error(d.l + " is required.");
        const v = Number(inp.value);
        if (!Number.isFinite(v)) throw new Error(d.l + " must be a number.");
        out[d.k] = v;
      }
    }
  }
  return out;
}

function writeForm(tabsDef, prefix, data) {
  for (const tab of tabsDef) {
    for (const d of tab.fields) {
      if (data[d.k] === undefined || data[d.k] === null) continue;
      const inp = $(prefix + "_" + d.k);
      inp.value = d.text ? String(data[d.k]) : Number(data[d.k]);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Compile                                                             */
/* ------------------------------------------------------------------ */
function buildPayload() {
  if (state.mode === "preset") {
    const sel = $("aircraftSelect").value;
    if (!sel) throw new Error("Select an aircraft first.");
    const payload = { mode: "preset", preset_designation: sel };
    const ov = {};
    OVERRIDES.forEach((d) => {
      const v = $("ovr_" + d.k).value;
      if (v !== "") {
        const n = Number(v);
        if (!Number.isFinite(n)) throw new Error(d.l + " override must be a number.");
        ov[d.k] = n;
      }
    });
    if (Object.keys(ov).length) payload.overrides = ov;
    return payload;
  }
  const payload = {
    mode: "custom",
    custom_aircraft: readForm(AIRCRAFT_TABS, "ac"),
    engine_mode: state.engineMode,
  };
  if (state.engineMode === "preset") {
    const sel = $("engineSelect").value;
    if (!sel) throw new Error("Select a catalog engine first.");
    payload.preset_engine = sel;
  } else {
    payload.custom_engine = readForm(ENGINE_TABS, "en");
  }
  return payload;
}

function errorText(data, status) {
  if (data && Array.isArray(data.detail)) {
    return data.detail.map((d) => (d.loc ? d.loc.slice(1).join(".") + ": " : "") + d.msg).join(" | ");
  }
  if (data && typeof data.detail === "string") return data.detail;
  return "Server error (HTTP " + status + ").";
}

async function compile() {
  const btn = $("compileBtn");
  const msg = $("compileMsg");
  let payload;
  try { payload = buildPayload(); } catch (e) { setMsg(msg, e.message, "err"); return; }

  btn.disabled = true;
  setMsg(msg, "Compiling...", "");
  try {
    const r = await apiFetch("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, 60000);
    let data = null;
    try { data = await r.json(); } catch (e) { /* non-JSON body */ }
    if (!r.ok) {
      setMsg(msg, r.status === 429 ? "Too many requests. Wait a minute and try again." : errorText(data, r.status), "err");
      return;
    }
    renderResults(data);
    setMsg(msg, "Done.", "ok");
  } catch (e) {
    setMsg(msg, e.name === "AbortError" ? "The server took too long. It may be waking up; try again." : "Network error: " + e.message, "err");
  } finally {
    btn.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */
function fmt(v) {
  if (typeof v !== "number") return String(v);
  return Math.abs(v) >= 1000 ? v.toFixed(0) : String(v);
}

function renderResults(d) {
  $("resultsPanel").hidden = false;
  $("resultTitle").textContent = "Results: " + d.aircraft;
  $("resultSubtitle").textContent = d.engine + " | " + d.provenance;

  const cards = $("summaryCards");
  cards.textContent = "";
  SUMMARY_CARDS.forEach(([label, key, unit]) => {
    let value;
    if (key === null) value = d.summary.Ny_max + " / " + d.summary.Ny_min;
    else value = fmt(d.summary[key]);
    cards.appendChild(el("div", { class: "card" }, [
      el("div", { class: "k", text: label }),
      el("div", { class: "v", text: value + (unit ? " " + unit : "") }),
    ]));
  });

  const tbody = document.querySelector("#aeroTable tbody");
  tbody.textContent = "";
  d.aero_table.forEach((row) => {
    const tr = el("tr");
    ["index", "M", "Cx0", "Cya", "B", "B4", "Omxmax", "Aldop", "Cymax", "comment"].forEach((k) => {
      tr.appendChild(el("td", { text: String(row[k]) }));
    });
    tbody.appendChild(tr);
  });

  drawPolar(d.polar_curve);

  state.lastLua = d.lua_script;
  state.lastName = d.aircraft;
  $("luaView").textContent = d.lua_script;
  $("resultsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function drawPolar(points) {
  if (typeof Chart === "undefined") return;
  if (state.chart) state.chart.destroy();
  const ctx = $("polarChart").getContext("2d");
  state.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: points.map((p) => p.CL),
      datasets: [{
        label: "CD",
        data: points.map((p) => p.CD),
        borderColor: "#ffb000",
        backgroundColor: "rgba(255,176,0,.15)",
        pointRadius: 2,
        tension: 0.25,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#d8e1ea" } } },
      scales: {
        x: { title: { display: true, text: "CL", color: "#8393a4" }, ticks: { color: "#8393a4" }, grid: { color: "#2a3644" } },
        y: { title: { display: true, text: "CD", color: "#8393a4" }, ticks: { color: "#8393a4" }, grid: { color: "#2a3644" } },
      },
    },
  });
}

async function copyLua() {
  if (!state.lastLua) return;
  try {
    await navigator.clipboard.writeText(state.lastLua);
    flash($("copyLuaBtn"), "Copied");
  } catch (e) {
    const range = document.createRange();
    range.selectNodeContents($("luaView"));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    flash($("copyLuaBtn"), "Selected: press Ctrl+C");
  }
}

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = old; }, 1600);
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* My Hangar (localStorage)                                            */
/* ------------------------------------------------------------------ */
function loadHangar() {
  try {
    const raw = localStorage.getItem(HANGAR_KEY);
    if (raw) {
      const h = JSON.parse(raw);
      return { aircraft: h.aircraft || {}, engines: h.engines || {} };
    }
  } catch (e) { /* ignore */ }
  return { aircraft: {}, engines: {} };
}

function saveHangar(h) {
  try {
    localStorage.setItem(HANGAR_KEY, JSON.stringify(h));
    return true;
  } catch (e) {
    setMsg($("hangarMsg"), "Could not save: browser storage is unavailable.", "err");
    return false;
  }
}

function renderHangar() {
  const h = loadHangar();
  [["aircraft", "hangarAircraft", AIRCRAFT_TABS, "ac"], ["engines", "hangarEngines", ENGINE_TABS, "en"]].forEach(([kind, listId, tabs, prefix]) => {
    const ul = $(listId);
    ul.textContent = "";
    const names = Object.keys(h[kind]).sort();
    if (!names.length) ul.appendChild(el("li", { class: "empty", text: "Nothing saved yet." }));
    names.forEach((name) => {
      const load = el("button", { type: "button", text: "Load" });
      load.addEventListener("click", () => {
        if (kind === "aircraft") {
          setMode("custom");
          writeForm(AIRCRAFT_TABS, "ac", h.aircraft[name]);
        } else {
          setMode("custom");
          setEngineMode("custom");
          writeForm(ENGINE_TABS, "en", h.engines[name]);
        }
        setMsg($("hangarMsg"), "Loaded '" + name + "'.", "ok");
      });
      const del = el("button", { type: "button", class: "del", text: "Delete" });
      del.addEventListener("click", () => {
        const cur = loadHangar();
        delete cur[kind][name];
        saveHangar(cur);
        renderHangar();
      });
      ul.appendChild(el("li", null, [el("span", { text: name }), el("span", null, [load, document.createTextNode(" "), del])]));
    });
  });
}

function saveCurrent(kind) {
  const msg = $("hangarMsg");
  try {
    const data = kind === "aircraft" ? readForm(AIRCRAFT_TABS, "ac") : readForm(ENGINE_TABS, "en");
    const name = kind === "aircraft" ? data.designation : data.model;
    if (!name) throw new Error("Give it a name first (Designation / Model name).");
    const h = loadHangar();
    h[kind][name] = data;
    if (saveHangar(h)) { renderHangar(); setMsg(msg, "Saved '" + name + "'.", "ok"); }
  } catch (e) {
    setMsg(msg, e.message, "err");
  }
}

function sanitizeEntries(obj, tabsDef) {
  const allowed = new Map();
  tabsDef.forEach((t) => t.fields.forEach((d) => allowed.set(d.k, d)));
  const out = {};
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
  for (const [name, entry] of Object.entries(obj)) {
    if (!entry || typeof entry !== "object") continue;
    const clean = {};
    for (const [k, v] of Object.entries(entry)) {
      const d = allowed.get(k);
      if (!d) continue;
      if (d.text && typeof v === "string") clean[k] = v.slice(0, d.max);
      else if (!d.text && typeof v === "number" && Number.isFinite(v)) clean[k] = v;
    }
    out[String(name).slice(0, 80)] = clean;
  }
  return out;
}

function exportHangar() {
  downloadText("my_sfm_hangar.json", JSON.stringify(loadHangar(), null, 2), "application/json");
}

function importHangar(file) {
  const msg = $("hangarMsg");
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const h = loadHangar();
      Object.assign(h.aircraft, sanitizeEntries(parsed.aircraft, AIRCRAFT_TABS));
      Object.assign(h.engines, sanitizeEntries(parsed.engines, ENGINE_TABS));
      if (saveHangar(h)) { renderHangar(); setMsg(msg, "Hangar imported.", "ok"); }
    } catch (e) {
      setMsg(msg, "Invalid hangar file.", "err");
    }
  };
  reader.onerror = () => setMsg(msg, "Could not read the file.", "err");
  reader.readAsText(file);
}

/* ------------------------------------------------------------------ */
/* Mode switching & init                                               */
/* ------------------------------------------------------------------ */
function setMode(mode) {
  state.mode = mode;
  $("presetPane").hidden = mode !== "preset";
  $("customPane").hidden = mode !== "custom";
  $("modePreset").classList.toggle("active", mode === "preset");
  $("modeCustom").classList.toggle("active", mode === "custom");
  $("modePreset").setAttribute("aria-selected", String(mode === "preset"));
  $("modeCustom").setAttribute("aria-selected", String(mode === "custom"));
}

function setEngineMode(mode) {
  state.engineMode = mode;
  $("enginePresetPane").hidden = mode !== "preset";
  $("engineCustomPane").hidden = mode !== "custom";
  document.querySelectorAll("#engineModeSeg .seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.engineMode === mode));
}

function init() {
  const grid = $("overrideGrid");
  OVERRIDES.forEach((d) => grid.appendChild(fieldNode("ovr", d)));
  buildTabs(AIRCRAFT_TABS, $("customTabs"), $("customFields"), "ac", "aircraftTab");
  buildTabs(ENGINE_TABS, $("engineTabs"), $("engineFields"), "en", "engineTab");

  $("modePreset").addEventListener("click", () => setMode("preset"));
  $("modeCustom").addEventListener("click", () => setMode("custom"));
  document.querySelectorAll("#theaterFilter .seg-btn").forEach((b) => {
    b.addEventListener("click", () => {
      state.theater = b.dataset.theater;
      document.querySelectorAll("#theaterFilter .seg-btn").forEach((x) => x.classList.toggle("active", x === b));
      renderAircraftSelect();
    });
  });
  document.querySelectorAll("#engineModeSeg .seg-btn").forEach((b) => {
    b.addEventListener("click", () => setEngineMode(b.dataset.engineMode));
  });
  $("aircraftSelect").addEventListener("change", renderAircraftInfo);
  $("compileBtn").addEventListener("click", compile);
  $("copyLuaBtn").addEventListener("click", copyLua);
  $("downloadLuaBtn").addEventListener("click", () => {
    if (state.lastLua) downloadText(safeFileName(state.lastName) + "_SFM.lua", state.lastLua, "text/plain");
  });
  $("saveAircraftBtn").addEventListener("click", () => saveCurrent("aircraft"));
  $("saveEngineBtn").addEventListener("click", () => saveCurrent("engines"));
  $("exportHangarBtn").addEventListener("click", exportHangar);
  $("importHangarInput").addEventListener("change", (ev) => {
    if (ev.target.files && ev.target.files[0]) importHangar(ev.target.files[0]);
    ev.target.value = "";
  });

  renderHangar();
  loadCatalog();
}

document.addEventListener("DOMContentLoaded", init);
