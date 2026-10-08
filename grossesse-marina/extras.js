/* Grossesse Marina : fonctionnalités complémentaires (album, lettres, faire-part, compte à rebours, symptômes,
   questions, vitamines & rappels, urgence, espace papa, duel de prénoms, liste & budget, échographies, cœur de bébé).
   app.js appelle GMX.init(api) au démarrage et délègue vues, actions et formulaires. */
(() => {
"use strict";
let A = null;
const $ = s => document.querySelector(s);
const GMX = window.GMX = {views: {}, actions: {}, submits: {}};
GMX.init = api => { A = api; };

/* ================= Données de référence ================= */
const MILESTONES = [[14, "Fin du 1er trimestre"], [20, "Mi-parcours"], [22, "Écho morphologique"], [28, "Début du 3e trimestre"], [32, "Dernière échographie"], [37, "Bébé est à terme"], [41, "Terme prévu"]];

const SYMPTOMES = [["nausees", "Nausées"], ["fatigue", "Fatigue"], ["sommeil", "Mauvais sommeil"], ["dos", "Mal de dos"], ["jambes", "Jambes lourdes"], ["brulures", "Brûlures d'estomac"], ["tete", "Maux de tête"], ["contractions", "Contractions"]];
const NIVEAUX = ["Aucun", "Léger", "Moyen", "Fort"];

const PAPA_TIPS = [
  [4, 7, "Les premières semaines sont souvent fatigantes et nauséeuses. Prends le relais pour les courses et la cuisine, et évite les odeurs fortes à la maison."],
  [8, 11, "Accompagne Marina à la première échographie si tu peux : c'est souvent là qu'on entend le cœur pour la première fois."],
  [12, 14, "Parlez ensemble de l'annonce à la famille, et pensez à la déclaration de grossesse avant 15 SA."],
  [15, 18, "L'énergie revient souvent. C'est le bon moment pour un week-end à deux ou pour commencer à réfléchir aux prénoms."],
  [19, 22, "Pose ta main sur le ventre le soir : tu pourras bientôt sentir les premiers coups. Prépare tes questions pour l'écho morphologique."],
  [23, 26, "Bébé entend ta voix : parle-lui, lis-lui une histoire. Commencez à regarder les modes de garde et la liste de naissance."],
  [27, 30, "Le 3e trimestre arrive : masse le dos et les jambes, et proposez-vous des séances de préparation à la naissance ensemble."],
  [31, 34, "Monte le lit, installe le siège auto, repère le trajet vers la maternité et le parking."],
  [35, 37, "Valise prête, téléphone toujours chargé, réservoir plein. Garde le numéro de la maternité dans tes favoris."],
  [38, 41, "Ça peut arriver à tout moment. Reste joignable, et rappelle-toi : contractions toutes les 5 minutes depuis 1 à 2 h ou perte des eaux, on part."]
];
const PAPA_TACHES = ["Monter le lit de bébé", "Installer le siège auto", "Repérer le trajet de la maternité", "Préparer la chambre", "Faire la reconnaissance anticipée (si non mariés)", "Poser les congés de naissance", "Laver le linge de bébé", "Préparer des plats d'avance à congeler", "Installer la table à langer", "Charger les batteries de l'appareil photo"];

const ACHAT_CATS = ["Sommeil", "Promenade", "Repas", "Toilette & change", "Vêtements", "Santé", "Chambre", "Autre"];
const ACHATS_SUGG = [["Lit à barreaux + matelas", "Sommeil"], ["Gigoteuses (×2)", "Sommeil"], ["Babyphone", "Sommeil"], ["Poussette", "Promenade"], ["Siège auto (cosy)", "Promenade"], ["Porte-bébé ou écharpe", "Promenade"], ["Biberons et goupillons", "Repas"], ["Tire-lait", "Repas"], ["Bavoirs", "Repas"], ["Baignoire", "Toilette & change"], ["Table ou matelas à langer", "Toilette & change"], ["Couches taille 1 et 2", "Toilette & change"], ["Thermomètre de bain", "Toilette & change"], ["Bodies et pyjamas naissance", "Vêtements"], ["Gilets et bonnets", "Vêtements"], ["Thermomètre médical", "Santé"], ["Sérum physiologique", "Santé"], ["Commode", "Chambre"], ["Veilleuse", "Chambre"]];

const EXTRA_NAMES = {
  F: ["Léonie", "Margot", "Suzanne", "Lucie", "Clémence", "Rosalie", "Gabrielle", "Éléna", "Mathilde", "Juliette", "Adèle", "Constance", "Eva", "Zoé", "Inès", "Lola", "Manon", "Chloé", "Lise", "Maëlle", "Romane", "Valentine", "Garance", "Ninon", "Billie", "Elsa", "Thaïs", "Aya", "Sarah", "Ella"],
  M: ["Léo", "Paul", "Tom", "Victor", "Samuel", "Antoine", "Simon", "Clément", "Basile", "Lucien", "Émile", "Joseph", "Félix", "Noé", "Liam", "Ethan", "Nathan", "Mathis", "Axel", "Robin", "Théodore", "Valentin", "Oscar", "Gaspard", "Anatole", "Lenny", "Mylan", "Ezio", "Ayden", "Raphaël"]
};

/* ================= Utilitaires ================= */
const esc = s => A.esc(s);
const role = () => A.myRole();
const roleName = r => r === "elle" ? A.mamanName() : A.papaName();
const other = r => r === "elle" ? "lui" : "elle";
const key = n => n.trim().toLowerCase();
function copyText(t){
  try{ navigator.clipboard.writeText(t).then(() => A.toast("Copié"), () => A.toast("Copie impossible")); }catch(e){ A.toast("Copie impossible"); }
}
async function shareText(title, text){
  if (navigator.share){ try{ await navigator.share({title, text}); return; }catch(e){ if (e && e.name === "AbortError") return; } }
  copyText(text);
}
async function shareFile(file, title){
  if (navigator.canShare && navigator.canShare({files: [file]})){ try{ await navigator.share({files: [file], title}); return true; }catch(e){ if (e && e.name === "AbortError") return true; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return false;
}
const saAt = iso => { const d0 = A.ddr(); if (!d0 || !iso) return null; const n = A.diffDays(A.parseD(iso), d0); return n >= 0 ? Math.floor(n / 7) : null; };
const naissance = () => A.S.profil.naissance || null;

/* ================= Accueil ================= */
GMX.homeTop = p => {
  let h = "";
  const nb = naissance();
  if (nb && nb.date){
    h += `<section class="card born"><div class="born-in"><span class="born-emoji">🎉</span><div style="min-width:0">
      <div class="eyebrow">Bienvenue au monde</div><h2>${esc(nb.prenom || "Bébé")} est ${A.S.profil.sexe === "F" ? "née" : A.S.profil.sexe === "M" ? "né" : "né(e)"} !</h2>
      <p class="muted">${esc(A.fmtMid(A.parseD(nb.date)))}${nb.heure ? " à " + esc(nb.heure.replace(":", "h")) : ""}${nb.poids ? " · " + esc((nb.poids / 1000).toLocaleString("fr-FR")) + " kg" : ""}</p></div></div>
      <div class="row"><button class="btn small" data-gt-go="fairepart">Faire-part</button><button class="btn small ghost" data-gt-go="lettres">Ouvrir les lettres 💌</button></div></section>`;
  }
  // rendez-vous de demain
  const dem = A.fmtISO(A.addDays(A.today(), 1));
  const r = A.values("rdv").filter(x => x.date === dem && !x.fait);
  if (r.length) h += `<button class="card reminder" data-go="rdv"><span>🔔</span><div style="min-width:0"><b>Demain : ${esc(r[0].titre)}</b><div class="muted" style="font-size:13px">${r[0].heure ? esc(r[0].heure) : "Heure à préciser"}${r[0].lieu ? " · " + esc(r[0].lieu) : ""}${r.length > 1 ? " · et " + (r.length - 1) + " autre(s)" : ""}</div></div></button>`;
  celebrate(p);
  return h;
};
function celebrate(p){
  if (!p) return;
  const reached = MILESTONES.filter(([sa]) => p.sa >= sa);
  const last = A.lsGet("lastMs");
  const top = reached.length ? reached[reached.length - 1][0] : 0;
  if (last !== null && top > last){
    const m = reached[reached.length - 1];
    setTimeout(() => { A.toast("🎉 " + m[1] + " !"); A.burst(innerWidth / 2, innerHeight / 3, ["🎉", "💜", "💚", "🌸", "✨"], 32); }, 1400);
  }
  if (last === null || top !== last) A.lsSet("lastMs", top);
}
GMX.homeAfterHero = p => {
  let h = "";
  if (p && p.sa >= 28 && !naissance()) h += `<button class="urgent-btn" data-gt-go="urgence"><span>🚨</span><b>C'est le moment ?</b><small>Maternité, itinéraire, prévenir ${esc(A.papaName())}</small></button>`;
  const today = A.fmtISO(A.today()), done = !!(A.S.vitamines.jours || {})[today];
  if (p && !naissance()) h += `<div class="card vit-card"><button class="check ${done ? "on" : ""}" data-act="vitToday" aria-label="Vitamines prises aujourd'hui"></button>
    <div style="flex:1;min-width:0"><b>Vitamines du jour</b><div class="muted" style="font-size:13px">${done ? "Prises aujourd'hui ✓" : "Pas encore cochées"} · ${streak()} jour${streak() > 1 ? "s" : ""} d'affilée</div></div>
    <button class="btn small ghost" data-gt-go="vitamines">Rappels</button></div>`;
  return h;
};
GMX.homeCards = p => {
  if (!p || naissance()) return "";
  const tip = PAPA_TIPS.find(([a, b]) => p.sa >= a && p.sa <= b);
  const photoThisWeek = A.values("photos").some(x => x.kind === "ventre" && saAt(x.date) === p.sa);
  return `<div class="grid2">
    <button class="card tile m" data-act="heart"><span class="ico">💓</span><div><h3>Écouter son cœur</h3><p>${Heart.on ? "En cours… touche pour arrêter" : "Un battement à " + (window.Bebe3D ? Bebe3D.bpmAt(p.sa) : bpmApprox(p.sa)) + " par minute"}</p></div></button>
    <button class="card tile r" data-gt-go="album"><span class="ico">📸</span><div><h3>${photoThisWeek ? "Album du ventre" : "Photo de la semaine"}</h3><p>${photoThisWeek ? "Revois l'évolution semaine après semaine" : "Ajoute la photo du ventre à " + p.sa + " SA"}</p></div></button>
  </div>
  ${tip ? `<button class="card tile papa-tip" data-gt-go="papa"><span class="ico">👨</span><div><h3>Pour ${esc(A.papaName())} cette semaine</h3><p>${esc(tip[2])}</p></div></button>` : ""}`;
};
function streak(){
  const j = A.S.vitamines.jours || {}; let n = 0, d = A.today();
  if (!j[A.fmtISO(d)]) d = A.addDays(d, -1);
  while (j[A.fmtISO(d)]){ n++; d = A.addDays(d, -1); }
  return n;
}
const bpmApprox = sa => sa < 9 ? 150 : sa < 14 ? 155 : 142;

/* ================= Compte à rebours ================= */
GMX.views.compte = () => {
  const p = A.preg();
  if (!p) return `<div class="card"><p>Renseigne une date dans les réglages pour lancer le compte à rebours.</p></div>`;
  return `<section class="countdown">
    <div class="flower">${A.flowerSVG(p.pct)}</div>
    <div class="eyebrow">Avant le terme du ${esc(p.terme.toLocaleDateString("fr-FR", {day: "numeric", month: "long", year: "numeric"}))}</div>
    <div class="cd-grid"><div><b id="cdD">–</b><span>jours</span></div><div><b id="cdH">–</b><span>heures</span></div><div><b id="cdM">–</b><span>minutes</span></div><div><b id="cdS">–</b><span>secondes</span></div></div>
    <p class="muted">${p.sa >= 37 ? "Bébé est à terme : il peut arriver à tout moment 💜" : "Bébé sera à terme (37 SA) dans " + Math.max(0, 37 * 7 - p.days) + " jours."}</p>
  </section>
  <section class="card"><h3 style="margin-bottom:6px">Les grandes étapes</h3><div class="list">${MILESTONES.map(([sa, t]) => {
    const ok = p.sa >= sa, d = A.addDays(A.ddr(), sa * 7);
    return `<div class="item" style="align-items:center"><span class="check ${ok ? "on" : ""}" aria-hidden="true"></span><div class="body"><div class="title">${esc(t)}</div><div class="muted" style="font-size:13px">${sa} SA · ${esc(d.toLocaleDateString("fr-FR", {day: "numeric", month: "long"}))}</div></div>${ok ? "" : `<span class="pill">J − ${A.diffDays(d, A.today())}</span>`}</div>`;
  }).join("")}</div></section>`;
};
let cdTimer = null;
function tickCountdown(){
  clearInterval(cdTimer);
  const p = A.preg(); if (!p || !$("#cdD")) return;
  const end = p.terme.getTime();
  const upd = () => {
    const el = $("#cdD"); if (!el){ clearInterval(cdTimer); return; }
    let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
    el.textContent = d; $("#cdH").textContent = String(h).padStart(2, "0"); $("#cdM").textContent = String(m).padStart(2, "0"); $("#cdS").textContent = String(s).padStart(2, "0");
  };
  upd(); cdTimer = setInterval(upd, 1000);
}

/* ================= Album photo & échographies ================= */
function loadImg(src){ return new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; }); }
async function compress(file, max, q){
  const url = URL.createObjectURL(file);
  try{
    const img = await loadImg(url), sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return {data: c.toDataURL("image/jpeg", q), w: c.width, h: c.height};
  } finally { URL.revokeObjectURL(url); }
}
async function addPhotos(files, kind){
  if (!files || !files.length) return;
  A.toast(files.length > 1 ? "Ajout de " + files.length + " photos…" : "Ajout de la photo…");
  let n = 0;
  for (const f of files){
    if (!/^image\//.test(f.type)) continue;
    try{
      let full = await compress(f, 1400, .78);
      if (full.data.length > 900000) full = await compress(f, 1080, .65);
      const thumb = await compress(f, 420, .68);
      const id = A.uid();
      const date = kind === "echo" && f.lastModified ? A.fmtISO(new Date(f.lastModified)) : A.fmtISO(A.today());
      if (A.live()) await A.colRef("photosFull").doc(id).set({data: full.data}).catch(() => {});
      else { try{ localStorage.setItem("gm:photo:" + id, full.data); }catch(e){} }
      A.putItem("photos", {id, kind, date, caption: "", thumb: thumb.data, w: full.w, h: full.h, at: Date.now()});
      n++;
    }catch(e){ console.warn(e); }
  }
  A.render();
  if (n){ A.toast(n > 1 ? n + " photos ajoutées" : "Photo ajoutée 📸"); A.burst(innerWidth / 2, innerHeight / 2, ["📸", "💜", "✨"], 14); }
  else A.toast("Impossible de lire cette image");
}
function photosOf(kind){ return A.values("photos").filter(x => x.kind === kind).sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.at || 0) - (b.at || 0)); }
function albumView(kind){
  const list = photosOf(kind), isE = kind === "echo";
  const title = isE ? "Échographies" : "Album du ventre";
  const intro = isE ? "Prends en photo les clichés d'échographie ou importe-les. Ils sont rangés par date et par semaine." : "Une photo de profil chaque semaine, toujours au même endroit : le diaporama montre ensuite le ventre qui s'arrondit.";
  const p = A.preg();
  return `<div class="sectionhead"><h2>${title}</h2><p class="muted">${intro}</p></div>
  <div class="row">
    <label class="btn"><input type="file" accept="image/*" ${isE ? "multiple" : ""} data-photo-kind="${kind}" hidden>${isE ? "＋ Ajouter des échos" : "📸 Photo de la semaine" + (p ? " (" + p.sa + " SA)" : "")}</label>
    ${list.length > 1 ? `<button class="btn ghost" data-act="slideshow" data-kind="${kind}">▶ Diaporama</button>` : ""}
  </div>
  ${list.length ? `<div class="photogrid">${list.map(x => { const sa = saAt(x.date);
    return `<button class="ph" data-act="photo" data-id="${esc(x.id)}"><img src="${x.thumb}" alt="${esc(x.caption || title)}" loading="lazy"><span>${sa !== null ? sa + " SA" : esc(A.fmtShort(A.parseD(x.date)))}</span></button>`; }).join("")}</div>`
    : `<div class="card empty"><span>${isE ? "🩻" : "🤰"}</span><p class="muted">${isE ? "Aucune échographie pour l'instant." : "Pas encore de photo. Astuce : même pièce, même tenue, même angle chaque semaine."}</p></div>`}`;
}
GMX.views.album = () => albumView("ventre");
GMX.views.echos = () => albumView("echo");
async function fullPhoto(id){
  if (A.live()){ try{ const d = await A.colRef("photosFull").doc(id).get(); if (d.exists) return d.data().data; }catch(e){} }
  try{ const v = localStorage.getItem("gm:photo:" + id); if (v) return v; }catch(e){}
  return (A.S.photos[id] || {}).thumb;
}
GMX.actions.photo = async el => {
  const x = A.S.photos[el.dataset.id]; if (!x) return;
  const sa = saAt(x.date);
  A.openSheet(`<div class="stack viewer">
    <div class="row"><h3>${sa !== null ? sa + " SA · " : ""}${esc(A.fmtMid(A.parseD(x.date)))}</h3><span class="spacer"></span><button type="button" class="iconbtn" data-act="closeSheet" aria-label="Fermer">✕</button></div>
    <img id="phFull" src="${x.thumb}" alt="">
    <form id="phForm" class="stack" data-id="${esc(x.id)}">
      <div class="row"><label class="f">Date<input type="date" id="phDate" value="${esc(x.date)}"></label><label class="f" style="flex:2 1 180px">Légende<input type="text" id="phCap" value="${esc(x.caption || "")}" maxlength="120" placeholder="Un petit mot…"></label></div>
      <div class="row"><button class="btn" type="submit">Enregistrer</button><button class="btn ghost" type="button" data-act="phShare" data-id="${esc(x.id)}">Partager</button><span class="spacer"></span><button class="btn small danger" type="button" data-act="phDel" data-id="${esc(x.id)}">Supprimer</button></div>
    </form></div>`);
  const src = await fullPhoto(x.id); const img = $("#phFull"); if (img && src) img.src = src;
};
GMX.submits.phForm = (f, val) => { A.patchItem("photos", f.dataset.id, {date: val("phDate"), caption: val("phCap").trim()}); A.closeSheet(); A.render(); A.toast("Photo mise à jour"); };
GMX.actions.phDel = el => {
  if (el.dataset.confirm !== "1"){ el.dataset.confirm = "1"; el.textContent = "Confirmer la suppression"; return; }
  const id = el.dataset.id; A.delItem("photos", id);
  if (A.live()) A.colRef("photosFull").doc(id).delete().catch(() => {}); else { try{ localStorage.removeItem("gm:photo:" + id); }catch(e){} }
  A.closeSheet(); A.render(); A.toast("Photo supprimée");
};
GMX.actions.phShare = async el => {
  const src = await fullPhoto(el.dataset.id); if (!src) return;
  const blob = await (await fetch(src)).blob();
  shareFile(new File([blob], "grossesse-" + (A.S.photos[el.dataset.id].date || "photo") + ".jpg", {type: "image/jpeg"}), "Grossesse " + A.mamanName());
};
GMX.actions.slideshow = el => {
  const list = photosOf(el.dataset.kind); if (!list.length) return;
  A.openSheet(`<div class="slideshow" id="slides"><button type="button" class="iconbtn ss-close" data-act="closeSheet" aria-label="Fermer">✕</button>
    ${list.map((x, i) => { const sa = saAt(x.date); return `<figure class="${i === 0 ? "on" : ""}"><img src="${x.thumb}" alt=""><figcaption><b>${sa !== null ? sa + " SA" : ""}</b> ${esc(x.caption || A.fmtShort(A.parseD(x.date)))}</figcaption></figure>`; }).join("")}
    <div class="ss-bar"><i id="ssBar"></i></div></div>`);
  let i = 0; const figs = document.querySelectorAll("#slides figure"), dur = 2600;
  // charge les versions pleine résolution en arrière-plan
  list.forEach((x, k) => fullPhoto(x.id).then(src => { if (src && figs[k]) figs[k].querySelector("img").src = src; }));
  clearInterval(GMX._ss);
  GMX._ss = setInterval(() => {
    if (!$("#slides") || $("#sheet").hidden){ clearInterval(GMX._ss); return; }
    figs[i].classList.remove("on"); i = (i + 1) % figs.length; figs[i].classList.add("on");
    const b = $("#ssBar"); if (b) b.style.width = ((i + 1) / figs.length * 100) + "%";
  }, dur);
};
GMX.onChange = e => { const k = e.target.dataset && e.target.dataset.photoKind; if (k){ addPhotos([...e.target.files], k); e.target.value = ""; } };

/* ================= Lettres à bébé ================= */
const lettreOuverte = l => {
  const nb = naissance(); if (!nb || !nb.date) return false;
  if (l.ouverture === "18ans"){ const d = A.parseD(nb.date); return A.today() >= new Date(d.getFullYear() + 18, d.getMonth(), d.getDate()); }
  return true;
};
GMX.views.lettres = () => {
  const list = A.values("lettres").sort((a, b) => (a.at || 0) - (b.at || 0));
  const open = list.filter(lettreOuverte), sealed = list.filter(l => !lettreOuverte(l));
  return `<div class="sectionhead"><h2>Lettres à bébé</h2><p class="muted">Écrivez-lui un mot quand vous voulez. Les lettres restent scellées jusqu'à sa naissance, ou jusqu'à ses 18 ans.</p></div>
  <form class="card stack" id="letterForm">
    <label class="f">Ma lettre<textarea id="ltTxt" rows="5" required maxlength="5000" placeholder="Mon petit cœur, aujourd'hui je t'ai senti bouger pour la première fois…"></textarea></label>
    <div class="row" style="align-items:flex-end"><label class="f">À ouvrir<select id="ltWhen"><option value="naissance">à la naissance</option><option value="18ans">à ses 18 ans</option></select></label>
      <button class="btn" type="submit">Sceller la lettre 💌</button></div>
    <p class="muted" style="font-size:12.5px">Une fois scellée, la lettre n'est plus lisible dans l'appli jusqu'à la date choisie (elle reste enregistrée dans votre base).</p>
  </form>
  ${sealed.length ? `<section class="stack"><div class="eyebrow">${sealed.length} lettre${sealed.length > 1 ? "s" : ""} scellée${sealed.length > 1 ? "s" : ""}</div><div class="envelopes">${sealed.map(l => `<div class="envelope"><span>💌</span><b>De ${esc(l.auteur || "vous")}</b><small>${esc(A.fmtShort(A.parseD(l.date)))}${l.sa !== null && l.sa !== undefined ? " · " + l.sa + " SA" : ""}</small><small>${l.ouverture === "18ans" ? "À ouvrir à ses 18 ans" : "À ouvrir à la naissance"}</small></div>`).join("")}</div></section>` : ""}
  ${open.length ? `<section class="stack"><div class="eyebrow">Lettres ouvertes</div>${open.map(l => `<article class="card letter"><div class="muted" style="font-size:13px">De ${esc(l.auteur || "vous")} · ${esc(A.fmtMid(A.parseD(l.date)))}${l.sa != null ? " · " + l.sa + " SA" : ""}</div><p>${esc(l.texte)}</p></article>`).join("")}</section>` : ""}`;
};
GMX.submits.letterForm = (f, val) => {
  const t = val("ltTxt").trim(); if (!t) return;
  const r = role(), p = A.preg();
  A.putItem("lettres", {id: A.uid(), texte: t, ouverture: val("ltWhen"), auteur: r ? roleName(r) : (A.Cloud.user && (A.Cloud.user.displayName || "").split(" ")[0]) || "", date: A.fmtISO(A.today()), sa: p ? p.sa : null, at: Date.now()});
  A.render(); A.toast("Lettre scellée 💌"); A.burst(innerWidth / 2, innerHeight / 2, ["💌", "💜", "✨"], 16);
};

/* ================= Faire-part ================= */
GMX.views.fairepart = () => {
  const nb = naissance() || {}, pr = A.S.profil;
  const fav = (A.values("prenoms").find(n => n.elle && n.lui) || {}).prenom || "";
  return `<div class="sectionhead"><h2>Faire-part</h2><p class="muted">Le jour J, remplis ces informations : l'appli crée un faire-part à partager sur WhatsApp, et les lettres scellées « à la naissance » s'ouvrent.</p></div>
  <form class="card stack" id="fpForm">
    <div class="row"><label class="f">Prénom<input type="text" id="fpPrenom" value="${esc(nb.prenom || fav)}" maxlength="40" required></label>
      <label class="f">Né(e) le<input type="date" id="fpDate" value="${esc(nb.date || "")}" required></label><label class="f">À<input type="time" id="fpHeure" value="${esc(nb.heure || "")}"></label></div>
    <div class="row"><label class="f">Poids (g)<input type="number" id="fpPoids" min="300" max="6500" value="${esc(nb.poids || "")}" placeholder="3250"></label>
      <label class="f">Taille (cm)<input type="number" id="fpTaille" min="25" max="65" step="0.5" value="${esc(nb.taille || "")}" placeholder="50"></label>
      <label class="f">Lieu<input type="text" id="fpLieu" value="${esc(nb.lieu || "")}" maxlength="60" placeholder="Lorient"></label></div>
    <label class="f">Sexe<select id="fpSexe"><option value="F" ${pr.sexe === "F" ? "selected" : ""}>Fille</option><option value="M" ${pr.sexe === "M" ? "selected" : ""}>Garçon</option></select></label>
    <div class="row"><button class="btn" type="submit">${nb.date ? "Mettre à jour" : "Bébé est né ! 🎉"}</button>${nb.date ? `<button class="btn ghost" type="button" data-act="fpShare">Partager le faire-part</button>` : ""}</div>
  </form>
  ${nb.date ? `<div class="card fp-prev"><canvas id="fpCanvas" width="1080" height="1350" aria-label="Aperçu du faire-part"></canvas></div>` : `<div class="card empty"><span>🎀</span><p class="muted">L'aperçu apparaîtra ici.</p></div>`}`;
};
GMX.submits.fpForm = (f, val) => {
  const nb = {prenom: val("fpPrenom").trim(), date: val("fpDate"), heure: val("fpHeure"), poids: +val("fpPoids") || null, taille: +val("fpTaille") || null, lieu: val("fpLieu").trim()};
  const first = !naissance();
  A.setProfil({naissance: nb, sexe: val("fpSexe")});
  A.render();
  if (first){ A.toast("Félicitations !! 🎉"); A.burst(innerWidth / 2, innerHeight / 3, ["🎉", "💜", "💚", "🍼", "👶", "✨"], 50); }
};
async function drawFairePart(){
  const c = $("#fpCanvas"); const nb = naissance(); if (!c || !nb) return;
  const x = c.getContext("2d"), W = c.width, H = c.height, sexe = A.S.profil.sexe;
  try{ await Promise.all([document.fonts.load('140px "Young Serif"'), document.fonts.load('600 40px "Outfit"')]); }catch(e){}
  const pal = sexe === "F" ? ["#FBE3EF", "#F6CBE1", "#E58BB5", "#7A2E5A"] : sexe === "M" ? ["#E3EEFB", "#C9DDF6", "#6D9BD8", "#203E66"] : ["#EEE8FA", "#D8F4EA", "#7B5CD6", "#2B2446"];
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++){ x.fillStyle = `rgba(255,255,255,${.2 + Math.random() * .5})`; x.beginPath(); x.arc(Math.random() * W, Math.random() * H, 2 + Math.random() * 6, 0, 7); x.fill(); }
  x.strokeStyle = "rgba(255,255,255,.8)"; x.lineWidth = 6; x.strokeRect(50, 50, W - 100, H - 100);
  try{
    const svg = A.flowerSVG(1, {core: 18}).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" ');
    const img = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
    x.drawImage(img, W / 2 - 170, 120, 340, 340);
  }catch(e){}
  x.textAlign = "center"; x.fillStyle = pal[3];
  x.font = '600 40px "Outfit", sans-serif'; x.fillText("BIENVENUE À", W / 2, 560);
  x.fillStyle = pal[2]; let fs = 170; x.font = `${fs}px "Young Serif", Georgia, serif`;
  while (x.measureText(nb.prenom || "Bébé").width > W - 180 && fs > 70){ fs -= 10; x.font = `${fs}px "Young Serif", Georgia, serif`; }
  x.fillText(nb.prenom || "Bébé", W / 2, 720);
  x.fillStyle = pal[3]; x.font = '500 46px "Outfit", sans-serif';
  const ne = sexe === "F" ? "née" : "né";
  const d = A.parseD(nb.date).toLocaleDateString("fr-FR", {weekday: "long", day: "numeric", month: "long", year: "numeric"});
  x.fillText(`${ne} le ${d}`, W / 2, 830);
  const l2 = [nb.heure ? "à " + nb.heure.replace(":", "h") : "", nb.lieu ? "à " + nb.lieu : ""].filter(Boolean).join(" · ");
  if (l2) x.fillText(l2, W / 2, 895);
  const l3 = [nb.poids ? (nb.poids / 1000).toLocaleString("fr-FR", {minimumFractionDigits: 3}) + " kg" : "", nb.taille ? nb.taille.toLocaleString("fr-FR") + " cm" : ""].filter(Boolean).join("  ·  ");
  if (l3){ x.font = '600 58px "Outfit", sans-serif'; x.fillStyle = pal[2]; x.fillText(l3, W / 2, 1010); }
  x.fillStyle = pal[3]; x.font = '500 44px "Outfit", sans-serif';
  x.fillText(`Avec tout l'amour de ${A.mamanName()} & ${A.papaName()}`, W / 2, 1180);
}
GMX.actions.fpShare = () => {
  const c = $("#fpCanvas"); if (!c) return;
  c.toBlob(b => shareFile(new File([b], "faire-part-" + ((naissance() || {}).prenom || "bebe") + ".png", {type: "image/png"}), "Faire-part"), "image/png");
};

