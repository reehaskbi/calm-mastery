// NeuroLens Sadhana: japa mala counter, pranayama pacer and meditation timer.
// Loaded after app.js and uses its globals (state, save, view, render, go, esc, toast, dates...).
// Works the same on iPhone, Android and desktop: sound via Web Audio, touch feedback via
// navigator.vibrate (Android) or the iOS switch-haptic, Screen Wake Lock, keyboard and earbud buttons.

// ---------- settings & storage ----------
const S_DEFAULTS = {
  beadsPerMala: 108, malaGoal: 1, mantra: "", malaView: "strand", beadType: "rudraksha", beadSound: "wood", paceGuard: 0, sound: true, haptic: true, silentOk: true, earbud: false, showCount: true,
  pTech: "nadi", pRatio: {}, pRounds: {}, gentle: false, pSound: true,
  medMin: 10, medBell: 5, medStyle: "breath",
};
function sd() {
  if (!state.sadhana || typeof state.sadhana !== "object") state.sadhana = { sessions: [], mala: null, settings: {} };
  const s = state.sadhana;
  if (!Array.isArray(s.sessions)) s.sessions = [];
  if (!s.settings) s.settings = {};
  if (s.settings.beadSound === undefined && s.settings.sound === false) s.settings.beadSound = "silent"; // older "sound off"
  if (s.settings.beadSound === "om") s.settings.beadSound = "wood"; // the Om sound was removed
  for (const k of Object.keys(S_DEFAULTS)) if (s.settings[k] === undefined) s.settings[k] = JSON.parse(JSON.stringify(S_DEFAULTS[k]));
  return s;
}
const SET = () => sd().settings;
const sessionsOn = k => sd().sessions.filter(x => x.date === k);
function sadhanaOn(k) { return !!(state.sadhana && Array.isArray(state.sadhana.sessions) && state.sadhana.sessions.some(x => x.date === k)); }
const KIND = { japa: { emoji: "📿", label: "Japa" }, pranayama: { emoji: "🌬", label: "Pranayama" }, meditation: { emoji: "🪷", label: "Meditation" } };
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Writing all of localStorage on every bead is wasteful; batch it.
let saveSoonT = null;
function saveSoon() { if (!saveSoonT) saveSoonT = setTimeout(() => { saveSoonT = null; save(); }, 700); }
function flushSave() { if (saveSoonT) { clearTimeout(saveSoonT); saveSoonT = null; save(); } }
window.addEventListener("pagehide", flushSave);
document.addEventListener("visibilitychange", () => { if (document.hidden) flushSave(); });

// ---------- sound (Web Audio, synthesised: no files to download) ----------
const BEAD_TYPES = { rudraksha: "Rudraksha", sandalwood: "Sandalwood", tulsi: "Tulsi", crystal: "Crystal" };
// Each bead "clack" = a filtered noise transient plus a few short resonant modes, tuned per material.
// [frequency Hz, level, decay s]; noise = [band centre, Q, level]; body = low thump Hz (0 = none).
const BEAD_SOUND = {
  rudraksha: { modes: [[780, .5, .045], [1710, .3, .03], [2650, .15, .02]], noise: [1400, 1.5, .5], body: 210 },
  sandalwood: { modes: [[620, .45, .05], [1420, .25, .035], [2350, .1, .02]], noise: [1100, 1.2, .35], body: 180 },
  tulsi: { modes: [[1050, .4, .03], [2300, .25, .02], [3600, .1, .015]], noise: [2200, 2, .4], body: 260 },
  crystal: { modes: [[2300, .25, .22], [4150, .15, .16], [6400, .08, .1]], noise: [5000, 3, .25], body: 0 },
};
const Snd = {
  ctx: null, noise: null, out: null,
  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    // iOS: "playback" keeps sounds audible with the silent switch on (it pauses other audio); "ambient" respects it.
    try { if (navigator.audioSession) navigator.audioSession.type = SET().silentOk ? "playback" : "ambient"; } catch (e) { /* older Safari */ }
    if (!this.ctx) {
      this.ctx = new AC();
      this.out = this.ctx.createGain(); this.out.gain.value = 0.9; this.out.connect(this.ctx.destination);
      const n = Math.floor(this.ctx.sampleRate * 0.05), b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      this.noise = b;
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  tone(freq, start, dur, peak, type = "sine", glideTo = null) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, start);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + Math.min(dur, 0.35));
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(this.out); o.start(start); o.stop(start + dur + 0.05);
  },
  // One bead meeting its neighbour: a main knock, then a softer settle a few ms later.
  // Pitch and level vary slightly every time, so a long session never sounds mechanical.
  clack(type = SET().beadType, delay = 0, vol = 1) {
    if (!this.unlock()) return;
    const p = BEAD_SOUND[type] || BEAD_SOUND.rudraksha, c = this.ctx;
    const t = c.currentTime + delay, v = (0.85 + Math.random() * 0.3) * vol, d = 0.96 + Math.random() * 0.08;
    [[0, 1], [0.014 + Math.random() * 0.008, 0.35]].forEach(([dt, g]) => {
      const src = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
      src.buffer = this.noise; f.type = "bandpass"; f.frequency.value = p.noise[0] * d; f.Q.value = p.noise[1];
      gn.gain.value = p.noise[2] * v * g;
      src.connect(f); f.connect(gn); gn.connect(this.out); src.start(t + dt);
      p.modes.forEach(([fr, a, dec]) => this.tone(fr * d, t + dt, dec * (g < 1 ? 0.7 : 1) + 0.01, a * v * g * 0.5));
      if (p.body) this.tone(p.body * d, t + dt, 0.05, 0.12 * v * g, "triangle");
    });
  },
  // What one bead sounds like, per the chosen sound.
  // Each bead's sound lasts exactly one pace window (Free: 1.2 s), so it fades to silence just as
  // the next bead unlocks: you can hear when to move on without looking.
  bead(delay = 0) {
    const m = SET().beadSound, D = toneSec();
    if (m === "silent") return;
    if (m === "bowl") return this.bowlBead(220 * (0.99 + Math.random() * 0.02), D, 0.13, delay);
    this.clack(SET().beadType, delay);
    this.bloom(SET().beadType, delay, D);
  },
  // The wood bead's ring after the knock: soft attack, a bloom over the first third, smooth fade to silence at D.
  bloom(type, delay, D) {
    if (!this.unlock()) return;
    const c = this.ctx, t = c.currentTime + delay, p = BEAD_SOUND[type] || BEAD_SOUND.rudraksha;
    const crystal = !p.body, f = crystal ? 1046.5 : p.body, peak = crystal ? 0.03 : 0.06;
    const g = c.createGain();
    paceEnv(g.gain, t, D, peak);
    g.connect(this.out);
    (crystal ? [[1, 1], [2.76, 0.3]] : [[1, 1], [2, 0.35], [3, 0.12]]).forEach(([r, l]) => {
      const o = c.createOscillator(), og = c.createGain();
      o.frequency.value = f * r * (0.995 + Math.random() * 0.01); og.gain.value = l;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + D + 0.05);
    });
  },
  // A bowl strike whose ring lasts exactly D: the fundamental carries to the end, upper partials fade sooner.
  bowlBead(base, D, vol, delay = 0) {
    if (!this.unlock()) return;
    const c = this.ctx, t = c.currentTime + delay;
    [[1, 1, 1], [2.71, 0.45, 0.7], [5.15, 0.22, 0.45], [8.1, 0.1, 0.3]].forEach(([r, a, d]) => [0, 1.3 * r].forEach((det, twin) => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = base * r + det;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * a * (twin ? 0.5 : 1), t + 0.006); // struck
      g.gain.exponentialRampToValueAtTime(vol * a * (twin ? 0.5 : 1) * 0.3, t + D * d * 0.75);
      g.gain.linearRampToValueAtTime(0, t + D * d);
      o.connect(g); g.connect(this.out); o.start(t); o.stop(t + D * d + 0.05);
    }));
  },
  // Singing-bowl strike: inharmonic partials, each with a slowly beating twin.
  bowl(base = 196, len = 7, vol = 0.22, when = 0) {
    if (!this.unlock()) return;
    const t = this.ctx.currentTime + when;
    [[1, 1, 1], [2.71, 0.45, 0.65], [5.15, 0.22, 0.4], [8.1, 0.1, 0.25]].forEach(([r, a, d]) => {
      this.tone(base * r, t, len * d, vol * a);
      this.tone(base * r + 1.3 * r, t, len * d, vol * a * 0.5);
    });
  },
  // The guru bead (end of 108): a deep chord in the chosen sound.
  guru(delay = 0) {
    const m = SET().beadSound;
    if (m === "silent" || !this.unlock()) return;
    if (m === "bowl") { this.bowl(196, 7, 0.22, delay); this.bowl(294, 6, 0.14, delay + 0.03); this.bowl(392, 5, 0.1, delay + 0.06); return; }
    this.clack(SET().beadType, delay, 1.4);
    this.tone(140, this.ctx.currentTime + delay, 0.25, 0.2);
    this.bowl(330, 4.5, 0.22, delay + 0.15);
  },
  cue(kind) {
    if (!this.unlock()) return;
    const t = this.ctx.currentTime;
    if (kind === "in") this.tone(330, t, 0.7, 0.08, "sine", 440);
    else if (kind === "out" || kind === "hum") this.tone(440, t, 0.8, 0.08, "sine", 300);
    else this.tone(392, t, 0.25, 0.05);
  },
  // A low drone to hum along with during Bhramari.
  humStart(sec) {
    if (!this.unlock()) return;
    this.humStop();
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = "sawtooth"; o.frequency.value = 130.8; f.type = "lowpass"; f.frequency.value = 380;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.5);
    g.gain.setValueAtTime(0.05, t + Math.max(0.6, sec - 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
    o.connect(f); f.connect(g); g.connect(this.out); o.start(t); o.stop(t + sec + 0.1);
    this.hum = { o, g };
  },
  humStop() {
    if (!this.hum || !this.ctx) return;
    const t = this.ctx.currentTime;
    try { this.hum.g.gain.cancelScheduledValues(t); this.hum.g.gain.setTargetAtTime(0.0001, t, 0.08); this.hum.o.stop(t + 0.4); } catch (e) { /* already stopped */ }
    this.hum = null;
  },
};

