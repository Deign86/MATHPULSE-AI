# MathPulse AI: Frontend Generation Prompt (v2)

**Instructions for the AI Coding Agent:**
Act as an expert Frontend Developer specializing in React and Tailwind CSS. Your task is to build a pixel-perfect, responsive UI based on the attached image. Read the comprehensive architectural and stylistic requirements below before generating the code.

---

## 1. Core Architecture & Layout Rules (CRITICAL)
The application must feel like a native, gamified application, not a standard scrolling webpage.
*   **Viewport:** The app container must take up the full screen height (`h-screen` / `100vh`) and width (`w-full`), utilizing a Flexbox column layout (`flex-col`).
*   **Scroll Behavior:** The page itself **must not scroll**. 
*   **Sticky Header:** The Top Header must be fixed/sticky at the top.
*   **Sticky Stats Bar:** The Navigation & Stats Bar sits directly below the header and must also remain fixed/sticky at the top.
*   **Sticky Footer:** The Bottom Footer must be fixed/sticky at the bottom.
*   **Scrollable Content:** The Middle Content Area (containing the question and answers) sits between the sticky top components and the sticky footer. It MUST have `overflow-y-auto` and `flex-1` so the user can scroll through the content while the header, stats bar, and footer remain frozen in place.

## 2. Design System & Theming
*   **Style:** Modern, soft UI (neumorphism inspired) with heavily rounded corners (`rounded-2xl`, `rounded-full`) and soft drop shadows (`shadow-md`, `shadow-lg`).
*   **Color Palette:**
    *   **Header/Footer Backgrounds:** Vibrant Purple to Light Violet linear gradients (e.g., `bg-gradient-to-r from-purple-600 to-indigo-400`). Both have subtle, semi-transparent geometric patterns (dots and abstract shapes) layered on top.
    *   **Main Canvas Background:** Light Off-White/Cool Gray (e.g., `bg-slate-50` or `bg-gray-100`).
    *   **Cards/Buttons:** Solid White (`bg-white`) with soft shadows.
    *   **Accents:** 
        *   Red for Hearts (`text-red-500`).
        *   Gold/Yellow for Keys (`text-yellow-400`).
        *   Orange for Fire streaks (`text-orange-500`).
        *   Green for Points (`bg-green-200 text-green-800`).

---

## 3. Component Breakdown

### A. Top Header Section
*   **Shape:** The bottom left and right edges should have a slight downward curve or heavy border-radius.
*   **Left Side:** Empty (No components here).
*   **Center (Title Badge):**
    *   Dark purple semi-transparent pill (`bg-purple-900/40`, `backdrop-blur`).
    *   Contains a small gold decorative dot on the left.
    *   Stacked text: Top text is "TRY IT YOURSELF" (small, uppercase, tracking-wide, light purple). Bottom text is "LESSON 1" (large, bold, white).
*   **Right Side (Controls):**
    *   Three circular buttons (`rounded-full`, `w-10 h-10`, `bg-purple-900/20`, `text-white`).
    *   Icons (left to right): Volume/Speaker, Fullscreen Arrows, Hamburger Menu.
*   **Bottom Edge (Progress Bar):**
    *   Horizontal row of 8 segmented line indicators centered at the very bottom of the header.
    *   Segment 1 is solid white. Segments 2-8 are semi-transparent white (`bg-white/30`).

### B. Navigation & Stats Bar (Sticky Top)
*   **Placement:** Sits immediately below the purple header, overlapping the gray background.
*   **Layout:** Flex row, centered. Contains left/right navigation arrows and a central cluster of resource pills.
*   **Left/Right Buttons:** Circular white buttons (`bg-white`, `shadow`, `text-purple-600`) with left and right chevron/arrow icons on the far ends.
*   **Center Group (Resource Pills):** Three distinct white pill shapes with soft shadows grouped together:
    *   **Pill 1:** Red Heart icon + "15" (dark text).
    *   **Pill 2:** Gold Key icon + "5" (dark text).
    *   **Pill 3 (Streak/Points):** Orange Fire Icon + "5" attached to a green inset pill containing "+ 50 pts". (Note: The Bullseye icon is no longer present in this version).

### C. Main Content Area (Scrollable)
*   **Background:** Solid light gray (`bg-slate-50`).
*   **Spacing:** Requires adequate padding top and bottom (`py-8`, `px-4`) to account for the sticky bars above and below.
*   **Question Card:**
    *   Large white card (`bg-white`, `rounded-3xl`, `shadow-lg`, `w-full`, `max-w-3xl`, `mx-auto`).
    *   **Border:** The top edge must have a solid, thick purple accent line (e.g., `border-t-4 border-purple-500`).
    *   **Tag:** Centered near the top is a small pill (`bg-purple-100`, `text-purple-700`, uppercase, text-xs, font-bold) reading "MULTIPLE CHOICE".
    *   **Question Text:** Centered below the tag. Large, bold, black text: "Compute: 2 + 3".
*   **Answer Grid:**
    *   Below the question card. A 2x2 grid (`grid grid-cols-2 gap-4`, `max-w-3xl`, `mx-auto`).
    *   Four identical rectangular buttons (`bg-white`, `rounded-xl`, `shadow`, `hover:shadow-md`, `p-4`).
    *   Text inside is left-aligned and bold. (Values from image: 6, 1, 6, 5).

### D. Bottom Footer Section
*   **Background:** Matches the top header's purple gradient. The top left and right edges curve upward.
*   **Action Buttons (Center Aligned):**
    *   Three horizontally aligned white pill buttons (`bg-white`, `rounded-full`, `shadow-lg`, `px-6 py-2`).
    *   Button 1: Gold Key Icon + "Hint".
    *   Button 2: Purple Question Mark Icon + "Reveal".
    *   Button 3: Small Mascot/Book Icon + "Explain".

## 4. Execution Directives for AI
1.  Use `lucide-react` for all icons (e.g., Heart, Key, Volume2, Maximize, Menu, ChevronLeft, ChevronRight, Flame, HelpCircle).
2.  Structure the code into clear functional components (e.g., `<Header />`, `<NavigationStatsBar />`, `<QuestionArea />`, `<Footer />`).
3.  Ensure the sticky layout logic works flawlessly out of the box using Tailwind classes like `flex-col`, `overflow-hidden` on the parent, and `overflow-y-auto` on the main content area.
