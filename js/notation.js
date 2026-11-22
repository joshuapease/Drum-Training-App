/* Backbeat — hand-drawn SVG music notation glyphs (notes, rests, beamed groups). */
(function (BB) {
  'use strict';

  const f = (n) => Math.round(n * 100) / 100;

  /** Ellipse as a path so two can be combined with even-odd fill (hollow heads). */
  function ell(cx, cy, rx, ry, rot) {
    const a = (rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const x1 = cx + rx * c, y1 = cy + rx * s, x2 = cx - rx * c, y2 = cy - rx * s;
    return `M${f(x1)} ${f(y1)}A${rx} ${ry} ${rot} 1 0 ${f(x2)} ${f(y2)}A${rx} ${ry} ${rot} 1 0 ${f(x1)} ${f(y1)}Z`;
  }

  const HEAD = [19, 50, 8.6, 6, -22];
  const filledHead = `<path d="${ell(...HEAD)}"/>`;
  const hollowHead = `<path fill-rule="evenodd" d="${ell(...HEAD)}${ell(19, 50, 6.4, 2.6, -32)}"/>`;
  const stem = (top) => `<rect x="25.3" y="${top}" width="2.1" height="${48.6 - top}" rx="0.6"/>`;
  const FLAG = 'M27.3 0C27.7 7 37 10.5 36.4 20.5C36.1 24 35 26.6 33.8 28.6C35.6 22 31.6 15 27.3 14Z';
  const flag = (y, s) => `<path transform="translate(0 ${y}) scale(1 ${s || 1})" d="${FLAG}"/>`;

  const SVG = {
    'note-whole': `<path fill-rule="evenodd" d="${ell(24, 40, 11, 7.4, 0)}${ell(24, 40, 5.4, 3.5, -55)}"/>`,
    'note-half': hollowHead + stem(12),
    'note-quarter': filledHead + stem(12),
    'note-eighth': filledHead + stem(12) + flag(12),
    'note-sixteenth': filledHead + stem(7) + flag(7, 0.92) + flag(16.5, 0.92),

    'rest-whole': '<rect class="staff" x="6" y="25.2" width="36" height="1.6" rx=".8"/><rect x="15" y="26" width="18" height="8" rx="1"/>',
    'rest-half': '<rect class="staff" x="6" y="37.2" width="36" height="1.6" rx=".8"/><rect x="15" y="30" width="18" height="8" rx="1"/>',
    'rest-quarter': '<path d="M19.5 12L29.5 23.5C26.8 26.3 25.6 28.6 26.2 31.2C26.7 33.4 28.4 35.6 30.6 38L29.8 38.8C27.4 37.2 23.6 37.3 23.1 40.6C22.8 43 24.3 46.2 26.4 48.8L25.6 49.6C21.3 46.4 17.4 42.6 18.4 38.6C19.3 35.2 23 34.5 26 35.3L18.6 26.6C21.4 24.2 22.6 21.6 22.2 18.8C21.9 16.6 20.8 14.6 19 12.6Z"/>',
    'rest-eighth': '<circle cx="19.5" cy="24.5" r="3.9"/><path d="M19.6 27.8C23.4 29.6 27.8 28 30.7 23.4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><path d="M30.7 23.2L22.6 50.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    'rest-sixteenth': '<circle cx="21.2" cy="18.5" r="3.5"/><circle cx="17.4" cy="30.6" r="3.5"/><path d="M21.3 21.5C25 23.1 29.2 21.6 31.8 17.4M17.5 33.6C21.2 35.2 25.4 33.7 28.1 29.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M31.8 17.2L21.6 52" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  };

  BB.glyph = function (id, cls) {
    const body = SVG[id];
    if (!body) return '';
    return `<svg class="glyph ${cls || ''}" viewBox="0 0 48 64" fill="currentColor" aria-hidden="true">${body}</svg>`;
  };

  /** n beamed notes (1 or 2 beams), optional tuplet number. */
  BB.beamed = function (n, beams, tuplet, cls) {
    const gap = 15, x0 = 12, w = x0 * 2 + gap * (n - 1) + 6;
    let out = '';
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * gap;
      out += `<path d="${ell(cx, 50, 7.4, 5.2, -22)}"/>`;
      out += `<rect x="${f(cx + 5.4)}" y="15" width="2" height="${f(33.8)}" rx=".6"/>`;
    }
    const xa = x0 + 5.4, xb = x0 + (n - 1) * gap + 7.4;
    for (let b = 0; b < beams; b++) out += `<rect x="${f(xa)}" y="${15 + b * 7}" width="${f(xb - xa)}" height="4.6" rx=".8"/>`;
    if (tuplet) out += `<text x="${f((xa + xb) / 2)}" y="10" text-anchor="middle" font-size="10" font-weight="700" font-family="inherit">${tuplet}</text>`;
    return `<svg class="glyph ${cls || ''}" viewBox="0 0 ${w} 64" fill="currentColor" aria-hidden="true">${out}</svg>`;
  };

  /** Glyph for a subdivision feel used in listening questions. */
  BB.subdivisionGlyph = function (id) {
    switch (id) {
      case 'half': return BB.glyph('note-half');
      case 'quarter': return BB.glyph('note-quarter');
      case 'eighth': return BB.beamed(2, 1);
      case 'sixteenth': return BB.beamed(4, 2);
      case 'triplet': return BB.beamed(3, 1, 3);
      default: return '';
    }
  };

  BB.NOTE_VALUES = [
    { id: 'whole', name: 'Whole', beats: 4, beatsLabel: '4', per: 1,
      note: 'Hollow head, no stem. Lasts a whole bar of 4/4.',
      rest: 'A block that hangs below the line — heavy, so it hangs. 4 beats.' },
    { id: 'half', name: 'Half', beats: 2, beatsLabel: '2', per: 2,
      note: 'Hollow head with a stem. Half a bar: 2 beats.',
      rest: 'A block that sits on top of the line, like a hat. 2 beats.' },
    { id: 'quarter', name: 'Quarter', beats: 1, beatsLabel: '1', per: 4,
      note: 'Filled head with a stem. One beat in 4/4.',
      rest: 'The lightning-bolt squiggle. 1 beat.' },
    { id: 'eighth', name: 'Eighth', beats: 0.5, beatsLabel: '½', per: 8,
      note: 'Filled head, stem and one flag. Half a beat.',
      rest: 'One flag with a dot. Half a beat.' },
    { id: 'sixteenth', name: 'Sixteenth', beats: 0.25, beatsLabel: '¼', per: 16,
      note: 'Two flags. A quarter of a beat.',
      rest: 'Two flags with dots. A quarter of a beat.' },
  ];
  BB.noteValue = (id) => BB.NOTE_VALUES.find((n) => n.id === id);
  BB.beatsText = (nv) => ({ 0.5: '1/2', 0.25: '1/4' }[nv.beats] || nv.beatsLabel) + (nv.beats > 1 ? ' beats' : ' beat');
})(window.BB);
