# Credits and provenance

| Asset | Source | Licence / notes |
| --- | --- | --- |
| `vo/vo01.wav` … `vo13.wav` | VoiceStudio running locally (`http://localhost:3900/v1/audio/speech`, engine `omnivoice`), voice profile **Deign** (`18d8b782`), speed 1.08, seed 7 | Owner's own cloned voice profile |
| `music/bed.wav` | Generated in-session by `scripts/make-music.mjs`: a 160 BPM drum-machine track (two-step kick, snare + clap, 16th hats, fills every 4 bars, sidechained bass and chord stabs, arp from bar 19), A minor, 33 bars | Original, written for this reel, no samples. Swap this file to use a licensed track; keep 49.5 s and 160 BPM so the cuts stay on the grid |
| `sfx/whoosh.mp3`, `swoosh.mp3`, `impact.mp3`, `click.mp3`, `pop.mp3`, `chime.mp3`, `riser.mp3` | HyperFrames `media-use` bundled SFX library (`npx hyperframes media-use resolve --type sfx`), ledger in `.media/audio/sfx/` | Bundled with HyperFrames 0.8.146 (HeyGen) |
| `ui/*.mp4` (chat, modules, quizmaker, leaderboard, import, rag, users, analytics) | Screen recordings of the local dev build (`scripts/record-ui.mjs`, Playwright, 1600×1000) signed in as the demo student / teacher / admin accounts; trimmed and re-encoded with ffmpeg | Project-owned; demo accounts only |
| `fonts/nunito-latin-wght-normal.woff2` | `@fontsource-variable/nunito` npm package | SIL Open Font License 1.1 |
| `img/mathpulse_final_logo.png`, `mathpulse_logo.png`, `icon-512.png`, `modules_*.png`, `quiz_*.png`, `female-student.png`, `male-student.png` | MathPulse AI repository, `public/` | Project-owned |

Rendering: HyperFrames 0.8.146 (headless Chrome + FFmpeg 9.0.1), GSAP 3.14.2.
