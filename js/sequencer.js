/* Backbeat — look-ahead step sequencer.
 *
 * Audio is scheduled ~120 ms ahead on the AudioContext clock (rock solid
 * timing); visuals are queued and released on requestAnimationFrame when
 * their audio is actually heard.
 */
(function (BB) {
  'use strict';

  // Tiny event bus shared by the app.
  const listeners = {};
  BB.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  BB.emit = (ev, a, b) => { (listeners[ev] || []).forEach((fn) => fn(a, b)); };

  /** Play a drum right now (pads, row labels, keyboard). */
  BB.playLive = function (row, v) {
    const e = BB.engine;
    const ctx = e.ensure();
    e.trigger(row, ctx.currentTime + 0.004, v == null ? 0.92 : v);
    BB.emit('hit', row);
  };

  const LOOKAHEAD = 0.12;
  const INTERVAL = 25;

  class Sequencer {
    constructor(engine) {
      this.engine = engine;
      this.playing = false;
      this.opts = null;
      this.queue = [];
    }

    /**
     * opts.provider(bar) → { pattern, rows?, tag? } | null (null ends playback)
     * opts.countIn       → one bar of clicks first
     * opts.metronome     → bool | () => bool
     * opts.onStep(ev)    → visual callback, ev = { step, bar, countIn, tag, hits, steps }
     * opts.onStop(natural)
     * opts.owner         → any token, lets components know if they own playback
     */
    start(opts) {
      this.stop();
      const ctx = this.engine.ensure();
      this.opts = opts;
      this.playing = true;
      this.queue = [];
      this.endTime = null;
      this.bar = opts.countIn ? -1 : 0;
      this.step = 0;
      this.nextTime = ctx.currentTime + 0.06;
      this.cur = this._fetch();
      this.timer = setInterval(() => this._schedule(), INTERVAL);
      this._schedule();
      const loop = () => {
        if (!this.playing) return;
        this._draw();
        if (this.playing) this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }

    stop() { if (this.playing) this._finish(false); }

    isOwner(owner) { return this.playing && !!this.opts && this.opts.owner === owner; }

    _fetch() {
      const o = this.opts;
      if (this.bar < 0) {
        const first = o.provider(0);
        return first ? { pattern: first.pattern, countIn: true, tag: 'count' } : null;
      }
      return o.provider(this.bar);
    }

    _schedule() {
      if (!this.playing || this.endTime != null) return;
      const e = this.engine, ctx = e.ctx;
      while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
        const cur = this.cur;
        if (!cur) { this.endTime = this.nextTime; break; }
        const pat = cur.pattern, m = BB.meterInfo(pat);
        if (this.step >= m.steps) this.step = 0;
        const s = this.step;
        const dur = 60 / pat.bpm / m.spq;
        const t = this.nextTime;
        const hits = [];
        if (cur.countIn) {
          if (m.groupStart[s]) e.click(t, s === 0);
        } else {
          const swing = BB.swingOffset(pat, m, s, dur);
          const rows = cur.rows || BB.ROWS;
          for (let i = 0; i < rows.length; i++) {
            const r = rows[i], tr = pat.tracks[r];
            if (tr && tr[s]) { e.trigger(r, t + swing, BB.velocity(r, s, m)); hits.push(r); }
          }
          const metro = typeof this.opts.metronome === 'function' ? this.opts.metronome() : this.opts.metronome;
          if (metro && m.groupStart[s]) e.click(t, s === 0);
        }
        this.queue.push({ time: t, step: s, bar: this.bar, countIn: !!cur.countIn, tag: cur.tag, hits, steps: m.steps, m });
        this.nextTime += dur;
        this.step++;
        if (this.step >= m.steps) {
          this.step = 0;
          this.bar++;
          this.cur = this._fetch();
        }
      }
    }

    _draw() {
      const ctx = this.engine.ctx;
      const now = ctx.currentTime - (ctx.outputLatency || 0);
      while (this.playing && this.queue.length && this.queue[0].time <= now) {
        const ev = this.queue.shift();
        for (let i = 0; i < ev.hits.length; i++) BB.emit('hit', ev.hits[i]);
        if (this.opts && this.opts.onStep) this.opts.onStep(ev);
      }
      if (this.playing && this.endTime != null && now >= this.endTime) this._finish(true);
    }

    _finish(natural) {
      clearInterval(this.timer);
      cancelAnimationFrame(this.raf);
      const o = this.opts;
      this.playing = false;
      this.opts = null;
      this.queue = [];
      if (o && o.onStop) o.onStop(natural);
    }
  }

  BB.Sequencer = Sequencer;
  BB.seq = new Sequencer(BB.engine);
})(window.BB);
