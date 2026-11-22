/* Backbeat — the step grid. Rows are drums, columns are moments in time. */
(function (BB) {
  'use strict';
  const h = BB.h;

  class StepGrid {
    /**
     * opts: { editable, counts, keys, rowExtra(rowId) → Node, onChange(row, step, on) }
     */
    constructor(opts) {
      this.opts = Object.assign({ editable: true, counts: true, keys: false }, opts || {});
      this.el = h('div.grid');
      this.prev = -1;
      this.cols = [];
      this.pads = {};
      this.countEls = [];
      this._bind();
    }

    render(pattern, rows) {
      this.pattern = pattern;
      this.rows = rows || BB.ROWS;
      const m = this.m = BB.meterInfo(pattern);
      const el = this.el;
      el.innerHTML = '';
      el.style.setProperty('--steps', m.steps);
      el.classList.toggle('editable', !!this.opts.editable);
      el.classList.toggle('has-extra', !!this.opts.rowExtra);
      el.classList.toggle('dense', m.steps > 12);
      el.classList.toggle('has-keys', !!this.opts.keys);
      this.cols = Array.from({ length: m.steps }, () => []);
      this.pads = {};
      this.prev = -1;

      const groupEl = (g) => h('div.group', { style: { flexGrow: g, gridTemplateColumns: `repeat(${g}, minmax(0, 1fr))` } });

      this.rows.forEach((rowId) => {
        const inst = BB.INSTRUMENTS[rowId];
        const label = h('button.row-label', { type: 'button', title: 'Play ' + inst.name + (this.opts.keys ? ' (' + inst.key.toUpperCase() + ')' : '') },
          h('span.dot'), h('span.name', inst.name), h('span.short', inst.short),
          this.opts.keys ? h('kbd', inst.key.toUpperCase()) : null);
        label.addEventListener('pointerdown', (e) => { e.preventDefault(); BB.playLive(rowId); });
        label.addEventListener('keydown', (e) => { if (e.key === 'Enter') BB.playLive(rowId); });

        const padsEl = h('div.pads');
        this.pads[rowId] = [];
        let s = 0;
        m.groups.forEach((g, gi) => {
          const grp = groupEl(g);
          if (gi % 2 === 1) grp.classList.add('alt');
          for (let j = 0; j < g; j++, s++) {
            const pad = h('button.pad', { type: 'button', 'aria-label': inst.name + ', step ' + (s + 1) + ' (' + m.counts[s] + ')', dataset: { row: rowId, step: s } });
            if (j === 0) pad.classList.add('beat');
            if (!this.opts.editable) pad.tabIndex = -1;
            grp.append(pad);
            this.cols[s].push(pad);
            this.pads[rowId].push(pad);
          }
          padsEl.append(grp);
        });
        const row = h('div.row', { style: { '--c': inst.color }, dataset: { row: rowId } }, label, padsEl);
        if (this.opts.rowExtra) row.append(this.opts.rowExtra(rowId) || h('span'));
        el.append(row);
      });

      this.countEls = [];
      if (this.opts.counts) {
        const padsEl = h('div.pads');
        let s = 0;
        m.groups.forEach((g) => {
          const grp = groupEl(g);
          for (let j = 0; j < g; j++, s++) {
            const c = h('span.count' + (j === 0 ? '.beat' : ''), m.counts[s]);
            grp.append(c);
            this.countEls.push(c);
          }
          padsEl.append(grp);
        });
        const row = h('div.row.counts', h('span.row-label.blank'), padsEl);
        if (this.opts.rowExtra) row.append(h('span'));
        el.append(row);
      }
      this.sync();
    }

    sync() {
      this.rows.forEach((r) => {
        const tr = this.pattern.tracks[r];
        this.pads[r].forEach((p, s) => {
          const on = !!tr[s];
          p.classList.toggle('on', on);
          p.setAttribute('aria-pressed', String(on));
        });
      });
    }

    setEditable(on) {
      this.opts.editable = on;
      this.el.classList.toggle('editable', on);
    }

    _get(pad) { return !!this.pattern.tracks[pad.dataset.row][+pad.dataset.step]; }

    _set(pad, on, audition) {
      const r = pad.dataset.row, s = +pad.dataset.step;
      this.pattern.tracks[r][s] = on ? 1 : 0;
      pad.classList.toggle('on', on);
      pad.setAttribute('aria-pressed', String(on));
      pad.classList.remove('ok', 'miss', 'extra');
      if (on && audition) BB.playLive(r, BB.velocity(r, s, this.m));
      if (on && pad.animate) pad.animate([{ transform: 'scale(.86)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'cubic-bezier(.3,1.6,.5,1)' });
      if (this.opts.onChange) this.opts.onChange(r, s, on);
    }

    _bind() {
      let paint = null;
      let lastType = '';
      this.el.addEventListener('pointerdown', (e) => {
        lastType = e.pointerType;
        const pad = e.target.closest('.pad');
        if (!pad || !this.opts.editable || e.pointerType !== 'mouse' || e.button !== 0) return;
        e.preventDefault(); // keep focus off the pad so Space stays play/stop
        const val = !this._get(pad);
        this._set(pad, val, true);
        paint = val;
      });
      this.el.addEventListener('pointerover', (e) => {
        if (paint == null) return;
        const pad = e.target.closest('.pad');
        if (pad && this._get(pad) !== paint) this._set(pad, paint, paint);
      });
      window.addEventListener('pointerup', () => { paint = null; });
      // Touch + keyboard go through click so scrolling doesn't toggle pads.
      this.el.addEventListener('click', (e) => {
        const pad = e.target.closest('.pad');
        if (!pad || !this.opts.editable) return;
        if (e.detail > 0 && lastType === 'mouse') return; // already handled on pointerdown
        this._set(pad, !this._get(pad), true);
      });
    }

    /** Move the playhead. flash=true pulses the pads that are sounding. */
    setPlayhead(s, flash) {
      if (this.prev >= 0 && this.cols[this.prev]) {
        this.cols[this.prev].forEach((p) => p.classList.remove('now'));
        if (this.countEls[this.prev]) this.countEls[this.prev].classList.remove('now');
      }
      this.prev = s;
      if (s < 0 || !this.cols[s]) return;
      this.cols[s].forEach((p) => {
        p.classList.add('now');
        if (flash && p.classList.contains('on') && p.animate) {
          p.animate([{ transform: 'scale(1.12)', filter: 'brightness(1.45)' }, { transform: 'scale(1)', filter: 'brightness(1)' }],
            { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
        }
      });
      if (this.countEls[s]) this.countEls[s].classList.add('now');
    }

    markResult(target) {
      this.rows.forEach((r) => this.pads[r].forEach((p, s) => {
        const want = !!target.tracks[r][s], have = !!this.pattern.tracks[r][s];
        p.classList.toggle('ok', want && have);
        p.classList.toggle('miss', want && !have);
        p.classList.toggle('extra', !want && have);
      }));
    }

    showGhost(target) {
      this.rows.forEach((r) => this.pads[r].forEach((p, s) => p.classList.toggle('ghost', !!target.tracks[r][s])));
    }

    clearMarks() {
      this.rows.forEach((r) => this.pads[r].forEach((p) => p.classList.remove('ok', 'miss', 'extra', 'ghost')));
    }
  }

  BB.StepGrid = StepGrid;
})(window.BB);
