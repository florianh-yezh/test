/* Grossesse Marina : logique de l'appli (rendu, stockage local + Firebase, assistant, effets) */
(() => {
"use strict";

const CFG = window.GM_CONFIG || {};
const CLOUD = !!(CFG.firebase && CFG.firebase.apiKey);
const FOYER = (CFG.foyer || "marina").replace(/[^A-Za-z0-9_-]/g, "") || "marina";
const FB_VERSION = "10.12.2";
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================= Utilitaires ================= */
const DAY = 86400000;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clone = o => JSON.parse(JSON.stringify(o));
function lsGet(k){ try{ const v = localStorage.getItem("gm:" + k); return v ? JSON.parse(v) : null; }catch(e){ return null; } }
function lsSet(k, v){ try{ localStorage.setItem("gm:" + k, JSON.stringify(v)); }catch(e){} }
function parseD(s){ if (!s) return null; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function fmtISO(d){ return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function today(){ const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function addDays(d, n){ const r = new Date(d); r.setDate(r.getDate() + n); return r; }
const diffDays = (a, b) => Math.round((a - b) / DAY);
const fmtMid = d => d.toLocaleDateString("fr-FR", {weekday:"short", day:"numeric", month:"long"});
const fmtShort = d => d.toLocaleDateString("fr-FR", {day:"numeric", month:"short"}).replace(".", "");
const buzz = (ms = 10) => { try{ navigator.vibrate && navigator.vibrate(ms); }catch(e){} };

function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ================= État ================= */
const DEFAULTS = {
  profil: {maman:"Marina", papa:"", nom:"", mode:"ddr", ddr:"", terme:"", sexe:""},
  rdv: {}, prenoms: {}, journal: {},
  valise: {checked:{}, custom:{}},
  // fonctionnalités ajoutées (voir extras.js)
  lettres: {}, questions: {}, symptomes: {}, taches: {}, achats: {}, photos: {},
  vitamines: {jours:{}}, duel: {lui:{}, elle:{}}
};
const METAS = ["profil", "valise", "vitamines", "duel"];
const NOLOCAL = new Set(["photos"]);   // les photos restent dans le cache Firebase, pas dans le stockage du navigateur
const KEYS = Object.keys(DEFAULTS);
const S = {};
for (const k of KEYS){
  const v = NOLOCAL.has(k) ? null : lsGet(k);
  S[k] = (v && typeof v === "object" && !Array.isArray(v)) ? Object.assign(clone(DEFAULTS[k]), v) : clone(DEFAULTS[k]);
}
const UI = Object.assign({tab:"accueil", guideTab:"hub", foodCat:"all", foodQ:"", nameSex:"all", week:null, theme:"auto"}, lsGet("ui") || {});
const saveUI = () => lsSet("ui", UI);
const values = col => Object.values(S[col] || {});

/* ================= Firebase ================= */
const Cloud = {fs:null, auth:null, user:null, state: CLOUD ? "loading" : "local", unsubs:[], FieldValue:null};

function loadScript(src){
  return new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
}
async function initCloud(){
  if (!CLOUD) return;
  try{
    const base = "https://www.gstatic.com/firebasejs/" + FB_VERSION + "/";
    await loadScript(base + "firebase-app-compat.js");
    await Promise.all([loadScript(base + "firebase-auth-compat.js"), loadScript(base + "firebase-firestore-compat.js")]);
  }catch(e){
    Cloud.state = "local";
    showBanner("Connexion impossible pour l'instant : l'appli fonctionne sur ce téléphone et se synchronisera au prochain lancement avec du réseau.");
    render(); return;
  }
  const fb = window.firebase;
  fb.initializeApp(CFG.firebase);
  Cloud.auth = fb.auth();
  Cloud.fs = fb.firestore();
  Cloud.FieldValue = fb.firestore.FieldValue;
  try{ await Cloud.fs.enablePersistence({synchronizeTabs:true}); }catch(e){}
  try{ await Cloud.auth.getRedirectResult(); }catch(e){ if (e && e.code) toast(authMsg(e)); }
  Cloud.auth.onAuthStateChanged(u => {
    Cloud.unsubs.forEach(f => f()); Cloud.unsubs = [];
    Cloud.user = u;
    if (!u){ Cloud.state = "signedout"; setSync(); render(); return; }
    const allowed = (CFG.allowedEmails || []).map(x => x.toLowerCase());
    if (allowed.length && !allowed.includes((u.email || "").toLowerCase())){ Cloud.state = "denied"; setSync(); render(); return; }
    Cloud.state = "on"; showBanner(""); setSync(); subscribe(); render();
  });
}
function authMsg(e){
  const c = e && e.code || "";
  if (c.includes("popup-closed")) return "Connexion annulée.";
  if (c.includes("unauthorized-domain")) return "Ce site n'est pas autorisé dans Firebase (voir INSTALLATION.md).";
  if (c.includes("network")) return "Pas de réseau : réessaie dans un instant.";
  return "Connexion impossible (" + c + ").";
}
async function signIn(){
  const fb = window.firebase; if (!fb) return;
  const p = new fb.auth.GoogleAuthProvider();
  p.setCustomParameters({prompt:"select_account"});
  try{ await Cloud.auth.signInWithPopup(p); }
  catch(e){
    if (e && /popup-blocked|operation-not-supported/.test(e.code || "")){ try{ await Cloud.auth.signInWithRedirect(p); }catch(e2){ toast(authMsg(e2)); } }
    else toast(authMsg(e));
  }
}
const foyerRef = () => Cloud.fs.collection("foyers").doc(FOYER);
const metaRef = k => foyerRef().collection("meta").doc(k);
const colRef = k => foyerRef().collection(k);

function subscribe(){
  const onErr = e => {
    console.warn(e);
    if (e && e.code === "permission-denied" && Cloud.state !== "refused"){
      Cloud.state = "refused"; Cloud.unsubs.forEach(f => f()); Cloud.unsubs = [];
      setSync(); showBanner("Connectée, mais la base Firebase refuse la synchronisation : les règles Firestore ne sont pas publiées ou ne contiennent pas cette adresse. L'appli fonctionne en attendant sur ce téléphone.");
      render();
    }
  };
  // Première synchro sur ce téléphone : on envoie ce qui avait été saisi hors ligne avant d'écraser par la base.
  const migKey = "migrated:" + FOYER;
  const pending = lsGet(migKey) ? null : clone(S);
  const migrated = new Set();
  const markDone = k => { migrated.add(k); if (migrated.size === KEYS.length) lsSet(migKey, true); };
  for (const k of METAS){
    Cloud.unsubs.push(metaRef(k).onSnapshot({includeMetadataChanges:true}, snap => {
      if (pending && !migrated.has(k) && !snap.metadata.fromCache){
        const local = pending[k], server = snap.exists ? snap.data() : {};
        const patch = {};
        if (k === "profil"){ for (const f of Object.keys(local)) if (local[f] && local[f] !== DEFAULTS.profil[f] && !server[f]) patch[f] = local[f]; }
        else {
          for (const f of Object.keys(local)) if (local[f] && typeof local[f] === "object") for (const [key, v] of Object.entries(local[f])) if (!(server[f] && key in server[f])) (patch[f] = patch[f] || {})[key] = v;
        }
        if (Object.keys(patch).length) cloudWrite(metaRef(k).set(patch, {merge:true}));
        markDone(k);
      }
      if (!snap.exists) return;
      S[k] = Object.assign(clone(DEFAULTS[k]), snap.data());
      lsSet(k, S[k]); if (k === "profil") applyTheme(); requestRender();
    }, onErr));
  }
  for (const k of KEYS.filter(k => !METAS.includes(k))){
    Cloud.unsubs.push(colRef(k).onSnapshot({includeMetadataChanges:true}, qs => {
      const m = {}; qs.forEach(d => { m[d.id] = Object.assign({}, d.data(), {id:d.id}); });
      if (pending && !migrated.has(k) && !qs.metadata.fromCache){
        for (const [id, item] of Object.entries(pending[k] || {})) if (!m[id]){ m[id] = item; cloudWrite(colRef(k).doc(id).set(item)); }
        markDone(k);
      }
      S[k] = m; saveLocal(k); requestRender();
    }, onErr));
  }
}
const live = () => Cloud.state === "on" && Cloud.fs;
function cloudWrite(p){ if (p && p.catch) p.catch(e => { console.warn(e); toast(e && e.code === "permission-denied" ? "Accès refusé par la base : vérifie les règles Firestore." : "Enregistré sur le téléphone, synchronisation plus tard."); }); }

/* opérations sur les données (local immédiat + Firestore) */
const saveLocal = k => { if (!NOLOCAL.has(k)) lsSet(k, S[k]); };
function putItem(col, item){ S[col][item.id] = item; saveLocal(col); if (live()) cloudWrite(colRef(col).doc(item.id).set(item)); }
function patchItem(col, id, patch){ if (!S[col][id]) return; Object.assign(S[col][id], patch); saveLocal(col); if (live()) cloudWrite(colRef(col).doc(id).set(patch, {merge:true})); }
function delItem(col, id){ delete S[col][id]; saveLocal(col); if (live()) cloudWrite(colRef(col).doc(id).delete()); }
function setProfil(p){ S.profil = Object.assign(S.profil, p); lsSet("profil", S.profil); if (live()) cloudWrite(metaRef("profil").set(p, {merge:true})); }
// Modifie une entrée d'un dictionnaire dans un document « meta » (valise, vitamines, duel…) ; null la supprime.
function metaSet(k, field, key, val){
  const v = S[k]; v[field] = v[field] || {};
  if (val === null) delete v[field][key]; else v[field][key] = (typeof val === "object" && v[field][key]) ? Object.assign(v[field][key], val) : val;
  lsSet(k, v);
  if (live()) cloudWrite(metaRef(k).set({[field]:{[key]: val === null ? Cloud.FieldValue.delete() : val}}, {merge:true}));
}
const valiseSet = (field, key, val) => metaSet("valise", field, key, val);

/* ================= Calculs de grossesse ================= */
function ddr(){
  const p = S.profil;
  if (p.mode === "terme" && p.terme){ const t = parseD(p.terme); return t ? addDays(t, -287) : null; }
  return parseD(p.ddr);
}
function preg(){
  const d0 = ddr(); if (!d0) return null;
  const days = diffDays(today(), d0), terme = addDays(d0, 287);
  const sa = Math.floor(days / 7), j = ((days % 7) + 7) % 7;
  return {days, sa, j, terme, trim: sa < 15 ? 1 : sa < 29 ? 2 : 3,
    mois: Math.max(1, Math.min(9, Math.floor((days - 14) / 30.44) + 1)),
    left: diffDays(terme, today()), pct: Math.max(0, Math.min(1, days / 287))};
}
const weekData = sa => WEEKS.find(w => w[0] === Math.max(4, Math.min(41, sa)));
const fmtSize = cm => cm < 1 ? (cm * 10).toLocaleString("fr-FR") + " mm" : cm.toLocaleString("fr-FR") + " cm";
const fmtWeight = g => g < 1 ? "< 1 g" : g >= 1000 ? (g / 1000).toLocaleString("fr-FR", {maximumFractionDigits:2}) + " kg" : g + " g";
const mamanName = () => S.profil.maman || "Marina";
const papaName = () => S.profil.papa || "Papa";
const ord = n => n === 1 ? "er" : "e";

/* ================= Fleur (signature visuelle) ================= */
let flowerN = 0;
function flowerSVG(pct, opts = {}){
  const id = "fl" + (++flowerN), N = 12, open = Math.max(1, Math.round(pct * N));
  let outer = "", inner = "";
  for (let i = 0; i < N; i++){
    const on = i < open;
    outer += `<g transform="rotate(${i * 30} 60 60)"><path class="petal" style="animation-delay:${i * 70}ms" d="M60 58 C47 44 49 18 60 8 C71 18 73 44 60 58Z" fill="${on ? `url(#${id}a)` : "rgba(255,255,255,.35)"}" stroke="${on ? "rgba(255,255,255,.7)" : "rgba(123,92,214,.35)"}" stroke-width="1"/></g>`;
  }
  for (let i = 0; i < 8; i++){
    inner += `<g transform="rotate(${i * 45 + 22.5} 60 60)"><path class="petal" style="animation-delay:${400 + i * 60}ms" d="M60 58 C53 50 54 36 60 30 C66 36 67 50 60 58Z" fill="url(#${id}b)" opacity=".95"/></g>`;
  }
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><defs>
    <linearGradient id="${id}a" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7B5CD6"/><stop offset=".6" stop-color="#B9A3FF"/><stop offset="1" stop-color="#F3E9FF"/></linearGradient>
    <linearGradient id="${id}b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2FA586"/><stop offset="1" stop-color="#C9F5E6"/></linearGradient>
    <radialGradient id="${id}c"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#E9E1FD"/></radialGradient></defs>
    <g class="flower-spin">${outer}${inner}</g><circle cx="60" cy="60" r="${opts.core || 20}" fill="url(#${id}c)" stroke="rgba(255,255,255,.9)" stroke-width="2"/></svg>`;
}

/* ================= Rendu ================= */
let pendingRender = false;
function requestRender(){
  const a = document.activeElement;
  if (a && $("#view").contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)){ pendingRender = true; return; }
  render();
}
document.addEventListener("focusout", () => setTimeout(() => { if (pendingRender){ pendingRender = false; requestRender(); } }, 60));

function setSync(){
  const el = $("#sync");
  const m = {local:["Sur ce téléphone", false], loading:["Connexion…", false], signedout:["Non connecté", false], denied:["Accès refusé", false], refused:["Non synchronisé", false], on:["Synchronisé", true]}[Cloud.state];
  el.textContent = m[0]; el.classList.toggle("on", m[1]);
}
function showBanner(t){ const b = $("#banner"); b.textContent = t; b.hidden = !t; }

function render(){
  $("#brandName").textContent = mamanName();
  const gated = CLOUD && !["on", "local", "refused"].includes(Cloud.state);
  $("#tabs").hidden = gated; $("#top").hidden = gated; $("#disclaimer").hidden = gated;
  document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === UI.tab ? "page" : "false"));
  const v = $("#view");
  if (gated){ leave3D(); v.innerHTML = vGate(); return; }
  const is3D = UI.tab === "bebe3d";
  document.body.classList.toggle("in3d", is3D);
  $("#tabs").hidden = is3D; $("#top").hidden = is3D; $("#disclaimer").hidden = is3D;
  if (is3D){ if (!$("#b3d")){ v.innerHTML = vBebe3D(); start3D(); } else update3DInfo(); return; }
  leave3D();
  const fn = {accueil:vAccueil, rdv:vRdv, ia:vIA, prenoms:vPrenoms, guide:vGuide}[UI.tab] || vAccueil;
  v.innerHTML = fn();
  afterRender();
}
function afterRender(){
  if (UI.tab === "guide" && UI.guideTab === "semaines"){ const cur = document.querySelector('.wk[aria-pressed="true"]'); if (cur) cur.scrollIntoView({inline:"center", block:"nearest"}); }
  if (UI.tab === "guide" && UI.guideTab === "outils") tick();
  if (window.GMX && GMX.afterRender) GMX.afterRender();
  if (UI.tab === "ia" && chat.length){ const f = $("#aiForm"); if (f) f.scrollIntoView({block:"center"}); }
  document.querySelectorAll("[data-count]").forEach(countUp);
}
function countUp(el){
  const to = +el.dataset.count; if (REDUCED || !(to > 0) || el._done){ el.textContent = to; return; }
  el._done = true; const t0 = performance.now(), dur = 900;
  const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function go(tab, sub, fromPop){
  const same = tab === UI.tab && (!sub || sub === UI.guideTab);
  if (sub) UI.guideTab = sub;
  if (tab !== "guide" || sub) UI.week = tab === "guide" && sub === "semaines" ? UI.week : null;
  UI.tab = tab; saveUI(); buzz(8);
  if (!fromPop && !same) history.pushState({tab, sub: UI.guideTab}, "");
  const run = () => { render(); window.scrollTo({top:0}); };
  if (document.startViewTransition && !REDUCED && tab !== "bebe3d") document.startViewTransition(run); else run();
}
// Touche retour d'Android : revient à l'écran précédent, ferme d'abord un panneau ouvert.
function openSheetState(){ if (!(history.state && history.state.sheet)) history.pushState({tab: UI.tab, sub: UI.guideTab, sheet: true}, ""); }
addEventListener("popstate", e => {
  if (!$("#sheet").hidden){ $("#sheet").hidden = true; if (!(e.state && e.state.sheet)) return; }
  const st = e.state || {tab: "accueil"};
  if (st.sheet){ history.back(); return; }
  go(st.tab || "accueil", st.sub, true);
});

/* ---------- écran de connexion ---------- */
function vGate(){
  const st = Cloud.state;
  const body = st === "loading" ? `<p class="muted">Ouverture du jardin…</p>`
    : st === "denied" ? `<p class="muted" style="max-width:34ch;margin:0 auto">Le compte <b>${esc(Cloud.user && Cloud.user.email)}</b> n'a pas accès à cette appli.</p><button class="btn ghost" data-act="signout">Changer de compte</button>`
    : `<p class="muted" style="max-width:34ch;margin:0 auto">Connectez-vous chacun avec votre compte Google pour partager le suivi, les rendez-vous et vos prénoms préférés.</p>
       <button class="btn gbtn" data-act="signin"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continuer avec Google</button>`;
  return `<section class="login"><div class="stack" style="align-items:center">
    <div class="flower">${flowerSVG(.75, {core:16})}</div>
    <h1>Grossesse <span>${esc(mamanName())}</span></h1>${body}
    ${!isStandalone() ? `<button class="btn small ghost" data-act="install">📲 Installer l'appli sur le téléphone</button>` : ""}</div></section>`;
}

/* ---------- accueil ---------- */
function heroHTML(p){
  const w = weekData(p.sa);
  const tp = [[0, 15], [15, 29], [29, 41]].map(([a, b]) => Math.max(0, Math.min(1, (p.days / 7 - a) / (b - a))));
  const before = p.days < 0;
  return `<section class="hero" data-act="hero" role="button" tabindex="0" aria-label="Voir le détail de la semaine">
    <div class="mesh"></div>
    <div class="hero-in">
      <div class="flower">${flowerSVG(p.pct)}<div class="core"><div class="fruit">${w[1]}</div></div></div>
      <div>
        <div class="eyebrow">${before ? "Bientôt" : p.trim + ord(p.trim) + " trimestre · " + Math.round(p.pct * 100) + " %"}</div>
        <div class="big"><span data-count="${Math.max(0, p.sa)}">${Math.max(0, p.sa)}</span><small>SA</small> <small>+ ${p.j} j</small></div>
        <p class="sub">Bébé a la taille d'${esc(w[2])}.</p>
        <div class="chips">
          <span class="chip">${p.mois}${ord(p.mois)} mois</span>
          <span class="chip">${p.left > 0 ? "J − " + p.left : p.left === 0 ? "C'est le jour J" : "Terme + " + (-p.left) + " j"}</span>
          <span class="chip">Terme ${fmtShort(p.terme)}</span>
        </div>
      </div>
    </div>
    <div class="stats">
      <div><span>Taille</span><b>${fmtSize(w[3])}</b></div>
      <div><span>Poids</span><b>${fmtWeight(w[4])}</b></div>
      <div><span>Il reste</span><b>${Math.max(0, Math.ceil(p.left / 7))} sem.</b></div>
    </div>
    <div class="trim">${tp.map(f => `<i><b style="width:${f * 100}%"></b></i>`).join("")}</div>
    <div class="trimlbl"><span>T1 · 0–14 SA</span><span>T2 · 15–28</span><span>T3 · 29–41</span></div>
    <svg class="waves" viewBox="0 0 400 54" preserveAspectRatio="none" aria-hidden="true">
      <path d="M-40 30 C40 10 80 50 160 30 C240 10 280 50 360 30 C400 20 420 25 460 30 L460 60 L-40 60Z" fill="rgba(255,255,255,.35)"/>
      <path d="M-40 38 C30 22 90 54 170 38 C250 22 300 54 380 38 C410 32 430 34 460 38 L460 60 L-40 60Z" fill="rgba(255,255,255,.5)"/>
    </svg>
  </section>`;
}
function setupHTML(){
  return `<section class="hero"><div class="mesh"></div><div class="hero-in" style="grid-template-columns:minmax(0,1fr)">
    <div class="flower" style="margin:0 auto">${flowerSVG(.3)}</div>
    <div class="stack" style="text-align:center">
      <h2 style="font-size:32px">Bienvenue ${esc(mamanName())} 💜</h2>
      <p class="sub">Indique la date de tes dernières règles ou la date de terme donnée à l'échographie. L'appli calcule tout le reste.</p>
      <form id="quickSetup" class="row" style="align-items:flex-end;text-align:left">
        <label class="f" style="color:#4A3F6E">Je connais<select id="qsMode"><option value="ddr">la date des dernières règles</option><option value="terme">la date de terme</option></select></label>
        <label class="f" style="color:#4A3F6E">Date<input type="date" id="qsDate" required></label>
        <button class="btn" type="submit">C'est parti</button>
      </form>
    </div></div>
    <svg class="waves" viewBox="0 0 400 54" preserveAspectRatio="none" aria-hidden="true"><path d="M-40 38 C30 22 90 54 170 38 C250 22 300 54 380 38 C410 32 430 34 460 38 L460 60 L-40 60Z" fill="rgba(255,255,255,.5)"/></svg>
  </section>`;
}
function dateBox(iso){ const d = parseD(iso); return `<div class="datebox"><b>${d.getDate()}</b><span>${d.toLocaleDateString("fr-FR", {month:"short"}).replace(".", "")}</span></div>`; }
function nextRdv(){
  const t = today();
  return values("rdv").filter(r => !r.fait && r.date && parseD(r.date) >= t).sort((a, b) => a.date.localeCompare(b.date) || (a.heure || "").localeCompare(b.heure || ""))[0];
}
function topNames(){ return values("prenoms").filter(n => n.elle || n.lui).sort((a, b) => (+!!b.elle + +!!b.lui) - (+!!a.elle + +!!a.lui) || a.prenom.localeCompare(b.prenom, "fr")); }
const sexLbl = s => s === "X" ? "F/G" : s === "F" ? "F" : "G";

function vAccueil(){
  const p = preg();
  let h = (window.GMX && GMX.homeTop ? GMX.homeTop(p) : "") + (p ? heroHTML(p) : setupHTML());
  if (window.GMX && GMX.homeAfterHero) h += GMX.homeAfterHero(p);
  if (p){
    const w = weekData(p.sa);
    h += `<div class="duo">
      <div class="card"><h3><span class="dot"></span>Bébé cette semaine</h3><p>${esc(w[5])}</p></div>
      <div class="card"><h3><span class="dot mint"></span>${esc(mamanName())} cette semaine</h3><p>${esc(w[6])}</p></div></div>`;
  }
  const next = nextRdv(), favs = topNames().slice(0, 3);
  h += `<div class="grid2">
    <div class="card stack">
      <div class="row"><span class="eyebrow">Prochain rendez-vous</span><span class="spacer"></span><button class="btn small ghost" data-go="rdv">Agenda</button></div>
      ${next ? `<div class="item" style="padding:0">${dateBox(next.date)}<div class="body"><div class="title">${esc(next.titre)}</div>
        <div class="muted" style="font-size:13.5px">${esc(fmtMid(parseD(next.date)))}${next.heure ? " · " + esc(next.heure) : ""}${next.lieu ? " · " + esc(next.lieu) : ""}</div>
        <div style="margin-top:6px"><span class="pill ${esc(next.type)}">${esc(TYPES[next.type] || "Autre")}</span> <span class="muted" style="font-size:12.5px">${diffDays(parseD(next.date), today()) === 0 ? "aujourd'hui" : "dans " + diffDays(parseD(next.date), today()) + " j"}</span></div></div></div>`
        : `<p class="muted">Aucun rendez-vous à venir.${p ? " Génère le suivi type en un geste dans l'agenda." : ""}</p>`}
    </div>
    <div class="card stack">
      <div class="row"><span class="eyebrow">Prénoms coups de cœur</span><span class="spacer"></span><button class="btn small ghost" data-go="prenoms">Tous</button></div>
      ${favs.length ? favs.map(n => `<div class="row"><span class="sex ${esc(n.sexe)}">${sexLbl(n.sexe)}</span><span style="font-family:var(--f-display);font-size:23px">${esc(n.prenom)}</span><span class="spacer"></span><span style="color:var(--rose);font-size:13px;font-weight:600">${n.elle && n.lui ? "♥ ♥" : "♥"}</span></div>`).join("")
        : `<p class="muted">Ajoutez les prénoms que vous aimez : chacun met son cœur.</p>`}
    </div></div>
  ${p ? `<button class="card tile b3d-tile" data-act="open3d" style="width:100%">
    <span class="ico" style="background:rgba(255,255,255,.12)">${weekData(p.sa)[1]}</span>
    <div style="min-width:0"><h3>Voir bébé en 3D</h3><p>Une illustration de bébé à ${Math.max(4, Math.min(41, p.sa))} SA, à faire tourner du bout du doigt.</p></div></button>` : ""}
  ${window.GMX && GMX.homeCards ? GMX.homeCards(p) : ""}
  <button class="card tile" data-go="ia" style="width:100%;border-color:transparent;background:linear-gradient(135deg,var(--lav-soft),var(--mint-soft))">
    <div class="orb" aria-hidden="true"></div>
    <div style="min-width:0"><h3>Une question ? Demande à l'assistante</h3><p>« Est-ce que je peux manger du saumon fumé ? », « Pourquoi j'ai des crampes ? »…</p></div></button>
  <div class="grid2">
    <button class="card tile" data-go="guide" data-sub="assiette"><span class="ico">🥗</span><div><h3>Je peux manger… ?</h3><p>${FOOD.length} aliments classés</p></div></button>
    <button class="card tile m" data-go="guide" data-sub="outils"><span class="ico">⏱️</span><div><h3>Contractions & mouvements</h3><p>Chrono et compteur</p></div></button>
    <button class="card tile r" data-go="guide" data-sub="valise"><span class="ico">🧳</span><div><h3>Valise maternité</h3><p>${valiseStats().done} sur ${valiseStats().total} prêts</p></div></button>
    <button class="card tile a" data-go="guide" data-sub="journal"><span class="ico">📔</span><div><h3>Journal</h3><p>Humeur, poids, souvenirs</p></div></button>
    ${Install.evt || !isStandalone() ? `<button class="card tile m" data-act="install"><span class="ico">📲</span><div><h3>Installer l'appli</h3><p>Sur l'écran d'accueil du téléphone</p></div></button>` : ""}
  </div>`;
  return h;
}

/* ---------- agenda ---------- */
function gcalLink(r){
  const d = r.date.replace(/-/g, "");
  let dates;
  if (r.heure){ const t = r.heure.replace(":", "") + "00"; const end = new Date(parseD(r.date).getTime()); const [hh, mm] = r.heure.split(":").map(Number); end.setHours(hh + 1, mm);
    dates = d + "T" + t + "/" + fmtISO(end).replace(/-/g, "") + "T" + String(end.getHours()).padStart(2, "0") + String(end.getMinutes()).padStart(2, "0") + "00"; }
  else dates = d + "/" + fmtISO(addDays(parseD(r.date), 1)).replace(/-/g, "");
  const q = new URLSearchParams({action:"TEMPLATE", text:r.titre, dates, details:r.notes || "", location:r.lieu || ""});
  return "https://calendar.google.com/calendar/render?" + q.toString();
}
function vRdv(){
  const t = today();
  const items = values("rdv").filter(r => r.date).sort((a, b) => a.date.localeCompare(b.date) || (a.heure || "").localeCompare(b.heure || ""));
  const up = items.filter(r => parseD(r.date) >= t && !r.fait), past = items.filter(r => parseD(r.date) < t || r.fait);
  const row = r => `<div class="item ${r.fait ? "done" : ""}">
    <button class="check ${r.fait ? "on" : ""}" data-rdvdone="${esc(r.id)}" aria-label="Marquer comme fait"></button>
    ${dateBox(r.date)}
    <div class="body"><div class="title">${esc(r.titre)}</div>
      <div class="muted" style="font-size:13.5px">${esc(fmtMid(parseD(r.date)))}${r.heure ? " · " + esc(r.heure) : ""}${r.lieu ? " · " + esc(r.lieu) : ""}</div>
      ${r.notes ? `<div style="font-size:13.5px;margin-top:2px">${esc(r.notes)}</div>` : ""}
      <div style="margin-top:7px" class="row"><span class="pill ${esc(r.type)}">${esc(TYPES[r.type] || "Autre")}</span>${r.suggere ? `<span class="pill">Date indicative</span>` : ""}
      ${!r.fait ? `<a class="pill" href="${esc(gcalLink(r))}" target="_blank" rel="noopener">+ Google Agenda</a>` : ""}</div></div>
    <button class="x" data-rdvdel="${esc(r.id)}" aria-label="Supprimer">×</button></div>`;
  const p = preg();
  return `<div class="sectionhead"><h2>Agenda</h2><span class="spacer"></span>${p ? `<button class="btn small mint" data-act="genplan">✨ Suivi type</button>` : ""}
    <p class="muted">Consultations, échographies, analyses et démarches. ${p ? "« Suivi type » ajoute les étapes françaises avec des dates indicatives à ajuster." : "Renseigne une date dans les réglages pour générer le suivi type."}</p></div>
  <div class="row"><button class="btn small ghost" data-gt-go="questions">❓ Questions à poser (${values("questions").filter(q => !q.faite).length})</button><button class="btn small ghost" data-gt-go="vitamines">🔔 Rappels sur le téléphone</button></div>
  <form class="card stack" id="rdvForm">
    <h3>Nouveau rendez-vous</h3>
    <label class="f">Intitulé<input type="text" id="rdvTitre" required maxlength="120" placeholder="Échographie du 2e trimestre"></label>
    <div class="row"><label class="f">Date<input type="date" id="rdvDate" required></label><label class="f">Heure<input type="time" id="rdvHeure"></label>
      <label class="f">Type<select id="rdvType">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label></div>
    <div class="row"><label class="f">Lieu<input type="text" id="rdvLieu" maxlength="120" placeholder="Maternité, cabinet…"></label><label class="f">Notes<input type="text" id="rdvNotes" maxlength="300" placeholder="À jeun, apporter le dossier…"></label></div>
    <div class="row"><button class="btn" type="submit">Ajouter</button></div>
  </form>
  <section class="card"><div class="row"><h3>À venir</h3><span class="spacer"></span><span class="mono muted">${up.length}</span></div>
    <div class="list" style="margin-top:6px">${up.length ? up.map(row).join("") : `<p class="muted" style="padding-block:10px">Rien de prévu pour l'instant.</p>`}</div></section>
  ${past.length ? `<section class="card"><div class="row"><h3>Passés ou faits</h3><span class="spacer"></span><span class="mono muted">${past.length}</span></div><div class="list" style="margin-top:6px">${past.reverse().map(row).join("")}</div></section>` : ""}`;
}

/* ---------- prénoms ---------- */
function vPrenoms(){
  const f = UI.nameSex, nom = S.profil.nom ? " " + S.profil.nom.toUpperCase() : "";
  const all = values("prenoms");
  const items = all.filter(n => f === "all" || (f === "fav" ? (n.elle && n.lui) : n.sexe === f))
    .sort((a, b) => (+!!b.elle + +!!b.lui) - (+!!a.elle + +!!a.lui) || a.prenom.localeCompare(b.prenom, "fr"));
  const have = new Set(all.map(n => n.prenom.toLowerCase()));
  const sugSex = (f === "F" || f === "M" || f === "X") ? f : (S.profil.sexe || "F");
  const sugg = (SUGG[sugSex] || SUGG.F).filter(n => !have.has(n.toLowerCase()));
  const common = all.filter(n => n.elle && n.lui);
  const heart = `<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`;
  return `<div class="sectionhead"><h2>Prénoms</h2><p class="muted">Chacun met son cœur ; ceux que vous aimez tous les deux remontent en haut.${S.profil.nom ? "" : " Ajoute votre nom de famille dans les réglages pour voir le prénom en entier."}</p></div>
  <form class="card stack" id="nameForm">
    <div class="row" style="align-items:flex-end">
      <label class="f" style="flex:2 1 170px">Prénom<input type="text" id="nameIn" required placeholder="Ex. Alma" maxlength="40"></label>
      <label class="f">Pour<select id="nameSex"><option value="F">une fille</option><option value="M">un garçon</option><option value="X">les deux</option></select></label>
      <button class="btn" type="submit">Ajouter</button></div>
    <div><div class="eyebrow" style="margin-bottom:8px">Idées ${sugSex === "F" ? "pour une fille" : sugSex === "M" ? "pour un garçon" : "mixtes"}</div>
      <div class="sugg">${sugg.slice(0, 14).map(n => `<button type="button" data-sugg="${esc(n)}" data-sx="${sugSex}">+ ${esc(n)}</button>`).join("")}</div>
      <button type="button" class="btn small ghost" data-act="aiNames" style="margin-top:10px">✨ Demander d'autres idées à l'assistante</button></div>
  </form>
  <button class="card tile duel-tile" data-gt-go="duel" style="width:100%"><span class="ico">💞</span><div style="min-width:0"><h3>Duel de prénoms</h3><p>Chacun swipe de son côté : quand vous aimez le même, c'est un match !</p></div></button>
  <div class="seg">${[["all", "Tous"], ["fav", "Coups de cœur communs"], ["F", "Fille"], ["M", "Garçon"], ["X", "Mixte"]].map(([k, l]) => `<button data-namef="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
  <section class="card"><div class="list">${items.length ? items.map(n => `<div class="namecard">
      <span class="sex ${esc(n.sexe)}">${sexLbl(n.sexe)}</span>
      <div class="who"><div class="nm">${esc(n.prenom)}</div>${nom ? `<div class="full">${esc(n.prenom + nom)}</div>` : ""}</div>
      <button class="x" data-namedel="${esc(n.id)}" aria-label="Supprimer ${esc(n.prenom)}">×</button>
      <div class="hearts"><button class="heart ${n.elle ? "on" : ""}" data-heart="elle" data-id="${esc(n.id)}" aria-pressed="${!!n.elle}">${heart}${esc(mamanName())}</button>
      <button class="heart ${n.lui ? "on" : ""}" data-heart="lui" data-id="${esc(n.id)}" aria-pressed="${!!n.lui}">${heart}${esc(papaName())}</button></div></div>`).join("")
    : `<p class="muted" style="padding-block:10px">${f === "fav" ? "Pas encore de prénom aimé par vous deux." : "Aucun prénom ici pour l'instant. Ajoutez-en un ou piochez dans les idées."}</p>`}</div></section>
  ${common.length >= 2 ? `<section class="card stack"><span class="eyebrow">Vous hésitez ?</span><div class="duel" id="duel">${esc(UI.tirage || "…")}</div><button class="btn" data-act="tirage">Tirer au sort parmi vos coups de cœur communs</button></section>` : ""}`;
}

/* ---------- assistante IA ---------- */
let chat = Array.isArray(lsGet("chat")) ? lsGet("chat") : [];
let aiBusy = false;
const AI_SUGG = ["Est-ce que je peux manger du saumon fumé ?", "Que se passe-t-il pour bébé cette semaine ?", "Comment soulager les nausées ?", "Des idées de prénoms doux et rares ?", "Que mettre dans la valise de maternité ?", "Quels exercices pour le dos ?"];
function md(t){
  const lines = esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>").split("\n");
  let out = "", inList = false, para = [];
  const flush = () => { if (para.length){ out += "<p>" + para.join("<br>") + "</p>"; para = []; } };
  for (const l of lines){
    const m = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)/);
    if (m){ flush(); if (!inList){ out += "<ul>"; inList = true; } out += "<li>" + m[1] + "</li>"; continue; }
    if (inList){ out += "</ul>"; inList = false; }
    if (!l.trim()) flush(); else para.push(l.replace(/^#+\s*/, ""));
  }
  flush(); if (inList) out += "</ul>";
  return out;
}
function vIA(){
  const ready = !!CFG.assistantUrl && CLOUD && !!Cloud.user && (Cloud.state === "on" || Cloud.state === "refused");
  const msgs = chat.map(m => `<div class="msg ${m.role === "user" ? "me" : "ai"}${m.err ? " err" : ""}">${m.role === "user" ? esc(m.text).replace(/\n/g, "<br>") : md(m.text)}</div>`).join("");
  return `<div class="card aihead"><div class="orb" aria-hidden="true"></div><div style="min-width:0;flex:1"><h2 style="font-size:26px">L'assistante</h2>
    <p class="muted" style="font-size:13.5px">Elle connaît ta semaine de grossesse et répond selon les recommandations françaises. Elle ne remplace pas la sage-femme.</p></div>
    ${chat.length ? `<button class="btn small ghost" data-act="clearchat">Effacer</button>` : ""}</div>
  ${ready ? "" : `<div class="banner">${!CFG.assistantUrl || !CLOUD ? "L'assistante n'est pas encore branchée : il faut d'abord configurer Firebase et le serveur Cloudflare (voir INSTALLATION.md)." : "Connecte-toi pour utiliser l'assistante."}</div>`}
  <div class="chat" id="chat">
    ${msgs || `<div class="msg ai"><p>Coucou ${esc(mamanName())} 💜 Pose-moi tes questions sur la grossesse, l'alimentation, les petits maux, les démarches ou les prénoms.</p></div>`}
    ${aiBusy ? `<div class="msg ai"><span class="typing"><i></i><i></i><i></i></span></div>` : ""}
  </div>
  <form class="composer" id="aiForm"><textarea id="aiIn" rows="1" placeholder="Écris ta question…" maxlength="2000" ${ready ? "" : "disabled"}></textarea>
    <button class="btn" type="submit" aria-label="Envoyer" ${ready && !aiBusy ? "" : "disabled"}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>
  ${!chat.length ? `<div class="sugg">${AI_SUGG.map(q => `<button data-ask="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : ""}`;
}
function aiContext(){
  const p = preg();
  return {maman: mamanName(), partenaire: S.profil.papa || "", sa: p ? p.sa : null, jours: p ? p.j : null, trimestre: p ? p.trim : null,
    terme: p ? fmtISO(p.terme) : null, sexe: S.profil.sexe || "", nomFamille: S.profil.nom || "",
    prenomsAimes: topNames().slice(0, 8).map(n => n.prenom), prenomsListe: values("prenoms").map(n => n.prenom).slice(0, 40)};
}
async function ask(text){
  text = (text || "").trim(); if (!text || aiBusy) return;
  if (!CFG.assistantUrl || !CLOUD || !Cloud.user){ toast("L'assistante n'est pas encore branchée."); return; }
  chat.push({role:"user", text}); aiBusy = true; lsSet("chat", chat); render();
  try{
    const headers = {"Content-Type":"application/json"};
    if (CLOUD && Cloud.user) headers.Authorization = "Bearer " + await Cloud.user.getIdToken();
    const res = await fetch(CFG.assistantUrl, {method:"POST", headers, body: JSON.stringify({messages: chat.filter(m => !m.err).slice(-12).map(m => ({role:m.role, text:m.text})), context: aiContext()})});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ("Erreur " + res.status));
    chat.push({role:"model", text: data.text || "Je n'ai pas de réponse, reformule ta question ?"});
  }catch(e){
    chat.push({role:"model", err:true, text: navigator.onLine === false ? "Pas de réseau : l'assistante a besoin d'internet." : String(e.message || e)});
  }
  aiBusy = false; chat = chat.slice(-40); lsSet("chat", chat);
  if (UI.tab === "ia") render();
}

/* ---------- guide ---------- */
function valiseStats(){
  let total = 0, done = 0;
  VALISE.forEach(c => c.items.forEach((it, i) => { total++; if (S.valise.checked && S.valise.checked[c.id + i]) done++; }));
  Object.values(S.valise.custom || {}).forEach(c => { total++; if (c.ok) done++; });
  return {total, done};
}
const HUB = [
  ["Grossesse", [["semaines", "📅", "Semaine par semaine"], ["compte", "⏳", "Compte à rebours"], ["tutos", "📖", "Tutos"], ["assiette", "🥗", "Je peux manger… ?"]]],
  ["Souvenirs", [["album", "📸", "Album du ventre"], ["echos", "🩻", "Échographies"], ["lettres", "💌", "Lettres à bébé"], ["fairepart", "🎀", "Faire-part"]]],
  ["À deux", [["duel", "💞", "Duel de prénoms"], ["papa", "👨", "Espace papa"], ["achats", "🛒", "Liste & budget"]]],
  ["Au quotidien", [["symptomes", "🌡️", "Symptômes"], ["questions", "❓", "Questions sage-femme"], ["vitamines", "💊", "Vitamines & rappels"], ["journal", "📔", "Journal & poids"]]],
  ["Préparer l'arrivée", [["urgence", "🚨", "C'est le moment !"], ["valise", "🧳", "Valise maternité"], ["outils", "⏱️", "Contractions & mouvements"]]]
];
function vHub(){
  return `<div class="sectionhead"><h2>Guide & outils</h2></div>` + HUB.map(([t, items]) => `<section class="stack" style="gap:10px"><div class="eyebrow">${t}</div>
    <div class="hubgrid">${items.map(([k, ic, l]) => `<button class="card hubtile" data-gt="${k}"><span>${ic}</span><b>${l}</b></button>`).join("")}</div></section>`).join("");
}
function vGuide(){
  const g = UI.guideTab;
  if (!g || g === "hub") return vHub();
  const all = Object.assign({semaines:gSemaines, assiette:gAssiette, tutos:gTutos, outils:gOutils, valise:gValise, journal:gJournal}, window.GMX ? GMX.views : {});
  const fn = all[g] || gSemaines;
  return `<button class="btn small ghost backhub" data-gt="hub">← Guide & outils</button>` + fn();
}
function gSemaines(){
  const p = preg(), cur = p ? Math.max(4, Math.min(41, p.sa)) : null;
  const sel = UI.week || cur || 12, w = weekData(sel), d0 = ddr();
  const range = d0 ? `Du ${addDays(d0, sel * 7).toLocaleDateString("fr-FR", {day:"numeric", month:"long"})} au ${addDays(d0, sel * 7 + 6).toLocaleDateString("fr-FR", {day:"numeric", month:"long"})}` : "";
  return `<div class="sectionhead"><h2>Semaine par semaine</h2><p class="muted">En semaines d'aménorrhée (SA), comme en France : on compte depuis le 1er jour des dernières règles.</p></div>
  <div class="weeks" role="group" aria-label="Choisir une semaine">${WEEKS.map(x => `<button class="wk ${x[0] === cur ? "now" : ""}" data-week="${x[0]}" aria-pressed="${x[0] === sel}"><b>${x[0]}</b><span>${x[0] === cur ? "MAINT." : "SA"}</span></button>`).join("")}</div>
  <section class="card">
    <div class="wkhead"><div class="emo">${w[1]}</div><div style="min-width:0">
      <div class="eyebrow">${sel} SA · ${sel < 15 ? "1er" : sel < 29 ? "2e" : "3e"} trimestre</div>
      <h2 style="margin-top:4px">${esc(w[2].replace(/^une? /, "").replace(/^./, c => c.toUpperCase()))}</h2>
      ${range ? `<p class="muted" style="font-size:13.5px">${range}</p>` : ""}</div></div>
    <div class="facts"><div><span>Taille</span><b>${fmtSize(w[3])}</b></div><div><span>Poids</span><b>${fmtWeight(w[4])}</b></div><div><span>Mois</span><b>${Math.max(1, Math.min(9, Math.floor((sel * 7 - 14) / 30.44) + 1))}</b></div></div>
  </section>
  <div class="duo"><div class="card"><h3><span class="dot"></span>Bébé</h3><p>${esc(w[5])}</p></div><div class="card"><h3><span class="dot mint"></span>${esc(mamanName())}</h3><p>${esc(w[6])}</p></div></div>
  <button class="btn" data-act="open3d" data-sa="${sel}" style="width:100%">Voir bébé à ${sel} SA en 3D</button>
  <p class="muted" style="font-size:12.5px">Jusqu'à 19 SA la taille est mesurée de la tête aux fesses, ensuite de la tête aux pieds. Chaque bébé grandit à son rythme.</p>`;
}
function gAssiette(){
  return `<div class="sectionhead"><h2>Dans l'assiette</h2><p class="muted">Deux risques principaux : la listériose (pour toutes) et la toxoplasmose (si tu n'es pas immunisée : ta prise de sang le dit).</p></div>
  <div class="card stack">
    <label class="f">Est-ce que je peux manger…<input type="search" id="foodQ" placeholder="sushi, comté, café, mayonnaise…" value="${esc(UI.foodQ)}"></label>
    <div class="seg">${[["all", "Tout"], ["non", "À éviter"], ["att", "Avec modération"], ["ok", "Bons choix"]].map(([k, l]) => `<button data-foodf="${k}" aria-pressed="${UI.foodCat === k}">${l}</button>`).join("")}</div></div>
  <section class="card"><div class="list" id="foodList">${foodList()}</div></section>
  <section class="card stack"><h3>Les bons réflexes en cuisine</h3>
    <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">
      <li>Cuire viandes et poissons à cœur.</li><li>Laver fruits, légumes et herbes aromatiques à grande eau.</li>
      <li>Se laver les mains après avoir touché de la viande crue, de la terre ou des légumes non lavés.</li>
      <li>Nettoyer le réfrigérateur 2 fois par mois, le régler à 4 °C maximum.</li>
      <li>Consommer les restes rapidement, bien réchauffés.</li><li>Séparer aliments crus et cuits dans le frigo.</li></ul></section>`;
}
function foodList(){
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const q = norm(UI.foodQ.trim());
  const rows = FOOD.filter(f => (UI.foodCat === "all" || f[0] === UI.foodCat) && (!q || norm(f[1] + " " + f[2] + " " + f[3]).includes(q)));
  const lbl = {non:"À éviter", att:"Modération", ok:"Oui"}, ic = {non:"✕", att:"!", ok:"✓"};
  if (!rows.length) return `<div class="stack" style="padding-block:10px"><p class="muted">Rien trouvé pour « ${esc(UI.foodQ)} ».</p>${CFG.assistantUrl ? `<button class="btn small ghost" data-ask="Est-ce que je peux manger ${esc(UI.foodQ)} enceinte ?">✨ Demander à l'assistante</button>` : ""}</div>`;
  return rows.map(f => `<div class="foodrow"><div class="ic ${f[0]}" aria-hidden="true">${ic[f[0]]}</div>
    <div style="flex:1;min-width:0"><div class="row" style="gap:8px"><b>${esc(f[1])}</b><span class="pill ${f[0]}">${lbl[f[0]]}</span></div>
    <div class="muted" style="font-size:13.5px">${esc(f[2])}</div>
    <div style="font-size:13.5px;margin-top:4px"><span class="tag">${esc(f[3])}</span>${esc(f[4])}</div></div></div>`).join("");
}
function gTutos(){
  return `<div class="sectionhead"><h2>Le guide</h2><p class="muted">L'essentiel, sans jargon.</p></div>
  <div class="stack">${GUIDES.map((x, i) => `<details class="g ${x.alert ? "alert" : ""}" ${x.alert ? "open" : ""}><summary><span class="gnum">${String(i + 1).padStart(2, "0")}</span><h3>${esc(x.t)}</h3></summary><div class="gbody">${x.b}</div></details>`).join("")}</div>`;
}
const Tools = {c: Object.assign({start:null, list:[]}, lsGet("contr") || {}), k: Object.assign({n:0, start:null}, lsGet("kicks") || {})};
const mmss = ms => { const s = Math.round(ms / 1000); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
function contrSummary(){
  const l = Tools.c.list;
  if (!l.length) return "Appuie au début de chaque contraction, puis à la fin. L'appli calcule la durée et l'écart.";
  const recent = l.filter(r => Date.now() - r.s < 3600000), gaps = recent.map(r => r.gap).filter(Boolean);
  if (gaps.length < 2) return `${l.length} contraction${l.length > 1 ? "s" : ""} notée${l.length > 1 ? "s" : ""}.`;
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length, avgD = recent.reduce((a, r) => a + r.d, 0) / recent.length;
  let s = `Sur la dernière heure : ${recent.length} contractions, écart moyen ${mmss(avgGap)}, durée moyenne ${mmss(avgD)}.`;
  if (avgGap <= 5 * 60000 && recent.length >= 6) s += " Elles sont rapprochées : appelle la maternité.";
  return s;
}
function gOutils(){
  const c = Tools.c, k = Tools.k, last = c.list.slice(-8).reverse();
  return `<section class="card stack"><div class="row"><h3>Chrono contractions</h3><span class="spacer"></span>${c.list.length ? `<button class="btn small ghost" data-act="cReset">Effacer</button>` : ""}</div>
    <div class="timer" id="cTimer">${c.start ? "00:00" : "—"}</div>
    <button class="bigtap ${c.start ? "stop" : ""}" data-act="cBtn">${c.start ? "Fin de la contraction" : "Début d'une contraction"}</button>
    <p class="muted" style="font-size:13.5px">${contrSummary()}</p>
    ${last.length ? `<div style="overflow-x:auto"><table class="t"><thead><tr><th>Heure</th><th>Durée</th><th>Écart</th></tr></thead><tbody>${last.map(r => `<tr><td>${new Date(r.s).toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"})}</td><td>${mmss(r.d)}</td><td>${r.gap ? mmss(r.gap) : "—"}</td></tr>`).join("")}</tbody></table></div>` : ""}
  </section>
  <section class="card stack"><div class="row"><h3>Compteur de mouvements</h3><span class="spacer"></span>${k.n ? `<button class="btn small ghost" data-act="kReset">Recommencer</button>` : ""}</div>
    <div class="timer">${k.n}<span class="muted" style="font-size:20px"> / 10</span></div>
    <div class="progressbar"><b style="width:${Math.min(100, k.n * 10)}%"></b></div>
    <button class="bigtap" data-act="kBtn">Il a bougé 👣</button>
    <p class="muted" style="font-size:13.5px">${k.start ? "Commencé à " + new Date(k.start).toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"}) + ". " : ""}Au 3e trimestre, installe-toi au calme, allongée sur le côté. Si bébé bouge nettement moins que d'habitude, appelle la maternité.</p>
  </section>`;
}
let timerInt = null;
function tick(){
  clearInterval(timerInt);
  if (!Tools.c.start) return;
  const upd = () => { const e = $("#cTimer"); if (!e || !Tools.c.start){ clearInterval(timerInt); return; } e.textContent = mmss(Date.now() - Tools.c.start); };
  upd(); timerInt = setInterval(upd, 500);
}
function gValise(){
  const st = valiseStats(), ck = S.valise.checked || {};
  return `<div class="sectionhead"><h2>Valise maternité</h2><p class="muted">À boucler vers 34–36 SA. Chaque maternité a sa liste, demande-la.</p></div>
  <div class="card stack"><div class="row"><b>${st.done} / ${st.total} prêts</b><span class="spacer"></span><span class="mono muted">${Math.round(st.done / Math.max(1, st.total) * 100)} %</span></div><div class="progressbar"><b style="width:${st.done / Math.max(1, st.total) * 100}%"></b></div></div>
  ${VALISE.map(c => `<section class="card"><h3 style="margin-bottom:4px">${esc(c.t.replace("{maman}", mamanName()))}</h3><div class="list">${c.items.map((it, i) => { const key = c.id + i, on = !!ck[key];
    return `<div class="item ${on ? "done" : ""}" style="align-items:center"><button class="check ${on ? "on" : ""}" data-val="${key}" aria-label="${esc(it)}"></button><div class="body title" style="font-weight:500">${esc(it)}</div></div>`; }).join("")}</div></section>`).join("")}
  <section class="card"><h3 style="margin-bottom:4px">Vos ajouts</h3><div class="list">${Object.entries(S.valise.custom || {}).sort((a, b) => (a[1].at || 0) - (b[1].at || 0)).map(([id, c]) => `<div class="item ${c.ok ? "done" : ""}" style="align-items:center"><button class="check ${c.ok ? "on" : ""}" data-valc="${esc(id)}" aria-label="${esc(c.t)}"></button><div class="body title" style="font-weight:500">${esc(c.t)}</div><button class="x" data-valdel="${esc(id)}" aria-label="Supprimer">×</button></div>`).join("")}</div>
    <form id="valForm" class="row" style="margin-top:10px"><input type="text" id="valIn" placeholder="Ajouter un objet" required maxlength="80" style="flex:1"><button class="btn" type="submit">Ajouter</button></form></section>`;
}
function saAt(iso){ const d0 = ddr(); if (!d0) return ""; const n = diffDays(parseD(iso), d0); return n >= 0 ? ` <span class="pill">${Math.floor(n / 7)} SA</span>` : ""; }
function gJournal(){
  const items = values("journal").filter(j => j.date).sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="sectionhead"><h2>Journal</h2><p class="muted">Poids, humeur, petits moments à ne pas oublier.</p></div>
  <form class="card stack" id="jForm">
    <div class="row"><label class="f">Date<input type="date" id="jDate" value="${fmtISO(today())}" required></label><label class="f">Poids (kg)<input type="number" id="jPoids" step="0.1" min="30" max="200" placeholder="64,5"></label></div>
    <div><div class="eyebrow" style="margin-bottom:6px">Humeur</div><div class="mood">${MOODS.map((m, i) => `<button type="button" data-mood="${i}" aria-pressed="${UI.mood === i}" aria-label="Humeur ${i + 1} sur 5">${m}</button>`).join("")}</div></div>
    <label class="f">Note<textarea id="jNote" maxlength="2000" placeholder="Premier coup de pied ressenti pendant le dîner…"></textarea></label>
    <div class="row"><button class="btn" type="submit">Enregistrer</button></div></form>
  ${weightChart()}
  <section class="card"><div class="list">${items.length ? items.map(j => `<div class="item"><div class="datebox">${MOODS[j.mood] ? `<b style="font-family:inherit">${MOODS[j.mood]}</b>` : `<b>${parseD(j.date).getDate()}</b>`}<span>${fmtShort(parseD(j.date))}</span></div>
    <div class="body"><div class="title">${esc(fmtMid(parseD(j.date)))}${j.poids ? ` · <span class="mono">${esc(String(j.poids).replace(".", ","))} kg</span>` : ""}${saAt(j.date)}</div>${j.note ? `<p style="font-size:14.5px;white-space:pre-wrap">${esc(j.note)}</p>` : ""}${j.auteur ? `<div class="muted" style="font-size:12px;margin-top:3px">par ${esc(j.auteur)}</div>` : ""}</div>
    <button class="x" data-jdel="${esc(j.id)}" aria-label="Supprimer">×</button></div>`).join("") : `<p class="muted" style="padding-block:10px">Aucune entrée pour l'instant.</p>`}</div></section>`;
}
function weightChart(){
  const pts = values("journal").filter(j => j.poids && j.date).sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length < 2) return `<p class="muted" style="font-size:13.5px">La courbe de poids apparaît dès 2 pesées. La prise de poids conseillée dépend de ton IMC de départ : parles-en à ta sage-femme.</p>`;
  const W = 600, H = 150, pl = 40, pr = 16, pt = 14, pb = 26;
  const xs = pts.map(p => parseD(p.date).getTime()), ys = pts.map(p => +p.poids);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), yMin = Math.floor(Math.min(...ys) - 1), yMax = Math.ceil(Math.max(...ys) + 1);
  const X = t => pl + (x1 === x0 ? .5 : (t - x0) / (x1 - x0)) * (W - pl - pr), Y = v => pt + (1 - (v - yMin) / (yMax - yMin)) * (H - pt - pb);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(xs[i]).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join(" ");
  const area = line + ` L${X(xs[xs.length - 1]).toFixed(1)},${H - pb} L${X(xs[0]).toFixed(1)},${H - pb} Z`;
  const diff = ys[ys.length - 1] - ys[0];
  return `<section class="card stack"><div class="row"><h3>Courbe de poids</h3><span class="spacer"></span><span class="mono">${diff >= 0 ? "+" : ""}${diff.toLocaleString("fr-FR", {maximumFractionDigits:1})} kg</span></div>
  <svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Évolution du poids">
    <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--lav)" stop-opacity=".35"/><stop offset="1" stop-color="var(--mint)" stop-opacity=".05"/></linearGradient></defs>
    ${[yMin, (yMin + yMax) / 2, yMax].map(t => `<line x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 6}" y="${Y(t) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="DM Mono, monospace">${t.toLocaleString("fr-FR", {maximumFractionDigits:1})}</text>`).join("")}
    <path d="${area}" fill="url(#wg)"/><path d="${line}" fill="none" stroke="var(--lav)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
    <circle cx="${X(xs[xs.length - 1])}" cy="${Y(ys[ys.length - 1])}" r="5" fill="var(--mint)"/>
    <text x="${pl}" y="${H - 6}" font-size="11" fill="var(--muted)">${fmtShort(parseD(pts[0].date))}</text>
    <text x="${W - pr}" y="${H - 6}" font-size="11" fill="var(--muted)" text-anchor="end">${fmtShort(parseD(pts[pts.length - 1].date))}</text></svg></section>`;
}

/* ---------- bébé en 3D ---------- */
const B3 = {sa: null, loading: false};
function vBebe3D(){
  const p = preg();
  if (B3.sa === null) B3.sa = p ? Math.max(4, Math.min(41, p.sa)) : 20;
  return `<section class="b3d" id="b3d">
    <div class="b3d-canvas" id="b3dCanvas"></div>
    <div class="b3d-loading" id="b3dLoading"><div class="flower">${flowerSVG(.6, {core:16})}</div><p>Bébé prend forme…</p></div>
    <header class="b3d-top">
      <button class="iconbtn" data-act="back3d" aria-label="Retour"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div style="min-width:0;flex:1"><div class="eyebrow">Illustration 3D</div><h2 id="b3dTitle">Bébé à ${B3.sa} SA</h2></div>
      <button class="b3d-heart" id="b3dBpm" data-act="heart" title="Écouter le cœur (rythme moyen à ce stade)">♥ <span class="mono">${window.Bebe3D ? Bebe3D.bpmAt(B3.sa) : "–"}</span> 🔊</button>
    </header>
    <div class="b3d-panel">
      <div class="b3d-stats" id="b3dStats">${b3Stats(B3.sa)}</div>
      <div class="row" style="gap:12px;flex-wrap:nowrap">
        <span class="mono" style="font-size:12px;opacity:.8">4</span>
        <input type="range" id="b3dWeek" min="4" max="41" step="1" value="${B3.sa}" aria-label="Semaine d'aménorrhée">
        <span class="mono" style="font-size:12px;opacity:.8">41</span>
        ${p ? `<button class="btn small" data-act="b3now">Aujourd'hui</button>` : ""}
      </div>
      <p class="b3d-note">Fais glisser pour tourner autour, pince pour zoomer. Illustration artistique : ce n'est pas une image médicale.</p>
    </div>
  </section>`;
}
function b3Stats(sa){
  const w = weekData(sa), p = preg(), cur = p && Math.max(4, Math.min(41, p.sa)) === sa;
  return `<div><span>Taille</span><b>${fmtSize(w[3])}</b></div><div><span>Poids</span><b>${fmtWeight(w[4])}</b></div>
    <div class="b3d-fruit"><span>Comme ${esc(w[2])}</span><b>${w[1]}</b></div>
    <p class="b3d-txt">${cur ? "<b>Cette semaine</b> · " : ""}${esc(w[5])}</p>`;
}
function update3DInfo(){
  const sa = B3.sa; window.B3SA = sa;
  const t = $("#b3dTitle"); if (t) t.textContent = "Bébé à " + sa + " SA";
  const s = $("#b3dStats"); if (s) s.innerHTML = b3Stats(sa);
  const b = $("#b3dBpm"); if (b && window.Bebe3D) b.querySelector("span").textContent = Bebe3D.bpmAt(sa);
  if (b) b.style.setProperty("--beat", (60 / (window.Bebe3D ? Bebe3D.bpmAt(sa) : 140)).toFixed(3) + "s");
}
async function start3D(){
  if (B3.loading) return;
  B3.loading = true;
  try{
    if (!window.THREE) await loadScript("vendor/three.min.js");
    if (!window.THREE.OrbitControls) await loadScript("vendor/three-addons.js");
    if (!window.Bebe3D) await loadScript("bebe3d.js");
    const box = $("#b3dCanvas"); if (!box || UI.tab !== "bebe3d") return;
    Bebe3D.mount(box, B3.sa, {reduced: REDUCED});
    const l = $("#b3dLoading"); if (l) l.hidden = true;
    update3DInfo();
  }catch(e){
    console.warn(e);
    const l = $("#b3dLoading");
    if (l) l.innerHTML = `<p>La vue 3D n'a pas pu se charger. ${navigator.onLine === false ? "Il faut du réseau la première fois." : "Ton téléphone ne permet peut-être pas l'affichage 3D (WebGL)."}</p><button class="btn small" data-act="back3d">Retour</button>`;
  }finally{ B3.loading = false; }
}
function leave3D(){ window.B3SA = null; document.body.classList.remove("in3d"); if (window.Bebe3D && Bebe3D.isMounted()) Bebe3D.dispose(); }

/* ---------- réglages ---------- */
function applyTheme(){
  const r = document.documentElement;
  if (UI.theme === "auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", UI.theme);
  let pal = UI.palette || "lavande";
  if (pal === "sexe") pal = S.profil.sexe === "F" ? "rose" : S.profil.sexe === "M" ? "bleu" : "lavande";
  if (pal === "lavande") r.removeAttribute("data-palette"); else r.setAttribute("data-palette", pal);
}
function openSettings(){
  const p = S.profil;
  $("#sheetPanel").innerHTML = `<form id="setForm" class="stack">
    <div class="row"><h2>Réglages</h2><span class="spacer"></span><button type="button" class="iconbtn" data-act="closeSheet" aria-label="Fermer">✕</button></div>
    <div class="card stack"><h3>La grossesse</h3>
      <label class="f">Je renseigne<select id="sMode"><option value="ddr" ${p.mode !== "terme" ? "selected" : ""}>la date des dernières règles</option><option value="terme" ${p.mode === "terme" ? "selected" : ""}>la date de terme (échographie)</option></select></label>
      <label class="f">Date<input type="date" id="sDate" value="${esc(p.mode === "terme" ? p.terme : p.ddr)}"></label>
      <p class="muted" style="font-size:13px">En France, le terme est fixé à 41 SA, soit 287 jours après le début des dernières règles. Si l'échographie a corrigé la date, renseigne le terme qu'elle donne.</p>
      <label class="f">Sexe du bébé<select id="sSexe"><option value="" ${!p.sexe ? "selected" : ""}>Surprise / on ne sait pas</option><option value="F" ${p.sexe === "F" ? "selected" : ""}>Une fille</option><option value="M" ${p.sexe === "M" ? "selected" : ""}>Un garçon</option></select></label></div>
    <div class="card stack"><h3>Vous</h3>
      <div class="row"><label class="f">Maman<input type="text" id="sMaman" value="${esc(p.maman)}" maxlength="30"></label><label class="f">Partenaire<input type="text" id="sPapa" value="${esc(p.papa)}" placeholder="Prénom" maxlength="30"></label></div>
      <label class="f">Nom de famille du bébé<input type="text" id="sNom" value="${esc(p.nom)}" maxlength="40"></label>
      <label class="f">Téléphone du partenaire (pour le prévenir)<input type="tel" id="sTelPapa" value="${esc(p.telPapa || "")}" placeholder="06 12 34 56 78" maxlength="20"></label>
      ${CLOUD && Cloud.user && myRole() ? "" : `<label class="f">Sur ce téléphone, c'est…<select id="sRole"><option value="">—</option><option value="elle" ${UI.role === "elle" ? "selected" : ""}>${esc(p.maman || "Marina")}</option><option value="lui" ${UI.role === "lui" ? "selected" : ""}>${esc(p.papa || "le partenaire")}</option></select></label>`}</div>
    <div class="card stack"><h3>Maternité</h3>
      <label class="f">Nom<input type="text" id="sMatNom" value="${esc(p.matNom || "")}" placeholder="Maternité de…" maxlength="80"></label>
      <label class="f">Adresse<input type="text" id="sMatAdr" value="${esc(p.matAdr || "")}" placeholder="Adresse complète" maxlength="160"></label>
      <label class="f">Téléphone des urgences obstétricales<input type="tel" id="sMatTel" value="${esc(p.matTel || "")}" placeholder="02 97 …" maxlength="20"></label></div>
    <div class="card stack"><h3>Apparence</h3>
      <div class="seg">${[["auto", "Automatique"], ["light", "Clair"], ["dark", "Sombre"]].map(([k, l]) => `<button type="button" data-theme-set="${k}" aria-pressed="${UI.theme === k}">${l}</button>`).join("")}</div>
      <div class="eyebrow" style="margin-top:4px">Couleurs</div>
      <div class="seg">${[["lavande", "Lavande & menthe"], ["sexe", "Selon le sexe"], ["rose", "Rose"], ["bleu", "Bleu"]].map(([k, l]) => `<button type="button" data-palette-set="${k}" aria-pressed="${(UI.palette || "lavande") === k}">${l}</button>`).join("")}</div></div>
    ${CLOUD && Cloud.user ? `<div class="card row"><div style="min-width:0;flex:1"><div class="eyebrow">Compte</div><div style="overflow-wrap:anywhere">${esc(Cloud.user.email)}</div></div><button type="button" class="btn small ghost" data-act="signout">Se déconnecter</button></div>` : ""}
    <div class="row"><button class="btn" type="submit">Enregistrer</button><span class="spacer"></span>
      <span class="muted" style="font-size:12.5px">${Cloud.state === "on" ? "Données partagées entre vous deux." : "Données gardées sur ce téléphone."}</span></div>
  </form>`;
  $("#sheet").hidden = false; openSheetState();
}
const closeSheet = () => { if ($("#sheet").hidden) return; if (history.state && history.state.sheet) history.back(); else $("#sheet").hidden = true; };
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
function openInstallHelp(){
  $("#sheetPanel").innerHTML = `<div class="stack">
    <div class="row"><h2>Installer l'appli</h2><span class="spacer"></span><button type="button" class="iconbtn" data-act="closeSheet" aria-label="Fermer">✕</button></div>
    <div class="card stack"><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:10px">
      <li>Ouvre cette page dans <b>Chrome</b>, pas dans une fenêtre ouverte depuis une autre appli (s'il y a une croix ✕ en haut à gauche, touche les 3 points ⋮ puis <b>« Ouvrir dans Chrome »</b>).</li>
      <li>Touche les <b>3 points ⋮</b> en haut à droite de Chrome.</li>
      <li>Choisis <b>« Ajouter à l'écran d'accueil »</b> (ou « Installer l'application »), puis <b>Installer</b>.</li>
      <li>Si Android demande l'autorisation de créer un raccourci sur l'écran d'accueil, accepte.</li></ol>
      <p class="muted" style="font-size:13.5px">Si tu as installé un fichier APK auparavant, désinstalle-le d'abord : il peut s'ouvrir sur un écran noir.</p></div></div>`;
  $("#sheet").hidden = false; openSheetState();
}

/* ================= Effets ================= */
function burst(x, y, set = ["💜", "🌸", "✨", "💚"], n = 14){
  if (REDUCED) return;
  for (let i = 0; i < n; i++){
    const s = document.createElement("span"); s.className = "burst"; s.textContent = set[i % set.length];
    const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 90;
    s.style.left = x + "px"; s.style.top = y + "px";
    s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", Math.sin(a) * d - 40 + "px"); s.style.setProperty("--rot", (Math.random() * 360 - 180) + "deg");
    document.body.appendChild(s); setTimeout(() => s.remove(), 1000);
  }
}
const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
function ripple(e, el){
  if (REDUCED) return;
  const r = el.getBoundingClientRect(), s = document.createElement("span"), size = Math.max(r.width, r.height);
  s.className = "ripple"; s.style.width = s.style.height = size + "px";
  s.style.left = (e.clientX - r.left - size / 2) + "px"; s.style.top = (e.clientY - r.top - size / 2) + "px";
  el.appendChild(s); setTimeout(() => s.remove(), 600);
}
function sparkles(){
  const cv = $("#sparkles"); if (REDUCED || !cv.getContext) return;
  const ctx = cv.getContext("2d"); let W, H, dpr; const P = [];
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px"; };
  size(); addEventListener("resize", size);
  const cols = ["185,163,255", "127,220,194", "243,166,201", "255,255,255"];
  for (let i = 0; i < 28; i++) P.push({x:Math.random(), y:Math.random(), r:1 + Math.random() * 2.2, v:.00012 + Math.random() * .00025, p:Math.random() * 6.28, c:cols[i % cols.length]});
  const draw = t => {
    if (!document.hidden){
      ctx.clearRect(0, 0, W, H);
      for (const s of P){
        s.y -= s.v; if (s.y < -.02){ s.y = 1.02; s.x = Math.random(); }
        const a = .25 + .35 * Math.sin(t / 900 + s.p);
        ctx.beginPath(); ctx.fillStyle = `rgba(${s.c},${a})`; ctx.arc((s.x + .01 * Math.sin(t / 2000 + s.p)) * W, s.y * H, s.r * dpr, 0, 6.28); ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
function weekMilestone(){
  const p = preg(); if (!p || p.sa < 4) return;
  const last = lsGet("lastSA");
  if (last !== null && p.sa > last){
    setTimeout(() => { toast(`Nouvelle semaine : ${p.sa} SA ! Bébé a la taille d'${weekData(p.sa)[2]}.`); burst(innerWidth / 2, innerHeight / 3, ["🌸", "💜", "💚", "✨", weekData(p.sa)[1]], 24); }, 900);
  }
  lsSet("lastSA", p.sa);
}

/* ================= Installation (PWA) ================= */
const Install = {evt:null};
addEventListener("beforeinstallprompt", e => { e.preventDefault(); Install.evt = e; if (UI.tab === "accueil") requestRender(); });
addEventListener("appinstalled", () => { Install.evt = null; toast("Appli installée 🎉"); });
if ("serviceWorker" in navigator && location.protocol !== "file:") addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

/* ================= Événements ================= */
$("#tabs").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) go(b.dataset.tab); });
$("#openSettings").addEventListener("click", openSettings);
$("#sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeSheet();
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches('[data-act="hero"]')){ e.preventDefault(); go("guide", "semaines"); }
  if (e.key === "Enter" && !e.shiftKey && e.target.id === "aiIn"){ e.preventDefault(); const v = e.target.value; e.target.value = ""; ask(v); }
});

document.addEventListener("submit", e => {
  e.preventDefault();
  const id = e.target.id, val = x => (document.getElementById(x) || {}).value || "";
  const btn = e.target.querySelector('button[type="submit"]');
  if (id === "setForm"){
    const mode = val("sMode"), d = val("sDate");
    const patch = {mode, sexe: val("sSexe"), maman: val("sMaman").trim() || "Marina", papa: val("sPapa").trim(), nom: val("sNom").trim(),
      telPapa: val("sTelPapa").trim(), matNom: val("sMatNom").trim(), matAdr: val("sMatAdr").trim(), matTel: val("sMatTel").trim()};
    if (document.getElementById("sRole")){ UI.role = val("sRole"); saveUI(); }
    if (mode === "terme") patch.terme = d; else patch.ddr = d;
    setProfil(patch); applyTheme(); closeSheet(); render(); toast("Réglages enregistrés");
  } else if (id === "quickSetup"){
    const mode = val("qsMode"), d = val("qsDate"); if (!d) return;
    setProfil(mode === "terme" ? {mode, terme:d} : {mode, ddr:d});
    lsSet("lastSA", null); render(); burst(innerWidth / 2, innerHeight / 3, ["🌸", "💜", "💚", "✨"], 26); toast("C'est noté !");
  } else if (id === "rdvForm"){
    putItem("rdv", {id:uid(), titre:val("rdvTitre").trim(), date:val("rdvDate"), heure:val("rdvHeure"), type:val("rdvType"), lieu:val("rdvLieu").trim(), notes:val("rdvNotes").trim(), fait:false});
    if (btn) burst(...centerOf(btn)); render(); toast("Rendez-vous ajouté");
  } else if (id === "nameForm"){
    const n = val("nameIn").trim(); if (!n) return;
    if (values("prenoms").some(x => x.prenom.toLowerCase() === n.toLowerCase())){ toast(n + " est déjà dans la liste"); return; }
    putItem("prenoms", {id:uid(), prenom:n.charAt(0).toUpperCase() + n.slice(1), sexe:val("nameSex"), elle:false, lui:false});
    if (btn) burst(...centerOf(btn), ["💜", "💚", "✨"]); render(); toast(n + " ajouté");
  } else if (id === "valForm"){
    const t = val("valIn").trim(); if (!t) return;
    valiseSet("custom", uid(), {t, ok:false, at:Date.now()}); render();
  } else if (id === "jForm"){
    const poids = parseFloat(val("jPoids").replace(",", ".")), note = val("jNote").trim(), mood = typeof UI.mood === "number" ? UI.mood : null;
    if (!note && isNaN(poids) && mood === null){ toast("Ajoute un poids, une humeur ou une note"); return; }
    const item = {id:uid(), date:val("jDate"), poids:isNaN(poids) ? null : Math.round(poids * 10) / 10, mood, note};
    if (Cloud.user) item.auteur = (Cloud.user.displayName || "").split(" ")[0];
    putItem("journal", item); UI.mood = null; render(); toast("Entrée enregistrée");
  } else if (window.GMX && GMX.submits[id]){
    GMX.submits[id](e.target, val);
  } else if (id === "aiForm"){
    const t = val("aiIn"); ask(t);
  }
});

document.addEventListener("click", e => {
  const el = e.target.closest("button, [data-act], a"); if (!el) return;
  const d = el.dataset;
  if (el.matches(".btn, .bigtap")) ripple(e, el);
  if (d.go){ go(d.go, d.sub); return; }
  if (d.ask){ go("ia"); ask(d.ask); return; }
  if (d.week){ UI.week = +d.week; saveUI(); buzz(6); render(); return; }
  if (d.gt){ UI.week = null; go("guide", d.gt); return; }
  if (d.foodf){ UI.foodCat = d.foodf; saveUI(); render(); return; }
  if (d.namef){ UI.nameSex = d.namef; saveUI(); render(); return; }
  if (d.paletteSet){ UI.palette = d.paletteSet; saveUI(); applyTheme(); document.querySelectorAll("[data-palette-set]").forEach(b => b.setAttribute("aria-pressed", b.dataset.paletteSet === UI.palette)); return; }
  if (d.themeSet){ UI.theme = d.themeSet; saveUI(); applyTheme(); document.querySelectorAll("[data-theme-set]").forEach(b => b.setAttribute("aria-pressed", b.dataset.themeSet === UI.theme)); return; }
  if (d.mood !== undefined){ UI.mood = +d.mood; buzz(6); document.querySelectorAll("[data-mood]").forEach(b => b.setAttribute("aria-pressed", b.dataset.mood === d.mood)); return; }
  if (d.rdvdone){ const r = S.rdv[d.rdvdone]; if (r){ if (!r.fait) burst(...centerOf(el), ["✅", "💚", "✨"], 10); patchItem("rdv", r.id, {fait:!r.fait}); render(); } return; }
  if (d.rdvdel){ delItem("rdv", d.rdvdel); render(); toast("Rendez-vous supprimé"); return; }
  if (d.heart){ const n = S.prenoms[d.id]; if (n){ const on = !n[d.heart]; if (on){ burst(...centerOf(el), ["💜", "💗", "💚"], 12); buzz(15); } patchItem("prenoms", n.id, {[d.heart]:on}); render(); } return; }
  if (d.namedel){ delItem("prenoms", d.namedel); render(); return; }
  if (d.sugg){ if (!values("prenoms").some(x => x.prenom.toLowerCase() === d.sugg.toLowerCase())){ putItem("prenoms", {id:uid(), prenom:d.sugg, sexe:d.sx, elle:false, lui:false}); burst(...centerOf(el), ["✨", "💜"], 8); render(); toast(d.sugg + " ajouté"); } return; }
  if (d.val){ const on = !(S.valise.checked || {})[d.val]; if (on) burst(...centerOf(el), ["✨", "💚"], 8); valiseSet("checked", d.val, on ? true : null); render(); const st = valiseStats(); if (on && st.done === st.total) { toast("Valise bouclée ! 🎉"); burst(innerWidth / 2, innerHeight / 2, ["🎉", "💜", "💚", "🌸"], 30); } return; }
  if (d.valc){ const c = (S.valise.custom || {})[d.valc]; if (c){ valiseSet("custom", d.valc, {t:c.t, ok:!c.ok, at:c.at || 0}); render(); } return; }
  if (d.valdel){ valiseSet("custom", d.valdel, null); render(); return; }
  if (d.jdel){ delItem("journal", d.jdel); render(); return; }
  const act = d.act;
  if (!act) return;
  if (window.GMX && GMX.actions[act]){ GMX.actions[act](el, d, e); return; }
  if (act === "hero"){ go("guide", "semaines"); return; }
  if (act === "open3d"){ B3.sa = d.sa ? +d.sa : null; go("bebe3d"); return; }
  if (act === "back3d"){ history.state && history.state.tab === "bebe3d" ? history.back() : go("accueil"); return; }
  if (act === "b3now"){ const p = preg(); if (p){ B3.sa = Math.max(4, Math.min(41, p.sa)); const r = $("#b3dWeek"); if (r) r.value = B3.sa; window.Bebe3D && Bebe3D.setWeek(B3.sa); update3DInfo(); } return; }
  if (act === "signin"){ signIn(); return; }
  if (act === "signout"){ closeSheet(); Cloud.auth && Cloud.auth.signOut(); return; }
  if (act === "closeSheet"){ closeSheet(); return; }
  if (act === "install"){
    if (Install.evt){ Install.evt.prompt(); Install.evt = null; return; }
    closeSheet(); openInstallHelp(); return;
  }
  if (act === "clearchat"){ chat = []; lsSet("chat", chat); render(); return; }
  if (act === "aiNames"){ const fav = topNames().map(n => n.prenom).join(", "); go("ia"); ask(`Propose-nous 10 prénoms ${S.profil.sexe === "M" ? "de garçon" : S.profil.sexe === "F" ? "de fille" : "(filles et garçons)"} qui pourraient nous plaire${fav ? ", dans l'esprit de : " + fav : ""}, avec leur origine en quelques mots.`); return; }
  if (act === "tirage"){
    const c = values("prenoms").filter(n => n.elle && n.lui); if (!c.length) return;
    let i = 0; const box = $("#duel"); const spin = setInterval(() => { box.textContent = c[i++ % c.length].prenom; buzz(4); }, 70);
    setTimeout(() => { clearInterval(spin); UI.tirage = c[Math.floor(Math.random() * c.length)].prenom; box.textContent = UI.tirage; burst(...centerOf(box), ["💜", "💚", "🌸", "✨"], 22); }, 1400);
    return;
  }
  if (act === "cBtn"){
    const c = Tools.c; buzz(20);
    if (!c.start) c.start = Date.now();
    else { const s = c.start, prev = c.list[c.list.length - 1]; c.list.push({s, d:Date.now() - s, gap: prev ? s - prev.s : null}); c.start = null; c.list = c.list.slice(-60); }
    lsSet("contr", c); render(); return;
  }
  if (act === "cReset"){ Tools.c = {start:null, list:[]}; lsSet("contr", Tools.c); render(); return; }
  if (act === "kBtn"){ const k = Tools.k; if (!k.start) k.start = Date.now(); k.n++; buzz(12); lsSet("kicks", k); burst(...centerOf(el), ["👣", "💜"], 6); render(); if (k.n === 10) toast("10 mouvements en " + Math.round((Date.now() - k.start) / 60000) + " min"); return; }
  if (act === "kReset"){ Tools.k = {n:0, start:null}; lsSet("kicks", Tools.k); render(); return; }
  if (act === "genplan"){
    const d0 = ddr(); if (!d0) return;
    const have = new Set(values("rdv").map(r => r.titre)); let n = 0;
    for (const [sa, titre, type, notes] of RDV_PLAN){
      if (have.has(titre)) continue;
      const date = fmtISO(addDays(d0, sa * 7));
      putItem("rdv", {id:uid(), titre, date, heure:"", type, lieu:"", notes, fait: parseD(date) < today(), suggere:true}); n++;
    }
    if (n) burst(...centerOf(el), ["📅", "💜", "💚", "✨"], 20);
    render(); toast(n ? n + " étapes ajoutées" : "Le suivi type est déjà dans l'agenda");
  }
});
document.addEventListener("change", e => { if (window.GMX && GMX.onChange) GMX.onChange(e); });
document.addEventListener("input", e => {
  if (window.GMX && GMX.onInput) GMX.onInput(e);
  if (e.target.id === "b3dWeek"){ B3.sa = +e.target.value; update3DInfo(); if (window.Bebe3D && Bebe3D.isMounted()){ cancelAnimationFrame(B3.raf); B3.raf = requestAnimationFrame(() => Bebe3D.setWeek(B3.sa)); } }
  if (e.target.id === "foodQ"){ UI.foodQ = e.target.value; const l = $("#foodList"); if (l) l.innerHTML = foodList(); }
  if (e.target.id === "aiIn"){ e.target.style.height = "auto"; e.target.style.height = Math.min(140, e.target.scrollHeight) + "px"; }
});
let lastDay = fmtISO(today());
setInterval(() => { const iso = fmtISO(today()); if (iso !== lastDay){ lastDay = iso; weekMilestone(); requestRender(); } }, 60000);

/* ================= API pour les fonctionnalités d'extras.js ================= */
function myRole(){
  const em = (Cloud.user && Cloud.user.email || "").toLowerCase();
  const roles = CFG.roles || {};
  for (const k in roles) if (k.toLowerCase() === em) return roles[k];
  return UI.role || "";
}
function openSheet(html){ $("#sheetPanel").innerHTML = html; $("#sheet").hidden = false; openSheetState(); }
if (window.GMX) GMX.init({S, UI, CFG, saveUI, values, putItem, patchItem, delItem, setProfil, metaSet, render, requestRender, go, toast, burst, centerOf, buzz,
  esc, uid, clone, fmtISO, parseD, today, addDays, diffDays, fmtMid, fmtShort, preg, ddr, weekData, mamanName, papaName, flowerSVG, md,
  lsGet, lsSet, live, colRef: k => colRef(k), Cloud, myRole, openSheet, closeSheet, REDUCED, ask: t => { go("ia"); ask(t); }, gcalLink});

/* ================= Démarrage ================= */
if (UI.tab === "bebe3d") UI.tab = "accueil";
history.replaceState({tab: "accueil", sub: UI.guideTab}, "");
if (UI.tab !== "accueil") history.pushState({tab: UI.tab, sub: UI.guideTab}, "");
applyTheme();
setSync();
render();
weekMilestone();
sparkles();
initCloud();
})();