/* ================= Symptômes ================= */
GMX.views.symptomes = () => {
  const iso = A.fmtISO(A.today()), cur = A.S.symptomes[iso] || {};
  const days = Array.from({length: 14}, (_, i) => A.fmtISO(A.addDays(A.today(), i - 13)));
  return `<div class="sectionhead"><h2>Symptômes</h2><p class="muted">Note comment tu te sens chaque jour : le résumé t'aidera pendant les consultations.</p></div>
  <form class="card stack" id="sympForm">
    <h3>Aujourd'hui</h3>
    ${SYMPTOMES.map(([k, l]) => `<div class="symrow"><span>${l}</span><div class="lv" role="group" aria-label="${l}">${NIVEAUX.map((n, i) => `<button type="button" data-sym="${k}" data-lv="${i}" aria-pressed="${(cur[k] || 0) === i}" title="${n}">${i === 0 ? "–" : "●".repeat(i)}</button>`).join("")}</div></div>`).join("")}
    <label class="f">Note<input type="text" id="symNote" value="${esc(cur.note || "")}" maxlength="300" placeholder="Ex. crampes la nuit"></label>
    <div class="row"><button class="btn" type="submit">Enregistrer</button></div>
  </form>
  <section class="card stack"><h3>14 derniers jours</h3>
    <div class="heat"><div class="hrow head"><span></span>${days.map(d => `<i>${A.parseD(d).getDate()}</i>`).join("")}</div>
    ${SYMPTOMES.map(([k, l]) => `<div class="hrow"><span>${l}</span>${days.map(d => { const v = (A.S.symptomes[d] || {})[k] || 0; return `<i class="l${v}" title="${esc(d)} : ${NIVEAUX[v]}"></i>`; }).join("")}</div>`).join("")}</div>
  </section>
  <section class="card stack"><h3>Résumé pour la sage-femme</h3><pre class="summary" id="symSum">${esc(symSummary())}</pre>
    <div class="row"><button class="btn small" data-act="symCopy">Copier</button><button class="btn small ghost" data-act="symShare">Partager</button><button class="btn small ghost" data-act="symAsk">✨ Demander à l'assistante</button></div></section>`;
};
function symSummary(){
  const ent = Object.entries(A.S.symptomes).filter(([d]) => A.diffDays(A.today(), A.parseD(d)) < 30).sort((a, b) => a[0].localeCompare(b[0]));
  if (!ent.length) return "Aucun symptôme noté sur les 30 derniers jours.";
  const p = A.preg();
  const lines = [`Suivi des symptômes de ${A.mamanName()} (${ent.length} jours notés sur 30)${p ? " — " + p.sa + " SA" : ""}`];
  for (const [k, l] of SYMPTOMES){
    const vals = ent.map(([, v]) => v[k] || 0), n = vals.filter(v => v > 0).length; if (!n) continue;
    const fort = vals.filter(v => v === 3).length;
    lines.push(`• ${l} : ${n} jour${n > 1 ? "s" : ""}${fort ? ` (dont ${fort} fort${fort > 1 ? "s" : ""})` : ""}`);
  }
  const notes = ent.filter(([, v]) => v.note).slice(-5).map(([d, v]) => `  - ${A.fmtShort(A.parseD(d))} : ${v.note}`);
  if (notes.length) lines.push("Notes récentes :", ...notes);
  return lines.join("\n");
}
GMX.submits.sympForm = (f, val) => {
  const iso = A.fmtISO(A.today()), cur = Object.assign({}, A.S.symptomes[iso] || {});
  document.querySelectorAll("[data-sym][aria-pressed=true]").forEach(b => { cur[b.dataset.sym] = +b.dataset.lv; });
  cur.note = val("symNote").trim(); cur.id = iso;
  A.putItem("symptomes", cur); A.render(); A.toast("Noté pour aujourd'hui");
};
GMX.actions.symCopy = () => copyText(symSummary());
GMX.actions.symShare = () => shareText("Mes symptômes", symSummary());
GMX.actions.symAsk = () => A.ask("Voici mon suivi de symptômes. Dis-moi ce qui est fréquent à ce stade, ce qui peut soulager, et ce qui mériterait d'en parler à la sage-femme :\n\n" + symSummary());

