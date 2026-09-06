# Gates: Login bot left-to-right GIF

Scope: Screen-record login page via chrome-devtools MCP, GIF shows mascot bot following cursor left-to-right, embedded in README.md.

- [x] G1: Dev server running and login page loads
  CHECK: curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/
  EXPECT: 200
  EVIDENCE: 200, login snapshot shows Welcome Back + QUICK DEMO ACCESS via chrome-devtools MCP
- [x] G2: Chrome-devtools MCP screen recording captured (frame sequence left-to-right)
  CHECK: ls tmp/login-bot-frames/*.png | wc -l
  EXPECT: PNG sequence present
  EVIDENCE: 9 frames; video timeline sweep 0.046 -> 0.276 -> 0.575 -> 0.874 -> 1.150 -> 1.426 -> 1.725 -> 2.024 -> 2.254s (monotonic Left->Center->Right); MCP left screenshot (face left) + right screenshot (profile right) confirm head turn
- [x] G3: GIF built from recording showing bot looking left-to-right
  CHECK: ls -lh docs/screenshots/login-bot-look.gif
  EXPECT: GIF exists
  EVIDENCE: docs/screenshots/login-bot-look.gif 800x500, 9 frames, 1.8s, 915KB, gif codec (ffprobe)
- [x] G4: README.md embeds GIF with cursor-follow caption
  CHECK: grep -n login-bot-look.gif README.md
  EXPECT: match found
  EVIDENCE: README.md:77 img docs/screenshots/login-bot-look.gif + cursor-track caption
