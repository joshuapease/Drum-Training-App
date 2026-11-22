/* Backbeat — NOTES: read note values and rests, and hear subdivisions. */
(function (BB) {
  'use strict';
  const h = BB.h;
  BB.modes = BB.modes || {};

  const NV = () => BB.NOTE_VALUES;
  const glyphBox = (html, cls) => h('div.q-glyph' + (cls ? '.' + cls : ''), { html });
  const BEAT_OPTS = ['4', '2', '1', '½', '¼'];

  const SUBDIV = [
    { id: 'half', name: 'Half notes', res: 4, hat: 'x....... x.......', explain: 'One hat every <b>two</b> beats.' },
    { id: 'quarter', name: 'Quarter notes', res: 4, hat: 'x... x... x... x...', explain: 'One hat on <b>every beat</b>: 1 2 3 4.' },
    { id: 'eighth', name: 'Eighth notes', res: 4, hat: 'x.x. x.x. x.x. x.x.', explain: '<b>Two</b> hats per beat: 1 & 2 & 3 & 4 &.' },
    { id: 'sixteenth', name: 'Sixteenth notes', res: 4, hat: 'xxxx xxxx xxxx xxxx', explain: '<b>Four</b> hats per beat: 1 e & a 2 e & a…' },
    { id: 'triplet', name: 'Triplets', res: 3, hat: 'xxx xxx xxx xxx', explain: '<b>Three</b> hats per beat: 1 & a 2 & a…' },
  ];

  function pickOthers(all, correct, n) {
    return BB.shuffle([correct].concat(BB.shuffle(all.filter((x) => x !== correct)).slice(0, n - 1)));
  }

  const Q = {
    nameNote() {
      const nv = BB.pick(NV());
      const opts = pickOthers(NV().map((n) => n.id), nv.id, 4);
      return {
        prompt: 'What is this note called?',
        visual: glyphBox(BB.glyph('note-' + nv.id)),
        options: opts.map((id) => ({ id, label: BB.noteValue(id).name + ' note' })),
        answer: nv.id,
        explain: `<b>${nv.name} note</b> — ${nv.note}`,
      };
    },
    nameRest() {
      const nv = BB.pick(NV());
      const opts = pickOthers(NV().map((n) => n.id), nv.id, 4);
      return {
        prompt: 'What is this rest called?',
        visual: glyphBox(BB.glyph('rest-' + nv.id), 'rest'),
        options: opts.map((id) => ({ id, label: BB.noteValue(id).name + ' rest' })),
        answer: nv.id,
        explain: `<b>${nv.name} rest</b> — ${nv.rest}`,
      };
    },
    beats(withRests) {
      const nv = BB.pick(NV());
      const rest = withRests && Math.random() < 0.4;
      const opts = pickOthers(BEAT_OPTS, nv.beatsLabel, 4);
      return {
        prompt: `In 4/4, how many beats does this ${rest ? 'rest' : 'note'} last?`,
        visual: glyphBox(BB.glyph((rest ? 'rest-' : 'note-') + nv.id), rest ? 'rest' : ''),
        options: opts.map((b) => ({ id: b, label: h('span.big-num', b) })),
        answer: nv.beatsLabel,
        explain: `A ${nv.name.toLowerCase()} ${rest ? 'rest' : 'note'} lasts <b>${BB.beatsText(nv)}</b>. ${rest ? nv.rest : nv.note}`,
      };
    },
    fit() {
      const vals = NV();
      const bi = BB.randInt(0, vals.length - 2);
      const si = BB.randInt(bi + 1, Math.min(vals.length - 1, bi + 3));
      const big = vals[bi], small = vals[si];
      const ans = String(big.beats / small.beats);
      const opts = pickOthers(['2', '3', '4', '6', '8', '12', '16'], ans, 4).sort((a, b) => a - b);
      return {
        prompt: `How many ${small.name.toLowerCase()} notes fit in one ${big.name.toLowerCase()} note?`,
        visual: h('div.q-equation',
          glyphBox(BB.glyph('note-' + big.id)), h('span.eq', '='), h('span.eq.q', '?'), h('span.eq', '×'), glyphBox(BB.glyph('note-' + small.id))),
        options: opts.map((n) => ({ id: n, label: h('span.big-num', n) })),
        answer: ans,
        explain: `A ${big.name.toLowerCase()} note is ${BB.beatsText(big)}; a ${small.name.toLowerCase()} is ${BB.beatsText(small)}. That’s <b>${ans}</b> of them.`,
      };
    },
    hear() {
      const sd = BB.pick(SUBDIV);
      const kick = sd.res === 3 ? 'x.. x.. x.. x..' : 'x... x... x... x...';
      const hat = sd.id === 'half' ? 'x....... x.......' : sd.hat;
      const pattern = BB.makePattern([4, 4], sd.res, BB.randInt(80, 96), { kick, hat });
      const opts = pickOthers(SUBDIV.map((s) => s.id), sd.id, 4);
      return {
        prompt: 'The kick marks each beat. What is the hi-hat playing?',
        options: opts.map((id) => {
          const s = SUBDIV.find((x) => x.id === id);
          return { id, label: h('span.sub-opt', h('span.sub-glyph', { html: BB.subdivisionGlyph(id) }), h('span', s.name)) };
        }),
        answer: sd.id,
        play: (hooks) => BB.seq.start({
          owner: hooks.owner,
          provider: (bar) => (bar < 2 ? { pattern } : null),
          metronome: false,
          onStep: hooks.onStep,
          onStop: hooks.onStop,
        }),
        explain: `<b>${sd.name}</b>. ${sd.explain}`,
        reveal: (box, owner) => BB.revealGrid(box, pattern, ['kick', 'hat'], owner),
      };
    },
  };

  function make(diff, round) {
    let pool;
    if (diff === 'easy') pool = [Q.nameNote, Q.nameNote, () => Q.beats(false)];
    else if (diff === 'medium') pool = [Q.nameNote, Q.nameRest, () => Q.beats(true), Q.fit];
    else pool = [Q.hear, Q.hear, Q.nameRest, () => Q.beats(true), Q.fit];
    if (diff === 'hard' && round === 0) return Q.hear();
    return BB.pick(pool)();
  }

  BB.modes.notes = {
    mount(root) {
      return BB.Quiz(root, {
        id: 'notes',
        title: 'Notes',
        eyebrow: 'Reading rhythm',
        lede: 'Name notes and rests, count their beats, and hear subdivisions. The building blocks of every groove.',
        rounds: 10,
        diffs: [
          { id: 'easy', name: 'Notes', desc: 'Whole to sixteenth notes, and how many beats each one lasts.' },
          { id: 'medium', name: 'Notes & Rests', desc: 'Adds rests and note math — how many eighths fit in a half?' },
          { id: 'hard', name: 'By Ear', desc: 'Hear the hi-hat and name the subdivision, plus everything above.' },
        ],
        make,
      });
    },
  };
})(window.BB);
