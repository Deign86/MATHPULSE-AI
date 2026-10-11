# Motion notes — Lasseter's principles applied to the MathPulse reel

Source read: John Lasseter, "Principles of Traditional Animation Applied to 3D Computer Animation" (SIGGRAPH 1987), via the SIGGRAPH HyperGraph summary of the paper's eleven principles plus the Disney twelve (Thomas & Johnston) as background. The paper's own text is only available as a scanned PDF; the principle list and definitions below are from the HyperGraph page of the paper.

Tempo grid: 160 BPM, beat 0.375 s, bar 1.5 s. Every cut and every hit lands on the grid (kinetic-beat-slam contract: one beat array, not scattered offsets).

| Principle (Lasseter) | Where it shows up in `index.html` |
| --- | --- |
| Squash and stretch — rigidity and mass come from shape distortion; volume stays constant | Logo mark lands with `scaleX 1.18 / scaleY 0.84` then recovers; mascot head bobs with a 0.94/1.06 squash on the beat. Volume preserved: when Y shrinks, X grows. |
| Timing — spacing of in-betweens defines weight | Heavy things (logo, impact cards) take 0.55–0.7 s with `expo.out` / `power4.out`; light things (chips, pills, hats) take 0.25–0.35 s. Nothing is linear. |
| Anticipation — prepare the audience for the action | The logo pulls back (`scale 0.92`, 0.18 s) before it slams in. The battle "VS" badge winds up with a counter-rotation before it spins forward. Cursor hovers for 0.15 s before each click. |
| Staging — present one idea so it is unmistakably clear | One hero element per scene, centered or on a thirds line, everything else dimmed to ≤ 0.6 opacity. Scene colour changes with the product area so the cut itself reads as a new idea. |
| Follow through and overlapping action — termination of an action, parts move at different rates | Mascot horns and headphone cups lag the head by 0.06–0.1 s and overshoot (`back.out(2.2)`). Card stacks arrive with 0.06 s stagger (capped so the group reads as one beat). Text lands 0.08 s after the card it sits on. |
| Straight-ahead vs pose-to-pose | Everything is pose-to-pose: key poses at beat boundaries, GSAP fills the in-betweens. Fills on bars 5/9/13… are the only "straight-ahead" flourishes (drum fills drive extra micro-hits). |
| Slow in and slow out — more frames near the extremes | All entrances use out-eases (fast start, soft landing); all exits use `power2.in` (soft start, fast leave). No `linear` on moving elements except the metronome ticks. |
| Arcs — natural movement follows arcs | The learning-path nodes travel along an SVG arc, the Quiz Battle bolt swings on a rotation pivot, the mascot "hop" uses a parabolic y + rotation pair instead of a straight translate. |
| Secondary action — resulting action that supports the main one | Sparks on XP gain, ripple on cursor click, pulse line that keeps beating under the logo. All kept quieter (lower opacity, smaller) than the primary action. |
| Exaggeration — accentuate the essence | Overshoots of 6–10 % on heavy landings, 150-px slams on headline type, scores racing past realistic values in the battle. |
| Appeal — design the audience enjoys watching | The product's own mascot and palette (amethyst `#9956DE`, summer sky `#1FA7E1`, texas rose `#FFB356`, pastel green `#75D06A`), Nunito at heavy weights, generous radii matching the app's `--radius: 1.25rem`. |
| Personality — the goal all principles serve | The mascot reacts (blink, bob, grin) to what the scene says; the reel feels like the app: fast, friendly, exact. |

Hard rules carried over from the HyperFrames animation contract: one paused timeline, `fromTo` only, transforms/opacity only (no width/height/top/left tweens), no CSS transitions on animated nodes, no `Math.random()` / `Date.now()`.
