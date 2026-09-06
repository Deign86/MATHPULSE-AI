# MathPulse AI — Mascot Video Assets

This directory contains the optimized production video derivatives for the interactive robot mascot hero on the MathPulse AI login experience.

## Asset Registry

| File Name | Resolution | Codec / Format | GOP / Keyframe | Purpose & Usage |
|---|---|---|---|---|
| `mascot-robot-scrub.mp4` | 1920×1080 (1080p) @ 60fps | H.264 (NVENC, RTX 4050) | Short GOP (`-g 15`, keyframe every 0.25s) | **Primary interactive runtime video**. Motion-interpolated 24→60fps (`minterpolate` MCI/AOBMC) from `White_robot_turns_head_1080p_202609061811.mp4`; NVDEC decode + NVENC encode, `+faststart`. Timeline scrubbing driven by horizontal mouse movement (0.0–2.3s Left→Right). |
| `mascot-robot-hero.mp4` | 1920×1080 (1080p) @ 60fps | H.264 (NVENC, RTX 4050) | Standard GOP (`-g 120`, `+faststart`) | High-efficiency standard web playback derivative, transcoded from the 60fps scrub master. |
| `mascot-robot-hero.webm` | 1920×1080 (1080p) @ 60fps | VP9 (QuickSync, Intel UHD) | Standard GOP | Modern web format derivative for Chromium/Firefox, transcoded from the 60fps scrub master. |
| `mascot-robot-hero-mobile.mp4` | 1280×720 (720p) @ 60fps | H.264 (NVENC, RTX 4050) | Standard GOP | Lightweight derivative for touch/mobile devices, downscaled from the 60fps scrub master. |
| `mascot-robot-poster.webp` | 1920×1080 | WebP | Single frame (Quality 90) | Ultra-fast initial paint poster. |
| `mascot-robot-poster.png` | 1920×1080 | PNG | Single frame | Lossless fallback poster. |
| `mascot-robot-source-original.mp4` | 1280×720 | H.264 (Google Source) | Original | Raw unprocessed master source provided for the character animation (`White_robot_turns_head_202608300334.mp4`). |

---

## Archival 8K Master

The 8K UHD archival upscale is stored in:
- `public/assets/masters/mascot-robot-8k-master.mp4` (7680×4320 Lanczos upscale + unsharp filter, CRF 16).
