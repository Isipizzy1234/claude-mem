// Backgrounds, props, icons and phone screens for the vote-series look.
// Every function returns an SVG string in the 1080x1920 scene space (or centred
// at 0,0 for props). Timed sub-parts register animations through `ctx`.

import { C, esc, rng, hashStr, shade, fitFont, W, H } from "./util.mjs";

const ink = (w = 8) => `stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const T = (x, y, txt, size, o = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${o.anchor || "middle"}" font-family="${o.font || "Montserrat"}" font-weight="${o.weight || 900}" font-size="${size}" fill="${o.fill || "#fff"}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 10}" paint-order="stroke" stroke-linejoin="round"` : ""}${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ""}${o.ls ? ` letter-spacing="${o.ls}"` : ""}>${esc(txt)}</text>`;

// ---------------------------------------------------------------- backgrounds

function floor(y, color, lines = true) {
  let s = `<rect x="0" y="${y}" width="${W}" height="${H - y}" fill="${color}"/>`;
  if (lines) for (let i = 1; i < 6; i++) s += `<path d="M 0 ${y + i * 80} L ${W} ${y + i * 80}" stroke="${shade(color, -0.12)}" stroke-width="6"/>`;
  s += `<path d="M 0 ${y} L ${W} ${y}" ${ink(8)}/>`;
  return s;
}

function windowNight(x, y) {
  return `<rect x="${x}" y="${y}" width="230" height="270" rx="10" fill="#1a2a5a" ${ink()}/>
    <circle cx="${x + 120}" cy="${y + 110}" r="46" fill="#ffe9a8"/><circle cx="${x + 142}" cy="${y + 96}" r="40" fill="#1a2a5a"/>
    <path d="M ${x + 115} ${y} L ${x + 115} ${y + 270} M ${x} ${y + 135} L ${x + 230} ${y + 135}" ${ink(7)}/>`;
}

function poster(x, y, text, color = C.orange, rot = 6) {
  const fs = fitFont(text, 190, 46, 22);
  return `<g transform="rotate(${rot} ${x + 110} ${y + 140})"><rect x="${x}" y="${y}" width="220" height="290" fill="${color}" ${ink(7)}/>
    ${T(x + 110, y + 90, text, fs, { fill: "#fff", stroke: C.ink, sw: 6 })}
    <circle cx="${x + 110}" cy="${y + 190}" r="44" fill="#fff" ${ink(6)}/><circle cx="${x + 110}" cy="${y + 190}" r="12" fill="${C.ink}"/></g>`;
}

function blinds(x, y) {
  let s = `<rect x="${x}" y="${y}" width="220" height="300" fill="#e9e6f2" ${ink(7)}/>`;
  for (let i = 1; i < 14; i++) s += `<path d="M ${x} ${y + i * 21.4} L ${x + 220} ${y + i * 21.4}" stroke="#9b97ad" stroke-width="5"/>`;
  return s;
}

function shelf(x, y, colors = [C.red, C.yellow, C.green, C.blue, C.pink]) {
  let s = `<rect x="${x}" y="${y}" width="${colors.length * 46 + 20}" height="16" fill="#7a4b2a" ${ink(5)}/>`;
  colors.forEach((c, i) => (s += `<rect x="${x + 14 + i * 46}" y="${y - 64}" width="30" height="64" rx="12" fill="${c}" ${ink(5)}/>`));
  return s;
}

function stack(x, y, n = 5, color = "#c98a4b") {
  let s = "";
  for (let i = 0; i < n; i++) s += `<rect x="${x + (i % 2) * 10}" y="${y - i * 34}" width="170" height="34" fill="${color}" ${ink(5)}/>`;
  return s;
}

function house(x, y, w, h, color, roof) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" ${ink(7)}/>
    <path d="M ${x - 20} ${y} L ${x + w / 2} ${y - h * 0.55} L ${x + w + 20} ${y} Z" fill="${roof}" ${ink(7)}/>
    <rect x="${x + w * 0.15}" y="${y + h * 0.18}" width="${w * 0.25}" height="${w * 0.25}" fill="#bfe3ff" ${ink(6)}/>
    <rect x="${x + w * 0.6}" y="${y + h * 0.18}" width="${w * 0.25}" height="${w * 0.25}" fill="#bfe3ff" ${ink(6)}/>
    <rect x="${x + w * 0.38}" y="${y + h * 0.55}" width="${w * 0.24}" height="${h * 0.45}" fill="#8a5a3a" ${ink(6)}/>`;
}

function tree(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-22" y="-160" width="44" height="170" fill="#8a5a3a" ${ink(7)}/>
    <circle cx="-60" cy="-200" r="80" fill="#3fae5a" ${ink(7)}/><circle cx="60" cy="-210" r="85" fill="#3fae5a" ${ink(7)}/><circle cx="0" cy="-280" r="95" fill="#4cc068" ${ink(7)}/></g>`;
}

function cloud(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})" opacity=".95"><ellipse cx="0" cy="0" rx="110" ry="46" fill="#fff"/><circle cx="-40" cy="-30" r="50" fill="#fff"/><circle cx="35" cy="-40" r="58" fill="#fff"/></g>`;
}

export function sunburst(color = C.violetMid, rays = 20, cx = 540, cy = 900) {
  let s = `<rect width="${W}" height="${H}" fill="${color}"/>`;
  const dark = shade(color, -0.22);
  for (let i = 0; i < rays; i++) {
    const a0 = (i / rays) * Math.PI * 2, a1 = ((i + 0.5) / rays) * Math.PI * 2;
    const R = 2400;
    s += `<path d="M ${cx} ${cy} L ${cx + Math.cos(a0) * R} ${cy + Math.sin(a0) * R} L ${cx + Math.cos(a1) * R} ${cy + Math.sin(a1) * R} Z" fill="${dark}"/>`;
  }
  s += `<radialGradient id="vg-${hashStr(color)}" cx="50%" cy="47%" r="65%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".45"/></radialGradient><rect width="${W}" height="${H}" fill="url(#vg-${hashStr(color)})"/>`;
  return s;
}

