// Ar'Ty Mad — gestion de la carte.
// Modifie data/menus.json et l'enregistre sur l'hébergeur via api/menus.php (protégé par mot de passe) ;
// le site l'affiche avec la mise en page habituelle.
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const { esc } = window.ArtyMenus;

  const DRAFT_KEY = 'artymad-admin-brouillon';
  const PASS_KEY = 'artymad-admin-acces';
  const API = 'api/menus.php';

  // localStorage peut être indisponible (navigation privée) : on continue sans.
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sans mémoire locale */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* idem */ } },
  };

  // Le mot de passe n'est gardé que le temps de la session (fermer l'onglet l'efface).
  const session = {
    get() { try { return sessionStorage.getItem(PASS_KEY) || ''; } catch { return ''; } },
    set(v) { try { v ? sessionStorage.setItem(PASS_KEY, v) : sessionStorage.removeItem(PASS_KEY); } catch { /* sans mémoire */ } },
  };
  let password = session.get();
  let state = null;      // carte en cours de modification
  let published = null;  // dernière version en ligne (JSON texte)
  let tab = 'm0';

  const stateEl = $('#state');
  const notice = $('#notice');
  const panel = $('#panel');
  const preview = $('#preview');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const serialize = (o) => JSON.stringify(o, null, 2) + '\n';
  const isDirty = () => published !== null && serialize(state) !== published;

  // ---------- Statut et messages ----------
  const refreshState = (savedNow = false) => {
    stateEl.className = 'adm-state';
    if (savedNow) { stateEl.textContent = 'Publié'; stateEl.classList.add('is-saved'); return; }
    if (isDirty()) { stateEl.textContent = 'Modifications non publiées'; stateEl.classList.add('is-dirty'); }
    else stateEl.textContent = 'À jour avec le site';
  };
  const say = (kind, html, action) => {
    notice.hidden = false;
    notice.className = `adm-notice is-${kind}`;
    notice.innerHTML = html;
    if (action) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn--ghost'; b.textContent = action.label;
      b.addEventListener('click', action.run);
      notice.append(b);
    }
  };
  const hush = () => { notice.hidden = true; notice.innerHTML = ''; };

  // ---------- Aperçu ----------
  let previewTimer;
  const changed = () => {
    store.set(DRAFT_KEY, state);
    refreshState();
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => ArtyMenus.render(state, preview), 120);
  };

  // ---------- Onglets ----------
  const tabsEl = $('#tabs');
  const renderTabs = () => {
    const items = [
      ...state.menus.map((m, i) => [`m${i}`, m.nom || `Menu ${i + 1}`]),
      ['enfant', state.enfant.nom || 'Menu enfant'],
      ['note', 'Mention sous les menus'],
      ['acces', 'Mot de passe'],
    ];
    tabsEl.innerHTML = items.map(([id, label]) =>
      `<button type="button" role="tab" aria-selected="${id === tab}" data-tab="${id}">${esc(label)}</button>`).join('');
  };
  tabsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    renderTabs();
    renderPanel();
  });

  // ---------- Champs ----------
  const field = (label, value, attrs = '', hint = '') => `
    <label class="adm-field"><span>${label}</span>
      <input type="text" value="${esc(value)}" ${attrs}>
      ${hint ? `<small>${hint}</small>` : ''}
    </label>`;
  const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;

  const menuPanel = (mi) => {
    const m = state.menus[mi];
    return `
      <h2>${esc(m.nom || `Menu ${mi + 1}`)}</h2>
      <p>${mi === 0 ? 'Page de gauche' : 'Page de droite'} de la double page « Menus ».</p>
      <div class="adm-row">
        ${field('Nom du menu', m.nom, 'data-k="nom" required')}
        ${field('Prix', m.prix, 'data-k="prix" required inputmode="text"', 'Ex. : 23 € ou 15€90')}
      </div>
      ${m.rubriques.map((r, ri) => `
        <fieldset class="adm-section" data-r="${ri}">
          <div class="adm-section__head">
            ${field('Rubrique', r.titre, 'data-k="titre"', '')}
            <button type="button" class="icon-btn" data-act="r-up" ${ri === 0 ? 'disabled' : ''} aria-label="Monter la rubrique ${esc(r.titre)}">${icon('up')}</button>
            <button type="button" class="icon-btn" data-act="r-down" ${ri === m.rubriques.length - 1 ? 'disabled' : ''} aria-label="Descendre la rubrique ${esc(r.titre)}">${icon('down')}</button>
            <button type="button" class="icon-btn icon-btn--danger" data-act="r-del" aria-label="Supprimer la rubrique ${esc(r.titre)}">${icon('trash')}</button>
          </div>
          <ol class="adm-dishes">
            ${r.plats.map((p, pi) => `
              ${pi > 0 ? '<li class="adm-dish__or" aria-hidden="true">ou</li>' : ''}
              <li class="adm-dish" data-p="${pi}">
                <textarea rows="1" data-k="plat" aria-label="Plat ${pi + 1} — ${esc(r.titre)}">${esc(p)}</textarea>
                <span class="adm-tools">
                  <button type="button" class="icon-btn" data-act="p-up" ${pi === 0 ? 'disabled' : ''} aria-label="Monter ce plat">${icon('up')}</button>
                  <button type="button" class="icon-btn" data-act="p-down" ${pi === r.plats.length - 1 ? 'disabled' : ''} aria-label="Descendre ce plat">${icon('down')}</button>
                  <button type="button" class="icon-btn icon-btn--danger" data-act="p-del" aria-label="Supprimer ce plat">${icon('trash')}</button>
                </span>
              </li>`).join('')}
          </ol>
          <button type="button" class="link-btn" data-act="p-add">${icon('plus')} Ajouter un plat</button>
        </fieldset>`).join('')}
      <button type="button" class="link-btn" data-act="r-add">${icon('plus')} Ajouter une rubrique (ex. : Desserts)</button>
      ${field('Phrase en bas du menu', m.pied, 'data-k="pied"', 'Laisser vide pour ne rien afficher.')}`;
  };

  const enfantPanel = () => {
    const e = state.enfant;
    return `
      <h2>${esc(e.nom || 'Menu enfant')}</h2>
      <p>La fiche glissée sous la double page.</p>
      <div class="adm-row">
        ${field('Nom', e.nom, 'data-e="nom"')}
        ${field('Prix', e.prix, 'data-e="prix"')}
      </div>
      ${field('Condition (en gras)', e.condition, 'data-e="condition"')}
      <label class="adm-field"><span>Contenu</span><textarea rows="2" data-e="contenu">${esc(e.contenu)}</textarea></label>
      ${field('Petite phrase', e.citation, 'data-e="citation"', 'Laisser vide pour ne rien afficher.')}`;
  };

  const notePanel = () => `
      <h2>Mention sous les menus</h2>
      <label class="adm-field"><span>Texte</span><textarea rows="2" data-n="note">${esc(state.note)}</textarea>
        <small>S'affiche en petit sous la double page.</small></label>`;

  const accessPanel = () => `
      <h2>Mot de passe</h2>
      <p>Il protège la publication de la carte. Il est oublié à la fermeture de l'onglet.</p>
      <label class="adm-field"><span>Mot de passe de gestion</span>
        <input type="password" data-a="password" value="${esc(password)}" autocomplete="current-password">
      </label>
      <div class="adm-actions">
        <button type="button" class="btn" data-act="login">Vérifier le mot de passe</button>
        <button type="button" class="btn btn--ghost" data-act="logout">Oublier</button>
      </div>
      <details class="adm-help">
        <summary>Créer ou changer le mot de passe (installation)</summary>
        <ol>
          <li>Choisissez un mot de passe d'au moins 10 caractères et tapez-le deux fois ci-dessous.</li>
          <li>Copiez les trois lignes générées dans <code>api/config.php</code>, à la place des lignes <code>salt</code>, <code>hash</code> et <code>iterations</code>.</li>
          <li>Renvoyez <code>api/config.php</code> sur l'hébergeur. Le mot de passe n'y figure pas, seulement son empreinte.</li>
        </ol>
        <div class="adm-row adm-setup">
          <label class="adm-field"><span>Nouveau mot de passe</span><input type="password" data-s="p1" autocomplete="new-password"></label>
          <label class="adm-field"><span>Encore une fois</span><input type="password" data-s="p2" autocomplete="new-password"></label>
        </div>
        <button type="button" class="btn btn--ghost" data-act="gen">Générer les lignes pour config.php</button>
        <pre class="adm-code" id="gen-out" hidden></pre>
        <button type="button" class="btn btn--ghost" data-act="copy" hidden>Copier les lignes</button>
      </details>
      <div class="adm-actions">
        <button type="button" class="btn btn--ghost" data-act="download">Télécharger le fichier menus.json</button>
        <button type="button" class="btn btn--ghost" data-act="revert">Annuler mes modifications</button>
      </div>`;

  const renderPanel = () => {
    if (tab.startsWith('m')) panel.innerHTML = menuPanel(+tab.slice(1));
    else if (tab === 'enfant') panel.innerHTML = enfantPanel();
    else if (tab === 'note') panel.innerHTML = notePanel();
    else panel.innerHTML = accessPanel();
    panel.querySelectorAll('textarea').forEach(autosize);
  };

  function autosize(t) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; }

  // ---------- Saisie ----------
  panel.addEventListener('input', (e) => {
    const t = e.target;
    if (t.tagName === 'TEXTAREA') autosize(t);
    t.classList.remove('is-invalid');
    if (t.dataset.a === 'password') { password = t.value; session.set(password); return; }
    if (t.dataset.s) return;
    if (t.dataset.e) state.enfant[t.dataset.e] = t.value;
    else if (t.dataset.n) state.note = t.value;
    else if (tab.startsWith('m')) {
      const m = state.menus[+tab.slice(1)];
      const r = m.rubriques[+t.closest('[data-r]')?.dataset.r];
      if (t.dataset.k === 'plat') r.plats[+t.closest('[data-p]').dataset.p] = t.value;
      else if (t.dataset.k === 'titre') r.titre = t.value;
      else m[t.dataset.k] = t.value;
      if (t.dataset.k === 'nom') { renderTabs(); $('h2', panel).textContent = t.value || 'Menu'; }
    }
    if (t.dataset.e === 'nom') renderTabs();
    changed();
  });

  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };

  panel.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;

    if (act === 'login') {
      try { await send({ action: 'check' }); say('ok', '<p>Mot de passe correct : vous pouvez publier.</p>'); }
      catch (err) { say('error', `<p>${esc(err.message)}</p>`); }
      return;
    }
    if (act === 'logout') { password = ''; session.set(''); renderPanel(); say('ok', '<p>Mot de passe oublié sur cet onglet.</p>'); return; }
    if (act === 'gen') { await generate(); return; }
    if (act === 'copy') {
      const txt = $('#gen-out', panel).textContent;
      try { await navigator.clipboard.writeText(txt); b.textContent = 'Lignes copiées'; } catch { say('error', '<p>Copie impossible : sélectionnez le texte à la main.</p>'); }
      return;
    }
    if (act === 'download') { download(); return; }
    if (act === 'revert') {
      if (!confirm('Revenir à la carte actuellement en ligne ? Vos modifications non publiées seront perdues.')) return;
      state = JSON.parse(published); store.del(DRAFT_KEY); renderTabs(); renderPanel(); changed(); hush(); return;
    }

    const m = state.menus[+tab.slice(1)];
    const ri = +b.closest('[data-r]')?.dataset.r;
    const pi = +b.closest('[data-p]')?.dataset.p;
    let focusSel = null;
    if (act === 'r-add') { m.rubriques.push({ titre: 'Desserts', plats: [''] }); focusSel = `[data-r="${m.rubriques.length - 1}"] [data-k="titre"]`; }
    if (act === 'r-up') move(m.rubriques, ri, -1);
    if (act === 'r-down') move(m.rubriques, ri, 1);
    if (act === 'r-del') {
      const r = m.rubriques[ri];
      if (r.plats.some((p) => p.trim()) && !confirm(`Supprimer la rubrique « ${r.titre} » et ses plats ?`)) return;
      m.rubriques.splice(ri, 1);
    }
    if (act === 'p-add') { m.rubriques[ri].plats.push(''); focusSel = `[data-r="${ri}"] [data-p="${m.rubriques[ri].plats.length - 1}"] textarea`; }
    if (act === 'p-up') { move(m.rubriques[ri].plats, pi, -1); focusSel = `[data-r="${ri}"] [data-p="${pi - 1}"] [data-act="p-up"]`; }
    if (act === 'p-down') { move(m.rubriques[ri].plats, pi, 1); focusSel = `[data-r="${ri}"] [data-p="${pi + 1}"] [data-act="p-down"]`; }
    if (act === 'p-del') {
      const plats = m.rubriques[ri].plats;
      if (plats[pi].trim() && !confirm(`Supprimer « ${plats[pi]} » ?`)) return;
      plats.splice(pi, 1);
      if (!plats.length) plats.push('');
    }
    renderPanel();
    changed();
    if (focusSel) { const el = $(focusSel, panel); if (el && !el.disabled) el.focus(); }
  });

  // ---------- Vérification avant publication ----------
  const check = () => {
    const problems = [];
    state.menus.forEach((m, i) => {
      if (!m.nom.trim()) problems.push([`m${i}`, `Le menu ${i + 1} n'a pas de nom.`, '[data-k="nom"]']);
      if (!m.prix.trim()) problems.push([`m${i}`, `« ${m.nom || `Menu ${i + 1}`} » n'a pas de prix.`, '[data-k="prix"]']);
      if (!m.rubriques.some((r) => r.plats.some((p) => p.trim()))) problems.push([`m${i}`, `« ${m.nom} » ne contient aucun plat.`, null]);
    });
    return problems;
  };

  // ---------- Serveur (api/menus.php) ----------
  async function send(body) {
    if (!password) throw new Error("Saisissez d'abord le mot de passe de gestion.");
    let res;
    try {
      res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error("Le serveur ne répond pas. Ouvrez cette page depuis le site en ligne (hébergement avec PHP).");
    }
    let json = {};
    try { json = await res.json(); } catch {
      throw new Error("Le serveur n'a pas répondu comme prévu : le dossier api/ est-il bien envoyé sur l'hébergeur (avec PHP 8.1 ou plus) ?");
    }
    if (!res.ok) throw Object.assign(new Error(json.error || `Erreur du serveur (${res.status}).`), { status: res.status });
    return json;
  }

  // Empreinte du mot de passe (PBKDF2-SHA256), calculée sur cet appareil, identique à hash_pbkdf2() côté PHP.
  async function generate() {
    const p1 = $('[data-s="p1"]', panel).value;
    const p2 = $('[data-s="p2"]', panel).value;
    if (p1.length < 10) { say('error', '<p>Choisissez un mot de passe d\'au moins 10 caractères.</p>'); return; }
    if (p1 !== p2) { say('error', '<p>Les deux mots de passe ne sont pas identiques.</p>'); return; }
    const iterations = 150000;
    const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(p1), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations }, key, 256);
    const out = $('#gen-out', panel);
    out.textContent = `    'salt'       => '${salt}',\n    'hash'       => '${hex(bits).slice(0, 64)}',\n    'iterations' => ${iterations},`;
    out.hidden = false;
    $('[data-act="copy"]', panel).hidden = false;
    hush();
  }

  $('#publish').addEventListener('click', async () => {
    hush();
    const problems = check();
    if (problems.length) {
      const [t, , sel] = problems[0];
      say('error', `<p><strong>Avant de publier :</strong></p>${problems.map(([, msg]) => `<p>${esc(msg)}</p>`).join('')}`);
      tab = t; renderTabs(); renderPanel();
      if (sel) { const el = $(sel, panel); el.classList.add('is-invalid'); el.focus(); }
      return;
    }
    if (!isDirty()) { say('ok', '<p>Rien à publier : le site affiche déjà cette carte.</p>'); return; }
    if (!password) {
      tab = 'acces'; renderTabs(); renderPanel();
      say('error', '<p>Pour publier, saisissez le mot de passe de gestion.</p>');
      $('[data-a="password"]', panel).focus();
      return;
    }
    const btn = $('#publish');
    btn.disabled = true; btn.textContent = 'Publication…';
    try {
      const res = await send({ action: 'save', data: state });
      // Le serveur nettoie la carte (espaces, plats vides) : on repart de ce qu'il a enregistré.
      state = res.data;
      published = serialize(state);
      renderTabs(); renderPanel();
      ArtyMenus.render(state, preview);
      store.del(DRAFT_KEY);
      refreshState(true);
      say('ok', '<p><strong>Carte publiée.</strong> Elle est déjà visible sur le site.</p>');
    } catch (err) {
      if (err.status === 401) { password = ''; session.set(''); }
      say('error', `<p><strong>La carte n'a pas été publiée.</strong></p><p>${esc(err.message)}</p>`);
    } finally {
      btn.disabled = false; btn.textContent = 'Publier sur le site';
    }
  });

  function download() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([serialize(state)], { type: 'application/json' }));
    a.download = 'menus.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Chargement ----------
  async function loadPublished() {
    let text;
    try { text = serialize(await ArtyMenus.load(`data/menus.json?t=${Date.now()}`)); } catch {
      say('error', "<p>La carte en ligne est introuvable. Ouvrez cette page depuis le site publié.</p>");
      return;
    }
    published = text;
    const draft = store.get(DRAFT_KEY);
    if (draft && serialize(draft) !== published) {
      state = draft;
      say('ok', '<p>Vos modifications non publiées ont été retrouvées.</p>', {
        label: 'Repartir de la carte en ligne',
        run: () => { state = JSON.parse(published); store.del(DRAFT_KEY); renderTabs(); renderPanel(); changed(); hush(); },
      });
    } else {
      state = JSON.parse(published);
      store.del(DRAFT_KEY);
    }
    renderTabs(); renderPanel(); refreshState();
    ArtyMenus.render(state, preview);
  }

  // ---------- Bascule Modifier / Aperçu (mobile) ----------
  document.querySelectorAll('.adm-switch [data-view]').forEach((b) => b.addEventListener('click', () => {
    $('.adm').dataset.view = b.dataset.view;
    document.querySelectorAll('.adm-switch [data-view]').forEach((x) => x.setAttribute('aria-selected', x === b));
  }));

  // Recalcule la hauteur des zones de texte quand la largeur ou la police change.
  const resizeAll = () => panel.querySelectorAll('textarea').forEach(autosize);
  window.addEventListener('resize', resizeAll);
  document.fonts?.ready.then(resizeAll);

  window.addEventListener('beforeunload', (e) => { if (state && isDirty()) e.preventDefault(); });

  loadPublished();
})();
