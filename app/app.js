// Calm Mastery: personal MVP.
// All data stays in this browser's localStorage on this device. Use Progress > Export to back up.

const KEY = "calm-mastery.v1";
const CYCLE = 41;

// ---------- storage ----------
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.version === 1) return s;
  } catch (e) { /* fall through to fresh state */ }
  return { version: 1, startDate: null, days: {}, triggers: [], active: null };
}
let state = load();
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

// ---------- dates (local time, YYYY-MM-DD) ----------
function keyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function todayKey() { return keyOf(new Date()); }
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
function diffDays(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }
function dayNumber(k = todayKey()) { return state.startDate ? diffDays(state.startDate, k) + 1 : 0; }
function cycleInfo(k = todayKey()) {
  const n = dayNumber(k);
  return { n, cycle: Math.floor((n - 1) / CYCLE) + 1, day: ((n - 1) % CYCLE) + 1 };
}
function cycleStartKey() { const { cycle } = cycleInfo(); return addDays(state.startDate, (cycle - 1) * CYCLE); }
function phaseFor(day) { return PHASES.find(p => day >= p.from && day <= p.to) || PHASES[PHASES.length - 1]; }

function dayData(k) {
  if (!state.days[k]) state.days[k] = { morning: {}, night: null };
  return state.days[k];
}
function morningDone(k) { const d = state.days[k]; return !!(d && d.morning && d.morning.breath && d.morning.focus); }
function nightDone(k) { const d = state.days[k]; return !!(d && d.night); }
function dayStatus(k) {
  const m = morningDone(k), n = nightDone(k);
  if (m && n) return "full";
  if (m || n) return "partial";
  return k < todayKey() ? "missed" : "future";
}
function streak() {
  let k = todayKey();
  if (dayStatus(k) === "future") k = addDays(k, -1); // today not started yet doesn't break the streak
  let s = 0;
  while (state.startDate && k >= state.startDate && ["full", "partial"].includes(dayStatus(k))) { s++; k = addDays(k, -1); }
  return s;
}
function triggersOn(k) { return state.triggers.filter(t => t.date === k); }
function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const view = $("#view");
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function fmtClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : String(m).padStart(2, "0")) + ":" + String(s).padStart(2, "0");
}
function fmtMin(m) { if (m == null) return "–"; return m < 60 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`; }
function srcList(keys) { return keys.map(k => `<p class="src">${esc(SOURCES[k])}</p>`).join(""); }
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 1800);
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// App shortcuts open ./#trigger or ./#night
let tab = ["today", "trigger", "night", "progress"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "today";
if (location.hash) history.replaceState(null, "", location.pathname);
let nightDate = null;

// ---------- header ----------
function renderHeader() {
  if (!state.startDate) { $("#dayLabel").textContent = "Not started"; $("#streakBadge").textContent = ""; return; }
  const { cycle, day, n } = cycleInfo();
  $("#dayLabel").textContent = n < 1 ? `Starts ${state.startDate}` : `Cycle ${cycle} · Day ${day} of ${CYCLE} · ${phaseFor(day).name}`;
  const s = streak();
  $("#streakBadge").textContent = `🔥 ${s}`;
  const b = $("#activeBanner");
  if (state.active && tab !== "trigger") {
    b.hidden = false;
    b.innerHTML = `${TRIGGER_TYPES[state.active.type].emoji} Calm-down timer running · <span id="bannerClock">${fmtClock(Date.now() - state.active.start)}</span> · tap to open`;
  } else b.hidden = true;
}

// ---------- TODAY ----------
let breath = null; // { mode, cycle, total, timer }
const BREATH_STEPS = [["Inhale", 2000, 0.9], ["Top-up inhale", 1000, 1.0], ["Long exhale", 6000, 0.6]];
const BREATH_MODES = { sigh3: { label: "3 sighs (~30 s)", cycles: 3 }, min1: { label: "1 minute", cycles: 7 }, min5: { label: "5 minutes", cycles: 33 } };

function renderToday() {
  if (!state.startDate) {
    view.innerHTML = `
      <div class="card">
        <h2>Welcome</h2>
        <p>This is your personal 41-day programme for staying calm under pressure: less impatience, a steadier voice, faster recovery after getting upset, and clearer reading of people.</p>
        <p><b>Each day takes about 6 minutes:</b></p>
        <ul class="steps">
          <li><b>Morning (2 min):</b> a breathing drill and one focus for the day.</li>
          <li><b>When triggered (15 s):</b> tap the Trigger tab. It guides you and times how long you take to calm down.</li>
          <li><b>Night (3–4 min):</b> a short log separating what happened from what you assumed.</li>
        </ul>
        <p class="hint">Everything is stored only on this device.</p>
        <button class="btn primary block" data-action="start">Start Day 1 today</button>
      </div>
      <p class="disclaimer">${esc(CRISIS_TEXT)}</p>`;
    return;
  }
  const k = todayKey(), { n, day } = cycleInfo();
  if (n < 1) { view.innerHTML = `<div class="card"><h2>Your programme starts on ${esc(state.startDate)}</h2></div>`; return; }
  const d = dayData(k), p = phaseFor(day);
  const pr = PRINCIPLES[(n - 1) % PRINCIPLES.length];
  const yesterdayMissed = n > 1 && dayStatus(addDays(k, -1)) === "missed";
  const focusIsCustom = d.morning.focus && !p.focuses.includes(d.morning.focus);

  view.innerHTML = `
    ${yesterdayMissed && dayStatus(k) === "future" ? `<div class="card"><span class="tag warn">Never miss twice</span><p>You missed yesterday. That's fine; one miss doesn't break a habit. Just don't let today be the second.</p></div>` : ""}

    <div class="card">
      <span class="tag">Today's principle</span>
      <p class="quote" style="margin-top:8px">${esc(pr.text)}</p>
      <p class="src">${esc(SOURCES[pr.src])}</p>
    </div>

    <div class="card ${d.morning.breath ? "done" : ""}">
      <h2>1 · Physiological sigh ${d.morning.breath ? "✓" : ""}</h2>
      <p class="hint">Two inhales through the nose (the second a short top-up), then a long, slow exhale through the mouth. Lowers arousal quickly.</p>
      <div class="breath">
        <div class="row">${Object.entries(BREATH_MODES).map(([m, v]) =>
          `<button class="chip ${(breath ? breath.mode : "sigh3") === m ? "selected" : ""}" data-action="breathMode" data-mode="${m}" ${breath && breath.timer ? "disabled" : ""}>${v.label}</button>`).join("")}</div>
        <div class="circle" id="circle">Ready</div>
        <div class="count" id="breathCount">&nbsp;</div>
        <div class="row" style="margin-top:10px">
          ${breath && breath.timer
            ? `<button class="btn" data-action="breathStop">Stop</button>`
            : `<button class="btn primary" data-action="breathStart">${d.morning.breath ? "Do it again" : "Start"}</button>`}
        </div>
      </div>
      <details class="srcs"><summary>Research</summary>${srcList(["balban2023", "zaccaro2018"])}</details>
    </div>

    <div class="card ${d.morning.focus ? "done" : ""}">
      <h2>2 · Today's one focus ${d.morning.focus ? "✓" : ""}</h2>
      <p class="hint">Phase: ${esc(p.name)}. Pick one thing to practise all day.</p>
      ${p.focuses.map((f, i) => `<button class="choice ${d.morning.focus === f ? "selected" : ""}" data-action="focus" data-i="${i}">${esc(f)}</button>`).join("")}
      <input type="text" id="customFocus" placeholder="Or write your own…" value="${focusIsCustom ? esc(d.morning.focus) : ""}">
      <details class="srcs"><summary>Make it an if-then plan</summary>
        <p>Turn your focus into "If ___ happens, then I will ___." Plans phrased this way are far more likely to fire in the moment.</p>${srcList(["gollwitzer1999"])}</details>
    </div>

    <div class="card">
      <h2>3 · Tonight</h2>
      <p class="hint">${nightDone(k) ? "Night log done ✓" : "Spend 3–4 minutes on the night log before bed."}</p>
      <button class="btn block" data-action="goto" data-tab="night">Open night log</button>
    </div>
    <p class="disclaimer">${esc(CRISIS_TEXT)}</p>`;
  if (breath && breath.timer) paintBreath();
}

function breathRun() {
  const total = BREATH_MODES[breath.mode].cycles;
  if (breath.cycle >= total) { breathFinish(); return; }
  const [label, ms, scale] = BREATH_STEPS[breath.step];
  breath.label = label; breath.ms = ms; breath.scale = scale;
  paintBreath();
  breath.timer = setTimeout(() => {
    breath.step++;
    if (breath.step >= BREATH_STEPS.length) { breath.step = 0; breath.cycle++; }
    breathRun();
  }, ms);
}
function paintBreath() {
  const c = $("#circle"); if (!c) return;
  void c.offsetWidth; // flush layout so a freshly rendered circle still animates
  c.style.transitionDuration = breath.ms + "ms";
  c.style.transform = `scale(${breath.scale})`;
  c.textContent = breath.label;
  $("#breathCount").textContent = `Cycle ${breath.cycle + 1} of ${BREATH_MODES[breath.mode].cycles}`;
}
function breathStop() { if (breath && breath.timer) clearTimeout(breath.timer); if (breath) breath.timer = null; }
function breathFinish() {
  breathStop();
  dayData(todayKey()).morning.breath = true; save();
  if (navigator.vibrate) navigator.vibrate(200);
  toast("Breathing done");
  render();
}

// ---------- TRIGGER ----------
function renderTrigger() {
  if (!state.startDate) { view.innerHTML = `<div class="card"><p>Start the programme on the Today tab first.</p></div>`; return; }
  const a = state.active;
  if (a) {
    const t = TRIGGER_TYPES[a.type];
    view.innerHTML = `
      <div class="card">
        <span class="tag warn">${t.emoji} ${esc(t.label)}</span>
        <p class="hint" style="margin-top:8px">Time since trigger</p>
        <div class="timer" id="elapsed">${fmtClock(Date.now() - a.start)}</div>
      </div>
      <div class="card">
        <h2>Do this now</h2>
        <ol class="steps">${t.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
        ${t.timeboxMin ? (a.timeboxEnd
          ? `<p>Timebox: <b id="timebox">${fmtClock(a.timeboxEnd - Date.now())}</b> left, then re-engage.</p>`
          : `<button class="btn block" data-action="timebox">Start ${t.timeboxMin}-minute timebox</button>`) : ""}
        <details class="srcs"><summary>Research</summary>${srcList(t.src)}</details>
      </div>
      <div class="card">
        <h2>Name the feeling</h2>
        <p class="hint">Tap any that fit. Naming it lowers its intensity.</p>
        <div class="chips">${EMOTIONS.map(e => `<button class="chip ${a.emotions.includes(e) ? "selected" : ""}" data-action="emotion" data-e="${esc(e)}">${esc(e)}</button>`).join("")}</div>
        <label class="field" style="margin-top:12px"><span>What happened? (optional, a few words)</span>
          <input type="text" id="activeNote" value="${esc(a.note)}" placeholder="e.g. report late again"></label>
      </div>
      <button class="btn calm-btn block" data-action="calm">I'm back to calm</button>
      <p style="text-align:center"><button class="btn" data-action="cancelActive" style="margin-top:10px">Logged by mistake, discard</button></p>`;
    return;
  }
  const today = triggersOn(todayKey());
  view.innerHTML = `
    <div class="card">
      <h2>Feeling triggered?</h2>
      <p class="hint">Tap the moment you notice it. The app guides you and times how long you take to return to calm.</p>
      <div class="trigger-grid">
        ${Object.entries(TRIGGER_TYPES).map(([k, t]) => `<button class="trigger-btn" data-action="trigger" data-type="${k}"><span class="em">${t.emoji}</span>${esc(t.label)}</button>`).join("")}
      </div>
    </div>
    <div class="card">
      <h2>Log one afterwards</h2>
      <p class="hint">Forgot to tap in the moment? Add it here with your best estimate.</p>
      <div class="row">
        <select id="pastType" class="btn">${Object.entries(TRIGGER_TYPES).map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join("")}</select>
        <input type="text" id="pastMin" inputmode="numeric" placeholder="Minutes to calm" style="width:150px">
      </div>
      <input type="text" id="pastNote" placeholder="What happened? (optional)" style="margin-top:8px">
      <button class="btn block" style="margin-top:8px" data-action="logPast">Add</button>
    </div>
    <div class="card">
      <h2>Today (${today.length})</h2>
      ${today.length ? `<ul class="list">${today.slice().reverse().map(t => `
        <li><span>${TRIGGER_TYPES[t.type].emoji} ${esc(t.note || TRIGGER_TYPES[t.type].label)}${t.emotions && t.emotions.length ? ` <span class="src">· ${esc(t.emotions.join(", "))}</span>` : ""}</span>
        <b>${fmtMin(t.minutes)}</b></li>`).join("")}</ul>` : `<p class="hint">Nothing logged yet today.</p>`}
    </div>`;
}

// ---------- NIGHT ----------
function renderNight() {
  if (!state.startDate) { view.innerHTML = `<div class="card"><p>Start the programme on the Today tab first.</p></div>`; return; }
  const k = nightDate || todayKey();
  const n = (state.days[k] && state.days[k].night) || { scores: {} };
  const trig = triggersOn(k);
  const avgRec = avg(trig.map(t => t.minutes));
  view.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content:space-between">
        <h2 style="margin:0">Night log ${nightDone(k) ? "✓" : ""}</h2>
        <input type="date" id="nightDate" value="${k}" min="${state.startDate}" max="${todayKey()}" style="width:auto">
      </div>
      <p class="hint" style="margin-top:8px">${trig.length ? `${trig.length} trigger(s) logged · average recovery ${fmtMin(avgRec)}` : "No triggers logged this day."}</p>
    </div>
    <div class="card">
      <h2>One moment from the day</h2>
      <p class="hint">Pick one interaction that stood out, ideally a tense one.</p>
      <label class="field"><span>What happened (facts only)</span><small>What a camera would have recorded. No interpretation.</small>
        <textarea id="f_fact">${esc(n.fact)}</textarea></label>
      <label class="field"><span>My first assumption</span><small>Your fast, gut read (System 1): what you thought it meant.</small>
        <textarea id="f_assumption">${esc(n.assumption)}</textarea></label>
      <label class="field"><span>Two other possible explanations</span><small>Especially innocent ones. Assuming bad intent fuels anger.</small>
        <input type="text" id="f_alt1" value="${esc(n.alt1)}" placeholder="1." style="margin-bottom:6px">
        <input type="text" id="f_alt2" value="${esc(n.alt2)}" placeholder="2."></label>
      <details class="srcs"><summary>Why this works</summary>${srcList(["kahneman2011", "decastro2002", "ross1977"])}</details>
    </div>
    <div class="card">
      <h2>Rate today (1–5)</h2>
      ${EQ_SCORES.map(s => `
        <label class="field"><span>${esc(s.label)}</span><small>${esc(s.q)}</small>
          <div class="score" data-score="${s.key}">${[1, 2, 3, 4, 5].map(v => `<button type="button" class="${n.scores[s.key] === v ? "selected" : ""}" data-action="score" data-key="${s.key}" data-v="${v}">${v}</button>`).join("")}</div>
        </label>`).join("")}
    </div>
    <div class="card">
      <label class="field"><span>One insight or lesson</span><small>About yourself or someone else. One line is enough.</small>
        <textarea id="f_insight">${esc(n.insight)}</textarea></label>
      <button class="btn primary block" data-action="saveNight">Save night log</button>
      <details class="srcs"><summary>Research</summary>${srcList(["pennebaker1997"])}</details>
    </div>`;
  view.dataset.scores = JSON.stringify(n.scores || {});
}

// ---------- PROGRESS ----------
function renderProgress() {
  if (!state.startDate) { view.innerHTML = `<div class="card"><p>Start the programme on the Today tab first.</p></div>${dataCard()}`; return; }
  const { cycle } = cycleInfo();
  const cStart = cycleStartKey(), tk = todayKey();
  const keys = Array.from({ length: CYCLE }, (_, i) => addDays(cStart, i));
  const statuses = keys.map(dayStatus);
  const completed = statuses.filter(s => s === "full" || s === "partial").length;
  const full = statuses.filter(s => s === "full").length;

  // recovery by day (average minutes)
  const recByDay = keys.map(k => avg(triggersOn(k).map(t => t.minutes)));
  const cycleTrig = state.triggers.filter(t => t.date >= cStart && t.date <= keys[CYCLE - 1]);
  const firstWeek = avg(cycleTrig.filter(t => diffDays(cStart, t.date) < 7).map(t => t.minutes));
  const last7 = avg(cycleTrig.filter(t => diffDays(t.date, tk) < 7).map(t => t.minutes));

  // trigger types
  const counts = Object.keys(TRIGGER_TYPES).map(k => [k, cycleTrig.filter(t => t.type === k).length]);
  const maxC = Math.max(1, ...counts.map(c => c[1]));

  // weekly scores
  const weeks = Array.from({ length: 6 }, (_, w) => {
    const wk = keys.slice(w * 7, w * 7 + 7).map(k => state.days[k] && state.days[k].night).filter(Boolean);
    return EQ_SCORES.map(s => avg(wk.map(n => n.scores && n.scores[s.key]).filter(Boolean)));
  });

  view.innerHTML = `
    <div class="card">
      <h2>Cycle ${cycle}</h2>
      <div class="stats">
        <div class="stat"><b>${streak()}</b><span>Day streak</span></div>
        <div class="stat"><b>${completed}/${CYCLE}</b><span>Days practised</span></div>
        <div class="stat"><b>${full}</b><span>Full days</span></div>
      </div>
    </div>
    <div class="card">
      <h2>41-day grid</h2>
      <p class="hint">Full = morning + night done. One miss is fine; never miss twice.</p>
      <div class="grid41">${keys.map((k, i) => `<div class="cell ${statuses[i]} ${k === tk ? "today" : ""}" title="${k}">${i + 1}</div>`).join("")}</div>
      <div class="legend"><span><i style="background:var(--accent)"></i>Full</span><span><i style="background:var(--accent-soft);border:1px solid var(--accent)"></i>Partial</span><span><i style="background:var(--warn-soft)"></i>Missed</span></div>
    </div>
    <div class="card">
      <h2>Recovery time</h2>
      <p class="hint">Average minutes from trigger to calm. The goal is for this to shrink.</p>
      <div class="stats" style="grid-template-columns:1fr 1fr">
        <div class="stat"><b>${fmtMin(firstWeek)}</b><span>First week</span></div>
        <div class="stat"><b>${fmtMin(last7)}</b><span>Last 7 days</span></div>
      </div>
      ${recoveryChart(recByDay)}
    </div>
    <div class="card">
      <h2>Your triggers this cycle (${cycleTrig.length})</h2>
      ${counts.map(([k, c]) => `<div class="bar-row"><span>${TRIGGER_TYPES[k].emoji} ${esc(TRIGGER_TYPES[k].label)}</span><div class="bar" style="width:${(c / maxC) * 100}%;opacity:${c ? 1 : .15}"></div><b>${c}</b></div>`).join("")}
    </div>
    <div class="card">
      <h2>Self-ratings by week</h2>
      <p class="hint">Average of your nightly 1–5 scores.</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        <tr><th style="text-align:left">Week</th>${EQ_SCORES.map(s => `<th>${esc(s.label)}</th>`).join("")}</tr>
        ${weeks.map((w, i) => `<tr><td>${i + 1}</td>${w.map(v => `<td style="text-align:center">${v == null ? "–" : v.toFixed(1)}</td>`).join("")}</tr>`).join("")}
      </table>
    </div>
    ${dataCard()}
    <div class="card">
      <details class="srcs"><summary>All research sources</summary>${srcList(Object.keys(SOURCES))}</details>
    </div>
    <p class="disclaimer">${esc(CRISIS_TEXT)}</p>`;
}

function recoveryChart(vals) {
  const W = 410, H = 150, pad = 24, bw = (W - pad) / CYCLE;
  const max = Math.max(10, ...vals.filter(v => v != null));
  const bars = vals.map((v, i) => v == null ? "" :
    `<rect x="${pad + i * bw + 1}" y="${H - 16 - (v / max) * (H - 30)}" width="${bw - 2}" height="${(v / max) * (H - 30)}" rx="2" fill="var(--accent)"><title>Day ${i + 1}: ${fmtMin(v)}</title></rect>`).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Recovery minutes per day">
    <line x1="${pad}" y1="${H - 16}" x2="${W}" y2="${H - 16}" stroke="var(--line)"/>
    <text x="0" y="14">${Math.round(max)}m</text><text x="0" y="${H - 16}">0</text>
    ${bars}
    <text x="${pad}" y="${H - 2}">Day 1</text><text x="${W - 30}" y="${H - 2}">Day 41</text>
  </svg>`;
}

function dataCard() {
  return `<div class="card">
    <h2>Your data</h2>
    <p class="hint">Stored only in this browser on this device. Export regularly as a backup.</p>
    <div class="row">
      <button class="btn" data-action="export">Export backup</button>
      <label class="btn">Import backup<input type="file" id="importFile" accept="application/json" hidden></label>
    </div>
    ${state.startDate ? `<label class="field" style="margin-top:12px"><span>Programme start date</span>
      <input type="date" id="startDate" value="${state.startDate}" max="${todayKey()}"></label>` : ""}
    <button class="btn" data-action="reset" style="margin-top:8px;color:var(--warn)">Erase all data</button>
  </div>`;
}

// ---------- routing ----------
function render() {
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  renderHeader();
  ({ today: renderToday, trigger: renderTrigger, night: renderNight, progress: renderProgress })[tab]();
}
function go(t) {
  if (t !== "today") breathStop();
  if (t !== "night") nightDate = null;
  tab = t; render(); window.scrollTo(0, 0);
}

document.querySelector(".tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) go(b.dataset.tab); });
$("#activeBanner").addEventListener("click", () => go("trigger"));

view.addEventListener("click", e => {
  const el = e.target.closest("[data-action]"); if (!el) return;
  const a = el.dataset.action;
  const k = todayKey();
  switch (a) {
    case "start": state.startDate = k; save(); render(); break;
    case "goto": go(el.dataset.tab); break;
    case "breathMode": breath = { mode: el.dataset.mode, timer: null }; render(); break;
    case "breathStart": {
      const mode = breath ? breath.mode : "sigh3";
      breath = { mode, cycle: 0, step: 0, timer: 1 };
      render(); breathRun(); break;
    }
    case "breathStop": breathStop(); render(); break;
    case "focus": {
      const p = phaseFor(cycleInfo().day);
      dayData(k).morning.focus = p.focuses[+el.dataset.i]; save(); render(); break;
    }
    case "trigger":
      state.active = { id: uid(), type: el.dataset.type, start: Date.now(), emotions: [], note: "", timeboxEnd: null };
      save(); render(); break;
    case "emotion": {
      const em = el.dataset.e, list = state.active.emotions;
      state.active.emotions = list.includes(em) ? list.filter(x => x !== em) : [...list, em];
      save(); el.classList.toggle("selected"); break;
    }
    case "timebox":
      state.active.timeboxEnd = Date.now() + TRIGGER_TYPES[state.active.type].timeboxMin * 60000; save(); render(); break;
    case "calm": {
      const act = state.active, end = Date.now();
      state.triggers.push({ id: act.id, type: act.type, date: keyOf(new Date(act.start)), start: act.start, end,
        minutes: Math.round((end - act.start) / 6000) / 10, emotions: act.emotions, note: act.note });
      state.active = null; save(); toast("Logged. Well done coming back."); render(); break;
    }
    case "cancelActive":
      if (confirm("Discard this trigger without logging it?")) { state.active = null; save(); render(); }
      break;
    case "logPast": {
      const min = parseFloat($("#pastMin").value);
      if (!(min >= 0)) { toast("Enter minutes to calm"); return; }
      const now = Date.now();
      state.triggers.push({ id: uid(), type: $("#pastType").value, date: k, start: now - min * 60000, end: now,
        minutes: min, emotions: [], note: $("#pastNote").value.trim(), manual: true });
      save(); toast("Added"); render(); break;
    }
    case "score": {
      const sc = JSON.parse(view.dataset.scores || "{}"); sc[el.dataset.key] = +el.dataset.v;
      view.dataset.scores = JSON.stringify(sc);
      el.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("selected", b === el));
      break;
    }
    case "saveNight": {
      const nk = nightDate || k;
      dayData(nk).night = {
        fact: $("#f_fact").value.trim(), assumption: $("#f_assumption").value.trim(),
        alt1: $("#f_alt1").value.trim(), alt2: $("#f_alt2").value.trim(),
        insight: $("#f_insight").value.trim(), scores: JSON.parse(view.dataset.scores || "{}"), savedAt: Date.now(),
      };
      save(); toast("Night log saved"); render(); break;
    }
    case "export": {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const u = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = u; link.download = `calm-mastery-backup-${k}.json`; link.click(); URL.revokeObjectURL(u); break;
    }
    case "reset":
      if (confirm("Erase ALL your data on this device? This cannot be undone. Export a backup first if you want to keep it.")) {
        state = { version: 1, startDate: null, days: {}, triggers: [], active: null }; save(); go("today");
      }
      break;
  }
});

view.addEventListener("input", e => {
  if (e.target.id === "customFocus") {
    const v = e.target.value.trim(), d = dayData(todayKey());
    d.morning.focus = v || null; save();
    document.querySelectorAll(".choice").forEach(c => c.classList.remove("selected"));
  }
  if (e.target.id === "activeNote" && state.active) { state.active.note = e.target.value; save(); }
});
view.addEventListener("change", e => {
  if (e.target.id === "customFocus") render();
  if (e.target.id === "nightDate" && e.target.value) { nightDate = e.target.value; render(); }
  if (e.target.id === "startDate" && e.target.value) {
    state.startDate = e.target.value; save(); render(); toast("Start date updated");
  }
  if (e.target.id === "importFile" && e.target.files[0]) {
    e.target.files[0].text().then(txt => {
      const s = JSON.parse(txt);
      if (!s || s.version !== 1 || !s.days || !Array.isArray(s.triggers)) throw new Error("bad");
      if (!confirm("Replace the data on this device with this backup?")) return;
      state = s; save(); render(); toast("Backup restored");
    }).catch(() => toast("That file is not a valid backup"));
  }
});

// ---------- live clocks ----------
setInterval(() => {
  const a = state.active; if (!a) return;
  const el = $("#elapsed"); if (el) el.textContent = fmtClock(Date.now() - a.start);
  const bc = $("#bannerClock"); if (bc) bc.textContent = fmtClock(Date.now() - a.start);
  const tb = $("#timebox");
  if (tb && a.timeboxEnd) {
    const left = a.timeboxEnd - Date.now();
    tb.textContent = left > 0 ? fmtClock(left) : "Time's up, re-engage now";
    if (left <= 0 && !a.timeboxAlerted) { a.timeboxAlerted = true; save(); if (navigator.vibrate) navigator.vibrate([300, 150, 300]); }
  }
}, 1000);

// Re-render when the app comes back to the foreground (the date may have changed).
// Only when the date changed, so unsaved typing in the night log is never wiped.
let renderedDate = todayKey();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && todayKey() !== renderedDate && !(breath && breath.timer)) { renderedDate = todayKey(); render(); }
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

render();
