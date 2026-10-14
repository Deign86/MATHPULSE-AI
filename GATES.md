# Gates: README screenshots of the current live app

Scope: the README screenshots (Sep 6) and login GIF showed the old login page with 1-click demo buttons, which the live deploy no longer has. Recapture all six screenshots and the GIF from mathpulse-ai-2026.web.app, update the README text that described the old login and data, and fix the capture scripts: the screenshot script now opens a Chrome window per role for a manual sign-in (it never handles credentials) and closes the Initial Assessment prompt with Escape (session-only, no Firestore write).

- [x] G1: Six screenshots and the GIF are fresh captures of the current live app with no popup covering the page
  EVIDENCE: 01-login (Welcome Back form, no demo buttons), 02-student-dashboard, 03-modules, 04-ai-chat (no Initial Assessment prompt), 05-teacher-dashboard, 06-admin-dashboard, all 1280x800 captured 2026-10-14 and checked by eye; login-bot-look.gif built from 9 live frames (video sweep 0.046 -> 2.254 s), 627 KB.

- [x] G2: README no longer promises 1-click demo login or lists the retired test accounts
  CHECK: git grep -n -i -e "1-click" -e "QUICK DEMO" -e "teststudent@" -e "testteacher@" -e "testadmin@" -- README.md scripts/capture-readme-screenshots.mjs scripts/capture-login-bot-gif.mjs || echo NO_STALE_LOGIN_TEXT
  EXPECT: NO_STALE_LOGIN_TEXT

- [x] G3: Every local image the README references exists
  CHECK: node -e "const fs=require('fs');const m=[...fs.readFileSync('README.md','utf8').matchAll(/src=.([\w./:-]+)/g)].map(x=>x[1]).filter(p=>!p.startsWith('http')&&!fs.existsSync(p));console.log('MISSING='+m.length+' '+m.join(' '))"
  EXPECT: /MISSING=0\b/
