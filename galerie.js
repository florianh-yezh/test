// Ar'Ty Mad — galerie : filtres et visionneuse (clavier, glisser au doigt)
(() => {
  const items = [...document.querySelectorAll('.g-item')];
  const box = document.querySelector('.g-box');
  const img = box.querySelector('img');
  const cap = box.querySelector('figcaption');
  let current = 0;

  // Filtres
  document.querySelectorAll('.g-filter').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.g-filter').forEach((x) => x.setAttribute('aria-pressed', x === b));
    items.forEach((it) => { it.hidden = b.dataset.f !== 'tout' && it.dataset.cat !== b.dataset.f; });
  }));

  const visible = () => items.filter((it) => !it.hidden);
  const show = (i) => {
    const list = visible();
    current = (i + list.length) % list.length;
    const src = list[current].querySelector('img');
    img.src = src.currentSrc || src.src;
    img.alt = src.alt;
    cap.textContent = list[current].querySelector('.g-cap').textContent;
  };

  items.forEach((it) => it.querySelector('.g-open').addEventListener('click', () => {
    show(visible().indexOf(it));
    box.showModal();
  }));
  box.querySelector('.g-box__close').addEventListener('click', () => box.close());
  box.querySelector('.g-box__prev').addEventListener('click', () => show(current - 1));
  box.querySelector('.g-box__next').addEventListener('click', () => show(current + 1));
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  // Rendre le focus à la vignette d'origine
  box.addEventListener('close', () => visible()[current]?.querySelector('.g-open').focus());

  let x0 = null;
  box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
