# GATES — ui-skills install (worktree: MATHPULSE-AI-ui-skills, branch chore/ui-skills-mcp)

- [x] `worktree-isolated` — CHECK: `git worktree list | grep ui-skills` / EXPECT: `MATHPULSE-AI-ui-skills [chore/ui-skills-mcp]`
- [x] `registry-mapped` — CHECK: live `tools/call list_skills` probe / EXPECT: `count: 289`, first skill `ibelick-ui-skills-root`
- [x] `mcp-wired` — CHECK: `grep -r ui-skills.com/mcp .vscode/mcp.json .cursor/mcp.json AGENTS.md` / EXPECT: URL present in all three
- [x] `build-clean` — CHECK: `npx tsc --noEmit && npm run build` / EXPECT: exit 0, no new TS errors

EVIDENCE:
- worktree-isolated: `git worktree add ../MATHPULSE-AI-ui-skills -b chore/ui-skills-mcp` → HEAD 7afe2ee (parent session).
- registry-mapped: POST https://www.ui-skills.com/mcp tools/list → list_skills + get_skill; tools/call list_skills → count 289 (mcp-verify scout + parent MCP probe).
- mcp-wired: `.vscode/mcp.json:5` url `https://www.ui-skills.com/mcp`; `AGENTS.md:302` usage block (grep confirmed both).
- build-clean: `npx tsc --noEmit` exit 0, 0 errors; `npm run build` ✓ built in 22.16s (after `npm ci`, 774 packages).
- demo seam: 4 battle files `framer-motion` → `motion/react` (matches 40+ existing files + QuizBattlePage.tsx:2,4); `grep framer-motion src/components/battle/` empty.
