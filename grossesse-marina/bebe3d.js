/* Bébé en 3D : illustration procédurale (Three.js r128).
   Le corps est une surface organique continue (champ de distance lissé + marching cubes),
   rendue avec un matériau translucide « sous la peau » et un halo lumineux.
   Ce n'est pas une image médicale. */
(() => {
"use strict";
const T = window.THREE;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = t => Math.max(0, Math.min(1, t));
const smooth = t => t * t * (3 - 2 * t);

// Rythme cardiaque moyen (battements/min) selon les SA.
const BPM = [[5, 110], [6, 120], [7, 140], [8, 160], [9, 170], [10, 165], [12, 155], [14, 150], [20, 145], [30, 140], [41, 140]];
function bpmAt(sa){
  if (sa <= BPM[0][0]) return BPM[0][1];
  for (let i = 1; i < BPM.length; i++) if (sa <= BPM[i][0]){ const [a, x] = BPM[i - 1], [b, y] = BPM[i]; return Math.round(lerp(x, y, (sa - a) / (b - a))); }
  return 140;
}

/* ================= Modélisation par primitives lissées ================= */
// Chaque primitive est une distance signée ; elles sont fusionnées en douceur (smooth-min).
class Model {
  constructor(){ this.prims = []; this.marks = {}; }
  sphere(c, r, k = .1){ this.prims.push({t: 0, c, r, k}); return this; }
  // ellipsoïde, éventuellement tournée autour de z (angle a)
  ell(c, rx, ry, rz, k = .1, a = 0){ this.prims.push({t: 1, c, rx, ry, rz, k, ca: Math.cos(a), sa: Math.sin(a)}); return this; }
  // cône arrondi : de a (rayon ra) à b (rayon rb)
  cap(a, b, ra, rb, k = .1){ this.prims.push({t: 2, a, b, ra, rb, k}); return this; }
  chain(pts, radii, k = .1){ for (let i = 0; i < pts.length - 1; i++) this.cap(pts[i], pts[i + 1], radii[i], radii[i + 1], k); return this; }
  // creux (soustraction douce)
  dent(c, rx, ry, rz, k = .03, a = 0){ this.prims.push({t: 1, c, rx, ry, rz, k, ca: Math.cos(a), sa: Math.sin(a), sub: true}); return this; }
  groove(a, b, r, k = .02){ this.prims.push({t: 2, a, b, ra: r, rb: r, k, sub: true}); return this; }
}
function primBox(p){
  const m = p.k + .02;
  if (p.t === 0) return [p.c[0] - p.r - m, p.c[1] - p.r - m, p.c[2] - p.r - m, p.c[0] + p.r + m, p.c[1] + p.r + m, p.c[2] + p.r + m];
  if (p.t === 1){ const r = Math.max(p.rx, p.ry, p.rz) + m; return [p.c[0] - r, p.c[1] - r, p.c[2] - r, p.c[0] + r, p.c[1] + r, p.c[2] + r]; }
  const r = Math.max(p.ra, p.rb) + m;
  return [Math.min(p.a[0], p.b[0]) - r, Math.min(p.a[1], p.b[1]) - r, Math.min(p.a[2], p.b[2]) - r, Math.max(p.a[0], p.b[0]) + r, Math.max(p.a[1], p.b[1]) + r, Math.max(p.a[2], p.b[2]) + r];
}
function sdf(p, x, y, z){
  if (p.t === 0){ const dx = x - p.c[0], dy = y - p.c[1], dz = z - p.c[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz) - p.r; }
  if (p.t === 1){
    const dx = x - p.c[0], dy = y - p.c[1], dz = z - p.c[2];
    const lx = dx * p.ca + dy * p.sa, ly = -dx * p.sa + dy * p.ca;
    const qx = lx / p.rx, qy = ly / p.ry, qz = dz / p.rz;
    return (Math.sqrt(qx * qx + qy * qy + qz * qz) - 1) * Math.min(p.rx, p.ry, p.rz);
  }
  const bax = p.b[0] - p.a[0], bay = p.b[1] - p.a[1], baz = p.b[2] - p.a[2];
  const pax = x - p.a[0], pay = y - p.a[1], paz = z - p.a[2];
  let h = (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz); h = h < 0 ? 0 : h > 1 ? 1 : h;
  const qx = pax - bax * h, qy = pay - bay * h, qz = paz - baz * h;
  return Math.sqrt(qx * qx + qy * qy + qz * qz) - (p.ra + (p.rb - p.ra) * h);
}
function smin(a, b, k){ const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; }

let MC = null;
function polygonize(model, res){
  if (!MC || MC.resolution !== res) MC = new T.MarchingCubes(res, new T.MeshBasicMaterial(), false, false);
  const mc = MC, n = mc.size, half = n / 2;
  // boîte englobante du modèle -> mise à l'échelle dans [-0.9, 0.9]
  const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of model.prims) if (!p.sub){ const b = primBox(p); for (let i = 0; i < 3; i++){ bb[i] = Math.min(bb[i], b[i]); bb[i + 3] = Math.max(bb[i + 3], b[i + 3]); } }
  const center = [(bb[0] + bb[3]) / 2, (bb[1] + bb[4]) / 2, (bb[2] + bb[5]) / 2];
  const ext = Math.max(bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2]) / 2;
  const s = .9 / ext;                                    // modèle -> monde
  const F = new Float32Array(n * n * n).fill(1e3);
  const g2m = i => ((i - half) / half) / s;            // indice de grille -> coordonnée modèle (centrée)
  const m2g = v => Math.round(v * s * half + half);
  const order = model.prims.filter(p => !p.sub).concat(model.prims.filter(p => p.sub));
  for (const p of order){
    const b = primBox(p);
    const x0 = Math.max(1, m2g(b[0] - center[0])), x1 = Math.min(n - 2, m2g(b[3] - center[0]));
    const y0 = Math.max(1, m2g(b[1] - center[1])), y1 = Math.min(n - 2, m2g(b[4] - center[1]));
    const z0 = Math.max(1, m2g(b[2] - center[2])), z1 = Math.min(n - 2, m2g(b[5] - center[2]));
    for (let z = z0; z <= z1; z++){
      const mz = g2m(z) + center[2];
      for (let y = y0; y <= y1; y++){
        const my = g2m(y) + center[1], row = z * n * n + y * n;
        for (let x = x0; x <= x1; x++){
          const d = sdf(p, g2m(x) + center[0], my, mz), i = row + x;
          F[i] = p.sub ? -smin(-F[i], d, p.k) : smin(F[i], d, p.k);
        }
      }
    }
  }
  mc.reset();
  const k = 600 * s;
  for (let i = 0; i < F.length; i++){ const v = 80 - F[i] * k; mc.field[i] = v < -2000 ? -2000 : v > 2000 ? 2000 : v; }
  const geo = mc.generateBufferGeometry();
  // repères (yeux, cœur, pieds…) convertis en coordonnées monde
  const toW = c => new T.Vector3((c[0] - center[0]) * s, (c[1] - center[1]) * s, (c[2] - center[2]) * s);
  const marks = {};
  for (const key in model.marks){ const m = model.marks[key]; marks[key] = Array.isArray(m[0]) ? m.map(toW) : toW(m); }
  return {geo, marks, scale: s};
}

