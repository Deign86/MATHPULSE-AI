# LISTEN — human ear check for `out/mathpulse-reel.mp4`

Claude cannot hear the mix. Every sound below was placed from the timeline and verified only by loudness meters and frame checks. Listen to these five timecodes and judge by ear.

| # | Timecode | What should be heard | What the checks show |
| --- | --- | --- | --- |
| 1 | 0:01.5 | Logo lands on beat 4: impact SFX on top of the kick, riser resolves, music drops in full at 0:03.0 | impact placed at 1.50 s, music riser 0–3.0 s, full groove from 3.0 s |
| 2 | 0:06.0 → 0:10.4 | Deign VO ("Ask the AI tutor…") sits clearly above the music; music ducks to 0.18 at 6.05 s and returns to 0.7 at 14.68 s | volume lane on `#music`; bed carved -5 dB at 2.2 kHz and -3 dB at 380 Hz; VO lines normalized to -16 LUFS; pre-master voice ≈ 13 dB above the ducked bed |
| 3 | 0:12.3 | Click on option A, chime at 0:13.2 when "Placed" lands | `sfx-click-1` 12.30 s, `sfx-chime-1` 13.20 s |
| 4 | 0:22.5 | Split-screen slam: short impact, then "Quiz Battle. Real time, head to head." at the same level as the other lines | `sfx-impact-2` 22.50 s at 0.55 for 0.9 s; master is two-pass linear loudnorm so no gain riding after the hit |
| 5 | 0:48.0 | Final thump: crash + kick + impact SFX, music swells to 0.85 under the hold | `sfx-impact-4` 48.00 s, lane point `t=48 v=0.85`, music fades over the last 0.4 s |

Known limits: the music is a generated drum-machine track (see `assets/CREDITS.md`); if it sounds thin or too busy under the voice, replace `assets/music/bed.wav` and re-render. Whoosh SFX are the same HyperFrames library file on alternating cuts; if they feel repetitive, drop every second one.
