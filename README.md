# Backbeat · BB-16 Rhythm Trainer

A tiny drum machine that teaches you rhythm. Learn how beats, bars, note values and time signatures work, then train your ear by hearing a groove and rebuilding it on a step grid.

Every drum sound is synthesized live in the browser with the Web Audio API. There are no samples, no build step and no dependencies.

## Run it

Open `index.html` in a browser. That's it.

You can also serve the folder with any static server, for example:

```bash
python3 -m http.server 8000
```

and visit <http://localhost:8000>. The app works on GitHub Pages straight from the repository root.

## Modes

| Mode | What it does |
| --- | --- |
| **01 Learn** | Ten short lessons, each with a playable widget: pulse & tempo (with tap tempo), bars & counting, note values, rests, time signatures, backbeat, eighths, sixteenths, syncopation, triplets & shuffle. |
| **02 Echo** | The main game. Listen to a beat (with a count-in), then rebuild it on the grid. **A/B** alternates the target and your version bar by bar. The 🎧 buttons solo one drum as a hint, which caps that round at two stars. Twenty levels in four tiers: First Steps, In the Pocket, Syncopation and Odd Times (3/4, 6/8, 12/8, 5/4, 7/8). |
| **03 Meter** | Ear training for time signatures. Hear a groove with a crash on beat 1 and name its meter. Easy, Medium and Hard (Hard drops the click). |
| **04 Notes** | Read note and rest glyphs, count their beats, do note math ("how many eighths fit in a half?"), and identify subdivisions by ear. |
| **05 Jam** | The full 9-voice machine. Set meter, tempo and swing, load presets, roll random grooves, and copy a share link (`#jam=…`). |

Progress (stars, best scores, kit, volume and your last jam) is saved in `localStorage`.

### Keys

- `Space`: play / stop (in quizzes it replays the clip)
- `A S D F G H J K L`: finger-drum the nine voices in Jam
- `1`–`4`: answer quiz questions; `Enter` moves to the next question, or checks your grid in Echo

## Sound design

`js/audio.js` builds each voice from oscillators, noise and filters:

- **Kick**: a sine with a two-stage pitch drop, saturated for harmonics so it carries on laptop and phone speakers, plus a band-passed beater click.
- **Snare**: two pitched triangle "shell" tones and high-passed, peaked noise for the wires.
- **Hats / ride / crash**: six detuned square waves through band- and high-pass filters (the classic metallic recipe) blended with noise. Closed hats choke the open hat.
- **Clap**: three fast noise bursts and a tail.
- **Toms**: pitched sines with an overtone and a stick transient.

Everything goes through a mix bus with soft saturation, a glue compressor, a tone filter and a limiter, plus a generated room reverb on a send. Hits get light velocity shaping: downbeats are accented and off-beat hats sit softer, so a plain on/off grid still grooves. There are four kits (**Analog**, **Room**, **Boom** and **Dusty**), which are different parameter sets over the same voices.

Timing uses a look-ahead scheduler on the AudioContext clock. Visuals are queued and released on `requestAnimationFrame` when their audio is heard.

## Code map

```
index.html          app shell
css/styles.css      all styling (dark hardware look, responsive)
js/theory.js        instruments, meters, counting syllables, pattern helpers
js/audio.js         synth voices, kits, mix bus
js/sequencer.js     look-ahead scheduler + tiny event bus
js/notation.js      hand-drawn SVG notes, rests, beamed groups
js/ui.js            DOM helper, storage, icons, shared widgets
js/grid.js          the step grid component
js/content.js       lessons, Echo levels, quiz grooves, Jam presets
js/modes/*.js       Learn, Echo, Meter, Notes, Jam (+ shared quiz engine)
js/app.js           header, mode switching, keyboard, routing
```

To add an Echo level, add an entry to `BB.TIERS` in `js/content.js`. Patterns are written as strings: `x` is a hit, `.` is a rest, and spaces are ignored.

```js
L('rock', 'Rock Beat', [4, 4], 2, 104, ['kick', 'snare', 'hat'],
  { kick: 'x... x...', snare: '..x. ..x.', hat: 'xxxx xxxx' }, 'Hats on every eighth note.')
```
