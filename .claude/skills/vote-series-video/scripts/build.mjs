#!/usr/bin/env node
// Build a HyperFrames project for one vote-series episode.
//
//   node build.mjs <episode.json> --out <projectDir> [--force-voice] [--no-voice]
//
// 1. collects every narration line, 2. runs voice.py (Kokoro TTS + word
// timings, cached by content hash), 3. writes index.html, one composition per
// scene, the HUD and the karaoke captions, and copies the sound effects.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { C, W, H, esc, rng, hashStr, fitFont, r2, S as STR, setLang, fmt } from "./lib/util.mjs";
import { character, EXPRESSIONS, POSES } from "./lib/character.mjs";
import { background, prop, icon, sunburst } from "./lib/art.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const epPath = args.find((a) => !a.startsWith("--"));
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
if (!epPath) {
  console.error("usage: node build.mjs <episode.json> --out <projectDir> [--force-voice]");
  process.exit(1);
}

const ep = JSON.parse(fs.readFileSync(epPath, "utf8"));
const seriesPath = path.resolve(path.dirname(epPath), ep.series || "series.json");
const series = JSON.parse(fs.readFileSync(seriesPath, "utf8"));
const OUT = path.resolve(opt("out", path.join(path.dirname(epPath), `ep${String(ep.episode).padStart(2, "0")}`)));
fs.mkdirSync(path.join(OUT, "compositions"), { recursive: true });
fs.mkdirSync(path.join(OUT, "assets", "sfx"), { recursive: true });

const LANG = series.lang || "en";
setLang(LANG, series.strings || {});
const castLooks = series.cast || {};
const hero = series.hero || Object.keys(castLooks)[0];
const heroName = series.heroName || (hero ? hero[0].toUpperCase() + hero.slice(1) : "HERO");

// ------------------------------------------------------------------ 1. lines
const scenes = ep.scenes.map((s, i) => ({ ...s, idx: i, sid: `s${String(i + 1).padStart(2, "0")}` }));
const lines = [];
for (const s of scenes) {
  const says = Array.isArray(s.say) ? s.say : [s.say];
  const texts = s.text == null ? [] : Array.isArray(s.text) ? s.text : [s.text];
  s.lineIds = says.map((txt, k) => {
    const id = `${s.sid}-${k}`;
    const pauses = Array.isArray(s.pauseAfter) ? s.pauseAfter : [];
    const lastPause = k === says.length - 1 && typeof s.pauseAfter === "number" ? s.pauseAfter : 0;
    const ln = { id, text: txt, display: texts[k] ?? null, pauseAfter: pauses[k] ?? lastPause };
    if (s.voice) Object.assign(ln, { voice: s.voice.id, speed: s.voice.speed });
    lines.push(ln);
    return id;
  });
}

