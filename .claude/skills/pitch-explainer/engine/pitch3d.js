// pitch3d.js — deterministic 3D football-pitch renderer for HyperFrames.
//
// Every frame is a pure function of timeline time `t` (seconds). The world is
// a plain JSON object produced by scripts/build.mjs (see references/spec.md).
//
// Coordinates: metres on the ground plane. x = across the pitch (-34 … 34),
// z = along the pitch (-52.5 … 52.5). The "top" goal sits at z = -52.5.
// y is up. Angles are radians, 0 = facing -z (towards the top goal).

import * as THREE from "./three.module.min.js";

const PITCH_W = 68;
const PITCH_L = 105;
const HALF_W = PITCH_W / 2;
const HALF_L = PITCH_L / 2;

// ---------- small math helpers ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
function hash(i) {
  // deterministic 0..1 from an integer
  let x = (i + 1) * 374761393;
  x = (x ^ (x >>> 13)) * 1274126177;
  x = x ^ (x >>> 16);
  return (x >>> 0) / 4294967295;
}
function angleLerp(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}
// facing angle for a direction vector on the ground (0 = towards -z)
const dirAngle = (dx, dz) => Math.atan2(dx, -dz);
const window01 = (t, t0, t1, fadeIn = 0.25, fadeOut = 0.25) => {
  if (t < t0 || t >= t1) return 0;
  return Math.min(1, (t - t0) / fadeIn, (t1 - t) / fadeOut);
};

// ---------- geometry builders ----------
function groundStrip(points, width, closed = false) {
  // flat ribbon on the ground through `points` ([x,z] pairs)
  const pos = [];
  const n = points.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[(i + 1) % n];
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * (width / 2), nz = (dx / len) * (width / 2);
    // extend slightly so joints overlap
    const ex = (dx / len) * (width / 2), ez = (dz / len) * (width / 2);
    const a = [x0 - nx - ex, z0 - nz - ez], b = [x0 + nx - ex, z0 + nz - ez];
    const c = [x1 + nx + ex, z1 + nz + ez], d = [x1 - nx + ex, z1 - nz + ez];
    const y = 0.02;
    pos.push(a[0], y, a[1], b[0], y, b[1], c[0], y, c[1]);
    pos.push(a[0], y, a[1], c[0], y, c[1], d[0], y, d[1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
function arcPoints(cx, cz, r, a0, a1, steps = 64) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = lerp(a0, a1, i / steps);
    pts.push([cx + Math.sin(a) * r, cz - Math.cos(a) * r]);
  }
  return pts;
}

function buildPitch(scene, C) {
  const lineMat = new THREE.MeshBasicMaterial({
    color: C.line, transparent: true, opacity: C.lineOpacity, side: THREE.DoubleSide, depthWrite: false,
  });
  const W = 0.14;
  const add = (pts, closed = false) => scene.add(new THREE.Mesh(groundStrip(pts, W, closed), lineMat));

  add([[-HALF_W, -HALF_L], [HALF_W, -HALF_L], [HALF_W, HALF_L], [-HALF_W, HALF_L]], true);
  add([[-HALF_W, 0], [HALF_W, 0]]);
  add(arcPoints(0, 0, 9.15, 0, Math.PI * 2, 96), true);
  for (const s of [-1, 1]) {
    const gz = s * HALF_L;
    // penalty box 40.32 x 16.5, six-yard 18.32 x 5.5
    add([[-20.16, gz], [-20.16, gz - s * 16.5], [20.16, gz - s * 16.5], [20.16, gz]]);
    add([[-9.16, gz], [-9.16, gz - s * 5.5], [9.16, gz - s * 5.5], [9.16, gz]]);
    // penalty arc (outside the box only)
    const spot = gz - s * 11;
    const lim = Math.acos(5.5 / 9.15);
    const base = s < 0 ? Math.PI : 0;
    add(arcPoints(0, spot, 9.15, base - lim, base + lim, 40));
    // penalty spot
    scene.add(new THREE.Mesh(groundStrip(arcPoints(0, spot, 0.06, 0, Math.PI * 2, 10), 0.12, true), lineMat));
    buildGoal(scene, C, gz, s);
  }

  // faint floor grid (the "tactics board" texture)
  const grid = [];
  const R = 120, step = 6;
  for (let v = -R; v <= R; v += step) {
    grid.push(v, 0.005, -R, v, 0.005, R, -R, 0.005, v, R, 0.005, v);
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute("position", new THREE.Float32BufferAttribute(grid, 3));
  scene.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: C.grid, transparent: true, opacity: 0.9 })));
}

