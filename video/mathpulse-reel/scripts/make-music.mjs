// Drum-machine track for the MathPulse reel: 160 BPM, 33 bars (49.5 s), A minor.
// Deterministic (seeded noise), no dependencies. Writes assets/music/bed.wav (44.1 kHz stereo 16-bit).
import { writeFileSync, mkdirSync } from "node:fs";

const SR = 44100;
const BPM = 160;
const BEAT = 60 / BPM; // 0.375 s
const STEP = BEAT / 4; // 16th
const BAR = BEAT * 4; // 1.5 s
const BARS = 33;
const TOTAL = BAR * BARS; // 49.5 s
const N = Math.ceil(TOTAL * SR);

const left = new Float32Array(N);
const right = new Float32Array(N);
const drums = new Float32Array(N);
const tonal = new Float32Array(N);
const kickTimes = [];

let seed = 1337;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296 - 0.5;
};

const sec = (t) => Math.round(t * SR);

function onePoleLP(cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  return (x) => (y = (1 - a) * x + a * y);
}
function onePoleHP(cutoff) {
  const lp = onePoleLP(cutoff);
  return (x) => x - lp(x);
}
const softClip = (x) => Math.tanh(x);

function add(target, start, length, sampleFn) {
  const s0 = sec(start);
  for (let n = 0; n < length && s0 + n < N; n++) target[s0 + n] += sampleFn(n, n / SR);
}

// ---------- drum voices ----------
function kick(t, amp = 1) {
  kickTimes.push(t);
  let phase = 0;
  const len = sec(0.32);
  add(drums, t, len, (n, tt) => {
    const f = 46 + 130 * Math.exp(-tt / 0.028);
    phase += (2 * Math.PI * f) / SR;
    const body = Math.sin(phase) * Math.exp(-tt / 0.13);
    const click = rand() * 2 * Math.exp(-tt / 0.0035);
    return softClip(1.8 * (body + 0.6 * click)) * 0.95 * amp;
  });
}
function snare(t, amp = 1) {
  const hp = onePoleHP(1400);
  let phase = 0;
  add(drums, t, sec(0.22), (n, tt) => {
    phase += (2 * Math.PI * (175 + 60 * Math.exp(-tt / 0.02))) / SR;
    const tone = Math.sin(phase) * Math.exp(-tt / 0.06) * 0.55;
    const noise = hp(rand() * 2) * Math.exp(-tt / 0.1) * 0.9;
    return softClip(1.6 * (tone + noise)) * 0.8 * amp;
  });
}
function clap(t, amp = 1) {
  const bp = onePoleHP(900);
  const lp = onePoleLP(5000);
  add(drums, t, sec(0.2), (n, tt) => {
    const burst = Math.exp(-((tt * 1000) % 11) / 2.2) * (tt < 0.033 ? 1 : 0);
    const tail = Math.exp(-tt / 0.07);
    return lp(bp(rand() * 2)) * (burst + 0.8 * tail) * 0.6 * amp;
  });
}
function hat(t, open = false, amp = 1) {
  const hp = onePoleHP(7000);
  const decay = open ? 0.11 : 0.022;
  add(drums, t, sec(open ? 0.3 : 0.07), (n, tt) => hp(rand() * 2) * Math.exp(-tt / decay) * 0.35 * amp);
}
function tom(t, f0, amp = 1) {
  let phase = 0;
  add(drums, t, sec(0.25), (n, tt) => {
    phase += (2 * Math.PI * (f0 * 0.7 + f0 * 0.6 * Math.exp(-tt / 0.04))) / SR;
    return Math.sin(phase) * Math.exp(-tt / 0.11) * 0.7 * amp;
  });
}
function crash(t, amp = 1) {
  const hp = onePoleHP(4500);
  add(drums, t, sec(1.4), (n, tt) => hp(rand() * 2) * Math.exp(-tt / 0.45) * 0.5 * amp);
}
function riser(t, length) {
  const lp = onePoleLP(400);
  add(drums, t, sec(length), (n, tt) => {
    const p = tt / length;
    const cut = 300 + 9000 * p * p;
    const a = Math.exp((-2 * Math.PI * cut) / SR);
    const x = rand() * 2;
    riserState = (1 - a) * x + a * riserState;
    return (x - riserState) * p * p * 0.42;
  });
}
let riserState = 0;

