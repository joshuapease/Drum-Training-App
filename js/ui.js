/* Backbeat — DOM helpers, storage, icons and small shared components. */
(function (BB) {
  'use strict';

  /** h('div.a.b', {attrs}, ...children) */
  function h(tag, attrs) {
    const parts = tag.split('.');
    const el = document.createElement(parts[0] || 'div');
    if (parts.length > 1) el.className = parts.slice(1).join(' ');
    const kids = Array.prototype.slice.call(arguments, 2);
    if (attrs && (attrs instanceof Node || typeof attrs !== 'object' || Array.isArray(attrs))) {
      kids.unshift(attrs);
      attrs = null;
    }
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        const v = attrs[k];
        if (v == null || v === false) return;
        if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'style' && typeof v === 'object') {
          Object.keys(v).forEach((sk) => {
            if (sk.slice(0, 2) === '--') el.style.setProperty(sk, v[sk]);
            else el.style[sk] = v[sk];
          });
        } else if (k === 'html') el.innerHTML = v;
        else if (k === 'class') String(v).split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    (function add(list) {
      list.forEach((c) => {
        if (c == null || c === false) return;
        if (Array.isArray(c)) add(c);
        else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
      });
    })(kids);
    return el;
  }
  BB.h = h;

  BB.pad2 = (n) => String(n).padStart(2, '0');
  BB.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  BB.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  BB.randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // ------------------------------------------------------------------ storage
  const KEY = 'backbeat.v1';
  let data = {};
  try { data = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { data = {}; }
  BB.store = {
    get(k, d) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : d; },
    set(k, v) {
      data[k] = v;
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
    },
  };

  // -------------------------------------------------------------------- icons
  const I = (d, extra) => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra || 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${d}</svg>`;
  BB.icons = {
    play: I('<path d="M8 5.8v12.4c0 .8.9 1.3 1.6.8l9.4-6.2a1 1 0 0 0 0-1.6L9.6 5C8.9 4.5 8 5 8 5.8z"/>', 'fill="currentColor"'),
    stop: I('<rect x="6.5" y="6.5" width="11" height="11" rx="2.2"/>', 'fill="currentColor"'),
    ear: I('<path d="M4 15.5V12a8 8 0 0 1 16 0v3.5"/><rect x="3" y="14" width="4.6" height="6.6" rx="1.6"/><rect x="16.4" y="14" width="4.6" height="6.6" rx="1.6"/>'),
    swap: I('<path d="M7 7h11l-3-3M17 17H6l3 3"/>'),
    check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    clear: I('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'),
    back: I('<path d="M15 5l-7 7 7 7"/>'),
    next: I('<path d="M9 5l7 7-7 7"/>'),
    lock: I('<rect x="5.5" y="11" width="13" height="9" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>'),
    dice: I('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>'),
    share: I('<path d="M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>'),
    eye: I('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
    replay: I('<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/>'),
    metro: I('<path d="M9 3h6l3.5 17h-13z"/><path d="M12 15l5-8"/>'),
  };
  BB.icon = (name) => h('span.ico', { html: BB.icons[name] || '' });

  BB.star = (filled) => h('span.star' + (filled ? '.on' : ''), { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.75 5.9 6.45.75-4.78 4.4 1.3 6.37L12 17l-5.72 3.2 1.3-6.36L2.8 9.45l6.45-.75z" fill="currentColor"/></svg>' });
  BB.starRow = (n, total) => h('span.stars', Array.from({ length: total || 3 }, (_, i) => BB.star(i < n)));

  BB.timeSig = (sig, cls) => {
    const [a, b] = String(sig).split('/');
    return h('span.tsig' + (cls ? '.' + cls : ''), h('span', a), h('span', b));
  };

  // -------------------------------------------------------------- feedback fx
  let toastTimer = null;
  BB.toast = function (msg) {
    let el = document.querySelector('.toast');
    if (!el) { el = h('div.toast', { role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  };

  /** Confetti made of little step pads. */
  BB.confetti = function () {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = BB.ROWS.map((r) => BB.INSTRUMENTS[r].color);
    const layer = h('div.confetti');
    document.body.append(layer);
    const W = window.innerWidth;
    for (let i = 0; i < 70; i++) {
      const size = 6 + Math.random() * 9;
      const p = h('i', { style: { width: size + 'px', height: size + 'px', background: BB.pick(colors), left: (Math.random() * W) + 'px' } });
      layer.append(p);
      const drift = (Math.random() - 0.5) * 240;
      const rot = (Math.random() - 0.5) * 720;
      p.animate([
        { transform: 'translate3d(0,-40px,0) rotate(0deg)', opacity: 1 },
        { transform: `translate3d(${drift}px, ${window.innerHeight + 60}px, 0) rotate(${rot}deg)`, opacity: 0.9 },
      ], { duration: 1500 + Math.random() * 1300, delay: Math.random() * 250, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
    }
    setTimeout(() => layer.remove(), 3200);
  };

  BB.shake = (el) => el && el.animate && el.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
    { duration: 320, easing: 'ease-out' });

  // ------------------------------------------------------------ components

  /** A transport button that flips between Play and Stop. */
  BB.playButton = function (label, onClick, cls) {
    const ico = BB.icon('play');
    const lbl = h('span.lbl', label);
    const btn = h('button.btn.play' + (cls ? '.' + cls : ''), { type: 'button', onclick: onClick }, ico, lbl);
    btn.setPlaying = (on, stopLabel) => {
      btn.classList.toggle('is-playing', !!on);
      ico.innerHTML = BB.icons[on ? 'stop' : 'play'];
      lbl.textContent = on ? (stopLabel || 'Stop') : label;
    };
    return btn;
  };

  /** A small LED toggle (e.g. metronome click). */
  BB.ledToggle = function (label, initial, onChange) {
    const btn = h('button.btn.led-toggle', { type: 'button', 'aria-pressed': String(!!initial) }, h('i.led'), h('span', label));
    let on = !!initial;
    btn.classList.toggle('on', on);
    btn.addEventListener('click', () => {
      on = !on;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', String(on));
      onChange(on);
    });
    btn.get = () => on;
    return btn;
  };

  /** A listening orb that pulses with the music (used in ear-training quizzes). */
  BB.orb = function (onClick) {
    const ring = h('span.orb-ring');
    const core = h('span.orb-core', BB.icon('play'));
    const el = h('button.orb', { type: 'button', onclick: onClick, 'aria-label': 'Play the groove' }, ring, core);
    el.pulse = (strong) => {
      ring.animate([{ transform: 'scale(1)', opacity: strong ? 0.9 : 0.6 }, { transform: `scale(${strong ? 1.55 : 1.32})`, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.2,.7,.3,1)' });
      core.animate([{ transform: `scale(${strong ? 1.1 : 1.05})` }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
    };
    el.setPlaying = (on) => { el.classList.toggle('is-playing', on); core.replaceChildren(BB.icon(on ? 'stop' : 'play')); };
    return el;
  };

  /** BPM stepper with an LCD-style readout. */
  BB.bpmControl = function (value, onChange, min, max) {
    min = min || 40; max = max || 220;
    let v = value;
    const out = h('span.bpm-val', String(v));
    const set = (nv) => {
      v = Math.max(min, Math.min(max, Math.round(nv)));
      out.textContent = String(v);
      onChange(v);
    };
    let hold = null;
    const stepBtn = (d, txt) => {
      const b = h('button.btn.icon-btn', { type: 'button', 'aria-label': (d > 0 ? 'Faster' : 'Slower') }, txt);
      const go = () => set(v + d);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        go();
        clearTimeout(hold);
        hold = setTimeout(function rep() { go(); hold = setTimeout(rep, 60); }, 380);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => clearTimeout(hold)));
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      return b;
    };
    const el = h('div.bpm', stepBtn(-1, '−'), h('div.bpm-read', out, h('small', 'BPM')), stepBtn(1, '+'));
    el.set = (nv) => { v = nv; out.textContent = String(v); };
    el.get = () => v;
    return el;
  };

  /**
   * A compact drum machine: transport + grid. Used inside lessons.
   * cfg: { pattern, rows, editable, counts, metronome, bpmControl }
   */
  BB.machine = function (cfg) {
    const owner = {};
    let pattern = cfg.pattern;
    let rows = cfg.rows;
    let clickOn = !!cfg.metronome;
    const grid = new BB.StepGrid({ editable: cfg.editable !== false, counts: cfg.counts !== false });
    const big = h('span.big-count', '—');
    const play = BB.playButton('Play', () => toggle());
    const bar = h('div.machine-bar', play);
    let bpmEl = null;
    if (cfg.bpmControl !== false) {
      bpmEl = BB.bpmControl(pattern.bpm, (v) => { pattern.bpm = v; });
      bar.append(bpmEl);
    }
    bar.append(BB.ledToggle('Click', clickOn, (on) => { clickOn = on; }));
    bar.append(h('span.spacer'), big);
    const el = h('div.machine', bar, grid.el);
    grid.render(pattern, rows);

    function start() {
      BB.seq.start({
        owner,
        provider: () => ({ pattern }),
        metronome: () => clickOn,
        onStep: (ev) => {
          grid.setPlayhead(ev.step, true);
          big.textContent = ev.m.counts[ev.step] || '';
          big.classList.toggle('beat', ev.m.groupStart[ev.step]);
        },
        onStop: () => { grid.setPlayhead(-1); play.setPlaying(false); big.textContent = '—'; big.classList.remove('beat'); },
      });
      play.setPlaying(true);
    }
    function toggle() { if (BB.seq.isOwner(owner)) BB.seq.stop(); else start(); }
    function stop() { if (BB.seq.isOwner(owner)) BB.seq.stop(); }

    return {
      el, grid, toggle, stop,
      isPlaying: () => BB.seq.isOwner(owner),
      setPattern(p, r) {
        const was = BB.seq.isOwner(owner);
        pattern = p; rows = r || rows;
        if (bpmEl) bpmEl.set(p.bpm);
        grid.render(pattern, rows);
        if (was) start();
      },
      destroy: stop,
    };
  };
})(window.BB);
