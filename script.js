// Ar'Ty Mad — interactions
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Preloader ----------
  document.body.classList.add('is-loading');
  const finishLoading = () => {
    $('.loader').classList.add('is-done');
    document.body.classList.remove('is-loading');
  };
  window.addEventListener('load', () => setTimeout(finishLoading, reduceMotion ? 0 : 1100));
  setTimeout(finishLoading, 3500); // filet de sécurité si une ressource tarde

  // ---------- Année du footer ----------
  $('#year').textContent = new Date().getFullYear();

  // ---------- Navigation : fond au scroll, masquage en descente ----------
  const nav = $('.nav');
  const mobile = $('.mobile-menu');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 60);
    nav.classList.toggle('is-hidden', y > lastY && y > 700 && !mobile.classList.contains('is-open'));
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Lien actif selon la section visible
  const navLinks = $$('.nav__links a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => spy.observe(s));

  // ---------- Menu mobile ----------
  const burger = $('.nav__burger');
  const toggleMenu = (open) => {
    burger.classList.toggle('is-open', open);
    mobile.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    mobile.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => toggleMenu(!mobile.classList.contains('is-open')));
  $$('a', mobile).forEach((a) => a.addEventListener('click', () => toggleMenu(false)));

  // ---------- Apparitions au scroll ----------
  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealer.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach((el) => {
    // décalage en cascade entre éléments frères
    const siblings = $$('.reveal', el.parentElement);
    el.style.transitionDelay = `${siblings.indexOf(el) * 90}ms`;
    revealer.observe(el);
  });

  // ---------- Compteurs ----------
  const counter = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const from = target > 1000 ? target - 60 : 0;
      const start = performance.now();
      const dur = 1800;
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counter.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => counter.observe(el));

  // ---------- Parallaxe ----------
  const parallax = $$('[data-parallax]');
  if (!reduceMotion && parallax.length) {
    const update = () => {
      const vh = window.innerHeight;
      parallax.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const offset = (r.top + r.height / 2 - vh / 2) * +el.dataset.parallax;
        el.style.transform = `translate3d(0, ${offset - 20}px, 0)`;
      });
    };
    window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    update();
  }

  // ---------- Horaires : jour courant + ouvert / fermé ----------
  // Créneaux en minutes depuis minuit, indexés par getDay() (0 = dimanche)
  const LUNCH = [720, 810];
  const SCHEDULE = {
    0: [LUNCH],
    1: [],
    2: [LUNCH],
    3: [LUNCH],
    4: [LUNCH],
    5: [LUNCH, [1140, 1230]],
    6: [LUNCH, [1140, 1260]],
  };
  const now = new Date();
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = SCHEDULE[day].some(([a, b]) => mins >= a && mins < b);
  const status = $('.open-status');
  status.textContent = open ? 'Ouvert en ce moment' : 'Fermé en ce moment';
  status.classList.toggle('is-open', open);
  $(`.hours__table tr[data-day="${day}"]`)?.classList.add('is-today');
})();
