/* Backbeat — a small quiz engine shared by METER and NOTES. */
(function (BB) {
  'use strict';
  const h = BB.h;

  const RANKS = [
    [1, 'Metronome Monk', 'Flawless. Your inner clock is atomic.'],
    [0.8, 'Pocket Pro', 'Seriously solid. Go for the perfect run.'],
    [0.6, 'Groove Getter', 'You’re feeling it. A couple more rounds and it’ll click.'],
    [0.4, 'Beat Rookie', 'Good start. Revisit the lessons and come back.'],
    [0, 'Off-Beat', 'Everyone starts here. Try Learn mode first, then retry.'],
  ];

  /**
   * cfg: { id, title, eyebrow, lede, rounds, diffs: [{ id, name, desc }], make(diffId, round) → question }
   * question: { prompt, visual?: Node, options: [{ id, label: Node|string }], answer, explain, play?: (orbEl) => void, reveal?: (box) => void }
   */
  BB.Quiz = function (root, cfg) {
    const owner = {};
    let state = null;

    function stopAudio() { if (BB.seq.isOwner(owner)) BB.seq.stop(); }

    function menu() {
      stopAudio();
      root.innerHTML = '';
      state = { view: 'menu' };
      const best = BB.store.get('best', {});
      const lastDiff = BB.store.get(cfg.id + 'Diff', cfg.diffs[0].id);
      const cards = cfg.diffs.map((d, i) => {
        const b = best[cfg.id + ':' + d.id];
        return h('button.diff-card' + (d.id === lastDiff ? '.suggest' : ''), { type: 'button', onclick: () => start(d.id) },
          h('span.diff-level', [0, 1, 2].map((k) => h('i' + (k <= i ? '.on' : '')))),
          h('b', d.name),
          h('small', d.desc),
          h('span.diff-best', b != null ? 'Best ' + b : 'Not played yet'));
      });
      root.append(h('div.quiz-menu.panel',
        h('div.mode-head', h('div', h('div.eyebrow', cfg.eyebrow), h('h2', cfg.title), h('p.lede', cfg.lede))),
        h('div.diff-grid', cards),
        h('p.quiz-foot', cfg.rounds + ' rounds · streaks score bonus points · keys 1–4 answer, Enter continues')));
    }

    function start(diff) {
      BB.store.set(cfg.id + 'Diff', diff);
      state = { view: 'q', diff, round: 0, score: 0, streak: 0, correct: 0, results: [] };
      next();
    }

    function next() {
      stopAudio();
      if (state.round >= cfg.rounds) return end();
      const q = state.q = cfg.make(state.diff, state.round);
      state.answered = false;
      root.innerHTML = '';

      const progress = h('div.q-progress', Array.from({ length: cfg.rounds }, (_, i) => {
        const r = state.results[i];
        return h('i' + (r === true ? '.ok' : r === false ? '.bad' : i === state.round ? '.cur' : ''));
      }));
      const status = h('div.q-status',
        h('span', h('small', 'Round'), h('b', (state.round + 1) + '/' + cfg.rounds)),
        h('span', h('small', 'Score'), h('b.score', String(state.score))),
        h('span' + (state.streak >= 2 ? '.hot' : ''), h('small', 'Streak'), h('b', '×' + state.streak)));

      let visual = q.visual || null;
      if (q.play) {
        const orb = BB.orb(() => togglePlay());
        visual = h('div.q-listen', orb, h('small', 'Tap to replay · Space'));
        state.orb = orb;
      }
      const opts = h('div.q-options' + (q.options.length > 4 ? '.many' : ''), q.options.map((o, i) =>
        h('button.q-opt', { type: 'button', dataset: { id: o.id }, onclick: () => answer(o.id) },
          h('span.q-key', String(i + 1)), h('span.q-label', o.label))));
      state.optsEl = opts;
      const feedback = h('div.q-feedback');
      state.feedback = feedback;

      root.append(h('div.quiz.panel',
        h('div.q-top', h('button.btn.ghost-btn', { type: 'button', onclick: menu }, BB.icon('back'), h('span', cfg.title)), status),
        progress,
        h('div.q-prompt', q.prompt),
        visual ? h('div.q-visual', visual) : null,
        opts,
        feedback));

      if (q.play) setTimeout(() => { if (state && state.q === q && !BB.seq.playing) togglePlay(); }, 350);
    }

    function togglePlay() {
      const q = state && state.q;
      if (!q || !q.play) return;
      if (BB.seq.isOwner(owner)) { BB.seq.stop(); return; }
      const orb = state.orb;
      q.play({
        owner,
        onStep: (ev) => { if (ev.hits.length && orb) orb.pulse(ev.hits.indexOf('kick') >= 0 || ev.hits.indexOf('crash') >= 0); },
        onStop: () => orb && orb.setPlaying(false),
      });
      if (orb) orb.setPlaying(true);
    }

    function answer(id) {
      if (!state || state.view !== 'q' || state.answered) return;
      state.answered = true;
      const q = state.q;
      const ok = id === q.answer;
      state.results[state.round] = ok;
      if (ok) {
        state.correct++;
        state.score += 100 + Math.min(state.streak, 4) * 25;
        state.streak++;
        BB.engine.chime('good');
      } else {
        state.streak = 0;
        BB.engine.chime('bad');
      }
      state.optsEl.querySelectorAll('.q-opt').forEach((b) => {
        b.disabled = true;
        if (b.dataset.id === q.answer) b.classList.add('right');
        else if (b.dataset.id === id) b.classList.add('wrong');
      });
      if (!ok) BB.shake(state.optsEl.querySelector('.wrong'));
      root.querySelector('.score').textContent = String(state.score);
      const fb = state.feedback;
      fb.innerHTML = '';
      const nextBtn = h('button.btn.primary', { type: 'button', onclick: () => { state.round++; next(); } },
        h('span', state.round + 1 >= cfg.rounds ? 'See results' : 'Next'), BB.icon('next'));
      fb.append(h('div.fb-text', h('b', ok ? BB.pick(['Correct!', 'Yes!', 'Nice ear.', 'Right on.']) : 'Not quite.'), h('p', { html: q.explain })));
      if (q.reveal) {
        const box = h('div.fb-reveal');
        fb.append(box);
        q.reveal(box, owner);
      }
      fb.append(h('div.fb-actions', nextBtn));
      fb.classList.add('show', ok ? 'ok' : 'bad');
      nextBtn.focus({ preventScroll: true });
      setTimeout(() => fb.scrollIntoView && fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 40);
    }

    function end() {
      stopAudio();
      root.innerHTML = '';
      const frac = state.correct / cfg.rounds;
      const rank = RANKS.find((r) => frac >= r[0]);
      const best = BB.store.get('best', {});
      const key = cfg.id + ':' + state.diff;
      const isBest = best[key] == null || state.score > best[key];
      if (isBest) { best[key] = state.score; BB.store.set('best', best); }
      const diff = cfg.diffs.find((d) => d.id === state.diff);
      root.append(h('div.quiz-end.panel',
        h('div.eyebrow', cfg.title + ' · ' + diff.name),
        h('div.end-score', String(state.score)),
        isBest && state.score > 0 ? h('div.badge', 'New best!') : h('div.end-best', 'Best ' + best[key]),
        h('div.end-rank', h('b', rank[1]), h('p', rank[2])),
        h('div.q-progress.big', state.results.map((r) => h('i' + (r ? '.ok' : '.bad')))),
        h('p.end-line', state.correct + ' of ' + cfg.rounds + ' correct'),
        h('div.end-actions',
          h('button.btn', { type: 'button', onclick: menu }, h('span', 'Change difficulty')),
          h('button.btn.primary', { type: 'button', onclick: () => start(state.diff) }, BB.icon('replay'), h('span', 'Play again')))));
      if (frac === 1) { BB.engine.chime('win'); setTimeout(BB.confetti, 250); }
      state.view = 'end';
    }

    menu();

    return {
      unmount: stopAudio,
      onSpace() { if (state && state.view === 'q') togglePlay(); },
      onKey(e) {
        if (!state) return;
        if (state.view === 'q' && !state.answered && /^[1-9]$/.test(e.key)) {
          const o = state.q.options[+e.key - 1];
          if (o) answer(o.id);
        } else if (state.view === 'q' && state.answered && e.key === 'Enter' && !(e.target && e.target.closest && e.target.closest('button'))) {
          state.round++; next();
        }
      },
    };
  };

  /** Play a pattern for a fixed number of bars (crash on the first downbeat). */
  BB.quizPlayback = function (pattern, bars, metronome) {
    const first = BB.clonePattern(pattern);
    first.tracks.crash[0] = 1;
    return (hooks) => BB.seq.start({
      owner: hooks.owner,
      provider: (bar) => (bar < bars ? { pattern: bar === 0 ? first : pattern } : null),
      metronome,
      onStep: hooks.onStep,
      onStop: hooks.onStop,
    });
  };

  /** A read-only grid that can replay the answer with counting. */
  BB.revealGrid = function (box, pattern, rows, quizOwner) {
    const owner = quizOwner || {};
    const grid = new BB.StepGrid({ editable: false, counts: true });
    grid.render(pattern, rows);
    const btn = BB.playButton('Hear it with counting', () => {
      if (BB.seq.isOwner(owner)) { BB.seq.stop(); return; }
      BB.seq.start({
        owner,
        provider: (bar) => (bar < 2 ? { pattern } : null),
        metronome: true,
        onStep: (ev) => grid.setPlayhead(ev.step, true),
        onStop: () => { grid.setPlayhead(-1); btn.setPlaying(false); },
      });
      btn.setPlaying(true);
    });
    box.append(grid.el, h('div.reveal-bar', btn));
  };
})(window.BB);
