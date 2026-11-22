/* Backbeat — LEARN: short lessons, each with a hands-on widget. */
(function (BB) {
  'use strict';
  const h = BB.h;
  BB.modes = BB.modes || {};
  const W = BB.widgets = {};

  // ---------------------------------------------------------------- widgets

  W.metronome = function (el, cfg) {
    const owner = {};
    const pattern = BB.makePattern([4, 4], 1, cfg.bpm || 90, {});
    const dots = [0, 1, 2, 3].map((i) => h('span.mdot' + (i === 0 ? '.accent' : ''), String(i + 1)));
    const play = BB.playButton('Start', () => toggle());
    const bpm = BB.bpmControl(pattern.bpm, (v) => { pattern.bpm = v; slider.value = v; feel.textContent = describe(v); });
    const slider = h('input.slider', { type: 'range', min: 40, max: 220, value: pattern.bpm, 'aria-label': 'Tempo' });
    slider.addEventListener('input', () => { pattern.bpm = +slider.value; bpm.set(pattern.bpm); feel.textContent = describe(pattern.bpm); });
    const feel = h('span.feel', describe(pattern.bpm));
    let taps = [];
    const tap = h('button.btn.tap', { type: 'button' }, 'Tap');
    tap.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      BB.playLive('hat', 0.8);
      const now = performance.now();
      if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
      taps.push(now);
      if (taps.length > 5) taps.shift();
      if (taps.length >= 2) {
        const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
        const v = Math.max(40, Math.min(220, Math.round(60000 / avg)));
        pattern.bpm = v; bpm.set(v); slider.value = v; feel.textContent = describe(v);
      }
      tap.animate([{ transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 140 });
    });

    function describe(v) {
      if (v < 66) return 'Slow — a ballad';
      if (v < 90) return 'Laid back — hip-hop, reggae';
      if (v < 116) return 'Medium — pop, rock, funk';
      if (v < 135) return 'Up-tempo — house, disco';
      if (v < 165) return 'Fast — punk, drum & bass halves';
      return 'Very fast — hold on!';
    }
    function toggle() {
      if (BB.seq.isOwner(owner)) { BB.seq.stop(); return; }
      BB.seq.start({
        owner,
        provider: () => ({ pattern }),
        metronome: true,
        onStep: (ev) => {
          dots.forEach((d, i) => d.classList.toggle('lit', i === ev.step));
          dots[ev.step].animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
        },
        onStop: () => { play.setPlaying(false); dots.forEach((d) => d.classList.remove('lit')); },
      });
      play.setPlaying(true);
    }
    el.append(
      h('div.metro',
        h('div.mdots', dots),
        h('div.metro-controls', play, bpm, tap),
        h('div.metro-slider', slider, feel)));
    return { toggle, destroy: () => { if (BB.seq.isOwner(owner)) BB.seq.stop(); } };
  };

  W.grid = function (el, cfg) {
    const base = () => BB.makePattern(cfg.sig, cfg.res, cfg.bpm, cfg.tracks);
    const mc = BB.machine({ pattern: base(), rows: cfg.rows, metronome: !!cfg.metronome });
    const reset = h('button.btn.ghost-btn', { type: 'button', onclick: () => mc.setPattern(base()) }, BB.icon('replay'), h('span', 'Reset'));
    mc.el.querySelector('.machine-bar .spacer').before(reset);
    el.append(mc.el);
    return { toggle: mc.toggle, destroy: mc.destroy };
  };

  W.notes = function (el) {
    const owner = {};
    const rows = BB.NOTE_VALUES.map((nv) => {
      const segs = Array.from({ length: nv.per }, () => h('span.seg'));
      const row = h('button.ladder-row', { type: 'button' },
        h('span.ladder-glyph', { html: BB.glyph('note-' + nv.id) }),
        h('span.ladder-name', h('b', nv.name + ' note'), h('small', BB.beatsText(nv))),
        h('span.ladder-bar', { style: { '--n': nv.per } }, segs));
      row.addEventListener('click', () => play(nv, row, segs));
      return row;
    });
    let active = null;
    function play(nv, row, segs) {
      if (BB.seq.isOwner(owner) && active === row) { BB.seq.stop(); return; }
      const every = 16 / nv.per;
      const snare = Array.from({ length: 16 }, (_, i) => (i % every === 0 ? 'x' : '.')).join('');
      const pattern = BB.makePattern([4, 4], 4, 84, { snare });
      active = row;
      rows.forEach((r) => r.classList.toggle('active', r === row));
      BB.seq.start({
        owner,
        provider: (bar) => (bar < 2 ? { pattern } : null),
        metronome: true,
        onStep: (ev) => {
          const idx = Math.floor(ev.step / every);
          segs.forEach((s, i) => s.classList.toggle('lit', i === idx));
        },
        onStop: () => {
          rows.forEach((r) => r.classList.remove('active'));
          segs.forEach((s) => s.classList.remove('lit'));
          active = null;
        },
      });
    }
    el.append(h('div.ladder', rows));
    return { toggle: () => (BB.seq.isOwner(owner) ? BB.seq.stop() : rows[2].click()), destroy: () => { if (BB.seq.isOwner(owner)) BB.seq.stop(); } };
  };

  W.rests = function (el, cfg) {
    const cards = BB.NOTE_VALUES.map((nv) => h('div.rest-card',
      h('span.rest-glyph', { html: BB.glyph('rest-' + nv.id) }),
      h('b', nv.name + ' rest'),
      h('small', BB.beatsText(nv))));
    el.append(h('div.rest-strip', cards));
    return W.grid(el, cfg);
  };

  W.meters = function (el) {
    const sigs = ['4/4', '3/4', '2/4', '6/8', '12/8', '5/4', '7/8'];
    let current = '4/4';
    const display = h('div.meter-display');
    const pat = (sig) => {
      const g = BB.METER_GROOVES[sig][0];
      return BB.makePattern(BB.parseSig(sig), g.res, g.bpm, g.tracks);
    };
    const mc = BB.machine({ pattern: pat(current), rows: ['kick', 'snare', 'hat', 'ride'], metronome: true });
    const buttons = sigs.map((s) => h('button.seg-btn', { type: 'button', onclick: () => select(s) }, BB.timeSig(s, 'sm')));
    function select(sig) {
      current = sig;
      buttons.forEach((b, i) => b.classList.toggle('active', sigs[i] === sig));
      const info = BB.METER_INFO[sig];
      display.innerHTML = '';
      display.append(BB.timeSig(sig, 'xl'), h('div.meter-text', h('b', info.title), h('p', info.desc)));
      mc.setPattern(pat(sig));
    }
    el.append(h('div.seg-row', buttons), display, mc.el);
    select(current);
    return { toggle: mc.toggle, destroy: mc.destroy };
  };

  // ------------------------------------------------------------------- mode

  BB.modes.learn = {
    mount(root, params) {
      const done = BB.store.get('lessons', {});
      let idx = params && params.lesson != null ? params.lesson : BB.store.get('lessonIdx', 0);
      idx = Math.max(0, Math.min(BB.LESSONS.length - 1, idx));
      let widget = null;

      const list = h('ol.lesson-list');
      const card = h('article.lesson.panel');
      root.append(h('div.learn', h('nav.lesson-nav', h('div.eyebrow', 'Lessons'), list), card));

      function renderList() {
        list.innerHTML = '';
        BB.LESSONS.forEach((L, i) => {
          list.append(h('li', h('button.lesson-item' + (i === idx ? '.active' : '') + (done[L.id] ? '.done' : ''),
            { type: 'button', onclick: () => show(i) },
            h('span.num', BB.pad2(i + 1)), h('span.ttl', L.title), h('span.tick', { html: BB.icons.check }))));
        });
        const act = list.querySelector('.active');
        if (act && act.scrollIntoView && window.innerWidth < 760) act.scrollIntoView({ block: 'nearest', inline: 'center' });
      }

      function show(i, initial) {
        if (widget && widget.destroy) widget.destroy();
        BB.seq.stop();
        idx = i;
        BB.store.set('lessonIdx', i);
        const L = BB.LESSONS[i];
        done[L.id] = 1;
        BB.store.set('lessons', done);
        card.innerHTML = '';
        const wrap = h('div.widget');
        card.append(
          h('div.eyebrow', 'Lesson ' + BB.pad2(i + 1) + ' / ' + BB.pad2(BB.LESSONS.length)),
          h('h2', L.title),
          h('div.lesson-body', { html: L.body }),
          wrap);
        widget = W[L.widget.type](wrap, L.widget);
        if (L.tip) card.append(h('p.tip', { html: L.tip }));
        const nav = h('div.lesson-foot',
          h('button.btn', { type: 'button', disabled: i === 0, onclick: () => show(i - 1) }, BB.icon('back'), h('span', 'Back')),
          h('span.spacer'),
          L.practice ? h('button.btn.ghost-btn', { type: 'button', onclick: () => BB.app.go('echo', { level: L.practice }) }, BB.icon('ear'), h('span', 'Practice by ear')) : null,
          i < BB.LESSONS.length - 1
            ? h('button.btn.primary', { type: 'button', onclick: () => show(i + 1) }, h('span', 'Next lesson'), BB.icon('next'))
            : h('button.btn.primary', { type: 'button', onclick: () => BB.app.go('echo') }, h('span', 'Start Echo'), BB.icon('next')));
        card.append(nav);
        renderList();
        if (!initial && window.innerWidth < 760) card.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }

      show(idx, true);
      return {
        unmount() { if (widget && widget.destroy) widget.destroy(); },
        onSpace() { if (widget && widget.toggle) widget.toggle(); },
      };
    },
  };
})(window.BB);
