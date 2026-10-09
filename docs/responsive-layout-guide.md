# Responsive layout guide

How MathPulse AI adapts to screen size and input type, the rules pages follow, how layouts are measured, and what the 2026-10-08 pass found and fixed. For anyone changing page layouts.

## Target sizes

Every page is checked at 320x568 (small phone), 390x844 (phone), 844x390 (phone in landscape), 768x1024 and 1024x768 (tablet), 1280x800 (small laptop), 1440x900 and 1920x1080. Sizes up to 1024 are also checked with touch emulation.

## Breakpoints and variants

| Variant | Meaning | Use it for |
|---|---|---|
| `xs:` | width ≥ 30rem (480px) | Large phones in landscape and small tablets. Defined in `src/styles/globals.css` (`--breakpoint-xs`). Before 2026-10-08 it was undefined, so every `xs:` class generated nothing. Phones under 480px render as before. |
| `sm:` `md:` `lg:` `xl:` `2xl:` | 640 / 768 / 1024 / 1280 / 1536px | Tailwind defaults. `lg` is where the desktop sidebar appears and the bottom navigation goes away. |
| `short:` | height ≤ 30rem (480px) | Phones in landscape (360–430px tall). Pinned bars become `short:static`, headers tighten (`short:py-*`), secondary header lines hide (`short:hidden`), charts and stages shrink. Defined in `globals.css`. |
| `@container` + `@xl:` `@2xl:` `@4xl:` `@5xl:` … | width of the nearest query container | Grids whose column count depends on the space actually left for content (see below). |
| `pointer-coarse:` | touch screens | Touch-only target sizes and invisible hit areas, so mouse layouts are unchanged (see Touch targets). |
| `3xl:` | not defined | Still generates nothing. Existing `3xl:max-w-[1920px]` classes have no effect up to 1920px and were left alone. |

Order in the generated CSS (verified): `xs` comes before `sm`; `@container`, `pointer-coarse` and `short` rules come after all width breakpoints, so they win when both match. A Modules-only arbitrary query, `[@media(max-height:44rem)]:static`, unpins its 200px filter bar on screens up to 704px tall.

## Query containers

Each role's scrolling `<main>` is a query container: student (`src/App.tsx`), teacher (`src/components/TeacherDashboard.tsx`) and admin (`src/components/AdminDashboard.tsx`). The desktop sidebar is 280px open and 80px collapsed, so the same viewport can leave very different widths for content. At 1024px with the sidebar open, content is about 700px, narrower than a 768px tablet. Viewport breakpoints therefore made 4-up KPI rows cramped at exactly 1024.

Container sizes in use:

- `@4xl:grid-cols-4` (content ≥ 56rem / 896px): 4-up KPI and stat rows.
- `@5xl:grid-cols-3` / `@5xl:grid-cols-2` (≥ 64rem / 1024px): module card grids and the side-by-side card pairs on Grades.
- `@2xl:` / `@4xl:` (≥ 42rem / 56rem): the Grades diagnostic pods (1 → 2 → 3 columns).
- Card-level containers where a card sits beside another card: the admin engagement chart header (`@xl:flex-row`), the Grades exam-readiness milestones (`@2xl:grid-cols-2`), the AI Chat topic cards (`@lg:grid-cols-4`), Settings daily XP goals (`@md:grid-cols-4`).

`container-type: inline-size` does not make the container the containing block of `position: fixed` descendants, and `position: sticky` keeps working inside it. Both were verified in Edge before rollout.

## Shell rules

