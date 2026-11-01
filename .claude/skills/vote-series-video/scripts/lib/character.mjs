// Parametric cartoon character rig, drawn as SVG at build time.
// Look: flat colours, thick dark outline, huge round head, big white eyes with
// small pupils, rosy cheeks, puffy shoulder balls, short legs, chunky shoes.
// Local coordinates: feet centre at (0,0), head centre at about (0,-720).

import { C, esc, rng, hashStr, shade } from "./util.mjs";

const SW = 8; // outline width
const ink = `stroke="${C.ink}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"`;
const inkW = (w) => `stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

export const EXPRESSIONS = [
  "neutral", "happy", "grin", "joy", "shock", "panic", "sad", "cry", "angry",
  "gritted", "sleepy", "smug", "tired", "love", "squint",
];

export const POSES = { stand: [8, -8], armsUp: [155, -155], wave: [8, -150], point: [8, -95], hold: [-28, 28], shrug: [60, -60], hips: [35, -35], facepalm: [8, -165] };

export const DEFAULT_LOOK = {
  skin: C.skin,
  hair: "#5b3a22",
  hairStyle: "messy", // messy | short | long | bun | ponytail | bald | curly | spiky
  shirt: "#f4f4f6",
  print: "none", // none | stain | text | heart | stripe
  printText: "",
  pants: "#6b6f80",
  shoes: "#3466f0",
  outfit: "casual", // casual | suit | dress | hoodie | tank
  build: "regular", // slim | regular | chubby
  belly: false,
  pimples: false,
  stubble: false,
  facialHair: "none", // none | mustache | beard
  lashes: false,
  accessory: [], // headset | glasses | sunglasses | headband | beanie | cap | tie | bow
  flies: false,
};

function hairBack(L) {
  const h = L.hair;
  switch (L.hairStyle) {
    case "long":
      return `<path d="M -200 -760 C -225 -990, 225 -990, 200 -760 L 222 -470 Q 160 -440 120 -480 L -120 -480 Q -160 -440 -222 -470 Z" fill="${h}" ${ink}/>`;
    case "ponytail":
      return `<path d="M 150 -820 C 260 -820, 280 -650, 230 -520 C 215 -560, 205 -640, 160 -700 Z" fill="${h}" ${ink}/>`;
    case "bun":
      return `<circle cx="0" cy="-905" r="62" fill="${h}" ${ink}/>`;
    case "curly":
      return [...Array(9)].map((_, i) => {
        const a = Math.PI + (i / 8) * Math.PI;
        return `<circle cx="${Math.cos(a) * 172}" cy="${-730 + Math.sin(a) * 162}" r="52" fill="${h}" ${ink}/>`;
      }).join("");
    default:
      return "";
  }
}

function hairFront(L) {
  const h = L.hair;
  switch (L.hairStyle) {
    case "messy":
      return `<path d="M -184 -700 C -205 -990, 205 -990, 184 -700 L 168 -742 L 132 -778 L 96 -756 L 58 -792 L 18 -762 L -22 -796 L -62 -764 L -102 -792 L -138 -758 L -168 -742 Z" fill="${h}" ${ink}/>
      <path d="M -40 -880 L -20 -925 L 0 -878 M 30 -878 L 62 -915 L 64 -872" fill="${h}" ${ink}/>`;
    case "spiky":
      return `<path d="M -180 -720 L -200 -830 L -140 -820 L -130 -920 L -60 -860 L -20 -950 L 30 -862 L 100 -930 L 120 -830 L 200 -840 L 180 -720 L 140 -780 L 60 -770 L -20 -790 L -100 -770 Z" fill="${h}" ${ink}/>`;
    case "short":
      return `<path d="M -180 -715 C -200 -985, 200 -985, 180 -715 C 140 -790, 60 -805, -10 -790 C -90 -805, -150 -780, -180 -715 Z" fill="${h}" ${ink}/>`;
    case "long":
      return `<path d="M -186 -700 C -205 -990, 205 -990, 186 -700 C 150 -800, 40 -820, 0 -790 C -40 -820, -150 -800, -186 -700 Z" fill="${h}" ${ink}/>`;
    case "ponytail":
      return `<path d="M -182 -715 C -200 -985, 200 -985, 182 -715 C 120 -800, 0 -810, -60 -800 C -120 -790, -160 -770, -182 -715 Z" fill="${h}" ${ink}/>`;
    case "bun":
      return `<path d="M -180 -712 C -200 -985, 200 -985, 180 -712 C 130 -800, 30 -805, 0 -785 C -30 -805, -130 -800, -180 -712 Z" fill="${h}" ${ink}/>`;
    case "curly":
      return `<path d="M -178 -720 C -200 -985, 200 -985, 178 -720 C 150 -790, 80 -800, 0 -790 C -80 -800, -150 -790, -178 -720 Z" fill="${h}" ${ink}/>`
        + [...Array(5)].map((_, i) => `<circle cx="${-120 + i * 60}" cy="${-800 + (i % 2) * 14}" r="34" fill="${h}" ${ink}/>`).join("");
    case "bald":
      return `<path d="M -30 -880 Q -10 -910 10 -880 M 10 -884 Q 30 -915 46 -882" fill="none" ${inkW(6)}/>`;
    default:
      return "";
  }
}

function brows(expr, L) {
  const bw = L.hairStyle === "bald" ? C.ink : shade(L.hair, -0.25);
  const b = (d) => `<path d="${d}" fill="none" stroke="${bw}" stroke-width="16" stroke-linecap="round"/>`;
  switch (expr) {
    case "shock": case "panic": case "joy": case "love":
      return b("M -110 -830 Q -72 -848 -36 -832") + b("M 36 -832 Q 72 -848 110 -830");
    case "sad": case "cry": case "tired":
      return b("M -110 -800 L -38 -826") + b("M 38 -826 L 110 -800");
    case "angry": case "gritted":
      return b("M -110 -830 L -36 -800") + b("M 36 -800 L 110 -830");
    case "smug":
      return b("M -110 -806 Q -72 -812 -36 -806") + b("M 36 -832 Q 72 -850 110 -834");
    default:
      return b("M -108 -808 Q -72 -822 -36 -808") + b("M 36 -808 Q 72 -822 108 -808");
  }
}

function pupils(expr, look = [0, 0]) {
  const [dx, dy] = look;
  if (expr === "joy") {
    return `<path d="M -100 -728 Q -68 -770 -36 -728 M 36 -728 Q 68 -770 100 -728" fill="none" ${inkW(12)}/>`;
  }
  if (expr === "squint") {
    return `<path d="M -104 -756 L -40 -735 L -104 -714 M 104 -756 L 40 -735 L 104 -714" fill="none" ${inkW(11)}/>`;
  }
  if (expr === "love") {
    const heart = (x) => `<path transform="translate(${x} -738) scale(1.4)" d="M 0 12 C -22 -2, -16 -22, 0 -12 C 16 -22, 22 -2, 0 12 Z" fill="${C.red}" ${inkW(3)}/>`;
    return heart(-68) + heart(68);
  }
  const r = expr === "shock" || expr === "panic" ? 9 : expr === "angry" ? 13 : 16;
  const p = (x) => `<circle cx="${x + dx}" cy="${-735 + dy}" r="${r}" fill="${C.ink}"/><circle cx="${x + dx + 5}" cy="${-741 + dy}" r="4" fill="#fff"/>`;
  let s = p(-68) + p(68);
  if (expr === "tired") {
    s += `<path d="M -112 -742 L -24 -742 M 24 -742 L 112 -742" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/>`
      + `<path d="M -110 -730 Q -68 -755 -26 -730 L -26 -790 L -110 -790 Z M 26 -730 Q 68 -755 110 -730 L 110 -790 L 26 -790 Z" fill="${C.skin}" opacity="0"/>`;
  }
  return s;
}

function mouth(expr, L) {
  const dark = "#4a1f2a";
  const tongue = "#f0707a";
  const stroke = L.lashes ? "#c24a5a" : C.ink;
  switch (expr) {
    case "happy": case "smug":
      return expr === "smug"
        ? `<path d="M -40 -628 Q 10 -612 52 -648" fill="none" stroke="${stroke}" stroke-width="9" stroke-linecap="round"/>`
        : `<path d="M -52 -642 Q 0 -588 52 -642" fill="none" stroke="${stroke}" stroke-width="9" stroke-linecap="round"/>`;
    case "grin": case "joy": case "love":
      return `<path d="M -66 -648 Q 0 -548 66 -648 Z" fill="${dark}" ${inkW(7)}/>
        <path d="M -58 -646 L 58 -646 L 52 -628 L -52 -628 Z" fill="#fff"/>
        <path d="M -30 -588 Q 0 -610 30 -588 Q 0 -572 -30 -588 Z" fill="${tongue}"/>`;
    case "squint":
      return `<ellipse cx="0" cy="-618" rx="22" ry="26" fill="${dark}" ${inkW(6)}/>`;
    case "shock": case "panic":
      return `<ellipse cx="0" cy="-612" rx="34" ry="44" fill="${dark}" ${inkW(7)}/>
        <path d="M -22 -585 Q 0 -605 22 -585 Q 0 -572 -22 -585 Z" fill="${tongue}"/>`;
    case "sad":
      return `<path d="M -42 -606 Q 0 -646 42 -606" fill="none" stroke="${stroke}" stroke-width="9" stroke-linecap="round"/>`;
    case "cry":
      return `<path d="M -60 -600 Q -40 -650 0 -648 Q 40 -650 60 -600 Q 30 -612 0 -604 Q -30 -612 -60 -600 Z" fill="${dark}" ${inkW(7)}/>`;
    case "angry":
      return `<path d="M -44 -616 Q 0 -640 44 -616" fill="none" stroke="${stroke}" stroke-width="10" stroke-linecap="round"/>`;
    case "gritted":
      return `<rect x="-62" y="-654" width="124" height="46" rx="16" fill="#fff" ${inkW(7)}/>
        <path d="M -62 -631 L 62 -631 M -31 -654 L -31 -608 M 0 -654 L 0 -608 M 31 -654 L 31 -608" stroke="${C.ink}" stroke-width="4"/>`;
    case "sleepy":
      return `<ellipse cx="0" cy="-618" rx="14" ry="16" fill="${dark}" ${inkW(6)}/>`;
    case "tired":
      return `<path d="M -50 -640 Q 0 -660 50 -640 L 44 -606 Q 0 -590 -44 -606 Z" fill="${dark}" ${inkW(7)}/>
        <path d="M -24 -615 Q -26 -560 0 -555 Q 26 -560 24 -615 Z" fill="${tongue}" ${inkW(6)}/>`;
    default:
      return `<path d="M -36 -628 Q 0 -616 36 -628" fill="none" stroke="${stroke}" stroke-width="9" stroke-linecap="round"/>`;
  }
}

function extras(expr) {
  const tear = C.tear;
  switch (expr) {
    case "cry":
      return `<path d="M -92 -700 Q -100 -600 -88 -520 L -60 -520 Q -70 -610 -62 -700 Z" fill="${tear}" ${inkW(5)} opacity="0.95"/>
        <path d="M 92 -700 Q 100 -600 88 -520 L 60 -520 Q 70 -610 62 -700 Z" fill="${tear}" ${inkW(5)} opacity="0.95"/>`;
    case "panic":
      return `<path d="M 170 -850 Q 196 -810 186 -790 Q 170 -775 156 -792 Q 150 -812 170 -850 Z" fill="${tear}" ${inkW(5)}/>`;
    case "tired":
      return `<path d="M 168 -840 Q 190 -808 182 -792 Q 168 -780 156 -794 Q 150 -812 168 -840 Z" fill="${tear}" ${inkW(5)}/>`;
    case "shock":
      return `<path d="M -150 -900 L -175 -940 M 0 -930 L 0 -975 M 150 -900 L 175 -940" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/>`;
    case "sleepy":
      return `<text x="170" y="-860" font-family="Montserrat" font-weight="900" font-size="60" fill="#fff" stroke="${C.ink}" stroke-width="8" paint-order="stroke">z</text>
        <text x="215" y="-930" font-family="Montserrat" font-weight="900" font-size="80" fill="#fff" stroke="${C.ink}" stroke-width="8" paint-order="stroke">Z</text>`;
    case "angry":
      return `<path d="M 140 -880 l 18 -18 m -18 0 l 18 18 M 170 -860 l 18 -18" stroke="${C.red}" stroke-width="9" stroke-linecap="round"/>`;
    default:
      return "";
  }
}

function accessoriesBehind(L) {
  const acc = new Set(L.accessory || []);
  let s = "";
  if (acc.has("headset")) s += `<path d="M -190 -720 C -200 -960, 200 -960, 190 -720" fill="none" stroke="${C.ink}" stroke-width="22"/>`;
  return s;
}

function accessoriesFront(L) {
  const acc = new Set(L.accessory || []);
  let s = "";
  if (acc.has("headset")) {
    s += `<rect x="-222" y="-770" width="56" height="110" rx="26" fill="#2b2b3a" ${ink}/><circle cx="-194" cy="-715" r="10" fill="${C.green}"/>
      <rect x="166" y="-770" width="56" height="110" rx="26" fill="#2b2b3a" ${ink}/><circle cx="194" cy="-715" r="10" fill="${C.green}"/>
      <path d="M 190 -680 Q 170 -600 70 -600" fill="none" stroke="${C.ink}" stroke-width="10" stroke-linecap="round"/><circle cx="66" cy="-600" r="13" fill="#2b2b3a"/>`;
  }
  if (acc.has("glasses")) s += `<circle cx="-68" cy="-735" r="62" fill="none" ${inkW(9)}/><circle cx="68" cy="-735" r="62" fill="none" ${inkW(9)}/><path d="M -6 -740 L 6 -740" ${inkW(9)}/>`;
  if (acc.has("sunglasses")) s += `<path d="M -140 -770 L 140 -770 L 130 -720 Q 100 -690 60 -700 Q 20 -712 12 -745 L -12 -745 Q -20 -712 -60 -700 Q -100 -690 -130 -720 Z" fill="#1b1b28" ${inkW(7)}/><path d="M -110 -755 L -80 -755" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".6"/>`;
  if (acc.has("headband")) s += `<path d="M -178 -800 Q 0 -860 178 -800 L 176 -770 Q 0 -830 -176 -770 Z" fill="${C.red}" ${inkW(6)}/><path d="M -177 -786 Q 0 -846 177 -786" stroke="#fff" stroke-width="9" fill="none"/>`;
  if (acc.has("beanie")) s += `<path d="M -186 -760 C -190 -950, 190 -950, 186 -760 Z" fill="${C.red}" ${ink}/><rect x="-196" y="-790" width="392" height="58" rx="26" fill="${shade(C.red, -0.2)}" ${ink}/><circle cx="0" cy="-935" r="40" fill="#fff" ${ink}/>`;
  if (acc.has("cap")) s += `<path d="M -180 -770 C -180 -940, 180 -940, 180 -770 Z" fill="${C.blue}" ${ink}/><path d="M -10 -775 L 250 -775 Q 260 -745 230 -740 L -10 -745 Z" fill="${shade(C.blue, -0.2)}" ${ink}/>`;
  if (acc.has("bow")) s += `<path d="M 90 -880 L 150 -910 L 150 -850 Z M 90 -880 L 30 -910 L 30 -850 Z" fill="${C.pink}" ${inkW(6)}/><circle cx="90" cy="-880" r="16" fill="${C.pink}" ${inkW(6)}/>`;
  return s;
}

function torso(L, id) {
  const w = L.build === "chubby" ? 440 : L.build === "slim" ? 300 : 360;
  const hw = w / 2;
  const top = -575, bot = -215;
  let s = "";
  // legs + shoes
  const legW = L.build === "chubby" ? 96 : 84;
  if (L.outfit !== "dress") {
    s += `<rect x="${-hw * 0.62 - legW / 2}" y="-250" width="${legW}" height="215" fill="${L.pants}" ${ink}/>`;
    s += `<rect x="${hw * 0.62 - legW / 2}" y="-250" width="${legW}" height="215" fill="${L.pants}" ${ink}/>`;
  } else {
    s += `<rect x="-90" y="-120" width="50" height="90" fill="${L.skin}" ${ink}/><rect x="40" y="-120" width="50" height="90" fill="${L.skin}" ${ink}/>`;
  }
  s += `<path d="M ${-hw * 0.62 - 75} 0 Q ${-hw * 0.62 - 80} -55 ${-hw * 0.62 - 20} -55 L ${-hw * 0.62 + 50} -55 Q ${-hw * 0.62 + 60} -55 ${-hw * 0.62 + 60} 0 Z" fill="${L.shoes}" ${ink}/>`;
  s += `<path d="M ${hw * 0.62 + 75} 0 Q ${hw * 0.62 + 80} -55 ${hw * 0.62 + 20} -55 L ${hw * 0.62 - 50} -55 Q ${hw * 0.62 - 60} -55 ${hw * 0.62 - 60} 0 Z" fill="${L.shoes}" ${ink}/>`;
  // belly peeking below the shirt
  if (L.belly) {
    s += `<ellipse cx="0" cy="-205" rx="${hw * 0.86}" ry="62" fill="${L.skin}" ${ink}/><path d="M -8 -186 Q 0 -176 8 -186" fill="none" ${inkW(6)}/>`;
  }
  // shirt / outfit body
  const fill = L.outfit === "suit" ? "#2c2f45" : L.shirt;
  if (L.outfit === "dress") {
    s += `<path d="M ${-hw + 10} ${top + 40} Q ${-hw} ${top} ${-hw + 60} ${top} L ${hw - 60} ${top} Q ${hw} ${top} ${hw - 10} ${top + 40} L ${hw + 50} -110 L ${-hw - 50} -110 Z" fill="${fill}" ${ink}/>`;
    s += `<path d="M -110 -470 L 110 -470 L 130 -150 L -130 -150 Z" fill="#fff" ${inkW(6)}/>`;
  } else {
    s += `<rect x="${-hw}" y="${top}" width="${w}" height="${bot - top + (L.belly ? 0 : 20)}" rx="${L.build === "slim" ? 70 : 100}" fill="${fill}" ${ink}/>`;
  }
  if (L.outfit === "suit") {
    s += `<path d="M -70 ${top + 4} L 0 -420 L 70 ${top + 4} Z" fill="#fff" ${inkW(6)}/>`;
    s += `<path d="M 0 -520 L -22 -500 L 0 -330 L 22 -500 Z" fill="${C.red}" ${inkW(6)}/>`;
    s += `<path d="M -70 ${top + 4} L 0 -420 M 70 ${top + 4} L 0 -420" ${inkW(7)} fill="none"/>`;
    s += `<circle cx="0" cy="-300" r="9" fill="${C.ink}"/><circle cx="0" cy="-260" r="9" fill="${C.ink}"/>`;
  }
  if (L.outfit === "hoodie") {
    s += `<path d="M -90 ${top + 4} Q 0 -480 90 ${top + 4}" fill="none" ${inkW(7)}/><path d="M -30 -500 L -36 -420 M 30 -500 L 36 -420" ${inkW(6)}/>`;
    s += `<path d="M -110 -330 L 110 -330 L 90 -250 L -90 -250 Z" fill="${shade(fill, -0.1)}" ${inkW(6)}/>`;
  }
  if (L.outfit === "tank") {
    s += `<path d="M ${-hw + 40} ${top} Q 0 ${top + 110} ${hw - 40} ${top}" fill="${L.skin}" ${inkW(6)}/>`;
  }
  // print
  if (L.print === "stain") s += `<path d="M 60 -440 q 30 -30 60 -5 q 25 25 0 50 q -10 30 -40 20 q -40 5 -35 -25 q -20 -20 15 -40 Z" fill="${C.red}" ${inkW(5)}/>`;
  if (L.print === "heart") s += `<path transform="translate(0 -420) scale(3)" d="M 0 12 C -22 -2, -16 -22, 0 -12 C 16 -22, 22 -2, 0 12 Z" fill="${C.red}" ${inkW(2)}/>`;
  if (L.print === "stripe") s += `<rect x="${-hw + 4}" y="-420" width="${w - 8}" height="34" fill="${shade(fill, -0.18)}"/>`;
  if (L.print === "text" && L.printText) s += `<text x="0" y="-390" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="64" fill="${shade(fill, -0.55)}">${esc(L.printText)}</text>`;
  // neck shadow
  s += `<path d="M -60 ${top + 6} Q 0 ${top + 40} 60 ${top + 6}" fill="none" stroke="${shade(fill, -0.2)}" stroke-width="8"/>`;
  return { s, hw };
}

function arm(side, L, hw, angle, id) {
  const x = side * (hw - 6);
  const y = -505;
  const fill = L.outfit === "suit" ? "#2c2f45" : L.outfit === "tank" ? L.skin : L.shirt;
  const sleeve = L.outfit === "suit" || L.outfit === "hoodie";
  const armFill = sleeve ? fill : L.skin;
  return `<g id="${id}-arm${side < 0 ? "L" : "R"}" data-ox="${x}" data-oy="${y}" transform="rotate(${angle} ${x} ${y})">
    <rect x="${x - 33}" y="${y}" width="66" height="210" rx="33" fill="${armFill}" ${ink}/>
    <circle cx="${x}" cy="${y + 215}" r="40" fill="${L.skin}" ${ink}/>
  </g>
  <circle cx="${x}" cy="${y}" r="${L.build === "chubby" ? 74 : 64}" fill="${fill}" ${ink}/>`;
}

function face(L, id, exprs, initial, look) {
  const r = rng(hashStr(id));
  let s = "";
  // cheeks
  s += `<ellipse cx="-122" cy="-668" rx="34" ry="22" fill="${C.blush}" opacity="0.55"/><ellipse cx="122" cy="-668" rx="34" ry="22" fill="${C.blush}" opacity="0.55"/>`;
  if (L.pimples) {
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      const px = side * (95 + r() * 70), py = -700 + r() * 90, pr = 6 + r() * 5;
      s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="#e2464f" stroke="#b02d38" stroke-width="2"/>`;
    }
  }
  if (L.stubble) {
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * (0.15 + r() * 0.7);
      const rad = 120 + r() * 40;
      s += `<circle cx="${(Math.cos(a) * rad).toFixed(1)}" cy="${(-700 + Math.sin(a) * rad * 0.8).toFixed(1)}" r="3" fill="${shade(L.skin, -0.45)}"/>`;
    }
  }
  // eyes
  for (const x of [-68, 68]) s += `<circle cx="${x}" cy="-735" r="50" fill="#fff" ${inkW(7)}/>`;
  if (L.lashes) s += `<path d="M -112 -760 l -20 -14 M -104 -775 l -14 -18 M 112 -760 l 20 -14 M 104 -775 l 14 -18" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/>`;
  // nose
  s += `<ellipse cx="0" cy="-688" rx="18" ry="14" fill="${shade(L.skin, -0.08)}" ${inkW(5)}/>`;
  if (L.facialHair === "mustache") s += `<path d="M -60 -650 Q -30 -680 0 -662 Q 30 -680 60 -650 Q 30 -640 0 -652 Q -30 -640 -60 -650 Z" fill="${shade(L.hair, -0.1)}" ${inkW(5)}/>`;
  // expression layers (one visible at a time, toggled by the scene timeline)
  for (const e of exprs) {
    s += `<g id="${id}-xp-${e}" opacity="${e === initial ? 1 : 0}">${pupils(e, look)}${brows(e, L)}${mouth(e, L)}${extras(e)}</g>`;
  }
  if (L.facialHair === "beard") s += `<path d="M -150 -690 Q -140 -540 0 -530 Q 140 -540 150 -690 Q 120 -600 60 -598 Q 0 -588 -60 -598 Q -120 -600 -150 -690 Z" fill="${L.hair}" ${inkW(6)}/>`;
  // eyelids for blinking (scaleY 0 = open)
  for (const [k, x] of [["L", -68], ["R", 68]]) {
    s += `<clipPath id="${id}-ec${k}"><circle cx="${x}" cy="-735" r="47"/></clipPath>`;
    s += `<g clip-path="url(#${id}-ec${k})"><rect id="${id}-lid${k}" x="${x - 52}" y="-787" width="104" height="104" fill="${L.skin}" stroke="${C.ink}" stroke-width="7" transform="matrix(1 0 0 0.001 0 -786.2)"/></g>`;
  }
  return s;
}