// ---------- touch feedback ----------
// Android: Vibration API. iPhone: Safari has no vibrate(), but toggling an <input switch> gives a
// system haptic tick on iOS 18+. Best effort; sound covers older iPhones.
function iosTick() {
  const l = document.createElement("label"), i = document.createElement("input");
  i.type = "checkbox"; i.setAttribute("switch", ""); l.appendChild(i);
  l.style.display = "none"; l.setAttribute("aria-hidden", "true");
  document.body.appendChild(l); l.click(); l.remove();
}
function buzz(pattern) {
  if (!SET().haptic) return;
  if (navigator.vibrate) { navigator.vibrate(pattern); return; }
  if (isIOS) { iosTick(); if (Array.isArray(pattern) && pattern.length > 2) setTimeout(iosTick, pattern[0] + pattern[1]); }
}

// ---------- keep the screen on ----------
let wakeLock = null, wakeWanted = false;
async function wakeOn() {
  wakeWanted = true;
  try { if ("wakeLock" in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } } catch (e) { /* not allowed now */ }
}
function wakeOff() { wakeWanted = false; if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }
document.addEventListener("visibilitychange", () => { if (!document.hidden && wakeWanted) wakeOn(); });

// ---------- earbud / headset buttons (Media Session) ----------
// The page plays a silent loop so the phone routes headset play/pause/next presses here.
// Volume buttons can't be read by any web page, on any phone.
let earbudAudio = null;
function silentWavURL() {
  const rate = 8000, n = rate * 6, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
function earbudOn() {
  if (!("mediaSession" in navigator) || earbudAudio) return;
  earbudAudio = new Audio(silentWavURL()); earbudAudio.loop = true;
  earbudAudio.play().catch(() => {});
  try { navigator.mediaSession.metadata = new MediaMetadata({ title: "Japa mala · NeuroLens", artist: SET().mantra || "Press to count a bead" }); } catch (e) { /* no metadata */ }
  const keepPlaying = () => { if (earbudAudio) earbudAudio.play().catch(() => {}); navigator.mediaSession.playbackState = "playing"; };
  const h = { play: () => { addBead(); keepPlaying(); }, pause: () => { addBead(); keepPlaying(); }, nexttrack: () => addBead(), previoustrack: () => undoBead() };
  for (const [a, fn] of Object.entries(h)) { try { navigator.mediaSession.setActionHandler(a, fn); } catch (e) { /* unsupported action */ } }
  navigator.mediaSession.playbackState = "playing";
}
function earbudOff() {
  if (!earbudAudio) return;
  earbudAudio.pause(); URL.revokeObjectURL(earbudAudio.src); earbudAudio = null;
  for (const a of ["play", "pause", "nexttrack", "previoustrack"]) { try { navigator.mediaSession.setActionHandler(a, null); } catch (e) { /* ignore */ } }
}

// ---------- view state ----------
let sMode = "mala";       // mala | pranayama | meditation
let malaFocus = false;    // full-screen blind-tap mode
let beforeScore = null;   // optional "how settled now" rating before a session
let calib = null;         // id of the session waiting for its after-rating
let pace = null;          // running pranayama pacer
let med = null;           // running meditation
{
  const h = location.hash.slice(1); // shortcut links: #mala, #pranayama, #meditate
  if (["mala", "pranayama", "meditate", "sadhana"].includes(h)) {
    tab = "sadhana"; sMode = h === "meditate" ? "meditation" : h === "sadhana" ? "mala" : h;
    history.replaceState(null, "", location.pathname);
  }
}
function sadhanaBusy() { return !!(malaFocus || (pace && pace.timer) || med); }
// Leaving the tab stops the breath pacer and closes full screen; a meditation keeps running (banner).
function sadhanaLeave() {
  if (pace && pace.timer) pStop(true);
  if (malaFocus) { malaFocus = false; earbudOff(); flushSave(); }
  document.body.classList.remove("focus-open"); // full-screen mala or the immersive meditation player
  if (!med) wakeOff();
}

// ---------- mala ----------
function malaLive() {
  const s = sd(), k = todayKey();
  if (s.mala && s.mala.date !== k) { // a new day: log yesterday's count first
    if (s.mala.total > 0) logJapa(s.mala, false);
    s.mala = null;
  }
  if (!s.mala) s.mala = { date: k, beads: 0, malas: 0, total: 0, start: null, last: null };
  return s.mala;
}
let lastBeadAt = 0;
// In the bead-strand view the bead takes ~0.1 s to slide into place; the clack and the
// vibration land with it rather than when the finger lifts.
const LAND = 0.1;
function feel(pattern, delay) {
  if (navigator.vibrate && delay) setTimeout(() => buzz(pattern), delay * 1000);
  else buzz(pattern); // iPhone's haptic must fire inside the tap itself
}
function addBead() {
  const now = Date.now();
  if (now - lastBeadAt < 90) return false; // ignore a palm or double contact
  const gap = SET().paceGuard * 1000;
  if (gap && now - lastBeadAt < gap) { coolBlocked(); return false; } // pace guard: too soon
  lastBeadAt = now;
  const m = malaLive(), per = SET().beadsPerMala, strand = strandOn(), land = strand ? LAND : 0;
  if (!m.start) m.start = now;
  m.beads++; m.total++; m.last = now;
  let done = false;
  if (m.beads >= per) {
    m.beads = 0; m.malas++; done = true;
    Snd.guru(land);
    feel([100, 50, 100], land);
    const goal = SET().malaGoal;
    flash(m.malas === goal ? `Mala ${m.malas} · today's goal reached 🙏` : `Mala ${m.malas} · guru bead: pause, turn and go back`);
  } else {
    Snd.bead(land);
    feel(22, land);
  }
  saveSoon(); paintMala(); coolStart(); sustainGlow(land);
  if (strand) { strandShift(dragDy - PITCH); if (done) turnStrand(); }
  dragDy = 0;
  return true;
}
function undoBead() {
  const m = malaLive();
  if (!m.total) return;
  if (m.beads > 0) m.beads--;
  else if (m.malas > 0) { m.malas--; m.beads = SET().beadsPerMala - 1; }
  m.total--;
  buzz([15, 40, 15]); saveSoon(); paintMala();
  if (strandOn()) strandShift(PITCH);
}

// ---------- bead strand (looks and moves like a real mala) ----------
// The bead under your thumb sits at --thumb; counted beads lie below, upcoming ones above.
// Pulling down moves the whole strand one bead (PITCH px) towards you.
const PITCH = 60, PULL = 36; // px between beads; px of pull that counts one bead
let drag = null, dragDy = 0;
function strandOn() { return malaFocus && SET().malaView === "strand" && !!document.getElementById("beadwin"); }
function beadsHTML() {
  const m = malaLive(), s = SET(), per = s.beadsPerMala, b = m.beads, out = [];
  for (let n = b - 5; n <= b + 10; n++) {
    if (n < 0 && !m.malas) continue; // nothing below the guru bead before the first round
    const guru = n === 0 || n === per + 1;
    out.push(`<div class="bd ${s.beadType} ${guru ? "guru" : ""} ${n === b ? "cur" : n < b ? "done" : ""}" style="top:calc(var(--thumb) + ${(b - n) * PITCH}px)">${guru ? '<i class="tassel"></i>' : ""}</div>`);
  }
  return out.join("");
}
// Slide the strand from `from` px back to rest with a slight spring, like a bead settling.
function strandShift(from) {
  const w = document.getElementById("beadwin"); if (!w) return;
  w.style.transition = "none"; w.style.transform = `translateY(${from}px)`;
  void w.offsetWidth;
  w.style.transition = "transform 210ms cubic-bezier(.3,1.35,.5,1)";
  w.style.transform = "translateY(0)";
}
// At the guru bead you turn the mala around: a short flip of the whole strand.
function turnStrand() {
  const s = document.getElementById("strand"); if (!s) return;
  s.classList.remove("turning"); void s.offsetWidth; s.classList.add("turning");
}

// Pace-matched envelope: soft attack, bloom over the first third, gentle hold, then a smooth fade
// that reaches silence exactly at D (linear at the end so it stays audible right up to the unlock).
function paceEnv(param, t, D, peak) {
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(peak, t + Math.min(0.25, D / 4));
  param.exponentialRampToValueAtTime(peak * 0.7, t + D / 3);
  param.exponentialRampToValueAtTime(peak * 0.3, t + D * 0.75);
  param.linearRampToValueAtTime(0, t + D);
}
// How long each bead's sound lasts: the pace window, or 1.2 s when pace is free.
function toneSec() { return SET().paceGuard || 1.2; }
// Emerald glow ring around the bead while its tone is sounding; it fades with the sound.
function sustainGlow(delay = 0) {
  if (SET().beadSound === "silent") return;
  document.querySelectorAll(".sustain").forEach(el => {
    el.style.setProperty("--sd", toneSec() + "s"); el.style.animationDelay = delay + "s";
    el.classList.remove("on"); void el.getBoundingClientRect(); el.classList.add("on");
  });
}

// ---------- pace guard (minimum time between beads) ----------
// After each bead an arc around the thumb bead (and a thin bar at the top) fills over the interval;
// taps or pulls before it is full are ignored, so a double tap can't skip ahead or rush the chant.
function coolStart() {
  const sec = SET().paceGuard;
  document.querySelectorAll(".cool").forEach(el => {
    el.classList.remove("ready", "blocked");
    el.style.setProperty("--cool", sec + "s");
    el.classList.remove("run"); void el.getBoundingClientRect(); if (sec) el.classList.add("run");
  });
  clearTimeout(coolStart.t);
  if (sec) coolStart.t = setTimeout(() => document.querySelectorAll(".cool").forEach(el => el.classList.add("ready")), sec * 1000);
}
function coolBlocked() {
  document.querySelectorAll(".cool").forEach(el => { el.classList.remove("blocked"); void el.getBoundingClientRect(); el.classList.add("blocked"); });
}
function coolHTML(kind) {
  if (!SET().paceGuard) return "";
  return kind === "arc"
    ? `<svg class="cool arc ready" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="38" class="cbg"/><circle cx="42" cy="42" r="38" class="cfill" pathLength="100"/></svg>`
    : `<div class="cool bar ready" aria-hidden="true"><i></i></div>`;
}
function logJapa(m, rate = true) {
  const minutes = m.start && m.last ? Math.max(1, Math.round((m.last - m.start) / 60000)) : 0;
  const ses = { id: uid(), date: m.date, at: m.last || Date.now(), kind: "japa", tech: "mala", label: SET().mantra || "Japa",
    beads: m.total, malas: m.malas, per: SET().beadsPerMala, minutes, before: rate ? beforeScore : null, after: null };
  sd().sessions.push(ses);
  if (rate) { calib = ses.id; beforeScore = null; }
  return ses;
}
function flash(text) {
  const el = document.getElementById("mfFlash");
  if (el) { el.textContent = text; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); }
  else toast(text);
}
function beadRing(m) {
  const per = SET().beadsPerMala, R = 120, C = 140;
  const dots = Array.from({ length: per }, (_, i) => {
    const a = (i / per) * Math.PI * 2 - Math.PI / 2, x = C + R * Math.cos(a), y = C + R * Math.sin(a);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${per > 60 ? 3.6 : 5}" class="${i < m.beads ? "on" : ""}" data-i="${i}"/>`;
  }).join("");
  return `<svg class="beads" viewBox="0 0 280 280" aria-hidden="true"><circle class="guru" cx="${C}" cy="${C - R - 12}" r="7"/>${dots}</svg>`;
}
function paintMala() {
  const m = malaLive(), per = SET().beadsPerMala;
  document.querySelectorAll(".beads circle[data-i]").forEach(c => c.classList.toggle("on", +c.dataset.i < m.beads));
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("mCount", m.beads); set("mMalas", m.malas); set("mTotal", m.total.toLocaleString());
  set("mfCount", SET().showCount ? m.beads : "");
  const bw = document.getElementById("beadwin"); if (bw) bw.innerHTML = beadsHTML();
  set("mfMeta", `Mala ${m.malas + 1} · ${m.total.toLocaleString()} beads`);
  set("mOf", `of ${per}`);
}

