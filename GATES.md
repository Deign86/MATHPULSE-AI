# Gates: sign-in form on the first screen of landscape phones

Scope: on phones in landscape (heights 360–430px) the sign-in page shows only the hero headline and mascot; the form starts below the fold (baseline on main `322ec51`: Sign In at y=719–761 in a 360–390px viewport, sign-up's first field at y=422–460). On short screens (`short:`, max-height 30rem) hide the mobile mascot block and trim the page padding so the card starts at the top. Portrait phones, tablets and desktop must not change. Measured on a local production build (`VITE_API_URL=/api npm run build`, `vite preview` on 127.0.0.1:4173) with `$SP/measure-login.cjs`, where `SP` is the session scratchpad; the baseline is `$SP/landscape-before.txt`.

- [x] G1: At 844x390, 740x360 and 667x375 the email field, password field and Sign In button are fully on the first screen, with no horizontal overflow
  CHECK: node $SP/measure-login.cjs http://127.0.0.1:4173 > $SP/landscape-after.txt && grep -c "^land.*signInFirstScreen=true .*overflowX=0 " $SP/landscape-after.txt
  EXPECT: 3
  EVIDENCE: 3

- [x] G2: At the same three sizes, the sign-up form's first field is on the first screen
  CHECK: node -e "const lines=require('fs').readFileSync(process.env.SP+'/landscape-after.txt','utf8').split('\n').filter(l=>l.startsWith('land'));console.log(lines.filter(l=>{const [w,h]=l.split(' ')[1].split('x').map(Number);const [t,b]=l.match(/signUpFirstField=(-?\d+)-(-?\d+)/).slice(1).map(Number);return t>=0&&b<=h;}).length)"
  EXPECT: 3
  EVIDENCE: 3

- [x] G3: Portrait phones (320x568, 390x844), tablet (768x1024) and laptop (1280x800) measure exactly as on main
  CHECK: grep -E "^(xs|phone|tab|lap) " $SP/landscape-before.txt > $SP/unchanged-before.txt && grep -E "^(xs|phone|tab|lap) " $SP/landscape-after.txt > $SP/unchanged-after.txt && diff $SP/unchanged-before.txt $SP/unchanged-after.txt && echo UNCHANGED
  EXPECT: UNCHANGED
  EVIDENCE: UNCHANGED

- [x] G4: Frontend unit tests pass, including the LoginPage suites
  CHECK: npx vitest run 2>&1 | grep -E "^\s+Tests "
  EXPECT: /Tests\s+\d+ passed \(\d+\)/
  EVIDENCE: Tests  1019 passed (1019)

- [x] G5: TypeScript compiles
  CHECK: npm run typecheck >/dev/null 2>&1 && echo TYPECHECK_OK
  EXPECT: TYPECHECK_OK
  EVIDENCE: TYPECHECK_OK

- [x] G6: ESLint passes with no warnings
  CHECK: npm run lint -- --max-warnings=0 >/dev/null 2>&1 && echo ESLINT_OK
  EXPECT: ESLINT_OK
  EVIDENCE: ESLINT_OK

- [x] G7: Anti-slop oxlint passes
  CHECK: npm run lint:anti-slop >/dev/null 2>&1 && echo OXLINT_OK
  EXPECT: OXLINT_OK
  EVIDENCE: OXLINT_OK

- [x] G8: Production build succeeds
  CHECK: VITE_API_URL=/api npm run build >/dev/null 2>&1 && echo BUILD_OK
  EXPECT: BUILD_OK
  EVIDENCE: BUILD_OK

- [x] G9: docs/responsive-layout-guide.md describes the sign-in page's landscape behavior as it now is
  EVIDENCE: the "Sign-in (844x390)" row, which still described the capped-card fix that main's mobile redesign replaced, now reads "Sign-in (landscape phones: 844x390, 740x360, 667x375)" with the before (Sign In at y=719–761), the `short:` fix and the after numbers (Sign In ends at y=345; sign-up's first field at y=155–193).
