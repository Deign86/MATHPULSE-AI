# Gates: shrink the tracked repo

Scope: the tracked tree was 409 MB across 1615 files, too large to add as a Claude project. Most of it is generated or local-only: two copies of the 80 MB Chroma vector store (the HF Space downloads it from Firebase Storage; deploy-backend.yml already excludes it), curriculum PDFs (hosted in Firebase Storage; their Parsed Markdown stays), unreferenced master/hero videos, and agent run leftovers (.omo, .tmp, gates/, audit screenshots, test-results). Vector stores, PDFs and .opencode are untracked but stay on disk; everything else is deleted and stays recoverable from git history.

- [x] G1: No vector store, curriculum PDF or agent-leftover path is tracked
  CHECK: git ls-files datasets/vectorstore backend/datasets/vectorstore .omo .tmp .opencode gates audit_screenshots test-results public/assets/masters "datasets/curriculum/*.pdf" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('TRACKED='+s.split('\n').filter(Boolean).length))"
  EXPECT: TRACKED=0

- [x] G2: Tracked tree is under 60 MB
  CHECK: node -e "const fs=require('fs');const f=require('child_process').execSync('git ls-files -z').toString().split('\0').filter(Boolean);let s=0;for(const p of f){try{s+=fs.statSync(p).size}catch{}}console.log('MB='+Math.round(s/1048576))"
  EXPECT: /MB=([0-5]?\d)\b/

- [x] G3: Local RAG files still on disk after untracking
  CHECK: if exist datasets\vectorstore\chroma.sqlite3 if exist backend\datasets\vectorstore\chroma.sqlite3 echo LOCAL_KEPT
  EXPECT: LOCAL_KEPT

- [x] G4: Frontend production build still succeeds without the removed media
  EVIDENCE: VITE_API_URL=/api npm run build -> "built in 15.45s", check-prod-host PASS, check:no-demo-creds PASS
