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
}) => {
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
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
    [value, onChange, suggestion, insertAtCursor],
  );

  /* ── Focus / Blur ───────────────────────────────────────── */
  const handleFocus = useCallback(() => setToolbarVisible(true), []);
  const handleBlur = useCallback(() => {
    setTimeout(() => setToolbarVisible(false), 200);
  }, []);

  /* ── Preview ────────────────────────────────────────────── */
  const preview = buildPreview(value);
  const showPreview = preview !== value && value.length > 0;

  /* ── Toolbar row helper ─────────────────────────────────── */
  const btnCls =
    'bg-slate-700 hover:bg-slate-600 text-white text-sm px-2 py-1 rounded-lg transition-colors';

  return (
    <div className="relative">
      {/* ── Floating toolbar ──────────────────────────────── */}
      {toolbarVisible && (
        <div
          className="absolute z-40 left-0 bg-slate-800 border border-cyan-500/30 rounded-xl shadow-lg px-3 py-2 flex flex-col gap-2"
          style={{ bottom: 'calc(100% + 8px)' }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Row 1: Powers */}
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 block">Powers</span>
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
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 block">Inverse Trig</span>
            <div className="flex gap-1">
              <button type="button" className={btnCls} title="Inverse sine" onClick={() => insertAtCursor('sin⁻¹(')}>sin⁻¹</button>
              <button type="button" className={btnCls} title="Inverse cosine" onClick={() => insertAtCursor('cos⁻¹(')}>cos⁻¹</button>
              <button type="button" className={btnCls} title="Inverse tangent" onClick={() => insertAtCursor('tan⁻¹(')}>tan⁻¹</button>
            </div>
          </div>

          {/* Row 3: Symbols */}
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 block">Symbols</span>
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
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 block">Other</span>
            <div className="flex gap-1 items-center">
              <button type="button" className={btnCls} title="Fraction" onClick={() => insertAtCursor('(/)')}>a/b</button>
              <div className="ml-auto">
                <button
                  type="button"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1"
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
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || 'Type your answer... use ^ for powers e.g. x^2 for x²'}
        className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-4 py-3 text-white font-mono text-base outline-none transition-colors"
      />

      {/* ── Preview ───────────────────────────────────────── */}
      {showPreview && (
        <div
          className="text-cyan-300 text-sm font-mono mt-1"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      )}
    </div>
  );
};

export default MathAnswerInput;