/* ================= Questions pour la sage-femme ================= */
GMX.views.questions = () => {
  const list = A.values("questions").sort((a, b) => (!!a.faite - !!b.faite) || (a.at || 0) - (b.at || 0));
  const todo = list.filter(q => !q.faite).length;
  const next = A.values("rdv").filter(r => !r.fait && r.date >= A.fmtISO(A.today())).sort((a, b) => a.date.localeCompare(b.date))[0];
  return `<div class="sectionhead"><h2>Questions</h2><p class="muted">Note tes questions au fil de la semaine et coche-les pendant la consultation.${next ? ` Prochain rendez-vous : <b>${esc(next.titre)}</b>, ${esc(A.fmtMid(A.parseD(next.date)))}.` : ""}</p></div>
  <form class="card row" id="qForm" style="align-items:flex-end"><label class="f" style="flex:3 1 200px">Nouvelle question<input type="text" id="qTxt" required maxlength="300" placeholder="Est-ce que je peux continuer la natation ?"></label><button class="btn" type="submit">Ajouter</button></form>
  <section class="card"><div class="row"><h3>${todo} à poser</h3><span class="spacer"></span>${todo ? `<button class="btn small ghost" data-act="qShare">Partager</button>` : ""}</div>
  <div class="list" style="margin-top:6px">${list.length ? list.map(q => `<div class="item ${q.faite ? "done" : ""}" style="align-items:center"><button class="check ${q.faite ? "on" : ""}" data-act="qToggle" data-id="${esc(q.id)}" aria-label="Posée"></button><div class="body title" style="font-weight:500">${esc(q.texte)}</div><button class="x" data-act="qDel" data-id="${esc(q.id)}" aria-label="Supprimer">×</button></div>`).join("") : `<p class="muted" style="padding-block:10px">Aucune question pour l'instant.</p>`}</div></section>`;
};
GMX.submits.qForm = (f, val) => { const t = val("qTxt").trim(); if (!t) return; A.putItem("questions", {id: A.uid(), texte: t, faite: false, at: Date.now()}); A.render(); };
GMX.actions.qToggle = el => { const q = A.S.questions[el.dataset.id]; if (q){ A.patchItem("questions", q.id, {faite: !q.faite}); A.render(); } };
GMX.actions.qDel = el => { A.delItem("questions", el.dataset.id); A.render(); };
GMX.actions.qShare = () => shareText("Questions pour la sage-femme", "Questions pour la sage-femme :\n" + A.values("questions").filter(q => !q.faite).map(q => "• " + q.texte).join("\n"));

