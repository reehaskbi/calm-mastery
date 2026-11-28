// NeuroLens: the full personal system.
// All data stays in this browser's localStorage on this device. Use Progress > Export to back up.

const KEY = "calm-mastery.v1"; // storage key kept from v1 so existing data loads
const CYCLE = 41;

// ---------- storage ----------
function fresh() {
  return {
    version: 2, startDate: null, days: {}, triggers: [], active: null,
    observations: [], people: [], wins: [], reviews: {}, plans: {},
    reminders: { morning: "07:30", night: "21:30" },
    sadhana: { sessions: [], mala: null, settings: {} },
  };
}
// Accepts v1 or v2 data and fills in anything missing. Returns null for anything that isn't a backup.
function migrate(s) {
  if (!s || typeof s !== "object" || !s.days || !Array.isArray(s.triggers)) return null;
  if (s.version !== 1 && s.version !== 2) return null;
  const f = fresh();
  for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
  s.version = 2;
  return s;
}
function load() {
  try { const s = migrate(JSON.parse(localStorage.getItem(KEY))); if (s) return s; } catch (e) { /* fresh state */ }
  return fresh();
}
let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { toast("Couldn't save: storage is full or blocked"); }
}

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
function cycleStartKey(cycle = cycleInfo().cycle) { return addDays(state.startDate, (cycle - 1) * CYCLE); }
function phaseFor(day, cycle) {
  if (cycle >= 2) return SYNTHESIS;
  return PHASES.find(p => day >= p.from && day <= p.to) || PHASES[PHASES.length - 1];
}
function currentPhase() { const { day, cycle } = cycleInfo(); return phaseFor(day, cycle); }
function journeyStage(n) { return JOURNEY.find(j => n >= j.from && n <= j.to) || JOURNEY[JOURNEY.length - 1]; }