// ---------- tonal voices ----------
const NOTE = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
function saw(phase) {
  return 2 * (phase - Math.floor(phase)) - 1;
}
function bass(t, midi, length) {
  const lp = onePoleLP(260);
  let p1 = 0;
  let p2 = 0;
  const f = NOTE(midi);
  add(tonal, t, sec(length), (n, tt) => {
    p1 += f / SR;
    p2 += (f * 0.5) / SR;
    const env = Math.min(1, tt / 0.004) * (tt > length - 0.03 ? (length - tt) / 0.03 : 1);
    return (lp(saw(p1)) * 0.6 + Math.sin(2 * Math.PI * p2) * 0.7) * env * 0.5;
  });
}
function stab(t, midis, length, bright = 1) {
  const lp = onePoleLP(1800 * bright);
  const phases = midis.flatMap((m) => [0, 0, 0]);
  const freqs = midis.flatMap((m) => [NOTE(m) * 0.995, NOTE(m), NOTE(m) * 1.006]);
  add(tonal, t, sec(length), (n, tt) => {
    let v = 0;
    for (let i = 0; i < freqs.length; i++) {
      phases[i] += freqs[i] / SR;
      v += saw(phases[i]);
    }
    const env = Math.min(1, tt / 0.006) * Math.exp(-tt / (length * 0.55));
    return lp(v / freqs.length) * env * 0.5;
  });
}
function arp(t, midi, length) {
  let phase = 0;
  const f = NOTE(midi);
  const lp = onePoleLP(5200);
  add(tonal, t, sec(length), (n, tt) => {
    phase += f / SR;
    const sq = saw(phase) > 0 ? 1 : -1;
    const env = Math.min(1, tt / 0.003) * Math.exp(-tt / (length * 0.4));
    return lp(sq * 0.5 + saw(phase * 2) * 0.25) * env * 0.22;
  });
}

// ---------- arrangement ----------
// Chord loop per bar: Am  F  C  G  (midi roots 45,41,36,43 for bass; stabs an octave+ up)
const CHORDS = [
  { bass: 45, stab: [69, 72, 76] },
  { bass: 41, stab: [69, 72, 77] },
  { bass: 48, stab: [67, 72, 76] },
  { bass: 43, stab: [67, 71, 74] },
];
const barStart = (b) => b * BAR;
const at = (b, step) => barStart(b) + step * STEP;

// Intro (bars 0-1): four-on-the-floor kick, riser into the drop at bar 2.
for (let b = 0; b < 2; b++) for (let beat = 0; beat < 4; beat++) kick(at(b, beat * 4), 0.85);
riser(0, 2 * BAR);