- **Bottom navigation (below `lg`).** Student: 69px on phones and 73px on the tablet layout, plus the home-indicator inset; teacher and admin bars are similar. Pages that scroll the shell's `<main>` get `pb-28 sm:pb-32` from it. Pages that scroll inside their own container (AI Chat, Modules, module detail, Avatar Studio) must clear the bar themselves: for AI Chat the shell's `<main>` reserves the bar (`pb-[4.5rem] lg:pb-0`, from main) and the composer adds the home-indicator inset; module lists use `pb-28 sm:pb-32 lg:pb-28`.
- **Floating AI tutor (`lg` and up).** A 64px button at `bottom-8 right-8`. Scrolling pages end with `lg:pb-28`, so the last row can move above it.
- **No `backdrop-filter` on elements with `fixed` children.** A backdrop filter makes the element the containing block of its fixed descendants. The navs' tap-outside overlays (`fixed inset-0`) covered only the 64–73px bar, so a tap meant to close a menu reached the page underneath. All three bottom navs now blur through a `::before` layer instead.
- **Dialogs.** The shared `DialogContent` (`src/components/ui/dialog.tsx`) caps itself at `100dvh - 2rem` and scrolls. Do not pass `overflow-hidden` to it, or it clips again. Custom modals use `max-h-[calc(100dvh-2rem)] overflow-y-auto`, or a flex column with a scrolling body between a fixed header and footer.
- **Vertical centring inside scroll containers.** Use `justify-center-safe` / `items-center-safe`. Plain `justify-center` pushed tall content above the scroll start, where it could not be reached (Assessment questions and Quiz Battle results on short screens).
- **Safe areas.** Shells use `pl-safe pr-safe` (plain classes in `globals.css`, for landscape notches). Fixed footers and sheets use `pb-[max(<padding>,env(safe-area-inset-bottom))]`.
- **No `min-h-screen` / `min-h-[calc(100vh-…)]` inside the scrolling `<main>`.** It forced empty scrolling and, in a flex column, replaced the automatic minimum size.
- **Decorative layers stay clipped.** Background art bigger than the shell (the student shell's glow orbs) sits in its own `absolute inset-0 overflow-hidden` layer. Otherwise the shell's clipped content column grows wider than a phone, and anything that scrolls an element into view (`scrollIntoView`, `focus()`, browser test tools) shifts the whole app sideways.
- **Header titles wrap** (`line-clamp-2`) instead of truncating on 320px phones.
- **Sticky bars** keep `data-tour-sticky=""` (the guided tours read their live position). Bars taller than about 100px become static on short screens.

## Touch targets

On coarse pointers, segmented controls (tabs, filter pills, range buttons), pagers, switches, checkboxes, toggles and icon actions measure at least 44px. Mouse layouts do not change.

- **Grow the control** with `pointer-coarse:min-h-11` / `pointer-coarse:min-w-11` (or `h-11` / `w-11`) inside horizontally scrolling rows, which clip anything outside them, and where an invisible hit area would reach a neighbour.
- **Otherwise add an invisible hit area**: `relative pointer-coarse:after:absolute pointer-coarse:after:-inset-N`. The `::after` box is measured from the padding box, so a 1px border costs 2px: a 36px bordered icon needs `-inset-1.5` (34 + 12 = 46px), a 16px checkbox needs `-inset-4`. A hit area with only vertical insets also needs `after:inset-x-0`, or it is 0px wide.
- **`overflow-hidden` clips hit areas.** Avatar and profile triggers that clip their image grow instead (`pointer-coarse:w-11 pointer-coarse:h-11`).
- **Neighbouring hit areas share the gap.** The later element in the DOM wins where two overlap, so 36px header icons need an 8px gap to reach 44px each (`pointer-coarse:gap-2` on the header icon groups).
- **No hover-only controls on touch.** Buttons shown only on hover are invisible but still tappable on touch screens. AI Chat's copy-message and delete-conversation buttons are now always visible on coarse pointers (`pointer-coarse:opacity-100`). Delete has no confirmation, so its hit area stays inside the card's empty 40px right padding.
- **Dialog close buttons** get `shrink-0` (a long title in the same flex row squeezed two of them to 20px wide) and a touch hit area. They must sit above the header content: give them a higher `z-index` than any positioned header block, and reserve room for them (`pr-10`) where the title runs beside them.
- **Not covered:** ordinary text buttons, links and form fields (30–40px; all ≥ 24px, the WCAG 2.2 AA minimum), dev-only buttons, and the sign-in form, which stays compact so it fits short screens. Its password toggle measures 46x38, bounded by its 30px field.

## Measuring layouts

The audit runs in the real, signed-in app, inside a same-origin frame sized to each test viewport. Media queries, container queries, ResizeObservers and JS breakpoints react exactly as on a device of that size. The files are dev only and never bundled: `tests/browser/layout-audit.html` (host), `layout-audit-frame.html` (app frame), `layout-audit.js` (measurements) and `layout-audit-guides.js` (guided-tour walks).

1. Start the dev server (`npm run dev`) and sign in on that origin (`localhost:5174` student, `teacher.localhost:5174` teacher, `127.0.0.1:5174` admin).
2. Open `/tests/browser/layout-audit.html` on the same origin.
3. In the console, run `__runPlan([...])`, for example `__runPlan([{ label: 'Grades', load: '/grades' }, { label: 'Users', nav: 'User Management' }])`. Step keys: `load` (student route), `nav` (`data-tour-nav` id, clicked at desktop size), `menu` (profile menu item), `click` (selector). An optional second argument limits the sizes, for example `[['phone', 390, 844]]`.
4. Read results with `__sum(label)`. Raw rows are in `window.__results` and `localStorage` (`audit:<label>`).

What it reports per size:

- `overflowX`: horizontal page overflow.
- `docScrollY`: document-level scroll, meaning something outgrew the `h-dvh` shell.
- `clipped`: text or controls partly outside a box that clips without scrolling.
- `truncated`: ellipsis or line-clamp hiding text (`__sum` leaves out intentional line clamps).
- `overlaps` / `unreachable`: controls covered by other elements, or by pinned bars at the end of scrolling. Inner lists are checked with their outer scrollers at the end too.
- `freeHeight`: usable height between the top of `<main>` (or a pinned top bar) and the bottom bar, scrolled half-way.
- `grids`: cramped or over-stretched columns.
- `taps`: controls under 44px or 24px. On-screen controls are probed 21px either side of their centre, so invisible hit areas count.
- `dialogs`: whether open dialogs fit or scroll.

Touch: turn on touch emulation (Chrome/Edge DevTools device mode, or the Claude browser pane's mobile viewport) so `pointer-coarse:` styles apply, then run `await __touchSweep()` on a loaded page. It scrolls the page and lists every control whose best hit box is under 44px.

Guided tours: `__guideRun([[390, 844], [1440, 900]], ['Dashboard', 'Modules'])` walks the named page guides from Settings for students; pass `'role'` as the third argument for teacher and admin. Progress and results are in `window.__guideState` and `localStorage` (`tour:<W>x<H>:<label>`). Flags per step match `tests/browser/student-tour-smoke.mjs`: card-offscreen, small-button, NO-SPOTLIGHT, HEADER-SHIFTED, order, and OVERLAP only when the card had room beside the highlight. `text-scrolls` (only the explanation scrolls) is how short screens are meant to work.

Sign-in page: `node tests/browser/layout-audit-login.mjs [outDir]` audits it headless at all eight sizes, with touch up to 1024px. Screenshots and `report.json` go to `.tmp/layout-audit-login` by default.

Caveats:

- Vite reloads every open page when any non-ignored file changes (Tailwind scans the repo), and when a module the page imported changes. Don't edit files while a run is in progress; results already saved to `localStorage` survive.
- A hidden Browser pane paints no frames. The frame page drives animation frames from a message loop, so measurements keep working while hidden; readings taken while no frame was painted are marked `PAUSED` (`*` in `__sum`).
- Don't add Quiz Battle (`/battle`) to a plan or guide run on a real account: opening it resumes, and can start, an unfinished match.
- Avatar Studio layers are 512px images with transparent margins. Their clipped edges show up under `clipped` but nothing visible is cut.
- `scrollIntoView` also scrolls `overflow: hidden` shells, which shifts the app header off screen. Scroll the scroller itself (`scrollTo`) when probing.

## Findings and fixes (2026-10-08)

Before and after numbers come from the same harness version unless noted. Usable height at 844x390 was measured with the pinned bars in their scrolled state.

| Area | Measured before | Fix | After |
|---|---|---|---|
| `xs:` breakpoint (all roles) | `--breakpoint-xs` undefined: every `xs:` class generated no CSS | Defined `--breakpoint-xs: 30rem`; moved the Grades tile header switch from `xs:` to `sm:` (the newly active rule clipped "NEEDS BOOST" at 540px) | `xs:` rules present in the build |
| Student shell (phones) | Two decorative glow orbs, one pushed 125px past the right edge, made the clipped content column 500px wide on a 375px phone; scrolling an element into view shifted the app 70px sideways | Orbs moved into their own clipping layer | Shell exactly as wide as the screen |
| Bottom navs (student, teacher, admin) | Tap-outside overlay only 64–73px tall (backdrop-filter containing block) | Blur moved to a `::before` layer | Overlay covers the viewport |
| Shared dialog | `DialogContent` could exceed short viewports | `max-h-[calc(100dvh-2rem)] overflow-y-auto`; close button hit area on touch | Dialogs fit or scroll |
| Admin, all 11 pages at 844x390 | Usable height: Users 168px, RAG 110, Content 184, Settings 148–158 | `short:static` on sticky toolbars and tabs, tighter header, subtitle hidden on short screens | 267–269px on every page |
| Admin KPIs and stat rows | 4-up at 1024 with the sidebar open (cramped); KPI labels truncated | `@4xl:grid-cols-4` on `<main>` width; labels wrap (`line-clamp-2`) | 2-up until content is 896px wide |
| Admin header (320px) | Page titles truncated | `text-base min-[360px]:text-lg`, `line-clamp-2` | Titles wrap to 2 lines |
| Admin Overview | Engagement chart header and side cards followed viewport breakpoints, not the space beside the sidebar | Card-level `@container` (`@xl:flex-row`); side cards 2-up from `md` | No clipped controls at 768–1440 |
| Admin Analytics | Section tabs in a horizontal scroller; tabs past the edge hidden on phones | 3-column tab grid below `xl` with short labels | All tabs visible |
| Student Modules (320x568) | 117px usable (200px sticky filter bar) | Filter bar static up to 44rem tall; filter row wraps; selects capped at 11rem | 499px |
| Student Rewards (320x568) | 199–220px usable; 4 truncated labels | Sticky bar static up to 44rem tall; metric values wrap (`text-xl sm:text-2xl`) | 499px; 0 truncations |
| Student Dashboard (1280–1440) | Right sidebar cards truncated, leaderboard podium clipped | `xl:col-span-8 2xl:col-span-9` / `xl:col-span-4 2xl:col-span-3` | No truncation or clipping |
| Student Grades | 6 truncated labels at 320 (readiness, standings) | Titles wrap; diagnostic pods `@2xl`/`@4xl`; card pairs `@5xl` | 0 truncations at 320–1920 |
| Student Leaderboard (320) | Names about 19px wide | Avatar hidden below 360px, tighter gaps | Names 79–81px |
| Student Leaderboard (1024) | Standings list off screen (side-by-side layout at `lg`) | Split layout from `xl` | Standings reachable |
| Student Leaderboard rank card (320–390) | "Only N XP needed to overtake …" cut to about half | Wraps to 2 lines (`line-clamp-2`) | Full message visible |
| Avatar Studio (844x390) | Item grid 32px tall, stage overlapping the wardrobe | `short:` stage minimum 160px, wardrobe minimum height, outer area scrolls | Items area 141px, no overlap |
| AI Chat (phones) | Message input behind the bottom nav | Fixed on main in the same week (`pb-[4.5rem]` on the shell below `lg`); this branch's own padding was dropped in the merge so the gap is not doubled | Input clear of the nav |
| Assessment (320–844) | Results dialog cut off at 844x390; tall questions and the results overlay centred above the scroll start; score row clipped | `justify-center-safe` / `items-center-safe`, footer safe-area padding, title wraps | Dialog fits or scrolls; nothing clipped |
| Settings (320) | Daily XP goal buttons 4-up and cramped | 2-up below `@md` | 2-up |
| Sign-in (844x390) | Page and card both scrolled (double scroll) | Card height capped to the viewport minus its padding (`max-h-[calc(100dvh-…)]`) | Only the card scrolls |
| Dialog close buttons (student, admin) | 21–36px on touch. The Grades graph and diagnostic modals squeezed theirs to 20–23px wide behind long titles. The leaderboard profile modal's header content covered half of its close button | `shrink-0` and touch hit areas; the profile modal's close button sits above the header (`z-20`), and the row layout reserves room for it | Every dialog close button checked is ≥ 44px on touch and fully tappable |
| Touch targets (student, admin) | Header icons 33–40px, level/XP chips 26px, segmented tabs and pills 24–34px, switches 32x18, checkboxes 16px, several icon actions 20–38px, hover-only chat actions invisible | `pointer-coarse:` sizes and hit areas (Touch targets) | Every control in scope ≥ 44px in a touch sweep at 390x844 and 768x1024 |
| Teacher pages (all) | Same patterns as admin (KPI rows, master/detail splits at `lg`, dialogs, touch targets) | `@container` grids, splits from `xl`, dialog height caps, touch sizes | Measured in the real app; the rows below were found there |
| Teacher header (320–390) | Greeting and page subtitle cut to 80px ("Welcome b…") | Subtitle wraps to 2 lines (`line-clamp-2`) | Full greeting visible |
| Teacher KPI cards (all teacher pages) | Labels truncated at 320; single long words ("COMPLETION", "UNAVAILABLE") cut even at 1280 when a badge shared the row | Card header wraps the badge below the label when space is short (`flex-wrap`, label `flex-auto`, `line-clamp-2`) | No KPI label truncated at 320–1920 |
| Teacher dashboard class list (320–390) | Class names cut to 93–114px; school label capped at 90px | Names wrap to 2 lines; cap removed | Names readable |
| Teacher calendar (phones, 768x1024) | Month card and day agenda ended behind the bottom nav: the card overflowed a height-capped row, so the page's 128px bottom padding never applied | Row capped only from `xl` (side-by-side layout) | Last agenda row clears the nav |
| Topic Mastery (768–1023) | Class picker, search and two filters on one row crushed the search field to 15px | Row layout switches on the content width (`@4xl:flex-row`) instead of `md` | Search full width until the row has room |
| Competency (844x390) | Sticky table header left 221px usable | Header static on short screens | 269px |
| Teacher dialogs | Add Students close button 26px on touch; the shared confirmation dialog's close button (logout, remove student, discard changes; also used by students and admins) 32px | Touch hit areas | 46px and 48px; AI insight, delete-class confirmation, New Class, Add Students, Add Event, logout and the schedule drawer fit or scroll at 844x390 and 320x568 |
| Teacher touch targets | Class picker 16px tall (padding was on its wrapper); search fields 16–20px (only the text line was tappable); filter pills, tabs and the question stepper 24–42px; class delete icon 28px; "View all", import actions, topic checkboxes and the exclude toggle under 24px; the schedule drawer's month arrows, calendar toggle, Profile button and tabs 24–30px; Settings section tabs 40px on phones | Padding moved onto the select; search pills are `<label>`s that focus their field (44px on touch); `pointer-coarse:` sizes and hit areas elsewhere | Every teacher control in scope ≥ 44px in a touch sweep at 390x844 and 768x1024 (schedule drawer and Settings also at 320x568) |

## Verification record (2026-10-08)

- Student and admin: every page measured in the real app at all eight sizes before and after the fixes, plus touch sweeps at 390x844 and 768x1024.
- Dialogs at 844x390 and 320x568: student rewards summary, AI diagnostic summary, subject-grades graph, leaderboard student profile and curriculum sources; admin Add User, AI feature directory, audit event details and curriculum help. Each fits or scrolls, with its first and last buttons reachable; close buttons were measured with touch on.
- Sign-in page: headless at all eight sizes with touch (`layout-audit-login.mjs`).
- Guided tours: every student and admin page guide walked in the real app at 390x844 (touch), 844x390, 1024x768 and 1440x900. There were no defects; `text-scrolls` shows only on short screens, by design. Also covered: the student first-use guide at 731x698, and the fixture smoke test (`node tests/browser/student-tour-smoke.mjs`) at eight sizes.
- Teacher (seeded teacher account, signed in by the user): Dashboard, My Classes, Calendar, Topic Mastery (both tabs), Competency, Quiz Maker, Question Bank, Data Import, Profile and Settings measured at all eight sizes after the fixes, plus touch sweeps at 390x844 and 768x1024. Dialogs as listed in the findings. All 11 teacher page guides walked at 390x844 (touch), 844x390, 1024x768 and 1440x900: no card off screen, no small button, no shifted header and no covered highlight. Two runs at 390x844 showed steps without a highlight, neither caused by layout: Topic Mastery had been left on its Module Availability tab, which unmounts the parts the guide explains (fixed on the onboarding branch: the guide now opens the Mastery Matrix tab), and Competency's student data took longer than the guide's 12-second wait, so the card appeared before its highlight (guides now wait for loading screens, up to 20 s; see `docs/student-onboarding-guide.md`).
- Teacher pages not measured: the Intervention Center, because opening it sends AI requests for the selected student, and the Notifications page, which has no entry point except its page guide (checked through the guide walks above).
- Quiz Battle was not re-measured after the fixes. Opening it on a real account resumes matches, so the hub and setup were checked only through the page guide, which opens it in preview without resuming.
