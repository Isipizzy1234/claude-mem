#!/usr/bin/env node
// build.mjs — turn a video spec (video.json) into a ready-to-render HyperFrames project.
//
//   node build.mjs <video.json> <outDir> [--no-voice] [--voice am_michael] [--speed 1.05]
//
// What it does:
//   1. Expands lineups (4-3-3 etc.) into players.
//   2. Generates the English voiceover per beat with `npx hyperframes tts` (Kokoro, local)
//      and times every beat to its voice line (cached by text+voice+speed).
//   3. Resolves moves, passes, arrows, labels, rings and cameras to absolute seconds.
//   4. Writes index.html (GSAP text overlays + Three.js pitch canvas), assets and config.
//
// The spec format is documented in ../references/spec.md.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.join(HERE, "..", "engine");
const W = 1080, H = 1920;

// ---------------- args ----------------
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("usage: node build.mjs <video.json> <outDir> [--no-voice] [--voice id] [--speed n]");
  process.exit(1);
}
const specPath = path.resolve(args[0]);
const outDir = path.resolve(args[1]);
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
const voiceCfg = spec.voice === null || flag("--no-voice") ? null : {
  id: opt("--voice") || spec.voice?.id || "am_michael",
  speed: Number(opt("--speed") || spec.voice?.speed || 1.05),
};

fs.mkdirSync(path.join(outDir, "assets", "lib"), { recursive: true });
fs.mkdirSync(path.join(outDir, "assets", "fonts"), { recursive: true });
fs.mkdirSync(path.join(outDir, "assets", "vo"), { recursive: true });

// ---------------- helpers ----------------
const r2 = (v) => Math.round(v * 1000) / 1000;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------------- lineups ----------------
// Rows are listed from the team's own goal outwards. x positions spread across the pitch.
const SHAPES = {
  "4-3-3": [4, 3, 3], "4-4-2": [4, 4, 2], "4-2-3-1": [4, 2, 3, 1], "3-5-2": [3, 5, 2],
  "5-3-2": [5, 3, 2], "3-4-3": [3, 4, 3], "4-1-4-1": [4, 1, 4, 1], "5-4-1": [5, 4, 1],
  "4-5-1": [4, 5, 1], "4-3-2-1": [4, 3, 2, 1],
};
const ROW_X = { 1: [0], 2: [-9, 9], 3: [-16, 0, 16], 4: [-24, -8, 8, 24], 5: [-27, -13.5, 0, 13.5, 27] };
function expandLineup(l) {
  const rows = SHAPES[l.shape] || l.shape.split("-").map(Number);
  // own goal: "bottom" means the team defends z=+52.5 and attacks up (towards -z)
  const own = l.goal === "top" ? -1 : 1;
  const depth = l.depth ?? 1; // <1 = compact, >1 = stretched
  const startZ = l.line ?? 36; // distance of the back line from the halfway line (own half)
  const lastZ = l.front ?? 6; // distance of the front line from the halfway line
  const [sx, sz] = l.shift || [0, 0];
  const out = [];
  const id = (n) => `${l.prefix || l.team.toLowerCase()}${n}`;
  const names = l.names || [];
  out.push({ id: id(1), team: l.team, at: [sx, own * 48 + sz], label: names[0], role: "GK" });
  let n = 2;
  rows.forEach((count, ri) => {
    const k = rows.length === 1 ? 0 : ri / (rows.length - 1);
    const zFromHalf = (startZ + (lastZ - startZ) * k) * depth;
    const xs = ROW_X[count] || Array.from({ length: count }, (_, i) => -27 + (54 * i) / (count - 1));
    xs.forEach((x) => {
      // mirror x for the team defending the top goal so "left" stays the team's left
      out.push({ id: id(n), team: l.team, at: [x * (own === 1 ? 1 : -1) * (l.width ?? 1) + sx, own * zFromHalf + sz], label: names[n - 1] });
      n++;
    });
  });
  return out;
}

const players = [];
for (const l of spec.lineups || []) players.push(...expandLineup(l));
for (const p of spec.players || []) {
  const i = players.findIndex((q) => q.id === p.id);
  if (i >= 0) players[i] = { ...players[i], ...p };
  else players.push(p);
}
const pById = Object.fromEntries(players.map((p) => [p.id, p]));
const teamOf = (key) => players.filter((p) => p.team === key).map((p) => p.id);
const expandRefs = (refs) => (refs || []).flatMap((r) => (spec.teams?.[r] ? teamOf(r) : [r]));