export function background(bg = {}) {
  const t = bg.type || "room";
  const wall = bg.wall;
  switch (t) {
    case "sunburst":
      return sunburst(bg.color || C.violetMid, bg.rays || 20);
    case "plain":
      return `<rect width="${W}" height="${H}" fill="${bg.color || C.night}"/>`;
    case "grid": {
      let s = `<rect width="${W}" height="${H}" fill="${bg.color || "#cdeee6"}"/>`;
      for (let x = 0; x < W; x += 72) s += `<path d="M ${x} 0 L ${x} ${H}" stroke="${shade(bg.color || "#cdeee6", -0.08)}" stroke-width="3"/>`;
      for (let y = 0; y < H; y += 72) s += `<path d="M 0 ${y} L ${W} ${y}" stroke="${shade(bg.color || "#cdeee6", -0.08)}" stroke-width="3"/>`;
      return s;
    }
    case "room": {
      const w = wall || "#2f2560";
      let s = `<rect width="${W}" height="${H}" fill="${w}"/>`;
      for (let x = 60; x < W; x += 120) s += `<path d="M ${x} 0 L ${x} 1480" stroke="${shade(w, -0.1)}" stroke-width="10"/>`;
      if (bg.window !== false) s += windowNight(bg.windowX ?? 760, 380);
      if (bg.blinds) s += blinds(60, 380);
      if (bg.poster) s += poster(bg.posterX ?? 90, 360, bg.poster, bg.posterColor || C.orange);
      if (bg.shelf !== false) s += shelf(bg.shelfX ?? 380, 560);
      if (bg.boxes) s += stack(40, 1440, 6);
      s += floor(1480, bg.floor || "#5a3d2a");
      return s;
    }
    case "garage": {
      const w = wall || "#5d6475";
      let s = `<rect width="${W}" height="${H}" fill="${w}"/>`;
      s += `<rect x="140" y="300" width="800" height="1180" fill="${shade(w, -0.12)}" ${ink()}/>`;
      for (let y = 360; y < 1480; y += 70) s += `<path d="M 140 ${y} L 940 ${y}" stroke="${shade(w, -0.3)}" stroke-width="7"/>`;
      s += `<rect x="40" y="560" width="70" height="260" fill="#9aa1b2" ${ink(6)}/><path d="M 55 610 L 95 610 M 55 660 L 95 660 M 55 710 L 95 710" ${ink(5)}/>`;
      s += `<circle cx="540" cy="250" r="40" fill="#fff6c2" ${ink(6)}/><path d="M 540 150 L 540 210" ${ink(6)}/>`;
      if (bg.boxes !== false) s += stack(30, 1440, 5) + stack(880, 1440, 4, "#b77a40");
      s += floor(1480, bg.floor || "#8b8f99", false);
      s += `<ellipse cx="760" cy="1640" rx="120" ry="26" fill="#6f7380" opacity=".7"/>`;
      return s;
    }
    case "street": {
      let s = `<rect width="${W}" height="${H}" fill="${bg.sky || "#f6b98a"}"/>`;
      s += `<rect y="900" width="${W}" height="600" fill="${shade(bg.sky || "#f6b98a", 0.2)}"/>`;
      s += cloud(220, 420, 1) + cloud(820, 330, 0.8);
      s += house(-40, 980, 300, 470, "#f4a7a7", "#7b6fb3") + house(320, 1020, 300, 430, "#bfe0f2", "#8a5a6a") + house(690, 960, 330, 490, "#f6dc9b", "#5f6f9f");
      s += `<rect x="0" y="1380" width="${W}" height="30" fill="#fff" ${ink(5)}/>`;
      for (let x = 10; x < W; x += 50) s += `<rect x="${x}" y="1340" width="14" height="60" fill="#fff" ${ink(4)}/>`;
      s += floor(1480, "#c9c6d2", false);
      s += `<rect y="1720" width="${W}" height="200" fill="#5d5f6b"/>`;
      for (let x = 0; x < W; x += 200) s += `<rect x="${x + 40}" y="1810" width="110" height="16" fill="#fff"/>`;
      return s;
    }
    case "park": {
      let s = `<rect width="${W}" height="${H}" fill="${bg.sky || "#a9dcff"}"/>` + cloud(260, 360, 0.9) + cloud(800, 460, 1.1);
      s += `<rect y="1050" width="${W}" height="870" fill="#7fd36f"/>`;
      s += tree(140, 1150, 1.1) + tree(940, 1120, 1.2) + tree(700, 1060, 0.7);
      s += `<path d="M 380 1920 Q 470 1400 520 1060 L 600 1060 Q 650 1400 820 1920 Z" fill="#e8d3a8" ${ink(6)}/>`;
      s += `<rect x="760" y="1300" width="230" height="22" fill="#8a5a3a" ${ink(6)}/><rect x="780" y="1322" width="16" height="60" fill="#8a5a3a" ${ink(5)}/><rect x="950" y="1322" width="16" height="60" fill="#8a5a3a" ${ink(5)}/>`;
      return s;
    }
    case "shop": {
      const w = wall || "#d9eef0";
      let s = `<rect width="${W}" height="${H}" fill="${w}"/>`;
      s += `<rect x="90" y="420" width="900" height="150" rx="20" fill="${bg.signColor || "#2f9e5b"}" ${ink()}/>`;
      s += T(540, 525, bg.sign || "SHOP", fitFont(bg.sign || "SHOP", 820, 92), { fill: "#fff", stroke: C.ink, sw: 8 });
      for (const x of [60, 760]) {
        s += `<rect x="${x}" y="650" width="260" height="800" fill="#fff" ${ink()}/>`;
        for (let r = 0; r < 4; r++) {
          s += `<path d="M ${x} ${760 + r * 180} L ${x + 260} ${760 + r * 180}" ${ink(6)}/>`;
          for (let k = 0; k < 5; k++) s += `<rect x="${x + 14 + k * 48}" y="${700 + r * 180}" width="36" height="58" rx="6" fill="${[C.red, C.yellow, C.blue, C.green, C.pink][(k + r) % 5]}" ${ink(4)}/>`;
        }
      }
      s += `<rect x="370" y="650" width="340" height="830" fill="#bfe3ff" ${ink()}/><path d="M 540 650 L 540 1480" ${ink(7)}/>`;
      s += floor(1480, "#cfd3dc", false);
      return s;
    }
    case "kitchen": {
      const w = wall || "#2f8a86";
      let s = `<rect width="${W}" height="${H}" fill="${w}"/>`;
      for (let y = 300; y < 1300; y += 90) for (let x = (y / 90) % 2 ? 0 : 45; x < W; x += 90) s += `<rect x="${x}" y="${y}" width="86" height="86" fill="${shade(w, 0.06)}"/>`;
      s += `<rect x="80" y="330" width="230" height="230" fill="#1d3a5a" ${ink()}/><rect x="720" y="330" width="260" height="300" fill="#8a5a3a" ${ink()}/><path d="M 850 330 L 850 630" ${ink(7)}/>`;
      s += `<rect x="0" y="1260" width="${W}" height="60" fill="#c45a3a" ${ink()}/><rect x="0" y="1320" width="${W}" height="600" fill="#b8503a"/>`;
      return s;
    }
    case "bathroom": {
      const w = wall || "#e9e2cf";
      let s = `<rect width="${W}" height="${H}" fill="${w}"/>`;
      for (let y = 0; y < 1480; y += 80) for (let x = 0; x < W; x += 80) s += `<rect x="${x + 2}" y="${y + 2}" width="76" height="76" fill="none" stroke="${shade(w, -0.08)}" stroke-width="4"/>`;
      s += `<rect x="80" y="380" width="260" height="360" rx="10" fill="#cfe9f6" ${ink()}/><path d="M 120 430 L 200 520" stroke="#fff" stroke-width="12" opacity=".7"/>`;
      s += floor(1480, "#d4cdb8", false);
      return s;
    }
    case "office": {
      const w = wall || "#dfe3ea";
      let s = `<rect width="${W}" height="${H}" fill="${w}"/>`;
      if (bg.sign) s += `<rect x="70" y="520" width="300" height="150" fill="${C.blue}" ${ink()}/>` + T(220, 618, bg.sign, fitFont(bg.sign, 260, 64), { fill: "#fff" });
      s += `<rect x="690" y="460" width="320" height="250" fill="#fff" ${ink()}/><path d="M 720 670 L 800 600 L 860 640 L 980 500" fill="none" stroke="${C.red}" stroke-width="12" stroke-linecap="round"/>`;
      s += floor(1480, "#9aa0ad", false);
      return s;
    }
    case "beach": {
      let s = `<rect width="${W}" height="${H}" fill="#7fd0ff"/><circle cx="880" cy="380" r="110" fill="${C.yellow}" ${ink()}/>`;
      s += `<rect y="1000" width="${W}" height="260" fill="#2b9bd8"/><path d="M 0 1000 L ${W} 1000" ${ink(7)}/>`;
      s += `<rect y="1250" width="${W}" height="670" fill="#f2d79b"/><path d="M 0 1250 L ${W} 1250" ${ink(7)}/>`;
      s += `<path d="M 150 1500 Q 170 1100 230 850" fill="none" stroke="#8a5a3a" stroke-width="40"/><path d="M 230 850 Q 100 800 20 900 M 230 850 Q 360 780 440 880 M 230 850 Q 200 720 110 700 M 230 850 Q 300 720 400 730" fill="none" stroke="#3fae5a" stroke-width="34" stroke-linecap="round"/>`;
      return s;
    }
    case "night": {
      const r = rng(7);
      let s = `<rect width="${W}" height="${H}" fill="#151238"/>`;
      for (let i = 0; i < 40; i++) s += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 1300).toFixed(0)}" r="${(2 + r() * 4).toFixed(1)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
      s += `<circle cx="820" cy="360" r="90" fill="#ffe9a8"/><circle cx="860" cy="330" r="80" fill="#151238"/>`;
      s += floor(1480, "#2a2450", false);
      return s;
    }
    default:
      return `<rect width="${W}" height="${H}" fill="${C.violet}"/>`;
  }
}

