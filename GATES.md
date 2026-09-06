# Gates: Mascot Login Video Cursor Tracking Mapping

Scope: Calibrate mascot robot video scrubbing to cursor X position (0.0s Left -> 1.15s Center -> 2.3s Right) based on video understanding analysis.

- [x] G1: Full video understood and timeline boundaries identified
  CHECK: ffmpeg frame extraction and multimodal video analysis
  EXPECT: Left at 0.0s, Center at 1.15s, Right at 2.3s (rest of 9.9s video is hold/idle/return)
  EVIDENCE: Verified across 0.0s-9.93s video timeline and high-rate frame inspection at 2.3s turn peak.

- [x] G2: InteractiveRobotBackground.tsx updated with correct scrub bounds and responsive speed
  CHECK: npm run typecheck
  EXPECT: 0 errors
  EVIDENCE: Passed (tsc --noEmit exited 0, vitest 27 files / 178 tests passed)

- [x] G3: Video asset documentation updated in src/assets/video/README.md
  CHECK: grep SCRUB src/components/login/InteractiveRobotBackground.tsx
  EXPECT: SCRUB_START = 0.0, SCRUB_END = 2.3
  EVIDENCE: Updated to reflect 0.0s-2.3s Left-to-Right timeline scrubbing