// ---------------- voiceover ----------------
function ttsLine(text, beatId) {
  const h = crypto.createHash("sha1").update(`${voiceCfg.id}|${voiceCfg.speed}|${text}`).digest("hex").slice(0, 10);
  const rel = `assets/vo/${slug(beatId)}-${h}.wav`;
  const file = path.join(outDir, rel);
  if (!fs.existsSync(file)) {
    process.stdout.write(`  tts  ${beatId}: "${text.slice(0, 60)}${text.length > 60 ? "…" : ""}"\n`);
    execFileSync("npx", ["--yes", "hyperframes", "tts", text, "-v", voiceCfg.id, "-s", String(voiceCfg.speed), "-o", file, "--json"], {
      stdio: ["ignore", "pipe", "inherit"],
    });
  }
  const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
  return { rel, dur };
}

// ---------------- timing ----------------
const LEAD = 0.12; // voice starts this long after the cut
let t = 0;
const beats = spec.beats.map((b, i) => {
  const id = b.id || `b${i + 1}`;
  let vo = null;
  if (voiceCfg && b.say) vo = ttsLine(b.say, id);
  const words = (b.say || "").split(/\s+/).filter(Boolean).length;
  const spoken = vo ? vo.dur + LEAD : words / 2.7;
  const dur = r2(b.dur ?? Math.max(b.min ?? 1.8, spoken + (b.hold ?? 0.3)));
  const beat = { ...b, id, start: r2(t), dur, end: r2(t + dur), vo };
  t += dur;
  return beat;
});
const DURATION = r2(t);

// ---------------- world: tracks, ball, arrows, labels, rings, cameras ----------------
const tracks = Object.fromEntries(players.map((p) => [p.id, [[0, p.at[0], p.at[1]]]]));
function posAtTrack(track, time) {
  // same easing as the engine (smoothstep) so relative moves start from the true spot
  if (time <= track[0][0]) return [track[0][1], track[0][2]];
  for (let i = 1; i < track.length; i++) {
    if (time < track[i][0]) {
      const [t0, x0, z0] = track[i - 1], [t1, x1, z1] = track[i];
      let k = (time - t0) / Math.max(1e-6, t1 - t0);
      k = k * k * (3 - 2 * k);
      return [x0 + (x1 - x0) * k, z0 + (z1 - z0) * k];
    }
  }
  const l = track[track.length - 1];
  return [l[1], l[2]];
}
const moves = [];
const ballEvents = [];
const arrows = [];
const labels = [];
const rings = [];
const cameras = [];
const kicks = {};
const hidden = {};

// camera presets: elevation (deg), fov, default span (metres visible across at the focus)
const PRESETS = {
  top: { el: 78, fov: 30, span: 78 },
  high: { el: 52, fov: 38, span: 17 },
  broadcast: { el: 34, fov: 38, span: 22 },
  low: { el: 16, fov: 42, span: 12 },
};
function resolveCamera(c, beat) {
  if (c.pos && c.look) return { pos: c.pos, look: c.look, fov: c.fov ?? 40 };
  const pr = PRESETS[c.preset || "high"];
  const fov = c.fov ?? pr.fov;
  const span = c.span ?? pr.span;
  const el = ((c.el ?? pr.el) * Math.PI) / 180;
  const yaw = ((c.yaw ?? 0) * Math.PI) / 180;
  let focus = c.focus ?? [0, -35];
  if (typeof focus === "string") focus = posAtTrack(tracks[focus], beat.start);
  const aspect = W / H;
  const dist = span / 2 / (Math.tan(((fov / 2) * Math.PI) / 180) * aspect);
  const look = [focus[0], 0, focus[1]];
  const pos = [
    focus[0] + Math.sin(yaw) * Math.cos(el) * dist,
    Math.sin(el) * dist,
    focus[1] + Math.cos(yaw) * Math.cos(el) * dist,
  ];
  return { pos: pos.map(r2), look, fov };
}

let holder = spec.ball?.holder ?? null;
let lastStats = {};
const statKeys = [];
const statTimeline = []; // {t, values}

