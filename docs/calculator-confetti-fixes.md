# Calculator & Confetti Fixes

## Calculator Implementation

### Portal Rendering
The calculator uses React Portal to escape z-index context and render above modals/overlays.

```typescript
import { createPortal } from 'react-dom';

{showCalculator && createPortal(
  <motion.div className="fixed right-6 top-1/2 -translate-y-1/2 z-[9999] w-64">
    <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between mb-2 px-1">
        <h4 className="text-xs font-bold text-[#0a1628] flex items-center gap-2">
          <Calculator size={14} className="text-purple-600" /> Calculator
        </h4>
        <button onClick={() => setShowCalculator(false)} ...>
          <X size={12} />
        </button>
      </div>
      <ScientificCalculator isOpen={true} onClose={() => setShowCalculator(false)} inline />
    </div>
  </motion.div>,
  document.getElementById('modal-root')!
)}
```

### Key Implementation Details
- **Portal Target**: Renders to `#modal-root` div (must exist in index.html)
- **Position**: Right side of screen (`right-6`), vertically centered (`top-1/2 -translate-y-1/2`)
- **Size**: Compact (`w-64`, `rounded-2xl`, `p-3`)
- **Animation**: Slides in from right (`initial={{ opacity: 0, x: 20 }}`)
- **NOT wrapped in AnimatePresence** - direct conditional rendering

### Important: Do NOT Use AnimatePresence
AnimatePresence with mode="wait" can cause issues with portal rendering. Use direct conditional rendering instead:
```typescript
// WRONG - causes visibility issues
{showCalculator && (
  <AnimatePresence mode="wait">
    {showCalculator && <Calculator />}
  </AnimatePresence>
)}

// CORRECT - works reliably
{showCalculator && createPortal(...)}
```

## Confetti Implementation

### Position from Above
Confetti should drop from above the viewport for celebratory effect.

```typescript
<Confetti
  numberOfPieces={200}
  recycle={false}
  gravity={0.15}
  origin={{ x: 0.5, y: -0.1 }}  // Start above viewport
/>
```

### Key Properties
- `origin.y: -0.1` - Start from above viewport (negative = above)
- `gravity: 0.15` - Slower fall for better visual
- `recycle: false` - One-shot celebration, don't loop
- `numberOfPieces: 200` - Enough for visible celebration

## Files Modified
- `src/components/InteractiveLesson.tsx` - Module quiz calculator
- `src/components/QuizExperience.tsx` - Practice center calculator + confetti
- `index.html` - Modal root div