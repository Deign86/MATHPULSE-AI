import React, { useState, useRef, useCallback } from 'react';
import { Calculator } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────
   Props
   ──────────────────────────────────────────────────────────────── */

interface MathAnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onCalculatorOpen?: () => void;
  onSubmit?: () => void;
}

/* ────────────────────────────────────────────────────────────────
   Superscript helpers
   ──────────────────────────────────────────────────────────────── */

const superscriptMap: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};

/* ────────────────────────────────────────────────────────────────
   Preview builder
   ──────────────────────────────────────────────────────────────── */

function buildPreview(value: string): string {
  let html = value;

  // Replace known compound symbols first
  html = html.replace(/sin⁻¹/g, 'sin<sup>-1</sup>');
  html = html.replace(/cos⁻¹/g, 'cos<sup>-1</sup>');
  html = html.replace(/tan⁻¹/g, 'tan<sup>-1</sup>');
  html = html.replace(/⁻¹/g, '<sup>-1</sup>');
  html = html.replace(/²/g, '<sup>2</sup>');
  html = html.replace(/³/g, '<sup>3</sup>');
  html = html.replace(/[⁰¹⁴⁵⁶⁷⁸⁹]/g, (ch) => {
    const map: Record<string, string> = {
      '⁰': '0', '¹': '1', '⁴': '4', '⁵': '5',
      '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    };
    return `<sup>${map[ch] ?? ch}</sup>`;
  });
  html = html.replace(/√/g, '√');
  html = html.replace(/π/g, 'π');

  // Strip all HTML tags except <sup> and <sub>
  html = html.replace(/<(?!\/?(?:sup|sub)\b)[^>]*>/gi, '');

  return html;
}

/* ────────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────────── */

const MathAnswerInput: React.FC<MathAnswerInputProps> = ({
  value,
  onChange,
  placeholder,
  onCalculatorOpen,
  onSubmit,
}) => {
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const awaitingExponent = useRef(false);

  /* ── Insert at cursor ───────────────────────────────────── */
  const insertAtCursor = useCallback(
    (symbol: string) => {
      const el = inputRef.current;
      if (!el) {
        onChange(value + symbol);
        return;
      }
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const newVal = value.slice(0, start) + symbol + value.slice(end);
      onChange(newVal);
      setTimeout(() => {
        el.setSelectionRange(start + symbol.length, start + symbol.length);
        el.focus();
      }, 0);
    },
    [value, onChange],
  );

  /* ── Key handling ───────────────────────────────────────── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const key = e.key;

      if (key === 'Enter') {
        e.preventDefault();
        onSubmit?.();
        return;
      }

      // Caret triggers exponent mode
      if (key === '^') {
        awaitingExponent.current = true;
        e.preventDefault();
        return;
      }

      if (awaitingExponent.current) {
        // Minus while awaiting exponent → superscript minus, keep awaiting
        if (key === '-') {
          insertAtCursor('⁻');
          e.preventDefault();
          return;
        }
        // Digit → superscript
        if (/^[0-9]$/.test(key) && superscriptMap[key]) {
          insertAtCursor(superscriptMap[key]);
          awaitingExponent.current = false;
          e.preventDefault();
          return;
        }
        // Any other key cancels exponent mode
        awaitingExponent.current = false;
      }

      // Tab to accept suggestion
      if (key === 'Tab' && suggestion !== null) {
        insertAtCursor(suggestion);
        setSuggestion(null);
        e.preventDefault();
        return;
      }

      // After default input processing check for text shortcuts
      // We use a timeout so the value is updated first
      setTimeout(() => {
        const cur = inputRef.current?.value ?? value;

        if (cur.endsWith('pi')) {
          onChange(cur.slice(0, -2) + 'π');
          setSuggestion(null);
        } else if (cur.endsWith('sqrt')) {
          onChange(cur.slice(0, -4) + '√');
        } else if (cur.endsWith('sin-1') || cur.endsWith('sin^-1')) {
          const len = cur.endsWith('sin^-1') ? 6 : 5;
          onChange(cur.slice(0, -len) + 'sin⁻¹');
        } else if (cur.endsWith('cos-1') || cur.endsWith('cos^-1')) {
          const len = cur.endsWith('cos^-1') ? 6 : 5;
          onChange(cur.slice(0, -len) + 'cos⁻¹');
        } else if (cur.endsWith('tan-1') || cur.endsWith('tan^-1')) {
          const len = cur.endsWith('tan^-1') ? 6 : 5;
          onChange(cur.slice(0, -len) + 'tan⁻¹');
        }
      }, 0);
    },
    [value, onChange, suggestion, insertAtCursor, onSubmit],
  );

  /* ── Focus / Blur / Always Open ─────────────────────────── */
  const updateToolbarPos = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setToolbarPos({
        top: Math.max(20, rect.bottom - 280), // Align bottom with input roughly, keep in viewport
        left: Math.max(10, rect.left - 240), // 240px wide estimated, keep left gap
      });
    }
  }, []);

  const handleFocus = useCallback(() => {
    updateToolbarPos();
    setToolbarVisible(true);
  }, [updateToolbarPos]);

  // Keep it always open once mounted
  React.useEffect(() => {
    const timer = setTimeout(() => {
      updateToolbarPos();
      setToolbarVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [updateToolbarPos]);

  // Update position if window resizes or scrolls
  React.useEffect(() => {
    if (toolbarVisible) {
      window.addEventListener('resize', updateToolbarPos);
      window.addEventListener('scroll', updateToolbarPos, true); // capture phase for scroll
      return () => {
        window.removeEventListener('resize', updateToolbarPos);
        window.removeEventListener('scroll', updateToolbarPos, true);
      };
    }
  }, [toolbarVisible, updateToolbarPos]);

  const handleBlur = useCallback(() => {
    // We purposefully no longer close the toolbar on blur so it can stay open alongside the calculator
  }, []);

  /* ── Preview ────────────────────────────────────────────── */
  const preview = buildPreview(value);
  const showPreview = preview !== value && value.length > 0;

  /* ── Toolbar row helper ─────────────────────────────────── */
  const btnCls =
    'bg-slate-100 hover:bg-slate-200 text-[#0a1628] text-sm px-2 py-1 rounded-lg transition-colors';

  return (
    <div className="relative">
      {/* ── Floating toolbar ──────────────────────────────── */}
      {toolbarVisible && (
        <div
          className="fixed z-[60] bg-white border border-slate-200 rounded-xl shadow-xl px-3 py-3 flex flex-col gap-3 w-[220px] pointer-events-auto e-left-top"
          style={{ ['--top' as any]: `${toolbarPos.top}px`, ['--left' as any]: `${toolbarPos.left}px` }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Row 1: Powers */}
          <div>
            <span className="text-[10px] text-[#5a6578] uppercase tracking-wider mb-0.5 block">Powers</span>
            <div className="flex gap-1">
              <button type="button" className={btnCls} title="Square" onClick={() => insertAtCursor('²')}>x²</button>
              <button type="button" className={btnCls} title="Cube" onClick={() => insertAtCursor('³')}>x³</button>
              <button type="button" className={btnCls} title="Power" onClick={() => insertAtCursor('^')}>xⁿ</button>
              <button type="button" className={btnCls} title="Inverse" onClick={() => insertAtCursor('⁻¹')}>x⁻¹</button>
              <button type="button" className={btnCls} title="Square root" onClick={() => insertAtCursor('√(')}>√</button>
              <button type="button" className={btnCls} title="Cube root" onClick={() => insertAtCursor('∛(')}>∛</button>
            </div>
          </div>

          {/* Row 2: Inverse Trig */}
          <div>
            <span className="text-[10px] text-[#5a6578] uppercase tracking-wider mb-0.5 block">Inverse Trig</span>
            <div className="flex gap-1">
              <button type="button" className={btnCls} title="Inverse sine" onClick={() => insertAtCursor('sin⁻¹(')}>sin⁻¹</button>
              <button type="button" className={btnCls} title="Inverse cosine" onClick={() => insertAtCursor('cos⁻¹(')}>cos⁻¹</button>
              <button type="button" className={btnCls} title="Inverse tangent" onClick={() => insertAtCursor('tan⁻¹(')}>tan⁻¹</button>
            </div>
          </div>

          {/* Row 3: Symbols */}
          <div>
            <span className="text-[10px] text-[#5a6578] uppercase tracking-wider mb-0.5 block">Symbols</span>
            <div className="flex gap-1">
              <button type="button" className={btnCls} title="Pi" onClick={() => insertAtCursor('π')}>π</button>
              <button type="button" className={btnCls} title="Euler's number" onClick={() => insertAtCursor('e')}>e</button>
              <button type="button" className={btnCls} title="Infinity" onClick={() => insertAtCursor('∞')}>∞</button>
              <button type="button" className={btnCls} title="Plus-minus" onClick={() => insertAtCursor('±')}>±</button>
              <button type="button" className={btnCls} title="Approximately" onClick={() => insertAtCursor('≈')}>≈</button>
              <button type="button" className={btnCls} title="Degree" onClick={() => insertAtCursor('°')}>°</button>
            </div>
          </div>

          {/* Row 4: Other */}
          <div>
            <span className="text-[10px] text-[#5a6578] uppercase tracking-wider mb-0.5 block">Other</span>
            <div className="flex gap-1 items-center">
              <button type="button" className={btnCls} title="Fraction" onClick={() => insertAtCursor('(/)')}>a/b</button>
              <div className="ml-auto">
                <button
                  type="button"
                  className="bg-sky-600 hover:bg-rose-500 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1"
                  onClick={() => onCalculatorOpen?.()}
                >
                  <Calculator size={12} />
                  Use Calc
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Input ─────────────────────────────────────────── */}
      <input
        ref={inputRef}
        id="math-answer-input"
        name="math-answer-input"
        aria-label="Math answer input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || 'Type your answer... use ^ for powers e.g. x^2 for x²'}
        className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-4 py-3 text-[#0a1628] font-mono text-base outline-none transition-colors"
      />

      {/* ── Preview ───────────────────────────────────────── */}
      {showPreview && (
        <div
          className="text-rose-300 text-sm font-mono mt-1"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      )}
    </div>
  );
};

export default MathAnswerInput;