for (const b of beats) {
  const T = (rel) => r2(b.start + (rel ?? 0));
  const untilOf = (x) => (x?.until != null ? T(x.until) : x?.hold != null ? T((x.at ?? 0) + x.hold) : b.end);

  // camera
  if (b.camera) {
    const c = resolveCamera(b.camera, b);
    cameras.push({ t: b.start, ...c, cut: !!b.camera.cut, dur: b.camera.dur ?? 1.1, drift: b.camera.drift ?? 0.06, orbit: b.camera.orbit ?? 0 });
  }

  // moves (players run to a spot). `p` may be an id or a team key.
  for (const m of b.moves || []) {
    for (const id of expandRefs([m.p])) {
      const tr = tracks[id];
      const t0 = T(m.at ?? 0), t1 = r2(t0 + (m.dur ?? 1.2));
      const cur = posAtTrack(tr, t0);
      let to = m.to;
      if (m.by) to = [cur[0] + m.by[0], cur[1] + m.by[1]];
      if (typeof to === "string") to = posAtTrack(tracks[to], t1);
      if (m.jitter) {
        const s = parseInt(crypto.createHash("md5").update(id + b.id).digest("hex").slice(0, 6), 16) / 0xffffff;
        to = [to[0] + (s - 0.5) * m.jitter * 2, to[1] + (((s * 7) % 1) - 0.5) * m.jitter * 2];
      }
      if (tr[tr.length - 1][0] < t0) tr.push([t0, r2(cur[0]), r2(cur[1])]);
      tr.push([t1, r2(to[0]), r2(to[1])]);
    }
  }

  // passes / shots / dribbles of the ball
  for (const ps of b.passes || []) {
    const t0 = T(ps.at ?? 0), t1 = r2(t0 + (ps.dur ?? 0.7));
    const from = ps.from ?? holder;
    if (from && typeof from === "string" && ps.kick !== false) (kicks[from] ||= []).push(t0);
    ballEvents.push({ t0, t1, from: ps.from && typeof ps.from !== "string" ? ps.from : null, to: ps.to, lift: ps.lift || 0 });
    if (ps.arrow !== false && from) {
      arrows.push({ t0, t1: untilOf(ps), draw: r2(t1 - t0), from, to: ps.to, color: ps.color || "red" });
    }
    holder = typeof ps.to === "string" ? ps.to : null;
  }

  for (const a of b.arrows || []) {
    arrows.push({ t0: T(a.at ?? 0), t1: untilOf(a), draw: a.draw ?? 0.5, from: a.from, to: a.to, color: a.color || "red", head: a.head, dash: a.dash, width: a.width });
  }
  // formation links: white dashed connections, no arrow head
  for (const [p, q] of b.links || []) {
    arrows.push({ t0: T(b.linksAt ?? 0.3), t1: b.end, draw: 0.45, from: p, to: q, color: "white", head: false, width: 4 });
  }

  for (const l of b.labels || []) {
    labels.push({ t0: T(l.at ?? 0), t1: untilOf(l), player: l.p, at: l.atPoint, text: l.text, color: l.color, size: l.size, below: l.below });
  }
  if (b.names) {
    const ids = b.names === true ? players.map((p) => p.id) : expandRefs(Array.isArray(b.names) ? b.names : [b.names]);
    ids.forEach((id, k) => {
      if (pById[id]?.label) labels.push({ t0: T(0.2 + k * 0.04), t1: b.end, player: id, text: pById[id].label, color: "white", size: 26 });
    });
  }
  for (const r of b.rings || []) {
    const rr = typeof r === "string" ? { p: r } : r;
    rings.push({ t0: T(rr.at ?? 0), t1: untilOf(rr), player: rr.p, color: rr.color });
  }
  for (const id of expandRefs(b.hide)) (hidden[id] ||= []).push([b.start, b.end]);

  if (b.stats) {
    for (const k of Object.keys(b.stats)) if (!statKeys.includes(k)) statKeys.push(k);
    lastStats = { ...lastStats, ...b.stats };
    statTimeline.push({ t: T(b.statsAt ?? 0.2), values: { ...lastStats } });
  }
}
// moves must be time-ordered per track (they are authored in beat order)
for (const id of Object.keys(tracks)) tracks[id].sort((a, b) => a[0] - b[0]);
if (!cameras.length) cameras.push({ t: 0, ...resolveCamera({ preset: "high" }, beats[0]), dur: 1, drift: 0.06 });