/* ================= Vitamines & rappels ================= */
GMX.views.vitamines = () => {
  const j = A.S.vitamines.jours || {};
  const days = Array.from({length: 21}, (_, i) => A.addDays(A.today(), i - 20));
  const heure = A.UI.vitHeure || "09:00";
  const up = A.values("rdv").filter(r => !r.fait && r.date >= A.fmtISO(A.today()));
  return `<div class="sectionhead"><h2>Vitamines & rappels</h2><p class="muted">Coche chaque jour ta prise (acide folique, vitamine D, fer… selon ta prescription).</p></div>
  <section class="card stack"><div class="row"><h3>${streak()} jour${streak() > 1 ? "s" : ""} d'affilée</h3><span class="spacer"></span><button class="btn small" data-act="vitToday">${j[A.fmtISO(A.today())] ? "✓ Prises aujourd'hui" : "Cocher aujourd'hui"}</button></div>
    <div class="vitdays">${days.map(d => { const iso = A.fmtISO(d); return `<button class="${j[iso] ? "on" : ""}" data-act="vitDay" data-day="${iso}" title="${esc(A.fmtMid(d))}"><small>${d.toLocaleDateString("fr-FR", {weekday: "narrow"})}</small>${d.getDate()}</button>`; }).join("")}</div></section>
  <section class="card stack"><h3>Recevoir un rappel chaque jour</h3>
    <p class="muted" style="font-size:14px">L'appli ne peut pas t'envoyer de notification quand elle est fermée. Le plus fiable : un rappel quotidien dans Google Agenda, qui te notifiera tous les jours.</p>
    <div class="row" style="align-items:flex-end"><label class="f">Heure<input type="time" id="vitHeure" value="${esc(heure)}"></label>
      <a class="btn" id="vitCal" href="${esc(vitCalLink(heure))}" target="_blank" rel="noopener">Créer le rappel dans Google Agenda</a></div></section>
  <section class="card stack"><h3>Rappels des rendez-vous</h3>
    <p class="muted" style="font-size:14px">Ajoute tous les rendez-vous à venir (${up.length}) d'un coup dans l'agenda de ton téléphone, avec un rappel la veille et 2 h avant.</p>
    <div class="row"><button class="btn" data-act="icsExport" ${up.length ? "" : "disabled"}>Exporter vers mon agenda</button><button class="btn ghost" data-go="rdv">Voir l'agenda</button></div>
    <p class="muted" style="font-size:12.5px">Sur Android, choisis « Agenda » ou ton appli de calendrier quand le téléphone demande avec quoi ouvrir le fichier. Sinon, utilise le bouton « + Google Agenda » sur chaque rendez-vous.</p></section>`;
};
function vitCalLink(h){
  const d = A.fmtISO(A.today()).replace(/-/g, ""), t = h.replace(":", "") + "00";
  const [hh, mm] = h.split(":").map(Number), end = String(hh).padStart(2, "0") + String((mm + 10) % 60).padStart(2, "0") + "00";
  const q = new URLSearchParams({action: "TEMPLATE", text: "💊 Vitamines", dates: `${d}T${t}/${d}T${mm + 10 >= 60 ? String(hh + 1).padStart(2, "0") + String((mm + 10) % 60).padStart(2, "0") + "00" : end}`, recur: "RRULE:FREQ=DAILY", details: "Rappel de Grossesse " + A.mamanName()});
  return "https://calendar.google.com/calendar/render?" + q.toString();
}
GMX.actions.vitToday = el => {
  const iso = A.fmtISO(A.today()), on = !(A.S.vitamines.jours || {})[iso];
  A.metaSet("vitamines", "jours", iso, on ? true : null);
  if (on){ A.burst(...A.centerOf(el), ["💊", "💚", "✨"], 10); A.buzz(15); }
  A.render();
};
GMX.actions.vitDay = el => { const iso = el.dataset.day, on = !(A.S.vitamines.jours || {})[iso]; A.metaSet("vitamines", "jours", iso, on ? true : null); A.render(); };
GMX.onInput = e => {
  if (e.target.id === "vitHeure"){ A.UI.vitHeure = e.target.value || "09:00"; A.saveUI(); const a = $("#vitCal"); if (a) a.href = vitCalLink(A.UI.vitHeure); }
};
function icsEsc(s){ return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
GMX.actions.icsExport = () => {
  const up = A.values("rdv").filter(r => !r.fait && r.date >= A.fmtISO(A.today()));
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const ev = up.map(r => {
    const d = r.date.replace(/-/g, "");
    let dt;
    if (r.heure){ const [h, m] = r.heure.split(":").map(Number); const e = new Date(2000, 0, 1, h + 1, m); dt = `DTSTART:${d}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00\r\nDTEND:${d}T${String(e.getHours()).padStart(2, "0")}${String(e.getMinutes()).padStart(2, "0")}00`; }
    else dt = `DTSTART;VALUE=DATE:${d}\r\nDTEND;VALUE=DATE:${A.fmtISO(A.addDays(A.parseD(r.date), 1)).replace(/-/g, "")}`;
    return ["BEGIN:VEVENT", `UID:${r.id}@grossesse-marina`, `DTSTAMP:${stamp}`, dt, `SUMMARY:${icsEsc(r.titre)}`, r.lieu ? `LOCATION:${icsEsc(r.lieu)}` : "", r.notes ? `DESCRIPTION:${icsEsc(r.notes)}` : "",
      "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:Demain : ${icsEsc(r.titre)}`, "END:VALARM",
      ...(r.heure ? ["BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(r.titre)} dans 2 h`, "END:VALARM"] : []), "END:VEVENT"].filter(Boolean).join("\r\n");
  });
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Grossesse Marina//FR", "CALSCALE:GREGORIAN", ...ev, "END:VCALENDAR"].join("\r\n");
  shareFile(new File([ics], "rendez-vous-grossesse.ics", {type: "text/calendar"}), "Rendez-vous de grossesse");
};

/* ================= C'est le moment ! ================= */
GMX.views.urgence = () => {
  const p = A.S.profil, ck = A.lsGet("urgCheck") || {}, eaux = A.lsGet("urgEaux");
  const maps = p.matAdr ? "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(p.matAdr) : "";
  const msg = `C'est le moment 💜 On part à la maternité${p.matNom ? " (" + p.matNom + ")" : ""}.`;
  const items = ["Valise de maternité", "Dossier de suivi et carte Vitale", "Téléphone et chargeur", "Siège auto dans la voiture", "Noter l'heure du début des contractions"];
  return `<section class="urg-head"><h2>C'est le moment ?</h2><p>Respire. Tout est là.</p></section>
  ${p.matTel || p.matAdr ? `<section class="card stack"><div class="eyebrow">Maternité</div><h3>${esc(p.matNom || "Ma maternité")}</h3>${p.matAdr ? `<p class="muted">${esc(p.matAdr)}</p>` : ""}
    <div class="urg-actions">${p.matTel ? `<a class="btn" href="tel:${esc(p.matTel.replace(/\s/g, ""))}">📞 Appeler · ${esc(p.matTel)}</a>` : ""}${maps ? `<a class="btn mint" href="${esc(maps)}" target="_blank" rel="noopener">🗺️ Itinéraire</a>` : ""}</div></section>`
    : `<button class="card tile" data-act="openSettingsUrg"><span class="ico">🏥</span><div><h3>Ajoute ta maternité</h3><p>Nom, adresse et téléphone des urgences, dans les réglages.</p></div></button>`}
  <section class="card stack"><div class="eyebrow">Prévenir ${esc(A.papaName())}</div>
    <div class="urg-actions">${p.telPapa ? `<a class="btn" href="sms:${esc(p.telPapa.replace(/\s/g, ""))}?body=${encodeURIComponent(msg)}">💬 SMS</a><a class="btn ghost" href="tel:${esc(p.telPapa.replace(/\s/g, ""))}">📞 Appeler</a>` : ""}<a class="btn ghost" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp</a></div>
    ${p.telPapa ? "" : `<p class="muted" style="font-size:13px">Ajoute son numéro dans les réglages pour l'appeler ou lui écrire d'un geste.</p>`}</section>
  <section class="card stack"><div class="eyebrow">Perte des eaux</div>
    ${eaux ? `<p>Notée à <b>${new Date(eaux).toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"})}</b> le ${new Date(eaux).toLocaleDateString("fr-FR")}.</p>` : ""}
    <div class="row"><button class="btn small" data-act="urgEaux">${eaux ? "Mettre à jour l'heure" : "Noter l'heure maintenant"}</button>${eaux ? `<button class="btn small ghost" data-act="urgEauxClear">Effacer</button>` : ""}</div>
    <p class="muted" style="font-size:13.5px">Liquide clair : on part à la maternité sans urgence extrême. Liquide teinté (vert, marron) ou avec du sang : appelle tout de suite.</p></section>
  <section class="card"><div class="eyebrow" style="margin-bottom:6px">Avant de partir</div><div class="list">${items.map((t, i) => `<div class="item ${ck[i] ? "done" : ""}" style="align-items:center"><button class="check ${ck[i] ? "on" : ""}" data-act="urgCk" data-i="${i}" aria-label="${esc(t)}"></button><div class="body title" style="font-weight:500">${esc(t)}</div></div>`).join("")}</div></section>
  <div class="grid2"><button class="card tile" data-gt-go="outils"><span class="ico">⏱️</span><div><h3>Chrono contractions</h3><p>Mesure leur durée et leur écart</p></div></button>
    <a class="card tile urg-15" href="tel:15"><span class="ico">🚑</span><div><h3>Urgence grave : le 15</h3><p>Ou le 112 depuis un portable</p></div></a></div>`;
};
GMX.actions.urgEaux = () => { A.lsSet("urgEaux", Date.now()); A.render(); };
GMX.actions.urgEauxClear = () => { A.lsSet("urgEaux", null); A.render(); };
GMX.actions.urgCk = el => { const ck = A.lsGet("urgCheck") || {}; ck[el.dataset.i] = !ck[el.dataset.i]; A.lsSet("urgCheck", ck); A.render(); };
GMX.actions.openSettingsUrg = () => { const b = $("#openSettings"); if (b) b.click(); setTimeout(() => { const f = $("#sMatNom"); if (f) f.scrollIntoView({block: "center"}); }, 150); };

/* ================= Espace papa ================= */
GMX.views.papa = () => {
  const p = A.preg(), tip = p && PAPA_TIPS.find(([a, b]) => p.sa >= a && p.sa <= b);
  const list = A.values("taches").sort((a, b) => (!!a.fait - !!b.fait) || (a.at || 0) - (b.at || 0));
  const have = new Set(list.map(t => key(t.texte)));
  const sugg = PAPA_TACHES.filter(t => !have.has(key(t)));
  return `<div class="sectionhead"><h2>Espace ${esc(A.papaName())}</h2><p class="muted">Un conseil par semaine et la liste des choses à préparer.</p></div>
  ${tip ? `<section class="card papa-tip-big"><div class="eyebrow">${p.sa} SA · cette semaine</div><p>${esc(tip[2])}</p></section>` : ""}
  <form class="card row" id="tForm" style="align-items:flex-end"><label class="f" style="flex:3 1 200px">Nouvelle tâche<input type="text" id="tTxt" required maxlength="120" placeholder="Acheter la poussette"></label>
    <label class="f">Pour<select id="tQui"><option value="lui">${esc(A.papaName())}</option><option value="elle">${esc(A.mamanName())}</option><option value="deux">Les deux</option></select></label><button class="btn" type="submit">Ajouter</button></form>
  ${sugg.length ? `<div class="sugg">${sugg.map(t => `<button data-act="tSugg" data-t="${esc(t)}">+ ${esc(t)}</button>`).join("")}</div>` : ""}
  <section class="card"><div class="list">${list.length ? list.map(t => `<div class="item ${t.fait ? "done" : ""}" style="align-items:center"><button class="check ${t.fait ? "on" : ""}" data-act="tToggle" data-id="${esc(t.id)}" aria-label="Fait"></button><div class="body"><div class="title" style="font-weight:500">${esc(t.texte)}</div><div class="muted" style="font-size:12.5px">${t.qui === "elle" ? esc(A.mamanName()) : t.qui === "deux" ? "Les deux" : esc(A.papaName())}</div></div><button class="x" data-act="tDel" data-id="${esc(t.id)}" aria-label="Supprimer">×</button></div>`).join("") : `<p class="muted" style="padding-block:10px">Aucune tâche. Pioche dans les idées ci-dessus.</p>`}</div></section>`;
};
GMX.submits.tForm = (f, val) => { const t = val("tTxt").trim(); if (!t) return; A.putItem("taches", {id: A.uid(), texte: t, qui: val("tQui"), fait: false, at: Date.now()}); A.render(); };
GMX.actions.tSugg = el => { A.putItem("taches", {id: A.uid(), texte: el.dataset.t, qui: "lui", fait: false, at: Date.now()}); A.render(); };
GMX.actions.tToggle = el => { const t = A.S.taches[el.dataset.id]; if (t){ if (!t.fait) A.burst(...A.centerOf(el), ["✅", "💪", "✨"], 10); A.patchItem("taches", t.id, {fait: !t.fait}); A.render(); } };
GMX.actions.tDel = el => { A.delItem("taches", el.dataset.id); A.render(); };

/* ================= Liste de naissance & budget ================= */
const eur = n => (n || 0).toLocaleString("fr-FR", {style: "currency", currency: "EUR", maximumFractionDigits: 0});
GMX.views.achats = () => {
  const list = A.values("achats");
  const tot = s => list.filter(x => !s || x.statut === s).reduce((a, x) => a + (+x.prix || 0), 0);
  const have = new Set(list.map(x => key(x.nom)));
  const sugg = ACHATS_SUGG.filter(([n]) => !have.has(key(n)));
  const st = {a: "À acheter", b: "Acheté", o: "Offert"};
  return `<div class="sectionhead"><h2>Liste & budget</h2><p class="muted">Tout ce qu'il faut pour l'arrivée de bébé, ce qui est acheté, et ce qu'on vous offre.</p></div>
  <div class="budget"><div><span>Prévu</span><b>${eur(tot())}</b></div><div><span>Dépensé</span><b>${eur(tot("b"))}</b></div><div><span>Offert</span><b>${eur(tot("o"))}</b></div><div><span>Reste</span><b>${eur(tot("a"))}</b></div></div>
  <form class="card stack" id="aForm"><div class="row" style="align-items:flex-end"><label class="f" style="flex:3 1 180px">Article<input type="text" id="aNom" required maxlength="80" placeholder="Poussette"></label>
    <label class="f">Prix (€)<input type="number" id="aPrix" min="0" step="1" placeholder="250"></label></div>
    <div class="row" style="align-items:flex-end"><label class="f">Catégorie<select id="aCat">${ACHAT_CATS.map(c => `<option>${c}</option>`).join("")}</select></label><button class="btn" type="submit">Ajouter</button></div></form>
  ${sugg.length ? `<details class="g"><summary><h3>Idées d'indispensables (${sugg.length})</h3></summary><div class="gbody"><div class="sugg">${sugg.map(([n, c]) => `<button data-act="aSugg" data-n="${esc(n)}" data-c="${esc(c)}">+ ${esc(n)}</button>`).join("")}</div></div></details>` : ""}
  ${ACHAT_CATS.filter(c => list.some(x => x.cat === c)).map(c => `<section class="card"><h3 style="margin-bottom:4px">${c}</h3><div class="list">${list.filter(x => x.cat === c).sort((a, b) => a.statut.localeCompare(b.statut) || a.nom.localeCompare(b.nom, "fr")).map(x => `<div class="item achat ${x.statut !== "a" ? "done" : ""}">
      <div class="body"><div class="title">${esc(x.nom)}</div>${x.statut === "o" && x.par ? `<div class="muted" style="font-size:12.5px">Offert par ${esc(x.par)}</div>` : ""}</div>
      <input class="prix" type="number" min="0" step="1" value="${x.prix || ""}" placeholder="€" data-achat-prix="${esc(x.id)}" aria-label="Prix">
      <button class="pill st-${x.statut}" data-act="aStat" data-id="${esc(x.id)}">${st[x.statut]}</button>
      <button class="x" data-act="aDel" data-id="${esc(x.id)}" aria-label="Supprimer">×</button></div>`).join("")}</div></section>`).join("")}`;
};
GMX.submits.aForm = (f, val) => { const n = val("aNom").trim(); if (!n) return; A.putItem("achats", {id: A.uid(), nom: n, prix: +val("aPrix") || 0, cat: val("aCat"), statut: "a", at: Date.now()}); A.render(); };
GMX.actions.aSugg = el => { A.putItem("achats", {id: A.uid(), nom: el.dataset.n, prix: 0, cat: el.dataset.c, statut: "a", at: Date.now()}); A.render(); };
GMX.actions.aDel = el => { A.delItem("achats", el.dataset.id); A.render(); };
GMX.actions.aStat = el => {
  const x = A.S.achats[el.dataset.id]; if (!x) return;
  const next = {a: "b", b: "o", o: "a"}[x.statut];
  if (next === "o"){
    A.openSheet(`<form id="offForm" class="stack" data-id="${esc(x.id)}"><div class="row"><h3>Offert par…</h3><span class="spacer"></span><button type="button" class="iconbtn" data-act="closeSheet" aria-label="Fermer">✕</button></div>
      <label class="f">Qui l'offre ?<input type="text" id="offPar" maxlength="60" placeholder="Mamie Annie"></label><button class="btn" type="submit">Enregistrer</button></form>`);
    return;
  }
  A.patchItem("achats", x.id, {statut: next}); A.render();
};
GMX.submits.offForm = (f, val) => { A.patchItem("achats", f.dataset.id, {statut: "o", par: val("offPar").trim()}); A.closeSheet(); A.render(); A.toast("Merci " + (val("offPar").trim() || "") + " 💜"); };
document.addEventListener("change", e => { const id = e.target.dataset && e.target.dataset.achatPrix; if (id){ A.patchItem("achats", id, {prix: +e.target.value || 0}); A.render(); } });

/* ================= Duel de prénoms ================= */
let duelQueue = [];
function duelPool(){
  const r = role(), seen = (A.S.duel[r] || {}), sexe = A.S.profil.sexe;
  const sx = sexe ? [sexe, "X"] : ["F", "M", "X"];
  const pool = [];
  const add = (n, s) => { if (!seen[key(n)] && !pool.some(x => key(x.n) === key(n))) pool.push({n, s}); };
  // les prénoms aimés par l'autre passent en premier
  for (const it of A.values("prenoms")) if (it[other(r)] && !it[r]) add(it.prenom, it.sexe);
  for (const it of A.values("prenoms")) if (!it[r]) add(it.prenom, it.sexe);
  const rest = [];
  for (const s of sx){ (window.SUGG && SUGG[s] || []).forEach(n => rest.push({n, s})); (EXTRA_NAMES[s] || []).forEach(n => rest.push({n, s})); }
  for (let i = rest.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  rest.forEach(x => add(x.n, x.s));
  return pool;
}
GMX.views.duel = () => {
  const r = role();
  if (!r) return `<div class="sectionhead"><h2>Duel de prénoms</h2><p class="muted">Chacun swipe de son côté. Quand vous aimez tous les deux le même prénom, c'est un match !</p></div>
    <section class="card stack"><h3>Qui joue sur ce téléphone ?</h3><div class="row"><button class="btn" data-act="duelRole" data-r="elle">${esc(A.mamanName())}</button><button class="btn mint" data-act="duelRole" data-r="lui">${esc(A.papaName())}</button></div></section>`;
  if (!duelQueue.length || duelQueue._role !== r){ duelQueue = duelPool(); duelQueue._role = r; }
  const cur = duelQueue[0], matches = A.values("prenoms").filter(n => n.elle && n.lui);
  const nom = A.S.profil.nom ? " " + A.S.profil.nom.toUpperCase() : "";
  return `<div class="sectionhead"><h2>Duel de prénoms</h2><p class="muted">C'est au tour de <b>${esc(roleName(r))}</b>. Glisse à droite si tu aimes, à gauche sinon.</p></div>
  <div class="deck" id="deck">${cur ? `<div class="swipe" id="swipe" data-n="${esc(cur.n)}" data-s="${esc(cur.s)}">
      <span class="sex ${esc(cur.s)}">${cur.s === "X" ? "F/G" : cur.s === "F" ? "F" : "G"}</span>
      <div class="sw-name">${esc(cur.n)}</div>${nom ? `<div class="muted">${esc(cur.n + nom)}</div>` : ""}
      ${A.values("prenoms").some(it => key(it.prenom) === key(cur.n) && it[other(r)]) ? `<div class="pill" style="margin-top:10px">💡 Indice : ${esc(roleName(other(r)))} a un avis…</div>` : ""}
      <i class="stamp like">J'AIME</i><i class="stamp nope">BOF</i></div>`
    : `<div class="card empty"><span>🎉</span><p class="muted">Tu as vu tous les prénoms proposés ! Ajoute-en dans l'onglet Prénoms.</p></div>`}</div>
  ${cur ? `<div class="duel-btns"><button class="round nope" data-act="duelVote" data-v="pass" aria-label="Bof">✕</button><button class="round like" data-act="duelVote" data-v="like" aria-label="J'aime">♥</button></div>` : ""}
  <section class="card"><div class="row"><h3>Vos matchs 💞</h3><span class="spacer"></span><span class="mono muted">${matches.length}</span></div>
    <div class="sugg" style="margin-top:8px">${matches.length ? matches.map(m => `<span class="pill" style="font-size:14px;padding:6px 12px">${esc(m.prenom)}</span>`).join("") : `<p class="muted">Pas encore de match.</p>`}</div></section>
  <button class="btn small ghost" data-act="duelRole" data-r="">Changer de joueur</button>`;
};
GMX.actions.duelRole = el => { A.UI.role = el.dataset.r; A.saveUI(); duelQueue = []; A.render(); };
function duelVote(v){
  const card = $("#swipe"); if (!card) return;
  const r = role(), n = card.dataset.n, s = card.dataset.s;
  card.classList.add(v === "like" ? "out-right" : "out-left");
  A.buzz(v === "like" ? 18 : 8);
  A.metaSet("duel", r, key(n), v);
  let match = false;
  if (v === "like"){
    let it = A.values("prenoms").find(x => key(x.prenom) === key(n));
    if (!it){ it = {id: A.uid(), prenom: n, sexe: s, elle: false, lui: false}; A.putItem("prenoms", it); }
    A.patchItem("prenoms", it.id, {[r]: true});
    match = !!A.S.prenoms[it.id][other(r)];
  }
  duelQueue.shift();
  setTimeout(() => {
    A.render();
    if (match){
      A.openSheet(`<div class="match"><div class="eyebrow">C'est un match !</div><div class="match-name">${esc(n)}</div><p>Vous aimez tous les deux ce prénom 💞</p><button class="btn" data-act="closeSheet">Continuer</button></div>`);
      A.burst(innerWidth / 2, innerHeight / 2, ["💞", "💜", "💚", "✨", "🌸"], 40);
    }
  }, 260);
}
GMX.actions.duelVote = el => duelVote(el.dataset.v);
// glisser la carte au doigt
let drag = null;
document.addEventListener("pointerdown", e => { const c = e.target.closest && e.target.closest("#swipe"); if (!c) return; drag = {c, x: e.clientX, dx: 0}; c.setPointerCapture(e.pointerId); c.style.transition = "none"; });
document.addEventListener("pointermove", e => {
  if (!drag) return; drag.dx = e.clientX - drag.x;
  drag.c.style.transform = `translateX(${drag.dx}px) rotate(${drag.dx / 18}deg)`;
  drag.c.querySelector(".like").style.opacity = Math.max(0, drag.dx / 100); drag.c.querySelector(".nope").style.opacity = Math.max(0, -drag.dx / 100);
});
document.addEventListener("pointerup", () => {
  if (!drag) return; const {c, dx} = drag; drag = null; c.style.transition = "";
  if (Math.abs(dx) > 90) duelVote(dx > 0 ? "like" : "pass");
  else { c.style.transform = ""; c.querySelector(".like").style.opacity = 0; c.querySelector(".nope").style.opacity = 0; }
});

/* ================= Cœur de bébé (son) ================= */
const Heart = {on: false, ctx: null, timer: null, next: 0};
function thump(ctx, t, f0, gain, dur){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * .55, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + .02);
  // souffle façon doppler
  const n = ctx.createBufferSource(), len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  n.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 220; bp.Q.value = .9;
  const ng = ctx.createGain(); ng.gain.value = gain * .55;
  n.connect(bp).connect(ng).connect(ctx.destination); n.start(t);
}
function heartStart(bpm){
  if (!Heart.ctx){ const C = window.AudioContext || window.webkitAudioContext; if (!C){ A.toast("Son indisponible sur ce téléphone"); return; } Heart.ctx = new C(); }
  const ctx = Heart.ctx; ctx.resume && ctx.resume();
  Heart.on = true; Heart.bpm = bpm; Heart.next = ctx.currentTime + .1;
  clearInterval(Heart.timer);
  Heart.timer = setInterval(() => {
    const per = 60 / Heart.bpm;
    while (Heart.next < ctx.currentTime + .25){ thump(ctx, Heart.next, 70, .9, .14); thump(ctx, Heart.next + per * .32, 58, .55, .12); Heart.next += per; }
  }, 60);
}
function heartStop(){ Heart.on = false; clearInterval(Heart.timer); }
GMX.heartToggle = bpm => { if (Heart.on) heartStop(); else heartStart(bpm); return Heart.on; };
GMX.actions.heart = () => {
  const p = A.preg(), sa = (window.B3SA) || (p ? p.sa : 20);
  const bpm = window.Bebe3D ? Bebe3D.bpmAt(sa) : bpmApprox(sa);
  const on = GMX.heartToggle(bpm);
  A.toast(on ? "💓 " + bpm + " battements par minute" : "Son arrêté");
  if (A.UI.tab === "accueil") A.render();
  document.querySelectorAll("[data-act=heart]").forEach(b => b.classList.toggle("playing", on));
};
document.addEventListener("visibilitychange", () => { if (document.hidden && Heart.on){ heartStop(); document.querySelectorAll("[data-act=heart]").forEach(b => b.classList.remove("playing")); } });

/* ================= Navigation interne & rendu ================= */
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-gt-go]");
  if (b){ e.preventDefault(); e.stopPropagation(); A.go("guide", b.dataset.gtGo); }
  const lv = e.target.closest && e.target.closest("[data-sym]");
  if (lv){ lv.parentNode.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === lv)); A.buzz(5); }
}, true);
GMX.afterRender = () => {
  if (A.UI.tab !== "guide") return;
  if (A.UI.guideTab === "compte") tickCountdown();
  if (A.UI.guideTab === "fairepart") drawFairePart();
};
})();