function malaFocusHTML() {
  const m = malaLive(), s = SET();
  return `<div class="mala-focus" id="malaFocus" role="application" aria-label="Tap anywhere to count a bead">
    <div class="mf-top">
      <button class="mf-btn" data-action="s:focusExit">Done</button>
      <span id="mfMeta" class="mf-meta">Mala ${m.malas + 1} · ${m.total.toLocaleString()} beads</span>
      <button class="mf-btn" data-action="s:undo" aria-label="Undo one bead">−1</button>
    </div>
    ${coolHTML("bar")}
    ${s.mantra ? `<div class="mf-mantra">${esc(s.mantra)}</div>` : ""}
    ${s.malaView === "strand" ? `
    <div class="strand" id="strand">
      <div class="thread"></div><div class="sustain"></div><div class="thumbmark"></div>${coolHTML("arc")}
      <div class="beadwin" id="beadwin">${beadsHTML()}</div>
      <div class="mf-count side" id="mfCount">${s.showCount ? m.beads : ""}</div>
    </div>
    <div class="mf-hint">Pull down with your thumb, or just tap · eyes closed is fine<br><small>Space / Enter = bead · Backspace = undo</small></div>` : `
    <div class="mf-center">
      <div class="sustain ring"></div>
      ${beadRing(m)}
      <div class="mf-count" id="mfCount">${s.showCount ? m.beads : ""}</div>
    </div>
    <div class="mf-hint">Tap anywhere · eyes closed is fine${navigator.vibrate ? "" : isIOS ? " · soft click on every bead" : ""}<br><small>Space / Enter = bead · Backspace = undo</small></div>`}
    <div class="mf-flash" id="mfFlash" aria-live="polite"></div>
  </div>`;
}

