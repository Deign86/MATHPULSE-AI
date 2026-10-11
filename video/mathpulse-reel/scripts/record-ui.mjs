// Records short screen captures of the real MathPulse UI for the reel.
// Run from the repo root with the Vite dev server on :5175:  node video/mathpulse-reel/scripts/record-ui.mjs
// Credentials come from .e2e/demo.env (DEMO_<ROLE>_USERNAME / _PASSWORD); nothing is written to the app.
import { chromium } from "playwright";
import { readFileSync, mkdirSync, renameSync, existsSync } from "node:fs";
import path from "node:path";

const BASE = process.env.REEL_BASE_URL || "http://127.0.0.1:5175";
const OUT = path.resolve("video/mathpulse-reel/.capture");
const SIZE = { width: 1600, height: 1000 };
mkdirSync(OUT, { recursive: true });

const creds = Object.fromEntries(
  readFileSync(".e2e/demo.env", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => line.split("=").map((part) => part.trim())),
);

const landings = {
  student: { role: "button", name: "Dashboard" },
  teacher: { role: "heading", name: "Teacher Dashboard" },
  admin: { role: "heading", name: "Admin Dashboard" },
};

async function scrollMain(page, px, steps = 24, pause = 50) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate((dy) => {
      const candidates = [document.scrollingElement, ...document.querySelectorAll("main, [class*=overflow-y-auto], [class*=overflow-auto]")];
      const target = candidates
        .filter((el) => el && el.scrollHeight - el.clientHeight > 40)
        .sort((a, b) => b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight))[0];
      if (target) target.scrollBy({ top: dy, left: 0 });
    }, px / steps);
    await page.waitForTimeout(pause);
  }
}

async function login(context, role) {
  const page = await context.newPage();
  await page.goto(BASE + "/");
  await page.getByLabel("Email Address").first().fill(creds[`DEMO_${role.toUpperCase()}_USERNAME`]);
  await page.getByLabel("Password", { exact: true }).first().fill(creds[`DEMO_${role.toUpperCase()}_PASSWORD`]);
  await page.getByRole("button", { name: "Sign In" }).click();
  const landing = landings[role];
  await page.getByRole(landing.role, { name: landing.name }).first().waitFor({ timeout: 60_000 });
  // Mark the first-use tour as seen (same trick as tests/e2e/auth.setup.e2e.ts) so it does not cover the UI.
  await page.evaluate(async (scope) => {
    const uid = await new Promise((resolve) => {
      const open = indexedDB.open("firebaseLocalStorageDb");
      open.onerror = () => resolve("");
      open.onsuccess = () => {
        const read = open.result.transaction("firebaseLocalStorage").objectStore("firebaseLocalStorage").getAll();
        read.onerror = () => resolve("");
        read.onsuccess = () => resolve(read.result.find((entry) => entry?.value?.uid)?.value.uid ?? "");
      };
    });
    if (uid) localStorage.setItem(`mathpulse:${scope}-tour:v1:${uid}`, "seen");
  }, role);
  await page.close();
}

// The demo accounts have not taken the diagnostic, so an "Initial Assessment" welcome (and a Daily
// Rewards modal) pops over every page a few seconds after load. Close it with Escape / its close
// button only; "Skip for now" would persist a flag on the account.
function dismissModals(page) {
  let active = true;
  (async () => {
    while (active) {
      try {
        const dialog = page.getByRole("dialog").first();
        if ((await dialog.count()) && (await dialog.isVisible())) {
          // Only an explicit close control; never a fallback click that could start an assessment.
          const close = dialog.locator('button[aria-label="Close"], button[aria-label="Close dialog"]').first();
          if (await close.count()) await close.click({ timeout: 1000 }).catch(() => {});
          else await page.keyboard.press("Escape");
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 300));
    }
  })();
  return () => { active = false; };
}

const ONLY = (process.env.REEL_ONLY || "").split(",").filter(Boolean);
async function capture(context, name, run) {
  if (ONLY.length && !ONLY.includes(name)) return;
  const page = await context.newPage();
  const stop = dismissModals(page);
  try {
    await run(page);
  } catch (err) {
    console.log(`  ! ${name}: ${err.message.split("\n")[0]}`);
  }
  stop();
  const video = page.video();
  await page.close();
  const from = await video.path();
  const to = path.join(OUT, `${name}.webm`);
  if (existsSync(to)) renameSync(to, to + ".old");
  renameSync(from, to);
  console.log(`  ✓ ${name}`);
}