// ---------------------------------------------------------------- icons (drawn at ~0,0, about 90px)

export function icon(name, color = "#fff") {
  const st = `stroke="${C.ink}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
  switch (name) {
    case "book": case "comic":
      return `<rect x="-38" y="-44" width="76" height="88" rx="6" fill="${C.yellow}" ${st}/><path d="M -20 -20 L 20 -20 M -20 0 L 20 0 M -20 20 L 10 20" ${st}/>`;
    case "burger":
      return `<path d="M -44 -6 Q -44 -46 0 -46 Q 44 -46 44 -6 Z" fill="#e7a04a" ${st}/><rect x="-48" y="-4" width="96" height="14" rx="6" fill="${C.green}" ${st}/><rect x="-46" y="12" width="92" height="16" rx="6" fill="#7a3f22" ${st}/><path d="M -44 30 L 44 30 Q 44 46 0 46 Q -44 46 -44 30 Z" fill="#e7a04a" ${st}/>`;
    case "broom":
      return `<path d="M 30 -48 L -6 14" stroke="#8a5a3a" stroke-width="12" stroke-linecap="round"/><path d="M -26 4 L 14 24 L -6 52 L -46 34 Z" fill="${C.yellow}" ${st}/>`;
    case "shoe":
      return `<path d="M -48 20 L -40 -24 L -6 -20 Q 6 4 40 6 Q 52 10 50 26 L -48 26 Z" fill="#fff" ${st}/><path d="M -48 26 L 50 26" ${st}/><path d="M -20 -12 L -6 -2" ${st}/>`;
    case "scissors":
      return `<circle cx="-24" cy="26" r="16" fill="none" ${st}/><circle cx="24" cy="26" r="16" fill="none" ${st}/><path d="M -14 14 L 30 -44 M 14 14 L -30 -44" ${st}/>`;
    case "bottle":
      return `<rect x="-20" y="-24" width="40" height="70" rx="12" fill="#bff0d4" ${st}/><rect x="-10" y="-48" width="20" height="26" fill="#bff0d4" ${st}/>`;
    case "briefcase": case "job":
      return `<rect x="-46" y="-24" width="92" height="64" rx="10" fill="#b8763e" ${st}/><path d="M -16 -24 L -16 -40 L 16 -40 L 16 -24 M -46 4 L 46 4" fill="none" ${st}/>`;
    case "shower":
      return `<path d="M -30 -40 L 20 -40 Q 40 -40 40 -20" fill="none" ${st}/><path d="M 14 -20 L 66 -20 L 40 -6 Z" fill="#cfd3dc" ${st}/><path d="M 28 10 L 24 24 M 40 10 L 40 26 M 52 10 L 56 24" stroke="${C.tear}" stroke-width="6" stroke-linecap="round"/>`;
    case "money":
      return `<rect x="-48" y="-28" width="96" height="56" rx="8" fill="#7fd36f" ${st}/><circle r="16" fill="#bff0b0" ${st}/>`;
    case "phone":
      return `<rect x="-26" y="-46" width="52" height="92" rx="10" fill="#2b2b3a" ${st}/><rect x="-18" y="-34" width="36" height="62" fill="#8fb6ff"/>`;
    case "heart":
      return `<path transform="scale(3)" d="M 0 12 C -22 -2, -16 -22, 0 -12 C 16 -22, 22 -2, 0 12 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`;
    case "dumbbell": case "gym":
      return `<rect x="-36" y="-6" width="72" height="12" fill="#9aa1b2" ${st}/><rect x="-52" y="-24" width="20" height="48" rx="4" fill="#2b2b3a" ${st}/><rect x="32" y="-24" width="20" height="48" rx="4" fill="#2b2b3a" ${st}/>`;
    case "car":
      return `<path d="M -50 10 L -40 -14 Q -30 -30 -10 -30 L 20 -30 Q 36 -30 44 -14 L 52 10 Z" fill="${C.red}" ${st}/><rect x="-54" y="6" width="108" height="22" rx="8" fill="${C.red}" ${st}/><circle cx="-28" cy="30" r="12" fill="${C.ink}"/><circle cx="28" cy="30" r="12" fill="${C.ink}"/>`;
    case "house":
      return `<path d="M -44 -6 L 0 -44 L 44 -6" fill="none" ${st}/><rect x="-34" y="-8" width="68" height="52" fill="#fff" ${st}/><rect x="-10" y="14" width="20" height="30" fill="#8a5a3a" ${st}/>`;
    case "cart":
      return `<path d="M -50 -34 L -34 -34 L -22 20 L 34 20 L 46 -16 L -28 -16" fill="none" ${st}/><circle cx="-16" cy="36" r="9" fill="${C.ink}"/><circle cx="28" cy="36" r="9" fill="${C.ink}"/>`;
    case "star":
      return `<path d="M 0 -46 L 14 -14 L 48 -12 L 22 10 L 30 44 L 0 26 L -30 44 L -22 10 L -48 -12 L -14 -14 Z" fill="${C.yellow}" ${st}/>`;
    case "pizza":
      return `<path d="M -44 -36 L 44 -36 L 0 48 Z" fill="#f6c25b" ${st}/><path d="M -44 -36 Q 0 -54 44 -36" fill="#d8853a" ${st}/><circle cx="-8" cy="-14" r="8" fill="${C.red}"/><circle cx="12" cy="6" r="7" fill="${C.red}"/>`;
    case "suit":
      return `<path d="M -40 -40 L 40 -40 L 46 44 L -46 44 Z" fill="#2c2f45" ${st}/><path d="M -16 -40 L 0 0 L 16 -40" fill="#fff" ${st}/><path d="M 0 -26 L -6 -18 L 0 14 L 6 -18 Z" fill="${C.red}"/>`;
    case "trash":
      return `<path d="M -36 -24 L 36 -24 L 28 44 L -28 44 Z" fill="#9aa1b2" ${st}/><rect x="-44" y="-36" width="88" height="14" rx="4" fill="#9aa1b2" ${st}/>`;
    default:
      return `<circle r="40" fill="${C.yellow}" ${st}/>` + T(0, 18, "?", 54, { fill: C.ink });
  }
}