function malaHTML() {
  const m = malaLive(), s = SET(), k = todayKey();
  const today = sessionsOn(k).filter(x => x.kind === "japa");
  const beadsToday = today.reduce((a, x) => a + (x.beads || 0), 0) + m.total;
  const malasToday = today.reduce((a, x) => a + (x.malas || 0), 0) + m.malas;
  return `
    <div class="card mala-card simple">
      ${s.mantra ? `<p class="mantra-line">${esc(s.mantra)}</p>` : ""}
      <div class="mala-ring">${beadRing(m)}<div class="mala-num"><b id="mCount">${m.beads}</b><span id="mOf">of ${s.beadsPerMala}</span></div></div>
      <p class="hint center">${m.malas ? `<b id="mMalas">${m.malas}</b> mala${m.malas > 1 ? "s" : ""} done · ` : ""}Today ${malasToday}/${s.malaGoal} mala${s.malaGoal > 1 ? "s" : ""}${beadsToday ? ` · ${beadsToday.toLocaleString()} beads` : ""}</p>
      <button class="btn primary block big" data-action="s:focus">${m.total ? "Continue counting" : "Start counting"}</button>
      ${m.total ? `<div class="row center" style="margin-top:8px">
        <button class="btn" data-action="s:malaLog">Finish &amp; log</button>
        <button class="linkbtn" data-action="s:undo">−1</button>
        <button class="linkbtn" data-action="s:malaReset" style="color:var(--warn)">Reset</button>
      </div>` : ""}
    </div>
    ${fold("mSet", "⚙ Settings", `
      <label class="field"><span>Your mantra (optional)</span><small>Shown on the counter, e.g. Om Namah Shivaya, Om, Gayatri, Hare Krishna.</small>
        <input type="text" id="sMantra" value="${esc(s.mantra)}" placeholder="Om Namah Shivaya"></label>
      <label class="field"><span>Beads</span>
        <div class="chips">${Object.entries(BEAD_TYPES).map(([v, l]) => `<button class="chip ${s.beadType === v ? "selected" : ""}" data-action="s:beadType" data-v="${v}"><i class="bd mini ${v}"></i>${l}</button>`).join("")}</div></label>
      <label class="field"><span>Sound</span>
        <div class="chips">${[["wood", "🪵 Wood"], ["bowl", "🔔 Bowl"], ["silent", "🔇 Silent"]].map(([v, l]) => `<button class="chip ${s.beadSound === v ? "selected" : ""}" data-action="s:beadSound" data-v="${v}">${l}</button>`).join("")}</div></label>
      <label class="field"><span>Pace guard</span><small>Taps sooner than this are ignored. Each bead's sound lasts this long.</small>
        <div class="chips">${[[0, "Free"], [1.5, "1.5 s"], [3, "3 s"], [5, "5 s"]].map(([v, l]) => `<button class="chip ${s.paceGuard === v ? "selected" : ""}" data-action="s:pace" data-v="${v}">${l}</button>`).join("")}</div></label>
      ${subFold("mMore", "More options", `
        <label class="field"><span>Full-screen view</span>
          <div class="chips">${[["strand", "📿 Strand"], ["ring", "◯ Ring"]].map(([v, l]) => `<button class="chip ${s.malaView === v ? "selected" : ""}" data-action="s:set" data-k="malaView" data-v="${v}" data-str="1">${l}</button>`).join("")}</div></label>
        <label class="field"><span>Beads per mala</span>
          <div class="chips">${[108, 54, 27, 21].map(v => `<button class="chip ${s.beadsPerMala === v ? "selected" : ""}" data-action="s:set" data-k="beadsPerMala" data-v="${v}">${v}</button>`).join("")}</div></label>
        <label class="field"><span>Daily goal (malas)</span>
          <div class="chips">${[1, 2, 3, 5, 11, 16].map(v => `<button class="chip ${s.malaGoal === v ? "selected" : ""}" data-action="s:set" data-k="malaGoal" data-v="${v}">${v}</button>`).join("")}</div></label>
        ${toggle("haptic", isIOS ? "Haptic tick (iOS 18+)" : "Vibrate on every bead")}
        ${isIOS ? toggle("silentOk", "Play sounds with the silent switch on", "Pauses other audio while you count.") : ""}
        ${toggle("showCount", "Show the number in full screen", "Off = count purely by feel and sound.")}
        ${"mediaSession" in navigator ? toggle("earbud", "Earbud button counts a bead (beta)", "Play/pause or next adds a bead; previous undoes.") : ""}`)}`)}
    ${fold("mGuide", "Guide", `
      <h3>How to hold and move a mala</h3>
      <ol class="steps">${MALA_HOW.map(n => `<li>${esc(n)}</li>`).join("")}</ol>
      <h3>About japa</h3>
      <ul class="steps">${JAPA_NOTES.map(n => `<li>${esc(n)}</li>`).join("")}</ul>
      ${srcList(["sutra", "iyengarLoP", "sivananda", "bernardi2001"])}`)}`;
}
// Folded sections remember whether they're open across re-renders (tapping a chip re-renders the tab).
const folds = {};
function fold(id, summary, body) {
  return `<details class="card acc" data-fold="${id}" ${folds[id] ? "open" : ""}><summary>${summary}</summary>${body}</details>`;
}
function subFold(id, summary, body) {
  return `<details class="srcs" data-fold="${id}" ${folds[id] ? "open" : ""}><summary>${summary}</summary>${body}</details>`;
}
document.addEventListener("toggle", e => { const d = e.target; if (d.dataset && d.dataset.fold) folds[d.dataset.fold] = d.open; }, true);
function toggle(key, label, hint) {
  const on = !!SET()[key];
  return `<button class="toggle ${on ? "on" : ""}" data-action="s:toggle" data-k="${key}" role="switch" aria-checked="${on}">
    <span><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ""}</span><i></i></button>`;
}

