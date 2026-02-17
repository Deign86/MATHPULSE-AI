# MathPulse AI Dashboard - Fixed Frame Layout Architecture

## 📐 Layout Dimensions

### Full Layout Structure (1920px viewport)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         FIXED HEADER (73px height)                                  │
│  ┌─────────────┐  ┌──────────────────────┐  ┌──────┐ ┌────┐ ┌──────────────────┐  │
│  │ Dashboard   │  │   Search Bar         │  │  🔔  │ │ 👤 │ │  Alex Johnson    │  │
│  │ Welcome...  │  │                      │  │      │ │    │ │  Student         │  │
│  └─────────────┘  └──────────────────────┘  └──────┘ └────┘ └──────────────────┘  │
├──────────┬──────────────────────────────────────────────────────────┬───────────────┤
│          │                                                          │               │
│  FIXED   │            SCROLLABLE MAIN CONTENT                       │    FIXED      │
│  LEFT    │            (Only this area scrolls!)                     │    RIGHT      │
│ SIDEBAR  │                                                          │   SIDEBAR     │
│          │                                                          │               │
│  80/240  │   ┌──────────────────────────────────────────────┐      │     320px     │
│   px     │   │  🎓 Hero Banner (gradient)                   │      │               │
│          │   │  Progress: 75% | Level 4 | 1200/1600 XP     │      │  ┌──────────┐ │
│  ┌────┐  │   └──────────────────────────────────────────────┘      │  │ Profile  │ │
│  │ 📊 │  │                                                          │  │ Avatar   │ │
│  │ 📚 │  │   ┌──────────────────────────────────────────────┐      │  └──────────┘ │
│  │ 💬 │  │   │  📈 Learning Path                            │      │               │
│  │ 🎓 │  │   │  - General Mathematics (4 modules)           │      │  ┌──────────┐ │
│  └────┘  │   │  - Pre-Calculus (3 modules)                  │      │  │ Level &  │ │
│          │   │  - Statistics (5 modules)                    │      │  │ XP Info  │ │
│  [Toggle]│   └──────────────────────────────────────────────┘      │  └──────────┘ │
│    ◀     │                                                          │               │
│          │   ┌──────────────────────────────────────────────┐      │  ┌──────────┐ │
│  ┌────┐  │   │  📋 Recent Activity                          │      │  │ 🔥 12    │ │
│  │ ⚙️ │  │   │  - Completed "Basic Functions" +50 XP        │      │  │ Streak   │ │
│  └────┘  │   │  - Asked AI about "Pythagoras"               │      │  └──────────┘ │
│          │   └──────────────────────────────────────────────┘      │               │
│          │                                                          │  ┌──────────┐ │
│          │   [Content continues scrolling...]                      │  │ Tasks    │ │
│          │                                                          │  │ Board    │ │
│          │                                                          │  └──────────┘ │
│          │                                                          │               │
└──────────┴──────────────────────────────────────────────────────────┴───────────────┘
                                                                    
                                                        ┌────────┐
                                                        │   🤖   │  FAB (Chatbot)
                                                        │  Chat  │  32px from edges
                                                        └────────┘
```

## 🎯 Positioning Specifications

### 1. Fixed Header
- **Position**: `fixed` (top: 0, left: 0, right: 0)
- **Height**: 73px
- **Z-index**: 40
- **Contains**: Title, Search, Notifications, Profile
- **Behavior**: Always visible, slight transparency on scroll

### 2. Fixed Left Sidebar
- **Position**: `fixed` (left: 0, top: 73px, bottom: 0)
- **Width**: 
  - Expanded: 264px (240px + 24px padding)
  - Collapsed: 104px (80px + 24px padding)
- **Z-index**: 30
- **Animation**: 300ms ease-in-out width transition
- **Toggle Button**: Positioned at -12px from right edge

### 3. Main Content Area
- **Position**: `absolute` (top: 73px, bottom: 0, right: 0)
- **Left Offset**: 
  - When sidebar expanded: 264px
  - When sidebar collapsed: 104px
- **Transition**: Smooth 300ms when sidebar toggles
- **Overflow**: `overflow-y-auto` (vertical scroll enabled)
- **Clip Content**: `clip-path: inset(0)` prevents content bleeding
- **Padding**: 24px all sides

### 4. Fixed Right Sidebar
- **Width**: 320px
- **Position**: Within main container (fixed relative to viewport)
- **Overflow**: `overflow-y-auto` (scrolls independently)
- **Padding**: 24px right, 24px bottom

### 5. Floating Action Button (FAB)
- **Position**: `fixed`
- **Bottom**: 32px (exactly)
- **Right**: 32px (exactly)
- **Z-index**: 50
- **Size**: 64px × 64px
- **Visibility**: Only on Dashboard page

## 📏 Exact Measurements

### Sidebar Widths
```
COLLAPSED STATE:
├─ Sidebar Container: 104px total
│  ├─ Left Padding: 24px
│  ├─ Sidebar Width: 80px (icons only)
│  └─ Right Space: 0px

EXPANDED STATE:
├─ Sidebar Container: 264px total
   ├─ Left Padding: 24px
   ├─ Sidebar Width: 240px (icons + labels)
   └─ Right Space: 0px
