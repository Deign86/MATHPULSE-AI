# Gates: MathPulse AI User Manual

Scope: A print-ready user manual (AGOS-reference style) with mobile screenshots for all three roles, highlight callouts, and the 7-section outline + Appendix A.

- [x] G1: PDF manual exists and contains every outline heading (1–7 + Appendix A)
  CHECK: py -I docs/user-manual/tools/check_pdf.py docs/user-manual/MathPulse-AI-User-Manual.pdf headings
  EXPECT: headings: 8/8
  EVIDENCE: pages: 33 | headings: 8/8

- [x] G2: Mobile screenshots captured for student, teacher, and admin (at least 6 each), all 390x844 viewport at 2x
  CHECK: py -I docs/user-manual/tools/check_pdf.py docs/user-manual/screens shots
  EXPECT: /student=(\d{2}|[6-9]) teacher=(\d{2}|[6-9]) admin=(\d{2}|[6-9]) bad_size=0/
  EVIDENCE: student=16 teacher=9 admin=11 bad_size=0

- [x] G3: Highlight callouts (enlarged feature pop-outs) are used throughout the manual (at least 10)
  CHECK: py -I docs/user-manual/tools/check_pdf.py docs/user-manual/manual.html callouts
  EXPECT: /callouts=(\d{2,})/
  EVIDENCE: callouts=72

- [x] G4: Not text heavy — no page exceeds 260 words
  CHECK: py -I docs/user-manual/tools/check_pdf.py docs/user-manual/MathPulse-AI-User-Manual.pdf density
  EXPECT: over_limit=0
  EVIDENCE: max_words=222 limit=260 over_limit=0

- [x] G5: No account passwords printed in the manual
  CHECK: py -I docs/user-manual/tools/check_pdf.py docs/user-manual/MathPulse-AI-User-Manual.pdf secrets
  EXPECT: secrets=0
  EVIDENCE: secrets=0

- [x] G6: Every screenshot shows a real signed-in screen (no login form, spinner, or error page) — visual review
  EVIDENCE: 36 role screens (s-*/t-*/a-*) reviewed in contact sheets after the loader-wait fix; no "Loading..." frames remain. p-login/p-signup/p-forgot are the public auth screens by design. Personal emails/names blurred (verified on a-users.png, a-classes.png).

- [x] G7: Every PDF page reviewed visually: no overflow, overlapping text, or broken images
  EVIDENCE: All 33 pages rendered and reviewed in MuPDF and PDFium (Chrome/Edge engine); PDFium page whiteness matches the uncompressed Chrome output on all 33 pages after removing the image-rewrite step that broke gradients. build.mjs overflow detector printed no warnings. Fixed: badge covering text (p7), nested-italic badge overlap (p12), Avatar XP target (p14), FAQ tag wrap (p28), cover footer overlap (p1).

- [x] G8: PDF opens cleanly in Chrome/Edge's engine: every page Letter size, no blank pages
  CHECK: py -I docs/user-manual/tools/check_pdf.py docs/user-manual/MathPulse-AI-User-Manual.pdf render
  EXPECT: /pages=33 letter=33 blank=0/
  EVIDENCE: pages=33 letter=33 blank=0