function buildGoal(scene, C, gz, s) {
  const postMat = new THREE.MeshLambertMaterial({ color: C.line, emissive: C.line, emissiveIntensity: 0.35 });
  const r = 0.07, h = 2.44, hw = 3.66, depth = 2.0;
  const back = gz + s * depth * 1; // behind the line, away from the pitch
  const cyl = (len) => new THREE.CylinderGeometry(r, r, len, 10);
  for (const x of [-hw, hw]) {
    const p = new THREE.Mesh(cyl(h), postMat);
    p.position.set(x, h / 2, gz);
    scene.add(p);
  }
  const bar = new THREE.Mesh(cyl(hw * 2), postMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, h, gz);
  scene.add(bar);
  // net as faint line grid: back plane, roof and sides
  const net = [];
  const push = (a, b) => net.push(...a, ...b);
  for (let x = -hw; x <= hw + 1e-6; x += 0.6) {
    push([x, 0, back], [x, h * 0.85, back]);
    push([x, h * 0.85, back], [x, h, gz]);
  }
  for (let y = 0; y <= h * 0.85 + 1e-6; y += 0.45) push([-hw, y, back], [hw, y, back]);
  for (let k = 0; k <= 1.0001; k += 0.2) {
    const z = lerp(gz, back, k), y = lerp(h, h * 0.85, k);
    push([-hw, y, z], [hw, y, z]);
    push([-hw, 0, z], [-hw, y, z]);
    push([hw, 0, z], [hw, y, z]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(net, 3));
  scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: C.line, transparent: true, opacity: 0.45 })));
}

// ---------- mannequin ----------
function makeFigure(color, opts) {
  const mat = new THREE.MeshLambertMaterial({ color });
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 6, 14), mat);
  torso.position.y = 1.17;
  torso.scale.set(1, 1, 0.78);
  body.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), mat);
  head.position.y = 1.66;
  body.add(head);

  if (opts.blindfold) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.178, 0.178, 0.075, 20, 1, true),
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.55, side: THREE.DoubleSide }),
    );
    band.position.y = 1.69;
    body.add(band);
  }

  const limb = (r, len, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len - 2 * r, 4, 10), mat);
    m.position.y = -len / 2;
    pivot.add(m);
    body.add(pivot);
    return pivot;
  };
  const legL = limb(0.085, 0.9, -0.12, 0.92);
  const legR = limb(0.085, 0.9, 0.12, 0.92);
  const armL = limb(0.065, 0.68, -0.33, 1.42);
  const armR = limb(0.065, 0.68, 0.33, 1.42);
  armL.rotation.z = -0.12;
  armR.rotation.z = 0.12;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 28),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  return { root, body, legL, legR, armL, armR, mat };
}

// ---------- tracks ----------
function trackPos(track, t) {
  // track: [[t, x, z], ...] sorted by t. Eased (smoothstep) between keys.
  if (t <= track[0][0]) return [track[0][1], track[0][2]];
  for (let i = 1; i < track.length; i++) {
    const [t1, x1, z1] = track[i];
    if (t < t1) {
      const [t0, x0, z0] = track[i - 1];
      const k = smooth(clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1));
      return [lerp(x0, x1, k), lerp(z0, z1, k)];
    }
  }
  const last = track[track.length - 1];
  return [last[1], last[2]];
}