/* ---------- Embryon (jusqu'à 9 SA) ---------- */
function embryo(sa){
  const e = clamp01((sa - 4) / 5), M = new Model();
  const sp = [[.30, .45, 0], [.05, .64, 0], [-.26, .56, 0], [-.46, .26, 0], [-.5, -.1, 0], [-.37, -.42, 0], [-.12, -.58, 0], [.1, -.54, 0], [.22, -.4, 0], [.2, -.27, 0]];
  M.chain(sp, [.3, .33, .3, .27, .26, .24, .18, .11, .06, .03], .14);
  M.sphere([.3, .4, 0], .36 + .04 * e, .16);                 // cerveau antérieur (tête)
  M.sphere([-.06, .66, 0], .26, .14);                         // bosse du mésencéphale
  M.sphere([.24, -.12, 0], .2 + .05 * e, .12);                // proéminence cardiaque
  M.sphere([.12, -.36, 0], .14, .1);                          // foie
  for (const s of [-1, 1]){
    for (let i = 0; i < 3; i++) M.cap([.46 - i * .05, .1 - i * .1, s * .06], [.38 - i * .05, .06 - i * .1, s * .2], .05, .045, .05); // arcs pharyngés
    const al = .1 + .1 * e;
    M.cap([.0, .04, s * .2], [.1 + al * .4, -.1, s * (.24 + al * .6)], .075, .08 + .02 * e, .08);   // bourgeon de bras
    M.ell([.13 + al * .45, -.14, s * (.26 + al * .6)], .08 + .02 * e, .04, .07 + .02 * e, .06, -.6); // palette de la main
    M.cap([-.28, -.4, s * .2], [-.2, -.52, s * (.24 + al * .8)], .08, .08 + .02 * e, .08);         // bourgeon de jambe
  }
  M.marks.eyes = [[.47, .47, .34], [.47, .47, -.34]];
  M.marks.heart = [.26, -.12, 0];
  M.marks.belly = [.12, -.46, 0];
  M.marks.feet = [[-.18, -.56, .3], [-.18, -.56, -.3]];
  return {model: M, eyeR: .09 + .03 * e, heartR: .22};
}

