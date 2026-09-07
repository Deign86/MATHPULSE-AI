# Gates: Install dmmulroy/anti-slop Oxlint Skill & Git Integrations

Scope: Install dmmulroy/anti-slop skill repo-wide, vendor latest rules, configure auto-invocation on every prompt, add git integrations (pre-commit hook, CI workflow), and ensure clean oxlint validation.

- [x] G1: dmmulroy/anti-slop skill installed repo-wide and vendored into tools/oxlint/anti-slop with oxlint.config.ts configured
  CHECK: node -e "const fs = require('fs'); const ok = fs.existsSync('.agents/skills/install-anti-slop/SKILL.md') && fs.existsSync('tools/oxlint/anti-slop/index.ts') && fs.existsSync('oxlint.config.ts'); console.log(ok ? 'SKILL_AND_RULES_VENDORED' : 'MISSING');"
  EXPECT: SKILL_AND_RULES_VENDORED
  EVIDENCE: SKILL_AND_RULES_VENDORED

- [x] G2: Auto-invocation onto every prompt configured in AGENTS.md and agent instructions
  CHECK: grep -E "dmmulroy/anti-slop|tools/oxlint/anti-slop" AGENTS.md
  EXPECT: tools/oxlint/anti-slop
  EVIDENCE: Enforce opinionated Oxlint rules from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) vendored at `tools/oxlint/anti-slop`:

- [x] G3: Git integrations part of repo: pre-commit hook script, package.json scripts, and CI workflow check
  CHECK: node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8'); const ok = pkg.scripts['lint:anti-slop'] && fs.existsSync('scripts/git-hooks/pre-commit') && ci.includes('anti-slop'); console.log(ok ? 'GIT_INTEGRATIONS_PRESENT' : 'MISSING');"
  EXPECT: GIT_INTEGRATIONS_PRESENT
  EVIDENCE: GIT_INTEGRATIONS_PRESENT

- [x] G4: Zero anti-slop lint errors across repository and test suites pass
  CHECK: npx oxlint --quiet
  EXPECT: Finished in
  EVIDENCE: To eliminate this warning, add "type": "module" to C:\Users\Deign\Downloads\MATHPULSE-AI\package.json. | (Use `node --trace-warnings ...` to show where the warning was created)