// Groove (bars 2-29), outro (30-32).
for (let b = 2; b < BARS; b++) {
  const chord = CHORDS[b % 4];
  const section = b < 19 ? "A" : b < 23 ? "teacher" : b < 30 ? "B" : "outro";
  const fillBar = (b - 1) % 4 === 0 && section !== "outro";

  if (section === "outro") {
    // Big hits on beats 1 and 3, no hats; final thump on bar 32 beat 1 (t = 48.0).
    if (b === 30) crash(at(b, 0), 1);
    kick(at(b, 0), 1);
    if (b < 32) kick(at(b, 8), 0.9);
    if (b === 32) {
      kick(at(b, 0), 1.1);
      tom(at(b, 0), 110, 0.9);
      crash(at(b, 0), 0.8);
    }
    stab(at(b, 0), chord.stab, b === 32 ? 1.5 : BAR, 0.7);
    bass(at(b, 0), chord.bass, b === 32 ? 1.45 : BAR * 0.9);
    continue;
  }

  // Kicks: two-step with a pickup on step 6.
  kick(at(b, 0), 1);
  kick(at(b, 6), 0.85);
  kick(at(b, 10), 1);
  // Snare on 2 and 4, clap layered after bar 10, ghost note alternate bars.
  snare(at(b, 4), 1);
  snare(at(b, 12), 1);
  if (b >= 10) {
    clap(at(b, 4), 0.7);
    clap(at(b, 12), 0.7);
  }
  if (b % 2 === 1) snare(at(b, 15), 0.35);
  // Hats: every 16th, accents on 8ths, open hat on step 14.
  for (let s = 0; s < 16; s++) {
    if (fillBar && s >= 12) continue;
    hat(at(b, s), s === 14, s % 2 === 0 ? 1 : 0.55);
  }
  // Fill: snare roll + toms into the next bar.
  if (fillBar) {
    snare(at(b, 12), 0.7);
    snare(at(b, 13), 0.75);
    tom(at(b, 14), 170, 0.9);
    tom(at(b, 15), 120, 1);
    crash(at(b + 1, 0), 0.7);
  }
  // Bass: 16th gallop on the root, octave jumps on steps 6/14.
  for (let s = 0; s < 16; s++) {
    if (s % 2 === 1 && s !== 7 && s !== 15) continue;
    const note = s === 6 || s === 14 ? chord.bass + 12 : chord.bass;
    bass(at(b, s), note, STEP * (s % 2 === 0 ? 1.6 : 0.9));
  }
  // Stabs / arp.
  if (section === "A" || section === "B") {
    for (const s of [2, 7, 11]) stab(at(b, s), chord.stab, STEP * 2.2, section === "B" ? 1.25 : 1);
  }
  if (section === "teacher" || section === "B") {
    const seq = [0, 2, 1, 2, 0, 2, 1, 3];
    for (let s = 0; s < 16; s++) {
      const n = chord.stab[seq[s % 8] % 3] + (s % 8 >= 4 ? 12 : 0);
      arp(at(b, s), n, STEP * 0.9);
    }
  }
}

// ---------- sidechain the tonal bus to the kick ----------
kickTimes.sort((a, b) => a - b);
let ki = 0;
let lastKick = -10;
for (let n = 0; n < N; n++) {
  const t = n / SR;
  while (ki < kickTimes.length && kickTimes[ki] <= t) lastKick = kickTimes[ki++];
  const duck = 1 - 0.7 * Math.exp(-(t - lastKick) / 0.085);
  tonal[n] *= duck;
}

// ---------- mix, stereo, master ----------
const widen = sec(0.009);
for (let n = 0; n < N; n++) {
  const d = drums[n] * 0.9;
  const tn = tonal[n];
  const tnWide = n >= widen ? tonal[n - widen] : 0;
  left[n] = d + tn * 0.75 + tnWide * 0.25;
  right[n] = d + tn * 0.25 + tnWide * 0.75;
}
let peak = 0;
for (let n = 0; n < N; n++) {
  left[n] = softClip(left[n]);
  right[n] = softClip(right[n]);
  peak = Math.max(peak, Math.abs(left[n]), Math.abs(right[n]));
}
const gain = 0.7 / peak;
// Fade the final 0.4 s so the cut at 49.5 s is clean.
const fadeStart = sec(TOTAL - 0.4);
const pcm = Buffer.alloc(N * 4);
for (let n = 0; n < N; n++) {
  const fade = n > fadeStart ? (N - n) / (N - fadeStart) : 1;
  pcm.writeInt16LE(Math.round(left[n] * gain * fade * 32767), n * 4);
  pcm.writeInt16LE(Math.round(right[n] * gain * fade * 32767), n * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);
mkdirSync("assets/music", { recursive: true });
writeFileSync("assets/music/bed.wav", Buffer.concat([header, pcm]));
console.log(`wrote assets/music/bed.wav  ${TOTAL}s  ${BPM} BPM  ${kickTimes.length} kicks  peak ${peak.toFixed(2)}`);
