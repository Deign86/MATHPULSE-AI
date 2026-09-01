# MathPulse AI — Mascot Video Assets

This directory contains the optimized production video derivatives for the interactive robot mascot hero on the MathPulse AI login experience.

## Asset Registry

| File Name | Resolution | Codec / Format | GOP / Keyframe | Purpose & Usage |
|---|---|---|---|---|
| `mascot-robot-scrub.mp4` | 1920×1080 (1080p) | H.264 (libx264) | All-Intra (`-g 1`, every frame is I-frame) | **Primary interactive runtime video**. Provides instant sub-millisecond timeline scrubbing driven by horizontal mouse movement. |
| `mascot-robot-hero.mp4` | 1920×1080 (1080p) | H.264 (libx264) | Standard GOP (`+faststart`) | High-efficiency standard web playback derivative. |
| `mascot-robot-hero.webm` | 1920×1080 (1080p) | VP9 | Standard GOP | Modern web format derivative for Chromium/Firefox. |
| `mascot-robot-hero-mobile.mp4` | 1280×720 (720p) | H.264 (libx264) | Standard GOP | Lightweight derivative for touch/mobile devices. |
| `mascot-robot-poster.webp` | 1920×1080 | WebP | Single frame (Quality 90) | Ultra-fast initial paint poster. |
| `mascot-robot-poster.png` | 1920×1080 | PNG | Single frame | Lossless fallback poster. |
| `mascot-robot-source-original.mp4` | 1280×720 | H.264 (Google Source) | Original | Raw unprocessed master source provided for the character animation (`White_robot_turns_head_202608300334.mp4`). |

---

## Archival 8K Master

The 8K UHD archival upscale is stored in:
- `public/assets/masters/mascot-robot-8k-master.mp4` (7680×4320 Lanczos upscale + unsharp filter, CRF 16).
