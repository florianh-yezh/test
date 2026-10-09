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

/* ---------- Fœtus (dès 10 SA) : style « bébé qui dort », vu de face ---------- */
// Repère : x vers la droite, y vers le haut, z vers la caméra. Le visage regarde la caméra.
function fetus(sa){
  const f = smooth(clamp01((sa - 10) / 30));
  const hr = lerp(.54, .44, f), g = lerp(.86, 1.12, f), ls = lerp(.62, 1, f), M = new Model();
  const rx = hr, ry = hr * .96, rz = hr * .93;
  const hc = [0, .5 + hr * .25, .02];
  // point de la surface de la tête vu de face (u, v en fraction du rayon)
  const onHead = (u, v, out = 0) => { const x = u * rx, y = v * ry, z = rz * Math.sqrt(Math.max(0, 1 - u * u - v * v)); return [hc[0] + x, hc[1] + y, hc[2] + z + out]; };
  // Tête bien ronde, joues pleines
  M.ell(hc, rx, ry, rz, .1);
  for (const s of [-1, 1]) M.sphere(onHead(s * .42, -.4, -hr * .32), hr * .33 * lerp(.9, 1.05, f), .1);
  M.sphere(onHead(0, -.12, -hr * .06), hr * .085, .04);                                   // petit nez
  for (const s of [-1, 1]) M.ell([hc[0] + s * rx * .92, hc[1] - hr * .14, hc[2] - hr * .1], hr * .08, hr * .14, hr * .11, .04); // oreilles
  // Cou et corps potelé
  M.cap([0, hc[1] - hr * .8, -.02], [0, .1, -.04], .16 * g, .2 * g, .1);
  M.ell([0, -.08, -.06], .33 * g, .4 * g, .28 * g, .12);
  M.sphere([0, -.14, .06], .26 * g, .1);                                                   // ventre rond
  M.sphere([0, -.44, -.08], .28 * g, .1);                                                  // fesses
  // Bras repliés : la main contre la joue
  for (const s of [-1, 1]){
    const sh = [s * .3 * g, .13, -.04];
    const el = [s * (.42 * g), -.1 * ls - .02, .16 * ls + .06];
    const hd = [s * hr * .62, hc[1] - hr * .5, hc[2] + rz * .62];
    M.sphere(sh, .13 * g, .07);
    M.chain([sh, el], [.105 * g, .09 * g], .05);
    M.chain([el, hd], [.09 * g, .072 * g], .05);
    M.ell(hd, .095 * g * Math.max(.85, ls), .085 * g * Math.max(.85, ls), .075 * g, .05);   // menotte
  }
  // Jambes repliées : genoux écartés devant le ventre, chevilles croisées
  const feet = [];
  for (const s of [-1, 1]){
    const hp = [s * .17 * g, -.38, -.02];
    const kn = [s * .31 * g, -.16, .42 * ls + .08];
    const ak = [-s * .05, -.56, .46 * ls + .1 + (s > 0 ? .04 : -.02)];
    M.chain([hp, kn], [.15 * g, .12 * g], .06);
    M.chain([kn, ak], [.11 * g, .08 * g], .05);
    const ft = [ak[0] - s * .1 * ls, ak[1] - .02, ak[2] + .05];
    M.ell(ft, .12 * g * Math.max(.85, ls), .07 * g, .1 * g * Math.max(.85, ls), .05);
    feet.push(ft);
  }
  M.marks.eyes = [[9, 9, 9], [9, 9, 9]];
  M.marks.heart = [0, .02, .1];
  M.marks.belly = [0, -.2, .3 * g + .06];
  M.marks.feet = feet;
  // Détails du visage posés sur la surface (convertis en coordonnées monde par polygonize)
  M.marks.eyeP = [-1, 1].map(s => onHead(s * .36, .05)); M.marks.eyeN = [-1, 1].map(s => onHead(s * .36, .05, 1));
  M.marks.mouth = [onHead(0, -.34), onHead(0, -.34, 1)];
  M.marks.blushP = [-1, 1].map(s => onHead(s * .5, -.24)); M.marks.blushN = [-1, 1].map(s => onHead(s * .5, -.24, 1));
  return {model: M, eyeR: .01, heartR: .3, face: {hr}};
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
  if (sa >= 10) return {core: "#f3b9a0", deep: "#cf8468", rim: "#ffe3d6", eyeDark: 0, opacity: 1};
  return {core: mix("#d2714f", "#e59a80"), deep: mix("#7d321f", "#a5583f"), rim: mix("#f4ae90", "#f9cdb9"), eyeDark: .75, opacity: .97};
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

/* ================= Modèle 3D importé (.glb) ================= */
// Un vrai modèle (ex. téléchargé sur Sketchfab) remplace le fœtus dessiné à partir de 10 SA.
let CUSTOM = null;
const IDB = {
  db(){ return new Promise((ok, ko) => { const r = indexedDB.open("gm-models", 1); r.onupgradeneeded = () => r.result.createObjectStore("m"); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); },
  async get(k){ const d = await IDB.db(); return new Promise((ok, ko) => { const r = d.transaction("m").objectStore("m").get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); },
  async set(k, v){ const d = await IDB.db(); return new Promise((ok, ko) => { const t = d.transaction("m", "readwrite"); t.objectStore("m").put(v, k); t.oncomplete = ok; t.onerror = () => ko(t.error); }); },
  async del(k){ const d = await IDB.db(); return new Promise(ok => { const t = d.transaction("m", "readwrite"); t.objectStore("m").delete(k); t.oncomplete = ok; t.onerror = ok; }); }
};
function parseGLB(buf){
  return new Promise((ok, ko) => new T.GLTFLoader().parse(buf, "", g => ok({scene: g.scene, animations: g.animations || []}), ko));
}
async function setModel(buf, save = true){
  const m = await parseGLB(buf);
  if (CUSTOM) disposeTree(CUSTOM.scene);
  CUSTOM = m;
  if (save){ try{ await IDB.set("foetus", buf); }catch(e){} }
  if (S && S.sa >= 10){ const sa = S.sa; S.sa = null; setWeek(sa); }
}
async function clearModel(){
  try{ await IDB.del("foetus"); }catch(e){}
  if (CUSTOM){ const keep = CUSTOM; CUSTOM = null; if (S && S.sa >= 10){ const sa = S.sa; S.sa = null; setWeek(sa); } disposeTree(keep.scene); }
}
async function loadSavedModel(){
  if (CUSTOM) return true;
  try{ const b = await IDB.get("foetus"); if (b){ await setModel(b, false); return true; } }catch(e){}
  try{ const r = await fetch("models/foetus.glb"); if (r.ok){ await setModel(await r.arrayBuffer(), false); return true; } }catch(e){}
  return false;
}
function buildCustom(sa){
  const group = new T.Group(), pivot = new T.Group(), sc = CUSTOM.scene;
  sc.position.set(0, 0, 0); sc.scale.set(1, 1, 1); sc.rotation.set(0, 0, 0); sc.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(sc), size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
  sc.position.sub(c);
  const k = 2.5 / Math.max(size.x, size.y, size.z) * lerp(.85, 1, smooth(clamp01((sa - 10) / 30)));
  pivot.add(sc); pivot.scale.setScalar(k); pivot.userData.bs = k; pivot.userData.custom = true;
  group.add(pivot);
  group.add(new T.HemisphereLight(0xfff3ec, 0xc8907c, .7));
  const key = new T.DirectionalLight(0xfff2e8, .9); key.position.set(2, 3, 4); group.add(key);
  const fill = new T.DirectionalLight(0xffd8cb, .55); fill.position.set(-3, 1, 2); group.add(fill);
  const rim = new T.DirectionalLight(0xffffff, .7); rim.position.set(0, 2.5, -4); group.add(rim);
  S.mixer = null;
  if (CUSTOM.animations.length){ S.mixer = new T.AnimationMixer(sc); CUSTOM.animations.forEach(a => S.mixer.clipAction(a).play()); }
  return {group, pivot};
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
  const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding;
  return tex;
}

function mount(container, sa, opts = {}){
  dispose();
  const W = () => container.clientWidth || innerWidth, H = () => container.clientHeight || innerHeight;
  const renderer = new T.WebGLRenderer({antialias: true, powerPreference: "high-performance"});
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
  renderer.outputEncoding = T.sRGBEncoding;
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
  controls.autoRotate = false;

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
    res: opts.res || (Math.min(W(), H()) < 700 ? 84 : 96), raf: 0, reduced: !!opts.reduced, t0: performance.now(), nextKick: 2.5, kick: null};
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
  if (S.group){
    S.scene.remove(S.group);
    if (CUSTOM && CUSTOM.scene.parent) CUSTOM.scene.parent.remove(CUSTOM.scene);   // le modèle importé est réutilisé
    disposeTree(S.group);
  }
  S.mixer = null;
  if (CUSTOM && sa >= 10){
    const {group, pivot} = buildCustom(sa);
    S.scene.add(group); S.group = group; S.body = pivot; S.skin = skinMat(skinColors(sa));
    return {bpm: bpmAt(sa)};
  }
  const spec = sa < 10 ? embryo(sa) : fetus(sa);
  const {geo, marks, scale} = polygonize(spec.model, S.res);
  const skin = skinMat(skinColors(sa)), u = skin.uniforms;
  u.uEye1.value.copy(marks.eyes[0]); u.uEye2.value.copy(marks.eyes[1]); u.uEyeR.value = spec.eyeR * scale;
  u.uHeart.value.copy(marks.heart); u.uHeartR.value = spec.heartR * scale;
  u.uFoot1.value.copy(marks.feet[0]); u.uFoot2.value.copy(marks.feet[1]); u.uFootR.value = .18 * scale;
  const group = new T.Group();
  const body = new T.Mesh(geo, skin); body.renderOrder = 2; const bs = sa >= 10 ? 1.35 : 1.15; body.scale.setScalar(bs); body.userData.bs = bs; group.add(body);

  // Visage du fœtus : yeux fermés, sourire, joues roses
  if (spec.face){
    const hr = spec.face.hr * scale;
    const lineMat = new T.MeshBasicMaterial({color: 0x9a5646});
    const place = (m, p, n, roll) => { m.position.copy(p).add(n.clone().sub(p).normalize().multiplyScalar(hr * .012)); m.lookAt(n); m.rotateZ(roll); body.add(m); };
    marks.eyeP.forEach((p, i) => place(new T.Mesh(new T.TorusGeometry(hr * .13, hr * .022, 8, 28, Math.PI), lineMat), p, marks.eyeN[i], Math.PI));
    place(new T.Mesh(new T.TorusGeometry(hr * .085, hr * .02, 8, 24, Math.PI), lineMat), marks.mouth[0], marks.mouth[1], Math.PI);
    const bc = document.createElement("canvas"); bc.width = bc.height = 64;
    const bx = bc.getContext("2d"), bg = bx.createRadialGradient(32, 32, 0, 32, 32, 32);
    bg.addColorStop(0, "rgba(240,120,120,.55)"); bg.addColorStop(1, "rgba(240,120,120,0)"); bx.fillStyle = bg; bx.fillRect(0, 0, 64, 64);
    const blushMat = new T.MeshBasicMaterial({map: new T.CanvasTexture(bc), transparent: true, depthWrite: false});
    marks.blushP.forEach((p, i) => { const m = new T.Mesh(new T.PlaneGeometry(hr * .5, hr * .36), blushMat); m.renderOrder = 4; place(m, p, marks.blushN[i], 0); });
  }
  // Cordon + placenta, ou vésicule vitelline chez l'embryon
  const belly = marks.belly.clone().multiplyScalar(bs);
  const cordMat = skinMat({core: "#e39a7d", deep: "#b0644d", rim: "#fbd6c6", opacity: .92});
  if (sa >= 10){
    const pl = new T.Vector3(1.6, -1.6, -2.6);
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

  group.rotation.y = sa >= 10 ? 0 : -.55;
  S.scene.add(group); S.group = group; S.body = body; S.skin = skin;
  return {bpm: bpmAt(sa)};
}

function loop(){
  if (!S) return;
  S.raf = requestAnimationFrame(loop);
  if (document.hidden) return;
  const t = (performance.now() - S.t0) / 1000, u = S.skin.uniforms;
  if (S.mixer){ const now = performance.now(); S.mixer.update(Math.min(.05, (now - (S.lastT || now)) / 1000)); S.lastT = now; }
  const period = 60 / bpmAt(S.sa), ph = (t % period) / period;
  u.uPulse.value = Math.exp(-Math.pow((ph - .1) / .07, 2)) + .55 * Math.exp(-Math.pow((ph - .32) / .07, 2));
  if (!S.reduced){
    S.body.position.y = Math.sin(t * .7) * .06;
    S.body.rotation.z = Math.sin(t * .45) * .035;
    if (S.sa < 10) S.group.rotation.y = -.55 + Math.sin(t * .3) * .5;
    if (S.sa >= 10){ S.group.rotation.y = Math.sin(t * .35) * .38; const br = 1 + Math.sin(t * 1.6) * .008, bs = S.body.userData.bs; S.body.scale.set(bs * br, bs / br, bs * br); }
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
  if (CUSTOM && CUSTOM.scene.parent) CUSTOM.scene.parent.remove(CUSTOM.scene);
  disposeTree(S.scene);
  if (S.scene.background && S.scene.background.dispose) S.scene.background.dispose();
  if (S.bloom) S.bloom.dispose();
  if (S.composer){ S.composer.renderTarget1.dispose(); S.composer.renderTarget2.dispose(); }
  S.renderer.dispose();
  if (S.renderer.domElement.parentNode) S.renderer.domElement.parentNode.removeChild(S.renderer.domElement);
  S = null;
}

window.Bebe3D = {mount, setWeek, dispose, bpmAt, isMounted: () => !!S, setModel, clearModel, loadSavedModel, hasModel: () => !!CUSTOM};
})();
