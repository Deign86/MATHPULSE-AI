# MathPulse AI — Mascot Video Assets

This directory contains the optimized production video derivatives for the interactive robot mascot hero on the MathPulse AI login experience.

## Asset Registry

| File Name | Resolution | Codec / Format | GOP / Keyframe | Purpose & Usage |
|---|---|---|---|---|
| `mascot-robot-scrub.mp4` | 1920×1080 (1080p) @ 60fps | H.264 (NVENC, RTX 4050) | Short GOP (`-g 15`, keyframe every 0.25s) | **Primary interactive runtime video**. Motion-interpolated 24→60fps (`minterpolate` MCI/AOBMC) from `White_robot_turns_head_1080p_202609061811.mp4`; NVDEC decode + NVENC encode, `+faststart`. Timeline scrubbing driven by horizontal mouse movement (0.0–2.3s Left→Right). |
| `mascot-robot-poster.webp` | 1920×1080 | WebP | Single frame (Quality 90) | Ultra-fast initial paint poster. |
| `mascot-robot-poster.png` | 1920×1080 | PNG | Single frame | Lossless fallback poster. |

The hero/mobile derivatives, the original source clip and the 8K archival master were removed from the repo (unreferenced); recover them from git history if needed.
