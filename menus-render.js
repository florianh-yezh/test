// Ar'Ty Mad — affichage des menus à partir de data/menus.json.
// Partagé par le site (index.html) et la page de gestion (admin.html) :
// la mise en page reste exactement celle de la double page « Menus ».
window.ArtyMenus = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Espace insécable devant « € » pour que le prix ne se coupe jamais.
  const price = (s) => esc(s).replace(/\s+€/g, '&nbsp;€');

  const menuPage = (m, side, i) => `
      <article class="page page--${side} menu" aria-labelledby="t-menu-${i}">
        <header class="menu__head">
          <h3 class="title" id="t-menu-${i}">${esc(m.nom)}</h3>
          <p class="price">${price(m.prix)}</p>
        </header>
        ${(m.rubriques || []).filter((r) => r.plats?.some((p) => p.trim())).map((r) => `
        <h4>${esc(r.titre)}</h4>
        <ul class="choices">
          ${r.plats.filter((p) => p.trim()).map((p) => `<li>${esc(p)}</li>`).join('\n          ')}
        </ul>`).join('')}
        ${m.pied ? `<p class="menu__dessert">${esc(m.pied)}</p>` : ''}
      </article>`;

  const html = (data) => {
    const [left, right] = data.menus || [];
    const e = data.enfant;
    return `
      <h2 class="visually-hidden" id="t-menus">Nos menus</h2>
      ${left ? menuPage(left, 'left', 0) : ''}
      ${right ? menuPage(right, 'right', 1) : ''}
      ${e && e.nom ? `
      <aside class="slip" aria-labelledby="t-enfant">
        <h3 class="title" id="t-enfant">${esc(e.nom)} <span class="price">${price(e.prix)}</span></h3>
        <p>${e.condition ? `<strong>${esc(e.condition)}</strong> ` : ''}${esc(e.contenu)}</p>
        ${e.citation ? `<p class="slip__quote">${esc(e.citation)}</p>` : ''}
      </aside>` : ''}
      ${data.note ? `<p class="menus__note">${esc(data.note)}</p>` : ''}`;
  };

  const render = (data, spread) => { spread.innerHTML = html(data); };

  // Données intégrées à la page (aperçu hors ligne), sinon le fichier publié.
  const load = async (url = 'data/menus.json') => {
    const inline = document.getElementById('menus-data');
    if (inline) return JSON.parse(inline.textContent);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`menus.json : ${res.status}`);
    return res.json();
  };

  return { render, load, html, esc };
})();
