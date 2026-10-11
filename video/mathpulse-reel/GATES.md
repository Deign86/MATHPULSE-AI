# GATES — MathPulse AI feature reel (fast-paced motion video)

Mode: solo. Working dir: `video/mathpulse-reel`. Deliverable: `out/mathpulse-reel.mp4` (v3, 2026-10-11 15:52).

## Inputs
- [x] G1 Lasseter's animation principles read and mapped to concrete motion rules used in the composition (document in `MOTION-NOTES.md`).
  EVIDENCE: `MOTION-NOTES.md` maps all 11 principles + personality to specific tweens (squash/stretch on logo land, anticipation wind-up on VS badge, horns lag 0.06 s, arcs on mascot hop and path nodes).
- [x] G2 Voice lines rendered through local VoiceStudio (`http://localhost:3900/v1/audio/speech`) with the `Deign` profile; one WAV per line under `assets/vo/`.
  CHECK: ls assets/vo/*.wav | wc -l
  EXPECT: >= 8
  EVIDENCE: 13 files, vo01–vo13 (`/v1/audio/voices` lists Deign = profile 18d8b782); loudness-normalized to -16 LUFS, RMS -14.9…-15.7 dBFS; originals kept in `assets/vo/raw/`.
- [x] G3 Music track is upbeat, drum-heavy, >= 140 BPM, covers the full duration; provenance recorded in `assets/CREDITS.md`.
  CHECK: ffprobe -v error -show_entries format=duration -of csv=p=0 assets/music/bed.wav
  EXPECT: >= composition duration
  EVIDENCE: 49.500000 s, 160 BPM, 98 kicks (script output); spectrum picture `out/music_spectrum.png` shows the 16th-note hat grid and kick lines; provenance in `assets/CREDITS.md` (generated, no samples).

## Composition
- [x] G4 `index.html` covers every product area: AI tutor (RAG on DepEd modules), diagnostic assessment + IAR placement, modules/learning path, practice center + quiz maker, Quiz Battle, XP/rewards/avatar shop/leaderboard/daily challenge, teacher at-risk dashboard + mastery heatmap + DepEd class-record import, admin RAG manager/analytics/users, PWA install/offline/push/Android.
  CHECK: grep -c "data-scene" index.html
  EXPECT: >= 10
  EVIDENCE: 14 scenes (open, hook, tutor, diagnostic, path, practice, battle, rewards, teacher-mastery, teacher-import, admin, pwa, wall, outro); wall grid names 18 features.
- [x] G5 Cut cadence is fast: no scene longer than 5 s; average under 4 s.
  EVIDENCE: scenes=14 avg=3.54 s max=4.50 s (awk over data-scene attributes).
- [x] G6 `npx hyperframes check` passes with 0 lint errors.
  CHECK: npx --yes hyperframes@0.8.146 check --timeout 30000
  EXPECT: exit 0, "0 error"
  EVIDENCE: "Lint 0 error(s), 18 warning(s)" (all structural sub-composition advice) · Runtime 0/0 · Layout 0 errors · Motion 0 · Contrast 0 · "Check passed".

## Output
- [x] G7 `out/mathpulse-reel.mp4` exists, has video + AAC audio, duration == root `data-duration` (±0.2 s).
  CHECK: ffprobe -v error -show_entries stream=codec_type,codec_name:format=duration -of csv=p=0 out/mathpulse-reel.mp4
  EXPECT: video h264 + audio aac, duration matches
  EVIDENCE: `h264,video` / `aac,audio` / `49.500000` (root data-duration 49.5), 1920x1080 30 fps, 11.98 MB.
- [x] G8 Frame QA: contact sheet of every scene midpoint reviewed; no clipped text, no overlapping elements, logo readable.
  EVIDENCE: 99 frames at 0.5 s (`out/sheet_00..10.png`) reviewed on v1 → 6 entrance-state leaks (cursor, typing dots, leaderboard rows, heatmap cells, docs/bars, tiles) traced to the tween helper and fixed; v2 sheet `out/qa_sheet2.jpg` (36 frames) shows no pre-visible elements, no overlaps, no clipped text.
- [x] G9 Audio QA: VO audible over music (music ducked under VO), peak <= -1 dBTP, integrated loudness about -14 LUFS.
  CHECK: ffmpeg -i out/mathpulse-reel.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -12
  EXPECT: I between -16 and -12 LUFS, true peak <= -1.0 dBTP
  EVIDENCE: two-pass linear loudnorm (measured I -15.72, offset -0.20): I = -14.0 LUFS, LRA 6.9 LU, true peak -1.4 dBTP. Per-line mix RMS now even: vo03 -17.4, vo06 -17.2, vo07 -13.1 (impact hit lowered to 0.55/0.9 s), vo08 -16.6 dBFS. Pre-master: VO -14.7 dBFS RMS vs bed ducked to 0.18 = -27.6 dBFS RMS → voice ~13 dB above music, plus -5 dB at 2.2 kHz / -3 dB at 380 Hz carve on the bed.
- [x] G10 Delivered through the HeyGen HyperFrames connector (project imported, link recorded) or the exact refusal recorded.
  EVIDENCE: see "Connector delivery" below.
- [x] G11 `LISTEN.md` lists 5 timecodes for a human ear check; report states what the checks show, not that the sound "is good".
  EVIDENCE: `LISTEN.md` rows 1–5 (0:01.5, 0:06, 0:12.3, 0:22.5, 0:48.0).

## Connector delivery
`compose` / `render_video` are refused from Claude Code by the HyperFrames MCP server (CLI clients must author locally). The MP4 was uploaded as an artifact asset (`/_blob/cc286b88cdbf6528d26ccc5b7c3d6fd0`, 11,976,054 bytes) and passed to `import-claude-motion-from-url`. Refusal, verbatim: "The video URL must come from Claude Motion's Send to." The connector only accepts URLs minted by Claude Motion's own Send-to flow, so the MP4 is delivered as a file plus the artifact page https://claude.ai/artifact/W6GiRz3h53pnTUWtXdNmCr. To get it into HyperFrames Studio: `npx hyperframes open` in `video/mathpulse-reel` (desktop app) or drop `out/mathpulse-reel.mp4` into Studio.
