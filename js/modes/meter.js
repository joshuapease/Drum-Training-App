/* Backbeat — METER: hear a groove, name its time signature. */
(function (BB) {
  'use strict';
  const h = BB.h;
  BB.modes = BB.modes || {};

  const DIFFS = {
    easy:   { sigs: ['2/4', '3/4', '4/4'], choices: 3, metronome: true },
    medium: { sigs: ['2/4', '3/4', '4/4', '6/8', '12/8'], choices: 4, metronome: true },
    hard:   { sigs: ['3/4', '4/4', '5/4', '6/8', '7/8', '12/8'], choices: 4, metronome: false },
  };

  function make(diffId) {
    const d = DIFFS[diffId];
    const sig = BB.pick(d.sigs);
    const g = BB.pick(BB.METER_GROOVES[sig]);
    const pattern = BB.makePattern(BB.parseSig(sig), g.res, g.bpm + BB.randInt(-6, 6), g.tracks);
    const m = BB.meterInfo(pattern);
    const barSec = (m.steps * 60) / pattern.bpm / m.spq;
    const bars = Math.max(2, Math.ceil(7.5 / barSec));
    const others = BB.shuffle(d.sigs.filter((s) => s !== sig)).slice(0, d.choices - 1);
    const options = BB.shuffle([sig].concat(others)).map((s) => ({ id: s, label: BB.timeSig(s, 'lg') }));
    const info = BB.METER_INFO[sig];
    const rows = BB.ROWS.filter((r) => r !== 'crash' && pattern.tracks[r].some(Boolean));
    return {
      prompt: 'What time signature is this groove in?',
      options,
      answer: sig,
      play: BB.quizPlayback(pattern, bars, d.metronome),
      explain: `It’s <b>${sig}</b> — ${info.desc}`,
      reveal: (box, owner) => BB.revealGrid(box, pattern, rows, owner),
    };
  }

  BB.modes.meter = {
    mount(root) {
      return BB.Quiz(root, {
        id: 'meter',
        title: 'Meter',
        eyebrow: 'Ear training',
        lede: 'A groove plays with a crash on beat 1. Count the beats until the next bar comes around, then pick the time signature.',
        rounds: 8,
        diffs: [
          { id: 'easy', name: 'Easy', desc: '2/4, 3/4 and 4/4 — with a click track to help.' },
          { id: 'medium', name: 'Medium', desc: 'Adds 6/8 and 12/8. Listen for groups of three.' },
          { id: 'hard', name: 'Hard', desc: 'Odd meters 5/4 and 7/8 — and no click.' },
        ],
        make,
      });
    },
  };
})(window.BB);
