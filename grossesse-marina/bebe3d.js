/* Bébé en 3D : illustration procédurale (Three.js r128) dont les proportions suivent la semaine d'aménorrhée.
   Ce n'est pas une image médicale : formes construites à partir de courbes, éclairage « intra-utérin ». */
(() => {
"use strict";
const T = window.THREE;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = t => Math.max(0, Math.min(1, t));
const smooth = t => t * t * (3 - 2 * t);
const V = (x, y, z = 0) => new T.Vector3(x, y, z);

// Rythme cardiaque moyen (battements/min) selon les SA.
const BPM = [[5, 110], [6, 120], [7, 140], [8, 160], [9, 170], [10, 165], [12, 155], [14, 150], [20, 145], [30, 140], [41, 140]];
function bpmAt(sa){
  if (sa <= BPM[0][0]) return BPM[0][1];
  for (let i = 1; i < BPM.length; i++) if (sa <= BPM[i][0]){ const [a, x] = BPM[i - 1], [b, y] = BPM[i]; return Math.round(lerp(x, y, (sa - a) / (b - a))); }
  return 140;
}

/* Tube à rayon variable le long d'une courbe (corps, membres, cordon). */
function sweep(points, radii, opts = {}){
  const curve = new T.CatmullRomCurve3(points, false, "centripetal");
  const tub = opts.tub || 40, rad = opts.rad || 18, sz = opts.sz || 1;
  const frames = curve.computeFrenetFrames(tub, false);
  const rAt = t => { const n = radii.length - 1, x = t * n, i = Math.min(n - 1, Math.floor(x)), f = smooth(x - i); return lerp(radii[i], radii[i + 1], f); };
  const pos = [], idx = [];
  for (let i = 0; i <= tub; i++){
    const t = i / tub, P = curve.getPointAt(t), N = frames.normals[i], B = frames.binormals[i], r = rAt(t);
    for (let j = 0; j <= rad; j++){
      const v = j / rad * Math.PI * 2, c = Math.cos(v), s = Math.sin(v) * sz;
      pos.push(P.x + r * (c * N.x + s * B.x), P.y + r * (c * N.y + s * B.y), P.z + r * (c * N.z + s * B.z));
    }
  }
  for (let i = 0; i < tub; i++) for (let j = 0; j < rad; j++){
    const a = i * (rad + 1) + j, b = (i + 1) * (rad + 1) + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const group = new T.Group();
  group.add(new T.Mesh(g, opts.mat));
  if (opts.caps !== false){
    const r0 = rAt(0), r1 = rAt(1);
    if (r0 > .01) group.add(ball(curve.getPointAt(0), r0, opts.mat));
    if (r1 > .01) group.add(ball(curve.getPointAt(1), r1, opts.mat));
  }
  group.userData.curve = curve;
  return group;
}
function ball(p, r, mat, scale){
  const m = new T.Mesh(new T.SphereGeometry(r, 28, 20), mat);
  m.position.copy(p);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  return m;
}

/* ---------- Construction du bébé ---------- */
function skinMaterial(sa){
  const t = clamp01((sa - 4) / 30);
  const col = new T.Color("#C9565F").lerp(new T.Color("#E39A84"), smooth(t));
  return new T.MeshStandardMaterial({color: col, roughness: .55, metalness: 0, emissive: new T.Color("#9E2433"), emissiveIntensity: lerp(.32, .14, t), side: T.DoubleSide});
}

function buildEmbryo(sa, mat, parts){
  const e = clamp01((sa - 4) / 4);
  const g = new T.Group();
  const body = sweep([V(.22, .42), V(-.05, .58), V(-.36, .32), V(-.44, -.08), V(-.25, -.42), V(.06, -.5), V(.2, -.34), V(.16, -.22)],
    [.30 + .06 * e, .38 + .04 * e, .31, .26, .2, .11, .045, .02], {mat, tub: 60, sz: .9});
  g.add(body);
  // Cœur, très visible chez l'embryon
  const heartMat = new T.MeshStandardMaterial({color: "#C2283B", emissive: "#FF4D6A", emissiveIntensity: .6, roughness: .4});
  const heart = ball(V(.1, .02, 0), .15, heartMat); g.add(heart); parts.heart = heart;
  // Œil (tache sombre) et bourgeons des membres
  if (e > .25){ const eye = new T.MeshStandardMaterial({color: "#2B1630", roughness: .3});
    for (const s of [-1, 1]) g.add(ball(V(.16, .5, s * .27), .045 * e + .01, eye)); }
  const bud = .05 + .1 * e;
  for (const s of [-1, 1]){
    g.add(ball(V(-.02, .02, s * .26), bud, mat, [1.4, .8, 1]));
    g.add(ball(V(-.16, -.3, s * .2), bud * .9, mat, [1.4, .8, 1]));
  }
  return g;
}

function buildFetus(sa, mat, parts){
  const f = smooth(clamp01((sa - 8) / 32));
  const headR = lerp(.56, .40, f), L = lerp(.85, 1.15, f), gth = lerp(.78, 1.12, f), ls = lerp(.42, 1, f);
  const g = new T.Group();
  // Colonne / corps en C
  g.add(sweep([V(.03, .55 * L), V(-.12, .26 * L), V(-.2, -.05 * L), V(-.17, -.38 * L), V(-.05, -.62 * L)],
    [.14 * gth, .3 * gth, .33 * gth, .37 * gth, .33 * gth, .2 * gth], {mat, tub: 48}));
  // Tête (penchée vers l'avant)
  const head = new T.Group();
  const hc = V(.14, .55 * L + headR * .78, 0);
  head.position.copy(hc);
  head.add(ball(V(0, 0, 0), headR, mat, [1.04, .96, .9]));
  const dark = new T.MeshStandardMaterial({color: "#5A2A36", roughness: .5});
  const lid = mat.clone(); lid.color = mat.color.clone().multiplyScalar(.9);
  for (const s of [-1, 1]){
    const ey = ball(V(headR * .82, -headR * .05, s * headR * .33), headR * .13, lid, [.45, .55, 1]); head.add(ey);  // paupières closes
    const ln = ball(V(headR * .9, -headR * .1, s * headR * .33), headR * .17, dark, [.12, .07, 1]); head.add(ln);
    const ear = new T.Mesh(new T.TorusGeometry(headR * .14, headR * .05, 10, 24, Math.PI * 1.4), mat);
    ear.position.set(-headR * .05, -headR * .15, s * headR * .9); ear.rotation.set(0, 0, -1.2); head.add(ear);
  }
  head.add(ball(V(headR * 1.0, -headR * .25, 0), headR * .12, mat, [1, .8, .9]));            // nez
  head.add(ball(V(headR * .93, -headR * .5, 0), headR * .14, dark, [.25, .12, .9]));          // bouche
  head.add(ball(V(headR * .7, -headR * .72, 0), headR * .3, mat, [1, .7, 1]));                // menton / joues
  head.rotation.z = -.32;
  g.add(head); parts.head = head;

  // Bras : la main vient près du visage
  parts.arms = [];
  for (const s of [-1, 1]){
    const sh = V(-.04, .32 * L, s * .27 * gth);
    const el = V(.28 * ls, -.3 * ls, s * .1 * ls);
    const hd = el.clone().add(V(.24 * ls, .45 * ls, -s * .14 * ls));
    const arm = new T.Group(); arm.position.copy(sh);
    arm.add(sweep([V(0, 0, 0), el.clone().multiplyScalar(.5).add(V(.02, 0, 0)), el, hd], [.1 * gth, .085 * gth, .075 * gth, .06 * gth], {mat, tub: 30, rad: 14}));
    const hand = ball(hd, .08 * gth * Math.max(.7, ls), mat, [1.25, .7, 1.05]); arm.add(hand);
    g.add(arm); parts.arms.push(arm);
  }
  // Jambes repliées, genoux vers la poitrine
  parts.legs = [];
  for (const s of [-1, 1]){
    const hp = V(-.1, -.5 * L, s * .2 * gth);
    const kn = V(.55 * ls, .3 * ls, s * .1 * ls);
    const ak = kn.clone().add(V(-.1 * ls, -.52 * ls, -s * .2 * ls));
    const leg = new T.Group(); leg.position.copy(hp);
    leg.add(sweep([V(0, 0, 0), kn.clone().multiplyScalar(.5).add(V(0, -.04, 0)), kn, ak.clone().lerp(kn, .5).add(V(.03, 0, 0)), ak],
      [.16 * gth, .13 * gth, .1 * gth, .085 * gth, .07 * gth], {mat, tub: 36, rad: 16}));
    leg.add(ball(ak.clone().add(V(.09 * ls, -.03 * ls, 0)), .1 * gth * Math.max(.7, ls), mat, [1.6, .65, .8])); // pied
    g.add(leg); parts.legs.push(leg);
  }
  // Petit cœur lumineux (invisible, sert au battement)
  parts.heart = new T.Object3D(); parts.heart.position.set(.05, .1 * L, 0); g.add(parts.heart);
  parts.belly = V(.2 * gth + .05, -.36 * L, 0);
  return g;
}

/* ---------- Scène ---------- */
let S = null;

function mount(container, sa, opts = {}){
  dispose();
  if (!T){ throw new Error("three"); }
  const W = () => container.clientWidth || innerWidth, H = () => container.clientHeight || innerHeight;
  const renderer = new T.WebGLRenderer({antialias: true, alpha: true, powerPreference: "high-performance"});
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(W(), H());
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  container.appendChild(renderer.domElement);

  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x3a0f22, .045);
  const camera = new T.PerspectiveCamera(34, W() / H(), .1, 100);
  camera.position.set(3.6, .7, 4.6);

  scene.add(new T.HemisphereLight(0xffd9e4, 0x3a0f22, .55));
  const key = new T.DirectionalLight(0xffe2cf, 1.05); key.position.set(4, 3, 4); scene.add(key);
  const rim = new T.DirectionalLight(0xff6f9e, 2.1); rim.position.set(-4, 1.5, -3); scene.add(rim);
  const fill = new T.DirectionalLight(0xb9a3ff, .55); fill.position.set(-3, -2, 3); scene.add(fill);
  const glow = new T.PointLight(0xff5a7a, 0, 3.2); scene.add(glow);

  // Poche amniotique
  const sac = new T.Mesh(new T.SphereGeometry(2.05, 64, 48), new T.MeshStandardMaterial({color: 0xf7a9c4, transparent: true, opacity: .13, roughness: .2, side: T.BackSide, depthWrite: false, emissive: 0x5a1532, emissiveIntensity: .4}));
  scene.add(sac);
  const sacFront = new T.Mesh(new T.SphereGeometry(2.06, 64, 48), new T.MeshStandardMaterial({color: 0xffd6e6, transparent: true, opacity: .05, roughness: .1, depthWrite: false}));
  scene.add(sacFront);

  // Particules en suspension
  const N = 220, pp = new Float32Array(N * 3), speeds = [];
  for (let i = 0; i < N; i++){
    const r = 1.9 * Math.cbrt(Math.random()), th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pp[i * 3] = r * Math.sin(ph) * Math.cos(th); pp[i * 3 + 1] = r * Math.cos(ph); pp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    speeds.push(.0006 + Math.random() * .0012);
  }
  const pg = new T.BufferGeometry(); pg.setAttribute("position", new T.BufferAttribute(pp, 3));
  const dot = document.createElement("canvas"); dot.width = dot.height = 64;
  const dc = dot.getContext("2d"), grd = dc.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(.4, "rgba(255,210,230,.5)"); grd.addColorStop(1, "rgba(255,210,230,0)");
  dc.fillStyle = grd; dc.fillRect(0, 0, 64, 64);
  const points = new T.Points(pg, new T.PointsMaterial({size: .05, map: new T.CanvasTexture(dot), transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending}));
  scene.add(points);

  const controls = new T.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08;
  controls.enablePan = false; controls.minDistance = 2.6; controls.maxDistance = 9;
  controls.autoRotate = !opts.reduced; controls.autoRotateSpeed = .55;
  controls.target.set(0, 0, 0);

  S = {container, renderer, scene, camera, controls, glow, points, speeds, sa: null, baby: null, extras: null, parts: {}, raf: 0, reduced: !!opts.reduced,
    t0: performance.now(), nextKick: 3, kick: null, onResize: null};
  setWeek(sa);

  S.onResize = () => {
    if (!S) return;
    const w = W(), h = H(), half = T.MathUtils.degToRad(camera.fov / 2);
    camera.aspect = w / h;
    const fitR = 1.5, tanH = Math.tan(half) * Math.min(1, camera.aspect);
    const d = Math.max(4.2, fitR / tanH) * 1.04;
    camera.position.setLength(d);
    controls.minDistance = d * .45; controls.maxDistance = d * 1.6;
    camera.setViewOffset(w, h, 0, h < w ? 0 : h * .11, w, h);
    camera.updateProjectionMatrix(); renderer.setSize(w, h);
  };
  S.onResize();
  addEventListener("resize", S.onResize);
  loop();
  return {bpm: bpmAt(sa)};
}

function setWeek(sa){
  if (!S) return;
  sa = Math.max(4, Math.min(41, Math.round(sa)));
  if (S.sa === sa) return {bpm: bpmAt(sa)};
  S.sa = sa;
  for (const o of [S.baby, S.extras]) if (o){ S.scene.remove(o); disposeTree(o); }
  const mat = skinMaterial(sa), parts = {};
  const body = sa < 8 ? buildEmbryo(sa, mat, parts) : buildFetus(sa, mat, parts);
  // Normalise la taille : le bébé remplit toujours la poche
  const box = new T.Box3().setFromObject(body), size = box.getSize(V(0, 0, 0)), center = box.getCenter(V(0, 0, 0));
  const k = (sa < 8 ? 2.0 : 2.8) / Math.max(size.x, size.y, size.z);
  const baby = new T.Group(); body.position.sub(center); baby.add(body); baby.scale.setScalar(k);
  baby.rotation.y = -.35;
  S.scene.add(baby); S.baby = baby; S.parts = parts;
  baby.updateMatrixWorld(true);

  // Cordon et placenta (ou vésicule vitelline chez l'embryon)
  const extras = new T.Group();
  if (sa >= 8 && parts.belly){
    const start = body.localToWorld(parts.belly.clone());
    const pl = V(-.75, -.55, -1.45).normalize().multiplyScalar(1.82);
    const plMat = new T.MeshStandardMaterial({color: 0x9c2f4c, roughness: .75, emissive: 0x4a0d1c, emissiveIntensity: .35});
    const placenta = ball(pl, .62, plMat, [1, 1, .32]); placenta.lookAt(0, 0, 0); extras.add(placenta);
    const pts = [];
    for (let i = 0; i <= 10; i++){
      const t = i / 10, p = start.clone().lerp(pl, t);
      const off = Math.sin(t * Math.PI) * .55;
      p.add(V(Math.sin(t * 9) * .12 + off * .4, -off * .6 + Math.cos(t * 9) * .1, Math.cos(t * 7) * .12 + .3 * Math.sin(t * Math.PI)));
      pts.push(p);
    }
    const cordMat = new T.MeshStandardMaterial({color: 0xd9a3b8, roughness: .35, emissive: 0x6b2340, emissiveIntensity: .25});
    extras.add(sweep(pts, [.06, .055, .055, .06], {mat: cordMat, tub: 80, rad: 12}));
  } else {
    const ys = new T.MeshStandardMaterial({color: 0xf6c97a, roughness: .3, transparent: true, opacity: .75, emissive: 0x7a4a10, emissiveIntensity: .3});
    const yp = V(1.15, -.35, .2);
    extras.add(ball(yp, .32, ys));
    const st = body.localToWorld(V(.05, -.15, 0));
    extras.add(sweep([st, st.clone().lerp(yp, .5).add(V(0, -.15, 0)), yp], [.035, .03, .035], {mat: ys, tub: 20, rad: 8}));
  }
  S.scene.add(extras); S.extras = extras;
  return {bpm: bpmAt(sa)};
}

function loop(){
  if (!S) return;
  S.raf = requestAnimationFrame(loop);
  if (document.hidden) return;
  const t = (performance.now() - S.t0) / 1000, p = S.parts;
  // Battement de cœur
  const period = 60 / bpmAt(S.sa), ph = (t % period) / period;
  const beat = Math.exp(-Math.pow((ph - .1) / .06, 2)) + .55 * Math.exp(-Math.pow((ph - .32) / .06, 2));
  S.glow.intensity = .25 + beat * 1.4;
  if (p.heart){ p.heart.updateMatrixWorld(); S.glow.position.setFromMatrixPosition(p.heart.matrixWorld); if (p.heart.isMesh) p.heart.scale.setScalar(1 + beat * .18); }
  if (!S.reduced){
    S.baby.position.y = Math.sin(t * .7) * .06;
    S.baby.rotation.z = Math.sin(t * .45) * .04;
    if (p.head) p.head.rotation.x = Math.sin(t * .5) * .05;
    if (p.arms) p.arms.forEach((a, i) => { a.rotation.z = Math.sin(t * .9 + i * 2) * .07; a.rotation.y = Math.sin(t * .6 + i) * .05; });
    // Petit coup de pied de temps en temps
    if (p.legs && p.legs.length){
      if (!S.kick && t > S.nextKick){ S.kick = {leg: p.legs[Math.random() < .5 ? 0 : 1], t: t}; }
      if (S.kick){
        const k = (t - S.kick.t) / .9;
        S.kick.leg.rotation.z = k < 1 ? -Math.sin(k * Math.PI) * .45 : 0;
        if (k >= 1){ S.kick = null; S.nextKick = t + 3 + Math.random() * 5; }
      }
    }
    const pos = S.points.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++){
      let y = pos.getY(i) + S.speeds[i];
      if (y > 1.9) y = -1.9;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }
  S.controls.update();
  S.renderer.render(S.scene, S.camera);
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
  S.renderer.dispose();
  if (S.renderer.domElement.parentNode) S.renderer.domElement.parentNode.removeChild(S.renderer.domElement);
  S = null;
}

window.Bebe3D = {mount, setWeek, dispose, bpmAt, isMounted: () => !!S};
})();
