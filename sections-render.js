// Ar'Ty Mad — affichage du livre d'or (data/avis.json) et de la galerie (data/galerie.json).
// Partagé par index.html, galerie.html et la page de gestion (admin.html).
(() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const star = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.7l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z"/></svg>';

  // Données intégrées à la page (aperçu hors ligne), sinon le fichier publié.
  const load = async (url, inlineId) => {
    const inline = document.getElementById(inlineId);
    if (inline) return JSON.parse(inline.textContent);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} : ${res.status}`);
    return res.json();
  };

  // ---------- Livre d'or ----------
  const review = (a, i) => {
    const note = Number(a.note);
    const meta = ['Avis Google', a.contexte].filter(Boolean).map(esc).join(' · ');
    const photos = (a.photos || []).filter((p) => p.src);
    return `
        <article class="avis">
          ${note >= 1 && note <= 5 ? `<p class="avis__stars" role="img" aria-label="${note} étoile${note > 1 ? 's' : ''} sur 5">${star.repeat(note)}</p>` : ''}
          <blockquote class="avis__texte"><p>${esc(a.texte)}</p></blockquote>
          <p class="avis__meta">${meta}</p>
          ${photos.length ? `<div class="avis__photos">${photos.map((p, j) => `<button type="button" class="avis__photo" data-avis="${i}" data-photo="${j}" aria-label="Agrandir : ${esc(p.alt || 'photo du client')}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy"></button>`).join('')}</div>` : ''}
        </article>`;
  };

  const avisHtml = (data) => {
    const list = (data.avis || []).filter((a) => String(a.texte || '').trim());
    const half = Math.ceil(list.length / 2);
    const link = data.lienGoogle ? `<a class="btn livre__more" href="${esc(data.lienGoogle)}" target="_blank" rel="noopener">Voir tous nos avis sur Google</a>` : '';
    return `
      <div class="page page--left">
        <h2 class="title" id="t-avis">Le livre d'or</h2>
        <p class="livre__intro">Ce que nos clients écrivent sur Google.</p>${list.slice(0, half).map((a, i) => review(a, i)).join('')}
      </div>
      <div class="page page--right">${list.slice(half).map((a, i) => review(a, i + half)).join('')}
        ${link}
      </div>`;
  };

  // Photos d'un avis, au format de la visionneuse.
  const avisPhotos = (data, i) => {
    const list = (data.avis || []).filter((a) => String(a.texte || '').trim());
    return (list[i]?.photos || []).filter((p) => p.src).map((p) => ({ src: p.src, alt: p.alt, caption: p.alt }));
  };

  // ---------- Galerie ----------
  const galerieHtml = (data) => (data.photos || []).filter((p) => p.src).map((p, i) => `
      <li class="g-item" data-cat="${esc(p.categorie)}"><button type="button" class="g-open" data-i="${i}"><img src="${esc(p.src)}" alt="${esc(p.alt || p.legende)}" loading="lazy"><span class="g-cap">${esc(p.legende)}</span></button></li>`).join('');

  window.ArtyAvis = {
    load: (url = 'data/avis.json') => load(url, 'avis-data'),
    html: avisHtml,
    render: (data, section) => { section.innerHTML = avisHtml(data); section.dataset.ready = '1'; },
    photos: avisPhotos,
  };
  window.ArtyGalerie = {
    load: (url = 'data/galerie.json') => load(url, 'galerie-data'),
    html: galerieHtml,
    render: (data, list) => { list.innerHTML = galerieHtml(data); },
  };
})();