// ---------- pranayama ----------
function pTech() { return PRANAYAMA[SET().pTech] ? SET().pTech : "nadi"; }
function pRatio(t = pTech()) { const T = PRANAYAMA[t]; return T.ratios.find(r => r.id === SET().pRatio[t]) || T.ratios[0]; }
function pRounds(t = pTech()) { return SET().pRounds[t] || PRANAYAMA[t].defRounds; }
function phasesFor(t, r, gentle) {
  const h = gentle ? 0 : r.h, h2 = gentle ? 0 : (r.h2 || 0);
  const P = (label, sec, kind, scale, side) => ({ label, ms: sec * 1000, kind, scale, side });
  let seq;
  if (t === "nadi") seq = [P("Inhale left", r.i, "in", 1, "L"), h && P("Hold", h, "hold", 1, ""), P("Exhale right", r.e, "out", .55, "R"),
    P("Inhale right", r.i, "in", 1, "R"), h && P("Hold", h, "hold", 1, ""), P("Exhale left", r.e, "out", .55, "L")];
  else if (t === "bhramari") seq = [P("Inhale deeply", r.i, "in", 1), P("Hum… mmmm", r.e, "hum", .55)];
  else if (t === "box") seq = [P("Inhale", r.i, "in", 1), h && P("Hold", h, "hold", 1), P("Exhale", r.e, "out", .55), h2 && P("Hold empty", h2, "hold", .55)];
  else seq = [P("Inhale", r.i, "in", 1), P("Exhale", r.e, "out", .55)];
  return seq.filter(Boolean);
}
function roundSec(t = pTech()) { return phasesFor(t, pRatio(t), SET().gentle).reduce((a, p) => a + p.ms, 0) / 1000; }

