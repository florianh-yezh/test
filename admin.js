// Ar'Ty Mad — gestion de la carte.
// Modifie data/menus.json et le publie sur GitHub ; le site l'affiche avec la mise en page habituelle.
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const { esc } = window.ArtyMenus;

  const DRAFT_KEY = 'artymad-admin-brouillon';
  const GH_KEY = 'artymad-admin-github';
  const GH_DEFAULT = { owner: 'florianh-yezh', repo: 'test', branch: 'site-artymad', path: 'data/menus.json', token: '' };

  // localStorage peut être indisponible (navigation privée) : on continue sans.
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sans mémoire locale */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* idem */ } },
  };

  let gh = { ...GH_DEFAULT, ...(store.get(GH_KEY) || {}) };
  let state = null;      // carte en cours de modification
  let published = null;  // dernière version en ligne (JSON texte)
  let sha = null;        // version du fichier sur GitHub
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
      ['github', 'Connexion GitHub'],
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

  const githubPanel = () => `
      <h2>Connexion GitHub</h2>
      <p>« Publier » enregistre la carte dans votre dépôt GitHub ; le site se met à jour tout seul en une à deux minutes. La clé reste uniquement sur cet appareil.</p>
      <label class="adm-field"><span>Clé d'accès GitHub</span>
        <input type="password" data-g="token" value="${esc(gh.token)}" autocomplete="off" spellcheck="false" placeholder="github_pat_…">
      </label>
      <div class="adm-row">
        ${field('Compte', gh.owner, 'data-g="owner"')}
        ${field('Dépôt', gh.repo, 'data-g="repo"')}
      </div>
      <div class="adm-row">
        ${field('Branche', gh.branch, 'data-g="branch"')}
        ${field('Fichier', gh.path, 'data-g="path"')}
      </div>
      <div class="adm-actions">
        <button type="button" class="btn" data-act="gh-save">Enregistrer et charger la carte en ligne</button>
        <button type="button" class="btn btn--ghost" data-act="gh-forget">Oublier la clé sur cet appareil</button>
      </div>
      <details class="adm-help">
        <summary>Comment obtenir une clé d'accès ?</summary>
        <ol>
          <li>Sur github.com, ouvrez <strong>Settings → Developer settings → Personal access tokens → Fine-grained tokens</strong>.</li>
          <li><strong>Generate new token</strong> ; dans « Repository access », choisissez <strong>Only select repositories</strong> puis le dépôt <code>${esc(gh.repo)}</code>.</li>
          <li>Dans « Permissions », mettez <strong>Contents</strong> sur <strong>Read and write</strong>. Rien d'autre.</li>
          <li>Copiez la clé (elle commence par <code>github_pat_</code>) et collez-la ci-dessus.</li>
        </ol>
      </details>
      <div class="adm-actions">
        <button type="button" class="btn btn--ghost" data-act="download">Télécharger le fichier menus.json</button>
        <button type="button" class="btn btn--ghost" data-act="revert">Annuler mes modifications</button>
      </div>`;

  const renderPanel = () => {
    if (tab.startsWith('m')) panel.innerHTML = menuPanel(+tab.slice(1));
    else if (tab === 'enfant') panel.innerHTML = enfantPanel();
    else if (tab === 'note') panel.innerHTML = notePanel();
    else panel.innerHTML = githubPanel();
    panel.querySelectorAll('textarea').forEach(autosize);
  };

  function autosize(t) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; }

  // ---------- Saisie ----------
  panel.addEventListener('input', (e) => {
    const t = e.target;
    if (t.tagName === 'TEXTAREA') autosize(t);
    t.classList.remove('is-invalid');
    if (t.dataset.g) { gh[t.dataset.g] = t.value.trim(); return; }
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

    if (act === 'gh-save') { store.set(GH_KEY, gh); await loadPublished(true); return; }
    if (act === 'gh-forget') { gh.token = ''; store.set(GH_KEY, { ...gh, token: '' }); renderPanel(); say('ok', '<p>Clé effacée de cet appareil.</p>'); return; }
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

  // ---------- GitHub ----------
  const api = (path, opts = {}) => fetch(`https://api.github.com/repos/${encodeURIComponent(gh.owner)}/${encodeURIComponent(gh.repo)}/${path}`, {
    ...opts,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${gh.token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) },
  });
  const contentsPath = () => `contents/${gh.path.split('/').map(encodeURIComponent).join('/')}`;
  const b64encode = (str) => { const bytes = new TextEncoder().encode(str); let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); }); return btoa(bin); };
  const b64decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
  const ghError = (status) => ({
    401: 'La clé GitHub est refusée : elle est peut-être expirée ou mal copiée.',
    403: "La clé n'a pas le droit d'écrire dans ce dépôt (permission « Contents : Read and write »).",
    404: 'Dépôt, branche ou fichier introuvable : vérifiez la connexion GitHub.',
    409: "Le fichier a changé entre-temps sur GitHub. Rechargez la carte en ligne puis refaites vos modifications.",
    422: 'GitHub a refusé la modification. Rechargez la page et réessayez.',
  }[status] || `GitHub a répondu une erreur (${status}). Réessayez dans un instant.`);

  async function fetchFromGitHub() {
    const res = await api(`${contentsPath()}?ref=${encodeURIComponent(gh.branch)}`);
    if (!res.ok) throw Object.assign(new Error(ghError(res.status)), { status: res.status });
    const json = await res.json();
    sha = json.sha;
    return b64decode(json.content);
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
    if (!gh.token) {
      tab = 'github'; renderTabs(); renderPanel();
      say('error', "<p>Pour publier, collez d'abord votre clé d'accès GitHub (une seule fois sur cet appareil).</p>");
      $('[data-g="token"]', panel).focus();
      return;
    }
    const btn = $('#publish');
    btn.disabled = true; btn.textContent = 'Publication…';
    try {
      if (!sha) await fetchFromGitHub().catch((err) => { if (err.status !== 404) throw err; });
      const body = serialize(state);
      const res = await api(contentsPath(), {
        method: 'PUT',
        body: JSON.stringify({ message: 'Carte mise à jour depuis la page de gestion', content: b64encode(body), branch: gh.branch, ...(sha ? { sha } : {}) }),
      });
      if (!res.ok) throw Object.assign(new Error(ghError(res.status)), { status: res.status });
      sha = (await res.json()).content.sha;
      published = body;
      store.del(DRAFT_KEY);
      refreshState(true);
      say('ok', '<p><strong>Carte publiée.</strong> Le site sera à jour d\'ici une à deux minutes.</p>');
    } catch (err) {
      say('error', `<p><strong>La carte n'a pas été publiée.</strong></p><p>${esc(err.message)}</p>`,
        err.status === 409 ? { label: 'Recharger la carte en ligne', run: () => loadPublished(true) } : null);
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
  async function loadPublished(fromGitHubOnly = false) {
    let text = null;
    if (gh.token) {
      try { text = await fetchFromGitHub(); } catch (err) {
        say('error', `<p><strong>Impossible de lire la carte sur GitHub.</strong></p><p>${esc(err.message)}</p>`);
        if (fromGitHubOnly) return;
      }
    }
    if (text === null) {
      try { text = serialize(await ArtyMenus.load()); } catch {
        say('error', "<p>La carte en ligne est introuvable. Ouvrez cette page depuis le site publié, ou connectez GitHub.</p>");
        tab = 'github';
        state = state || { menus: [], enfant: {}, note: '' };
        renderTabs(); renderPanel();
        return;
      }
    }
    published = serialize(JSON.parse(text));
    const draft = store.get(DRAFT_KEY);
    if (draft && serialize(draft) !== published) {
      state = draft;
      say('ok', fromGitHubOnly
        ? '<p>Connexion réussie. Vos modifications sont conservées : il reste à cliquer sur « Publier sur le site ».</p>'
        : '<p>Vos modifications non publiées ont été retrouvées.</p>', {
        label: 'Repartir de la carte en ligne',
        run: () => { state = JSON.parse(published); store.del(DRAFT_KEY); renderTabs(); renderPanel(); changed(); hush(); },
      });
    } else {
      state = JSON.parse(published);
      store.del(DRAFT_KEY);
      if (fromGitHubOnly) say('ok', '<p>Connexion réussie : la carte en ligne est chargée.</p>');
    }
    if (tab === 'github' && !fromGitHubOnly) tab = 'm0';
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
