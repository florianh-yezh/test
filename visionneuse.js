// Ar'Ty Mad — visionneuse plein écran partagée (galerie et photos des avis).
// ArtyViewer.open([{ src, alt, caption }], index, élémentÀRefocaliser)
window.ArtyViewer = (() => {
  let box, img, cap, items = [], current = 0, opener = null;
  const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const build = () => {
    box = document.createElement('dialog');
    box.className = 'viewer';
    box.setAttribute('aria-label', 'Photo agrandie');
    box.innerHTML = `
      <button type="button" class="viewer__close" aria-label="Fermer">${icon('M6 6l12 12M18 6 6 18')}</button>
      <button type="button" class="viewer__nav viewer__prev" aria-label="Photo précédente">${icon('M19 12H5m5-5-5 5 5 5')}</button>
      <figure class="viewer__fig"><img alt=""><figcaption></figcaption></figure>
      <button type="button" class="viewer__nav viewer__next" aria-label="Photo suivante">${icon('M5 12h14m-5-5 5 5-5 5')}</button>`;
    document.body.append(box);
    img = box.querySelector('img');
    cap = box.querySelector('figcaption');
    box.querySelector('.viewer__close').addEventListener('click', () => box.close());
    box.querySelector('.viewer__prev').addEventListener('click', () => show(current - 1));
    box.querySelector('.viewer__next').addEventListener('click', () => show(current + 1));
    box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
    box.addEventListener('close', () => opener?.focus());
    let x0 = null;
    box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  };

  function show(i) {
    current = (i + items.length) % items.length;
    img.src = items[current].src;
    img.alt = items[current].alt || '';
    cap.textContent = items[current].caption || '';
    box.classList.toggle('is-single', items.length < 2);
  }

  return {
    open(list, index = 0, from = null) {
      if (!list.length) return;
      if (!box) build();
      items = list;
      opener = from;
      show(index);
      box.showModal();
    },
  };
})();