```

### Header Height
```
HEADER:
├─ Total Height: 73px
│  ├─ Padding Top: 16px
│  ├─ Content: 41px
│  └─ Padding Bottom: 16px
└─ Border Bottom: 1px
```

### Main Content Calculations
```
VIEWPORT WIDTH: 1920px

EXPANDED SIDEBAR:
├─ Left Sidebar: 264px
├─ Main Content: ~1336px (flex: 1)
└─ Right Sidebar: 320px

COLLAPSED SIDEBAR:
├─ Left Sidebar: 104px
├─ Main Content: ~1496px (flex: 1) ← +160px wider!
└─ Right Sidebar: 320px
```

### FAB Positioning
```
CHATBOT FAB:
├─ Size: 64px × 64px
├─ Border Radius: 16px
├─ Position: fixed
├─ Bottom: 32px (from viewport bottom)
├─ Right: 32px (from viewport right)
└─ Shadow: Large shadow for elevation
```

## 🎨 Visual Consistency

### Alignment Points
```
HEADER:
┌──────────────────────────────────────────────────────────────┐
│ [Title]                    [Search]  [Bell] [Avatar]         │
└──────────────────────────────────────────────────────────────┘
                                          ↑
                                          │
RIGHT SIDEBAR:                            │ 
┌──────────────┐                          │
│ [Avatar]     │ ← Aligns with header avatar
└──────────────┘
│ [XP Card]    │
└──────────────┘
│ [Streak]     │
└──────────────┘
```

### Component Spacing
```
VERTICAL SPACING (Main Content):
├─ Hero Banner: 0px from top
├─ Gap: 24px
├─ Learning Path: 24px below hero
├─ Gap: 24px
├─ Recent Activity: 24px below learning path
└─ Bottom Padding: 24px

HORIZONTAL SPACING:
├─ Sidebar Left Padding: 24px
├─ Main Content Left Padding: 24px
├─ Main Content Right Padding: 24px
└─ Right Sidebar Right Padding: 24px
```

## 🔄 Scroll Behavior

### What Scrolls:
✅ **Main Content Area** - Primary scroll container
✅ **Right Sidebar** - Independent scroll (if content exceeds height)

### What Doesn't Scroll (Fixed):
❌ **Header** - Always visible at top
❌ **Left Sidebar** - Fixed in place
❌ **FAB Chatbot** - Fixed at bottom-right

## 🎭 Interaction States

### Sidebar Toggle Animation
```
STATE 1: EXPANDED (240px)
  ↓ (Click toggle button)
[300ms animation]
  ↓
STATE 2: COLLAPSED (80px)

DURING ANIMATION:
├─ Sidebar width: 240px → 80px (smooth)
├─ Labels opacity: 1 → 0 (fade out)
├─ Main content left: 264px → 104px (smooth)
└─ Layout reflow: Smooth transition
```

### Header Scroll Effect
```
SCROLL POSITION:    OPACITY:    BLUR:    SHADOW:
─────────────────────────────────────────────────
0px (top)           100%        0px      Light
50px                97%         3px      Light
100px               95%         7px      Medium
200px               93%         10px     Medium
300px+              92%         12px     Strong
```

## 🎯 Clip Content Implementation

### Main Content Clipping
```css
main {
  overflow-y: auto;
  overflow-x: hidden;
  clip-path: inset(0);
}
```

**Purpose**: Prevents cards from bleeding over the fixed header when scrolling up.

**Effect**: Creates a clipping boundary that ensures content stays within the scrollable area.

## ✨ Key Features

### 1. Smart Animate Transitions
- Sidebar: 300ms ease-in-out
- Page transitions: 300ms with fade + slide
- Header effects: Continuous based on scroll position

### 2. Component Variants
**Sidebar:**
- Variant A: Expanded (icons + labels)
- Variant B: Collapsed (icons only)
- Toggle: Chevron button with smart animate

### 3. Responsive Layout
- Main content fluidly adjusts to sidebar state
- All elements maintain proper spacing
- No content cut-off or overflow issues

## 📱 Breakpoint Considerations

### Desktop (1920px)
```
[264px Sidebar] [1336px Main] [320px Right]
```

### Laptop (1440px)
```
[264px Sidebar] [856px Main] [320px Right]
```

### Collapsed (+160px to main)
```
[104px Sidebar] [1016px Main] [320px Right]
```

## 🎨 Design Tokens

### Shadows
```
Sidebar: 0 8px 30px rgba(0,0,0,0.08)
Header: 0 4px 24px rgba(0,0,0,0.08) (on scroll)
Cards: 0 4px 20px rgba(0,0,0,0.05)
FAB: 0 8px 32px rgba(79,70,229,0.4)
```

### Border Radius
```
Sidebar: 24px
Cards: 24px
Buttons: 12px
FAB: 16px
Avatar: 8px
```

### Colors
```
Primary: Indigo-600 (#4F46E5)
Success: Teal-500 (#14B8A6)
Accent: Orange-500 (#F97316)
Background: Slate-50 (#F8FAFC)
Surface: White (#FFFFFF)
```

---

**Implementation Status**: ✅ Complete
**Last Updated**: Current Session
**Framework**: React + TypeScript + Tailwind CSS v4 + Framer Motion
