// Ar'Ty Mad — galerie : photos gérées depuis admin.html (data/galerie.json), filtres et visionneuse
(() => {
  const grid = document.querySelector('.g-grid');
  let filter = 'tout';

  const items = () => [...grid.querySelectorAll('.g-item')];
  const applyFilter = () => items().forEach((it) => { it.hidden = filter !== 'tout' && it.dataset.cat !== filter; });

  document.querySelectorAll('.g-filter').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.f;
    document.querySelectorAll('.g-filter').forEach((x) => x.setAttribute('aria-pressed', x === b));
    applyFilter();
  }));

  // Photo touchée : visionneuse sur les photos du filtre en cours
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.g-open');
    if (!btn) return;
    const visible = items().filter((it) => !it.hidden);
    const list = visible.map((it) => {
      const img = it.querySelector('img');
      return { src: img.currentSrc || img.src, alt: img.alt, caption: it.querySelector('.g-cap').textContent };
    });
    ArtyViewer.open(list, visible.indexOf(btn.closest('.g-item')), btn);
  });

  // Le HTML de la page reste en secours si le fichier publié est illisible.
  ArtyGalerie.load().then((data) => { ArtyGalerie.render(data, grid); applyFilter(); }).catch(() => {});
})();
