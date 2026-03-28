# Avatar Shop Rebuild Guide

This document captures the exact styling, animations, and structural methodologies used to build the polished `AvatarShop.tsx` interface. Use these instructions to reconstruct the UI on the main branch from scratch using AI.

## 1. Core Data Structure: Thumbnails vs. Sprites
To ensure the inventory buttons look good without using awkward cropped versions of the avatar assets, we separated the images into two properties:
- `src`: The actual transparent PNG layered onto the paper doll (e.g., `/avatar/base.png`).
- `thumbnail`: A separate icon used strictly for the shop UI buttons (e.g., `/avatar/base_thumbnail.png`).

**Example Mock Data:**
```typescript
{
  id: 'base_1',
  name: 'Default Body',
  category: 'base',
  src: '/avatar/base.png',
  thumbnail: '/avatar/base_thumbnail.png'
}
```

## 2. Global Layout
The layout uses a responsive two-column grid on large screens and a stacked column on smaller screens.
- **Container**: `max-w-7xl mx-auto p-4 sm:p-6`
- **Grid Setup**: `grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6 xl:gap-8`
  - *Left Column*: Avatar Preview Box (fixed width on desktop).
  - *Right Column*: Shop Inventory Tabs (takes remaining space).

## 3. Avatar Preview Section (Crucial Aesthetics)
The preview box features a moody atmosphere with a static spotlight and floating avatar. 

### Background Configuration
- **Color**: Deep dark blue (`bg-[#0A1128]`). This ensures dark clothes don't blend into pure black (`#000` or `slate-900`), keeping the silhouette visible.
- **Shape**: `rounded-[2rem] overflow-hidden relative shadow-2xl`

### The Static V-Shape Spotlight
**Important**: The spotlight must sit **outside** the `<motion.div>` that floats the character, otherwise the light will float with the character (breaking immersion).

**Spotlight Code:**
```jsx
{/* V-Shape Spotlight from Above - Static, NOT inside the motion group */}
<div 
  className="absolute top-[-10%] left-0 right-0 h-[110%] pointer-events-none mix-blend-screen"
  style={{ 
    background: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 60%, transparent 100%)', 
    clipPath: 'polygon(15% 0, 85% 0, 65% 100%, 35% 100%)' 
  }}
/>
```

## 4. Framer Motion Animations (`motion/react`)
The actual character assets are wrapped in motion components to breathe life into the UI.

### The Breathing Avatar Base
Wrap all the avatar layers (Base, Face, Clothes) in a floating div:
```jsx
<motion.div
  animate={{ y: [-5, 5, -5] }}
  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
  className="relative w-full h-[500px] z-10"
>
  {/* Layer images here using absolute inset-0 */}
</motion.div>
```

### Swinging Accessories (e.g., Horns)
For accessories that swing, apply a slightly more aggressive rotation so the effect is obvious, and define the transform origin so it swings from the correct anchor point (e.g., near the top/base of the horn).
```jsx
<motion.img
  src="/avatar/right_horn.png"
  className="absolute inset-0 w-full h-full object-contain z-50 origin-[50%_45%]"
  animate={{ rotate: [8, -8, 8] }}
  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
/>
```
*(Left horn used `[-8, 8, -8]`)*

## 5. Shop Interface (Right Column) & Tabs
We used Radix UI `Tabs` for categories (Hats, Shirts, etc.).

### Horizontal Scrolling TabsList
To prevent the category buttons from squishing into a grid on narrow screens, force them into a horizontally scrollable single row:
- Classes applied to `TabsList`: `flex flex-nowrap overflow-x-auto justify-start border-b ... scrollbar-hide`
- Note: Keep tabs neatly separated using standard padding, let them overflow natively.

### Item Selection Grid
- The grid for items uses `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`.
- Selected items are highlighted using `ring-2 ring-blue-500` or a bright colored border.

## 6. Call to Action (Save Button)
Instead of an overdesigned AI "neon" gradient, we opted for a solid, modern, clean blue button.
- **Classes**: `bg-blue-600 hover:bg-blue-500 text-white font-black h-[72px] rounded-2xl`
- **Effects**: Added a soft shadow (`shadow-[0_10px_30px_-10px_rgba(37,99,235,0.6)]`), size transition (`active:scale-95`), and a subtle sliding gloss effect on hover.

## 7. Common Pitfalls to Avoid
1. **Closing Tags**: When composing complex compound components (especially Radix `TabsList`), ensure all JSX tags are closed properly. We ran into an issue where `<TabsList>` wasn't closed properly after a refactor.
2. **Animation vs. Environment**: Never put environmental effects (lights, shadows on the floor) inside the avatar's `<motion.div>`, or the whole room will appear to bounce.
3. **Paths**: Ensure image paths point correctly to `/avatar/...` in the public directory and that components use `object-contain` so they don't stretch.