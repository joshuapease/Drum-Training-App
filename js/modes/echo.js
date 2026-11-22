/* Backbeat — ECHO: hear a beat, rebuild it on the grid. */
(function (BB) {
  'use strict';
  const h = BB.h;
  BB.modes = BB.modes || {};

  const stars = () => BB.store.get('stars', {});
  const starsFor = (id) => stars()[id] || 0;
  BB.totalStars = () => Object.values(stars()).reduce((a, b) => a + b, 0);

  function unlocked(level) {
    if (level.index === 0) return true;
    return starsFor(BB.LEVELS[level.index - 1].id) > 0 || starsFor(level.id) > 0;
  }

  function starsForAccuracy(acc) {
    if (acc >= 0.999) return 3;
    if (acc >= 0.8) return 2;
    if (acc >= 0.5) return 1;
    return 0;
  }

  BB.modes.echo = {
    mount(root, params) {
      let view = null;
      const owner = {};

      function clear() {
        if (BB.seq.isOwner(owner)) BB.seq.stop();
        root.innerHTML = '';
        view = null;
      }

      // ------------------------------------------------------ level select
      function showSelect(focusId) {
        clear();
        const wrap = h('div.echo-select');
        wrap.append(h('div.mode-head',
          h('div', h('div.eyebrow', 'Ear training'), h('h2', 'Echo'),
            h('p.lede', 'Listen to a beat, then rebuild it on the grid. Nail it for three stars.')),
          h('div.mode-stat', BB.star(true), h('b', String(BB.totalStars())), h('span', '/ ' + BB.TOTAL_STARS))));
        BB.TIERS.forEach((t, ti) => {
          const tierStars = t.levels.reduce((n, l) => n + starsFor(l.id), 0);
          const tiles = t.levels.map((l) => {
            const open = unlocked(l);
            const s = starsFor(l.id);
            const tile = h('button.level-tile' + (open ? '' : '.locked') + (s === 3 ? '.perfect' : ''),
              { type: 'button', disabled: !open, onclick: () => open && showLevel(l.id) },
              h('span.lt-num', BB.pad2(l.index + 1)),
              h('span.lt-name', l.name),
              h('span.lt-meta', BB.timeSig(l.sig.join('/'), 'xs'), h('span', l.rows.length + (l.rows.length === 1 ? ' drum' : ' drums'))),
              open ? BB.starRow(s) : h('span.lt-lock', BB.icon('lock')));
            if (l.id === focusId) tile.classList.add('just');
            return tile;
          });
          wrap.append(h('section.tier',
            h('header.tier-head', h('span.tier-num', 'Tier ' + (ti + 1)), h('h3', t.name), h('p', t.blurb),
              h('span.tier-stars', BB.star(true), tierStars + ' / ' + t.levels.length * 3)),
            h('div.level-grid', tiles)));
        });
        root.append(wrap);
        view = { kind: 'select' };
      }

      // ------------------------------------------------------------- round
      function showLevel(id) {
        clear();
        const level = BB.levelById(id);
        if (!level) return showSelect();
        const target = BB.levelPattern(level);
        const user = BB.emptyLike(target);
        const rows = level.rows;
        let hintUsed = false;
        let revealed = false;
        let mode = null;          // 'listen' | 'mine' | 'compare' | 'solo'
        let soloRow = null;
        let clickOn = BB.store.get('echoClick', true);
        let checks = 0;

        // LCD
        const lcdStatus = h('span.lcd-status', 'Press Listen');
        const lcdCount = h('span.lcd-count', '—');
        const lcdTag = h('span.lcd-tag');
        const lcd = h('div.lcd',
          h('span.lcd-cell', h('small', 'Meter'), h('b', level.sig.join('/'))),
          h('span.lcd-cell', h('small', 'Tempo'), h('b', String(level.bpm))),
          h('span.lcd-cell.grow', h('small', 'Status'), h('span.lcd-line', lcdTag, lcdStatus)),
          h('span.lcd-cell.count', lcdCount));

        const soloButtons = {};
        const grid = new BB.StepGrid({
          editable: true,
          counts: true,
          rowExtra: (r) => {
            const b = h('button.btn.icon-btn.solo', { type: 'button', title: 'Hint: hear only the ' + BB.INSTRUMENTS[r].name.toLowerCase(), 'aria-label': 'Hint: solo ' + BB.INSTRUMENTS[r].name }, BB.icon('ear'));
            b.addEventListener('click', () => solo(r));
            soloButtons[r] = b;
            return b;
          },
          onChange: () => {
            grid.clearMarks();
            if (revealed) grid.showGhost(target);
            result.classList.remove('show');
          },
        });
        grid.render(user, rows);

        const listenBtn = BB.playButton('Listen', () => play('listen'), 'primary');
        const mineBtn = BB.playButton('Play mine', () => play('mine'));
        const compareBtn = h('button.btn', { type: 'button', onclick: () => play('compare'), title: 'Alternate: target, then yours' }, BB.icon('swap'), h('span.lbl', 'A/B'));
        const clickBtn = BB.ledToggle('Click', clickOn, (on) => { clickOn = on; BB.store.set('echoClick', on); });
        const clearBtn = h('button.btn.ghost-btn', { type: 'button', onclick: () => { user.tracks && rows.forEach((r) => user.tracks[r].fill(0)); grid.sync(); grid.clearMarks(); if (revealed) grid.showGhost(target); result.classList.remove('show'); } }, BB.icon('clear'), h('span', 'Clear'));
        const checkBtn = h('button.btn.check', { type: 'button', onclick: () => check() }, BB.icon('check'), h('span', 'Check'));

        const result = h('div.result');

        const head = h('div.round-head',
          h('button.btn.ghost-btn.back', { type: 'button', onclick: () => showSelect(level.id) }, BB.icon('back'), h('span', 'Levels')),
          h('div.round-title', h('span.eyebrow', 'Level ' + BB.pad2(level.index + 1)), h('h2', level.name)),
          h('div.round-best', BB.starRow(starsFor(level.id))));

        const panel = h('div.round.panel',
          head,
          lcd,
          h('p.hint', level.hint),
          grid.el,
          h('div.transport', listenBtn, mineBtn, compareBtn, clickBtn, h('span.spacer'), clearBtn, checkBtn),
          result);
        root.append(panel);

        function updateButtons() {
          const playing = BB.seq.isOwner(owner);
          listenBtn.setPlaying(playing && mode === 'listen');
          mineBtn.setPlaying(playing && mode === 'mine');
          compareBtn.classList.toggle('is-playing', playing && mode === 'compare');
          Object.keys(soloButtons).forEach((r) => soloButtons[r].classList.toggle('is-playing', playing && mode === 'solo' && soloRow === r));
          panel.dataset.mode = playing ? mode : '';
        }

        function play(kind, row) {
          if (BB.seq.isOwner(owner) && mode === kind && (kind !== 'solo' || soloRow === row)) {
            BB.seq.stop();
            return;
          }
          mode = kind;
          soloRow = row || null;
          const loops = kind === 'solo' ? 2 : Infinity;
          BB.seq.start({
            owner,
            countIn: kind === 'listen' || kind === 'solo',
            metronome: () => clickOn,
            provider: (bar) => {
              if (bar >= loops) return null;
              if (kind === 'listen') return { pattern: target, tag: 'target' };
              if (kind === 'mine') return { pattern: user, rows, tag: 'mine' };
              if (kind === 'solo') return { pattern: target, rows: [soloRow], tag: 'target' };
              return bar % 2 === 0 ? { pattern: target, tag: 'target' } : { pattern: user, rows, tag: 'mine' };
            },
            onStep: (ev) => {
              grid.setPlayhead(ev.countIn ? -1 : ev.step, ev.tag === 'mine');
              const label = ev.m.counts[ev.step];
              if (ev.countIn) {
                if (ev.m.groupStart[ev.step]) lcdCount.textContent = String(ev.m.beatOf[ev.step] + 1);
                lcdTag.textContent = 'Count-in';
                lcdStatus.textContent = '';
              } else {
                lcdCount.textContent = label;
                lcdTag.textContent = ev.tag === 'mine' ? 'Yours' : 'Target';
                lcdTag.className = 'lcd-tag ' + (ev.tag === 'mine' ? 'mine' : 'target');
                lcdStatus.textContent = kind === 'solo' ? BB.INSTRUMENTS[soloRow].name + ' only' : (kind === 'compare' ? 'A/B compare' : 'Bar ' + (ev.bar + 1));
              }
              lcdCount.classList.toggle('beat', ev.m.groupStart[ev.step]);
              panel.dataset.tag = ev.tag || '';
            },
            onStop: () => {
              grid.setPlayhead(-1);
              mode = null;
              lcdTag.textContent = '';
              lcdTag.className = 'lcd-tag';
              lcdStatus.textContent = 'Ready';
              lcdCount.textContent = '—';
              panel.dataset.tag = '';
              updateButtons();
            },
          });
          updateButtons();
        }

        function solo(r) {
          if (!hintUsed) {
            hintUsed = true;
            BB.toast('Hint used — this round is worth up to ★★');
          }
          play('solo', r);
        }

        function check() {
          if (BB.hitCount(user, rows) === 0) {
            BB.toast('Light up some pads first!');
            BB.shake(grid.el);
            return;
          }
          checks++;
          const r = BB.evaluate(target, user, rows);
          grid.markResult(target);
          let s = starsForAccuracy(r.accuracy);
          if (hintUsed) s = Math.min(s, 2);
          if (revealed) s = 0;
          const prev = starsFor(level.id);
          const all = stars();
          if (s > prev) { all[level.id] = s; BB.store.set('stars', all); BB.emit('stars'); }
          showResult(r, s, prev);
        }

        function showResult(r, s, prev) {
          const pct = Math.round(r.accuracy * 100);
          const perfect = r.accuracy >= 0.999;
          const next = BB.LEVELS[level.index + 1];
          result.innerHTML = '';
          const starEls = [0, 1, 2].map(() => BB.star(false));
          let headline, sub;
          if (perfect && !revealed) {
            headline = BB.pick(['Perfect!', 'Nailed it!', 'In the pocket!', 'Tight!']);
            sub = hintUsed ? 'Spot on — try it without hints for ★★★.' : 'Every hit exactly where it belongs.';
          } else if (perfect) {
            headline = 'That’s the one.';
            sub = 'You peeked, so no stars this time — try it again from memory.';
          } else {
            headline = pct >= 80 ? 'So close.' : pct >= 50 ? 'Getting there.' : 'Keep listening.';
            const bits = [];
            if (r.missed) bits.push(r.missed + ' missing');
            if (r.extra) bits.push(r.extra + ' extra');
            sub = bits.join(' · ') + '. Dashed pads are missing hits; striped pads shouldn’t be there.';
          }
          result.append(
            h('div.result-score', h('div.result-stars', starEls), h('div.result-pct', pct + '%')),
            h('div.result-text', h('b', headline), h('p', sub)),
            h('div.result-actions',
              !perfect && !revealed ? h('button.btn.ghost-btn', { type: 'button', onclick: () => reveal() }, BB.icon('eye'), h('span', 'Show answer')) : null,
              h('button.btn', { type: 'button', onclick: () => result.classList.remove('show') }, h('span', perfect ? 'Stay' : 'Keep trying')),
              perfect && next ? h('button.btn.primary', { type: 'button', onclick: () => showLevel(next.id) }, h('span', 'Next level'), BB.icon('next')) : null,
              perfect && !next ? h('button.btn.primary', { type: 'button', onclick: () => showSelect(level.id) }, h('span', 'All levels'), BB.icon('next')) : null));
          result.classList.add('show');
          result.classList.toggle('win', perfect && !revealed);
          // Stars pop in one at a time.
          starEls.forEach((el, i) => {
            if (i >= s) return;
            setTimeout(() => {
              el.classList.add('on');
              el.animate([{ transform: 'scale(.3) rotate(-30deg)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.3,1.5,.5,1)' });
              if (!perfect) BB.engine.chime('star');
            }, 180 + i * 200);
          });
          if (perfect && !revealed) {
            BB.seq.stop();
            BB.engine.chime('win');
            setTimeout(BB.confetti, 300);
          } else if (!perfect) {
            BB.engine.chime(s >= 2 ? 'good' : 'bad');
          }
          if (s > prev) head.querySelector('.round-best').replaceChildren(BB.starRow(s));
          setTimeout(() => result.scrollIntoView && result.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50);
        }

        function reveal() {
          revealed = true;
          grid.showGhost(target);
          result.classList.remove('show');
          BB.toast('Answer shown as outlines. Copy it, then listen again.');
        }

        view = {
          kind: 'round',
          onSpace: () => play(mode && BB.seq.isOwner(owner) ? mode : 'listen', soloRow),
          onEnter: () => check(),
        };
        lcdStatus.textContent = 'Press Listen';
      }

      if (params && params.level && BB.levelById(params.level)) showLevel(params.level);
      else showSelect();

      return {
        unmount() { if (BB.seq.isOwner(owner)) BB.seq.stop(); },
        onSpace() { if (view && view.onSpace) view.onSpace(); },
        onKey(e) { if (e.key === 'Enter' && view && view.onEnter && !(e.target && e.target.closest && e.target.closest('button'))) view.onEnter(); },
      };
    },
  };
})(window.BB);
