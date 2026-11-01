// Small shared helpers for the vote-series builder.

export const W = 1080;
export const H = 1920;

// Palette sampled from the reference videos (flat cartoon, dark-violet base).
export const C = {
  ink: "#1d1b2f", // every outline
  night: "#17132b", // darkest background
  violet: "#2a2152", // default background
  violetMid: "#3a2d72",
  purple: "#6b4ff0", // episode badge, phone header
  purpleLight: "#8f78ff",
  yellow: "#ffd23f", // highlighted caption word, accents
  red: "#e8414b",
  blue: "#3466f0", // vote card A
  orange: "#f5862b", // vote card B
  green: "#36c26b",
  pink: "#ff6b9a",
  white: "#ffffff",
  cream: "#fff7e6",
  grey: "#c9c6d6",
  skin: "#f6c7a1",
  blush: "#f28a8a",
  tear: "#5cc8ff",
};

export const FONT = "Montserrat";

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Deterministic RNG (renders must be identical every time).
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function shade(hex, amt) {
  // amt -1..1 : darken (<0) or lighten (>0)
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  r = f(r);
  g = f(g);
  b = f(b);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export const r2 = (n) => Math.round(n * 100) / 100;

// Rough width of uppercase Montserrat 900 text, in em.
export function textWidthEm(text) {
  let w = 0;
  for (const ch of String(text)) {
    if (ch === " ") w += 0.3;
    else if ("IJ1.,:;!'|".includes(ch)) w += 0.38;
    else if ("MW".includes(ch)) w += 1.0;
    else w += 0.74;
  }
  return w;
}

export function fitFont(text, maxWidth, base, min = 36) {
  const em = textWidthEm(String(text).toUpperCase());
  return Math.max(min, Math.min(base, Math.floor(maxWidth / Math.max(em, 0.1))));
}

// UI strings per language. series.json "lang" picks the table; any key can be
// overridden in series.json "strings".
export const STRINGS = {
  en: {
    episode: "EPISODE", countdown: "{n} DAYS LEFT", question: "WHAT SHOULD {hero} DO?",
    cta: "Write A or B in the comments!", recap1: "LAST EPISODE", recap2: "YOU DECIDED", winner: "WINNER!",
    now: "now", message: "Message", online: "online", incoming: "incoming call", comments: "comments",
  },
  de: {
    episode: "FOLGE", countdown: "NOCH {n} TAGE", question: "WAS SOLL {hero} TUN?",
    cta: "Schreib A oder B in die Kommentare!", recap1: "LETZTE FOLGE", recap2: "HABT IHR ENTSCHIEDEN", winner: "GEWONNEN!",
    now: "jetzt", message: "Nachricht", online: "online", incoming: "eingehender Anruf", comments: "Kommentare",
  },
};
export const S = { ...STRINGS.en };
export function setLang(lang = "en", overrides = {}) {
  Object.assign(S, STRINGS.en, STRINGS[lang] || {}, overrides);
}
export const fmt = (t, vars) => String(t).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
