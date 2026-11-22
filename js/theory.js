/* Backbeat — rhythm theory core: instruments, meters, patterns. */
window.BB = window.BB || {};
(function (BB) {
  'use strict';

  // Row order is also the colour order: a warm-to-cool spectrum down the machine.
  BB.INSTRUMENTS = {
    kick:  { id: 'kick',  name: 'Kick',     short: 'BD', color: '#ff5a36', key: 'a' },
    snare: { id: 'snare', name: 'Snare',    short: 'SD', color: '#ff8a2a', key: 's' },
    hat:   { id: 'hat',   name: 'Hi-Hat',   short: 'CH', color: '#ffbf2e', key: 'd' },
    ohat:  { id: 'ohat',  name: 'Open Hat', short: 'OH', color: '#e6dc4a', key: 'f' },
    clap:  { id: 'clap',  name: 'Clap',     short: 'CP', color: '#a8dc5c', key: 'g' },
    tomH:  { id: 'tomH',  name: 'High Tom', short: 'HT', color: '#55d6a8', key: 'h' },
    tomL:  { id: 'tomL',  name: 'Low Tom',  short: 'LT', color: '#45b8e6', key: 'j' },
    ride:  { id: 'ride',  name: 'Ride',     short: 'RD', color: '#7b8cff', key: 'k' },
    crash: { id: 'crash', name: 'Crash',    short: 'CR', color: '#b78bff', key: 'l' },
  };
  BB.ROWS = ['kick', 'snare', 'hat', 'ohat', 'clap', 'tomH', 'tomL', 'ride', 'crash'];

  // How eighth-note meters group into felt beats.
  const GROUPS8 = { 3: [3], 5: [3, 2], 6: [3, 3], 7: [2, 2, 3], 9: [3, 3, 3], 12: [3, 3, 3, 3] };

  const cache = new Map();

  /**
   * Derive the step layout for a pattern.
   * pattern.sig = [num, den], pattern.res = steps per quarter note (1, 2, 3 or 4).
   */
  BB.meterInfo = function (p) {
    const key = p.sig[0] + '/' + p.sig[1] + ':' + p.res;
    if (cache.has(key)) return cache.get(key);
    const num = p.sig[0], den = p.sig[1], res = p.res;
    let groups;
    if (den === 4) {
      groups = new Array(num).fill(res);
    } else {
      const per8 = Math.max(1, Math.round(res / 2));
      groups = (GROUPS8[num] || new Array(num).fill(1)).map((g) => g * per8);
    }
    const steps = groups.reduce((a, b) => a + b, 0);
    const groupStart = [], beatOf = [], posInGroup = [];
    groups.forEach((g, gi) => {
      for (let j = 0; j < g; j++) { groupStart.push(j === 0); beatOf.push(gi); posInGroup.push(j); }
    });

    // Counting syllables shown under the grid.
    const counts = [];
    if (den === 4) {
      const syl = { 1: [''], 2: ['', '&'], 3: ['', '&', 'a'], 4: ['', 'e', '&', 'a'] }[res] || [''];
      for (let b = 0; b < num; b++) for (let j = 0; j < res; j++) counts.push(j === 0 ? String(b + 1) : syl[j]);
    } else {
      const per8 = Math.max(1, Math.round(res / 2));
      const tripletCount = (num === 9 || num === 12);
      let eighth = 0;
      groups.forEach((g, gi) => {
        const n8 = g / per8;
        for (let e = 0; e < n8; e++) {
          for (let k = 0; k < per8; k++) {
            if (k > 0) { counts.push('&'); continue; }
            if (tripletCount) counts.push(e === 0 ? String(gi + 1) : (e === 1 ? '&' : 'a'));
            else counts.push(String(eighth + 1));
          }
          eighth++;
        }
      });
    }

    const info = { num, den, res, spq: res, groups, steps, groupStart, beatOf, posInGroup, counts };
    cache.set(key, info);
    return info;
  };

  BB.sigLabel = (p) => p.sig[0] + '/' + p.sig[1];
  BB.parseSig = (s) => s.split('/').map(Number);

  /** Build a pattern from compact strings: 'x' = hit, '.' = rest, anything else ignored. */
  BB.makePattern = function (sig, res, bpm, tracks, extra) {
    const p = { sig: sig.slice(), res: res, bpm: bpm, swing: 0, tracks: {} };
    const m = BB.meterInfo(p);
    BB.ROWS.forEach((r) => { p.tracks[r] = new Array(m.steps).fill(0); });
    if (tracks) {
      Object.keys(tracks).forEach((r) => {
        const str = String(tracks[r]).replace(/[^x.]/gi, '');
        if (str.length !== m.steps && window.console) console.warn('[backbeat] track length mismatch', r, str.length, 'expected', m.steps);
        for (let i = 0; i < m.steps; i++) p.tracks[r][i] = str[i] && str[i].toLowerCase() === 'x' ? 1 : 0;
      });
    }
    return Object.assign(p, extra || {});
  };

  BB.clonePattern = function (p) {
    const c = Object.assign({}, p, { sig: p.sig.slice(), tracks: {} });
    Object.keys(p.tracks).forEach((r) => { c.tracks[r] = p.tracks[r].slice(); });
    return c;
  };

  BB.emptyLike = function (p) {
    const c = BB.clonePattern(p);
    Object.keys(c.tracks).forEach((r) => c.tracks[r].fill(0));
    return c;
  };

  BB.hitCount = function (p, rows) {
    return (rows || BB.ROWS).reduce((n, r) => n + (p.tracks[r] || []).reduce((a, b) => a + (b ? 1 : 0), 0), 0);
  };

  /** Compare a guess to the target over the given rows. */
  BB.evaluate = function (target, guess, rows) {
    let correct = 0, missed = 0, extra = 0, wanted = 0;
    rows.forEach((r) => {
      const t = target.tracks[r], g = guess.tracks[r];
      for (let i = 0; i < t.length; i++) {
        if (t[i]) wanted++;
        if (t[i] && g[i]) correct++;
        else if (t[i]) missed++;
        else if (g[i]) extra++;
      }
    });
    const accuracy = wanted + extra === 0 ? 1 : correct / (wanted + extra);
    return { correct, missed, extra, wanted, accuracy };
  };

  /** Natural dynamics so a grid of on/off steps still grooves. */
  BB.velocity = function (row, step, m) {
    const pos = m.posInGroup[step];
    const evenGroup = m.groups[m.beatOf[step]] % 2 === 0;
    let v;
    if (row === 'hat' || row === 'ride' || row === 'ohat') {
      if (pos === 0) v = 0.95;
      else if (evenGroup) v = pos % 2 === 0 ? 0.76 : 0.6;
      else v = 0.7;
    } else if (row === 'kick' || row === 'snare' || row === 'clap') {
      v = pos === 0 ? 1 : 0.9;
    } else {
      v = 0.92;
    }
    return Math.min(1, v * (0.95 + Math.random() * 0.08));
  };

  /** Swing pushes every second subdivision late (straight meters only). */
  BB.swingOffset = function (p, m, step, dur) {
    if (!p.swing || m.den !== 4 || (m.spq !== 2 && m.spq !== 4)) return 0;
    return step % 2 === 1 ? p.swing * dur * 0.42 : 0;
  };

  BB.METER_INFO = {
    '4/4':  { title: 'Common time', desc: 'Four quarter-note beats per bar. Rock, pop, hip-hop, house — nearly everything.' },
    '3/4':  { title: 'Waltz time', desc: 'Three beats per bar. The oom-pah-pah of a waltz.' },
    '2/4':  { title: 'March time', desc: 'Two beats per bar. Marches and polkas — left, right, left, right.' },
    '6/8':  { title: 'Compound duple', desc: 'Six eighth notes felt as two big beats of three: 1 2 3 4 5 6. A rolling, swaying feel.' },
    '12/8': { title: 'Compound quadruple', desc: 'Twelve eighths in four groups of three. Slow blues, soul ballads and shuffles.' },
    '5/4':  { title: 'Five', desc: 'Five beats per bar, usually felt as 3 + 2. Jazzy and a little off-kilter.' },
    '7/8':  { title: 'Seven', desc: 'Seven eighth notes grouped 2 + 2 + 3. Balkan folk, prog rock and film scores.' },
  };
})(window.BB);
