# MathPulse AI feature reel

49.5-second product reel (1920×1080, 30 fps) built as a HyperFrames composition: 14 scenes on a 160 BPM grid, Deign voice-over from a local VoiceStudio, generated drum track.

## Rebuild

```bash
cd video/mathpulse-reel
node scripts/make-music.mjs                      # writes assets/music/bed.wav (49.5 s, 160 BPM)
npx --yes hyperframes@0.8.146 check --timeout 30000
npx --yes hyperframes@0.8.146 render --output out/mathpulse-reel-raw.mp4 --quality looks --workers 2
```

Master the audio with a two-pass linear `loudnorm` (I -14, TP -1.5, LRA 9): run the first pass with `print_format=json`, then feed the measured values back with `linear=true`. The single-pass filter is dynamic and rides gain around the impact hits.

Voice lines: `assets/vo/lines.json` → VoiceStudio `POST http://localhost:3900/v1/audio/speech` (model `omnivoice`, voice `Deign`, wav) → `highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=7` per file.

## Files

- `index.html` — the composition (one paused GSAP timeline, scene timings in `T`)
- `MOTION-NOTES.md` — Lasseter's principles mapped to the tweens used
- `GATES.md` — acceptance gates with recorded evidence
- `LISTEN.md` — five timecodes for a human ear check
- `assets/CREDITS.md` — provenance of every asset
