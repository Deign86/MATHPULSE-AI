# Gates: app shell must not be HTTP-cached for an hour

Scope: firebase.json set no-cache only on `index.html`, but users load `/` and SPA routes (rewritten to index.html), which Firebase served with `Cache-Control: max-age=3600`. After a deploy, returning users kept the previous build for up to an hour (the service worker's network-first navigation fetch also goes through the HTTP cache). Seen live: after deploying b616a1f the teacher tab still ran index-ifuusxlY.js while the server served index-kZivz2w_.js.

- [x] G1: `/` and extensionless SPA routes revalidate; hashed assets stay immutable
  CHECK: npx vitest run src/config/hostingCache.test.ts 2>&1
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: 4 passed (red before: `/` and `**/!(*.*)` had no Cache-Control rule)

- [x] G2: Typecheck and anti-slop lint clean
  CHECK: npx tsc --noEmit 2>&1 && echo TSC_CLEAN
  EXPECT: TSC_CLEAN
  EVIDENCE: TSC_CLEAN; oxlint --quiet no findings on the new test

Post-merge check: `curl -sI` on `/` and `/chat` returns `no-cache, must-revalidate`; `/assets/*.js` keeps `immutable`.
