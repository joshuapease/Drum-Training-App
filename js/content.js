/* Backbeat — lessons, levels, quiz grooves and jam presets. */
(function (BB) {
  'use strict';

  // ------------------------------------------------------------- ECHO levels
  const L = (id, name, sig, res, bpm, rows, tracks, hint) => ({ id, name, sig, res, bpm, rows, tracks, hint });

  BB.TIERS = [
    { id: 't1', name: 'First Steps', blurb: 'Eight steps per bar. Kick, snare and hats.', levels: [
      L('heartbeat', 'Heartbeat', [4, 4], 2, 84, ['kick'],
        { kick: 'x... x...' }, 'Just the kick. Count “1 & 2 & 3 & 4 &” — where does it land?'),
      L('floor', 'Four on the Floor', [4, 4], 2, 112, ['kick'],
        { kick: 'x.x. x.x.' }, 'A kick on every beat — the engine of dance music.'),
      L('backbeat', 'Backbeat', [4, 4], 2, 92, ['kick', 'snare'],
        { kick: 'x... x...', snare: '..x. ..x.' }, 'The snare answers the kick. Listen for beats 2 and 4.'),
      L('steady', 'Steady Hats', [4, 4], 2, 96, ['kick', 'snare', 'hat'],
        { kick: 'x... x...', snare: '..x. ..x.', hat: 'x.x. x.x.' }, 'The hi-hat keeps time on every beat.'),
      L('rock', 'Rock Beat', [4, 4], 2, 104, ['kick', 'snare', 'hat'],
        { kick: 'x... x...', snare: '..x. ..x.', hat: 'xxxx xxxx' }, 'Hats on every eighth note: 1 & 2 & 3 & 4 &.'),
    ] },
    { id: 't2', name: 'In the Pocket', blurb: 'Sixteen steps. Feel the space between the beats.', levels: [
      L('push', 'The Push', [4, 4], 4, 100, ['kick', 'snare', 'hat'],
        { kick: 'x... ..x. x... ....', snare: '.... x... .... x...', hat: 'x.x. x.x. x.x. x.x.' }, 'An extra kick sneaks in just before beat 3.'),
      L('disco', 'Disco', [4, 4], 4, 118, ['kick', 'snare', 'ohat'],
        { kick: 'x... x... x... x...', snare: '.... x... .... x...', ohat: '..x. ..x. ..x. ..x.' }, 'Open hats sizzle on every “&”.'),
      L('onedrop', 'One Drop', [4, 4], 4, 76, ['kick', 'snare', 'hat'],
        { kick: '.... .... x... ....', snare: '.... .... x... ....', hat: 'x.x. x.x. x.x. x.x.' }, 'Kick and snare land together — but nowhere near beat 1.'),
      L('halftime', 'Half-Time', [4, 4], 4, 84, ['kick', 'snare', 'hat'],
        { kick: 'x... .... ..x. ....', snare: '.... .... x... ....', hat: 'x.x. x.x. x.x. x.x.' }, 'The snare holds out until beat 3. Big and slow.'),
      L('sixteenths', 'Sixteenths', [4, 4], 4, 84, ['kick', 'snare', 'hat'],
        { kick: 'x... .... x.x. ....', snare: '.... x... .... x...', hat: 'xxxx xxxx xxxx xxxx' }, 'Hats on every sixteenth: 1 e & a 2 e & a…'),
    ] },
    { id: 't3', name: 'Syncopation', blurb: 'Off-beats, sneaky kicks and fills.', levels: [
      L('boombap', 'Boom Bap', [4, 4], 4, 90, ['kick', 'snare', 'hat'],
        { kick: 'x... ...x ..x. ....', snare: '.... x... .... x...', hat: 'x.x. x.x. x.x. x.x.' }, 'Listen for the kick on the “a” of 2.'),
      L('house', 'House', [4, 4], 4, 122, ['kick', 'hat', 'ohat', 'clap'],
        { kick: 'x... x... x... x...', clap: '.... x... .... x...', hat: '...x ...x ...x ...x', ohat: '..x. ..x. ..x. ..x.' }, 'Clap on 2 and 4. Open hat on the “&”, closed hat right after.'),
      L('funk', 'Funk', [4, 4], 4, 96, ['kick', 'snare', 'hat'],
        { kick: 'x.x. .... ..x. .x..', snare: '.... x... .... x...', hat: 'xxxx xxxx xxxx xxxx' }, 'Kicks dance around the beat. Count the sixteenths.'),
      L('breakbeat', 'Breakbeat', [4, 4], 4, 100, ['kick', 'snare', 'hat'],
        { kick: 'x.x. .... ..x. ....', snare: '.... x..x .... x...', hat: 'x.x. x.x. x.x. x.x.' }, 'A sneaky extra snare on the “a” of 2.'),
      L('fill', 'Fill It', [4, 4], 4, 96, ['kick', 'snare', 'hat', 'tomH', 'tomL', 'crash'],
        { crash: 'x... .... .... ....', kick: 'x... .... x... ....', snare: '.... x... .... ....', hat: '..x. x.x. x.x. ....', tomH: '.... .... .... xx..', tomL: '.... .... .... ..xx' }, 'Crash on 1, groove, then the toms roll down on beat 4.'),
    ] },
    { id: 't4', name: 'Odd Times', blurb: 'Threes, fives, sixes and sevens.', levels: [
      L('waltz', 'Waltz', [3, 4], 2, 120, ['kick', 'snare', 'hat'],
        { kick: 'x. .. ..', snare: '.. x. x.', hat: 'x. x. x.' }, 'Three beats per bar: oom-pah-pah.'),
      L('sixeight', 'Six-Eight', [6, 8], 2, 132, ['kick', 'snare', 'hat'],
        { kick: 'x.. ...', snare: '... x..', hat: 'xxx xxx' }, 'Two big beats, each split in three: 1 2 3 4 5 6.'),
      L('shuffle', 'Shuffle', [12, 8], 2, 120, ['kick', 'snare', 'hat'],
        { kick: 'x.. ... x.. ...', snare: '... x.. ... x..', hat: 'x.x x.x x.x x.x' }, 'The hats skip the middle of each triplet. That’s the shuffle.'),
      L('five', 'High Five', [5, 4], 2, 116, ['kick', 'snare', 'hat'],
        { kick: 'x. .. .. x. ..', snare: '.. .. x. .. x.', hat: 'x. x. x. x. x.' }, 'Five beats, felt as 3 + 2.'),
      L('seven', 'Lucky Seven', [7, 8], 2, 150, ['kick', 'snare', 'hat'],
        { kick: 'x. x. ...', snare: '.. .. x..', hat: 'xx xx xxx' }, 'Seven eighths, grouped 2 + 2 + 3.'),
    ] },
  ];

  BB.LEVELS = [];
  BB.TIERS.forEach((t) => t.levels.forEach((l) => { l.tier = t.id; BB.LEVELS.push(l); }));
  BB.LEVELS.forEach((l, i) => { l.index = i; });
  BB.levelById = (id) => BB.LEVELS.find((l) => l.id === id);
  BB.levelPattern = (l) => BB.makePattern(l.sig, l.res, l.bpm, l.tracks);
  BB.TOTAL_STARS = BB.LEVELS.length * 3;

  // ------------------------------------------------- time-signature grooves
  const G = (res, bpm, tracks) => ({ res, bpm, tracks });
  BB.METER_GROOVES = {
    '4/4': [
      G(2, 100, { kick: 'x... x...', snare: '..x. ..x.', hat: 'xxxx xxxx' }),
      G(4, 120, { kick: 'x... x... x... x...', clap: '.... x... .... x...', ohat: '..x. ..x. ..x. ..x.' }),
      G(4, 90, { kick: 'x... ..x. x.x. ....', snare: '.... x... .... x...', hat: 'x.x. x.x. x.x. x.x.' }),
    ],
    '3/4': [
      G(2, 120, { kick: 'x. .. ..', snare: '.. x. x.', hat: 'xx xx xx' }),
      G(2, 108, { kick: 'x. .. .x', snare: '.. x. ..', hat: 'x. x. x.', ride: 'x. xx xx' }),
    ],
    '2/4': [
      G(2, 112, { kick: 'x. ..', snare: '.. x.', hat: 'xx xx' }),
      G(4, 104, { kick: 'x... x...', snare: '..x. ..x.', hat: 'x.x. x.x.' }),
    ],
    '6/8': [
      G(2, 132, { kick: 'x.. ...', snare: '... x..', hat: 'xxx xxx' }),
      G(2, 126, { kick: 'x.. ..x', snare: '... x..', hat: 'x.x x.x', ride: 'xxx xxx' }),
    ],
    '12/8': [
      G(2, 120, { kick: 'x.. ... x.. ...', snare: '... x.. ... x..', hat: 'xxx xxx xxx xxx' }),
      G(2, 126, { kick: 'x.. ... x.. ..x', snare: '... x.. ... x..', hat: 'x.x x.x x.x x.x' }),
    ],
    '5/4': [
      G(2, 116, { kick: 'x. .. .. x. ..', snare: '.. .. x. .. x.', hat: 'xx xx xx xx xx' }),
      G(2, 110, { kick: 'x. .. .x x. ..', snare: '.. .. x. .. x.', hat: 'x. x. x. x. x.' }),
    ],
    '7/8': [
      G(2, 150, { kick: 'x. x. ...', snare: '.. .. x..', hat: 'xx xx xxx' }),
      G(2, 144, { kick: 'x. .. x..', snare: '.. x. ..x', hat: 'x. x. x..' }),
    ],
  };

  // ------------------------------------------------------------------ JAM
  BB.JAM_METERS = [
    { id: '4/4', sig: [4, 4], res: 4 },
    { id: '3/4', sig: [3, 4], res: 4 },
    { id: '5/4', sig: [5, 4], res: 2 },
    { id: '6/8', sig: [6, 8], res: 4 },
    { id: '7/8', sig: [7, 8], res: 2 },
    { id: '12/8', sig: [12, 8], res: 2 },
  ];

  const J = (name, meter, bpm, swing, tracks) => ({ name, meter, bpm, swing, tracks });
  BB.JAM_PRESETS = [
    J('Rock', '4/4', 104, 0, { kick: 'x... .... x.x. ....', snare: '.... x... .... x...', hat: 'x.x. x.x. x.x. x.x.', crash: 'x... .... .... ....' }),
    J('Disco', '4/4', 120, 0, { kick: 'x... x... x... x...', clap: '.... x... .... x...', snare: '.... x... .... x...', hat: 'x... x... x... x...', ohat: '..x. ..x. ..x. ..x.' }),
    J('Boom Bap', '4/4', 90, 0.45, { kick: 'x... ...x ..x. ....', snare: '.... x... .... x...', hat: 'x.x. x.x. x.x. x.xx' }),
    J('House', '4/4', 124, 0.15, { kick: 'x... x... x... x...', clap: '.... x... .... x...', hat: 'xx.x xx.x xx.x xx.x', ohat: '..x. ..x. ..x. ..x.', ride: 'x.x. x.x. x.x. x.x.' }),
    J('Funk', '4/4', 98, 0.2, { kick: 'x.x. .... ..x. .x..', snare: '.... x..x .x.. x...', hat: 'xxxx xxxx xxxx xxx.', ohat: '.... .... .... ...x' }),
    J('Trap', '4/4', 70, 0, { kick: 'x... ..x. ..x. ....', snare: '.... .... x... ....', hat: 'x.x. x.x. xxxx x.x.', ohat: '.... .... .... ...x' }),
    J('Dembow', '4/4', 96, 0, { kick: 'x... x... x... x...', snare: '...x ..x. ...x ..x.', hat: 'x.x. x.x. x.x. x.x.' }),
    J('Waltz', '3/4', 110, 0, { kick: 'x... .... ....', snare: '.... x... x...', hat: 'x.x. x.x. x.x.', crash: 'x... .... ....' }),
    J('6/8 Ballad', '6/8', 120, 0, { kick: 'x..... ....x.', snare: '...... x.....', hat: 'x.x.x. x.x.x.', crash: 'x..... ......' }),
    J('Shuffle', '12/8', 120, 0, { kick: 'x.. ... x.. ..x', snare: '... x.. ... x..', ride: 'x.x x.x x.x x.x', hat: '... x.. ... x..' }),
    J('High Five', '5/4', 116, 0, { kick: 'x. .. .x x. ..', snare: '.. .. x. .. x.', hat: 'xx xx xx xx xx' }),
    J('Lucky Seven', '7/8', 150, 0, { kick: 'x. x. ...', snare: '.. .. x..', hat: 'xx xx xxx', tomL: '.. .. ..x' }),
  ];

  // --------------------------------------------------------------- LESSONS
  BB.LESSONS = [
    {
      id: 'pulse', title: 'The Pulse',
      body: `<p>Every groove sits on a steady pulse — the <b>beat</b>. It's what you tap your foot to.</p>
             <p><b>Tempo</b> is how fast the beats go, measured in <b>BPM</b> (beats per minute). 60 BPM is one beat per second. Most pop songs live between 90 and 130.</p>`,
      widget: { type: 'metronome', bpm: 90 },
      tip: 'Hit <b>Tap</b> along with a song in your head to find its tempo.',
    },
    {
      id: 'bars', title: 'Bars & Counting',
      body: `<p>Beats are grouped into <b>bars</b> (also called measures). Most music has 4 beats per bar, counted <b>1 2 3 4</b>. Beat 1 — the <b>downbeat</b> — is where the bar starts over.</p>
             <p>A step sequencer shows one bar, read left to right. Each column is a moment in time; each row is a drum. Light a pad and that drum plays at that moment.</p>`,
      widget: { type: 'grid', sig: [4, 4], res: 1, bpm: 92, rows: ['kick', 'snare', 'hat'], tracks: { kick: 'x...', hat: 'xxxx' }, metronome: false },
      tip: 'Try it: put a snare on beats <b>2</b> and <b>4</b>.',
      practice: 'heartbeat',
    },
    {
      id: 'notes', title: 'Note Values',
      body: `<p>Notes tell you <i>how long</i> each sound lasts relative to the beat. In 4/4, a <b>quarter note</b> gets one beat.</p>
             <p>Split a quarter in half and you get <b>eighth notes</b>; split again for <b>sixteenths</b>. Go the other way for <b>half notes</b> (2 beats) and the <b>whole note</b> (the whole bar).</p>`,
      widget: { type: 'notes' },
      tip: 'Tap a row to hear it. The click marks each beat, the snare plays the note value.',
    },
    {
      id: 'rests', title: 'Rests',
      body: `<p>Silence is part of rhythm too. Every note value has a matching <b>rest</b> that lasts exactly as long — the time passes, the drum just doesn't play.</p>
             <p>On the grid, a rest is simply an <b>empty pad</b>. Space is what makes the hits feel good.</p>`,
      widget: { type: 'rests', sig: [4, 4], res: 2, bpm: 96, rows: ['kick', 'snare', 'hat'], tracks: { kick: 'x... x.x.', snare: '..x. ..x.', hat: 'x.x. x.x.' } },
      tip: 'Clear a few hits and listen to how the rests change the feel.',
    },
    {
      id: 'meters', title: 'Time Signatures',
      body: `<p>A <b>time signature</b> is two stacked numbers. The <b>top</b> says how many beats are in a bar. The <b>bottom</b> says which note gets the beat: <b>4</b> = quarter note, <b>8</b> = eighth note.</p>
             <p><b>4/4</b> is so common it's called common time. <b>3/4</b> gives the waltz its sway. <b>6/8</b> packs six eighths into two big beats — <b>1</b> 2 3 <b>4</b> 5 6.</p>`,
      widget: { type: 'meters' },
      tip: 'The high click marks beat 1 of each bar. Count the clicks until it comes back around.',
    },
    {
      id: 'backbeat', title: 'The Backbeat',
      body: `<p>Kick on <b>1 and 3</b>, snare on <b>2 and 4</b>: that's the <b>backbeat</b>, the backbone of rock, pop, soul and hip-hop.</p>
             <p>It's why audiences clap on 2 and 4. The kick pushes, the snare answers.</p>`,
      widget: { type: 'grid', sig: [4, 4], res: 2, bpm: 92, rows: ['kick', 'snare', 'clap', 'hat'], tracks: { kick: 'x... x...', snare: '..x. ..x.' } },
      tip: 'Add a clap on top of the snare for extra snap.',
      practice: 'backbeat',
    },
    {
      id: 'eighths', title: 'Eighth Notes',
      body: `<p>Put an “<b>&</b>” between each beat and you're counting eighth notes: <b>1 & 2 & 3 & 4 &</b>.</p>
             <p>Hi-hat on every eighth over a backbeat is the most-played drum beat in the world.</p>`,
      widget: { type: 'grid', sig: [4, 4], res: 2, bpm: 104, rows: ['kick', 'snare', 'hat', 'ohat'], tracks: { kick: 'x... x...', snare: '..x. ..x.', hat: 'xxxx xxxx' } },
      tip: 'Swap the last hi-hat for an open hat to add a lift into the next bar.',
      practice: 'rock',
    },
    {
      id: 'sixteenths', title: 'Sixteenth Notes',
      body: `<p>Split each eighth again and count <b>1 e & a 2 e & a</b>. Four sixteenths fill one beat.</p>
             <p>Sixteenths give grooves their drive and detail — funk, hip-hop and modern pop hats live here.</p>`,
      widget: { type: 'grid', sig: [4, 4], res: 4, bpm: 88, rows: ['kick', 'snare', 'hat'], tracks: { kick: 'x... .... x.x. ....', snare: '.... x... .... x...', hat: 'xxxx xxxx xxxx xxxx' } },
      tip: 'Say “one-ee-and-uh” out loud while it plays.',
      practice: 'sixteenths',
    },
    {
      id: 'syncopation', title: 'Syncopation',
      body: `<p><b>Syncopation</b> means hitting the spots <i>between</i> the strong beats — the “e”, “&” and “a”.</p>
             <p>It creates surprise and forward push: the thing that makes you nod your head.</p>`,
      widget: { type: 'grid', sig: [4, 4], res: 4, bpm: 94, rows: ['kick', 'snare', 'hat'], tracks: { kick: 'x... ..x. ..x. ....', snare: '.... x... .... x...', hat: 'x.x. x.x. x.x. x.x.' } },
      tip: 'Move one kick off the beat and feel the difference.',
      practice: 'boombap',
    },
    {
      id: 'triplets', title: 'Triplets & Shuffle',
      body: `<p>When a beat splits into <b>three</b> instead of two, you get <b>triplets</b>. 12/8 is built from them: four big beats, each counted <b>1 & a</b>.</p>
             <p>Skip the middle note of each triplet and you get the <b>shuffle</b> — the bounce of blues and boogie.</p>`,
      widget: { type: 'grid', sig: [12, 8], res: 2, bpm: 120, rows: ['kick', 'snare', 'hat', 'ride'], tracks: { kick: 'x.. ... x.. ...', snare: '... x.. ... x..', hat: 'x.x x.x x.x x.x' } },
      tip: 'Fill in the missing middle hats and the shuffle turns into a rolling triplet groove.',
      practice: 'shuffle',
    },
  ];
})(window.BB);