// ------------------------------------------------------------------ 2. voice
const voice = { provider: "kokoro", id: "am_michael", speed: 1.12, lang: LANG === "en" ? "en-us" : LANG, ...(series.voice || {}), ...(ep.voice || {}) };
if (opt("voice-provider")) voice.provider = opt("voice-provider");
const audioIn = opt("audio") ? path.resolve(opt("audio")) : null;
if (audioIn) {
  // a finished voiceover (own recording, or TTS made on a website): align it to the script
  const st = fs.statSync(audioIn);
  Object.assign(voice, { provider: "recording", id: path.basename(audioIn), file: `${st.size}-${st.mtimeMs}` });
}
if (voice.provider === "auto") {
  // first voice service whose key is available in this environment
  const hasHeygen = process.env.HEYGEN_API_KEY || process.env.HEYGEN_ACCESS_TOKEN || fs.existsSync(path.join(process.env.HOME || "", ".hyperframes", "credentials")) || fs.existsSync(path.join(process.env.HOME || "", ".hyperframes", "credentials.json"));
  voice.provider = process.env.ELEVENLABS_API_KEY ? "elevenlabs" : hasHeygen ? "heygen" : LANG === "en" ? "kokoro" : null;
  if (!voice.provider) {
    console.error("voice: no voice service for this language. Set ELEVENLABS_API_KEY or HEYGEN_API_KEY (environment secret) and allow api.elevenlabs.io / api.heygen.com in the network settings, or use --voice-provider silent for a picture preview.");
    process.exit(2);
  }
}
const voiceIn = lines.map(({ id, text, pauseAfter, voice: v, speed }) => ({ id, text, pauseAfter, ...(v ? { voice: v } : {}), ...(speed ? { speed } : {}) }));
const hash = crypto.createHash("sha1").update(JSON.stringify({ voiceIn, voice })).digest("hex").slice(0, 12);
const timingPath = path.join(OUT, "assets", "timing.json");
const hashPath = path.join(OUT, "assets", ".voice-hash");
const cached = fs.existsSync(timingPath) && fs.existsSync(hashPath) && fs.readFileSync(hashPath, "utf8") === hash;
if (!cached || flag("force-voice")) {
  const lp = path.join(OUT, "assets", "lines.json");
  fs.writeFileSync(lp, JSON.stringify(voiceIn, null, 1));
  console.error(`voice: ${voice.provider} ${voice.id} @ ${voice.speed}x, ${lines.length} lines`);
  const py = process.env.HYPERFRAMES_PYTHON || "python3";
  const r = spawnSync(py, ["-I", path.join(HERE, "voice.py"), "--lines", lp, "--out-dir", path.join(OUT, "assets"), "--provider", voice.provider, "--voice", voice.id, "--speed", String(voice.speed), "--lang", voice.lang, ...(audioIn ? ["--audio", audioIn] : [])], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
  fs.writeFileSync(hashPath, hash);
} else console.error("voice: cached");
const timing = JSON.parse(fs.readFileSync(timingPath, "utf8"));
const lineT = Object.fromEntries(timing.lines.map((l) => [l.id, l]));

// ------------------------------------------------------------------ 3. scene clock
const TAIL = ep.tail ?? 1.4;
const TOTAL = r2(timing.lines[timing.lines.length - 1].end + TAIL);
scenes.forEach((s, i) => {
  const first = lineT[s.lineIds[0]];
  s.start = i === 0 ? 0 : r2(Math.max(0, first.start - 0.06));
});
scenes.forEach((s, i) => {
  s.end = i < scenes.length - 1 ? scenes[i + 1].start : TOTAL;
  s.dur = r2(s.end - s.start);
  s.words = s.lineIds.flatMap((id) => lineT[id].words.map((w) => ({ ...w, rs: r2(w.start - s.start), key: w.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") })));
  s.lineStarts = s.lineIds.map((id) => r2(lineT[id].start - s.start));
  s.lineEnds = s.lineIds.map((id) => r2(lineT[id].end - s.start));
});

// "1.2" | 1.2 | "L2" | "L2+0.3" | "w:rip" | "w:rip#2-0.1" | "end-0.5"  -> seconds from scene start
function at(s, v, def = 0) {
  if (v == null) return def;
  if (typeof v === "number") return v;
  const m = String(v).trim().match(/^(L\d+|w:[^+\-#]+(?:#\d+)?|end|start)?\s*([+-]\s*[\d.]+)?$/i);
  if (!m) return parseFloat(v) || def;
  let base = 0;
  const key = m[1] || "start";
  if (/^L\d+$/i.test(key)) base = s.lineStarts[parseInt(key.slice(1))] ?? 0;
  else if (/^end$/i.test(key)) base = s.dur;
  else if (/^w:/i.test(key)) {
    const [word, nth] = key.slice(2).split("#");
    const k = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const hits = s.words.filter((w) => w.key === k || w.key.startsWith(k));
    const hit = hits[(parseInt(nth) || 1) - 1];
    if (!hit) console.warn(`  ! ${s.sid}: word "${word}" not found, using scene start`);
    base = hit ? hit.rs : 0;
  }
  return r2(Math.max(0, base + (m[2] ? parseFloat(m[2].replace(/\s/g, "")) : 0)));
}

// ------------------------------------------------------------------ sfx
const SFX_DIRS = [
  path.resolve(HERE, "../../media-use/audio/assets/sfx"),
  ...(() => {
    const base = path.join(process.env.HOME || "", ".npm/_npx");
    try {
      return fs.readdirSync(base).map((d) => path.join(base, d, "node_modules/hyperframes/dist/skills/media-use/audio/assets/sfx"));
    } catch {
      return [];
    }
  })(),
];
const sfxDir = SFX_DIRS.find((d) => fs.existsSync(path.join(d, "manifest.json")));
const sfxOut = [];
const sfxManifest = sfxDir ? JSON.parse(fs.readFileSync(path.join(sfxDir, "manifest.json"), "utf8")) : {};
const SFX_VOL = { pop: 0.5, notification: 0.45, "click-soft": 0.5, click: 0.45, error: 0.4, chime: 0.4, "impact-bass-1": 0.45, "impact-bass-2": 0.45, "whoosh-short": 0.35, whoosh: 0.35, sparkle: 0.4, ping: 0.4, riser: 0.3 };
function sfx(name, absT, vol) {
  if (!name || !sfxDir) return;
  const file = `${name}.mp3`;
  if (!fs.existsSync(path.join(sfxDir, file))) return console.warn(`  ! sfx "${name}" not in bundled library`);
  const dst = path.join(OUT, "assets", "sfx", file);
  if (!fs.existsSync(dst)) fs.copyFileSync(path.join(sfxDir, file), dst);
  const dur = sfxManifest[name]?.duration ?? 1;
  sfxOut.push({ name, t: r2(Math.max(0, absT - 0.02)), dur: r2(dur), vol: vol ?? SFX_VOL[name] ?? 0.4 });
}
const AUTO_SFX = { burst: "pop", sticker: "pop", bigText: "impact-bass-1", sign: "pop", thought: "pop", bubble: "click-soft", label: "click-soft", chip: "click-soft", wallet: "error", calendar: "pop" };

// ------------------------------------------------------------------ animation writer
// Every animated SVG node carries a transform attribute with a fixed format; the
// timeline tweens that attribute (GSAP interpolates the numbers), so seeking is
// deterministic. HTML nodes (camera) use normal GSAP transforms.
class Anim {
  constructor() {
    this.lines = [];
  }
  attr(sel, from, to, t, d, ease = "power2.out", extra = "") {
    this.lines.push(`tl.fromTo("${sel}",{attr:${JSON.stringify(from)}},{attr:${JSON.stringify(to)},duration:${r2(d)},ease:"${ease}",immediateRender:false${extra}},${r2(t)});`);
  }
  set(sel, attrs, t) {
    this.lines.push(`tl.set("${sel}",{attr:${JSON.stringify(attrs)}},${r2(t)});`);
  }
  raw(s) {
    this.lines.push(s);
  }
}

const popT = (x, y, r, s) => `translate(${r2(x)} ${r2(y)}) rotate(${r2(r)}) scale(${r2(s)})`;

function animProp(A, id, kind, t, x, y, rot, sc, exitT) {
  const sel = `#${id}`;
  switch (kind) {
    case "none":
      break;
    case "fade":
      A.attr(sel, { opacity: 0 }, { opacity: 1 }, t, 0.2);
      break;
    case "slideUp":
      A.attr(sel, { opacity: 0, transform: popT(x, y + 70, rot, sc) }, { opacity: 1, transform: popT(x, y, rot, sc) }, t, 0.22, "power3.out");
      break;
    case "slideDown":
      A.attr(sel, { opacity: 0, transform: popT(x, y - 90, rot, sc) }, { opacity: 1, transform: popT(x, y, rot, sc) }, t, 0.25, "back.out(1.6)");
      break;
    case "slideLeft":
      A.attr(sel, { opacity: 1, transform: popT(x + 900, y, rot, sc) }, { opacity: 1, transform: popT(x, y, rot, sc) }, t, 0.3, "power3.out");
      break;
    case "slideRight":
      A.attr(sel, { opacity: 1, transform: popT(x - 900, y, rot, sc) }, { opacity: 1, transform: popT(x, y, rot, sc) }, t, 0.3, "power3.out");
      break;
    case "drop":
      A.attr(sel, { opacity: 1, transform: popT(x, y - 1400, rot, sc) }, { opacity: 1, transform: popT(x, y, rot, sc) }, t, 0.45, "bounce.out");
      break;
    case "pulse":
      A.attr(sel, { opacity: 0.6, transform: `scale(1)` }, { opacity: 0, transform: `scale(1.35)` }, t, 0.9, "power1.out", ",repeat:12");
      break;
    case "pop":
    default:
      A.attr(sel, { opacity: 0, transform: popT(x, y, rot - 8, sc * 0.2) }, { opacity: 1, transform: popT(x, y, rot + 3, sc * 1.12) }, t, 0.16, "power3.out");
      A.attr(sel, { transform: popT(x, y, rot + 3, sc * 1.12) }, { transform: popT(x, y, rot, sc) }, t + 0.16, 0.14, "power2.inOut");
  }
  if (exitT != null) A.attr(sel, { opacity: 1 }, { opacity: 0 }, exitT, 0.15, "power1.in");
}

// ------------------------------------------------------------------ characters in a scene
function castMarkup(s, c, ci, A) {
  const look = { ...(castLooks[c.who] || {}), ...(c.lookOverride || {}) };
  const cid = `${s.sid}-${c.who}${ci}`;
  const faces = (c.faces || []).map(([t, f]) => [at(s, t), f]);
  const poses = (c.poses || []).map(([t, p]) => [at(s, t), p]);
  const exprs = [c.face || "neutral", ...faces.map((f) => f[1])];
  for (const e of exprs) if (!EXPRESSIONS.includes(e)) throw new Error(`${s.sid}: unknown face "${e}". Known: ${EXPRESSIONS.join(", ")}`);
  const x = c.x ?? 540, y = c.y ?? 1600, sc = c.scale ?? 1;
  const svg = character(cid, look, { x, y, scale: sc, flip: c.flip, pose: c.pose || "stand", exprs, initial: c.face || "neutral", look: c.lookAt });
  const R = rng(hashStr(cid));

  // idle breath
  const reps = Math.max(1, Math.floor(s.dur / 0.95));
  A.attr(`#${cid}-rig`, { transform: "scale(1 1)" }, { transform: "scale(1.012 0.985)" }, R() * 0.3, 0.95, "sine.inOut", `,repeat:${reps},yoyo:true`);
  // blinks (skip while sleepy/joy)
  const lidT = (k) => `matrix(1 0 0 ${k} 0 ${r2(-787 * (1 - k))})`;
  const blinkable = (t) => {
    let f = c.face || "neutral";
    for (const [ft, fe] of faces) if (ft <= t) f = fe;
    return !["sleepy", "joy"].includes(f);
  };
  for (let t = 0.6 + R() * 1.2; t < s.dur - 0.3; t += 2.2 + R() * 1.6) {
    if (!blinkable(t)) continue;
    for (const k of ["L", "R"]) {
      A.attr(`#${cid}-lid${k}`, { transform: lidT(0.001) }, { transform: lidT(1) }, t, 0.06, "power1.in");
      A.attr(`#${cid}-lid${k}`, { transform: lidT(1) }, { transform: lidT(0.001) }, t + 0.09, 0.08, "power1.out");
    }
  }
  // sleepy face keeps lids half shut
  const sleepyAt = [[0, c.face || "neutral"], ...faces].filter(([, f]) => f === "sleepy");
  for (const [t] of sleepyAt) for (const k of ["L", "R"]) A.set(`#${cid}-lid${k}`, { transform: lidT(0.5) }, t);
  // face changes: anticipation squash, swap, settle
  let prev = c.face || "neutral";
  for (const [t, f] of faces) {
    A.attr(`#${cid}-sq`, { transform: "scale(1 1)" }, { transform: "scale(1.05 0.93)" }, Math.max(0, t - 0.08), 0.08, "power2.in");
    A.set(`#${cid}-xp-${prev}`, { opacity: 0 }, t);
    A.set(`#${cid}-xp-${f}`, { opacity: 1 }, t);
    A.attr(`#${cid}-sq`, { transform: "scale(1.05 0.93)" }, { transform: "scale(0.97 1.04)" }, t, 0.1, "power2.out");
    A.attr(`#${cid}-sq`, { transform: "scale(0.97 1.04)" }, { transform: "scale(1 1)" }, t + 0.1, 0.16, "power2.inOut");
    if (prev === "sleepy") for (const k of ["L", "R"]) A.set(`#${cid}-lid${k}`, { transform: lidT(0.001) }, t);
    prev = f;
  }
  // pose changes (arms rotate about the shoulder; offset so they never move in unison)
  let curPose = POSES[c.pose || "stand"] || POSES.stand;
  const hw = look.build === "chubby" ? 220 : look.build === "slim" ? 150 : 180;
  for (const [t, p] of poses) {
    const next = POSES[p];
    if (!next) throw new Error(`${s.sid}: unknown pose "${p}". Known: ${Object.keys(POSES).join(", ")}`);
    [["L", -1, 0], ["R", 1, 1]].forEach(([k, side, i]) => {
      const ox = side * (hw - 6);
      A.attr(`#${cid}-arm${k}`, { transform: `rotate(${curPose[i]} ${ox} -505)` }, { transform: `rotate(${next[i]} ${ox} -505)` }, t + i * 0.05, 0.28, "back.out(1.7)");
    });
    curPose = next;
  }
  // flies orbit the head
  if (look.flies) {
    for (let i = 0; i < 3; i++) {
      const dir = i % 2 ? -1 : 1, period = 1.4 + i * 0.5, a0 = R() * 360;
      A.attr(`#${cid}-fly${i}`, { transform: `rotate(${r2(a0)})` }, { transform: `rotate(${r2(a0 + dir * 360)})` }, 0, period, "none", `,repeat:${Math.ceil(s.dur / period)}`);
    }
  }
  // entrance / movement
  const mv = `${cid}-mv`;
  if (c.enter && c.enter !== "none") {
    const t = at(s, c.enterAt, 0);
    const from = { slideLeft: "translate(900 0)", slideRight: "translate(-900 0)", drop: "translate(0 -1600)", rise: "translate(0 900)" }[c.enter] || "translate(0 0)";
    if (c.enter === "pop") {
      A.attr(`#${mv}`, { opacity: 0 }, { opacity: 1 }, t, 0.12);
      A.attr(`#${cid}-sq`, { transform: "scale(0.6 0.6)" }, { transform: "scale(1 1)" }, t, 0.35, "back.out(2)");
    } else A.attr(`#${mv}`, { opacity: 1, transform: from }, { opacity: 1, transform: "translate(0 0)" }, t, c.enter === "drop" ? 0.5 : 0.35, c.enter === "drop" ? "bounce.out" : "power3.out");
  }
  let pos = [0, 0];
  for (const m of c.moves || []) {
    const t = at(s, m.at), d = m.dur ?? 0.5;
    const to = [(m.x ?? x) - x, (m.y ?? y) - y];
    A.attr(`#${mv}`, { transform: `translate(${pos[0]} ${pos[1]})` }, { transform: `translate(${r2(to[0])} ${r2(to[1])})` }, t, d, m.ease || "power2.inOut");
    if (m.hop !== false) A.attr(`#${cid}-sq`, { transform: "scale(1 1)" }, { transform: "scale(0.98 1.03)" }, t, d / 4, "sine.inOut", `,repeat:3,yoyo:true`);
    pos = to;
  }
  if (c.exit != null) A.attr(`#${mv}`, { opacity: 1 }, { opacity: 0 }, at(s, c.exit), 0.15);
  const dim = c.dim ? `<rect x="-400" y="-1100" width="800" height="1200" fill="#000" opacity="0"/>` : "";
  return `<g id="${mv}" transform="translate(0 0)" opacity="${c.enter && c.enter !== "none" && c.enter !== "pop" ? 1 : c.enter === "pop" ? 0 : 1}"${c.dim ? ` style="filter:brightness(${c.dim})"` : ""}>${svg}${dim}</g>`;
}

// ------------------------------------------------------------------ props in a scene
function propsMarkup(s, list, A, z) {
  let out = "";
  (list || []).forEach((p, pi) => {
    if ((p.z || "front") !== z) return;
    const id = `${s.sid}-p${pi}`;
    const ctx = { anim: (cid, t, kind) => animProp(A, cid, kind, at(s, t), 0, 0, 0, 1) };
    const x = p.x ?? 540, y = p.y ?? 800, rot = p.rot ?? 0, sc = p.scale ?? 1;
    const hasAt = p.at != null;
    const kind = p.anim || (hasAt ? "pop" : "none");
    const t = at(s, p.at, 0);
    const startHidden = kind !== "none" && kind !== "pulse";
    out += `<g id="${id}" transform="${popT(x, y, rot, sc)}" opacity="${startHidden ? 0 : 1}">${prop(p, id, ctx)}</g>`;
    animProp(A, id, kind, t, x, y, rot, sc, p.exit != null ? at(s, p.exit) : null);
    if (p.type === "burst" && p.wiggle !== false) {
      const until = p.exit != null ? at(s, p.exit) : s.dur;
      const n = Math.floor((until - t - 0.34) / 0.18);
      if (n >= 1) A.attr(`#${id}`, { transform: popT(x, y, rot, sc) }, { transform: popT(x, y, rot + 4, sc * 1.03) }, t + 0.32, 0.18, "sine.inOut", `,repeat:${n - 1},yoyo:true`);
    }
    const snd = p.sfx === false ? null : p.sfx || (hasAt ? AUTO_SFX[p.type] : null);
    if (snd) sfx(snd, s.start + t);
    if (p.type === "phone") {
      (p.notifications || (p.notif ? [p.notif] : [])).forEach((n) => p.sfx !== false && sfx("notification", s.start + at(s, n.at, 0.2), 0.35));
      (p.messages || []).forEach((m, i) => p.sfx !== false && sfx(m.from === "me" ? "click-soft" : "pop", s.start + at(s, m.at, 0.2 + i * 0.6), 0.35));
    }
  });
  return out;
}

// ------------------------------------------------------------------ special scenes
function voteMarkup(s, A) {
  const v = s;
  const heroLook = { ...(castLooks[v.heroWho || hero] || {}), ...(v.lookOverride || {}) };
  let svg = sunburst(v.color || "#2a2152", 22);
  svg += character(`${s.sid}-bgc`, heroLook, { x: 540, y: 2780, scale: 1.75, pose: "stand", initial: v.face || "sad" });
  svg += `<rect width="${W}" height="${H}" fill="#0d0a1e" opacity="0.58"/>`;
  const q = v.question || fmt(STR.question, { hero: heroName.toUpperCase() });
  const [q1, q2] = (() => {
    const w = q.split(" ");
    const cut = Math.ceil(w.length / 2) - (w.length > 3 ? 0 : 0);
    return [w.slice(0, w.length - 2).join(" "), w.slice(w.length - 2).join(" ")];
  })();
  const tq = at(s, v.questionAt ?? "L0");
  svg += `<g id="${s.sid}-q" transform="${popT(540, 500, 0, 1)}" opacity="0">
    <text x="0" y="-20" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${fitFont(q1, 900, 96)}" fill="#fff" stroke="${C.ink}" stroke-width="12" paint-order="stroke">${esc(q1.toUpperCase())}</text>
    <text x="0" y="90" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${fitFont(q2, 900, 104)}" fill="${C.yellow}" stroke="${C.ink}" stroke-width="12" paint-order="stroke">${esc(q2.toUpperCase())}</text></g>`;
  animProp(A, `${s.sid}-q`, "pop", tq, 540, 500, 0, 1);
  sfx("whoosh-short", s.start + tq, 0.3);
  const card = (key, color, y) => {
    const o = v[key];
    const id = `${s.sid}-${key}`;
    const lines = wrap(o.text, 18);
    let g = `<rect x="-430" y="-95" width="860" height="190" rx="34" fill="${color}" stroke="#fff" stroke-width="8"/><rect x="-430" y="-95" width="860" height="190" rx="34" fill="none" stroke="${C.ink}" stroke-width="3"/>`;
    g += `<circle cx="-330" cy="0" r="58" fill="#fff"/><text x="-330" y="26" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="74" fill="${color}">${key.toUpperCase()}</text>`;
    lines.forEach((l, i) => (g += `<text x="-245" y="${(i - (lines.length - 1) / 2) * 56 + 18}" font-family="Montserrat" font-weight="800" font-size="46" fill="#fff">${esc(l)}</text>`));
    if (o.icon) g += `<g transform="translate(340 0) scale(1.1)">${icon(o.icon)}</g>`;
    if (o.tag) g += `<g transform="translate(300 -95) rotate(6)"><rect x="-130" y="-30" width="260" height="60" rx="10" fill="#fff" stroke="${C.ink}" stroke-width="5"/><text x="0" y="12" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="32" fill="${C.ink}">${esc(o.tag)}</text></g>`;
    const t = at(s, o.at ?? (key === "a" ? "L1" : "L2"));
    animProp(A, id, "pop", t, 540, y, 0, 1);
    sfx("pop", s.start + t, 0.5);
    return `<g id="${id}" transform="${popT(540, y, 0, 1)}" opacity="0">${g}</g>`;
  };
  svg += card("a", C.blue, 790) + card("b", C.orange, 1010);
  const cta = v.cta || STR.cta;
  const tc = at(s, v.ctaAt ?? "L3");
  const cw = cta.length * 24 + 80;
  svg += `<g id="${s.sid}-cta" transform="${popT(540, 1175, 0, 1)}" opacity="0"><rect x="${-cw / 2}" y="-44" width="${cw}" height="88" rx="44" fill="#fff" stroke="${C.ink}" stroke-width="6"/><text x="0" y="14" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="40" fill="${C.ink}">${esc(cta)}</text></g>`;
  animProp(A, `${s.sid}-cta`, "slideUp", tc, 540, 1175, 0, 1);
  return svg;
}

function recapMarkup(s, A) {
  const v = s;
  let svg = sunburst(v.color || "#2a2152", 22);
  svg += character(`${s.sid}-bgc`, { ...(castLooks[v.heroWho || hero] || {}), ...(v.lookOverride || {}) }, { x: 540, y: 2250, scale: 1.6, initial: v.face || "grin" });
  svg += `<rect width="${W}" height="${H}" fill="#0d0a1e" opacity="0.35"/>`;
  svg += `<text x="540" y="440" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${fitFont(v.title1 || STR.recap1, 940, 58)}" fill="#fff" stroke="${C.ink}" stroke-width="10" paint-order="stroke">${esc(v.title1 || STR.recap1)}</text>`;
  svg += `<text x="540" y="515" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${fitFont(v.title2 || STR.recap2, 940, 66)}" fill="${C.yellow}" stroke="${C.ink}" stroke-width="10" paint-order="stroke">${esc(v.title2 || STR.recap2)}</text>`;
  const row = (key, color, y) => {
    const o = v[key];
    const id = `${s.sid}-${key}`;
    const t = at(s, o.at ?? "L0+0.3");
    let g = `<rect x="-440" y="-80" width="880" height="160" rx="30" fill="#221b44" stroke="#fff" stroke-width="6"/>`;
    g += `<circle cx="-355" cy="0" r="56" fill="#fff" stroke="${C.ink}" stroke-width="5"/><g transform="translate(-355 0) scale(0.9)">${icon(o.icon)}</g>`;
    g += `<text x="-275" y="-12" font-family="Montserrat" font-weight="800" font-size="42" fill="#fff">${esc(o.text)}</text>`;
    g += `<rect x="-275" y="18" width="560" height="38" rx="19" fill="#3b3366"/><rect id="${id}-bar" x="-275" y="18" width="0" height="38" rx="19" fill="${color}"/>`;
    g += `<text x="400" y="48" text-anchor="end" font-family="Montserrat" font-weight="900" font-size="46" fill="#fff">${o.pct}%</text>`;
    animProp(A, id, "slideUp", t, 540, y, 0, 1);
    A.attr(`#${id}-bar`, { width: 0 }, { width: r2((560 * o.pct) / 100) }, t + 0.2, 0.9, "power2.out");
    let tag = "";
    if (v.winner === key) {
      const tw = at(s, v.winnerAt ?? "L1");
      tag = `<g id="${id}-win" transform="${popT(830, y - 80, 8, 1)}" opacity="0"><rect x="-130" y="-34" width="260" height="68" rx="12" fill="${C.green}" stroke="${C.ink}" stroke-width="6"/><text x="0" y="14" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="38" fill="#fff">${esc(v.winnerText || STR.winner)}</text></g>`;
      animProp(A, `${id}-win`, "pop", tw, 830, y - 80, 8, 1);
      sfx("chime", s.start + tw, 0.35);
    }
    return `<g id="${id}" transform="${popT(540, y, 0, 1)}" opacity="0">${g}</g>${tag}`;
  };
  svg += row("a", C.blue, 760) + row("b", C.orange, 960);
  return svg;
}

function wrap(text, n) {
  const out = [];
  let cur = "";
  for (const w of String(text).split(/\s+/)) {
    if ((cur + " " + w).trim().length > n && cur) {
      out.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  return out.slice(0, 2);
}

// ------------------------------------------------------------------ write scene files
for (const s of scenes) {
  const A = new Anim();
  let svg;
  if (s.kind === "vote") svg = voteMarkup(s, A) + propsMarkup(s, s.props, A, "front");
  else if (s.kind === "recap") svg = recapMarkup(s, A) + propsMarkup(s, s.props, A, "front");
  else {
    svg = background(s.bg || { type: "room" });
    svg += propsMarkup(s, s.props, A, "back");
    (s.cast || []).forEach((c, ci) => (svg += castMarkup(s, c, ci, A)));
    svg += propsMarkup(s, s.props, A, "front");
  }
  for (const x of s.sfx || []) sfx(x.name, s.start + at(s, x.at), x.vol);
  // camera
  const cam = s.camera || (s.kind ? "none" : "push");
  const cs = `#${s.sid}-cam`;
  if (cam === "push") A.raw(`tl.fromTo("${cs}",{scale:1},{scale:1.06,duration:${s.dur},ease:"none"},0);`);
  if (cam === "pull") A.raw(`tl.fromTo("${cs}",{scale:1.08},{scale:1,duration:${s.dur},ease:"power1.out"},0);`);
  if (cam === "punch") A.raw(`tl.fromTo("${cs}",{scale:1.14},{scale:1.02,duration:0.35,ease:"power3.out"},0);`);
  for (const sh of s.shake || []) {
    const t = at(s, sh);
    A.raw(`tl.fromTo("${cs}",{x:0,y:0},{keyframes:[{x:-22,y:10,duration:0.04},{x:18,y:-12,duration:0.04},{x:-12,y:6,duration:0.04},{x:8,y:-4,duration:0.04},{x:0,y:0,duration:0.05}],immediateRender:false},${t});`);
  }
  // flash
  for (const fl of s.flash || []) {
    const t = at(s, fl);
    A.raw(`tl.fromTo("#${s.sid}-flash",{opacity:0.9},{opacity:0,duration:0.35,ease:"power2.out",immediateRender:false},${t});`);
  }
  const html = `<template>
  <style>
    #root { position: absolute; inset: 0; overflow: hidden; background: ${C.night}; }
    #${s.sid}-cam { position: absolute; inset: 0; transform-origin: 50% 55%; }
    #${s.sid}-cam svg { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
    #${s.sid}-flash { position: absolute; inset: 0; background: #fff; opacity: 0; }
  </style>
  <div id="root" data-composition-id="${s.sid}" data-width="${W}" data-height="${H}" data-layout-allow-overflow data-layout-allow-overlap>
    <div id="${s.sid}-cam">
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>
    </div>
    <div id="${s.sid}-flash"></div>
  </div>
  <script>
    (function () {
      const tl = gsap.timeline({ paused: true });
      ${A.lines.join("\n      ")}
      tl.set({}, {}, ${s.dur});
      window.__timelines["${s.sid}"] = tl;
    })();
  </script>
</template>
`;
  fs.writeFileSync(path.join(OUT, "compositions", `${s.sid}.html`), html);
}

// ------------------------------------------------------------------ HUD
const hud = { countdownIcon: "heart", ...(series.hud || {}), ...(ep.hud || {}) };
const daysLeft = ep.daysLeft ?? 30;
const prog = ep.progress ?? null;
const hudEvents = [];
for (const s of scenes) for (const h of s.hudProgress || []) hudEvents.push({ t: r2(s.start + at(s, h.at)), to: h.to, text: h.text ?? `${h.to}%`, pop: h.pop });
const heartSvg = `<svg width="30" height="28" viewBox="-24 -24 48 44"><path d="M 0 16 C -30 -4, -20 -30, 0 -14 C 20 -30, 30 -4, 0 16 Z" fill="${C.red}"/></svg>`;
const icons = { heart: heartSvg, clock: "⏳", money: "$", star: "★" };
const hudHtml = `<template>
  <style>
    #root { position: absolute; inset: 0; pointer-events: none; }
    #hud { position: absolute; left: 0; right: 0; top: 176px; display: flex; flex-direction: column; align-items: center; gap: 12px; font-family: Montserrat, sans-serif; }
    #hud .row { display: flex; gap: 14px; align-items: center; }
    #hud .ep { background: ${C.purple}; color: #fff; font-weight: 900; font-size: 30px; padding: 8px 24px; border-radius: 30px; border: 4px solid #fff; letter-spacing: 1px; }
    #hud .days { background: #1d1834; color: ${C.yellow}; font-weight: 900; font-size: 30px; padding: 8px 24px 8px 18px; border-radius: 30px; border: 4px solid #fff; display: flex; align-items: center; gap: 10px; }
    #hud .bar { display: flex; align-items: center; gap: 14px; background: #1d1834; border: 4px solid #fff; border-radius: 28px; padding: 6px 20px; width: 640px; }
    #hud .lbl { color: #8dffb0; font-weight: 900; font-size: 28px; white-space: nowrap; }
    #hud .track { flex: 1; height: 18px; background: #3b3366; border-radius: 9px; overflow: hidden; }
    #hud-fill { height: 100%; width: ${prog ?? 0}%; background: linear-gradient(90deg, #36c26b, #8dffb0); border-radius: 9px; transform-origin: 0 50%; }
    #hud-val { color: #fff; font-weight: 900; font-size: 26px; min-width: 70px; text-align: right; }
    #hud-plus { position: absolute; right: 230px; top: 128px; color: #8dffb0; font-weight: 900; font-size: 48px; -webkit-text-stroke: 8px ${C.ink}; paint-order: stroke fill; opacity: 0; }
  </style>
  <div id="root" data-composition-id="hud" data-width="${W}" data-height="${H}">
    <div id="hud">
      <div class="row"><div class="ep" id="hud-ep">${esc((hud.episodeLabel || STR.episode).toUpperCase())} ${ep.episode}</div><div class="days" id="hud-days">${icons[hud.countdownIcon] || ""}<span>${esc(hud.countdownText || (hud.countdownLabel ? `${daysLeft} ${hud.countdownLabel}` : fmt(STR.countdown, { n: daysLeft })))}</span></div></div>
      ${hud.progressLabel ? `<div class="bar"><span class="lbl">✦ ${esc(hud.progressLabel)}</span><div class="track"><div id="hud-fill"></div></div><span id="hud-val">${esc(ep.progressText ?? `${prog ?? 0}%`)}</span></div>` : ""}
      <div id="hud-plus"></div>
    </div>
  </div>
  <script>
    (function () {
      const tl = gsap.timeline({ paused: true });
      ${hudEvents.map((e, i) => `tl.to("#hud-fill",{width:"${e.to}%",duration:0.6,ease:"power2.out"},${e.t});
      tl.set("#hud-val",{textContent:${JSON.stringify(e.text)}},${e.t});
      ${e.pop ? `tl.set("#hud-plus",{textContent:${JSON.stringify(e.pop)}},${e.t});tl.fromTo("#hud-plus",{opacity:0,y:20},{opacity:1,y:0,duration:0.2,ease:"back.out(2)",immediateRender:false},${e.t});tl.to("#hud-plus",{opacity:0,duration:0.3},${r2(e.t + 1.6)});` : ""}`).join("\n      ")}
      tl.set({}, {}, ${TOTAL});
      window.__timelines["hud"] = tl;
    })();
  </script>
</template>
`;
if (hudEvents.length) sfx("sparkle", hudEvents[0].t, 0.35);
fs.writeFileSync(path.join(OUT, "compositions", "hud.html"), hudHtml);

// ------------------------------------------------------------------ captions (karaoke)
const groups = [];
for (const s of scenes) {
  if (s.captions === false) continue;
  s.lineIds.forEach((id, k) => {
    const L = lineT[id];
    const lineDef = lines.find((l) => l.id === id);
    const spoken = L.words;
    let words;
    if (lineDef.display) {
      const disp = lineDef.display.split(/\s+/).filter(Boolean);
      if (disp.length === spoken.length) words = disp.map((d, i) => ({ text: d, start: spoken[i].start, end: spoken[i].end }));
      else {
        const t0 = spoken[0].start, t1 = spoken[spoken.length - 1].end;
        const tot = disp.reduce((a, d) => a + d.length + 1, 0);
        let t = t0;
        words = disp.map((d) => {
          const dd = ((t1 - t0) * (d.length + 1)) / tot;
          const w = { text: d, start: r2(t), end: r2(t + dd) };
          t += dd;
          return w;
        });
      }
    } else words = spoken.map((w) => ({ ...w }));
    // groups of 2-3 words, break after punctuation or ~16 chars
    let g = [];
    const flush = () => g.length && (groups.push(g), (g = []));
    for (const w of words) {
      g.push(w);
      const chars = g.map((x) => x.text).join(" ").length;
      if (/[.!?,:;]$/.test(w.text) || g.length >= 3 || chars >= 15) flush();
    }
    flush();
  });
}
const cap = (t) => t.replace(/[.,;:]+$/, "").replace(/^[“"']|[”"']$/g, "").toUpperCase();
let capHtml = "";
let capJs = "";
groups.forEach((g, gi) => {
  const start = r2(Math.max(0.1, g[0].start - 0.04));
  const next = groups[gi + 1];
  const lastEnd = g[g.length - 1].end;
  const end = r2(next && next[0].start - lastEnd < 0.5 ? next[0].start - 0.04 : Math.min(TOTAL, lastEnd + 0.35));
  const text = g.map((w) => cap(w.text)).join(" ");
  const fs_ = fitFont(text, 900, 92, 52);
  const gid = `cg${gi}`;
  capHtml += `<div id="${gid}" class="cg" style="font-size:${fs_}px">${g.map((w, wi) => `<span id="${gid}-w${wi}" class="w">${esc(cap(w.text))}</span>`).join(" ")}</div>\n    `;
  capJs += `tl.set("#${gid}",{opacity:1,visibility:"visible"},${start});tl.fromTo("#${gid}",{scale:0.86},{scale:1,duration:0.12,ease:"back.out(2.2)",immediateRender:false},${start});`;
  g.forEach((w, wi) => {
    capJs += `tl.set("#${gid}-w${wi}",{color:"${C.yellow}"},${r2(Math.max(start, w.start))});`;
    if (wi < g.length - 1) capJs += `tl.set("#${gid}-w${wi}",{color:"#ffffff"},${r2(g[wi + 1].start)});`;
  });
  capJs += `tl.set("#${gid}",{opacity:0,visibility:"hidden"},${end});\n      `;
});
const captionsHtml = `<template>
  <style>
    #root { position: absolute; inset: 0; pointer-events: none; }
    .cg { position: absolute; left: 60px; right: 60px; top: ${ep.captionY ?? 1250}px; text-align: center; font-family: Montserrat, sans-serif; font-weight: 900; line-height: 1.05; color: #fff; opacity: 0; visibility: hidden; overflow: visible; -webkit-text-stroke: 14px ${C.ink}; paint-order: stroke fill; text-shadow: 0 7px 0 rgba(0,0,0,0.45); letter-spacing: 0.5px; }
    .cg .w { color: #fff; }
  </style>
  <div id="root" data-composition-id="captions" data-width="${W}" data-height="${H}">
    ${capHtml}
  </div>
  <script>
    (function () {
      const tl = gsap.timeline({ paused: true });
      ${capJs}
      tl.set({}, {}, ${TOTAL});
      window.__timelines["captions"] = tl;
    })();
  </script>
</template>
`;
fs.writeFileSync(path.join(OUT, "compositions", "captions.html"), captionsHtml);

// ------------------------------------------------------------------ index.html
const hosts = scenes
  .map((s) => `      <div id="${s.sid}" data-composition-id="${s.sid}" data-composition-src="compositions/${s.sid}.html" data-start="${s.start}" data-duration="${s.dur}" data-track-index="1" data-track-kind="graphics" data-width="${W}" data-height="${H}" style="z-index:1"></div>`)
  .join("\n");
// sound effects: each clip lasts its file length; lanes are packed so no two overlap
const laneEnds = [];
const audio = sfxOut
  .sort((a, b) => a.t - b.t)
  .map((x, i) => {
    const end = Math.min(TOTAL, x.t + x.dur);
    let lane = laneEnds.findIndex((e) => e <= x.t);
    if (lane < 0) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = end;
    return `      <audio id="sfx${i}" class="clip" src="assets/sfx/${x.name}.mp3" data-start="${x.t}" data-duration="${r2(end - x.t)}" data-track-index="${5 + lane}" data-volume="${x.vol}"></audio>`;
  })
  .join("\n");
const index = `<!doctype html>
<html lang="${LANG}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(series.title || "Vote series")} — Episode ${ep.episode}</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${C.night}; }
      #root { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}">
${hosts}
      <div id="hud" data-composition-id="hud" data-composition-src="compositions/hud.html" data-start="0" data-duration="${TOTAL}" data-track-index="2" data-track-kind="graphics" data-width="${W}" data-height="${H}" style="z-index:5"></div>
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${TOTAL}" data-track-index="3" data-track-kind="captions" data-width="${W}" data-height="${H}" style="z-index:6"></div>
      <audio id="vo" class="clip" src="assets/voice.wav" data-start="0" data-track-index="4" data-volume="1"></audio>
${audio}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(OUT, "index.html"), index);

// GSAP is vendored so renders never depend on the network
fs.copyFileSync(path.join(HERE, "vendor", "gsap.min.js"), path.join(OUT, "assets", "gsap.min.js"));

// project scaffolding (same shape as `hyperframes init`)
const pj = path.join(OUT, "hyperframes.json");
if (!fs.existsSync(pj)) fs.writeFileSync(pj, JSON.stringify({ $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", paths: { blocks: "compositions", components: "compositions/components", assets: "assets" }, media: { autoProxy: true } }, null, 2));
const pk = path.join(OUT, "package.json");
if (!fs.existsSync(pk)) fs.writeFileSync(pk, JSON.stringify({ name: path.basename(OUT).toLowerCase().replace(/[^a-z0-9-]/g, "-"), private: true, type: "module", scripts: { dev: "npx --yes hyperframes preview", check: "npx --yes hyperframes check", render: "npx --yes hyperframes render" } }, null, 2));
const mj = path.join(OUT, "meta.json");
if (!fs.existsSync(mj)) fs.writeFileSync(mj, JSON.stringify({ id: path.basename(OUT), name: `${series.title || "Episode"} ${ep.episode}` }, null, 2));

// a plain-text script for the caption/description
const script = scenes.map((s) => `[${s.start.toFixed(1)}s ${s.sid}] ${(Array.isArray(s.say) ? s.say : [s.say]).join(" ")}`).join("\n");
fs.writeFileSync(path.join(OUT, "SCRIPT.txt"), script + "\n");
console.error(`built ${scenes.length} scenes, ${groups.length} caption groups, ${sfxOut.length} sfx, ${TOTAL}s -> ${OUT}`);