const world = {
  width: W, height: H, duration: DURATION,
  colors: spec.colors || {},
  teams: spec.teams || {},
  players: players.map((p) => ({
    id: p.id, team: p.team, track: tracks[p.id], kicks: kicks[p.id] || [], hidden: hidden[p.id] || [],
    facing: p.facing, facesBall: p.facesBall, color: p.color, blindfold: p.blindfold,
  })),
  ball: { holder: spec.ball?.holder ?? null, at: spec.ball?.at, events: ballEvents },
  hideBall: spec.ball?.hidden ?? false,
  cameras, arrows, labels, rings,
};

// ---------------- copy engine + assets ----------------
fs.copyFileSync(path.join(ENGINE, "three.module.min.js"), path.join(outDir, "assets/lib/three.module.min.js"));
fs.copyFileSync(path.join(ENGINE, "pitch3d.js"), path.join(outDir, "assets/lib/pitch3d.js"));
for (const f of fs.readdirSync(path.join(ENGINE, "fonts"))) fs.copyFileSync(path.join(ENGINE, "fonts", f), path.join(outDir, "assets/fonts", f));
let musicRel = null;
if (spec.music) {
  const src = path.resolve(path.dirname(specPath), spec.music);
  musicRel = `assets/${path.basename(src)}`;
  fs.copyFileSync(src, path.join(outDir, musicRel));
}

// ---------------- overlay html ----------------
const C = { green: "#3ddc84", red: "#ff4a4a", grey: "#8b93a5", bg: "#151820", ...(spec.colors || {}) };
let z = 10;
const clips = [];
const tweens = [];
let prevChapter = null;
let chapterClip = null;

beats.forEach((b, i) => {
  // chapter label: one clip per run of beats sharing the same chapter text
  if (b.chapter !== undefined && b.chapter !== prevChapter) {
    if (chapterClip) chapterClip.end = b.start;
    chapterClip = b.chapter ? { id: `chap-${i}`, text: b.chapter, start: b.start, end: DURATION } : null;
    if (chapterClip) clips.push({ kind: "chapter", ref: chapterClip });
    prevChapter = b.chapter;
  }
  // headline
  const lines = Array.isArray(b.title) ? b.title : b.title ? [b.title] : [];
  if (lines.length) {
    const hid = `ttl-${b.id}`;
    const wordSpans = [];
    let w = 0;
    const html = lines.map((ln, li) => {
      const color = li === 0 && lines.length > 1 ? "var(--ink)" : "var(--accent)";
      const cls = lines.length === 1 ? (b.titleColor === "green" ? "accent" : "ink") : li === 0 ? "ink" : "accent";
      const words = ln.split(/\s+/).filter(Boolean).map((word) => {
        const wid = `${hid}-w${w++}`;
        wordSpans.push({ wid, line: li });
        return `<span class="w" id="${wid}">${esc(word)}</span>`;
      }).join(" ");
      return `<div class="line ${cls}">${words}</div>`;
    }).join("");
    clips.push({ kind: "title", id: hid, start: b.start, end: b.end, html });
    // word pop-in: line 1 words quickly, line 2 slightly later (the punchline)
    const n = wordSpans.length;
    const spread = Math.min(0.9, b.dur * 0.35);
    wordSpans.forEach((s, k) => {
      const at = r2(b.start + 0.04 + (n > 1 ? (k / (n - 1)) * spread : 0) + (s.line > 0 ? 0.12 : 0));
      tweens.push(`tl.fromTo("#${s.wid}", { opacity: 0, y: 26, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: "back.out(2)" }, ${at});`);
    });
  }
  if (b.badge) clips.push({ kind: "badge", id: `badge-${b.id}`, start: r2(b.start + 0.2), end: b.end, text: b.badge });
});
if (chapterClip) chapterClip.end = DURATION;

// chapter clips: slide the label in
for (const c of clips.filter((c) => c.kind === "chapter")) {
  const r = c.ref;
  tweens.push(`tl.fromTo("#${r.id} .chap-inner", { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, ${r2(r.start + 0.02)});`);
}
for (const c of clips.filter((c) => c.kind === "badge")) {
  tweens.push(`tl.fromTo("#${c.id} .badge-inner", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2.2)" }, ${c.start});`);
}

