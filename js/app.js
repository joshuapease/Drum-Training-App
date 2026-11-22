/* Backbeat — app shell: header, mode switching, keyboard, persistence. */
(function (BB) {
  'use strict';
  const h = BB.h;

  const MODES = [
    { id: 'learn', label: 'Learn', sub: 'Lessons' },
    { id: 'echo', label: 'Echo', sub: 'Beat match' },
    { id: 'meter', label: 'Meter', sub: 'Time sigs' },
    { id: 'notes', label: 'Notes', sub: 'Values' },
    { id: 'jam', label: 'Jam', sub: 'Free play' },
  ];

  let current = null;
  let currentId = null;
  const main = document.getElementById('main');

  // ------------------------------------------------------------------ header
  const stripe = document.getElementById('stripe');
  const cells = {};
  BB.ROWS.forEach((r) => {
    const c = h('i', { style: { '--c': BB.INSTRUMENTS[r].color }, title: BB.INSTRUMENTS[r].name });
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); BB.playLive(r); });
    cells[r] = c;
    stripe.append(c);
  });
  BB.on('hit', (r) => {
    const c = cells[r];
    if (!c) return;
    c.classList.remove('hit');
    void c.offsetWidth; // restart the CSS animation
    c.classList.add('hit');
  });

  const starCount = document.getElementById('star-count');
  const refreshStars = () => { starCount.textContent = String(BB.totalStars()); };
  document.getElementById('star-total').textContent = '/' + BB.TOTAL_STARS;
  BB.on('stars', () => {
    refreshStars();
    starCount.parentElement.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'cubic-bezier(.3,1.6,.5,1)' });
  });
  refreshStars();
  document.getElementById('stars-badge').addEventListener('click', () => go('echo'));

  const kitSel = document.getElementById('kit-select');
  Object.keys(BB.KITS).forEach((id) => kitSel.append(h('option', { value: id }, BB.KITS[id].name)));
  kitSel.value = BB.store.get('kit', 'analog');
  BB.engine.setKit(kitSel.value);
  kitSel.addEventListener('change', () => {
    BB.engine.setKit(kitSel.value);
    BB.store.set('kit', kitSel.value);
    if (!BB.seq.playing) {
      const t = BB.engine.now() + 0.02;
      BB.engine.kick(t, 1); BB.engine.hat(t, 0.8); BB.engine.hat(t + 0.15, 0.6);
      BB.engine.snare(t + 0.3, 0.95); BB.engine.hat(t + 0.3, 0.8);
      ['kick', 'hat', 'snare'].forEach((r, i) => setTimeout(() => BB.emit('hit', r), i * 150));
    }
  });

  const vol = document.getElementById('vol');
  vol.value = BB.store.get('vol', 80);
  BB.engine.setVolume(Math.pow(vol.value / 100, 1.6));
  vol.addEventListener('input', () => {
    BB.engine.setVolume(Math.pow(vol.value / 100, 1.6));
    BB.store.set('vol', +vol.value);
  });

  // ------------------------------------------------------------------- modes
  const nav = document.getElementById('modes');
  const keys = {};
  MODES.forEach((m, i) => {
    const b = h('button.mode-key', { type: 'button', dataset: { mode: m.id }, onclick: () => go(m.id) },
      h('span.mk-top', h('i.led'), h('span.mk-num', BB.pad2(i + 1))),
      h('span.mk-label', m.label),
      h('span.mk-sub', m.sub));
    keys[m.id] = b;
    nav.append(b);
  });

  function go(id, params) {
    if (!BB.modes[id]) id = 'learn';
    BB.seq.stop();
    if (current && current.unmount) current.unmount();
    main.innerHTML = '';
    main.className = 'stage mode-' + id;
    currentId = id;
    Object.keys(keys).forEach((k) => {
      keys[k].classList.toggle('active', k === id);
      keys[k].setAttribute('aria-current', k === id ? 'page' : 'false');
    });
    current = BB.modes[id].mount(main, params || {}) || {};
    BB.store.set('mode', id);
    if (location.hash && id !== 'jam') history.replaceState(null, '', location.pathname + location.search);
    main.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
  }
  BB.app = { go };

  // ---------------------------------------------------------------- keyboard
  const isField = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');
  document.addEventListener('keydown', (e) => {
    if (isField(e.target) && e.target.type !== 'range') return;
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (e.repeat) return;
      BB.engine.ensure();
      if (current && current.onSpace) current.onSpace();
      return;
    }
    if (current && current.onKey) current.onKey(e);
  });
  // Stop Space from also "clicking" whichever button has focus.
  document.addEventListener('keyup', (e) => {
    if ((e.code === 'Space' || e.key === ' ') && !isField(e.target)) e.preventDefault();
  });

  // Unlock audio on the first interaction (required by browsers).
  const unlock = () => { BB.engine.ensure(); };
  document.addEventListener('pointerdown', unlock, { once: true, capture: true });
  document.addEventListener('keydown', unlock, { once: true, capture: true });

  // ------------------------------------------------------------------- start
  const hash = location.hash || '';
  if (hash.indexOf('#jam=') === 0) {
    const p = BB.decodeJam(hash.slice(5));
    go('jam', p ? { pattern: p } : {});
    if (p) BB.toast('Loaded a shared groove — press Play');
  } else {
    const first = !BB.store.get('mode');
    go(first ? 'learn' : BB.store.get('mode', 'learn'));
  }
})(window.BB);