async function openTab(page, label) {
  await page.goto(BASE + "/");
  await page.waitForTimeout(1500);
  const item = page.getByRole("button", { name: label }).first();
  if (await item.count()) await item.click();
  else await page.getByText(label, { exact: true }).first().click();
  await page.waitForTimeout(2500);
}

const browser = await chromium.launch({ headless: true });
const flows = {
  student: async (context) => {
    await capture(context, "student-dashboard", async (page) => {
      await page.goto(BASE + "/");
      await page.waitForTimeout(2500);
      await scrollMain(page, 700);
      await page.waitForTimeout(800);
      await scrollMain(page, -700);
      await page.waitForTimeout(800);
    });
    await capture(context, "student-chat", async (page) => {
      await page.goto(BASE + "/chat");
      await page.waitForTimeout(2500);
      await page.getByRole("button", { name: "Start New Chat" }).first().click();
      await page.waitForTimeout(1500);
      const box = page.getByPlaceholder("Ask me anything about math...");
      await box.click();
      await box.pressSequentially("How do I find the domain of f(x) = sqrt(x - 3)?", { delay: 45 });
      await page.waitForTimeout(400);
      await box.press("Enter");
      await page.waitForTimeout(32_000);
      await scrollMain(page, 600, 20, 60);
      await page.waitForTimeout(1500);
    });
    await capture(context, "student-modules", async (page) => {
      await page.goto(BASE + "/modules");
      await page.waitForTimeout(2500);
      await scrollMain(page, 500);
      await page.waitForTimeout(600);
      const open = page.getByText("Business and Finance").first();
      if (await open.count()) {
        await open.click();
        await page.waitForTimeout(3500);
        await scrollMain(page, 500);
        await page.waitForTimeout(800);
      }
    });
    for (const [name, route] of [["student-assessment", "/assessment"], ["student-battle", "/battle"], ["student-rewards", "/rewards"], ["student-leaderboard", "/leaderboard"], ["student-avatar", "/avatar"], ["student-grades", "/grades"]]) {
      await capture(context, name, async (page) => {
        await page.goto(BASE + route);
        await page.waitForTimeout(3000);
        await scrollMain(page, 600);
        await page.waitForTimeout(800);
        await scrollMain(page, -600);
        await page.waitForTimeout(600);
      });
    }
  },
  teacher: async (context) => {
    await capture(context, "teacher-dashboard", async (page) => {
      await page.goto(BASE + "/");
      await page.waitForTimeout(3000);
      await scrollMain(page, 800, 30, 60);
      await page.waitForTimeout(800);
      await scrollMain(page, -800, 30, 60);
      await page.waitForTimeout(600);
    });
    for (const label of ["My Classes", "Topic Mastery", "Competency Matrix", "AI Quiz Maker", "Question Bank", "Data Import"]) {
      await capture(context, `teacher-${label.toLowerCase().replace(/\s+/g, "-")}`, async (page) => {
        await openTab(page, label);
        await scrollMain(page, 700, 26, 60);
        await page.waitForTimeout(800);
        await scrollMain(page, -700, 26, 60);
        await page.waitForTimeout(500);
      });
    }
  },
  admin: async (context) => {
    await capture(context, "admin-dashboard", async (page) => {
      await page.goto(BASE + "/");
      await page.waitForTimeout(3000);
      await scrollMain(page, 800, 30, 60);
      await page.waitForTimeout(800);
      await scrollMain(page, -800, 30, 60);
      await page.waitForTimeout(600);
    });
    for (const label of ["User Management", "RAG Manager", "Analytics", "Class Management", "Curriculum Control", "Audit Log"]) {
      await capture(context, `admin-${label.toLowerCase().replace(/\s+/g, "-")}`, async (page) => {
        await openTab(page, label);
        await scrollMain(page, 700, 26, 60);
        await page.waitForTimeout(800);
        await scrollMain(page, -700, 26, 60);
        await page.waitForTimeout(500);
      });
    }
  },
};

const only = process.argv.slice(2);
for (const role of Object.keys(flows)) {
  if (only.length && !only.includes(role)) continue;
  console.log(`== ${role}`);
  const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: SIZE } });
  try {
    await login(context, role);
    await flows[role](context);
  } catch (err) {
    console.log(`  ! ${role} login/flow failed: ${err.message.split("\n")[0]}`);
  }
  await context.close();
}
await browser.close();
console.log("done");