// ---------------------------------------------------------------- props

function jagged(rx, ry, points = 14, seed = 3) {
  const r = rng(seed);
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2;
    const k = i % 2 ? 0.68 + r() * 0.08 : 1 + r() * 0.08;
    d += `${i ? "L" : "M"} ${(Math.cos(a) * rx * k).toFixed(1)} ${(Math.sin(a) * ry * k).toFixed(1)} `;
  }
  return d + "Z";
}

function wrapLines(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Comic sound word ("RRRIP!", "SPLAT!"), optionally on a jagged star. */
function burst(p) {
  const txt = String(p.text || "BAM!").toUpperCase();
  const fs = p.size || fitFont(txt, 520, 112, 50);
  const w = Math.max(220, fs * 0.72 * txt.length * 0.62 + 120);
  let s = "";
  if (p.shape !== "none") s += `<path d="${jagged(w * 0.62, fs * 1.15, 13, hashStr(txt))}" fill="${p.bg || C.red}" ${ink(8)}/><path d="${jagged(w * 0.5, fs * 0.92, 13, hashStr(txt) + 1)}" fill="${p.bg2 || C.yellow}"/>`;
  s += T(0, fs * 0.36, txt, fs, { fill: p.color || (p.shape === "none" ? C.yellow : "#fff"), stroke: C.ink, sw: Math.max(10, fs * 0.13) });
  return s;
}

function bubble(p) {
  const lines = wrapLines(p.text || "", p.maxChars || 22);
  const fs = p.size || 46;
  const w = Math.min(900, Math.max(...lines.map((l) => l.length)) * fs * 0.6 + 80);
  const h = lines.length * fs * 1.25 + 50;
  const tail = p.tail || "down";
  let s = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="34" fill="#fff" ${ink(8)}/>`;
  const tx = p.tailX ?? 0;
  if (tail === "down") s += `<path d="M ${tx - 30} ${h / 2 - 4} L ${tx} ${h / 2 + 50} L ${tx + 30} ${h / 2 - 4}" fill="#fff" ${ink(8)}/><rect x="${tx - 26}" y="${h / 2 - 14}" width="52" height="14" fill="#fff"/>`;
  if (tail === "left") s += `<path d="M ${-w / 2 + 4} ${-20} L ${-w / 2 - 50} 20 L ${-w / 2 + 4} 30" fill="#fff" ${ink(8)}/><rect x="${-w / 2}" y="-24" width="14" height="58" fill="#fff"/>`;
  if (tail === "right") s += `<path d="M ${w / 2 - 4} ${-20} L ${w / 2 + 50} 20 L ${w / 2 - 4} 30" fill="#fff" ${ink(8)}/><rect x="${w / 2 - 14}" y="-24" width="14" height="58" fill="#fff"/>`;
  lines.forEach((l, i) => {
    s += T(0, -h / 2 + 25 + fs * 1.25 * (i + 0.8), l, fs, { fill: i === lines.length - 1 && p.accentLast ? C.red : C.ink, weight: 800 });
  });
  return s;
}

function thought(p) {
  const r = 150;
  let s = `<circle cx="-150" cy="200" r="16" fill="#fff" ${ink(6)}/><circle cx="-100" cy="150" r="26" fill="#fff" ${ink(6)}/>`;
  s += `<path d="M -170 0 C -230 -100, -120 -190, -40 -150 C 0 -220, 130 -210, 150 -130 C 240 -110, 230 40, 140 60 C 120 140, -40 150, -80 90 C -180 120, -230 40, -170 0 Z" fill="#fff" ${ink(8)}/>`;
  if (p.icon) s += `<g transform="translate(0 -40) scale(1.6)">${icon(p.icon)}</g>`;
  if (p.text) s += T(0, p.icon ? 70 : 10, String(p.text).toUpperCase(), p.size || fitFont(p.text, 300, 50, 26), { fill: C.ink });
  return s;
}

function label(p) {
  const fs = p.size || 34;
  const w = String(p.text).length * fs * 0.62 + 44;
  let s = "";
  if (p.toX != null) s += `<path d="M 0 0 L ${p.toX} ${p.toY}" stroke="#fff" stroke-width="6"/><circle cx="${p.toX}" cy="${p.toY}" r="8" fill="#fff" ${ink(3)}/>`;
  s += `<rect x="${-w / 2}" y="${-fs * 0.85}" width="${w}" height="${fs * 1.7}" rx="${fs * 0.5}" fill="#fff" ${ink(6)}/>`;
  s += T(0, fs * 0.33, p.text, fs, { fill: C.ink, weight: 800 });
  return s;
}

function sticker(p) {
  const fs = p.size || 50;
  const w = String(p.text).length * fs * 0.6 + 60;
  return `<g transform="rotate(${p.rot ?? -6})"><rect x="${-w / 2}" y="${-fs}" width="${w}" height="${fs * 1.9}" rx="14" fill="#fff" ${ink(7)}/>${T(0, fs * 0.36, p.text, fs, { fill: p.color || C.red, weight: 900 })}</g>`;
}

function bigText(p) {
  const fs = p.size || fitFont(p.text, 900, 170, 60);
  return T(0, fs * 0.35, p.text, fs, { fill: p.color || C.red, stroke: p.strokeColor || "#fff", sw: fs * 0.12 });
}

function chip(p) {
  const fs = p.size || 36;
  const w = String(p.text).length * fs * 0.58 + 60;
  return `<rect x="${-w / 2}" y="${-fs * 0.95}" width="${w}" height="${fs * 1.9}" rx="${fs * 0.95}" fill="#2a2440" stroke="#fff" stroke-width="5"/>` + T(0, fs * 0.35, p.text, fs, { fill: "#fff", weight: 800 });
}

function sign(p) {
  const fs = p.size || fitFont(p.text, 760, 80, 34);
  const w = Math.min(980, String(p.text).length * fs * 0.72 + 90);
  return `<rect x="${-w / 2}" y="${-fs}" width="${w}" height="${fs * 2}" rx="14" fill="${p.color || C.red}" ${ink(8)}/>` + T(0, fs * 0.36, p.text, fs, { fill: "#fff" });
}

function calendar(p) {
  return `<g transform="rotate(${p.rot ?? -5})"><rect x="-150" y="-150" width="300" height="320" rx="24" fill="#fff" ${ink(8)}/>
    <path d="M -150 -60 L -150 -126 Q -150 -150 -126 -150 L 126 -150 Q 150 -150 150 -126 L 150 -60 Z" fill="${C.red}" ${ink(8)}/>
    ${T(0, -82, String(p.month || "").toUpperCase(), 52, { fill: "#fff" })}
    ${T(0, 110, p.day ?? "30", 150, { fill: C.ink })}
    <rect x="-90" y="-176" width="24" height="56" rx="10" fill="#9aa1b2" ${ink(5)}/><rect x="66" y="-176" width="24" height="56" rx="10" fill="#9aa1b2" ${ink(5)}/></g>`;
}

function wallet(p) {
  return `<rect x="-200" y="-130" width="400" height="260" rx="36" fill="#7a4b2a" ${ink(8)}/><path d="M -200 -40 L 200 -40" ${ink(7)}/>
    <rect x="60" y="-20" width="140" height="80" rx="20" fill="#5e3920" ${ink(7)}/><circle cx="110" cy="20" r="14" fill="${C.yellow}" ${ink(5)}/>
    <rect x="-150" y="170" width="300" height="90" rx="22" fill="#fff" ${ink(7)}/>${T(0, 236, p.text || "$0.00", 62, { fill: C.red })}`;
}

function scale(p) {
  return `<rect x="-200" y="-40" width="400" height="80" rx="20" fill="#f4f4f6" ${ink(8)}/><rect x="-80" y="-24" width="160" height="48" rx="10" fill="#1b1b28"/>${T(0, 14, p.text || "", 34, { fill: C.green })}`;
}

function bike(p) {
  return `<circle cx="-170" cy="40" r="110" fill="none" ${ink(14)}/><circle cx="170" cy="40" r="110" fill="none" ${ink(14)}/>
    <path d="M -170 40 L -40 40 L 60 -120 L -100 -120 Z M 60 -120 L 170 40 M -40 40 L -110 -170 M -150 -170 L -60 -170 M 60 -120 L 40 -210 L 100 -230" fill="none" stroke="${p.color || C.blue}" stroke-width="20" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="-40" cy="40" r="26" fill="#9aa1b2" ${ink(6)}/><path d="M -40 40 L -10 90" ${ink(10)}/><rect x="-30" y="84" width="50" height="16" rx="6" fill="${C.ink}"/>`;
}

function stand(p) {
  return `<rect x="-260" y="-60" width="520" height="300" fill="${p.color || "#f6dc9b"}" ${ink(8)}/>
    <rect x="-280" y="-120" width="560" height="70" fill="#fff" ${ink(8)}/>${T(0, -68, p.text || "LEMONADE", 50, { fill: C.ink })}
    <path d="M -260 -120 L -260 -300 M 260 -120 L 260 -300" ${ink(12)}/><path d="M -300 -300 L 300 -300 L 260 -360 L -260 -360 Z" fill="${C.red}" ${ink(8)}/>
    ${p.closed ? `<g transform="rotate(-12)"><rect x="-200" y="40" width="400" height="110" rx="12" fill="${C.red}" ${ink(8)}/>${T(0, 120, p.closedText || "CLOSED", 70, { fill: "#fff" })}</g>` : ""}`;
}

function hanger(p) {
  return `<path d="M 0 -260 Q 0 -300 26 -300 Q 50 -300 50 -276 Q 50 -256 0 -236 L -150 -160 L 150 -160 Z" fill="none" ${ink(8)}/>
    <g transform="scale(${p.small ? 0.55 : 1}) translate(0 ${p.small ? -110 : 0})"><path d="M -150 -160 L 150 -160 L 170 200 L -170 200 Z" fill="#2c2f45" ${ink(8)}/><path d="M -60 -160 L 0 -20 L 60 -160 Z" fill="#fff" ${ink(6)}/><path d="M 0 -130 L -16 -110 L 0 20 L 16 -110 Z" fill="${C.red}" ${ink(5)}/></g>
    ${p.tag ? `<g transform="translate(150 -60) rotate(10)"><rect x="-90" y="-36" width="180" height="72" rx="10" fill="${C.yellow}" ${ink(6)}/>${T(0, 14, p.tag, 36, { fill: C.ink })}</g>` : ""}`;
}

function trashbags(p) {
  let s = "";
  const pos = [[-170, 0], [0, -10], [170, 0], [-85, -150], [85, -150], [0, -290]];
  for (const [x, y] of pos.slice(0, p.n || 6)) s += `<path d="M ${x - 90} ${y + 60} Q ${x - 110} ${y - 60} ${x} ${y - 90} Q ${x + 110} ${y - 60} ${x + 90} ${y + 60} Z" fill="#2b2b3a" ${ink(7)}/><path d="M ${x - 14} ${y - 90} L ${x} ${y - 120} L ${x + 14} ${y - 90}" fill="${C.yellow}" ${ink(5)}/>`;
  return s;
}

function door(p) {
  return `<rect x="-150" y="-560" width="300" height="560" fill="${p.color || "#9a6236"}" ${ink(8)}/><rect x="-110" y="-520" width="220" height="200" fill="none" ${ink(6)}/><rect x="-110" y="-280" width="220" height="230" fill="none" ${ink(6)}/><circle cx="110" cy="-280" r="16" fill="${C.yellow}" ${ink(5)}/>`;
}

function money(p) {
  let s = "";
  const n = p.n || 5;
  for (let i = 0; i < n; i++) s += `<g transform="translate(${(i - n / 2) * 60} ${-(i % 2) * 30}) rotate(${(i - 2) * 9})"><rect x="-90" y="-50" width="180" height="100" rx="10" fill="#7fd36f" ${ink(6)}/><circle r="26" fill="#bff0b0" ${ink(5)}/>${T(0, 12, "$", 36, { fill: "#2f7a3a" })}</g>`;
  return s;
}

// ---------------------------------------------------------------- phone

function phone(p, id, ctx) {
  const pw = 660, ph = 1240, x0 = -pw / 2, y0 = -ph / 2;
  const sx = x0 + 26, sy = y0 + 26, sw = pw - 52, sh = ph - 52;
  let s = `<rect x="${x0}" y="${y0}" width="${pw}" height="${ph}" rx="86" fill="#1b1830" ${ink(8)}/>`;
  s += `<clipPath id="${id}-clip"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="64"/></clipPath><g clip-path="url(#${id}-clip)">`;
  const screen = p.screen || "lock";
  if (screen === "lock") {
    s += `<linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b3fd6"/><stop offset="1" stop-color="#2a1f5a"/></linearGradient><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="url(#${id}-g)"/>`;
    s += T(0, sy + 280, p.time || "23:12", 150, { fill: "#fff", weight: 700, font: "Montserrat" });
    s += T(0, sy + 350, p.date || "Friday, October 2", 36, { fill: "#e6e0ff", weight: 600, font: "Montserrat" });
    (p.notifications || (p.notif ? [p.notif] : [])).forEach((n, i) => {
      const nid = `${id}-n${i}`;
      const y = sy + 430 + i * 170;
      s += `<g id="${nid}" opacity="0"><g data-anim-inner="1"><rect x="${sx + 30}" y="${y}" width="${sw - 60}" height="150" rx="34" fill="#fff"/>
        <circle cx="${sx + 92}" cy="${y + 75}" r="34" fill="${n.color || C.pink}"/>${T(sx + 92, y + 90, (n.app || "N")[0], 40, { fill: "#fff" })}
        ${T(sx + 146, y + 62, n.title || "", 34, { fill: C.ink, anchor: "start", weight: 800, font: "Montserrat" })}
        ${T(sx + 146, y + 110, n.text || "", 30, { fill: "#3a3a4a", anchor: "start", weight: 600, font: "Montserrat" })}
        ${T(sx + sw - 50, y + 50, "now", 24, { fill: "#888", anchor: "end", weight: 600, font: "Montserrat" })}</g></g>`;
      ctx.anim(nid, n.at ?? 0.2, "slideDown");
    });
  } else if (screen === "chat") {
    s += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="#f3f0fb"/><rect x="${sx}" y="${sy}" width="${sw}" height="210" fill="${C.purple}"/>`;
    s += T(sx + 60, sy + 70, p.clock || "21:47", 28, { fill: "#fff", anchor: "start", weight: 700, font: "Montserrat" });
    s += `<circle cx="${sx + 110}" cy="${sy + 145}" r="40" fill="${p.avatarColor || C.pink}" stroke="#fff" stroke-width="5"/>` + T(sx + 110, sy + 160, (p.name || "?")[0], 40, { fill: "#fff" });
    s += T(sx + 170, sy + 140, p.name || "", 40, { fill: "#fff", anchor: "start", weight: 800, font: "Montserrat" });
    s += `<circle cx="${sx + 178}" cy="${sy + 170}" r="8" fill="#5cff8a"/>` + T(sx + 194, sy + 179, p.status || "online", 26, { fill: "#e6e0ff", anchor: "start", weight: 600, font: "Montserrat" });
    let y = sy + 260;
    (p.messages || []).forEach((m, i) => {
      const mid = `${id}-m${i}`;
      const lines = m.img ? [] : wrapLines(m.text || "", 20);
      const fs = 34;
      const bw = m.img ? 300 : Math.min(sw - 120, Math.max(...lines.map((l) => l.length)) * fs * 0.56 + 60);
      const bh = m.img ? 360 : lines.length * fs * 1.3 + 44;
      const me = m.from === "me";
      const bx = me ? sx + sw - 40 - bw : sx + 40;
      s += `<g id="${mid}" opacity="0"><g data-anim-inner="1"><rect x="${bx}" y="${y}" width="${bw}" height="${bh}" rx="28" fill="${me ? C.purple : "#fff"}" stroke="#d9d4ec" stroke-width="3"/>`;
      if (m.img === "dark") s += `<rect x="${bx + 20}" y="${y + 20}" width="${bw - 40}" height="${bh - 40}" rx="18" fill="#000"/><circle cx="${bx + bw / 2 - 22}" cy="${y + bh / 2}" r="12" fill="#fff"/><circle cx="${bx + bw / 2 + 22}" cy="${y + bh / 2}" r="12" fill="#fff"/>`;
      else if (m.img) s += `<rect x="${bx + 20}" y="${y + 20}" width="${bw - 40}" height="${bh - 40}" rx="18" fill="#8fb6ff"/>`;
      lines.forEach((l, k) => (s += T(bx + 30, y + 22 + fs * 1.3 * (k + 0.85), l, fs, { fill: me ? "#fff" : C.ink, anchor: "start", weight: 700, font: "Montserrat" })));
      s += `</g></g>`;
      ctx.anim(mid, m.at ?? 0.2 + i * 0.6, "slideUp");
      y += bh + 30;
    });
    s += `<rect x="${sx + 30}" y="${sy + sh - 120}" width="${sw - 150}" height="80" rx="40" fill="#fff" stroke="#d9d4ec" stroke-width="3"/>` + T(sx + 70, sy + sh - 68, "Message", 28, { fill: "#aaa", anchor: "start", weight: 600, font: "Montserrat" });
    s += `<circle cx="${sx + sw - 70}" cy="${sy + sh - 80}" r="40" fill="${C.purple}"/><path d="M ${sx + sw - 86} ${sy + sh - 100} L ${sx + sw - 50} ${sy + sh - 80} L ${sx + sw - 86} ${sy + sh - 60} Z" fill="#fff"/>`;
  } else if (screen === "call") {
    s += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="#1f2b3f"/>`;
    s += T(0, sy + 200, p.label || "incoming call", 34, { fill: "#cfd7e6", weight: 600, font: "Montserrat" });
    s += T(0, sy + 290, p.name || "MOM", 80, { fill: "#fff", weight: 800, font: "Montserrat" });
    s += `<circle id="${id}-ring" cx="0" cy="${sy + 560}" r="150" fill="none" stroke="#fff" stroke-width="6" opacity=".35"/><circle cx="0" cy="${sy + 560}" r="120" fill="${p.avatarColor || C.pink}" stroke="#fff" stroke-width="8"/>${T(0, sy + 595, (p.name || "M")[0], 100, { fill: "#fff" })}`;
    s += `<circle cx="-160" cy="${sy + sh - 200}" r="70" fill="${C.red}"/><path d="M -200 ${sy + sh - 200} Q -160 ${sy + sh - 230} -120 ${sy + sh - 200}" stroke="#fff" stroke-width="16" fill="none" stroke-linecap="round"/>`;
    s += `<circle cx="160" cy="${sy + sh - 200}" r="70" fill="${C.green}"/><path d="M 120 ${sy + sh - 210} Q 160 ${sy + sh - 240} 200 ${sy + sh - 210}" stroke="#fff" stroke-width="16" fill="none" stroke-linecap="round"/>`;
    ctx.anim(`${id}-ring`, 0, "pulse");
  } else if (screen === "post") {
    s += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="#fff"/><rect x="${sx}" y="${sy}" width="${sw}" height="150" fill="#f4f4f8"/>`;
    s += T(0, sy + 100, p.app || "Friendbook", 40, { fill: C.blue, weight: 800, font: "Montserrat" });
    s += `<circle cx="${sx + 90}" cy="${sy + 230}" r="46" fill="${p.avatarColor || C.orange}"/>` + T(sx + 90, sy + 248, (p.name || "?")[0], 46, { fill: "#fff" });
    s += T(sx + 160, sy + 222, p.name || "", 36, { fill: C.ink, anchor: "start", weight: 800, font: "Montserrat" }) + T(sx + 160, sy + 262, p.meta || "2 min", 26, { fill: "#888", anchor: "start", weight: 600, font: "Montserrat" });
    wrapLines(p.text || "", 22).forEach((l, k) => (s += T(sx + 50, sy + 360 + k * 56, l, 40, { fill: C.ink, anchor: "start", weight: 700, font: "Montserrat" })));
    s += `<rect x="${sx + 40}" y="${sy + 560}" width="${sw - 80}" height="380" rx="20" fill="${p.imgColor || "#ffe2a8"}"/>`;
    if (p.imgIcon) s += `<g transform="translate(0 ${sy + 750}) scale(2.4)">${icon(p.imgIcon)}</g>`;
    s += `<g id="${id}-likes" opacity="0"><g data-anim-inner="1">${T(sx + 50, sy + 1010, `♥ ${p.likes || "0"}  ·  ${p.comments || "0"} comments`, 34, { fill: C.red, anchor: "start", weight: 800, font: "Montserrat" })}</g></g>`;
    ctx.anim(`${id}-likes`, p.likesAt ?? 0.6, "slideUp");
  } else if (screen === "app") {
    s += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${p.color || "#1f2b3f"}"/>`;
    s += T(0, sy + 200, p.title || "", 44, { fill: "#fff", weight: 800, font: "Montserrat" });
    s += T(0, sy + 560, p.big || "", fitFont(p.big || "", sw - 80, 150, 60), { fill: p.bigColor || "#fff", weight: 800, font: "Montserrat" });
    s += T(0, sy + 650, p.sub || "", 36, { fill: "#cfd7e6", weight: 600, font: "Montserrat" });
    if (p.chart) s += `<path d="M ${sx + 80} ${sy + 950} Q ${sx + 220} ${sy + 820} ${sx + 330} ${sy + 900} T ${sx + sw - 80} ${sy + 760}" fill="none" stroke="${C.green}" stroke-width="14" stroke-linecap="round"/>`;
  }
  s += `</g><rect x="-80" y="${y0 + 42}" width="160" height="40" rx="20" fill="#000"/>`;
  return s;
}

// ---------------------------------------------------------------- dispatcher

export const PROP_TYPES = ["burst", "bubble", "thought", "label", "sticker", "bigText", "chip", "sign", "calendar", "wallet", "scale", "bike", "stand", "hanger", "trash", "door", "money", "phone", "icon", "svg"];

export function prop(p, id, ctx) {
  switch (p.type) {
    case "burst": return burst(p);
    case "bubble": return bubble(p);
    case "thought": return thought(p);
    case "label": return label(p);
    case "sticker": return sticker(p);
    case "bigText": return bigText(p);
    case "chip": return chip(p);
    case "sign": return sign(p);
    case "calendar": return calendar(p);
    case "wallet": return wallet(p);
    case "scale": return scale(p);
    case "bike": return bike(p);
    case "stand": return stand(p);
    case "hanger": return hanger(p);
    case "trash": return trashbags(p);
    case "door": return door(p);
    case "money": return money(p);
    case "phone": return phone(p, id, ctx);
    case "icon": return `<g transform="scale(${p.size ? p.size / 90 : 1.6})">${icon(p.name)}</g>`;
    case "svg": return p.markup || "";
    default: throw new Error(`Unknown prop type "${p.type}". Known: ${PROP_TYPES.join(", ")}`);
  }
}
