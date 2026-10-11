# MathPulse AI feature reel

49.5-second product reel (1920×1080, 60 fps) built as a HyperFrames composition: 14 scenes on a 160 BPM grid, Deign voice-over from a local VoiceStudio, generated drum track.

## Two cuts

| Cut | Composition | Output | What it is |
| --- | --- | --- | --- |
| v3 motion | `v3-motion.html` | `out/mathpulse-reel-v3.mp4` | Pure motion-graphics cut (designed UI mocks), composition frozen as of the first PR commit |
| v4 real UI | `index.html` | `out/mathpulse-reel-v4.mp4` | Same reel with real app screen recordings in six scenes |

Both render at 60 fps and share every asset. Render v3 with `--composition v3-motion.html`.

## Rebuild

```bash
cd video/mathpulse-reel
node scripts/make-music.mjs                      # writes assets/music/bed.wav (49.5 s, 160 BPM)
npx --yes hyperframes@0.8.146 check --timeout 30000
npx --yes hyperframes@0.8.146 render --output out/mathpulse-reel-v4-raw.mp4 --quality looks --fps 60 --workers 2
npx --yes hyperframes@0.8.146 render --composition v3-motion.html --output out/mathpulse-reel-v3-raw.mp4 --quality looks --fps 60 --workers 2
```

Master the audio with a two-pass linear `loudnorm` (I -14, TP -1.5, LRA 9): run the first pass with `print_format=json`, then feed the measured values back with `linear=true`. The single-pass filter is dynamic and rides gain around the impact hits.

Voice lines: `assets/vo/lines.json` → VoiceStudio `POST http://localhost:3900/v1/audio/speech` (model `omnivoice`, voice `Deign`, wav) → `highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=7` per file.

## Real UI captures

`assets/ui/*.mp4` are screen recordings of the actual app. To refresh them, start the dev server (`npx vite --port 5175 --strictPort` from the repo root), put the demo credentials in `.e2e/demo.env` (`DEMO_<ROLE>_USERNAME` / `_PASSWORD`, git-ignored) and run from the repo root:

```bash
node video/mathpulse-reel/scripts/record-ui.mjs            # all roles; or: student | teacher | admin
REEL_ONLY=student-chat node video/mathpulse-reel/scripts/record-ui.mjs student
```

Raw `.webm` captures land in `.capture/` (git-ignored); trim the loaded part into `assets/ui/` with ffmpeg (`-ss <start> -t <len> -vf scale=1600:1000,fps=30`). In `index.html` each capture is a `<video>` inside the untimed `#ui-layer` (a timed `<video>` may not sit inside a timed section) with `data-media-start` / `data-playback-rate`, and a `.win` browser frame in its scene.

## Files

- `index.html` — the composition (one paused GSAP timeline, scene timings in `T`)
- `MOTION-NOTES.md` — Lasseter's principles mapped to the tweens used
- `GATES.md` — acceptance gates with recorded evidence
- `LISTEN.md` — five timecodes for a human ear check
- `assets/CREDITS.md` — provenance of every asset