function pranayamaHTML() {
  const s = SET(), t = pTech(), T = PRANAYAMA[t], r = pRatio(t), n = pRounds(t), running = pace && pace.timer;
  const total = Math.round(roundSec(t) * n);
  const holds = (r.h || r.h2) && !s.gentle;
  return `
    <div class="card pacer-card simple">
      <div class="chips center">${Object.entries(PRANAYAMA).map(([id, x]) => `<button class="chip ${t === id ? "selected" : ""}" data-action="s:tech" data-t="${id}" ${running ? "disabled" : ""}>${esc(x.name.split(" (")[0])}</button>`).join("")}</div>
      <p class="hint center" style="margin:8px 0 0">${esc(T.why)}</p>
      <p class="hint center" style="margin:4px 0 0"><b>${esc(r.label)}</b> · ${n} rounds · about ${total >= 90 ? Math.round(total / 60) + " min" : total + " s"}${s.gentle && (r.h || r.h2) ? " · no holds" : ""}</p>
      ${t === "nadi" ? `<div class="nostrils" id="nostrils"><div class="nos" data-side="L"><b>L</b><small id="nosL">left</small></div><div class="nos" data-side="R"><b>R</b><small id="nosR">right</small></div></div>` : ""}
      <div class="breath">
        <div class="pwrap"><div class="circle" id="pCircle"></div><div class="plabel" id="pLabel">${running ? "" : "Ready"}</div></div>
        <div class="p-secs" id="pSecs">&nbsp;</div>
        <div class="count" id="pCount">&nbsp;</div>
      </div>
      <div class="row center" style="margin-top:10px">
        ${running ? `<button class="btn" data-action="s:pStop">Stop</button>` : `<button class="btn primary big" data-action="s:pStart">Start</button>`}
      </div>
      <p class="caution small center">Never force the breath. Stop if dizzy. ${holds ? "Heart, blood pressure or pregnancy: use Gentle mode." : ""}</p>
    </div>
    ${running ? "" : fold("pSet", "⚙ Settings", `
      <label class="field"><span>Ratio</span>
        <div class="chips">${T.ratios.map(x => `<button class="chip ${r.id === x.id ? "selected" : ""}" data-action="s:ratio" data-id="${x.id}">${esc(x.label)}</button>`).join("")}</div></label>
      <label class="field"><span>Rounds</span>
        <div class="chips">${T.rounds.map(v => `<button class="chip ${n === v ? "selected" : ""}" data-action="s:rounds" data-v="${v}">${v}</button>`).join("")}</div></label>
      ${toggle("gentle", "Gentle mode: no breath holds", "For high blood pressure, heart conditions or pregnancy.")}
      ${toggle("pSound", "Sound cues", "A soft tone marks each phase, so your eyes can stay closed.")}`)}
    ${running ? "" : fold("pGuide", "Guide", `
      <h3>How to do ${esc(T.name)}</h3>
      <ol class="steps">${T.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
      <p class="caution">${esc(SADHANA_CAUTION)}</p>
      ${srcList(T.src)}`)}`;
}
function pStart() {
  const t = pTech();
  Snd.unlock(); wakeOn();
  pace = { t, seq: phasesFor(t, pRatio(t), SET().gentle), rounds: pRounds(t), round: 0, step: 0, timer: 1, started: Date.now(), before: beforeScore };
  render(); pRun();
}
function pRun() {
  if (!pace) return;
  if (pace.round >= pace.rounds) return pFinish();
  const ph = pace.seq[pace.step];
  pace.ph = ph; pace.phEnd = Date.now() + ph.ms;
  if (SET().pSound) { Snd.cue(ph.kind); if (ph.kind === "hum") Snd.humStart(ph.ms / 1000); }
  if (ph.kind !== "hold") buzz(15);
  pPaint(true);
  pace.timer = setTimeout(() => {
    pace.step++;
    if (pace.step >= pace.seq.length) { pace.step = 0; pace.round++; }
    pRun();
  }, ph.ms);
}
function pPaint(newPhase) {
  if (!pace || !pace.ph) return;
  const c = document.getElementById("pCircle");
  if (c && newPhase) {
    void c.offsetWidth;
    c.style.transitionDuration = Math.max(0, pace.phEnd - Date.now()) + "ms";
    c.style.transform = `scale(${pace.ph.scale})`;
    c.classList.toggle("humming", pace.ph.kind === "hum");
    const l = document.getElementById("pLabel"); if (l) l.textContent = pace.ph.label; // kept outside the circle so it doesn't shrink
  }
  const secs = document.getElementById("pSecs");
  if (secs) secs.textContent = Math.max(1, Math.ceil((pace.phEnd - Date.now()) / 1000));
  const cnt = document.getElementById("pCount");
  if (cnt) cnt.textContent = `Round ${Math.min(pace.round + 1, pace.rounds)} of ${pace.rounds}`;
  const nos = document.getElementById("nostrils");
  if (nos && newPhase) {
    const side = pace.ph.side; // the open nostril
    nos.querySelectorAll(".nos").forEach(n => {
      const open = !side ? false : n.dataset.side === side;
      n.classList.toggle("open", open); n.classList.toggle("closed", !open);
    });
    const lbl = (s) => !side ? "closed" : s === side ? (pace.ph.kind === "in" ? "breathe in" : "breathe out") : (s === "R" ? "thumb closes" : "fingers close");
    const L = document.getElementById("nosL"), R = document.getElementById("nosR");
    if (L) L.textContent = lbl("L"); if (R) R.textContent = lbl("R");
  }
}
function pStop(silent) {
  if (pace && pace.timer) clearTimeout(pace.timer);
  Snd.humStop();
  if (pace && !silent && pace.round > 0) { pace.rounds = pace.round; return pFinish(); } // keep completed rounds
  pace = null; if (!malaFocus && !med) wakeOff();
}
function pFinish() {
  const p = pace; pace = null;
  if (p && p.timer) clearTimeout(p.timer);
  Snd.humStop(); if (!med) wakeOff();
  if (SET().pSound) Snd.bowl(262, 4, 0.18);
  buzz([80, 60, 80]);
  const T = PRANAYAMA[p.t], r = pRatio(p.t);
  const ses = { id: uid(), date: todayKey(), at: Date.now(), kind: "pranayama", tech: p.t, label: T.name, ratio: r.label + (SET().gentle && (r.h || r.h2) ? " (gentle)" : ""),
    rounds: p.rounds, minutes: Math.max(1, Math.round((Date.now() - p.started) / 60000)), before: p.before, after: null };
  sd().sessions.push(ses);
  dayData(todayKey()).morning.breath = true; // a breathing practice also completes the morning breath step
  calib = ses.id; beforeScore = null; save();
  toast(`${T.name}: ${p.rounds} rounds done`);
  if (tab === "sadhana") { render(); window.scrollTo(0, 0); }
}

// ---------- meditation ----------
function meditationHTML() {
  const s = SET();
  if (med) {
    const el = medElapsed(), st = MEDITATION_STYLES[med.style];
    return `<div class="immersive" style="--art:url('art/dawn.svg')">
      <div class="im-top">
        <button class="im-round" data-action="goto" data-tab="today" aria-label="Back (keeps running)"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
        <button class="im-round" data-action="s:medEnd" aria-label="End now"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      </div>
      <div class="im-body">
        <small>${esc(st.name)}${med.bell ? ` · bell every ${med.bell} min` : ""}</small>
        <h1>Inner Calm</h1>
        <p class="im-sub">${med.sankalpa ? `“${esc(med.sankalpa)}”` : "Take a slow breath"}</p>
        <p class="im-time"><span id="medTime">${fmtClock(el)}</span> / ${fmtClock(med.dur)}${med.pausedAt ? " · paused" : ""}</p>
        <div class="im-bar"><i id="medBar" style="width:${(el / med.dur) * 100}%"></i></div>
        <div class="im-ctrl">
          <button class="im-side" data-action="s:medBell"><svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/></svg>${med.bell ? "Bell on" : "Bell off"}</button>
          <button class="im-play" data-action="s:medPause" aria-label="${med.pausedAt ? "Resume" : "Pause"}">${med.pausedAt
            ? `<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>` : `<svg viewBox="0 0 24 24"><path d="M8 5h3v14H8zM13 5h3v14h-3z"/></svg>`}</button>
          <button class="im-side" data-action="s:medEnd"><svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>End</button>
        </div>
        <p class="im-guide">${esc(st.text)}</p>
      </div>
    </div>`;
  }
  const st = MEDITATION_STYLES[s.medStyle] || Object.values(MEDITATION_STYLES)[0];
  return `
    <div class="card simple">
      <div class="med-min"><b id="medMinLbl">${s.medMin}</b><span>minutes</span></div>
      <div class="chips center">${[5, 10, 15, 20, 30, 41].map(v => `<button class="chip ${s.medMin === v ? "selected" : ""}" data-action="s:set" data-k="medMin" data-v="${v}">${v}</button>`).join("")}</div>
      <p class="hint center" style="margin:10px 0">${esc(st.name)}${s.medBell ? ` · bell every ${s.medBell} min` : ""}${sd().lastSankalpa ? ` · “${esc(sd().lastSankalpa)}”` : ""}</p>
      <button class="btn primary block big" data-action="s:medStart">Begin</button>
    </div>
    ${fold("medSet", "⚙ Settings", `
      <label class="field"><span>Intention (sankalpa, optional)</span>
        <input type="text" id="sSankalpa" value="${esc(sd().lastSankalpa || "")}" placeholder="I will keep my mind balanced today.">
        <div class="chips" style="margin-top:8px">${SANKALPAS.map((x, i) => `<button class="chip" data-action="s:sankalpa" data-i="${i}">${esc(x)}</button>`).join("")}</div></label>
      <label class="field"><span>Style</span>
        <div class="chips">${Object.entries(MEDITATION_STYLES).map(([id, x]) => `<button class="chip ${s.medStyle === id ? "selected" : ""}" data-action="s:set" data-k="medStyle" data-v="${id}" data-str="1">${esc(x.name)}</button>`).join("")}</div>
        <small>${esc(st.text)}</small></label>
      <label class="field"><span>Interval bell</span>
        <div class="chips">${[[0, "Off"], [5, "Every 5 min"], [10, "Every 10 min"]].map(([v, l]) => `<button class="chip ${s.medBell === v ? "selected" : ""}" data-action="s:set" data-k="medBell" data-v="${v}">${l}</button>`).join("")}</div></label>
      <p class="hint" style="margin:0">The screen stays on. One bowl strike to begin, three to end.</p>
      ${srcList(["goyal2014", "nccih2016", "evans", "cyp"])}`)}`;
}
function medElapsed() { if (!med) return 0; return (med.pausedAt || Date.now()) - med.start - med.paused; }
function medStart() {
  const s = SET(), sank = val("sSankalpa");
  sd().lastSankalpa = sank;
  Snd.unlock(); wakeOn();
  med = { start: Date.now(), paused: 0, pausedAt: null, dur: s.medMin * 60000, bell: s.medBell, nextBell: s.medBell * 60000, style: s.medStyle, sankalpa: sank, before: beforeScore };
  Snd.bowl(196, 8, 0.26);
  save(); render(); window.scrollTo(0, 0);
}
function medFinish(early) {
  const m = med; med = null; wakeOff();
  if (!early) { Snd.bowl(196, 8, 0.26); Snd.bowl(196, 8, 0.22, 2.2); Snd.bowl(196, 9, 0.2, 4.4); buzz([100, 60, 100]); }
  const minutes = Math.round(((m.pausedAt || Date.now()) - m.start - m.paused) / 60000);
  if (minutes < 1) { toast("Session too short to log"); render(); return; }
  const ses = { id: uid(), date: todayKey(), at: Date.now(), kind: "meditation", tech: m.style, label: MEDITATION_STYLES[m.style].name,
    minutes, planned: Math.round(m.dur / 60000), sankalpa: m.sankalpa, before: m.before, after: null };
  sd().sessions.push(ses); calib = ses.id; beforeScore = null; save();
  if (tab === "sadhana") { sMode = "meditation"; render(); window.scrollTo(0, 0); } else { renderHeader(); toast("Meditation complete 🙏"); }
}
function medTick() {
  if (!med || med.pausedAt) return;
  const e = medElapsed();
  if (e >= med.dur) return medFinish(false);
  if (med.bell && e >= med.nextBell) { med.nextBell += med.bell * 60000; if (med.dur - e > 30000) Snd.bowl(294, 5, 0.14); }
  const t = document.getElementById("medTime"); if (t) t.textContent = fmtClock(e);
  const f = document.getElementById("medBar"); if (f) f.style.width = (e / med.dur) * 100 + "%";
  const b = document.getElementById("sBannerClock"); if (b) b.textContent = fmtClock(med.dur - e);
}

// ---------- calibration (after a session) ----------
function calibHTML() {
  const ses = calib && sd().sessions.find(x => x.id === calib);
  if (!ses) return "";
  const what = ses.kind === "japa" ? `${ses.beads.toLocaleString()} beads${ses.malas ? ` (${ses.malas} mala${ses.malas > 1 ? "s" : ""})` : ""}` :
    ses.kind === "pranayama" ? `${ses.label}, ${ses.rounds} rounds` : `${ses.minutes} min ${ses.label.toLowerCase()}`;
  return `<div class="card accent-card">
    <span class="tag">${KIND[ses.kind].emoji} Logged: ${esc(what)}</span>
    <h2 style="margin-top:10px">How still is your mind now?</h2>
    <p class="hint">1 = racing, 10 = completely still.${ses.before ? ` Before: <b>${ses.before}</b>.` : ""} Over weeks this shows what practice does for you.</p>
    <div class="score s10">${Array.from({ length: 10 }, (_, i) => i + 1).map(v => `<button type="button" data-action="s:after" data-v="${v}">${v}</button>`).join("")}</div>
    <p style="text-align:right;margin:8px 0 0"><button class="linkbtn" data-action="s:calibSkip">Skip</button></p>
  </div>`;
}

// ---------- analytics ----------
function sadhanaKeys() {
  if (state.startDate && dayNumber() >= 1) { const st = cycleStartKey(); return Array.from({ length: CYCLE }, (_, i) => addDays(st, i)); }
  return Array.from({ length: CYCLE }, (_, i) => addDays(todayKey(), i - CYCLE + 1));
}
function sadhanaTotals(from, to) {
  const list = sd().sessions.filter(inRange(from, to));
  const sum = (kind, f) => list.filter(x => x.kind === kind).reduce((a, x) => a + (x[f] || 0), 0);
  const rated = list.filter(x => x.before && x.after);
  return {
    list, beads: sum("japa", "beads"), malas: sum("japa", "malas"), pMin: sum("pranayama", "minutes"), pRounds: sum("pranayama", "rounds"), mMin: sum("meditation", "minutes"),
    days: new Set(list.map(x => x.date)).size,
    after: avg(list.filter(x => x.after).map(x => x.after)),
    shift: rated.length ? avg(rated.map(x => x.after - x.before)) : null, rated: rated.length,
  };
}
// Compare days with and without practice: triggers per day, recovery time, nightly calm scores.
function sadhanaEffect(keys) {
  const past = keys.filter(k => k < todayKey() && (!state.startDate || k >= state.startDate));
  const grp = on => past.filter(k => sadhanaOn(k) === on);
  const stats = ks => {
    const tr = state.triggers.filter(t => ks.includes(t.date));
    const nights = ks.map(k => state.days[k] && state.days[k].night).filter(Boolean);
    const calm = avg(nights.map(n => n.scores ? avg(["urgency", "voice", "recovery"].map(x => n.scores[x]).filter(Boolean)) : null).filter(v => v != null));
    return { n: ks.length, perDay: ks.length ? tr.length / ks.length : null, recovery: avg(tr.map(t => t.minutes)), calm };
  };
  return { yes: stats(grp(true)), no: stats(grp(false)) };
}
function effectHTML(keys) {
  const e = sadhanaEffect(keys), need = 3;
  if (e.yes.n < need || e.no.n < need) {
    return `<p class="hint" style="margin:0">After at least ${need} days with practice and ${need} without, this compares your triggers and recovery on each kind of day. So far: ${e.yes.n} with, ${e.no.n} without.</p>`;
  }
  const f = (v, d = 1) => v == null ? "–" : v.toFixed(d);
  return `<div class="table-wrap"><table class="ratings">
      <tr><th></th><th>Triggers / day</th><th>Recovery</th><th>Calm score</th></tr>
      <tr><td>🪷 Practice days (${e.yes.n})</td><td>${f(e.yes.perDay)}${trend(e.yes.perDay, e.no.perDay, true)}</td><td>${fmtMin(e.yes.recovery)}${trend(e.yes.recovery, e.no.recovery, true)}</td><td>${f(e.yes.calm)}${trend(e.yes.calm, e.no.calm, false)}</td></tr>
      <tr><td>Other days (${e.no.n})</td><td>${f(e.no.perDay)}</td><td>${fmtMin(e.no.recovery)}</td><td>${f(e.no.calm)}</td></tr>
    </table></div>
    <p class="hint" style="margin:8px 0 0">Calm score = average of your nightly Patience, Voice and Recovery ratings. This shows a pattern, not proof: busy days may also be the days you skip practice.</p>`;
}
function mandalaHTML(keys) {
  const tk = todayKey();
  return `<div class="grid41">${keys.map((k, i) => {
    const kinds = new Set(sessionsOn(k).map(x => x.kind)).size;
    return `<div class="cell ${kinds ? "sd sd" + kinds : (k < tk && (!state.startDate || k >= state.startDate) ? "" : "future")} ${k === tk ? "today" : ""}" title="${k}">${kinds ? "🪷" : i + 1}</div>`;
  }).join("")}</div>
  <div class="legend"><span><i class="lg sd1"></i>1 practice</span><span><i class="lg sd2"></i>2</span><span><i class="lg sd3"></i>All 3 (japa, breath, meditation)</span></div>`;
}
// One compact line for today on the Sadhana tab; tap to see (and delete) entries.
function sadhanaStatsHTML() {
  const k = todayKey(), d = sadhanaTotals(k, k), m = malaLive(), beads = d.beads + m.total;
  const bits = [beads && `📿 ${beads.toLocaleString()} beads`, d.pRounds && `🌬 ${d.pRounds} rounds`, d.mMin && `🪷 ${d.mMin} min`].filter(Boolean);
  if (!d.list.length) return bits.length ? `<p class="hint center">Today: ${bits.join(" · ")}</p>` : "";
  return fold("today", `Today: ${bits.join(" · ")}`, `<ul class="list">${d.list.slice().reverse().map(x => `<li><span>${KIND[x.kind].emoji} ${esc(x.label)}${x.kind === "japa" ? ` · ${x.beads} beads` : x.kind === "pranayama" ? ` · ${x.rounds} rounds` : ` · ${x.minutes} min`}${x.after ? ` <span class="src">· stillness ${x.before ? x.before + "→" : ""}${x.after}</span>` : ""}</span>
      <button class="x" data-action="s:del" data-id="${x.id}" aria-label="Delete">×</button></li>`).join("")}</ul>
    <p class="hint" style="margin:8px 0 0">The 41-day mandala and "does practice help?" are on the Progress tab.</p>`);
}
// Used by the Progress tab.
function sadhanaProgressCard(keys) {
  const t = sadhanaTotals(keys[0], keys[keys.length - 1]);
  return `<div class="card">
    <h2>🪷 Sadhana this cycle</h2>
    <div class="stats">
      <div class="stat"><b>${t.days}</b><span>Days practised</span></div>
      <div class="stat"><b>${t.beads.toLocaleString()}</b><span>Beads (${t.malas} malas)</span></div>
      <div class="stat"><b>${t.pMin + t.mMin}</b><span>Min breath + meditation</span></div>
    </div>
    ${t.after != null ? `<p class="hint" style="margin:10px 0">Stillness after practice: <b>${t.after.toFixed(1)}/10</b>${t.shift != null ? ` (${t.shift > 0 ? "+" : ""}${t.shift.toFixed(1)} vs before)` : ""}</p>` : ""}
    <h3 style="font-size:15px;margin:12px 0 6px">41-day mandala</h3>
    ${mandalaHTML(keys)}
    <h3 style="font-size:15px;margin:12px 0 6px">Practice days vs other days</h3>
    ${effectHTML(keys)}
    <button class="btn block" style="margin-top:10px" data-action="goto" data-tab="sadhana">Open Sadhana</button>
  </div>`;
}
// Used by the Today tab.
function sadhanaTodayCard() {
  const k = todayKey(), d = sadhanaTotals(k, k), m = malaLive(), beads = d.beads + m.total;
  const done = d.list.length > 0;
  const bits = [beads && `📿 ${beads} beads`, d.pRounds && `🌬 ${d.pRounds} rounds`, d.mMin && `🪷 ${d.mMin} min`].filter(Boolean);
  return `<div class="card ${done ? "done" : ""}">
    <h2>Sadhana ${done ? "✓" : ""}</h2>
    <p class="hint">${bits.length ? bits.join(" · ") : "Japa, pranayama or meditation. Any one lights today on your 41-day grid."}</p>
    <div class="row">
      <button class="btn" data-action="s:open" data-m="mala" style="flex:1">📿 Mala</button>
      <button class="btn" data-action="s:open" data-m="pranayama" style="flex:1">🌬 Breath</button>
      <button class="btn" data-action="s:open" data-m="meditation" style="flex:1">🪷 Meditate</button>
    </div>
  </div>`;
}
// Header banner while a meditation runs on another tab.
function sadhanaBannerHTML() {
  if (!med || tab === "sadhana") return "";
  return `🪷 Meditation · <span id="sBannerClock">${fmtClock(med.dur - medElapsed())}</span> left · tap to open`;
}

// ---------- render ----------
function renderSadhana() {
  const seg = `<div class="seg">${[["mala", "📿 Mala"], ["pranayama", "🌬 Pranayama"], ["meditation", "🪷 Meditate"]].map(([m, l]) =>
    `<button class="${sMode === m ? "active" : ""}" data-action="s:mode" data-m="${m}">${l}</button>`).join("")}</div>`;
  const body = sMode === "pranayama" ? pranayamaHTML() : sMode === "meditation" ? meditationHTML() : malaHTML();
  view.innerHTML = seg + calibHTML() + body + (med || (pace && pace.timer) ? "" : sadhanaStatsHTML()) + (malaFocus ? malaFocusHTML() : "");
  document.body.classList.toggle("focus-open", malaFocus || (!!med && sMode === "meditation"));
  if (pace && pace.timer) pPaint(true);
}

function openFocus() {
  Snd.unlock(); wakeOn(); malaFocus = true;
  if (document.activeElement) document.activeElement.blur();
  if (SET().earbud) earbudOn();
  malaLive(); render();
}
function closeFocus() {
  malaFocus = false; earbudOff(); if (!med && !(pace && pace.timer)) wakeOff();
  flushSave(); document.body.classList.remove("focus-open"); render();
}

// ---------- events ----------
// The full-screen pad counts on pointerup: it is a "user activation" on every browser, which iOS needs
// for sound and haptics. touch-action: none in CSS removes the tap delay and zoom.
// Bead-strand view: the strand follows your thumb as you pull down; past ~40% of a bead it counts
// and springs into place, otherwise it slides back. A short tap counts too.
document.addEventListener("pointerdown", e => {
  if (!malaFocus || !e.isPrimary) return;
  if (!e.target.closest("#malaFocus") || e.target.closest(".mf-top")) return;
  drag = { x0: e.clientX, y0: e.clientY, t0: Date.now(), engaged: false }; dragDy = 0;
});
document.addEventListener("pointermove", e => {
  if (!drag || !e.isPrimary) return;
  // A pull is downward or sideways (thumb drawing a bead across); whichever is larger.
  const dy = e.clientY - drag.y0, dx = Math.abs(e.clientX - drag.x0), raw = Math.max(dy, dx);
  dragDy = raw < 0 ? Math.max(-14, raw / 3) : Math.min(PITCH * 1.15, raw); // a little resistance upwards
  const w = document.getElementById("beadwin");
  if (w && strandOn()) { w.style.transition = "none"; w.style.transform = `translateY(${dragDy}px)`; }
  if (!drag.engaged && dragDy > PULL) { drag.engaged = true; if (navigator.vibrate && SET().haptic) navigator.vibrate(6); }
});
document.addEventListener("pointerup", e => {
  if (!malaFocus || !e.isPrimary) return;
  if (drag) {
    const d = drag; drag = null;
    const tap = Math.abs(dragDy) < 10 && Date.now() - d.t0 < 400;
    if (tap) dragDy = 0;
    if ((tap || dragDy > PULL) && addBead()) e.preventDefault();
    else { strandShift(dragDy); dragDy = 0; } // not far enough: the bead slides back
    return;
  }
  const pad = e.target.closest("#malaFocus");
  if (!pad || e.target.closest(".mf-top")) return;
  e.preventDefault(); addBead();
});
document.addEventListener("pointercancel", () => { if (drag) { drag = null; strandShift(dragDy); dragDy = 0; } });

view.addEventListener("click", e => {
  const el = e.target.closest("[data-action]"); if (!el) return;
  const a = el.dataset.action; if (!a.startsWith("s:")) return;
  const s = SET();
  switch (a.slice(2)) {
    case "mode": if (pace && pace.timer) pStop(true); sMode = el.dataset.m; beforeScore = null; render(); window.scrollTo(0, 0); break;
    case "open": sMode = el.dataset.m; go("sadhana"); break;
    case "focus": openFocus(); break;
    case "focusExit": closeFocus(); break;
    case "tap": Snd.unlock(); addBead(); break;
    case "undo": undoBead(); break;
    case "malaLog": { const m = malaLive(); if (!m.total) return; logJapa(m); sd().mala = null; save(); render(); window.scrollTo(0, 0); break; }
    case "malaReset": if (confirm("Reset this count without logging it?")) { sd().mala = null; save(); render(); } break;
    case "set": s[el.dataset.k] = el.dataset.str ? el.dataset.v : +el.dataset.v; save(); render(); break;
    case "toggle": {
      const k = el.dataset.k; s[k] = !s[k]; save();
      if (k === "silentOk") Snd.unlock();
      if (k === "haptic" && s.haptic) buzz(25);
      render(); break;
    }
    case "after": case "calibSkip": {
      const ses = sd().sessions.find(x => x.id === calib);
      if (ses && a === "s:after") ses.after = +el.dataset.v;
      calib = null; save(); if (a === "s:after") toast("Noted 🙏"); render(); break;
    }
    case "del": if (confirm("Delete this practice entry?")) { sd().sessions = sd().sessions.filter(x => x.id !== el.dataset.id); save(); render(); } break;
    case "beadSound": s.beadSound = el.dataset.v; save(); Snd.bead(); render(); break;
    case "pace": s.paceGuard = +el.dataset.v; save(); Snd.bead(); render(); break;
    case "beadType": s.beadType = el.dataset.v; save(); Snd.clack(s.beadType); setTimeout(() => Snd.clack(s.beadType), 260); render(); break;
    case "tech": s.pTech = el.dataset.t; save(); render(); break;
    case "ratio": s.pRatio[pTech()] = el.dataset.id; save(); render(); break;
    case "rounds": s.pRounds[pTech()] = +el.dataset.v; save(); render(); break;
    case "pStart": pStart(); break;
    case "pStop": pStop(false); render(); break;
    case "sankalpa": { const i = document.getElementById("sSankalpa"); if (i) i.value = sd().lastSankalpa = SANKALPAS[+el.dataset.i]; saveSoon(); break; }
    case "medStart": medStart(); break;
    case "medGo": sMode = "meditation"; go("sadhana"); medStart(); break; // "Start session" on Home
    case "medBell": med.bell = med.bell ? 0 : (s.medBell || 5); med.nextBell = (Math.floor(medElapsed() / 60000 / med.bell || 0) + 1) * med.bell * 60000; render(); break;
    case "bhramari": // from the Trigger screen
      s.pTech = "bhramari"; s.pRounds.bhramari = 5; save();
      sMode = "pranayama"; beforeScore = null; go("sadhana"); pStart(); break;
    case "medPause":
      if (med.pausedAt) { med.paused += Date.now() - med.pausedAt; med.pausedAt = null; wakeOn(); } else { med.pausedAt = Date.now(); }
      render(); break;
    case "medEnd": if (confirm("End the meditation now and log the time so far?")) medFinish(true); break;
  }
});
view.addEventListener("input", e => {
  if (e.target.id === "sMantra") { SET().mantra = e.target.value.trim(); saveSoon(); }
  if (e.target.id === "sSankalpa") { sd().lastSankalpa = e.target.value; saveSoon(); }
});

// Keyboard: Space / Enter / ↑ / + count a bead, Backspace / ↓ / − undo, Esc leaves full screen.
document.addEventListener("keydown", e => {
  if (tab !== "sadhana" || sMode !== "mala") return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  // Outside full screen, let Space/Enter press a focused button as normal.
  if (!malaFocus && tag === "BUTTON" && (e.key === " " || e.key === "Enter")) return;
  if ([" ", "Enter", "ArrowUp", "+", "="].includes(e.key) || e.code === "Space") { e.preventDefault(); Snd.unlock(); addBead(); }
  else if (["Backspace", "ArrowDown", "-"].includes(e.key)) { e.preventDefault(); undoBead(); }
  else if (e.key === "Escape" && malaFocus) closeFocus();
});

setInterval(() => { medTick(); if (pace && pace.timer) pPaint(false); }, 250);

render();
