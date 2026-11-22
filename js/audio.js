/* Backbeat — synthesized drum engine.
 *
 * Every sound is built from oscillators, noise and filters (no samples), then
 * glued together on a mix bus: soft saturation → bus compressor → tone filter
 * → limiter, with a generated room reverb on a send.
 */
(function (BB) {
  'use strict';

  function merge(base, over) {
    const out = {};
    Object.keys(base).forEach((k) => {
      out[k] = (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]))
        ? Object.assign({}, base[k], (over && over[k]) || {})
        : (over && k in over ? over[k] : base[k]);
    });
    return out;
  }

  const ANALOG = {
    name: 'Analog',
    bus:   { drive: 1.5, tone: 17500, reverb: 0.2, room: 1.5 },
    kick:  { f0: 210, f1: 50, pd: 0.035, decay: 0.55, click: 0.42, drive: 1.9, gain: 1.0 },
    snare: { t1: 185, t2: 330, toneDecay: 0.11, toneMix: 0.55, noiseDecay: 0.22, noiseMix: 0.72, hp: 1100, peak: 4800, drive: 1.6, gain: 0.8, send: 0.26 },
    clap:  { bp: 1150, decay: 0.24, gain: 0.85, send: 0.4 },
    hat:   { base: 40, decay: 0.07, open: 0.48, bp: 10000, hp: 7200, metal: 0.8, noise: 0.32, gain: 0.72 },
    tom:   { hi: [255, 170], lo: [155, 100], decay: 0.45, gain: 0.64, send: 0.22 },
    ride:  { base: 58, decay: 1.7, gain: 0.66, bell: 0.14 },
    crash: { decay: 2.1, gain: 0.27 },
  };

  const KITS = {
    analog: ANALOG,
    room: merge(ANALOG, {
      name: 'Room',
      bus:   { drive: 1.25, tone: 15000, reverb: 0.34, room: 2.0 },
      kick:  { f0: 150, f1: 56, pd: 0.028, decay: 0.36, click: 0.8, drive: 1.5 },
      snare: { t1: 205, t2: 300, toneDecay: 0.09, toneMix: 0.45, noiseDecay: 0.3, noiseMix: 0.9, hp: 650, peak: 3300, drive: 1.35, send: 0.36 },
      hat:   { base: 46, decay: 0.085, open: 0.7, bp: 9000, hp: 6200, metal: 0.5, noise: 0.6, gain: 0.46 },
      tom:   { hi: [215, 168], lo: [130, 98], decay: 0.62, send: 0.3 },
      ride:  { base: 62, decay: 2.2, bell: 0.2 },
      crash: { decay: 2.6, gain: 0.3 },
    }),
    boom: merge(ANALOG, {
      name: 'Boom',
      bus:   { drive: 1.35, tone: 14500, reverb: 0.16, room: 1.3 },
      kick:  { f0: 125, f1: 46, pd: 0.07, decay: 1.15, click: 0.15, drive: 1.5, gain: 1.05 },
      snare: { t1: 175, t2: 238, toneDecay: 0.14, toneMix: 0.75, noiseDecay: 0.17, noiseMix: 0.5, hp: 1800, peak: 6500, drive: 1.3 },
      clap:  { bp: 1000, decay: 0.3 },
      hat:   { base: 40, decay: 0.05, open: 0.36, bp: 9600, hp: 7000, metal: 0.95, noise: 0.22, gain: 1.35 },
      tom:   { hi: [200, 150], lo: [120, 82], decay: 0.7 },
    }),
    dusty: merge(ANALOG, {
      name: 'Dusty',
      bus:   { drive: 3.2, tone: 6200, reverb: 0.13, room: 1.1 },
      kick:  { f0: 170, f1: 54, pd: 0.03, decay: 0.42, click: 0.5, drive: 2.6 },
      snare: { t1: 190, t2: 320, toneDecay: 0.1, noiseDecay: 0.2, noiseMix: 0.8, hp: 900, peak: 3000, drive: 2.0 },
      hat:   { decay: 0.06, open: 0.38, noise: 0.5, gain: 1.15 },
      tom:   { decay: 0.4 },
      ride:  { gain: 0.42 },
    }),
  };
  BB.KITS = KITS;

  function makeNoise(ctx, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // A small, warm room: pre-delay, a few early reflections, and a tail that
  // darkens as it decays.
  function makeRoom(ctx, seconds) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    const pre = Math.floor(rate * 0.011);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = pre; i < len; i++) {
        const x = (i - pre) / (len - pre);
        const a = 0.82 - 0.68 * x;
        lp += a * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * Math.exp(-x * 5.5);
      }
      const taps = [0.006, 0.013, 0.019, 0.027, 0.034];
      taps.forEach((t, k) => {
        const idx = pre + Math.floor((t + ch * 0.0023) * rate);
        if (idx < len) d[idx] += (k % 2 ? -1 : 1) * (0.55 - k * 0.08);
      });
    }
    return buf;
  }

  class Engine {
    constructor() {
      this.ctx = null;
      this.kitId = 'analog';
      this.kit = KITS.analog;
      this.volume = 0.8;
      this.curves = {};
      this.rooms = {};
      this._openHat = null;
    }

    /** Create / resume the AudioContext. Must be called from a user gesture the first time. */
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* iOS only */ }
        this.attach(new AC({ latencyHint: 'interactive' }));
      }
      if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume();
      return this.ctx;
    }

    /** Build the mix bus on a given context (also used for offline rendering). */
    attach(ctx) {
      this.ctx = ctx;
      this.curves = {};
      this.rooms = {};
      const master = this.master = ctx.createGain();
      master.gain.value = this.volume;

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -1.5; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = 0.002; limiter.release.value = 0.1;

      const glue = ctx.createDynamicsCompressor();
      glue.threshold.value = -15; glue.knee.value = 10; glue.ratio.value = 3;
      glue.attack.value = 0.008; glue.release.value = 0.16;

      const tone = this.toneFilter = ctx.createBiquadFilter();
      tone.type = 'lowpass'; tone.Q.value = 0.4;

      const sat = this.sat = ctx.createWaveShaper();
      sat.oversample = '2x';

      const bus = this.bus = ctx.createGain();
      bus.gain.value = 0.72;
      const makeup = ctx.createGain();
      makeup.gain.value = 1.25;

      bus.connect(sat); sat.connect(glue); glue.connect(tone); tone.connect(makeup);
      makeup.connect(limiter); limiter.connect(master); master.connect(ctx.destination);

      // Reverb send
      const rvIn = this.rvIn = ctx.createGain();
      const rvHp = ctx.createBiquadFilter(); rvHp.type = 'highpass'; rvHp.frequency.value = 300;
      const conv = this.conv = ctx.createConvolver();
      const rvLp = ctx.createBiquadFilter(); rvLp.type = 'lowpass'; rvLp.frequency.value = 7000;
      const rvOut = this.rvOut = ctx.createGain();
      rvIn.connect(rvHp); rvHp.connect(conv); conv.connect(rvLp); rvLp.connect(rvOut); rvOut.connect(glue);

      // Metronome + UI sounds skip the drum compressor so they never pump.
      const fx = this.fx = ctx.createGain();
      fx.gain.value = 0.9;
      fx.connect(limiter);

      this.noiseBuf = makeNoise(ctx, 2);
      this.applyKit();
      return ctx;
    }

    setKit(id) {
      if (!KITS[id]) return;
      this.kitId = id;
      this.kit = KITS[id];
      if (this.ctx) this.applyKit();
    }

    applyKit() {
      const b = this.kit.bus, t = this.ctx.currentTime;
      this.sat.curve = this._curve(b.drive);
      this.toneFilter.frequency.setValueAtTime(b.tone, t);
      this.rvOut.gain.setValueAtTime(b.reverb, t);
      const key = b.room.toFixed(2);
      if (!this.rooms[key]) this.rooms[key] = makeRoom(this.ctx, b.room);
      this.conv.buffer = this.rooms[key];
    }

    setVolume(v) {
      this.volume = v;
      if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
    }

    now() { return this.ensure().currentTime; }

    /** Schedule an instrument at audio time t with velocity v (0..1). */
    trigger(row, t, v) {
      if (!this.ctx || typeof this[row] !== 'function') return;
      this[row](Math.max(t, this.ctx.currentTime), v == null ? 0.9 : v);
    }

    // ---------------------------------------------------------------- helpers

    _curve(drive) {
      const key = drive.toFixed(2);
      if (this.curves[key]) return this.curves[key];
      const n = 2048, c = new Float32Array(n), norm = Math.tanh(drive);
      for (let i = 0; i < n; i++) {
        const x = (i * 2) / (n - 1) - 1;
        c[i] = Math.tanh(drive * x) / norm;
      }
      this.curves[key] = c;
      return c;
    }
    _osc(type, t, stop) {
      const o = this.ctx.createOscillator();
      o.type = type; o.start(t); o.stop(stop);
      return o;
    }
    _noise(t, stop) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noiseBuf; s.loop = true;
      s.start(t, Math.random() * 1.6); s.stop(stop);
      return s;
    }
    _gain(v) {
      const g = this.ctx.createGain();
      g.gain.value = v == null ? 1 : v;
      return g;
    }
    _filter(type, f, q) {
      const b = this.ctx.createBiquadFilter();
      b.type = type; b.frequency.value = f;
      if (q != null) b.Q.value = q;
      return b;
    }
    _shaper(drive) {
      const s = this.ctx.createWaveShaper();
      s.curve = this._curve(drive);
      return s;
    }
    _env(param, t, peak, attack, decay) {
      param.setValueAtTime(0.0001, t);
      param.linearRampToValueAtTime(peak, t + attack);
      param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }
    /** Route a voice to the bus with pan + reverb send, and clean up when it ends. */
    _out(node, pan, send, lastSource) {
      const ctx = this.ctx;
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (p.pan) p.pan.value = pan || 0;
      node.connect(p);
      p.connect(this.bus);
      let s = null;
      if (send) { s = ctx.createGain(); s.gain.value = send; p.connect(s); s.connect(this.rvIn); }
      if (lastSource) {
        lastSource.onended = () => {
          try { p.disconnect(); if (s) s.disconnect(); } catch (e) { /* already gone */ }
        };
      }
    }

    // ----------------------------------------------------------------- voices

    kick(t, v) {
      const k = this.kit.kick, end = t + k.decay + 0.08;
      const o = this._osc('sine', t, end);
      o.frequency.setValueAtTime(k.f0, t);
      o.frequency.exponentialRampToValueAtTime(k.f1 * 1.35, t + k.pd);
      o.frequency.exponentialRampToValueAtTime(k.f1, t + k.decay);

      const amp = this._gain(0);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.linearRampToValueAtTime(v, t + 0.0025);
      amp.gain.exponentialRampToValueAtTime(v * 0.55, t + k.decay * 0.32);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + k.decay);

      const sh = this._shaper(k.drive);
      const out = this._gain(k.gain * 0.92);
      o.connect(amp); amp.connect(sh); sh.connect(out);

      // Beater click — helps the kick cut through on small speakers.
      const n = this._noise(t, t + 0.03);
      const bp = this._filter('bandpass', 3600, 0.8);
      const cg = this._gain(0);
      this._env(cg.gain, t, v * k.click, 0.0005, 0.012);
      n.connect(bp); bp.connect(cg); cg.connect(out);

      this._out(out, 0, 0.04, o);
    }

    snare(t, v) {
      const s = this.kit.snare, end = t + Math.max(s.noiseDecay, s.toneDecay) + 0.08;
      const mix = this._gain(1);
      [[s.t1, 1], [s.t2, 0.55]].forEach(([f, lvl]) => {
        const o = this._osc('triangle', t, end);
        o.frequency.setValueAtTime(f * 1.35, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.022);
        const g = this._gain(0);
        this._env(g.gain, t, v * s.toneMix * lvl, 0.001, s.toneDecay * (lvl < 1 ? 0.75 : 1));
        o.connect(g); g.connect(mix);
      });
      const n = this._noise(t, end);
      const hp = this._filter('highpass', s.hp, 0.7);
      const pk = this._filter('peaking', s.peak, 0.9);
      pk.gain.value = 5;
      const ng = this._gain(0);
      this._env(ng.gain, t, v * s.noiseMix, 0.001, s.noiseDecay);
      n.connect(hp); hp.connect(pk); pk.connect(ng); ng.connect(mix);

      const sh = this._shaper(s.drive);
      const out = this._gain(s.gain);
      mix.connect(sh); sh.connect(out);
      this._out(out, 0.03, s.send, n);
    }

    clap(t, v) {
      const c = this.kit.clap, end = t + 0.04 + c.decay + 0.06;
      const n = this._noise(t, end);
      const hp = this._filter('highpass', 650, 0.7);
      const bp = this._filter('bandpass', c.bp, 1.5);
      const g = this._gain(0), p = g.gain;
      p.setValueAtTime(0.0001, t);
      [0, 0.0105, 0.0215].forEach((off, i) => {
        const tt = t + off;
        p.setValueAtTime(v * (i === 0 ? 0.8 : 1), tt);
        p.exponentialRampToValueAtTime(v * 0.12, tt + 0.0095);
      });
      const tail = t + 0.032;
      p.setValueAtTime(v * 0.85, tail);
      p.exponentialRampToValueAtTime(0.0001, tail + c.decay);
      n.connect(hp); hp.connect(bp); bp.connect(g);
      const out = this._gain(c.gain * 1.7);
      g.connect(out);
      this._out(out, -0.05, c.send, n);
    }

    /** Six detuned square waves through band + high pass: the classic metallic cymbal recipe. */
    _metal(t, v, decay, p, ratios) {
      ratios = ratios || [2, 3, 4.16, 5.43, 6.79, 8.21];
      const base = p.base * (1 + (Math.random() - 0.5) * 0.012);
      const end = t + decay + 0.06;
      const bank = this._gain(0.2);
      ratios.forEach((r) => {
        const o = this._osc('square', t, end);
        o.frequency.value = base * r;
        o.connect(bank);
      });
      const bp = this._filter('bandpass', p.bp, 0.7);
      const hp = this._filter('highpass', p.hp, 0.7);
      const metalG = this._gain(p.metal);
      bank.connect(bp); bp.connect(metalG); metalG.connect(hp);

      const n = this._noise(t, end);
      const nh = this._filter('highpass', 8000, 0.5);
      const ng = this._gain(p.noise);
      n.connect(nh); nh.connect(ng); ng.connect(hp);

      const env = this._gain(0);
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(v, t + 0.0015);
      env.gain.exponentialRampToValueAtTime(v * 0.4, t + Math.min(0.02, decay * 0.3));
      env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      hp.connect(env);
      return { node: env, src: n, end };
    }

    _choke(t) {
      const o = this._openHat;
      if (o && t > o.start) {
        if (t < o.end) {
          o.gain.setValueAtTime(1, t);
          o.gain.linearRampToValueAtTime(0, t + 0.03);
        }
        this._openHat = null;
      }
    }

    hat(t, v) {
      const p = this.kit.hat;
      this._choke(t);
      const m = this._metal(t, v, p.decay * (0.9 + Math.random() * 0.2), p);
      const out = this._gain(p.gain);
      m.node.connect(out);
      this._out(out, 0.2, 0.03, m.src);
    }

    ohat(t, v) {
      const p = this.kit.hat;
      this._choke(t);
      const m = this._metal(t, v, p.open, p);
      const choke = this._gain(1);
      m.node.connect(choke);
      const out = this._gain(p.gain * 0.85);
      choke.connect(out);
      this._openHat = { gain: choke.gain, start: t, end: m.end };
      this._out(out, 0.2, 0.1, m.src);
    }

    _tom(t, v, f0, f1, pan) {
      const k = this.kit.tom, d = k.decay, end = t + d + 0.08;
      const o = this._osc('sine', t, end);
      o.frequency.setValueAtTime(f0 * 1.18, t);
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.012);
      o.frequency.exponentialRampToValueAtTime(f1, t + d);
      const o2 = this._osc('triangle', t, end);
      o2.frequency.setValueAtTime(f0 * 1.6, t);
      o2.frequency.exponentialRampToValueAtTime(f1 * 1.5, t + d * 0.6);

      const g = this._gain(0); this._env(g.gain, t, v, 0.002, d);
      const g2 = this._gain(0); this._env(g2.gain, t, v * 0.16, 0.001, d * 0.35);
      const n = this._noise(t, t + 0.08);
      const lp = this._filter('lowpass', 2600, 0.7);
      const ng = this._gain(0); this._env(ng.gain, t, v * 0.22, 0.0008, 0.045);

      const sh = this._shaper(1.4);
      const out = this._gain(k.gain);
      o.connect(g); o2.connect(g2); g.connect(sh); g2.connect(sh);
      n.connect(lp); lp.connect(ng); ng.connect(sh);
      sh.connect(out);
      this._out(out, pan, k.send, o);
    }
    tomH(t, v) { const k = this.kit.tom; this._tom(t, v, k.hi[0], k.hi[1], -0.22); }
    tomL(t, v) { const k = this.kit.tom; this._tom(t, v, k.lo[0], k.lo[1], 0.28); }

    ride(t, v) {
      const r = this.kit.ride;
      const m = this._metal(t, v, r.decay,
        { base: r.base, bp: 5200, hp: 3000, metal: 0.85, noise: 0.22 },
        [2, 3.01, 4.17, 5.47, 6.83, 8.24]);
      // Bell "ping" on top of the wash.
      const bellEnd = t + 0.7;
      const bellBp = this._filter('bandpass', 2600, 2.2);
      const bell = this._gain(0);
      this._env(bell.gain, t, v * r.bell, 0.001, 0.6);
      [523, 787].forEach((f) => {
        const o = this._osc('square', t, bellEnd);
        o.frequency.value = f;
        o.connect(bellBp);
      });
      bellBp.connect(bell);
      const out = this._gain(r.gain);
      m.node.connect(out); bell.connect(out);
      this._out(out, -0.32, 0.12, m.src);
    }

    crash(t, v) {
      const c = this.kit.crash, end = t + c.decay + 0.06;
      const n = this._noise(t, end);
      const hp = this._filter('highpass', 3400, 0.6);
      const pk = this._filter('peaking', 6500, 0.8);
      pk.gain.value = 4;
      const ng = this._gain(0);
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.linearRampToValueAtTime(v, t + 0.004);
      ng.gain.exponentialRampToValueAtTime(v * 0.42, t + 0.16);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + c.decay);
      n.connect(hp); hp.connect(pk); pk.connect(ng);
      const m = this._metal(t, v * 0.6, c.decay * 0.8,
        { base: 52, bp: 7000, hp: 4500, metal: 0.9, noise: 0 },
        [2, 3.13, 4.31, 5.68, 7.15, 8.83]);
      const out = this._gain(c.gain);
      ng.connect(out); m.node.connect(out);
      this._out(out, 0.32, 0.32, n);
    }

    // ------------------------------------------------------- metronome + UI

    click(t, accent) {
      const o = this._osc('sine', t, t + 0.07);
      o.frequency.value = accent ? 1760 : 1175;
      const g = this._gain(0);
      this._env(g.gain, t, accent ? 0.36 : 0.22, 0.0006, 0.05);
      const n = this._noise(t, t + 0.02);
      const bp = this._filter('bandpass', accent ? 4200 : 3000, 2);
      const ng = this._gain(0);
      this._env(ng.gain, t, accent ? 0.3 : 0.18, 0.0003, 0.008);
      o.connect(g); g.connect(this.fx);
      n.connect(bp); bp.connect(ng); ng.connect(this.fx);
    }

    _bell(t, f, v) {
      const car = this._osc('sine', t, t + 1.2);
      car.frequency.value = f;
      const mod = this._osc('sine', t, t + 1.2);
      mod.frequency.value = f * 2;
      const mg = this._gain(0);
      mg.gain.setValueAtTime(f * 1.4, t);
      mg.gain.exponentialRampToValueAtTime(1, t + 0.6);
      mod.connect(mg); mg.connect(car.frequency);
      const g = this._gain(0);
      this._env(g.gain, t, v, 0.002, 1.0);
      car.connect(g); g.connect(this.fx);
      const send = this._gain(0.4); g.connect(send); send.connect(this.rvIn);
    }

    /** Little musical stingers for game feedback. */
    chime(kind) {
      const t = this.ensure().currentTime + 0.02;
      if (kind === 'good') {
        this._bell(t, 1046.5, 0.16);
        this._bell(t + 0.075, 1568, 0.14);
      } else if (kind === 'bad') {
        const o = this._osc('triangle', t, t + 0.4);
        o.frequency.setValueAtTime(240, t);
        o.frequency.exponentialRampToValueAtTime(150, t + 0.25);
        const g = this._gain(0);
        this._env(g.gain, t, 0.22, 0.004, 0.3);
        o.connect(g); g.connect(this.fx);
      } else if (kind === 'star') {
        this._bell(t, 1318.5, 0.12);
      } else if (kind === 'win') {
        const s = 0.085;
        this.tomH(t, 0.8); this.tomH(t + s, 0.7);
        this.tomL(t + 2 * s, 0.85); this.tomL(t + 3 * s, 0.75);
        this.kick(t + 4 * s, 1); this.crash(t + 4 * s, 0.9);
        this._bell(t + 4 * s, 1046.5, 0.1);
        this._bell(t + 4 * s + 0.06, 1568, 0.1);
        this._bell(t + 4 * s + 0.12, 2093, 0.08);
      }
    }
  }

  BB.Engine = Engine;
  BB.engine = new Engine();
})(window.BB);
