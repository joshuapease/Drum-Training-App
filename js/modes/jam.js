/* Backbeat — JAM: the full drum machine. */
(function (BB) {
  'use strict';
  const h = BB.h;
  BB.modes = BB.modes || {};

  const meterById = (id) => BB.JAM_METERS.find((m) => m.id === id) || BB.JAM_METERS[0];

  function fromPreset(p) {
    const mt = meterById(p.meter);
    const pat = BB.makePattern(mt.sig, mt.res, p.bpm, p.tracks);
    pat.swing = p.swing || 0;
    return pat;
  }

  // Share links: #jam=<base64 json>
  BB.encodeJam = function (p) {
    const o = { m: BB.sigLabel(p), b: p.bpm, w: Math.round((p.swing || 0) * 100), t: {} };
    BB.ROWS.forEach((r) => { if (p.tracks[r].some(Boolean)) o.t[r] = p.tracks[r].map((v) => (v ? 'x' : '.')).join(''); });
    return btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  BB.decodeJam = function (s) {
    try {
      const json = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
      const o = JSON.parse(json);
      const mt = BB.JAM_METERS.find((m) => m.id === o.m);
      if (!mt) return null;
      const tracks = {};
      Object.keys(o.t || {}).forEach((r) => { if (BB.INSTRUMENTS[r] && typeof o.t[r] === 'string') tracks[r] = o.t[r]; });
      const p = BB.makePattern(mt.sig, mt.res, Math.max(40, Math.min(220, +o.b || 100)), tracks);
      p.swing = Math.max(0, Math.min(1, (+o.w || 0) / 100));
      return p;
    } catch (e) { return null; }
  };

  function randomGroove(base) {
    const p = BB.emptyLike(base);
    const m = BB.meterInfo(p);
    const T = p.tracks;
    const r = Math.random;
    const nb = m.groups.length;
    // Where the backbeat lives for this meter.
    const backbeats = [];
    let s = 0;
    m.groups.forEach((g, gi) => {
      const isBack = m.den === 4 ? (nb === 3 ? gi === 2 : nb === 5 ? (gi === 2 || gi === 4) : gi % 2 === 1) : gi % 2 === 1 || (nb === 3 && gi === 2);
      if (isBack) backbeats.push(s);
      s += g;
    });
    const hatEvery = m.den === 4 && m.res === 4 ? BB.pick([1, 2, 2, 2]) : 1;
    for (let i = 0; i < m.steps; i++) {
      const pos = m.posInGroup[i];
      if (i === 0) T.kick[i] = 1;
      else if (backbeats.indexOf(i) < 0) {
        const p0 = pos === 0 ? 0.35 : (pos % 2 === 0 ? 0.22 : 0.1);
        if (r() < p0) T.kick[i] = 1;
      }
      if (backbeats.indexOf(i) >= 0) T.snare[i] = 1;
      else if (pos !== 0 && r() < 0.06) T.snare[i] = 1;
      if (i % hatEvery === 0) T.hat[i] = 1;
    }
    if (r() < 0.6) { const last = m.steps - (m.res === 4 ? 2 : 1); T.hat[last] = 0; T.ohat[last] = 1; }
    if (r() < 0.35) backbeats.forEach((b) => { T.clap[b] = 1; });
    if (r() < 0.4) T.crash[0] = 1;
    if (r() < 0.3) { const n = m.steps; T.tomH[n - 4] = 1; T.tomH[n - 3] = 1; T.tomL[n - 2] = 1; T.tomL[n - 1] = 1; }
    return p;
  }

  BB.modes.jam = {
    mount(root, params) {
      const owner = {};
      let pattern = (params && params.pattern) || (BB.store.get('jam') && BB.decodeJam(BB.store.get('jam'))) || fromPreset(BB.JAM_PRESETS[0]);
      let clickOn = false;
      let saveTimer = null;
      const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => BB.store.set('jam', BB.encodeJam(pattern)), 250); };

      const grid = new BB.StepGrid({ editable: true, counts: true, keys: true, onChange: save });
      const play = BB.playButton('Play', () => toggle(), 'primary');
      const bpm = BB.bpmControl(pattern.bpm, (v) => { pattern.bpm = v; save(); });

      const swingVal = h('span.knob-val', Math.round(pattern.swing * 100) + '%');
      const swing = h('input.slider', { type: 'range', min: 0, max: 100, value: Math.round(pattern.swing * 100), 'aria-label': 'Swing' });
      swing.addEventListener('input', () => { pattern.swing = +swing.value / 100; swingVal.textContent = swing.value + '%'; save(); });
      const swingWrap = h('label.ctl', h('small', 'Swing'), swing, swingVal);

      const meterSel = h('select.select', { 'aria-label': 'Time signature' }, BB.JAM_METERS.map((m) => h('option', { value: m.id }, m.id)));
      meterSel.value = BB.sigLabel(pattern);
      meterSel.addEventListener('change', () => {
        const mt = meterById(meterSel.value);
        const next = BB.makePattern(mt.sig, mt.res, pattern.bpm, {});
        next.swing = pattern.swing;
        const n = BB.meterInfo(next).steps;
        BB.ROWS.forEach((r) => { for (let i = 0; i < n; i++) next.tracks[r][i] = pattern.tracks[r][i] || 0; });
        setPattern(next);
      });

      const presetSel = h('select.select', { 'aria-label': 'Load a preset' },
        h('option', { value: '' }, 'Presets…'),
        BB.JAM_PRESETS.map((p, i) => h('option', { value: String(i) }, p.name + '  ·  ' + p.meter)));
      presetSel.addEventListener('change', () => {
        if (presetSel.value === '') return;
        setPattern(fromPreset(BB.JAM_PRESETS[+presetSel.value]));
        presetSel.value = '';
      });

      const clickBtn = BB.ledToggle('Click', clickOn, (on) => { clickOn = on; });
      const dice = h('button.btn.icon-btn', { type: 'button', title: 'Random groove', 'aria-label': 'Random groove', onclick: () => { const p = randomGroove(pattern); p.bpm = pattern.bpm; p.swing = pattern.swing; setPattern(p); } }, BB.icon('dice'));
      const clear = h('button.btn.icon-btn', { type: 'button', title: 'Clear', 'aria-label': 'Clear all', onclick: () => { BB.ROWS.forEach((r) => pattern.tracks[r].fill(0)); grid.sync(); save(); } }, BB.icon('clear'));
      const share = h('button.btn.icon-btn', { type: 'button', title: 'Copy share link', 'aria-label': 'Copy share link', onclick: doShare }, BB.icon('share'));

      const lcdStep = h('b', '--');
      const lcdCount = h('span.lcd-count', '—');
      const lcdMeter = h('b', BB.sigLabel(pattern));
      const lcd = h('div.lcd',
        h('span.lcd-cell', h('small', 'Meter'), lcdMeter),
        h('span.lcd-cell', h('small', 'Step'), lcdStep),
        h('span.lcd-cell.grow.hide-sm', h('small', 'Keys'), h('span.lcd-line', 'A S D F G H J K L to play · Space to start')),
        h('span.lcd-cell.count', lcdCount));

      root.append(h('div.jam.panel',
        h('div.mode-head', h('div', h('div.eyebrow', 'Free play'), h('h2', 'Jam'), h('p.lede', 'The whole machine. Build a groove, change the meter, add swing, share it.'))),
        lcd,
        h('div.jam-bar', play, bpm, swingWrap, h('label.ctl', h('small', 'Meter'), meterSel), clickBtn, h('span.spacer'), presetSel, dice, clear, share),
        grid.el));
      grid.render(pattern, BB.ROWS);

      function setPattern(p) {
        pattern = p;
        bpm.set(p.bpm);
        swing.value = Math.round((p.swing || 0) * 100);
        swingVal.textContent = swing.value + '%';
        meterSel.value = BB.sigLabel(p);
        lcdMeter.textContent = BB.sigLabel(p);
        grid.render(pattern, BB.ROWS);
        save();
        if (BB.seq.isOwner(owner)) { BB.seq.stop(); start(); }
      }

      function start() {
        BB.seq.start({
          owner,
          provider: () => ({ pattern }),
          metronome: () => clickOn,
          onStep: (ev) => {
            grid.setPlayhead(ev.step, true);
            lcdStep.textContent = BB.pad2(ev.step + 1) + '/' + BB.pad2(ev.steps);
            lcdCount.textContent = ev.m.counts[ev.step];
            lcdCount.classList.toggle('beat', ev.m.groupStart[ev.step]);
          },
          onStop: () => { play.setPlaying(false); grid.setPlayhead(-1); lcdStep.textContent = '--'; lcdCount.textContent = '—'; },
        });
        play.setPlaying(true);
      }
      function toggle() { if (BB.seq.isOwner(owner)) BB.seq.stop(); else start(); }

      function doShare() {
        const url = location.href.split('#')[0] + '#jam=' + BB.encodeJam(pattern);
        const done = () => BB.toast('Share link copied to clipboard');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => window.prompt('Copy this link:', url));
        else window.prompt('Copy this link:', url);
      }

      const keyMap = {};
      BB.ROWS.forEach((r) => { keyMap[BB.INSTRUMENTS[r].key] = r; });

      return {
        unmount() { if (BB.seq.isOwner(owner)) BB.seq.stop(); },
        onSpace: toggle,
        onKey(e) {
          const r = keyMap[e.key.toLowerCase()];
          if (r && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat) {
            BB.playLive(r);
            const label = grid.el.querySelector('.row[data-row="' + r + '"] .row-label');
            if (label) label.animate([{ filter: 'brightness(1.8)' }, { filter: 'brightness(1)' }], { duration: 200 });
          }
        },
      };
    },
  };
})(window.BB);