function dayData(k) {
  if (!state.days[k]) state.days[k] = { morning: {}, night: null };
  if (!state.days[k].morning) state.days[k].morning = {};
  return state.days[k];
}
function morningDone(k) { const d = state.days[k]; return !!(d && d.morning && d.morning.breath && d.morning.focus); }
function nightDone(k) { const d = state.days[k]; return !!(d && d.night); }
function dayStatus(k) {
  const m = morningDone(k), n = nightDone(k);
  if (m && n) return "full";
  if (m || n || sadhanaOn(k)) return "partial"; // japa, pranayama or meditation also counts as practice
  return k < todayKey() ? "missed" : "future";
}
function streak() {
  let k = todayKey();
  if (dayStatus(k) === "future") k = addDays(k, -1); // today not started yet doesn't break the streak
  let s = 0;
  while (state.startDate && k >= state.startDate && ["full", "partial"].includes(dayStatus(k))) { s++; k = addDays(k, -1); }
  return s;
}
const inRange = (from, to) => x => x.date >= from && x.date <= to;
function triggersOn(k) { return state.triggers.filter(t => t.date === k); }
function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }
function personName(o) {
  const p = o.personId && state.people.find(x => x.id === o.personId);
  return p ? p.name : (o.personName || "Someone");
}
function lastReviewKey() { const ks = Object.keys(state.reviews).sort(); return ks.length ? ks[ks.length - 1] : null; }
function reviewDue() {
  if (dayNumber() < 7) return false;
  const last = lastReviewKey();
  return !last || diffDays(last, todayKey()) >= 7;
}
function readAccuracy(list) {
  const checked = list.filter(o => o.outcome && o.outcome !== "unknown");
  const right = checked.filter(o => o.outcome === "a" || o.outcome === "b").length;
  return { checked: checked.length, right, pct: checked.length ? Math.round((right / checked.length) * 100) : null };
}

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
function fmtDate(k) { return parseKey(k).toLocaleDateString(undefined, { day: "numeric", month: "short" }); }
function srcList(keys) { return keys.map(k => `<p class="src">${esc(SOURCES[k])}</p>`).join(""); }
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 1800);
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }
function download(name, text, type) {
  const blob = new Blob([text], { type });
  const u = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = u; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
const disclaimer = () => `<p class="disclaimer">${esc(CRISIS_TEXT)}</p>`;
const notStarted = () => `<div class="card"><p>Start the programme on the Today tab first.</p><button class="btn primary" data-action="goto" data-tab="today">Go to Today</button></div>`;

// ---------- navigation state ----------
const TABS = ["today", "capture", "sadhana", "night", "library", "progress"];
let tab = "today", captureMode = "trigger", personId = null, nightDate = null;
// App shortcuts open ./#trigger, ./#observe or ./#night
{
  const h = location.hash.slice(1);
  if (h === "trigger" || h === "observe") { tab = "capture"; captureMode = h; }
  else if (TABS.includes(h)) tab = h;
  // #mala, #pranayama, #meditate and #sadhana are read (and cleared) by sadhana.js
  if (location.hash && !["mala", "pranayama", "meditate", "sadhana"].includes(h)) history.replaceState(null, "", location.pathname);
}

// ---------- header ----------
function renderHeader() {
  const b = $("#activeBanner");
  if (!state.startDate) {
    $("#dayLabel").textContent = "Not started"; $("#streakBadge").textContent = "";
    const sb = sadhanaBannerHTML();
    b.hidden = !sb; if (sb) { b.innerHTML = sb; b.dataset.to = "sadhana"; }
    return;
  }
  const { cycle, day, n } = cycleInfo();
  $("#dayLabel").textContent = n < 1 ? `Starts ${state.startDate}` : `Cycle ${cycle} · Day ${day} of ${CYCLE} · ${phaseFor(day, cycle).name}`;
  $("#streakBadge").textContent = `🔥 ${streak()}`;
  if (state.active && !(tab === "capture" && captureMode === "trigger")) {
    b.hidden = false;
    b.innerHTML = `${TRIGGER_TYPES[state.active.type].emoji} Calm-down timer running · <span id="bannerClock">${fmtClock(Date.now() - state.active.start)}</span> · tap to open`;
    b.dataset.to = "trigger";
  } else if (sadhanaBannerHTML()) {
    b.hidden = false; b.innerHTML = sadhanaBannerHTML(); b.dataset.to = "sadhana";
  } else b.hidden = true;
}

// ---------- TODAY ----------
let breath = null; // { mode, cycle, step, timer }
const BREATH_STEPS = [["Inhale", 2000, 0.9], ["Top-up inhale", 1000, 1.0], ["Long exhale", 6000, 0.6]];
const BREATH_MODES = { sigh3: { label: "3 sighs (~30 s)", cycles: 3 }, min1: { label: "1 minute", cycles: 7 }, min5: { label: "5 minutes", cycles: 33 } };

function renderWelcome() {
  view.innerHTML = `
    <div class="card">
      <h2>Welcome</h2>
      <p>This is your personal system for staying calm under pressure, thinking clearly and reading people well. It runs in 41-day cycles over about six months.</p>
      <p><b>Each day takes about 6 minutes:</b></p>
      <ul class="steps">
        <li><b>Morning (2 min):</b> a breathing drill, one focus for the day and your posture.</li>
        <li><b>During the day (15 s):</b> tap <b>Capture</b> when you're triggered, when you handle something well, or when you notice something about someone.</li>
        <li><b>Night (3–4 min):</b> a short log separating what happened from what you assumed.</li>
        <li><b>Sadhana (any time):</b> a 108-bead japa mala counter, guided pranayama (Nadi Shodhana, Bhramari, Sama Vritti) and a meditation timer. Any practice lights up the day.</li>
        <li><b>Once a week (5 min):</b> a review that finds your top triggers and plans your calm response.</li>
      </ul>
      <p>The <b>Library</b> holds the ideas behind it: a body-language cue checklist, the emotional toolkit and the key books.</p>
      <p class="hint">Everything is stored only on this device.</p>
      <button class="btn primary block" data-action="start">Start Day 1 today</button>
    </div>
    ${disclaimer()}`;
}

function renderToday() {
  if (!state.startDate) return renderWelcome();
  const k = todayKey(), { n, day, cycle } = cycleInfo();
  if (n < 1) { view.innerHTML = `<div class="card"><h2>Your programme starts on ${esc(state.startDate)}</h2></div>`; return; }
  const d = dayData(k), p = phaseFor(day, cycle);
  const pr = PRINCIPLES[(n - 1) % PRINCIPLES.length];
  const yesterdayMissed = n > 1 && dayStatus(addDays(k, -1)) === "missed";
  const focusIsCustom = d.morning.focus && !p.focuses.includes(d.morning.focus);
  const showCue = p.stage !== "Internal";
  const plans = Object.entries(state.plans).filter(([t, v]) => v && TRIGGER_TYPES[t]);
  let step = 0;

  view.innerHTML = `
    ${todayHero(k, d, p, day)}
    <h3 class="section-h">Your morning practice</h3>
    ${reviewDue() ? `<div class="card accent-card"><span class="tag">Weekly review due</span>
      <p>Five minutes to find your top two triggers this week and plan your calm response to each.</p>
      <button class="btn primary block" data-action="goto" data-tab="review">Do weekly review</button></div>` : ""}
    ${yesterdayMissed && dayStatus(k) === "future" ? `<div class="card"><span class="tag warn">Never miss twice</span><p>You missed yesterday. That's fine; one miss doesn't break a habit. Just don't let today be the second.</p></div>` : ""}

    <div class="card">
      <span class="tag">Today's principle</span>
      <p class="quote" style="margin-top:8px">${esc(pr.text)}</p>
      <p class="src">${esc(SOURCES[pr.src])}</p>
    </div>

    <div class="card">
      <span class="tag">${esc(p.stage)} · ${esc(p.name)}</span>
      <p style="margin:8px 0 0"><b>This week's drill:</b> ${esc(p.assignment)}</p>
    </div>

    <div class="card ${d.morning.breath ? "done" : ""}">
      <h2>${++step} · Physiological sigh ${d.morning.breath ? "✓" : ""}</h2>
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

    ${sadhanaTodayCard()}

    <div class="card ${d.morning.focus ? "done" : ""}">
      <h2>${++step} · Today's one focus ${d.morning.focus ? "✓" : ""}</h2>
      <p class="hint">Pick one thing to practise all day.</p>
      ${p.focuses.map((f, i) => `<button class="choice ${d.morning.focus === f ? "selected" : ""}" data-action="focus" data-i="${i}">${esc(f)}</button>`).join("")}
      <input type="text" id="customFocus" placeholder="Or write your own…" value="${focusIsCustom ? esc(d.morning.focus) : ""}">
      <details class="srcs"><summary>Make it an if-then plan</summary>
        <p>Turn your focus into "If ___ happens, then I will ___." Plans phrased this way are far more likely to fire in the moment.</p>${srcList(["gollwitzer1999"])}</details>
    </div>

    ${showCue ? `<div class="card ${d.morning.cue ? "done" : ""}">
      <h2>${++step} · One cue to watch for ${d.morning.cue ? "✓" : ""}</h2>
      <p class="hint">Priming your attention on one signal makes you far more likely to spot it.</p>
      <div class="chips">${CUE_GROUPS.flatMap(g => g.cues).map(c => `<button class="chip ${d.morning.cue === c.id ? "selected" : ""}" data-action="cue" data-id="${c.id}">${esc(c.short)}</button>`).join("")}</div>
      ${d.morning.cue && CUES[d.morning.cue] ? `<p class="hint" style="margin:10px 0 0">${esc(CUES[d.morning.cue].meaning)}</p>` : ""}
    </div>` : ""}

    <div class="card ${d.morning.posture ? "done" : ""}">
      <h2>${++step} · Set your posture ${d.morning.posture ? "✓" : ""}</h2>
      <p class="hint">Feet flat, shoulders down and relaxed, chest open, hands visible. Hold it for one slow breath. Come back to it whenever a conversation gets tense.</p>
      <button class="btn ${d.morning.posture ? "" : "primary"} block" data-action="posture">${d.morning.posture ? "Posture set ✓" : "Done, posture set"}</button>
    </div>

    ${plans.length ? `<div class="card"><h2>Your if-then plans</h2><p class="hint">From your weekly review.</p>
      <ul class="list">${plans.map(([t, v]) => `<li><span>${TRIGGER_TYPES[t].emoji} ${esc(v)}</span></li>`).join("")}</ul></div>` : ""}

    <div class="card">
      <h2>Tonight</h2>
      <p class="hint">${nightDone(k) ? "Night log done ✓" : "Spend 3–4 minutes on the night log before bed."}</p>
      <button class="btn block" data-action="goto" data-tab="night">Open night log</button>
    </div>
    ${disclaimer()}`;
  if (breath && breath.timer) paintBreath();
}

// ---------- Home header: greeting, a recommended session, quick actions and two tiles ----------
const ICON = {
  calm: '<path d="M12 20c0-6 2-10 7-13-1 6-3 10-7 13zM12 20c0-5-2-8-6-10 0 5 2 8 6 10z"/>',
  breath: '<path d="M3 9h10a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7"/>',
  meditate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/>',
  mala: '<circle cx="12" cy="5" r="1.6"/><circle cx="17" cy="7.5" r="1.6"/><circle cx="19" cy="12.5" r="1.6"/><circle cx="7" cy="7.5" r="1.6"/><circle cx="5" cy="12.5" r="1.6"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/><path d="M12 19v3"/>',
  night: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5z"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
};
const svgI = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
function todayHero(k, d, p, day) {
  const h = new Date().getHours();
  const greet = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const sd = sadhanaTotals(k, k);
  const rec = !d.morning.breath ? { title: "Release Tension", meta: "1 min · Physiological sigh", act: `data-action="heroBreath"` }
    : !sd.list.length ? { title: "Inner Calm", meta: `${SET().medMin} min · Guided meditation`, act: `data-action="s:medGo"` }
    : h >= 18 && !nightDone(k) ? { title: "Close the Day", meta: "4 min · Night log", act: `data-action="goto" data-tab="night"` }
    : { title: "Hum it Down", meta: "5 rounds · Bhramari breath", act: `data-action="s:bhramari"` };
  const q = [["calm", "Calm", `data-action="goto" data-tab="capture"`], ["breath", "Breath", `data-action="s:open" data-m="pranayama"`],
    ["meditate", "Meditate", `data-action="s:open" data-m="meditation"`], ["mala", "Mala", `data-action="s:open" data-m="mala"`]];
  return `
    <section class="greet">
      <p>${greet},</p>
      <h1>${esc(p.name)}</h1>
      <p class="muted">A calmer mind starts here · Day ${day} of ${CYCLE}</p>
    </section>
    <div class="hero" style="--art:url('art/dawn.svg')">
      <div class="hero-txt">
        <small>Recommended for you</small>
        <h2>${rec.title}</h2>
        <p>${rec.meta}</p>
        <button class="pill" ${rec.act}>${svgI("play")} Start session</button>
      </div>
    </div>
    <div class="quick">${q.map(([ic, l, act], i) => `<button class="q q${i}" ${act}><span>${svgI(ic)}</span>${l}</button>`).join("")}</div>
    <div class="tiles">
      <button class="tile" style="--art:url('art/dusk.svg')" data-action="goto" data-tab="night"><b>Night Log</b><small>4 min · ${nightDone(k) ? "Done ✓" : "Reflect"}</small><i>${svgI("play")}</i></button>
      <button class="tile" style="--art:url('art/dunes.svg')" data-action="s:open" data-m="mala"><b>Japa Mala</b><small>${SET().beadsPerMala} beads · Count</small><i>${svgI("play")}</i></button>
    </div>`;
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
  const c = $("#circle"); if (!c || breath.ms == null) return;
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

// ---------- CAPTURE ----------
function renderCapture() {
  if (!state.startDate) { view.innerHTML = notStarted(); return; }
  const seg = `<div class="seg">${[["trigger", "⚡ Trigger"], ["observe", "👁 Observe"], ["people", "👥 People"]].map(([m, l]) =>
    `<button class="${captureMode === m ? "active" : ""}" data-action="mode" data-m="${m}">${l}</button>`).join("")}</div>`;
  let body;
  if (captureMode === "observe") body = observeHTML();
  else if (captureMode === "people") body = personId ? personHTML() : peopleHTML();
  else body = triggerHTML();
  view.innerHTML = seg + body;
}

function triggerHTML() {
  const a = state.active, k = todayKey();
  if (a) {
    const t = TRIGGER_TYPES[a.type], plan = state.plans[a.type];
    return `
      <div class="card">
        <span class="tag warn">${t.emoji} ${esc(t.label)}</span>
        <p class="hint" style="margin-top:8px">Time since trigger</p>
        <div class="timer" id="elapsed">${fmtClock(Date.now() - a.start)}</div>
      </div>
      ${plan ? `<div class="card accent-card"><span class="tag">Your plan</span><p style="margin:8px 0 0">${esc(plan)}</p></div>` : ""}
      <div class="card">
        <h2>Do this now</h2>
        <ol class="steps">${t.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
        ${t.timeboxMin ? (a.timeboxEnd
          ? `<p>Timebox: <b id="timebox">${fmtClock(a.timeboxEnd - Date.now())}</b> left, then re-engage.</p>`
          : `<button class="btn block" data-action="timebox">Start ${t.timeboxMin}-minute timebox</button>`) : ""}
        <details class="srcs"><summary>Research</summary>${srcList(t.src)}</details>
      </div>
      <div class="card">
        <h2>Hum it down</h2>
        <p class="hint">Five rounds of Bhramari, the humming-bee breath (about a minute). It eases anger and relaxes a tight voice. The timer keeps running.</p>
        <button class="btn block" data-action="s:bhramari">🐝 Start Bhramari now</button>
      </div>
      <div class="card">
        <h2>Name the feeling</h2>
        <p class="hint">Tap any that fit. The more precise the word, the more it helps.</p>
        <div class="chips">${EMOTIONS.map(e => `<button class="chip ${a.emotions.includes(e) ? "selected" : ""}" data-action="emotion" data-e="${esc(e)}">${esc(e)}</button>`).join("")}</div>
        <label class="field" style="margin-top:12px"><span>What happened? (optional, a few words)</span>
          <input type="text" id="activeNote" value="${esc(a.note)}" placeholder="e.g. report late again"></label>
        <label class="field"><span>Unmet expectation (optional)</span><small>"I expected ___ and got ___."</small>
          <input type="text" id="activeExpect" value="${esc(a.expectation)}"></label>
      </div>
      <button class="btn calm-btn block" data-action="calm">I'm back to calm</button>
      <p style="text-align:center"><button class="btn" data-action="cancelActive" style="margin-top:10px">Logged by mistake, discard</button></p>`;
  }
  const today = triggersOn(k), winsToday = state.wins.filter(w => w.date === k);
  return `
    <div class="card">
      <h2>Feeling triggered?</h2>
      <p class="hint">Tap the moment you notice it. The app guides you and times how long you take to return to calm.</p>
      <div class="trigger-grid">
        ${Object.entries(TRIGGER_TYPES).map(([key, t]) => `<button class="trigger-btn" data-action="trigger" data-type="${key}"><span class="em">${t.emoji}</span>${esc(t.label)}</button>`).join("")}
      </div>
    </div>
    <div class="card">
      <h2>Handled something well?</h2>
      <p class="hint">One tap. Noticing your wins strengthens the new habit.</p>
      <div class="win-grid">${Object.entries(WINS).map(([key, w]) => `<button class="win-btn" data-action="win" data-w="${key}"><span>${w.emoji}</span>${esc(w.label)}</button>`).join("")}</div>
      <p class="hint" style="margin:10px 0 0">Wins today: <b>${winsToday.length}</b>${winsToday.length ? ` · <button class="linkbtn" data-action="undoWin">undo last</button>` : ""}</p>
    </div>
    <div class="card">
      <h2>Log a trigger afterwards</h2>
      <p class="hint">Forgot to tap in the moment? Add it with your best estimate.</p>
      <div class="row">
        <select id="pastType" class="btn">${Object.entries(TRIGGER_TYPES).map(([key, t]) => `<option value="${key}">${esc(t.label)}</option>`).join("")}</select>
        <input type="text" id="pastMin" inputmode="decimal" placeholder="Minutes to calm" style="width:150px">
      </div>
      <input type="text" id="pastNote" placeholder="What happened? (optional)" style="margin-top:8px">
      <button class="btn block" style="margin-top:8px" data-action="logPast">Add</button>
    </div>
    <div class="card">
      <h2>Triggers today (${today.length})</h2>
      ${today.length ? `<ul class="list">${today.slice().reverse().map(t => `
        <li><span>${TRIGGER_TYPES[t.type].emoji} ${esc(t.note || TRIGGER_TYPES[t.type].label)}${t.emotions && t.emotions.length ? ` <span class="src">· ${esc(t.emotions.join(", "))}</span>` : ""}</span>
        <span class="nowrap"><b>${fmtMin(t.minutes)}</b> <button class="x" data-action="delTrigger" data-id="${t.id}" aria-label="Delete">×</button></span></li>`).join("")}</ul>` : `<p class="hint">Nothing logged yet today.</p>`}
    </div>`;
}

function observeHTML() {
  const open = state.observations.filter(o => !o.outcome).slice(-8).reverse();
  const recent = state.observations.filter(o => o.outcome).slice(-6).reverse();
  const OUT = { a: "A was right", b: "B was right", other: "Something else", unknown: "Can't tell" };
  return `
    <div class="card">
      <h2>Observe someone</h2>
      <p class="hint">Record what you saw, then two possible meanings. Check later which was right; that feedback is what sharpens your judgement.</p>
      <label class="field"><span>Who</span>
        <select id="o_person" class="btn" style="width:100%">
          <option value="">Someone (not saved as a person)</option>
          ${state.people.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}
          <option value="__new">+ New person…</option>
        </select>
        <input type="text" id="o_newName" placeholder="Their name" style="margin-top:6px" hidden></label>
      <label class="field"><span>Situation</span><input type="text" id="o_context" placeholder="e.g. team meeting about the deadline"></label>
      <label class="field"><span>Compared with their normal</span>
        <div class="chips" data-group="baseline">${["Change from their normal", "Normal for them", "Don't know their normal yet"].map(v =>
          `<button class="chip" data-action="obsPick" data-v="${esc(v)}">${esc(v)}</button>`).join("")}</div></label>
      <label class="field"><span>Cues you noticed</span><small>Tap all that apply. Look for clusters, not single cues.</small></label>
      ${CUE_GROUPS.map(g => `<div class="cue-group"><small>${esc(g.area)}</small><div class="chips">${g.cues.map(c =>
        `<button class="chip" data-action="obsCue" data-id="${c.id}" title="${esc(c.meaning)}">${esc(c.short)}</button>`).join("")}</div></div>`).join("")}
      <label class="field" style="margin-top:12px"><span>What you saw or heard (facts only)</span>
        <textarea id="o_fact" placeholder="What a camera would have recorded"></textarea></label>
      <label class="field"><span>Two possible meanings</span>
        <input type="text" id="o_alt1" placeholder="A." style="margin-bottom:6px">
        <input type="text" id="o_alt2" placeholder="B."></label>
      <label class="field"><span>Prediction (optional)</span><small>What do you think they'll do or say next?</small>
        <input type="text" id="o_predict"></label>
      <button class="btn primary block" data-action="saveObs">Save observation</button>
      <details class="srcs"><summary>Why this works</summary><p>${esc(CUE_CAUTION)}</p>${srcList(["bond2006", "tetlock2015", "kahneman2011"])}</details>
    </div>
    <div class="card">
      <h2>Reads to check (${state.observations.filter(o => !o.outcome).length})</h2>
      <p class="hint">Once you know more, mark which meaning turned out right.</p>
      ${open.length ? open.map(o => `
        <div class="obs">
          <div><b>${esc(personName(o))}</b> <span class="src">· ${fmtDate(o.date)}${o.context ? " · " + esc(o.context) : ""}</span></div>
          ${o.fact ? `<p>${esc(o.fact)}</p>` : ""}
          ${o.cues.length ? `<p class="src">${o.cues.map(c => CUES[c] ? esc(CUES[c].short) : "").join(" · ")}</p>` : ""}
          <p>A. ${esc(o.alt1 || "–")}<br>B. ${esc(o.alt2 || "–")}${o.predict ? `<br><i>Predicted:</i> ${esc(o.predict)}` : ""}</p>
          <div class="row">${Object.entries(OUT).map(([v, l]) => `<button class="chip" data-action="outcome" data-id="${o.id}" data-v="${v}">${l}</button>`).join("")}
            <button class="x" data-action="delObs" data-id="${o.id}" aria-label="Delete">×</button></div>
        </div>`).join("") : `<p class="hint">Nothing waiting to be checked.</p>`}
    </div>
    ${recent.length ? `<div class="card"><h2>Recently checked</h2><ul class="list">${recent.map(o =>
      `<li><span>${esc(personName(o))}: ${esc(o.outcome === "a" ? o.alt1 : o.outcome === "b" ? o.alt2 : (o.fact || o.context || ""))}</span><span class="tag ${o.outcome === "a" || o.outcome === "b" ? "" : "warn"}">${OUT[o.outcome]}</span></li>`).join("")}</ul></div>` : ""}`;
}

function peopleHTML() {
  return `
    <div class="card">
      <h2>People you're learning to read</h2>
      <p class="hint">Keep a short note of each person's normal behaviour (their baseline). Only changes from it tell you something.</p>
      ${state.people.length ? `<ul class="list">${state.people.map(p => {
        const n = state.observations.filter(o => o.personId === p.id).length;
        return `<li class="clickable" data-action="openPerson" data-id="${p.id}"><span><b>${esc(p.name)}</b>${p.rel ? ` <span class="src">· ${esc(p.rel)}</span>` : ""}</span><span class="src">${n} obs. ›</span></li>`;
      }).join("")}</ul>` : `<p class="hint">No one added yet.</p>`}
    </div>
    <div class="card">
      <h2>Add a person</h2>
      <input type="text" id="p_name" placeholder="Name" style="margin-bottom:6px">
      <input type="text" id="p_rel" placeholder="Relationship (e.g. manager, partner, colleague)">
      <button class="btn block" style="margin-top:8px" data-action="addPerson">Add</button>
    </div>`;
}

function personHTML() {
  const p = state.people.find(x => x.id === personId);
  if (!p) { personId = null; return peopleHTML(); }
  const obs = state.observations.filter(o => o.personId === p.id);
  const cueCount = {};
  obs.forEach(o => o.cues.forEach(c => { cueCount[c] = (cueCount[c] || 0) + 1; }));
  const topCues = Object.entries(cueCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const acc = readAccuracy(obs);
  return `
    <button class="btn" data-action="closePerson" style="margin-bottom:12px">‹ All people</button>
    <div class="card">
      <h2>${esc(p.name)}</h2>
      ${p.rel ? `<p class="hint">${esc(p.rel)}</p>` : ""}
      <label class="field"><span>Their normal (baseline)</span><small>Voice, pace, posture, eye contact, usual mood when relaxed.</small>
        <textarea id="pp_baseline">${esc(p.baseline)}</textarea></label>
      <label class="field"><span>What tends to stress or set them off</span>
        <textarea id="pp_triggers">${esc(p.triggers)}</textarea></label>
      <label class="field"><span>What helps with them</span><small>How they like to be approached, what calms things down.</small>
        <textarea id="pp_helps">${esc(p.helps)}</textarea></label>
      <button class="btn primary block" data-action="savePerson">Save notes</button>
    </div>
    <div class="card">
      <h2>Patterns</h2>
      <div class="stats" style="grid-template-columns:1fr 1fr">
        <div class="stat"><b>${obs.length}</b><span>Observations</span></div>
        <div class="stat"><b>${acc.pct == null ? "–" : acc.pct + "%"}</b><span>Reads right (${acc.right}/${acc.checked})</span></div>
      </div>
      ${topCues.length ? `<p class="hint" style="margin:10px 0 4px">Cues you see most often:</p><div class="chips">${topCues.map(([c, n]) =>
        `<span class="chip static">${esc(CUES[c] ? CUES[c].short : c)} × ${n}</span>`).join("")}</div>` : ""}
    </div>
    ${obs.length ? `<div class="card"><h2>History</h2><ul class="list">${obs.slice().reverse().map(o =>
      `<li><span>${fmtDate(o.date)} · ${esc(o.fact || o.context || "(no notes)")}</span></li>`).join("")}</ul></div>` : ""}
    <p style="text-align:center"><button class="btn" data-action="delPerson" style="color:var(--warn)">Remove ${esc(p.name)}</button></p>`;
}

// ---------- NIGHT ----------
let nightPicks = { scores: {} };
function renderNight() {
  if (!state.startDate) { view.innerHTML = notStarted(); return; }
  const k = nightDate || todayKey();
  const n = (state.days[k] && state.days[k].night) || {};
  nightPicks = { scores: { ...(n.scores || {}) }, handled: n.handled || null, driver: n.driver || null };
  const trig = triggersOn(k), wins = state.wins.filter(w => w.date === k), obs = state.observations.filter(o => o.date === k);
  const pick = (g, v) => `<button type="button" class="chip ${nightPicks[g] === v ? "selected" : ""}" data-action="pick" data-g="${g}" data-v="${esc(v)}">${esc(v)}</button>`;
  view.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content:space-between">
        <h2 style="margin:0">Night log ${nightDone(k) ? "✓" : ""}</h2>
        <input type="date" id="nightDate" value="${k}" min="${state.startDate}" max="${todayKey()}" style="width:auto">
      </div>
      <p class="hint" style="margin:8px 0 0">${trig.length} trigger(s)${trig.length ? `, average recovery ${fmtMin(avg(trig.map(t => t.minutes)))}` : ""} · ${wins.length} win(s) · ${obs.length} observation(s)</p>
    </div>
    <div class="card">
      <h2>1 · Someone you observed</h2>
      <p class="hint">One behaviour or gesture you noticed in someone else today.</p>
      ${obs.length ? `<p class="src">From your Observe log: ${obs.map(o => esc(personName(o) + (o.fact ? ": " + o.fact : ""))).join(" · ")}</p>` : ""}
      <label class="field"><span>What happened (facts only)</span><small>What a camera would have recorded. No interpretation.</small>
        <textarea id="f_fact">${esc(n.fact)}</textarea></label>
      <label class="field"><span>My first read (System 1)</span><small>Your fast gut assumption about what it meant.</small>
        <textarea id="f_assumption">${esc(n.assumption)}</textarea></label>
      <label class="field"><span>The evidence and two other explanations (System 2)</span><small>Especially innocent ones. Assuming bad intent fuels anger.</small>
        <input type="text" id="f_alt1" value="${esc(n.alt1)}" placeholder="1." style="margin-bottom:6px">
        <input type="text" id="f_alt2" value="${esc(n.alt2)}" placeholder="2."></label>
      <details class="srcs"><summary>Why this works</summary>${srcList(["kahneman2011", "decastro2002", "ross1977"])}</details>
    </div>
    <div class="card">
      <h2>2 · Your emotional moment</h2>
      <p class="hint">One moment your emotions spiked${trig.length ? ` (you logged: ${trig.map(t => esc(t.note || TRIGGER_TYPES[t.type].label)).join(", ")})` : ""}.</p>
      <label class="field"><span>What happened</span><textarea id="f_spike">${esc(n.spike)}</textarea></label>
      <label class="field"><span>How I handled it</span><div class="chips">${["Calmly", "Partly", "Reacted"].map(v => pick("handled", v)).join("")}</div></label>
      <details class="acc-inline" ${n.why1 ? "open" : ""}><summary><b>Go deeper: Why × 3</b> <span class="src">(optional, 1 min)</span></summary>
        <p class="hint">Why did it bother me? And why does that matter? And why does that? Stop at the core driver.</p>
        <input type="text" id="f_why1" value="${esc(n.why1)}" placeholder="Why 1" style="margin-bottom:6px">
        <input type="text" id="f_why2" value="${esc(n.why2)}" placeholder="Why 2" style="margin-bottom:6px">
        <input type="text" id="f_why3" value="${esc(n.why3)}" placeholder="Why 3">
        <p class="hint" style="margin:10px 0 6px">The core driver was mostly:</p>
        <div class="chips">${DRIVERS.map(v => pick("driver", v)).join("")}</div>
      </details>
    </div>
    <div class="card">
      <h2>3 · Rate today (1–5)</h2>
      ${EQ_SCORES.map(s => `
        <label class="field"><span>${esc(s.label)}</span><small>${esc(s.q)}</small>
          <div class="score">${[1, 2, 3, 4, 5].map(v => `<button type="button" class="${nightPicks.scores[s.key] === v ? "selected" : ""}" data-action="score" data-key="${s.key}" data-v="${v}">${v}</button>`).join("")}</div>
        </label>`).join("")}
    </div>
    <div class="card">
      <label class="field"><span>4 · One insight or lesson</span><small>About yourself or someone else. One line is enough.</small>
        <textarea id="f_insight">${esc(n.insight)}</textarea></label>
      <button class="btn primary block" data-action="saveNight">Save night log</button>
      <details class="srcs"><summary>Research</summary>${srcList(["pennebaker1997"])}</details>
    </div>`;
}

// ---------- LIBRARY ----------
function renderLibrary() {
  const n = state.startDate ? dayNumber() : 0;
  const cur = n > 0 ? journeyStage(n) : null;
  view.innerHTML = `
    <div class="card">
      <h2>Library</h2>
      <p class="hint" style="margin:0">The ideas behind every part of the app, in one place.</p>
    </div>
    <details class="card acc" open><summary>How the system works</summary>
      ${LAYERS.map(l => `<p><b>${esc(l.name)}.</b> ${esc(l.text)}</p>`).join("")}
      <p><b>The daily loop.</b> Morning: breathe, choose one focus, set posture. During the day: capture triggers, wins and observations in seconds. Night: separate fact from story and rate yourself. Weekly: find patterns and plan responses.</p>
    </details>
    <details class="card acc"><summary>Your 6-month journey</summary>
      ${JOURNEY.map(j => `<div class="stage ${cur === j ? "current" : ""}"><b>Days ${j.from}–${j.to === PROGRAMME_DAYS ? "180" : j.to}: ${esc(j.name)}</b>${cur === j ? ` <span class="tag">You are here</span>` : ""}<p>${esc(j.text)}</p></div>`).join("")}
      <p class="hint">${esc(JOURNEY_NOTE)}</p>${srcList(["lally2010"])}
      <p><b>Cycle 1 phases:</b></p>
      <ul class="steps">${PHASES.map(p => `<li><b>Days ${p.from}–${p.to}, ${esc(p.name)}</b> (${esc(p.stage.toLowerCase())}): ${esc(p.assignment)}</li>`).join("")}
        <li><b>Cycles 2+, ${esc(SYNTHESIS.name)}:</b> ${esc(SYNTHESIS.assignment)}</li></ul>
    </details>
    <details class="card acc"><summary>Body-language cue checklist</summary>
      <p class="caution">${esc(CUE_CAUTION)}</p>
      ${CUE_GROUPS.map(g => `<h3>${esc(g.area)}</h3><ul class="steps">${g.cues.map(c => `<li>${esc(c.meaning)}</li>`).join("")}</ul>`).join("")}
      ${srcList(["bond2006"])}
    </details>
    <details class="card acc"><summary>Emotional toolkit</summary>
      ${Object.values(TRIGGER_TYPES).map(t => `<h3>${t.emoji} ${esc(t.label)}</h3><ol class="steps">${t.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>`).join("")}
      <h3>Say it without blame</h3>
      <p>"When I saw <i>[fact]</i>, I felt <i>[feeling]</i>, because I need <i>[need]</i>. Would you be willing to <i>[specific request]</i>?"</p>
      ${srcList(["rosenberg2003", "friedman1974", "samhsa2019"])}
    </details>
    <details class="card acc"><summary>Yoga, pranayama &amp; japa</summary>
      <p>Classical practice trains the same skills as the rest of the programme: slow breathing calms the body, a long humming exhale steadies the voice, and holding one point of attention (a mantra, the breath) is the opposite of being swept along by a trigger.</p>
      <p class="caution">${esc(SADHANA_CAUTION)}</p>
      ${Object.values(PRANAYAMA).map(x => `<h3>${esc(x.name)} <span class="src">· ${esc(x.alt)}</span></h3><p>${esc(x.why)}</p><ol class="steps">${x.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>`).join("")}
      <h3>Meditation</h3>
      ${Object.values(MEDITATION_STYLES).map(m => `<p><b>${esc(m.name)}.</b> ${esc(m.text)}</p>`).join("")}
      <h3>Japa</h3>
      <ul class="steps">${JAPA_NOTES.map(n => `<li>${esc(n)}</li>`).join("")}</ul>
      <h3>Holding a mala</h3>
      <ol class="steps">${MALA_HOW.map(n => `<li>${esc(n)}</li>`).join("")}</ol>
      ${srcList(["cyp", "iyengarLoP", "sutra", "sivananda", "mandlik", "mayo", "nccih2016", "evans", "bernardi2001", "goyal2014", "pramanik2010", "telles2014"])}
      <button class="btn block" data-action="goto" data-tab="sadhana">Open Sadhana</button>
    </details>
    <details class="card acc"><summary>Books</summary>
      ${PILLARS.map(p => `<h3>${p.emoji} ${esc(p.name)}</h3>${p.books.map(b => `
        <div class="book"><b>${esc(b.title)}</b> <span class="src">· ${esc(b.author)}</span>
          <ul>${b.ideas.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
          <p class="src">In the app: ${esc(b.inApp)}</p></div>`).join("")}`).join("")}
    </details>
    <details class="card acc"><summary>All research sources</summary>${srcList(Object.keys(SOURCES))}</details>
    ${disclaimer()}`;
}

// ---------- PROGRESS ----------
function renderProgress() {
  if (!state.startDate) { view.innerHTML = notStarted() + dataCard(); return; }
  const { cycle, n } = cycleInfo();
  const cStart = cycleStartKey(), tk = todayKey();
  const keys = Array.from({ length: CYCLE }, (_, i) => addDays(cStart, i));
  const cEnd = keys[CYCLE - 1];
  const statuses = keys.map(dayStatus);
  const completed = statuses.filter(s => s === "full" || s === "partial").length;
  const full = statuses.filter(s => s === "full").length;
  const stage = journeyStage(n);
  const month = Math.min(6, Math.ceil(n / 30.5));

  const recByDay = keys.map(k => avg(triggersOn(k).map(t => t.minutes)));
  const cycleTrig = state.triggers.filter(inRange(cStart, cEnd));
  const firstWeek = avg(cycleTrig.filter(t => diffDays(cStart, t.date) < 7).map(t => t.minutes));
  const last7 = avg(cycleTrig.filter(t => diffDays(t.date, tk) < 7).map(t => t.minutes));
  const counts = Object.keys(TRIGGER_TYPES).map(k => [k, cycleTrig.filter(t => t.type === k).length]);
  const maxC = Math.max(1, ...counts.map(c => c[1]));
  const cycleWins = state.wins.filter(inRange(cStart, cEnd));
  const winCounts = Object.keys(WINS).map(k => [k, cycleWins.filter(w => w.type === k).length]);
  const maxW = Math.max(1, ...winCounts.map(c => c[1]));
  const acc = readAccuracy(state.observations);
  const cycleObs = state.observations.filter(inRange(cStart, cEnd));

  const weeks = Array.from({ length: 6 }, (_, w) => {
    const wk = keys.slice(w * 7, w * 7 + 7).map(k => state.days[k] && state.days[k].night).filter(Boolean);
    return EQ_SCORES.map(s => avg(wk.map(x => x.scores && x.scores[s.key]).filter(Boolean)));
  });
  const reviews = Object.keys(state.reviews).sort().reverse();

  view.innerHTML = `
    <div class="card">
      <h2>Your journey</h2>
      <p class="hint">Day ${n} of about ${PROGRAMME_DAYS} · Month ${month} of 6 · <b>${esc(stage.name)}</b></p>
      <div class="pbar"><i style="width:${Math.min(100, (n / PROGRAMME_DAYS) * 100)}%"></i></div>
      <p class="hint" style="margin:10px 0 0">${esc(stage.text)}</p>
    </div>
    <div class="card">
      <h2>Cycle ${cycle}</h2>
      <div class="stats">
        <div class="stat"><b>${streak()}</b><span>Day streak</span></div>
        <div class="stat"><b>${completed}/${CYCLE}</b><span>Days practised</span></div>
        <div class="stat"><b>${full}</b><span>Full days</span></div>
      </div>
      <div class="grid41" style="margin-top:12px">${keys.map((k, i) => `<div class="cell ${statuses[i]} ${k === tk ? "today" : ""} ${sadhanaOn(k) ? "lotus" : ""}" title="${k}">${i + 1}</div>`).join("")}</div>
      <div class="legend"><span><i style="background:var(--accent)"></i>Full (morning + night)</span><span><i style="background:var(--accent-soft);border:1px solid var(--accent)"></i>Partial</span><span><i style="background:var(--warn-soft)"></i>Missed</span><span><i class="lg-dot"></i>Sadhana done</span></div>
    </div>
    ${sadhanaProgressCard(keys)}
    <div class="card">
      <h2>Recovery time</h2>
      <p class="hint">Average minutes from trigger to calm. Goal: under 10 minutes.</p>
      <div class="stats" style="grid-template-columns:1fr 1fr">
        <div class="stat"><b>${fmtMin(firstWeek)}</b><span>First week of cycle</span></div>
        <div class="stat"><b>${fmtMin(last7)}</b><span>Last 7 days</span></div>
      </div>
      ${recoveryChart(recByDay)}
    </div>
    <div class="card">
      <h2>Triggers this cycle (${cycleTrig.length})</h2>
      ${counts.map(([k, c]) => `<div class="bar-row"><span>${TRIGGER_TYPES[k].emoji} ${esc(TRIGGER_TYPES[k].label)}</span><div class="bar" style="width:${(c / maxC) * 100}%;opacity:${c ? 1 : .15}"></div><b>${c}</b></div>`).join("")}
    </div>
    <div class="card">
      <h2>Wins this cycle (${cycleWins.length})</h2>
      ${winCounts.map(([k, c]) => `<div class="bar-row"><span>${WINS[k].emoji} ${esc(WINS[k].label)}</span><div class="bar good" style="width:${(c / maxW) * 100}%;opacity:${c ? 1 : .15}"></div><b>${c}</b></div>`).join("")}
    </div>
    <div class="card">
      <h2>Reading people</h2>
      <div class="stats">
        <div class="stat"><b>${cycleObs.length}</b><span>Observations this cycle</span></div>
        <div class="stat"><b>${state.people.length}</b><span>People tracked</span></div>
        <div class="stat"><b>${acc.pct == null ? "–" : acc.pct + "%"}</b><span>Reads right (${acc.right}/${acc.checked})</span></div>
      </div>
      <p class="hint" style="margin:10px 0 0">Mark your reads as right or wrong in Capture › Observe. The goal isn't 100%; it's knowing how much to trust your gut.</p>
    </div>
    <div class="card">
      <h2>Self-ratings by week</h2>
      <p class="hint">Average of your nightly 1–5 scores.</p>
      <div class="table-wrap"><table class="ratings">
        <tr><th>Wk</th>${EQ_SCORES.map(s => `<th>${esc(s.label)}</th>`).join("")}</tr>
        ${weeks.map((w, i) => `<tr><td>${i + 1}</td>${w.map(v => `<td>${v == null ? "–" : v.toFixed(1)}</td>`).join("")}</tr>`).join("")}
      </table></div>
    </div>
    <div class="card">
      <h2>Weekly reviews</h2>
      ${reviews.length ? `<ul class="list">${reviews.map(r => `<li class="clickable" data-action="openReview" data-k="${r}"><span>Week ending ${fmtDate(r)}</span><span class="src">view ›</span></li>`).join("")}</ul>` : `<p class="hint">Your first review becomes available after 7 days.</p>`}
      <button class="btn block" style="margin-top:8px" data-action="goto" data-tab="review">${reviewDue() ? "Do this week's review" : "Do a review now"}</button>
    </div>
    ${cycle > 1 ? cyclesCard(cycle) : ""}
    ${remindersCard()}
    ${dataCard()}
    ${disclaimer()}`;
}

function cyclesCard(current) {
  const rows = Array.from({ length: current }, (_, i) => {
    const c = i + 1, s = cycleStartKey(c), e = addDays(s, CYCLE - 1);
    const ks = Array.from({ length: CYCLE }, (_, j) => addDays(s, j)).filter(k => k <= todayKey());
    const done = ks.filter(k => ["full", "partial"].includes(dayStatus(k))).length;
    const tr = state.triggers.filter(inRange(s, e));
    return `<tr><td>${c}</td><td>${done}/${CYCLE}</td><td>${tr.length}</td><td>${fmtMin(avg(tr.map(t => t.minutes)))}</td><td>${state.wins.filter(inRange(s, e)).length}</td></tr>`;
  }).join("");
  return `<div class="card"><h2>All cycles</h2><div class="table-wrap"><table class="ratings">
    <tr><th>Cycle</th><th>Days</th><th>Triggers</th><th>Recovery</th><th>Wins</th></tr>${rows}</table></div></div>`;
}

function recoveryChart(vals) {
  const W = 410, H = 150, pad = 24, bw = (W - pad) / CYCLE;
  const max = Math.max(15, ...vals.filter(v => v != null));
  const y = v => H - 16 - (v / max) * (H - 30);
  const bars = vals.map((v, i) => v == null ? "" :
    `<rect x="${pad + i * bw + 1}" y="${y(v)}" width="${bw - 2}" height="${(v / max) * (H - 30)}" rx="2" fill="${v <= 10 ? "var(--good)" : "var(--accent)"}"><title>Day ${i + 1}: ${fmtMin(v)}</title></rect>`).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Recovery minutes per day">
    <line x1="${pad}" y1="${H - 16}" x2="${W}" y2="${H - 16}" stroke="var(--line)"/>
    <line x1="${pad}" y1="${y(10)}" x2="${W}" y2="${y(10)}" stroke="var(--good)" stroke-dasharray="4 4"/>
    <text x="0" y="14">${Math.round(max)}m</text><text x="0" y="${y(10) + 3}">10m</text><text x="0" y="${H - 16}">0</text>
    ${bars}
    <text x="${pad}" y="${H - 2}">Day 1</text><text x="${W - 30}" y="${H - 2}">Day 41</text>
  </svg>`;
}

function remindersCard() {
  const r = state.reminders;
  return `<div class="card">
    <h2>Daily reminders</h2>
    <p class="hint">Adds a morning and a night reminder to your phone's calendar for the next 6 months. Open the downloaded file and choose your calendar app.</p>
    <div class="row">
      <label class="field" style="flex:1"><span>Morning</span><input type="time" id="remMorning" value="${esc(r.morning)}"></label>
      <label class="field" style="flex:1"><span>Night</span><input type="time" id="remNight" value="${esc(r.night)}"></label>
    </div>
    <button class="btn block" data-action="reminders">Download calendar reminders</button>
  </div>`;
}

function icsText(morning, night) {
  const start = todayKey().replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const link = location.href.split("#")[0];
  const icsEsc = s => s.replace(/[\\,;]/g, m => "\\" + m);
  const ev = (id, time, title, desc) => [
    "BEGIN:VEVENT", `UID:${id}-${start}@neurolens`, `DTSTAMP:${stamp}`,
    `DTSTART:${start}T${time.replace(":", "")}00`, "DURATION:PT5M", "RRULE:FREQ=DAILY;COUNT=183",
    `SUMMARY:${icsEsc(title)}`, `DESCRIPTION:${icsEsc(desc + " " + link)}`, `URL:${link}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(title)}`, "TRIGGER:PT0M", "END:VALARM", "END:VEVENT",
  ].join("\r\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NeuroLens//EN", "CALSCALE:GREGORIAN",
    ev("morning", morning, "NeuroLens: morning (2 min)", "Breathe. Pick one focus. Set your posture."),
    ev("night", night, "NeuroLens: night log (4 min)", "Fact vs. story. Rate your day. One insight."),
    "END:VCALENDAR", ""].join("\r\n");
}

function dataCard() {
  return `<div class="card">
    <h2>Your data</h2>
    <p class="hint">Stored only in this browser on this device. Export regularly as a backup.</p>
    <div class="row">
      <button class="btn" data-action="export">Export backup</button>
      <label class="btn">Import backup<input type="file" id="importFile" accept="application/json,.json" hidden></label>
    </div>
    ${state.startDate ? `<label class="field" style="margin-top:12px"><span>Programme start date</span>
      <input type="date" id="startDate" value="${state.startDate}" max="${todayKey()}"></label>` : ""}
    <button class="btn" data-action="reset" style="margin-top:8px;color:var(--warn)">Erase all data</button>
  </div>`;
}

// ---------- WEEKLY REVIEW ----------
let reviewKey = null; // when set, show a saved review read-only
function weekSummary(end) {
  const from = addDays(end, -6), pFrom = addDays(end, -13), pTo = addDays(end, -7);
  const tr = state.triggers.filter(inRange(from, end)), ptr = state.triggers.filter(inRange(pFrom, pTo));
  const byType = Object.keys(TRIGGER_TYPES).map(t => [t, tr.filter(x => x.type === t)]).filter(x => x[1].length).sort((a, b) => b[1].length - a[1].length);
  const emo = {};
  tr.forEach(t => (t.emotions || []).forEach(e => { emo[e] = (emo[e] || 0) + 1; }));
  const nights = Array.from({ length: 7 }, (_, i) => addDays(from, i)).map(k => state.days[k] && state.days[k].night).filter(Boolean);
  const pnights = Array.from({ length: 7 }, (_, i) => addDays(pFrom, i)).map(k => state.days[k] && state.days[k].night).filter(Boolean);
  const scoreAvg = list => Object.fromEntries(EQ_SCORES.map(s => [s.key, avg(list.map(x => x.scores && x.scores[s.key]).filter(Boolean))]));
  const drivers = {};
  nights.forEach(x => { if (x.driver) drivers[x.driver] = (drivers[x.driver] || 0) + 1; });
  return {
    from, end,
    practised: Array.from({ length: 7 }, (_, i) => addDays(from, i)).filter(k => k >= state.startDate && ["full", "partial"].includes(dayStatus(k))).length,
    triggers: tr.length, prevTriggers: ptr.length,
    recovery: avg(tr.map(t => t.minutes)), prevRecovery: avg(ptr.map(t => t.minutes)),
    top: byType.slice(0, 2).map(([t, l]) => ({ type: t, count: l.length })),
    emotions: Object.entries(emo).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]),
    drivers: Object.entries(drivers).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]),
    wins: state.wins.filter(inRange(from, end)).length,
    observations: state.observations.filter(inRange(from, end)).length,
    sadhanaDays: Array.from({ length: 7 }, (_, i) => addDays(from, i)).filter(sadhanaOn).length,
    scores: scoreAvg(nights), prevScores: scoreAvg(pnights),
    insights: nights.map(x => x.insight).filter(Boolean),
  };
}
function trend(a, b, lowerIsBetter) {
  if (a == null || b == null || a === b) return "";
  const better = lowerIsBetter ? a < b : a > b;
  return ` <span class="${better ? "up" : "down"}">${a < b ? "↓" : "↑"}</span>`;
}
function summaryHTML(s) {
  return `
    <div class="stats">
      <div class="stat"><b>${s.practised}/7</b><span>Days practised</span></div>
      <div class="stat"><b>${s.triggers}${trend(s.triggers, s.prevTriggers, true)}</b><span>Triggers (prev ${s.prevTriggers})</span></div>
      <div class="stat"><b>${fmtMin(s.recovery)}${trend(s.recovery, s.prevRecovery, true)}</b><span>Avg recovery</span></div>
    </div>
    <div class="stats" style="margin-top:8px">
      <div class="stat"><b>${s.wins}</b><span>Wins</span></div>
      <div class="stat"><b>${s.observations}</b><span>Observations</span></div>
      <div class="stat"><b>${s.top.length ? TRIGGER_TYPES[s.top[0].type].emoji : "–"}</b><span>Top trigger</span></div>
    </div>
    <table class="ratings" style="margin-top:10px"><tr>${EQ_SCORES.map(x => `<th>${esc(x.label)}</th>`).join("")}</tr>
      <tr>${EQ_SCORES.map(x => `<td>${s.scores[x.key] == null ? "–" : s.scores[x.key].toFixed(1)}${trend(s.scores[x.key], s.prevScores[x.key], false)}</td>`).join("")}</tr></table>
    ${s.sadhanaDays != null ? `<p class="hint" style="margin:10px 0 0">🪷 Sadhana on <b>${s.sadhanaDays}/7</b> days</p>` : ""}
    ${s.emotions.length ? `<p class="hint" style="margin:10px 0 0">Feelings you named most: <b>${esc(s.emotions.join(", "))}</b></p>` : ""}
    ${s.drivers.length ? `<p class="hint" style="margin:4px 0 0">Core drivers: <b>${esc(s.drivers.join(", "))}</b></p>` : ""}
    ${s.insights.length ? `<p class="hint" style="margin:10px 0 4px">Your insights this week:</p><ul class="steps">${s.insights.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}`;
}

function renderReview() {
  if (!state.startDate) { view.innerHTML = notStarted(); return; }
  if (reviewKey && state.reviews[reviewKey]) {
    const r = state.reviews[reviewKey];
    view.innerHTML = `
      <button class="btn" data-action="goto" data-tab="progress" style="margin-bottom:12px">‹ Progress</button>
      <div class="card"><h2>Week ending ${fmtDate(reviewKey)}</h2>${summaryHTML(r.summary)}</div>
      <div class="card">
        ${r.self ? `<p><b>Pattern in myself:</b> ${esc(r.self)}</p>` : ""}
        ${r.others ? `<p><b>Pattern in others:</b> ${esc(r.others)}</p>` : ""}
        ${Object.entries(r.plans || {}).map(([t, v]) => `<p><b>${TRIGGER_TYPES[t] ? TRIGGER_TYPES[t].emoji + " " + esc(TRIGGER_TYPES[t].label) : esc(t)} plan:</b> ${esc(v)}</p>`).join("")}
        ${r.next ? `<p><b>Focus for the next week:</b> ${esc(r.next)}</p>` : ""}
      </div>`;
    return;
  }
  const tk = todayKey(), s = weekSummary(tk), last = lastReviewKey(), prev = last && state.reviews[last];
  const planTypes = s.top.length ? s.top.map(t => t.type) : ["urgency", "voice"];
  view.innerHTML = `
    <button class="btn" data-action="goto" data-tab="progress" style="margin-bottom:12px">‹ Progress</button>
    <div class="card">
      <h2>Weekly review</h2>
      <p class="hint">${fmtDate(s.from)} – ${fmtDate(s.end)}. About 5 minutes.</p>
      ${summaryHTML(s)}
    </div>
    ${prev && prev.next ? `<div class="card"><span class="tag">Last week you planned</span><p style="margin:8px 0 0">${esc(prev.next)}</p></div>` : ""}
    <div class="card">
      <h2>Patterns</h2>
      <label class="field"><span>What pattern do you notice in yourself?</span><small>When, with whom, and about what do you get triggered?</small>
        <textarea id="r_self"></textarea></label>
      <label class="field"><span>What pattern do you notice in others?</span><small>Anything you've learned about how people around you react.</small>
        <textarea id="r_others"></textarea></label>
    </div>
    <div class="card">
      <h2>Plan your calm response</h2>
      <p class="hint">${s.top.length ? "Your top triggers this week." : "No triggers logged this week; plan for the two most common ones."} Write one if-then plan for each. It will show on Today and inside the Trigger flow.</p>
      ${planTypes.map(t => `<label class="field"><span>${TRIGGER_TYPES[t].emoji} ${esc(TRIGGER_TYPES[t].label)}${s.top.find(x => x.type === t) ? ` (${s.top.find(x => x.type === t).count}×)` : ""}</span>
        <input type="text" id="plan_${t}" data-plan="${t}" value="${esc(state.plans[t])}" placeholder="If I notice ___, then I will ___."></label>`).join("")}
      ${srcList(["gollwitzer1999"])}
    </div>
    <div class="card">
      <label class="field"><span>Next week I will focus on…</span><input type="text" id="r_next"></label>
      <button class="btn primary block" data-action="saveReview">Save review</button>
    </div>`;
}

// ---------- routing ----------
function render() {
  const navTab = tab === "review" ? "progress" : tab;
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === navTab));
  renderHeader();
  ({ today: renderToday, capture: renderCapture, sadhana: renderSadhana, night: renderNight, library: renderLibrary, progress: renderProgress, review: renderReview })[tab]();
}
function go(t) {
  if (t !== "today") breathStop();
  if (t !== "sadhana") sadhanaLeave();
  if (t !== "night") nightDate = null;
  if (t !== "review") reviewKey = null;
  tab = t; render(); window.scrollTo(0, 0);
}

document.querySelector(".tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) go(b.dataset.tab); });
$("#activeBanner").addEventListener("click", e => {
  if (e.currentTarget.dataset.to === "sadhana") { sMode = "meditation"; go("sadhana"); return; }
  captureMode = "trigger"; go("capture");
});

view.addEventListener("click", e => {
  const el = e.target.closest("[data-action]"); if (!el) return;
  const a = el.dataset.action;
  const k = todayKey();
  switch (a) {
    case "start": state.startDate = k; save(); render(); break;
    case "goto": go(el.dataset.tab); break;

    // Today
    case "breathMode": breath = { mode: el.dataset.mode, timer: null }; render(); break;
    case "breathStart": {
      const mode = breath ? breath.mode : "sigh3";
      breath = { mode, cycle: 0, step: 0, timer: 1 };
      render(); breathRun(); break;
    }
    case "breathStop": breathStop(); render(); break;
    case "heroBreath": {
      breath = { mode: "sigh3", cycle: 0, step: 0, timer: 1 };
      render(); breathRun();
      const c = $("#circle"); if (c) c.scrollIntoView({ behavior: "smooth", block: "center" });
      break;
    }
    case "focus": dayData(k).morning.focus = currentPhase().focuses[+el.dataset.i]; save(); render(); break;
    case "cue": {
      const m = dayData(k).morning;
      m.cue = m.cue === el.dataset.id ? null : el.dataset.id; save(); render(); break;
    }
    case "posture": dayData(k).morning.posture = !dayData(k).morning.posture; save(); render(); break;

    // Capture: trigger
    case "mode": captureMode = el.dataset.m; personId = null; render(); window.scrollTo(0, 0); break;
    case "trigger":
      state.active = { id: uid(), type: el.dataset.type, start: Date.now(), emotions: [], note: "", expectation: "", timeboxEnd: null };
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
        minutes: Math.round((end - act.start) / 6000) / 10, emotions: act.emotions, note: act.note, expectation: act.expectation || "" });
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
        minutes: min, emotions: [], note: val("pastNote"), manual: true });
      save(); toast("Added"); render(); break;
    }
    case "delTrigger":
      if (confirm("Delete this trigger entry?")) { state.triggers = state.triggers.filter(t => t.id !== el.dataset.id); save(); render(); }
      break;
    case "win":
      state.wins.push({ id: uid(), type: el.dataset.w, date: k, at: Date.now() });
      save(); if (navigator.vibrate) navigator.vibrate(60); toast(`${WINS[el.dataset.w].emoji} Nice. Logged.`); render(); break;
    case "undoWin": {
      const i = state.wins.map(w => w.date).lastIndexOf(k);
      if (i >= 0) { state.wins.splice(i, 1); save(); render(); }
      break;
    }

    // Capture: observe
    case "obsPick":
      el.parentElement.querySelectorAll(".chip").forEach(c => c.classList.toggle("selected", c === el && !c.classList.contains("selected")));
      break;
    case "obsCue": el.classList.toggle("selected"); break;
    case "saveObs": {
      let pid = $("#o_person").value, pname = "";
      if (pid === "__new") {
        pname = val("o_newName");
        if (!pname) { toast("Enter their name"); return; }
        pid = uid(); state.people.push({ id: pid, name: pname, rel: "", baseline: "", triggers: "", helps: "" });
      }
      const baselineEl = view.querySelector('[data-group="baseline"] .chip.selected');
      const cues = [...view.querySelectorAll('[data-action="obsCue"].selected')].map(c => c.dataset.id);
      const o = { id: uid(), date: k, at: Date.now(), personId: pid || null, personName: pname, context: val("o_context"),
        baseline: baselineEl ? baselineEl.dataset.v : "", cues, fact: val("o_fact"), alt1: val("o_alt1"), alt2: val("o_alt2"),
        predict: val("o_predict"), outcome: null };
      if (!o.fact && !cues.length && !o.context) { toast("Add what you saw or tap a cue"); return; }
      state.observations.push(o); save(); toast("Observation saved"); render(); window.scrollTo(0, 0); break;
    }
    case "outcome": {
      const o = state.observations.find(x => x.id === el.dataset.id);
      if (o) { o.outcome = el.dataset.v; o.checkedAt = Date.now(); save(); toast("Checked"); render(); }
      break;
    }
    case "delObs":
      if (confirm("Delete this observation?")) { state.observations = state.observations.filter(o => o.id !== el.dataset.id); save(); render(); }
      break;

    // Capture: people
    case "addPerson": {
      const name = val("p_name");
      if (!name) { toast("Enter a name"); return; }
      state.people.push({ id: uid(), name, rel: val("p_rel"), baseline: "", triggers: "", helps: "" });
      save(); render(); break;
    }
    case "openPerson": personId = el.dataset.id; render(); window.scrollTo(0, 0); break;
    case "closePerson": personId = null; render(); break;
    case "savePerson": {
      const p = state.people.find(x => x.id === personId);
      if (p) { p.baseline = val("pp_baseline"); p.triggers = val("pp_triggers"); p.helps = val("pp_helps"); save(); toast("Saved"); }
      break;
    }
    case "delPerson": {
      const p = state.people.find(x => x.id === personId);
      if (p && confirm(`Remove ${p.name}? Their observations stay in your log.`)) {
        state.observations.forEach(o => { if (o.personId === p.id) { o.personName = p.name; o.personId = null; } });
        state.people = state.people.filter(x => x.id !== p.id); personId = null; save(); render();
      }
      break;
    }

    // Night
    case "score":
      nightPicks.scores[el.dataset.key] = +el.dataset.v;
      el.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("selected", b === el));
      break;
    case "pick": {
      const g = el.dataset.g, on = nightPicks[g] !== el.dataset.v;
      nightPicks[g] = on ? el.dataset.v : null;
      el.parentElement.querySelectorAll(".chip").forEach(c => c.classList.toggle("selected", on && c === el));
      break;
    }
    case "saveNight": {
      const nk = nightDate || k;
      dayData(nk).night = {
        fact: val("f_fact"), assumption: val("f_assumption"), alt1: val("f_alt1"), alt2: val("f_alt2"),
        spike: val("f_spike"), handled: nightPicks.handled, why1: val("f_why1"), why2: val("f_why2"), why3: val("f_why3"),
        driver: nightPicks.driver, insight: val("f_insight"), scores: { ...nightPicks.scores }, savedAt: Date.now(),
      };
      save(); toast("Night log saved"); render(); break;
    }

    // Progress & review
    case "openReview": reviewKey = el.dataset.k; tab = "review"; render(); window.scrollTo(0, 0); break;
    case "saveReview": {
      const plans = {};
      view.querySelectorAll("[data-plan]").forEach(i => { const v = i.value.trim(); if (v) { plans[i.dataset.plan] = v; state.plans[i.dataset.plan] = v; } });
      state.reviews[k] = { summary: weekSummary(k), self: val("r_self"), others: val("r_others"), next: val("r_next"), plans, savedAt: Date.now() };
      save(); toast("Review saved"); go("progress"); break;
    }
    case "reminders": {
      const m = $("#remMorning").value || "07:30", n = $("#remNight").value || "21:30";
      state.reminders = { morning: m, night: n }; save();
      download("neurolens-reminders.ics", icsText(m, n), "text/calendar");
      toast("Open the file to add it to your calendar"); break;
    }
    case "export":
      download(`neurolens-backup-${k}.json`, JSON.stringify(state, null, 2), "application/json"); break;
    case "reset":
      if (confirm("Erase ALL your data on this device? This cannot be undone. Export a backup first if you want to keep it.")) {
        state = fresh(); save(); go("today");
      }
      break;
  }
});

