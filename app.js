/* ============================================================
   Zetamac++  —  local mental-math trainer
   All state persists in localStorage. No server, no network.
   ============================================================ */

const STORE_KEY = "zetamacpp.runs.v1";
const CFG_KEY   = "zetamacpp.config.v1";
const THEME_KEY = "zetamacpp.theme";

/* ---------- tiny DOM helpers ---------- */
const $  = (id) => document.getElementById(id);
const el = (sel) => document.querySelector(sel);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ============================================================
   PERSISTENCE
   ============================================================ */
function loadRuns() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}
function saveRuns(runs) {
  localStorage.setItem(STORE_KEY, JSON.stringify(runs));
}
function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CFG_KEY)); }
  catch { return null; }
}
function saveConfig(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

/* a run's mode; runs saved before this feature default to "typed" */
function runMode(r) { return r.mode || "typed"; }

/* stats bucket for a run: listen runs group together; visual runs split by
   submission style. Old runs w/o a stored autoSubmit flag were Enter-mode. */
function runCategory(r) {
  if (runMode(r) === "listen") return "listen";
  return (r.config && r.config.autoSubmit) ? "auto" : "sudden";
}
const CAT_LABELS = { auto: "Auto-submit", sudden: "Sudden death", listen: "Listen" };

/* median of a numeric array (0 for empty) */
function median(arr) {
  const a = arr.slice().sort((x, y) => x - y);
  const n = a.length;
  if (!n) return 0;
  const m = Math.floor(n / 2);
  return n % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/* local-day key, e.g. "2026-06-18" (respects user's timezone) */
function dayKey(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ============================================================
   CONFIG  (read from / written to the setup form)
   ============================================================ */
function readConfigFromForm() {
  const num = (id, d) => {
    const v = parseInt($(id).value, 10);
    return Number.isFinite(v) ? v : d;
  };
  return {
    add: { on: $("op-add").checked, aMin: num("add-a-min",2), aMax: num("add-a-max",100), bMin: num("add-b-min",2), bMax: num("add-b-max",100) },
    sub: { on: $("op-sub").checked },
    mul: { on: $("op-mul").checked, aMin: num("mul-a-min",2), aMax: num("mul-a-max",12), bMin: num("mul-b-min",2), bMax: num("mul-b-max",100) },
    div: { on: $("op-div").checked },
    duration: num("duration", 120),
    // one switch, two modes: auto-submit (Zetamac style, timer ends the run)
    // vs Enter-to-submit sudden death (first wrong answer ends the run)
    autoSubmit: $("mode-toggle").checked,
    suddenDeath: !$("mode-toggle").checked,
    audioMode: $("audio-mode").checked,
    keypad: $("keypad-toggle").checked,
  };
}
function applyConfigToForm(c) {
  if (!c) return;
  $("op-add").checked = c.add.on;
  $("add-a-min").value = c.add.aMin; $("add-a-max").value = c.add.aMax;
  $("add-b-min").value = c.add.bMin; $("add-b-max").value = c.add.bMax;
  $("op-sub").checked = c.sub.on;
  $("op-mul").checked = c.mul.on;
  $("mul-a-min").value = c.mul.aMin; $("mul-a-max").value = c.mul.aMax;
  $("mul-b-min").value = c.mul.bMin; $("mul-b-max").value = c.mul.bMax;
  $("op-div").checked = c.div.on;
  $("duration").value = c.duration;
  $("mode-toggle").checked = c.autoSubmit === undefined ? true : !!c.autoSubmit;
  $("audio-mode").checked = !!c.audioMode;
  $("keypad-toggle").checked = c.keypad === undefined ? isTouchDevice() : !!c.keypad;
}

/* the switch label and the hint under Start both track the selected mode */
function updateModeHint() {
  const auto = $("mode-toggle").checked;
  $("mode-label").textContent = auto ? "Auto-submit" : "Sudden death";
  $("mode-hint").innerHTML = auto
    ? "Answers are accepted the instant they're correct — the run ends when time is up."
    : "Type your answer and press <kbd>Enter</kbd> to submit — your first wrong answer ends the run.";
}

function isTouchDevice() {
  return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
}

/* Stats only count runs played on the default problem set, so custom
   ranges/durations can't inflate (or deflate) the trend lines.
   Play-style options — auto-submit, listen mode, keypad — don't matter. */
function isDefaultConfig(cfg) {
  return cfg.add.on && cfg.sub.on && cfg.mul.on && cfg.div.on &&
    cfg.add.aMin === 2 && cfg.add.aMax === 100 &&
    cfg.add.bMin === 2 && cfg.add.bMax === 100 &&
    cfg.mul.aMin === 2 && cfg.mul.aMax === 12 &&
    cfg.mul.bMin === 2 && cfg.mul.bMax === 100 &&
    cfg.duration === 120;
}

/* reset every gameplay setting to factory defaults (theme is left alone) */
function resetSettings() {
  $("op-add").checked = $("op-sub").checked = true;
  $("op-mul").checked = $("op-div").checked = true;
  $("add-a-min").value = 2; $("add-a-max").value = 100;
  $("add-b-min").value = 2; $("add-b-max").value = 100;
  $("mul-a-min").value = 2; $("mul-a-max").value = 12;
  $("mul-b-min").value = 2; $("mul-b-max").value = 100;
  $("duration").value = 120;
  $("mode-toggle").checked = true;            // auto-submit
  $("audio-mode").checked = false;
  $("keypad-toggle").checked = isTouchDevice();
  updateModeHint();
  saveConfig(readConfigFromForm());
}

/* ============================================================
   THEMES  —  palettes defined in style.css via [data-theme]
   ============================================================ */
function applyTheme(name) {
  if (name) document.documentElement.dataset.theme = name;
  else delete document.documentElement.dataset.theme;
  localStorage.setItem(THEME_KEY, name || "");

  // keep the browser / iOS status-bar color in sync with the palette
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    if (bg) meta.content = bg;
  }

  document.querySelectorAll(".theme-chip").forEach((c) =>
    c.classList.toggle("active", (c.dataset.theme || "") === (name || ""))
  );

  // the stats chart bakes colors into its SVG — redraw if it's on screen
  if ($("view-stats").classList.contains("active")) renderStats();
}

/* ============================================================
   PROBLEM GENERATION
   ============================================================ */
const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

function buildOpPool(cfg) {
  const pool = [];
  if (cfg.add.on) pool.push("add");
  if (cfg.sub.on) pool.push("sub");
  if (cfg.mul.on) pool.push("mul");
  if (cfg.div.on) pool.push("div");
  return pool;
}

let lastKey = null; // avoid immediate repeats

function makeProblem(cfg, pool) {
  // try a few times to avoid showing the exact same problem twice in a row
  for (let attempt = 0; attempt < 6; attempt++) {
    const p = _makeProblem(cfg, pool);
    if (p.key !== lastKey) { lastKey = p.key; return p; }
  }
  const p = _makeProblem(cfg, pool);
  lastKey = p.key;
  return p;
}

function _makeProblem(cfg, pool) {
  const op = pool[Math.floor(Math.random() * pool.length)];
  let a, b, text, answer;

  if (op === "add") {
    a = randInt(cfg.add.aMin, cfg.add.aMax);
    b = randInt(cfg.add.bMin, cfg.add.bMax);
    text = `${a} + ${b}`; answer = a + b;
  } else if (op === "sub") {
    // inverse of addition: x + y = sum, ask sum - y (always non-negative)
    const x = randInt(cfg.add.aMin, cfg.add.aMax);
    const y = randInt(cfg.add.bMin, cfg.add.bMax);
    const sum = x + y;
    text = `${sum} − ${y}`; answer = x; a = sum; b = y;
  } else if (op === "mul") {
    a = randInt(cfg.mul.aMin, cfg.mul.aMax);
    b = randInt(cfg.mul.bMin, cfg.mul.bMax);
    text = `${a} × ${b}`; answer = a * b;
  } else { // div — inverse of multiplication, always exact
    const x = randInt(cfg.mul.aMin, cfg.mul.aMax);
    const y = randInt(cfg.mul.bMin, cfg.mul.bMax);
    const prod = x * y;
    // divide by a non-zero operand
    const divisor = (x !== 0) ? x : (y || 1);
    text = `${prod} ÷ ${divisor}`; answer = prod / divisor; a = prod; b = divisor;
  }
  return { op, text, answer, key: text };
}

/* ============================================================
   GAME ENGINE
   ============================================================ */
const game = {
  cfg: null,
  pool: [],
  score: 0,
  attempts: 0,
  startTs: 0,
  endTs: 0,
  timerId: null,
  current: null,
  opStats: {}, // op -> {correct, wrong}
  active: false,
};

function startGame() {
  const cfg = readConfigFromForm();
  const pool = buildOpPool(cfg);
  if (pool.length === 0) {
    alert("Pick at least one operation.");
    return;
  }
  if (cfg.audioMode && !speechSupported()) {
    alert("This browser can't read the problems aloud (no text-to-speech).\nFalling back to showing them on screen.");
    cfg.audioMode = false;
    $("audio-mode").checked = false;
  }
  if (cfg.audioMode) {              // inside the Start tap = iOS audio unlock
    warmUpTTS();
    keepAudioAlive();
  }
  saveConfig(cfg);

  game.cfg = cfg;
  game.pool = pool;
  game.score = 0;
  game.attempts = 0;
  game.opStats = {};
  game.lastMiss = null;
  game.active = true;
  game.startTs = Date.now();
  lastKey = null;

  $("score").textContent = "0";
  $("feedback").textContent = "";
  $("time-left").textContent = cfg.duration;

  setupGameUI(cfg);
  showView("game");
  nextProblem();

  clearInterval(game.timerId);
  game.timerId = setInterval(tick, 200);
}

/* In listen mode we hide the written problem and show a speaker indicator.
   The answer is typed (and submitted with Enter) in BOTH modes. */
function setupGameUI(cfg) {
  const audio = !!cfg.audioMode;
  $("problem").hidden = audio;
  $("audio-panel").hidden = !audio;
  if (audio) setAudioStatus("Listen, then type your answer");

  // big-button keypad: readonly input keeps the iOS keyboard from popping up
  const inp = $("answer");
  $("keypad").hidden = !cfg.keypad;
  if (cfg.keypad) {
    inp.setAttribute("readonly", "readonly");
    inp.setAttribute("inputmode", "none");
  } else {
    inp.removeAttribute("readonly");
    inp.setAttribute("inputmode", "numeric");
  }
  // with auto-submit there's nothing to submit — the key becomes Clear
  $("key-action").textContent = cfg.autoSubmit ? "C" : "↵";

  inp.value = "";
  inp.focus();
}

function tick() {
  const remaining = game.cfg.duration - (Date.now() - game.startTs) / 1000;
  if (remaining <= 0) {
    $("time-left").textContent = "0";
    endGame("time");
    return;
  }
  $("time-left").textContent = Math.ceil(remaining);
}

function nextProblem() {
  game.current = makeProblem(game.cfg, game.pool);
  $("answer").value = "";
  if (game.cfg.audioMode) {
    speakProblem(game.current.text);   // read aloud; never shown on screen
  } else {
    $("problem").textContent = game.current.text;
  }
  $("answer").focus();
}

function recordOp(op, correct) {
  if (!game.opStats[op]) game.opStats[op] = { correct: 0, wrong: 0 };
  game.opStats[op][correct ? "correct" : "wrong"]++;
}

/* Zetamac-style auto-submit: runs on every keystroke / keypad tap.
   A value equal to the answer is accepted immediately — no Enter needed.
   A mistyped value is never counted as "wrong": clear it with C/backspace
   and keep going. Sudden death only fires on an explicit Enter submit. */
function handleAutoInput() {
  if (!game.active || !game.cfg.autoSubmit) return;
  const raw = $("answer").value.trim();
  if (raw === "") return;
  const val = Number(raw);

  if (Number.isFinite(val) && val === game.current.answer) {
    game.attempts++;
    recordOp(game.current.op, true);
    game.score++;
    $("score").textContent = game.score;
    nextProblem();
  }
}

function submitAnswer() {
  if (!game.active) return;
  const raw = $("answer").value.trim();
  if (raw === "") return; // ignore empty Enter
  const val = Number(raw);
  game.attempts++;
  const correct = Number.isFinite(val) && val === game.current.answer;
  recordOp(game.current.op, correct);
  if (!correct) {
    game.lastMiss = { text: game.current.text, answer: game.current.answer, given: raw };
  }

  if (correct) {
    game.score++;
    $("score").textContent = game.score;
    nextProblem();
  } else if (game.cfg.suddenDeath) {
    endGame("wrong");
  } else {
    // practice mode: flash red, keep the same problem (re-read it in listen mode)
    const inp = $("answer");
    inp.classList.remove("flash-bad");
    void inp.offsetWidth; // restart animation
    inp.classList.add("flash-bad");
    inp.value = "";
    if (game.cfg.audioMode) speakProblem(game.current.text);
  }
}

function endGame(reason) {
  if (!game.active) return;
  game.active = false;
  clearInterval(game.timerId);
  stopAudio();
  game.endTs = Date.now();

  const elapsed = Math.min(game.cfg.duration, (game.endTs - game.startTs) / 1000);
  const run = {
    ts: game.endTs,
    day: dayKey(game.endTs),
    score: game.score,
    attempts: game.attempts,
    reason,                         // "wrong" | "time" | "quit"
    miss: game.lastMiss || null,    // last missed question this run, if any
    // the problem left on screen when time ran out (or the player quit)
    final: (reason !== "wrong" && game.current)
      ? { text: game.current.text, answer: game.current.answer }
      : null,
    mode: game.cfg.audioMode ? "listen" : "typed",
    elapsed: Math.round(elapsed),
    duration: game.cfg.duration,
    opStats: game.opStats,
    config: {
      ops: game.pool,
      suddenDeath: game.cfg.suddenDeath,
      autoSubmit: !!game.cfg.autoSubmit,
    },
  };
  // only default-settings runs count toward stats
  const counted = isDefaultConfig(game.cfg);
  const runs = loadRuns();
  if (counted) {
    runs.push(run);
    saveRuns(runs);
  }

  showResults(run, runs, counted);
}

function quitGame() {
  if (game.active) endGame("quit");
}

/* abandon the current run WITHOUT recording it, then start a fresh one */
function restartGame() {
  game.active = false;
  clearInterval(game.timerId);
  stopAudio();
  startGame();
}

/* ============================================================
   LISTEN MODE  —  read the problem aloud (text-to-speech).
   The problem is never shown; the answer is still typed.
   ============================================================ */
function speechSupported() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/* The first spoken word tends to get clipped in two ways:
   1. iOS clips the start of the very first utterance while the audio
      session spins up — so we "warm up" with a silent utterance inside the
      Start tap (a user gesture, which is also what unlocks audio on iOS).
   2. cancel() followed by speak() in the same tick cuts the first word —
      so when something is already speaking we cancel, wait a beat, then
      speak. A leading comma adds one more safety beat of silence. */
let ttsWarm = false;
let speakTimer = null;
let audioCtx = null;

function warmUpTTS() {
  if (ttsWarm || !speechSupported()) return;
  ttsWarm = true;
  const u = new SpeechSynthesisUtterance("a");
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

/* iOS closes the audio session whenever it goes idle between utterances,
   then clips the first ~200ms of the next one while it reopens. A looping
   silent Web Audio source holds the session open for the whole run.
   Must be first called from inside a user gesture (the Start tap). */
function keepAudioAlive() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!audioCtx) {
    audioCtx = new AC();
    const src = audioCtx.createBufferSource();
    src.buffer = audioCtx.createBuffer(1, 1, 22050); // one silent sample
    src.loop = true;
    src.connect(audioCtx.destination);
    src.start(0);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function speakProblem(text) {
  if (!("speechSynthesis" in window)) return;
  clearTimeout(speakTimer);
  const spoken = ", " + text
    .replace("+", " plus ")
    .replace("−", " minus ").replace("-", " minus ")
    .replace("×", " times ")
    .replace("÷", " divided by ");
  const u = new SpeechSynthesisUtterance(spoken);
  u.lang = "en-US";
  u.rate = 1.0;
  const speaker = $("speaker-indicator");
  if (speaker) speaker.classList.add("speaking");
  const done = () => { if (speaker) speaker.classList.remove("speaking"); };
  u.onend = done;
  u.onerror = done;

  // always start after a short delay so the engine is ready before the
  // first word — speaking immediately is what clips the opening syllable
  const synth = window.speechSynthesis;
  const busy = synth.speaking || synth.pending;
  if (busy) synth.cancel();
  speakTimer = setTimeout(() => synth.speak(u), busy ? 300 : 220);
}

function repeatProblem() {
  if (game.active && game.cfg.audioMode && game.current) speakProblem(game.current.text);
}

function setAudioStatus(t) { const e = $("audio-status"); if (e) e.textContent = t; }

function stopAudio() {
  clearTimeout(speakTimer);
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (audioCtx && audioCtx.state === "running") audioCtx.suspend();
  const speaker = $("speaker-indicator");
  if (speaker) speaker.classList.remove("speaking");
}

/* ============================================================
   RESULTS SCREEN
   ============================================================ */
function showResults(run, runs, counted) {
  const headline = {
    wrong: "Wrong answer — run over",
    time:  "Time's up!",
    quit:  "Run ended",
  }[run.reason] || "Run over";
  $("result-headline").textContent = headline;
  $("final-score").textContent = run.score;

  let sub = "";
  if (!counted) {
    // custom problem set: no high-score comparison, nothing recorded
    sub = "Custom settings — this run isn't saved to stats.";
  } else {
    // is this a personal / daily best? — compared only within the same category
    const sameMode = runs.filter(r => runCategory(r) === runCategory(run));
    const todays = sameMode.filter(r => r.day === run.day);
    const todayHigh = Math.max(...todays.map(r => r.score));
    const allHigh = Math.max(...sameMode.map(r => r.score));
    const modeLabel = CAT_LABELS[runCategory(run)];
    if (run.score === allHigh && sameMode.filter(r => r.score === allHigh).length === 1) {
      sub = `🏆 New all-time high — ${modeLabel}!`;
    } else if (run.score === todayHigh && todays.filter(r => r.score === todayHigh).length === 1) {
      sub = `⭐ New daily best — ${modeLabel}!`;
    } else {
      sub = `${modeLabel} · Today's best: ${todayHigh} · All-time: ${allHigh}`;
    }
  }
  $("result-sub").textContent = sub;

  // show the answer to the question that ended the run: the missed one on
  // a wrong submit, otherwise the unanswered problem the timer cut off
  const miss = run.miss;
  if (run.reason === "wrong" && miss) {
    $("result-miss").innerHTML =
      `Last miss: <b>${miss.text} = ${miss.answer}</b>` +
      (miss.given ? ` &nbsp;<span>(you answered ${escapeHtml(miss.given)})</span>` : "");
  } else if (run.final) {
    $("result-miss").innerHTML =
      `Last problem: <b class="final">${run.final.text} = ${run.final.answer}</b>`;
  } else {
    $("result-miss").innerHTML = "";
  }

  // average time to land each correct answer
  const secPer = run.score ? `${(run.elapsed / run.score).toFixed(1)}s` : "–";
  // accuracy is meaningless in auto-submit (wrong tries aren't counted), so hide it
  let accCell = "";
  if (!(run.config && run.config.autoSubmit)) {
    const acc = run.attempts ? Math.round((run.score / run.attempts) * 100) : 0;
    accCell = `<div><b>${acc}%</b>accuracy</div>`;
  }
  $("result-stats").innerHTML = `
    <div><b>${run.attempts}</b>attempts</div>
    ${accCell}
    <div><b>${secPer}</b>sec/question</div>
    <div><b>${run.elapsed}s</b>elapsed</div>
  `;

  showView("results");
  // NB: do not auto-focus the "play again" button — a focused button would
  // turn the very next Enter into a native click *and* a document-level
  // restart. We let the document keydown handler own Enter on this screen.
}

/* ============================================================
   STATS / TRENDS
   ============================================================ */
const OP_LABELS = { add: "Addition", sub: "Subtraction", mul: "Multiplication", div: "Division" };

let statsMode = "all"; // "all" | "auto" | "sudden" | "listen"

function renderStats() {
  const all = loadRuns().slice().sort((a, b) => a.ts - b.ts);
  const runs = (statsMode === "all") ? all : all.filter(r => runCategory(r) === statsMode);
  const today = dayKey(Date.now());

  // ---- summary cards ----
  const todays = runs.filter(r => r.day === today);
  $("s-today-high").textContent   = todays.length ? Math.max(...todays.map(r => r.score)) : "–";
  if (todays.length) {
    const med = median(todays.map(r => r.score));
    $("s-today-median").textContent = Number.isInteger(med) ? med : med.toFixed(1);
  } else {
    $("s-today-median").textContent = "–";
  }
  $("s-alltime-high").textContent = runs.length   ? Math.max(...runs.map(r => r.score))   : "–";
  $("s-today-games").textContent  = todays.length;

  // 7-day average score
  const cutoff = Date.now() - 7 * 864e5;
  const recent = runs.filter(r => r.ts >= cutoff);
  $("s-avg7").textContent = recent.length
    ? (recent.reduce((s, r) => s + r.score, 0) / recent.length).toFixed(1)
    : "–";

  renderDailyChart(runs);
  renderRecent(runs);
  renderOpBreakdown(runs);
}

/* daily high-score line/bar chart, drawn as inline SVG */
function renderDailyChart(runs) {
  const host = $("chart-daily");
  if (runs.length === 0) {
    host.innerHTML = `<div class="empty">No runs yet. Play a game to start tracking trends.</div>`;
    return;
  }

  // map day -> high score, last 14 days that have data (plus fill gaps)
  const byDay = {};
  for (const r of runs) byDay[r.day] = Math.max(byDay[r.day] || 0, r.score);

  // build a continuous range of the last 14 calendar days
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    days.push(dayKey(d.getTime()));
  }
  const vals = days.map(d => byDay[d] || 0);
  const maxV = Math.max(...vals, 1);

  // colors come from the active theme's CSS variables
  const cssVars = getComputedStyle(document.documentElement);
  const C = {
    accent:    cssVars.getPropertyValue("--accent").trim()     || "#4fd1c5",
    accentDim: cssVars.getPropertyValue("--accent-dim").trim() || "#2c8a82",
    border:    cssVars.getPropertyValue("--border").trim()     || "#2c3744",
    muted:     cssVars.getPropertyValue("--muted").trim()      || "#8b97a6",
  };

  const W = 700, H = 240, padL = 36, padB = 28, padT = 14, padR = 14;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = days.length;
  const x = (i) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) => padT + plotH - (v / maxV) * plotH;

  // gridlines
  let grid = "";
  const ticks = 4;
  for (let t = 0; t <= ticks; t++) {
    const v = Math.round((maxV / ticks) * t);
    const yy = y(v);
    grid += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="${C.border}" stroke-width="1"/>`;
    grid += `<text x="${padL - 6}" y="${yy + 4}" fill="${C.muted}" font-size="11" text-anchor="end">${v}</text>`;
  }

  // bars
  let bars = "";
  const bw = Math.min(34, (plotW / n) * 0.6);
  days.forEach((d, i) => {
    const v = vals[i];
    if (v <= 0) return;
    const bx = x(i) - bw / 2;
    const by = y(v);
    bars += `<rect x="${bx}" y="${by}" width="${bw}" height="${padT + plotH - by}" rx="3" fill="${C.accentDim}"/>`;
  });

  // line + points over the bars
  const pts = days.map((d, i) => `${x(i)},${y(vals[i])}`).join(" ");
  let dots = "";
  days.forEach((d, i) => {
    if (vals[i] <= 0) return;
    dots += `<circle cx="${x(i)}" cy="${y(vals[i])}" r="3.5" fill="${C.accent}"/>`;
  });

  // x labels (show every other day to avoid clutter)
  let xlabels = "";
  days.forEach((d, i) => {
    if (i % 2 !== 0 && i !== n - 1) return;
    const label = d.slice(5); // MM-DD
    xlabels += `<text x="${x(i)}" y="${H - 8}" fill="${C.muted}" font-size="10" text-anchor="middle">${label}</text>`;
  });

  host.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Daily high score chart">
      ${grid}
      ${bars}
      <polyline points="${pts}" fill="none" stroke="${C.accent}" stroke-width="2"/>
      ${dots}
      ${xlabels}
    </svg>`;
}

function renderRecent(runs) {
  const host = $("recent-runs");
  if (runs.length === 0) {
    host.innerHTML = `<div class="empty">No runs yet.</div>`;
    return;
  }
  const last = runs.slice().reverse().slice(0, 12);
  const reasonLabel = { wrong: "missed", time: "time up", quit: "quit" };
  host.innerHTML = last.map(r => {
    const dt = new Date(r.ts);
    const when = `${r.day.slice(5)} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
    // accuracy is meaningless in auto-submit; show sec/question there instead
    const mid = (r.config && r.config.autoSubmit)
      ? (r.score ? `${(r.elapsed / r.score).toFixed(1)}s/q` : "–")
      : `${r.attempts ? Math.round((r.score / r.attempts) * 100) : 0}% acc`;
    return `<div class="run-row">
      <span class="muted">${when}</span>
      <span class="muted">${reasonLabel[r.reason] || r.reason}</span>
      <span class="muted">${mid}</span>
      <span class="run-score">${r.score}</span>
    </div>`;
  }).join("");
}

function renderOpBreakdown(runs) {
  const host = $("op-breakdown");
  const totals = {};
  for (const r of runs) {
    if (!r.opStats) continue;
    for (const [op, s] of Object.entries(r.opStats)) {
      if (!totals[op]) totals[op] = { correct: 0, wrong: 0 };
      totals[op].correct += s.correct || 0;
      totals[op].wrong   += s.wrong   || 0;
    }
  }
  const ops = Object.keys(totals);
  if (ops.length === 0) {
    host.innerHTML = `<div class="empty">No data yet.</div>`;
    return;
  }
  host.innerHTML = ["add","sub","mul","div"].filter(op => totals[op]).map(op => {
    const t = totals[op];
    const total = t.correct + t.wrong;
    const pct = total ? Math.round((t.correct / total) * 100) : 0;
    return `<div class="op-bar-row">
      <span>${OP_LABELS[op]}</span>
      <span class="op-bar-track"><span class="op-bar-fill" style="width:${pct}%"></span></span>
      <span class="muted">${pct}% (${t.correct}/${total})</span>
    </div>`;
  }).join("");
}

/* ============================================================
   DATA EXPORT / RESET
   ============================================================ */
function exportData() {
  const blob = new Blob([JSON.stringify(loadRuns(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zetamacpp-stats-${dayKey(Date.now())}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function resetData() {
  if (confirm("Delete ALL saved runs and stats? This cannot be undone.")) {
    localStorage.removeItem(STORE_KEY);
    renderStats();
  }
}

/* ============================================================
   VIEW ROUTING
   ============================================================ */
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const map = { setup: "view-setup", game: "view-game", results: "view-results", stats: "view-stats" };
  $(map[name]).classList.add("active");
}

function switchTab(view) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
  if (view === "play") {
    // if a game is mid-flight, stay in it; else show setup
    if (game.active) showView("game");
    else showView("setup");
  } else {
    if (game.active) quitGame();
    renderStats();
    showView("stats");
  }
}

/* ============================================================
   EVENT WIRING
   ============================================================ */
function init() {
  // offline support: cache the app shell so an installed copy runs without the
  // server. Only possible on secure origins (https or localhost) — on a plain
  // http:// LAN address the browser doesn't allow service workers, so skip.
  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  const saved = loadConfig();
  applyConfigToForm(saved);
  // fresh install: default the keypad on for touch devices (phones/tablets)
  if (!saved) $("keypad-toggle").checked = isTouchDevice();
  updateModeHint();
  $("mode-toggle").addEventListener("change", updateModeHint);

  // themes (migrate keys from before the serika-default rename)
  let savedTheme = localStorage.getItem(THEME_KEY) || "";
  if (savedTheme === "8008") savedTheme = "sakura";
  if (savedTheme === "serika") savedTheme = "";   // serika is now the default
  applyTheme(savedTheme);
  document.querySelectorAll(".theme-chip").forEach((chip) =>
    chip.addEventListener("click", () => applyTheme(chip.dataset.theme || ""))
  );

  $("start-btn").addEventListener("click", startGame);
  $("quit-btn").addEventListener("click", () => { quitGame(); });
  $("again-btn").addEventListener("click", startGame);
  $("settings-btn").addEventListener("click", () => showView("setup"));
  $("export-btn").addEventListener("click", exportData);
  $("reset-btn").addEventListener("click", resetData);
  $("reset-settings").addEventListener("click", resetSettings);
  $("repeat-btn").addEventListener("click", repeatProblem);

  // auto-submit / auto-clear checks on every keystroke
  $("answer").addEventListener("input", handleAutoInput);

  // big-button keypad — react on pointerdown (finger touch) instead of click
  // (finger lift) so taps register with zero perceived latency
  const keypadEl = $("keypad");
  keypadEl.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest("button");
    if (!btn || !game.active) return;
    e.preventDefault();               // keep focus; suppress the ghost click
    btn.classList.add("pressed");
    const inp = $("answer");
    const k = btn.dataset.k;
    if (k === "back") {
      inp.value = inp.value.slice(0, -1);
    } else if (k === "action") {
      if (game.cfg.autoSubmit) inp.value = "";   // "C" = clear
      else { submitAnswer(); return; }           // "↵" = submit
    } else {
      inp.value += k;
    }
    handleAutoInput();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
    keypadEl.addEventListener(ev, () => {
      keypadEl.querySelectorAll(".pressed").forEach((b) => b.classList.remove("pressed"));
    })
  );

  // Enter to submit during a game
  $("answer").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // stop the event from bubbling to the document handler below — otherwise
      // the Enter that submits a losing answer would also fire "play again".
      e.stopPropagation();
      submitAnswer();
    }
  });

  // Enter on results -> play again
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && $("view-results").classList.contains("active")) {
      e.preventDefault();
      startGame();
      return;
    }
    // T -> restart: fresh run mid-game, or a new run from the results screen
    if (e.key === "t" || e.key === "T") {
      if (game.active) { e.preventDefault(); restartGame(); return; }
      if ($("view-results").classList.contains("active")) { e.preventDefault(); startGame(); return; }
    }
    // listen mode: R re-reads the problem (and shouldn't be typed into the box)
    if (game.active && game.cfg && game.cfg.audioMode && (e.key === "r" || e.key === "R")) {
      e.preventDefault();
      repeatProblem();
    }
  });

  // tab nav
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.view));
  });

  // stats mode filter (All / Auto-submit / Sudden death / Listen)
  document.querySelectorAll("#mode-filter .seg").forEach(seg => {
    seg.addEventListener("click", () => {
      statsMode = seg.dataset.mode;
      document.querySelectorAll("#mode-filter .seg")
        .forEach(s => s.classList.toggle("active", s.dataset.mode === statsMode));
      renderStats();
    });
  });

  showView("setup");
}

document.addEventListener("DOMContentLoaded", init);