/* ---------- Fœtus (dès 10 SA) ---------- */
function fetus(sa){
  const f = smooth(clamp01((sa - 10) / 30));
  const hr = lerp(.5, .37, f), L = lerp(.9, 1.15, f), g = lerp(.82, 1.15, f), ls = lerp(.55, 1, f), M = new Model();
  const tilt = -.32, ct = Math.cos(tilt), st = Math.sin(tilt);
  const hc = [.14, .55 * L + hr * .78, 0];
  const H = (x, y, z) => [hc[0] + x * ct - y * st, hc[1] + x * st + y * ct, hc[2] + z];   // repère de la tête (penchée)
  // Tête
  M.ell(hc, hr * 1.05, hr * .97, hr * .9, .1, tilt);
  M.ell(H(hr * .5, -hr * .55, 0), hr * .55, hr * .45, hr * .62, .14, tilt);                 // visage / mâchoire
  M.sphere(H(hr * 1.0, -hr * .22, 0), hr * .12, .05);                                      // nez
  for (const s of [-1, 1]){
    M.sphere(H(hr * .68, -hr * .45, s * hr * .38), hr * .26, .1);                          // joues
    M.ell(H(-hr * .05, -hr * .12, s * hr * .9), hr * .16, hr * .24, hr * .07, .05, tilt);   // oreilles
    M.dent(H(hr * .93, -hr * .02, s * hr * .33), hr * .07, hr * .05, hr * .13, .03, tilt);  // paupières
  }
  M.groove(H(hr * .97, -hr * .5, -hr * .16), H(hr * .97, -hr * .5, hr * .16), hr * .03, .03); // bouche
  // Cou, tronc, ventre, fesses
  M.cap(H(-hr * .05, -hr * .65, 0), [.02, .5 * L, 0], .16 * g, .15 * g, .1);
  M.chain([[.02, .52 * L, 0], [-.12, .26 * L, 0], [-.2, -.05 * L, 0], [-.17, -.38 * L, 0], [-.06, -.6 * L, 0]], [.15 * g, .3 * g, .33 * g, .35 * g, .3 * g], .14);
  M.sphere([.04, -.3 * L, 0], .3 * g, .14);
  M.sphere([-.13, -.56 * L, 0], .27 * g, .12);
  // Bras : la main près du visage
  for (const s of [-1, 1]){
    const sh = [-.04, .32 * L, s * .26 * g];
    const el = [sh[0] + .28 * ls, sh[1] - .3 * ls, sh[2] + s * .1 * ls];
    const wr = [el[0] + .22 * ls, el[1] + .4 * ls, el[2] - s * .12 * ls];
    M.sphere(sh, .14 * g, .1);
    M.chain([sh, el, wr], [.1 * g, .08 * g, .06 * g], .06);
    M.ell([wr[0] + .04 * ls, wr[1] + .07 * ls, wr[2]], .07 * g * Math.max(.75, ls), .1 * g * Math.max(.75, ls), .055 * g, .05, -.5);
    if (sa >= 13) M.cap([wr[0] + .02, wr[1] + .02, wr[2] - s * .03], [wr[0] + .07 * ls, wr[1] + .06 * ls, wr[2] - s * .06 * ls], .028 * g, .022 * g, .03); // pouce
  }
  // Jambes repliées
  const feet = [];
  for (const s of [-1, 1]){
    const hp = [-.1, -.5 * L, s * .2 * g];
    const kn = [hp[0] + .55 * ls, hp[1] + .3 * ls, hp[2] + s * .1 * ls];
    const ak = [kn[0] - .1 * ls, kn[1] - .52 * ls, kn[2] - s * .2 * ls];
    M.chain([hp, kn], [.17 * g, .11 * g], .08);
    M.chain([kn, ak], [.105 * g, .07 * g], .06);
    const ft = [ak[0] + .09 * ls, ak[1] - .03 * ls, ak[2]];
    M.ell(ft, .15 * g * ls + .02, .055 * g + .01, .07 * g, .05);
    feet.push(ft);
  }
  M.marks.eyes = [H(hr * .9, -hr * .03, hr * .33), H(hr * .9, -hr * .03, -hr * .33)];
  M.marks.heart = [.05, .12 * L, 0];
  M.marks.belly = [.2 * g + .1, -.36 * L, 0];
  M.marks.feet = feet;
  return {model: M, eyeR: hr * lerp(.18, .12, f), heartR: .3};
}

