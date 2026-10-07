// Braise — interactions
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
  window.addEventListener('load', () => setTimeout(finishLoading, reduceMotion ? 0 : 1300));
  setTimeout(finishLoading, 4000); // filet de sécurité si une image tarde

  // ---------- Année du footer ----------
  $('#year').textContent = new Date().getFullYear();

  // ---------- Navigation : fond au scroll, masquage en descente ----------
  const nav = $('.nav');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > 600 && !$('.mobile-menu').classList.contains('is-open'));
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
  const mobile = $('.mobile-menu');
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
      const start = performance.now();
      const dur = 1800;
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
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
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
    };
    window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    update();
  }

  // ---------- Braises dans le hero ----------
  const embers = $('.embers');
  if (!reduceMotion && embers) {
    const spawn = () => {
      if (document.hidden || window.scrollY > window.innerHeight) return;
      const e = document.createElement('span');
      const size = 2 + Math.random() * 5;
      const dur = 5 + Math.random() * 6;
      e.className = 'ember';
      e.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-duration:${dur}s;--drift:${(Math.random() - 0.5) * 200}px`;
      embers.appendChild(e);
      setTimeout(() => e.remove(), dur * 1000);
    };
    setInterval(spawn, 260);
  }

  // ---------- Curseur ----------
  const cursor = $('.cursor');
  if (matchMedia('(hover: hover)').matches) {
    let x = 0, y = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; cursor.classList.add('is-visible'); });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
    const loop = () => {
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mouseover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .g, select, input, textarea'));
    });
  }

  // ---------- Onglets de la carte ----------
  const tabs = $$('.tab');
  const indicator = $('.tabs__indicator');
  const moveIndicator = (tab) => {
    indicator.style.left = tab.offsetLeft + 'px';
    indicator.style.width = tab.offsetWidth + 'px';
  };
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((t) => { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-selected', t === tab); });
    $$('.menu__panel').forEach((p) => p.classList.toggle('is-active', p.dataset.panel === tab.dataset.tab));
    moveIndicator(tab);
  }));
  const syncIndicator = () => moveIndicator($('.tab.is-active'));
  window.addEventListener('resize', syncIndicator);
  document.fonts?.ready.then(syncIndicator);
  syncIndicator();

  // ---------- Slider d'avis ----------
  const track = $('.slider__track');
  const slides = $$('.review', track);
  const dots = $('.slider__dots');
  let current = 0;
  let timer;
  const go = (i) => {
    current = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    $$('button', dots).forEach((d, j) => d.classList.toggle('is-active', j === current));
  };
  const autoplay = () => { clearInterval(timer); timer = setInterval(() => go(current + 1), 6000); };
  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', `Avis ${i + 1}`);
    b.addEventListener('click', () => { go(i); autoplay(); });
    dots.appendChild(b);
  });
  go(0);
  autoplay();

  // Glisser au doigt
  let startX = null;
  track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) { go(current + (dx < 0 ? 1 : -1)); autoplay(); }
    startX = null;
  });

  // ---------- Statut ouvert / fermé ----------
  const status = $('.open-status');
  const now = new Date();
  const day = now.getDay(); // 0 = dimanche
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = day >= 2 && day <= 6 && ((mins >= 720 && mins < 870) || (mins >= 1140 && mins < 1380));
  status.textContent = open ? 'Ouvert en ce moment' : 'Fermé en ce moment';
  status.classList.toggle('is-open', open);

  // ---------- Formulaire de réservation ----------
  const form = $('.form');
  const msg = $('.form__msg');
  const dateInput = $('#date');
  const guestsOut = $('#guests');
  const today = new Date();
  dateInput.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  $$('[data-step]', form).forEach((b) => b.addEventListener('click', () => {
    guestsOut.value = Math.min(8, Math.max(1, +guestsOut.value + +b.dataset.step));
  }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;
    $$('[required]', form).forEach((field) => {
      const ok = field.checkValidity();
      field.closest('.field').classList.toggle('is-invalid', !ok);
      if (!ok) valid = false;
    });

    if (dateInput.value) {
      const d = new Date(dateInput.value + 'T12:00').getDay();
      if (d === 0 || d === 1) {
        dateInput.closest('.field').classList.add('is-invalid');
        msg.textContent = 'Nous sommes fermés le dimanche et le lundi.';
        msg.classList.add('is-error');
        return;
      }
    }

    if (!valid) {
      msg.textContent = 'Merci de compléter les champs indiqués.';
      msg.classList.add('is-error');
      return;
    }

    const name = $('#name').value.trim().split(' ')[0];
    const date = new Date(dateInput.value + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    msg.classList.remove('is-error');
    msg.textContent = `Merci ${name} ! Table pour ${guestsOut.value} le ${date} à ${$('#time').value}. Un e-mail de confirmation arrive.`;
    form.reset();
    guestsOut.value = 2;
  });
})();