function flies(id, n = 3) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const rad = 210 + i * 34;
    s += `<g id="${id}-fly${i}" data-r="${rad}"><g transform="translate(${rad} 0)">
      <ellipse cx="-7" cy="-9" rx="9" ry="6" fill="#fff" stroke="${C.ink}" stroke-width="2.5" opacity=".9"/>
      <ellipse cx="7" cy="-9" rx="9" ry="6" fill="#fff" stroke="${C.ink}" stroke-width="2.5" opacity=".9"/>
      <circle r="8" fill="${C.ink}"/></g></g>`;
  }
  return s;
}

/**
 * Render one character instance.
 * @param {string} id        unique element id prefix
 * @param {object} look      look overrides (see DEFAULT_LOOK)
 * @param {object} o         { x, y, scale, flip, pose, exprs, initial, look:[dx,dy] }
 */
export function character(id, look, o = {}) {
  const L = { ...DEFAULT_LOOK, ...look };
  const pose = POSES[o.pose] || POSES.stand;
  const exprs = Array.from(new Set([o.initial || "neutral", ...(o.exprs || [])]));
  const { s: body, hw } = torso(L, id);
  const sx = (o.flip ? -1 : 1) * (o.scale ?? 1);
  return `<g id="${id}" transform="translate(${o.x ?? 540} ${o.y ?? 1560}) scale(${sx} ${o.scale ?? 1})">
  <ellipse cx="0" cy="4" rx="${hw + 70}" ry="26" fill="#000" opacity="0.18"/>
  <g id="${id}-sq" transform="scale(1 1)"><g id="${id}-rig" transform="scale(1 1)">
    ${hairBack(L)}
    ${body}
    ${arm(-1, L, hw, pose[0], id)}
    ${arm(1, L, hw, pose[1], id)}
    <g id="${id}-head">
      ${accessoriesBehind(L)}
      <circle cx="-172" cy="-712" r="36" fill="${L.skin}" ${ink}/><circle cx="172" cy="-712" r="36" fill="${L.skin}" ${ink}/>
      <ellipse cx="0" cy="-720" rx="178" ry="168" fill="${L.skin}" ${ink}/>
      ${face(L, id, exprs, o.initial || "neutral", o.look)}
      ${hairFront(L)}
      ${accessoriesFront(L)}
    </g>
    ${L.flies ? `<g transform="translate(0 -720)">${flies(id)}</g>` : ""}
  </g></g>
</g>`;
}