/* ================= Matériaux ================= */
const VERT = `
uniform vec3 uFoot1; uniform vec3 uFoot2; uniform float uKick1; uniform float uKick2; uniform float uFootR;
varying vec3 vN; varying vec3 vV; varying vec3 vL;
void main(){
  vec3 p = position;
  float k1 = uKick1 * exp(-pow(distance(p, uFoot1) / uFootR, 2.0));
  float k2 = uKick2 * exp(-pow(distance(p, uFoot2) / uFootR, 2.0));
  p += vec3(0.07, 0.05, 0.0) * (k1 + k2);
  vL = position;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normal); vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform vec3 uCore; uniform vec3 uDeep; uniform vec3 uRim;
uniform vec3 uEye1; uniform vec3 uEye2; uniform float uEyeR; uniform float uEyeDark;
uniform vec3 uHeart; uniform float uHeartR; uniform float uPulse; uniform float uOpacity;
varying vec3 vN; varying vec3 vV; varying vec3 vL;
void main(){
  vec3 N = normalize(vN), V = normalize(vV);
  if (!gl_FrontFacing) N = -N;
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.2);
  vec3 L1 = normalize(vec3(0.45, 0.75, 0.55)), L2 = normalize(vec3(-0.7, -0.3, 0.5));
  float w1 = dot(N, L1) * 0.5 + 0.5, w2 = max(dot(N, L2), 0.0);
  vec3 col = mix(uDeep, uCore, smoothstep(0.05, 0.95, w1));
  col += uCore * 0.22 * w2;
  col = mix(col, uRim, fres * 0.55);
  col += uRim * pow(fres, 4.0) * 0.25;
  float spec = pow(max(dot(reflect(-L1, N), V), 0.0), 18.0);
  col += vec3(1.0, 0.95, 0.9) * spec * 0.12;
  float de = min(distance(vL, uEye1), distance(vL, uEye2));
  col = mix(col, uDeep * 0.22, uEyeDark * (1.0 - smoothstep(uEyeR * 0.45, uEyeR, de)));
  float dh = distance(vL, uHeart);
  col += vec3(1.0, 0.3, 0.32) * uPulse * exp(-dh * dh / (uHeartR * uHeartR)) * 0.55;
  gl_FragColor = vec4(col, mix(uOpacity, 1.0, fres));
}`;
function skinMat(c){
  const far = () => new T.Vector3(9, 9, 9);
  return new T.ShaderMaterial({vertexShader: VERT, fragmentShader: FRAG, transparent: true, side: T.DoubleSide,
    uniforms: {uCore: {value: new T.Color(c.core)}, uDeep: {value: new T.Color(c.deep)}, uRim: {value: new T.Color(c.rim)},
      uEye1: {value: far()}, uEye2: {value: far()}, uEyeR: {value: .05}, uEyeDark: {value: c.eyeDark || 0},
      uHeart: {value: far()}, uHeartR: {value: .2}, uPulse: {value: 0}, uOpacity: {value: c.opacity || .86},
      uFoot1: {value: far()}, uFoot2: {value: far()}, uKick1: {value: 0}, uKick2: {value: 0}, uFootR: {value: .25}}});
}
function skinColors(sa){
  const t = smooth(clamp01((sa - 5) / 34));
  const mix = (a, b) => "#" + new T.Color(a).lerp(new T.Color(b), t).getHexString();
  return {core: mix("#d2714f", "#e59a80"), deep: mix("#7d321f", "#a5583f"), rim: mix("#f4ae90", "#f9cdb9"), eyeDark: sa < 10 ? .75 : .5, opacity: .97};
}
const SHELL_VERT = `varying vec3 vN; varying vec3 vV;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
const SHELL_FRAG = `uniform vec3 uColor; uniform float uPow; uniform float uAmp; varying vec3 vN; varying vec3 vV;
void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow); gl_FragColor = vec4(uColor, f * uAmp); }`;

/* ---------- Cordon torsadé ---------- */
function cordGeo(points, r){
  const curve = new T.CatmullRomCurve3(points, false, "centripetal");
  const tub = 160, rad = 14, frames = curve.computeFrenetFrames(tub, false), pos = [], idx = [];
  for (let i = 0; i <= tub; i++){
    const t = i / tub, P = curve.getPointAt(t), N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= rad; j++){
      const v = j / rad * Math.PI * 2;
      const rr = r * (1 + .22 * Math.sin(v * 3 + t * 70) + .08 * Math.sin(t * 140));   // aspect torsadé
      pos.push(P.x + rr * (Math.cos(v) * N.x + Math.sin(v) * B.x), P.y + rr * (Math.cos(v) * N.y + Math.sin(v) * B.y), P.z + rr * (Math.cos(v) * N.z + Math.sin(v) * B.z));
    }
  }
  for (let i = 0; i < tub; i++) for (let j = 0; j < rad; j++){ const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ================= Scène ================= */
let S = null;
function bgTexture(){
  const c = document.createElement("canvas"); c.width = 512; c.height = 1024;
  const x = c.getContext("2d"), g = x.createRadialGradient(256, 420, 30, 256, 480, 620);
  g.addColorStop(0, "#fff6ef"); g.addColorStop(.45, "#fbe0d2"); g.addColorStop(1, "#f0c4ae");
  x.fillStyle = g; x.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 70; i++){ // taches floues
    const px = Math.random() * 512, py = Math.random() * 1024, r = 6 + Math.random() * 40, gg = x.createRadialGradient(px, py, 0, px, py, r);
    gg.addColorStop(0, `rgba(255,255,255,${.06 + Math.random() * .1})`); gg.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = gg; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  return new T.CanvasTexture(c);
}

function mount(container, sa, opts = {}){
  dispose();
  const W = () => container.clientWidth || innerWidth, H = () => container.clientHeight || innerHeight;
  const renderer = new T.WebGLRenderer({antialias: true, powerPreference: "high-performance"});
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
  renderer.setSize(W(), H());
  container.appendChild(renderer.domElement);
  const scene = new T.Scene();
  scene.background = bgTexture();
  const camera = new T.PerspectiveCamera(34, W() / H(), .1, 100);
  camera.position.set(.3, .35, 5);

  // Particules en suspension
  const N = 260, pp = new Float32Array(N * 3), speeds = [];
  for (let i = 0; i < N; i++){
    const r = 2.6 * Math.cbrt(Math.random()), th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pp[i * 3] = r * Math.sin(ph) * Math.cos(th); pp[i * 3 + 1] = r * Math.cos(ph); pp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    speeds.push(.0005 + Math.random() * .001);
  }
  const pg = new T.BufferGeometry(); pg.setAttribute("position", new T.BufferAttribute(pp, 3));
  const dot = document.createElement("canvas"); dot.width = dot.height = 64;
  const dc = dot.getContext("2d"), grd = dc.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(.4, "rgba(255,235,225,.45)"); grd.addColorStop(1, "rgba(255,235,225,0)");
  dc.fillStyle = grd; dc.fillRect(0, 0, 64, 64);
  const points = new T.Points(pg, new T.PointsMaterial({size: .035, map: new T.CanvasTexture(dot), transparent: true, opacity: .45, depthWrite: false}));
  scene.add(points);

  const controls = new T.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = false;
  controls.autoRotate = !opts.reduced; controls.autoRotateSpeed = .5;

  // Halo lumineux (bloom) si disponible
  let composer = null, bloom = null;
  if (opts.bloom && T.EffectComposer && T.UnrealBloomPass){
    try{
      composer = new T.EffectComposer(renderer);
      composer.addPass(new T.RenderPass(scene, camera));
      bloom = new T.UnrealBloomPass(new T.Vector2(W() / 2, H() / 2), .22, .9, .9);
      composer.addPass(bloom);
    }catch(e){ composer = null; }
  }

  S = {container, renderer, scene, camera, controls, composer, bloom, points, speeds, sa: null, group: null, skin: null,
    res: opts.res || (Math.min(W(), H()) < 700 ? 76 : 88), raf: 0, reduced: !!opts.reduced, t0: performance.now(), nextKick: 2.5, kick: null};
  S.onResize = () => {
    if (!S) return;
    const w = W(), h = H(), half = T.MathUtils.degToRad(camera.fov / 2);
    camera.aspect = w / h;
    const d = Math.max(3.6, 1.45 / (Math.tan(half) * Math.min(1, camera.aspect))) * 1.02;
    camera.position.setLength(d);
    controls.minDistance = d * .4; controls.maxDistance = d * 1.6;
    camera.setViewOffset(w, h, 0, h < w ? 0 : h * .11, w, h);
    camera.updateProjectionMatrix(); renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
  };
  S.onResize();
  addEventListener("resize", S.onResize);
  setWeek(sa);
  loop();
  return {bpm: bpmAt(sa)};
}

function setWeek(sa){
  if (!S) return;
  sa = Math.max(4, Math.min(41, Math.round(sa)));
  if (S.sa === sa) return {bpm: bpmAt(sa)};
  S.sa = sa;
  if (S.group){ S.scene.remove(S.group); disposeTree(S.group); }
  const spec = sa < 10 ? embryo(sa) : fetus(sa);
  const {geo, marks, scale} = polygonize(spec.model, S.res);
  const skin = skinMat(skinColors(sa)), u = skin.uniforms;
  u.uEye1.value.copy(marks.eyes[0]); u.uEye2.value.copy(marks.eyes[1]); u.uEyeR.value = spec.eyeR * scale;
  u.uHeart.value.copy(marks.heart); u.uHeartR.value = spec.heartR * scale;
  u.uFoot1.value.copy(marks.feet[0]); u.uFoot2.value.copy(marks.feet[1]); u.uFootR.value = .18 * scale;
  const group = new T.Group();
  const body = new T.Mesh(geo, skin); body.renderOrder = 2; body.scale.setScalar(1.15); group.add(body);

  // Cordon + placenta, ou vésicule vitelline chez l'embryon
  const belly = marks.belly.clone().multiplyScalar(1.15);
  const cordMat = skinMat({core: "#e39a7d", deep: "#b0644d", rim: "#fbd6c6", opacity: .92});
  if (sa >= 10){
    const pl = new T.Vector3(1.9, .2, -3.2);
    const pts = [];
    for (let i = 0; i <= 12; i++){ const t = i / 12, p = belly.clone().lerp(pl, t), o = Math.sin(t * Math.PI);
      p.add(new T.Vector3(.35 * o + Math.sin(t * 8) * .1, -.45 * o + Math.cos(t * 8) * .08, .35 * o)); pts.push(p); }
    group.add(new T.Mesh(cordGeo(pts, .045), cordMat));
  } else {
    const ys = new T.Vector3(.95, -.55, .35);
    const pts = [belly.clone(), belly.clone().lerp(ys, .35).add(new T.Vector3(0, -.2, .1)), belly.clone().lerp(ys, .7).add(new T.Vector3(0, -.12, 0)), ys.clone().add(new T.Vector3(.2, .05, 0))];
    group.add(new T.Mesh(cordGeo(pts, .055), cordMat));
    const y = new T.Mesh(new T.SphereGeometry(.34, 40, 30), skinMat({core: "#de8462", deep: "#a24f36", rim: "#f6bea4", opacity: .97}));
    y.scale.set(1, .85, .85);
    y.position.copy(ys); group.add(y);
  }
  // Membrane de la poche : seul le bord brille
  const shell = new T.Mesh(new T.SphereGeometry(2.7, 64, 48), new T.ShaderMaterial({vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG,
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: {uColor: {value: new T.Color("#ffffff")}, uPow: {value: 3.0}, uAmp: {value: .1}}}));
  shell.renderOrder = 3; group.add(shell);

  group.rotation.y = -.55;
  S.scene.add(group); S.group = group; S.body = body; S.skin = skin;
  return {bpm: bpmAt(sa)};
}

function loop(){
  if (!S) return;
  S.raf = requestAnimationFrame(loop);
  if (document.hidden) return;
  const t = (performance.now() - S.t0) / 1000, u = S.skin.uniforms;
  const period = 60 / bpmAt(S.sa), ph = (t % period) / period;
  u.uPulse.value = Math.exp(-Math.pow((ph - .1) / .07, 2)) + .55 * Math.exp(-Math.pow((ph - .32) / .07, 2));
  if (!S.reduced){
    S.body.position.y = Math.sin(t * .7) * .06;
    S.body.rotation.z = Math.sin(t * .45) * .035;
    if (S.sa >= 10){
      if (!S.kick && t > S.nextKick) S.kick = {i: Math.random() < .5 ? 1 : 2, t};
      if (S.kick){
        const k = (t - S.kick.t) / .8;
        u["uKick" + S.kick.i].value = k < 1 ? Math.sin(k * Math.PI) : 0;
        if (k >= 1){ S.kick = null; S.nextKick = t + 3 + Math.random() * 5; }
      }
    }
    const pos = S.points.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++){ let y = pos.getY(i) + S.speeds[i]; if (y > 2.6) y = -2.6; pos.setY(i, y); }
    pos.needsUpdate = true;
  }
  S.controls.update();
  if (S.composer) S.composer.render(); else S.renderer.render(S.scene, S.camera);
}

function disposeTree(o){
  o.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material){ (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
}
function dispose(){
  if (!S) return;
  cancelAnimationFrame(S.raf);
  removeEventListener("resize", S.onResize);
  S.controls.dispose();
  disposeTree(S.scene);
  if (S.scene.background && S.scene.background.dispose) S.scene.background.dispose();
  if (S.bloom) S.bloom.dispose();
  if (S.composer){ S.composer.renderTarget1.dispose(); S.composer.renderTarget2.dispose(); }
  S.renderer.dispose();
  if (S.renderer.domElement.parentNode) S.renderer.domElement.parentNode.removeChild(S.renderer.domElement);
  S = null;
}

window.Bebe3D = {mount, setWeek, dispose, bpmAt, isMounted: () => !!S};
})();