// stats counters
let statsStart = null;
const statTweens = [];
if (statTimeline.length) {
  statsStart = statTimeline[0].t;
  tweens.push(`tl.fromTo("#stats .stats-inner", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, ${statsStart});`);
  const prev = Object.fromEntries(statKeys.map((k) => [k, 0]));
  statTimeline.forEach((s, i) => {
    for (const k of statKeys) {
      const to = s.values[k] ?? prev[k];
      if (i === 0 || to !== prev[k]) {
        const sid = `stat-${slug(k)}`;
        const from = i === 0 ? to : prev[k];
        statTweens.push(`counter("#${sid}", ${from}, ${to}, ${s.t}, ${i === 0 ? 0.01 : 0.6});`);
        if (i > 0) statTweens.push(`tl.fromTo("#${sid}", { scale: 1.35, color: "${C.green}" }, { scale: 1, color: "#ffffff", duration: 0.5, ease: "power2.out" }, ${s.t});`);
      }
      prev[k] = to;
    }
  });
}

const handle = spec.handle || "@yourhandle";
const audioTags = beats.filter((b) => b.vo).map((b, i) =>
  `      <audio id="vo-${slug(b.id)}" class="clip" src="${b.vo.rel}" data-start="${r2(b.start + LEAD)}" data-duration="${r2(b.vo.dur)}" data-track-index="${20 + (i % 2)}" data-volume="1"></audio>`,
).join("\n");
const musicTag = musicRel
  ? `      <audio id="music-bed" class="clip" src="${musicRel}" data-start="0" data-duration="${DURATION}" data-track-index="22" data-volume="${spec.musicVolume ?? 0.14}" data-fade-in="0.3" data-fade-out="0.8"></audio>`
  : "";

const clipHtml = clips.map((c) => {
  if (c.kind === "chapter") {
    const r = c.ref;
    return `      <div id="${r.id}" class="clip chapter" data-start="${r.start}" data-duration="${r2(r.end - r.start)}" data-track-index="2"><div class="chap-inner"><span class="sq"></span><span class="chap-text">${esc(r.text)}</span></div></div>`;
  }
  if (c.kind === "title") {
    return `      <div id="${c.id}" class="clip title" data-start="${c.start}" data-duration="${r2(c.end - c.start)}" data-track-index="3" data-layout-allow-overlap>${c.html}</div>`;
  }
  if (c.kind === "badge") {
    return `      <div id="${c.id}" class="clip badge" data-start="${c.start}" data-duration="${r2(c.end - c.start)}" data-track-index="4"><div class="badge-inner">${esc(c.text)}</div></div>`;
  }
  return "";
}).join("\n");

const statsHtml = statsStart != null
  ? `      <div id="stats" class="clip stats" data-start="${statsStart}" data-duration="${r2(DURATION - statsStart)}" data-track-index="5"><div class="stats-inner"><span class="bar"></span>${statKeys
      .map((k, i) => `${i ? '<span class="dot">·</span>' : ""}<span class="stat">${esc(k)} <span class="num" id="stat-${slug(k)}">0</span></span>`)
      .join("")}</div></div>`
  : "";

