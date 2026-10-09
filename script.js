// Ar'Ty Mad — réservation, horaires du jour et dépliage des pages
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // ---------- Ouverture : le logo, puis la page ----------
  const loader = $('.loader');
  const reveal = () => {
    loader.classList.add('is-done');
    document.documentElement.classList.remove('is-loading');
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) reveal();
  else {
    window.addEventListener('load', () => setTimeout(reveal, 900));
    setTimeout(reveal, 3000); // filet de sécurité si une ressource tarde
  }

  // ---------- Horaires ----------
  // Créneaux en minutes depuis minuit, indexés par getDay() (0 = dimanche).
  const MIDI = { open: 720, close: 810, last: 795 };
  const SCHEDULE = {
    0: { midi: MIDI },
    1: {},
    2: { midi: MIDI },
    3: { midi: MIDI },
    4: { midi: MIDI },
    5: { midi: MIDI, soir: { open: 1140, close: 1230, last: 1215 } },
    6: { midi: MIDI, soir: { open: 1140, close: 1260, last: 1245 } },
  };
  const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MAX_GUESTS = 12;

  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (m) => `${Math.floor(m / 60)}h${pad(m % 60)}`;
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const minutesNow = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  const isToday = (d) => iso(d) === iso(new Date());

  // Services encore réservables ce jour-là (on ne propose plus un service déjà commencé aujourd'hui).
  const servicesFor = (d) => {
    const s = SCHEDULE[d.getDay()];
    return Object.keys(s).filter((k) => !isToday(d) || minutesNow() < s[k].last);
  };

  const slotsFor = (d, service) => {
    const s = SCHEDULE[d.getDay()][service];
    if (!s) return [];
    const out = [];
    for (let m = s.open; m <= s.last; m += 15) {
      if (isToday(d) && m <= minutesNow() + 30) continue;
      out.push(m);
    }
    return out;
  };

  const dayLabel = (d) => {
    if (isToday(d)) return "Aujourd'hui";
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    if (iso(d) === iso(tomorrow)) return 'Demain';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const fillGuests = (select, groupOption) => {
    select.innerHTML = '';
    for (let i = 1; i <= MAX_GUESTS; i++) select.add(new Option(`${i} ${i > 1 ? 'personnes' : 'personne'}`, i, false, i === 2));
    if (groupOption) select.add(new Option('Plus de 12 : repas de groupe', 'groupe'));
  };

  // ---------- Tampon « ouvert aujourd'hui » ----------
  const stamp = $('.stamp');
  const today = new Date();
  const todaySched = SCHEDULE[today.getDay()];
  const now = minutesNow();
  const openService = Object.values(todaySched).find((s) => now >= s.open && now < s.close);
  const nextToday = Object.values(todaySched).find((s) => now < s.open);
  let state, detail;
  if (openService) {
    state = 'Ouvert';
    detail = `jusqu'à ${hhmm(openService.close)}`;
    stamp.classList.add('is-open');
  } else if (nextToday) {
    state = "Aujourd'hui";
    detail = `ouverture à ${hhmm(nextToday.open)}`;
  } else {
    let d = new Date(today);
    do { d.setDate(d.getDate() + 1); } while (!Object.keys(SCHEDULE[d.getDay()]).length);
    const first = Object.values(SCHEDULE[d.getDay()])[0];
    state = 'Fermé';
    detail = `réouverture ${d.getDay() === (today.getDay() + 1) % 7 ? 'demain' : DAY_NAMES[d.getDay()]} à ${hhmm(first.open)}`;
  }
  $('.stamp__state').textContent = state;
  $('.stamp__detail').textContent = detail;

  const todayRow = $(`.hours tr[data-day="${today.getDay()}"]`);
  if (todayRow) todayRow.classList.add('is-today');
  $('#year').textContent = today.getFullYear();

  // ---------- Bande de réservation de la couverture ----------
  const qb = $('.quickbook');
  const qbDate = $('#qb-date');
  const qbService = $('#qb-service');
  fillGuests($('#qb-guests'), true);

  for (let i = 0, d = new Date(); qbDate.options.length < 14 && i < 30; i++, d.setDate(d.getDate() + 1)) {
    if (servicesFor(d).length) qbDate.add(new Option(dayLabel(d), iso(d)));
  }
  const syncQbService = () => {
    const available = servicesFor(parseIso(qbDate.value));
    [...qbService.options].forEach((o) => { o.disabled = !available.includes(o.value); });
    if (qbService.selectedOptions[0]?.disabled) qbService.value = available[0];
  };
  qbDate.addEventListener('change', syncQbService);
  syncQbService();

  // ---------- Formulaire complet ----------
  const form = $('#booking');
  const fDate = $('#b-date');
  const fTime = $('#b-time');
  const fGuests = $('#b-guests');
  const radios = $$('input[name="service"]', form);
  const summary = $('.error-summary', form);
  const status = $('.booking__status', form);
  fillGuests(fGuests, false);
  fDate.min = iso(new Date());
  const maxDate = new Date(); maxDate.setMonth(maxDate.getMonth() + 3);
  fDate.max = iso(maxDate);

  const currentService = () => radios.find((r) => r.checked)?.value;

  const syncForm = () => {
    if (!fDate.value) { fTime.innerHTML = '<option value="">Choisissez d\'abord une date</option>'; return; }
    const d = parseIso(fDate.value);
    const available = servicesFor(d);
    radios.forEach((r) => { r.disabled = !available.includes(r.value); });
    if (available.length && !available.includes(currentService())) radios.find((r) => r.value === available[0]).checked = true;
    const slots = available.length ? slotsFor(d, currentService()) : [];
    const keep = fTime.value;
    fTime.innerHTML = slots.length
      ? slots.map((m) => `<option value="${hhmm(m)}">${hhmm(m)}</option>`).join('')
      : '<option value="">Aucun créneau ce jour-là</option>';
    if (slots.some((m) => hhmm(m) === keep)) fTime.value = keep;
  };
  fDate.addEventListener('change', () => { syncForm(); validateField('date'); });
  radios.forEach((r) => r.addEventListener('change', syncForm));
  syncForm();

  qb.addEventListener('submit', (e) => {
    e.preventDefault();
    if (qb.guests.value === 'groupe') {
      $('#b-notes').value = 'Repas de groupe (plus de 12 personnes) : ';
      fGuests.value = String(MAX_GUESTS);
    } else {
      fGuests.value = qb.guests.value;
    }
    fDate.value = qbDate.value;
    syncForm();
    const r = radios.find((x) => x.value === qbService.value && !x.disabled);
    if (r) { r.checked = true; syncForm(); }
    $('#reserver').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setTimeout(() => $('#b-name').focus({ preventScroll: true }), 600);
  });

  $$('[data-prefill-group]').forEach((a) => a.addEventListener('click', () => {
    const notes = $('#b-notes');
    if (!notes.value) notes.value = 'Repas de groupe : nombre de convives, occasion, budget… ';
  }));

  // Validation : au départ du champ, puis à l'envoi avec récapitulatif.
  const checks = {
    date: () => {
      if (!fDate.value) return 'Choisissez une date.';
      const d = parseIso(fDate.value);
      if (fDate.value < fDate.min) return 'Choisissez une date à venir.';
      if (d.getDay() === 1) return 'Nous sommes fermés le lundi : choisissez un autre jour.';
      if (!servicesFor(d).length) return "Plus aucun service n'est réservable ce jour-là.";
      return '';
    },
    time: () => (fTime.value ? '' : 'Choisissez une heure d\'arrivée.'),
    name: () => ($('#b-name').value.trim().length >= 2 ? '' : 'Indiquez votre nom.'),
    tel: () => ($('#b-tel').value.replace(/[^\d+]/g, '').length >= 10 ? '' : 'Indiquez un numéro de téléphone (10 chiffres).'),
  };
  const fieldEls = { date: fDate, time: fTime, name: $('#b-name'), tel: $('#b-tel') };

  function validateField(key) {
    const msg = checks[key]();
    const el = fieldEls[key];
    el.closest('.field').classList.toggle('is-invalid', !!msg);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $(`#b-${key}-err`).textContent = msg;
    return msg;
  }
  Object.entries(fieldEls).forEach(([key, el]) => el.addEventListener('blur', () => { if (el.value) validateField(key); }));
  // Une erreur affichée s'efface dès que la saisie devient valide, sans attendre la sortie du champ.
  Object.entries(fieldEls).forEach(([key, el]) => el.addEventListener('input', () => {
    if (el.getAttribute('aria-invalid') === 'true' && !checks[key]()) validateField(key);
  }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'booking__status';
    const errors = Object.keys(checks).map((k) => [k, validateField(k)]).filter(([, m]) => m);
    if (errors.length) {
      $('ul', summary).innerHTML = errors.map(([k, m]) => `<li><a href="#${fieldEls[k].id}">${m}</a></li>`).join('');
      summary.hidden = false;
      summary.focus();
      return;
    }
    summary.hidden = true;

    const data = Object.fromEntries(new FormData(form));
    const when = `${parseIso(data.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${data.time}`;
    const who = `${data.guests} ${+data.guests > 1 ? 'personnes' : 'personne'}`;
    const endpoint = form.dataset.endpoint;

    // Pas encore de service de réservation branché : on ne simule pas de confirmation.
    if (!endpoint) {
      status.innerHTML = `<h3>Votre demande est prête</h3>
        <p>${who}, ${when}, au nom de ${escapeHtml(data.name)}.</p>
        <p>La réservation en ligne n'est pas encore activée : appelez-nous pour confirmer votre table.</p>
        <a class="btn" href="tel:+33297210912">Appeler le 02.97.21.09.12</a>`;
      status.focus?.();
      return;
    }

    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      if (!res.ok) throw new Error(res.status);
      status.innerHTML = `<h3>Demande envoyée, merci !</h3><p>${who}, ${when}. Nous vous rappelons au ${escapeHtml(data.tel)} si besoin.</p>`;
      form.reset();
      syncForm();
    } catch {
      status.classList.add('is-error');
      status.innerHTML = `<h3>L'envoi n'a pas abouti</h3><p>Réessayez dans un instant, ou appelez-nous au <a href="tel:+33297210912">02.97.21.09.12</a>.</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Envoyer ma demande de réservation';
    }
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- Menus : contenu géré depuis admin.html ----------
  // En cas d'échec (fichier absent, ouverture hors ligne), le HTML de secours reste affiché.
  if (window.ArtyMenus) {
    ArtyMenus.load().then((data) => ArtyMenus.render(data, $('#menus'))).catch(() => {});
  }

  // ---------- Dépliage des doubles pages ----------
  const spreads = $$('.spread');
  if ('IntersectionObserver' in window) {
    const opener = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-open');
        opener.unobserve(en.target);
      });
    }, { threshold: 0.2 });
    spreads.forEach((s) => opener.observe(s));
  } else {
    spreads.forEach((s) => s.classList.add('is-open'));
  }
})();