view.addEventListener("input", e => {
  const id = e.target.id;
  if (id === "customFocus") {
    const v = e.target.value.trim(), d = dayData(todayKey());
    d.morning.focus = v || null; save();
    document.querySelectorAll(".choice").forEach(c => c.classList.remove("selected"));
  }
  if (id === "activeNote" && state.active) { state.active.note = e.target.value; save(); }
  if (id === "activeExpect" && state.active) { state.active.expectation = e.target.value; save(); }
});
view.addEventListener("change", e => {
  const id = e.target.id;
  if (id === "customFocus") render();
  if (id === "o_person") { const n = $("#o_newName"); n.hidden = e.target.value !== "__new"; if (!n.hidden) n.focus(); }
  if (id === "nightDate" && e.target.value) { nightDate = e.target.value; render(); }
  if (id === "startDate" && e.target.value) { state.startDate = e.target.value; save(); render(); toast("Start date updated"); }
  if (id === "importFile" && e.target.files[0]) {
    e.target.files[0].text().then(txt => {
      const s = migrate(JSON.parse(txt));
      if (!s) throw new Error("bad");
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
// Only when the date changed, so unsaved typing is never wiped.
let renderedDate = todayKey();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && todayKey() !== renderedDate && !(breath && breath.timer) && !sadhanaBusy()) { renderedDate = todayKey(); render(); }
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
// The first render() runs at the end of sadhana.js, which loads after this file.