const index = `<!doctype html>
<html lang="en" data-composition-variables='[{"id":"handle","type":"string","label":"Handle","default":${JSON.stringify(handle).replace(/'/g, "&#39;")}}]'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(spec.title || "Pitch explainer")}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "PX Display"; src: url("assets/fonts/Anton.woff2") format("woff2"); font-weight: 400; }
      @font-face { font-family: "PX Mono"; src: url("assets/fonts/JetBrainsMono-500.woff2") format("woff2"); font-weight: 500; }
      @font-face { font-family: "PX Mono"; src: url("assets/fonts/JetBrainsMono-700.woff2") format("woff2"); font-weight: 700; }
      :root {
        --bg: ${C.bg};
        --ink: #f4f4f2;
        --accent: ${C.green};
        --alert: ${C.red};
        --muted: ${C.grey};
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: var(--bg); }
      #root { position: relative; width: 100%; height: 100%; background: var(--bg); overflow: hidden; }
      #stage { position: absolute; inset: 0; }
      #gl, #ov { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
      #ov { z-index: 1; }
      .chapter { position: absolute; left: 44px; top: 196px; z-index: 5; }
      .chap-inner { display: flex; align-items: center; gap: 16px; }
      .sq { width: 18px; height: 18px; background: var(--accent); display: inline-block; }
      .chap-text { font-family: "PX Mono", monospace; font-weight: 500; font-size: 30px; letter-spacing: 0.2em; color: var(--muted); text-transform: uppercase; }
      .title { position: absolute; left: 40px; right: 40px; top: 240px; z-index: 6; font-family: "PX Display", sans-serif; font-size: 118px; line-height: 0.98; text-transform: uppercase; letter-spacing: 0.005em; }
      .title .line { display: block; text-shadow: 0 4px 22px rgba(0,0,0,0.55); }
      .title .ink { color: var(--ink); }
      .title .accent { color: var(--accent); }
      .title .w { display: inline-block; }
      .badge { position: absolute; left: 44px; top: 520px; z-index: 6; }
      .badge-inner { font-family: "PX Mono", monospace; font-weight: 700; font-size: 52px; color: var(--ink); border: 4px solid var(--ink); padding: 8px 20px; background: rgba(10,12,18,0.55); }
      .stats { position: absolute; left: 44px; top: 1192px; z-index: 6; }
      .stats-inner { display: flex; align-items: center; gap: 22px; font-family: "PX Mono", monospace; font-weight: 700; font-size: 36px; letter-spacing: 0.08em; color: var(--ink); }
      .stats .bar { width: 6px; height: 46px; background: var(--alert); display: inline-block; }
      .stats .dot { color: var(--muted); }
      .stats .num { display: inline-block; min-width: 1.3em; }
      .handle { position: absolute; left: 44px; top: 1272px; z-index: 6; font-family: "PX Mono", monospace; font-weight: 500; font-size: 28px; color: var(--muted); letter-spacing: 0.02em; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${DURATION}" data-width="${W}" data-height="${H}">
      <div id="stage" class="clip" data-start="0" data-duration="${DURATION}" data-track-index="1" data-layout-ignore>
        <canvas id="gl" width="${W}" height="${H}"></canvas>
        <canvas id="ov" width="${W}" height="${H}"></canvas>
      </div>
${clipHtml}
${statsHtml}
      <div id="handle" class="clip handle" data-start="0" data-duration="${DURATION}" data-track-index="6" data-var-text="handle">${esc(handle)}</div>
${audioTags}
${musicTag}
    </div>

    <script type="application/json" id="world">${JSON.stringify(world).replace(/</g, "\\u003c")}</script>
    <script>
      // register the 3D build before the module loads so the renderer waits for it
      window.__hf = window.__hf || {};
      window.__hf.buildReady = window.__hf.buildReady || {};
      window.__hf.buildReady.pitch = new Promise((res) => { window.__pitchDone = res; });

      const tl = gsap.timeline({ paused: true });
      function counter(sel, from, to, at, dur) {
        const o = { v: from };
        tl.fromTo(o, { v: from }, {
          v: to, duration: dur, ease: "power1.out", immediateRender: false,
          onUpdate: () => { document.querySelector(sel).textContent = String(Math.round(o.v)); },
        }, at);
      }
${tweens.map((s) => "      " + s).join("\n")}
${statTweens.map((s) => "      " + s).join("\n")}
      window.__timelines["main"] = tl;
    </script>
    <script type="module">
      import { mount } from "./assets/lib/pitch3d.js";
      const world = JSON.parse(document.getElementById("world").textContent);
      const render = await mount({
        glCanvas: document.getElementById("gl"),
        overlayCanvas: document.getElementById("ov"),
        world,
      });
      window.addEventListener("hf-seek", (e) => render(e.detail.time));
      render(0);
      window.__pitchDone();
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(outDir, "index.html"), index);

// ---------------- project config ----------------
const name = slug(spec.title || path.basename(outDir));
const write = (f, s) => { if (!fs.existsSync(path.join(outDir, f))) fs.writeFileSync(path.join(outDir, f), s); };
write("hyperframes.json", JSON.stringify({
  $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
  registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
  media: { autoProxy: true },
}, null, 2) + "\n");
write("meta.json", JSON.stringify({ id: name, name, createdAt: new Date().toISOString() }, null, 2) + "\n");
write("package.json", JSON.stringify({
  name, private: true, type: "module",
  scripts: { dev: "npx --yes hyperframes preview", check: "npx --yes hyperframes check", render: "npx --yes hyperframes render" },
}, null, 2) + "\n");
fs.writeFileSync(path.join(outDir, "timing.json"), JSON.stringify({
  duration: DURATION,
  beats: beats.map((b) => ({ id: b.id, start: b.start, end: b.end, dur: b.dur, say: b.say, vo: b.vo?.rel, voDur: b.vo?.dur })),
}, null, 2) + "\n");

console.log(`built ${path.relative(process.cwd(), outDir) || "."}: ${beats.length} beats, ${DURATION}s, ${players.length} players${voiceCfg ? `, voice ${voiceCfg.id}` : ", no voice"}`);
