// Optional, quiet ambience synthesized with Web Audio (no files). Off by default; never autoplays.
let ctx = null, master = null, bed = null;

function ensure() {
  if (ctx) return ctx;
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
  ctx = new C(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  return ctx;
}
function startBed() {
  // soft wind: filtered noise with a slowly moving filter
  const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .07; lg.gain.value = 260; lfo.connect(lg); lg.connect(f.frequency);
  const g = ctx.createGain(); g.gain.value = .05;
  src.connect(f); f.connect(g); g.connect(master); src.start(); lfo.start();
  bed = [src, lfo];
}

export function setSound(on) {
  if (on) {
    if (!ensure()) return;
    ctx.resume(); if (!bed) startBed();
    master.gain.setTargetAtTime(.8, ctx.currentTime, .6);
  } else if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, .2);
}

/** A small pentatonic chime for notable moments. */
export function chime(kind = 'good') {
  if (!ctx || master.gain.value < .05) return;
  const notes = kind === 'bad' ? [220, 196] : kind === 'era' ? [392, 494, 587, 784] : [523, 659];
  notes.forEach((n, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * .12;
    o.type = 'triangle'; o.frequency.value = n;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.08, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.3);
  });
}