export async function mount({ glCanvas, overlayCanvas, world }) {
  const Wpx = world.width, Hpx = world.height;
  const C = Object.assign(
    { bg: "#151820", line: "#e8ebf2", lineOpacity: 0.62, grid: "#262b38", red: "#ff4a4a", green: "#3ddc84", white: "#f2f2f2" },
    world.colors || {},
  );

  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(Wpx, Hpx, false);
  renderer.setClearColor(C.bg, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  // linear fog, re-fitted every frame to the camera distance so wide and
  // close shots both fade softly into the dark background
  scene.fog = new THREE.Fog(C.bg, 30, 90);
  const camera = new THREE.PerspectiveCamera(40, Wpx / Hpx, 0.1, 600);
  // shift the picture up so the focus point sits in the upper-middle of the
  // frame, clear of the TikTok caption/UI zone at the bottom
  const shiftY = world.viewShiftY ?? 40;
  camera.setViewOffset(Wpx, Hpx, 0, shiftY, Wpx, Hpx);

  scene.add(new THREE.HemisphereLight(0xdfe6f5, 0x0b0d12, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-25, 40, 30);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb4ff, 0.55);
  rim.position.set(30, 20, -40);
  scene.add(rim);

  // big dark floor so fog has something to fade into
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: C.bg }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  buildPitch(scene, C);

  // ----- players -----
  const teams = world.teams || {};
  const byId = {};
  const players = world.players.map((p, i) => {
    const team = teams[p.team] || {};
    const fig = makeFigure(p.color || team.color || "#dddddd", { blindfold: p.blindfold ?? team.blindfold });
    scene.add(fig.root);
    const rec = {
      ...p,
      i,
      team,
      fig,
      seed: hash(i * 7 + 3),
      baseFacing: p.facing ?? team.facing ?? 0,
      kicks: p.kicks || [],
    };
    byId[p.id] = rec;
    return rec;
  });
  const posAt = (id, t) => trackPos(byId[id].track, t);
  const velAt = (id, t) => {
    const a = posAt(id, t - 0.12), b = posAt(id, t + 0.12);
    return [(b[0] - a[0]) / 0.24, (b[1] - a[1]) / 0.24];
  };
  const moveFacing = (p, t) => {
    const v = velAt(p.id, t);
    const sp = Math.hypot(v[0], v[1]);
    return sp > 0.6 ? { a: dirAngle(v[0], v[1]), speed: sp } : { a: p.baseFacing, speed: sp };
  };

  // ----- ball -----
  const ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 18, 14),
    new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.25 }),
  );
  scene.add(ballMesh);
  const ballShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 18),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }),
  );
  ballShadow.rotation.x = -Math.PI / 2;
  ballShadow.position.y = 0.013;
  scene.add(ballShadow);
  const ballCfg = world.ball || { events: [] };
  const footOf = (id, t) => {
    const p = byId[id];
    const [x, z] = posAt(id, t);
    const a = moveFacing(p, t).a;
    return [x + Math.sin(a) * 0.5 * curFigScale, z - Math.cos(a) * 0.5 * curFigScale];
  };
  const resolvePt = (ref, t) => (typeof ref === "string" ? footOf(ref, t) : ref);
  function ballAt(t) {
    const evs = ballCfg.events;
    let holder = ballCfg.holder ?? null;
    let free = ballCfg.at ?? [0, 0];
    for (const e of evs) {
      if (t < e.t0) break;
      if (t < e.t1) {
        const from = e.from != null ? resolvePt(e.from, e.t0) : holder ? footOf(holder, e.t0) : free;
        const to = resolvePt(e.to, e.t1);
        const k = clamp((t - e.t0) / (e.t1 - e.t0), 0, 1);
        const kk = e.ease === "linear" ? k : easeOutCubic(k) * 0.35 + k * 0.65;
        const y = 0.22 + (e.lift || 0) * 4 * k * (1 - k);
        return { x: lerp(from[0], to[0], kk), y, z: lerp(from[1], to[1], kk) };
      }
      if (typeof e.to === "string") holder = e.to;
      else { holder = null; free = e.to; }
    }
    if (holder) {
      const f = footOf(holder, t);
      return { x: f[0], y: 0.22, z: f[1] };
    }
    return { x: free[0], y: 0.22, z: free[1] };
  }

  // ----- rings (ground highlight circles) -----
  const rings = (world.rings || []).map((r) => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.78, 0.9, 40),
      new THREE.MeshBasicMaterial({ color: r.color || C.white, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.03;
    scene.add(m);
    return { ...r, mesh: m };
  });

  // ----- camera -----
  const shots = (world.cameras || []).slice().sort((a, b) => a.t - b.t);
  function shotState(i, t) {
    const s = shots[i];
    const end = i + 1 < shots.length ? shots[i + 1].t : world.duration;
    const k = clamp((t - s.t) / Math.max(0.001, end - s.t), 0, 1);
    const drift = s.drift ?? 0.06;
    const look = s.look;
    const pos = s.pos.map((v, j) => lerp(v, look[j], drift * k));
    // optional slow orbit around the look point (radians over the shot)
    if (s.orbit) {
      const a = s.orbit * k;
      const dx = pos[0] - look[0], dz = pos[2] - look[2];
      pos[0] = look[0] + dx * Math.cos(a) - dz * Math.sin(a);
      pos[2] = look[2] + dx * Math.sin(a) + dz * Math.cos(a);
    }
    return { pos, look, fov: s.fov ?? 40 };
  }
  function cameraAt(t) {
    let i = 0;
    while (i + 1 < shots.length && t >= shots[i + 1].t) i++;
    const cur = shotState(i, t);
    const s = shots[i];
    if (i === 0 || s.cut) return cur;
    const k = easeInOutCubic(clamp((t - s.t) / (s.dur ?? 1.1), 0, 1));
    if (k >= 1) return cur;
    const prev = shotState(i - 1, t);
    return {
      pos: prev.pos.map((v, j) => lerp(v, cur.pos[j], k)),
      look: prev.look.map((v, j) => lerp(v, cur.look[j], k)),
      fov: lerp(prev.fov, cur.fov, k),
    };
  }

  // ----- 2D overlay (labels, dashed arrows) -----
  const ctx = overlayCanvas.getContext("2d");
  overlayCanvas.width = Wpx;
  overlayCanvas.height = Hpx;
  const fontFamily = world.labelFont || '"PX Mono", "JetBrains Mono", monospace';
  try {
    await document.fonts.load(`700 30px ${fontFamily}`);
  } catch (_) { /* fall back silently */ }
  const v3 = new THREE.Vector3();
  const project = (x, y, z) => {
    v3.set(x, y, z).project(camera);
    return [(v3.x * 0.5 + 0.5) * Wpx, (-v3.y * 0.5 + 0.5) * Hpx, v3.z];
  };

  function drawArrow(a, t) {
    const vis = window01(t, a.t0, a.t1, 0.01, 0.3);
    if (vis <= 0) return;
    const prog = clamp((t - a.t0) / (a.draw ?? 0.5), 0, 1);
    const from = resolvePt(a.from, a.t0);
    const to = resolvePt(a.to, a.t0 + (a.draw ?? 0.5));
    // sample along the ground so perspective is respected
    const steps = 24;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const k = (i / steps) * easeOutCubic(prog);
      pts.push(project(lerp(from[0], to[0], k), 0.06, lerp(from[1], to[1], k)));
    }
    if (pts.some((p) => p[2] > 1)) return;
    const color = a.color === "white" ? C.white : a.color === "green" ? C.green : a.color === "red" || !a.color ? C.red : a.color;
    ctx.save();
    ctx.globalAlpha = vis;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = a.width ?? 5;
    ctx.lineCap = "round";
    ctx.setLineDash(a.dash === false ? [] : [18, 13]);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    if (a.head !== false && prog > 0.05) {
      const p1 = pts[pts.length - 1], p0 = pts[pts.length - 3] || pts[0];
      const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      const s = 18;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(p1[0] + Math.cos(ang) * 4, p1[1] + Math.sin(ang) * 4);
      ctx.lineTo(p1[0] - Math.cos(ang - 0.45) * s, p1[1] - Math.sin(ang - 0.45) * s);
      ctx.lineTo(p1[0] - Math.cos(ang + 0.45) * s, p1[1] - Math.sin(ang + 0.45) * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLabel(l, t) {
    const vis = window01(t, l.t0, l.t1, 0.2, 0.2);
    if (vis <= 0) return;
    let x, z, y;
    if (l.player) {
      [x, z] = posAt(l.player, t);
      y = l.below ? -0.4 : 2.25 * curFigScale;
    } else {
      [x, z] = l.at;
      y = 0.1;
    }
    const p = project(x, y, z);
    if (p[2] > 1) return;
    const color = l.color === "green" ? C.green : l.color === "red" ? C.red : l.color === "grey" ? "#9aa3b5" : l.color || C.white;
    ctx.save();
    ctx.globalAlpha = vis;
    ctx.font = `700 ${l.size ?? 30}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    const dy = l.below ? 34 + 26 * curFigScale : (1 - vis) * 10;
    ctx.fillText(l.text, p[0], p[1] + dy);
    ctx.restore();
  }

  let curFigScale = 1;
  // ----- per-frame render -----
  function render(t) {
    const cam = cameraAt(t);
    camera.position.set(...cam.pos);
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(...cam.look);
    camera.updateMatrixWorld();
    const dist = Math.hypot(cam.pos[0] - cam.look[0], cam.pos[1] - cam.look[1], cam.pos[2] - cam.look[2]);
    // stylised figures: bigger than life, and they grow on wide shots so a
    // whole-pitch formation view still reads on a phone
    const figScale = curFigScale = (world.figureScale ?? 1.3) * Math.pow(Math.max(1, dist / 32), 0.75);
    scene.fog.near = dist * (world.fogNear ?? 1.05);
    scene.fog.far = dist * (world.fogFar ?? 2.4);

    const ball = ballAt(t);
    ballMesh.position.set(ball.x, ball.y * Math.max(1, figScale * 0.8), ball.z);
    ballMesh.scale.setScalar(Math.max(1, figScale * 0.8));
    ballShadow.scale.setScalar(Math.max(1, figScale * 0.8));
    ballShadow.position.set(ball.x, 0.013, ball.z);
    ballMesh.visible = ballShadow.visible = !world.hideBall;

    for (const p of players) {
      const [x, z] = posAt(p.id, t);
      const { a: moveA, speed } = moveFacing(p, t);
      let a = moveA;
      const facesBall = p.facesBall ?? p.team.facesBall ?? true;
      if (speed <= 0.6 && facesBall) a = dirAngle(ball.x - x, ball.z - z);
      if (p.team.blindfold || p.blindfold) {
        // blind players drift their heading slowly, never toward the ball on purpose
        a = p.baseFacing + Math.sin(t * (0.6 + p.seed) + p.seed * 9) * 0.7;
        if (speed > 0.6) a = moveA;
      }
      const f = p.fig;
      f.root.position.set(x, 0, z);
      f.root.scale.setScalar(figScale);
      f.root.rotation.y = -a + Math.PI; // figure model faces +z by default
      const run = clamp(speed / 6, 0, 1);
      const phase = t * (7 + run * 5) + p.seed * 6.28;
      const swing = Math.sin(phase) * (0.12 + run * 0.75);
      f.legL.rotation.x = swing;
      f.legR.rotation.x = -swing;
      const blindArms = (p.team.blindfold || p.blindfold) ? -0.9 + Math.sin(t * 1.3 + p.seed * 5) * 0.12 : 0;
      f.armL.rotation.x = -swing * 0.8 + blindArms;
      f.armR.rotation.x = swing * 0.8 + blindArms * 0.85;
      f.body.position.y = Math.abs(Math.sin(phase)) * 0.06 * run + Math.sin(t * 1.7 + p.seed * 10) * 0.008;
      f.body.rotation.x = run * 0.18;
      // kick: right leg back then through
      for (const k of p.kicks) {
        const u = (t - (k - 0.22)) / 0.45;
        if (u >= 0 && u <= 1) {
          // +x rotation swings the foot backwards, -x forwards
          f.legR.rotation.x = u < 0.45 ? lerp(0, 0.9, u / 0.45) : lerp(0.9, -1.1, (u - 0.45) / 0.55);
          f.armL.rotation.x = 0.5 * Math.sin(u * Math.PI);
        }
      }
      // fade players in/out if they have a visibility window
      let vis = 1;
      for (const h of p.hidden || []) vis = Math.min(vis, 1 - window01(t, h[0], h[1], 0.3, 0.3));
      f.root.visible = vis > 0.01;
      f.mat.transparent = vis < 1;
      f.mat.opacity = vis;
    }

    for (const r of rings) {
      const vis = window01(t, r.t0, r.t1, 0.25, 0.25);
      r.mesh.material.opacity = vis * 0.95;
      r.mesh.visible = vis > 0;
      if (vis > 0) {
        const [x, z] = posAt(r.player, t);
        r.mesh.position.set(x, 0.03, z);
        const s = 0.85 + 0.15 * easeOutCubic(Math.min(1, (t - r.t0) / 0.4));
        r.mesh.scale.setScalar(s * figScale);
      }
    }

    renderer.render(scene, camera);

    ctx.clearRect(0, 0, Wpx, Hpx);
    for (const a of world.arrows || []) drawArrow(a, t);
    for (const l of world.labels || []) drawLabel(l, t);
  }

  return render;
}
