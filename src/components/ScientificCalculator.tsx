import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Minimize2, Maximize2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiService } from '../services/apiService';
import type { CalculatorResponse } from '../services/apiService';

/* ────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────── */

type AngleMode = 'DEG' | 'RAD';

interface HistoryEntry {
  expression: string;
  result: string;
}

interface ScientificCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  /** When true the calculator renders inline (no overlay). Default: floating modal */
  inline?: boolean;
}

/* ────────────────────────────────────────────────────────────────
   Client-side Calculation Engine
   ──────────────────────────────────────────────────────────────── */

/** Tokenise an expression into numbers, operators, functions, etc. */
function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    // skip whitespace
    if (ch === ' ') { i++; continue; }

    // number (incl. decimals and leading minus for negative after operator / start)
    if (/\d/.test(ch) || (ch === '.' && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
      let num = '';
      while (i < expr.length && (/[\d.]/.test(expr[i]))) { num += expr[i]; i++; }
      // scientific notation like 3e5
      if (i < expr.length && (expr[i] === 'e' || expr[i] === 'E') && (i + 1 < expr.length) && /[\d+-]/.test(expr[i + 1])) {
        num += expr[i]; i++;
        if (expr[i] === '+' || expr[i] === '-') { num += expr[i]; i++; }
        while (i < expr.length && /\d/.test(expr[i])) { num += expr[i]; i++; }
      }
      tokens.push(num);
      continue;
    }

    // named function or constant (letters)
    if (/[a-zA-Zπ]/.test(ch)) {
      let name = '';
      while (i < expr.length && /[a-zA-Zπ⁻¹]/.test(expr[i])) { name += expr[i]; i++; }
      tokens.push(name);
      continue;
    }

    // operators and brackets
    tokens.push(ch);
    i++;
  }
  return tokens;
}

/** Convert infix tokens to postfix (shunting-yard). */
function toPostfix(tokens: string[], mode: AngleMode): string[] {
  const output: string[] = [];
  const opStack: string[] = [];

  const precedence: Record<string, number> = { '+': 1, '-': 1, '×': 2, '÷': 2, '*': 2, '/': 2, '%': 2, '^': 4 };
  const rightAssoc = new Set(['^']);
  const funcs = new Set([
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'sinh', 'cosh', 'tanh',
    'log', 'ln', 'sqrt', 'cbrt',
    'abs', 'factorial', 'nroot',
    'tenPow', 'ePow', 'neg',
  ]);

  // Insert implicit multiplication: number|)| const before function|( | const
  const expanded: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i > 0) {
      const prev = expanded[expanded.length - 1];
      const prevIsValue = prev === ')' || prev === 'π' || prev === 'e' || prev === 'Ans' || /^\d/.test(prev);
      const curIsValue = t === '(' || t === 'π' || t === 'e' || t === 'Ans' || funcs.has(t) || /^\d/.test(t);
      if (prevIsValue && curIsValue) {
        expanded.push('×');
      }
    }
    expanded.push(t);
  }

  for (const token of expanded) {
    if (/^[\d.]+([eE][+-]?\d+)?$/.test(token)) {
      output.push(token);
    } else if (token === 'π') {
      output.push(String(Math.PI));
    } else if (token === 'e' && !funcs.has(token)) {
      output.push(String(Math.E));
    } else if (token === 'Ans') {
      output.push('__ANS__');
    } else if (funcs.has(token)) {
      opStack.push(token);
    } else if (token === '(') {
      opStack.push(token);
    } else if (token === ')') {
      while (opStack.length && opStack[opStack.length - 1] !== '(') {
        output.push(opStack.pop()!);
      }
      opStack.pop(); // remove '('
      if (opStack.length && funcs.has(opStack[opStack.length - 1])) {
        output.push(opStack.pop()!);
      }
    } else if (token in precedence) {
      const prec = precedence[token];
      while (
        opStack.length &&
        opStack[opStack.length - 1] !== '(' &&
        opStack[opStack.length - 1] in precedence &&
        (precedence[opStack[opStack.length - 1]] > prec ||
          (precedence[opStack[opStack.length - 1]] === prec && !rightAssoc.has(token)))
      ) {
        output.push(opStack.pop()!);
      }
      opStack.push(token);
    }
  }
  while (opStack.length) output.push(opStack.pop()!);

  // tag mode for later trig evaluation
  void mode;
  return output;
}

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function degToRad(d: number): number { return d * Math.PI / 180; }
function radToDeg(r: number): number { return r * 180 / Math.PI; }

function evaluatePostfix(postfix: string[], mode: AngleMode, ans: number): number {
  const stack: number[] = [];
  const toAngle = mode === 'DEG' ? degToRad : (x: number) => x;
  const fromAngle = mode === 'DEG' ? radToDeg : (x: number) => x;

  for (const token of postfix) {
    if (token === '__ANS__') {
      stack.push(ans);
      continue;
    }

    const num = parseFloat(token);
    if (!isNaN(num) && /^[\d.eE+-]+$/.test(token)) {
      stack.push(num);
      continue;
    }

    // Binary ops
    if (['+', '-', '×', '÷', '*', '/', '^', '%'].includes(token)) {
      const b = stack.pop()!;
      const a = stack.pop()!;
      switch (token) {
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '×': case '*': stack.push(a * b); break;
        case '÷': case '/':
          if (b === 0) { stack.push(NaN); break; }
          stack.push(a / b); break;
        case '^': stack.push(Math.pow(a, b)); break;
        case '%': stack.push(a * b / 100); break;
      }
      continue;
    }

    // Unary functions
    const a = stack.pop()!;
    switch (token) {
      case 'sin': stack.push(Math.sin(toAngle(a))); break;
      case 'cos': stack.push(Math.cos(toAngle(a))); break;
      case 'tan': {
        const rad = toAngle(a);
        // Check for undefined (cos ≈ 0)
        if (Math.abs(Math.cos(rad)) < 1e-15) { stack.push(NaN); break; }
        stack.push(Math.tan(rad)); break;
      }
      case 'asin':
        if (a < -1 || a > 1) { stack.push(NaN); break; }
        stack.push(fromAngle(Math.asin(a))); break;
      case 'acos':
        if (a < -1 || a > 1) { stack.push(NaN); break; }
        stack.push(fromAngle(Math.acos(a))); break;
      case 'atan': stack.push(fromAngle(Math.atan(a))); break;
      case 'sinh': stack.push(Math.sinh(a)); break;
      case 'cosh': stack.push(Math.cosh(a)); break;
      case 'tanh': stack.push(Math.tanh(a)); break;
      case 'log': stack.push(a <= 0 ? NaN : Math.log10(a)); break;
      case 'ln': stack.push(a <= 0 ? NaN : Math.log(a)); break;
      case 'sqrt': stack.push(a < 0 ? NaN : Math.sqrt(a)); break;
      case 'cbrt': stack.push(Math.cbrt(a)); break;
      case 'abs': stack.push(Math.abs(a)); break;
      case 'factorial': stack.push(factorial(a)); break;
      case 'tenPow': stack.push(Math.pow(10, a)); break;
      case 'ePow': stack.push(Math.exp(a)); break;
      case 'neg': stack.push(-a); break;
      case 'nroot': {
        const base = stack.pop()!;
        stack.push(Math.pow(base, 1 / a));
        break;
      }
      default:
        stack.push(NaN);
    }
  }

  return stack.length === 1 ? stack[0] : NaN;
}

/**
 * Auto-close unmatched open brackets.
 */
function autoCloseBrackets(expr: string): string {
  let open = 0;
  for (const ch of expr) {
    if (ch === '(') open++;
    else if (ch === ')') open--;
  }
  return expr + ')'.repeat(Math.max(0, open));
}

/**
 * Format a number for display:
 *  - integers shown as integers
 *  - numbers > 1e10 or < 1e-10 in scientific notation
 *  - up to 10 decimal places
 */
function formatResult(n: number): string {
  if (!isFinite(n)) {
    if (isNaN(n)) return 'Math Error';
    return n > 0 ? '∞' : '-∞';
  }
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toString();
  if (Math.abs(n) >= 1e10 || (Math.abs(n) < 1e-10 && n !== 0)) {
    return n.toExponential(6);
  }
  // remove trailing zeros
  const s = n.toPrecision(10);
  return parseFloat(s).toString();
}

/**
 * Main evaluate function – returns result string or error.
 */
function evaluate(expression: string, mode: AngleMode, ans: number): string {
  try {
    const closed = autoCloseBrackets(expression);
    const tokens = tokenize(closed);
    if (tokens.length === 0) return '0';
    const postfix = toPostfix(tokens, mode);
    const result = evaluatePostfix(postfix, mode, ans);
    return formatResult(result);
  } catch {
    return 'Error';
  }
}

/* ────────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────────── */

const ScientificCalculator: React.FC<ScientificCalculatorProps> = ({
  isOpen,
  onClose,
  inline = false,
}) => {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [prevExpression, setPrevExpression] = useState('');
  const [angleMode, setAngleMode] = useState<AngleMode>('DEG');
  const [shiftActive, setShiftActive] = useState(false);
  const [alphaActive, setAlphaActive] = useState(false);
  const [ans, setAns] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isError, setIsError] = useState(false);
  const [sympyVerifying, setSympyVerifying] = useState(false);
  const [sympyResult, setSympyResult] = useState<CalculatorResponse | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const expressionRef = useRef<HTMLDivElement>(null);

  // Scroll expression line to the right
  useEffect(() => {
    if (expressionRef.current) {
      expressionRef.current.scrollLeft = expressionRef.current.scrollWidth;
    }
  }, [expression]);

  /* ── Keyboard handler ────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const handleKey = (e: KeyboardEvent) => {
      // Don't capture if user is typing in other inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key;
      e.stopPropagation();

      if (/^[0-9.]$/.test(key)) { handleInput(key); e.preventDefault(); }
      else if (key === '+') { handleInput('+'); e.preventDefault(); }
      else if (key === '-') { handleInput('-'); e.preventDefault(); }
      else if (key === '*') { handleInput('×'); e.preventDefault(); }
      else if (key === '/') { handleInput('÷'); e.preventDefault(); }
      else if (key === '(' || key === ')') { handleInput(key); e.preventDefault(); }
      else if (key === '^') { handleInput('^'); e.preventDefault(); }
      else if (key === 'Enter' || key === '=') { handleEquals(); e.preventDefault(); }
      else if (key === 'Backspace') { handleDelete(); e.preventDefault(); }
      else if (key === 'Escape') { handleAllClear(); e.preventDefault(); }
      else if (key === 'Delete') { handleAllClear(); e.preventDefault(); }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isMinimized, expression, ans, angleMode]);

  /* ── Input handlers ──────────────────────────────────────── */

  const handleInput = useCallback((value: string) => {
    setIsError(false);
    setSympyResult(null);
    setExpression(prev => prev + value);
  }, []);

  const handleFunction = useCallback((fn: string) => {
    setIsError(false);
    setSympyResult(null);
    setExpression(prev => prev + fn + '(');
    setShiftActive(false);
  }, []);

  const handleDelete = useCallback(() => {
    setExpression(prev => prev.slice(0, -1));
    setIsError(false);
  }, []);

  const handleAllClear = useCallback(() => {
    setExpression('');
    setResult('0');
    setPrevExpression('');
    setIsError(false);
    setSympyResult(null);
  }, []);

  const handleEquals = useCallback(() => {
    if (!expression.trim()) return;
    const res = evaluate(expression, angleMode, ans);
    const isErr = res === 'Error' || res === 'Math Error';
    setIsError(isErr);
    setResult(res);
    if (!isErr) {
      const numVal = parseFloat(res);
      if (!isNaN(numVal)) setAns(numVal);
      setHistory(prev => [...prev.slice(-19), { expression, result: res }]);
      setPrevExpression(expression + ' =');
    }
    setExpression('');
  }, [expression, angleMode, ans]);

  const handleToggleAngleMode = useCallback(() => {
    setAngleMode(prev => prev === 'DEG' ? 'RAD' : 'DEG');
  }, []);

  const handleShift = useCallback(() => {
    setShiftActive(prev => !prev);
    setAlphaActive(false);
  }, []);

  const handleAlpha = useCallback(() => {
    setAlphaActive(prev => !prev);
    setShiftActive(false);
  }, []);

  const handleAns = useCallback(() => {
    handleInput('Ans');
  }, [handleInput]);

  const handleExp = useCallback(() => {
    handleInput('×10^');
  }, [handleInput]);

  /* ── SymPy verification ──────────────────────────────────── */
  const verifySympyExpression = useCallback(async () => {
    const exprToVerify = expression.trim() || (history.length > 0 ? history[history.length - 1].expression : '');
    if (!exprToVerify) return;

    setSympyVerifying(true);
    try {
      // Convert display symbols to SymPy-friendly format
      const sympyExpr = exprToVerify
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'pi')
        .replace(/Ans/g, String(ans))
        .replace(/(\d)\(/g, '$1*(')
        .replace(/\)(\d)/g, ')*$1');

      const response = await apiService.evaluateExpression(sympyExpr);
      setSympyResult(response);
    } catch {
      setSympyResult({
        expression: exprToVerify,
        result: 'Verification unavailable',
        steps: ['Backend unavailable — using client-side result'],
        simplified: null,
        latex: null,
      });
    } finally {
      setSympyVerifying(false);
    }
  }, [expression, history, ans]);

  /* ── Button definitions ──────────────────────────────────── */

  type BtnVariant = 'number' | 'op' | 'func' | 'special' | 'del' | 'equals' | 'shift' | 'mode';

  interface CalcButton {
    label: string;
    shiftLabel?: string;
    action: () => void;
    shiftAction?: () => void;
    variant: BtnVariant;
    colSpan?: number;
  }

  const rows: CalcButton[][] = [
    // Row 1: Mode & Memory
    [
      { label: 'SHIFT', action: handleShift, variant: 'shift' },
      { label: 'ALPHA', action: handleAlpha, variant: 'shift' },
      { label: angleMode, action: handleToggleAngleMode, variant: 'mode' },
      { label: '◀', action: () => { /* cursor left – move to end-1 */ handleDelete(); }, variant: 'mode' },
      { label: '▶', action: () => { handleInput(' '); }, variant: 'mode' },
    ],
    // Row 2: Scientific top row
    [
      { label: 'x²', shiftLabel: '√', action: () => handleInput('^2'), shiftAction: () => handleFunction('sqrt'), variant: 'func' },
      { label: 'x³', shiftLabel: '³√', action: () => handleInput('^3'), shiftAction: () => handleFunction('cbrt'), variant: 'func' },
      { label: 'xʸ', shiftLabel: 'ʸ√x', action: () => handleInput('^'), shiftAction: () => handleFunction('nroot'), variant: 'func' },
      { label: 'log', shiftLabel: '10ˣ', action: () => handleFunction('log'), shiftAction: () => handleFunction('tenPow'), variant: 'func' },
      { label: 'ln', shiftLabel: 'eˣ', action: () => handleFunction('ln'), shiftAction: () => handleFunction('ePow'), variant: 'func' },
    ],
    // Row 3: Scientific second row
    [
      { label: '√', shiftLabel: 'x²', action: () => handleFunction('sqrt'), shiftAction: () => handleInput('^2'), variant: 'func' },
      { label: '³√', shiftLabel: 'x³', action: () => handleFunction('cbrt'), shiftAction: () => handleInput('^3'), variant: 'func' },
      { label: 'ʸ√x', shiftLabel: 'xʸ', action: () => handleFunction('nroot'), shiftAction: () => handleInput('^'), variant: 'func' },
      { label: 'sin', shiftLabel: 'sin⁻¹', action: () => handleFunction('sin'), shiftAction: () => handleFunction('asin'), variant: 'func' },
      { label: 'cos', shiftLabel: 'cos⁻¹', action: () => handleFunction('cos'), shiftAction: () => handleFunction('acos'), variant: 'func' },
    ],
    // Row 4: Scientific third row
    [
      { label: 'tan', shiftLabel: 'tan⁻¹', action: () => handleFunction('tan'), shiftAction: () => handleFunction('atan'), variant: 'func' },
      { label: 'sin⁻¹', shiftLabel: 'sinh', action: () => handleFunction('asin'), shiftAction: () => handleFunction('sinh'), variant: 'func' },
      { label: 'cos⁻¹', shiftLabel: 'cosh', action: () => handleFunction('acos'), shiftAction: () => handleFunction('cosh'), variant: 'func' },
      { label: 'tan⁻¹', shiftLabel: 'tanh', action: () => handleFunction('atan'), shiftAction: () => handleFunction('tanh'), variant: 'func' },
      { label: 'π', action: () => handleInput('π'), variant: 'func' },
    ],
    // Row 5: Brackets & operations
    [
      { label: '(', action: () => handleInput('('), variant: 'func' },
      { label: ')', action: () => handleInput(')'), variant: 'func' },
      { label: 'e', action: () => handleInput('e'), variant: 'func' },
      { label: 'EXP', action: handleExp, variant: 'func' },
      { label: '%', action: () => handleInput('%'), variant: 'func' },
    ],
    // Row 6: 7 8 9 DEL AC
    [
      { label: '7', action: () => handleInput('7'), variant: 'number' },
      { label: '8', action: () => handleInput('8'), variant: 'number' },
      { label: '9', action: () => handleInput('9'), variant: 'number' },
      { label: 'DEL', action: handleDelete, variant: 'del' },
      { label: 'AC', action: handleAllClear, variant: 'del' },
    ],
    // Row 7: 4 5 6 × ÷
    [
      { label: '4', action: () => handleInput('4'), variant: 'number' },
      { label: '5', action: () => handleInput('5'), variant: 'number' },
      { label: '6', action: () => handleInput('6'), variant: 'number' },
      { label: '×', action: () => handleInput('×'), variant: 'op' },
      { label: '÷', action: () => handleInput('÷'), variant: 'op' },
    ],
    // Row 8: 1 2 3 + -
    [
      { label: '1', action: () => handleInput('1'), variant: 'number' },
      { label: '2', action: () => handleInput('2'), variant: 'number' },
      { label: '3', action: () => handleInput('3'), variant: 'number' },
      { label: '+', action: () => handleInput('+'), variant: 'op' },
      { label: '−', action: () => handleInput('-'), variant: 'op' },
    ],
    // Row 9: 0 . ×10ˣ Ans =
    [
      { label: '0', action: () => handleInput('0'), variant: 'number' },
      { label: '.', action: () => handleInput('.'), variant: 'number' },
      { label: '×10ˣ', action: handleExp, variant: 'func' },
      { label: 'Ans', action: handleAns, variant: 'op' },
      { label: '=', action: handleEquals, variant: 'equals' },
    ],
  ];

  /* ── Button style helper ─────────────────────────────────── */
  const getButtonClasses = (variant: BtnVariant, label: string): string => {
    const base = 'flex items-center justify-center rounded-lg font-semibold transition-all duration-150 active:scale-95 select-none cursor-pointer touch-manipulation';
    const size = 'h-11 text-sm';

    switch (variant) {
      case 'number':
        return `${base} ${size} bg-slate-700 hover:bg-slate-600 text-white shadow-md shadow-slate-900/30`;
      case 'op':
        return `${base} ${size} bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-md shadow-cyan-900/30 font-bold`;
      case 'func':
        return `${base} ${size} bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30 text-xs`;
      case 'del':
        return `${base} ${size} ${label === 'AC' ? 'bg-red-600 hover:bg-red-500' : 'bg-red-500/80 hover:bg-red-500'} text-white shadow-md shadow-red-900/30 font-bold`;
      case 'equals':
        return `${base} ${size} bg-gradient-to-br from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-white shadow-lg shadow-cyan-900/40 font-bold text-base`;
      case 'shift':
        return `${base} ${size} bg-slate-800 hover:bg-slate-700 text-white shadow-md shadow-slate-900/30 text-xs font-bold`;
      case 'mode':
        return `${base} ${size} bg-slate-800 hover:bg-slate-700 text-blue-300 shadow-md shadow-slate-900/30 text-xs`;
      default:
        return `${base} ${size} bg-slate-700 text-white`;
    }
  };

  /* ── Render ──────────────────────────────────────────────── */

  if (!isOpen) return null;

  const calculator = (
    <div className="flex flex-col w-full max-w-sm mx-auto select-none">
      {/* ── Display ────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-t-2xl p-4 border border-slate-700 border-b-0">
        {/* Mode badges */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`
            text-[10px] font-bold px-2 py-0.5 rounded-full
            ${angleMode === 'DEG' 
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}
          `}>
            {angleMode}
          </span>
          {shiftActive && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
              SHIFT
            </span>
          )}
          {alphaActive && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              ALPHA
            </span>
          )}
          {sympyVerifying && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
              Verifying…
            </span>
          )}
        </div>

        {/* Expression line (top) */}
        <div
          ref={expressionRef}
          className="text-right text-slate-400 text-sm font-mono h-6 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide"
        >
          {prevExpression || '\u00A0'}
        </div>

        {/* Result line (bottom) */}
        <div className={`
          text-right font-mono font-bold text-2xl h-9 overflow-hidden whitespace-nowrap
          ${isError ? 'text-red-400' : 'text-white'}
        `}>
          {expression || result}
        </div>

        {/* SymPy verification result */}
        <AnimatePresence>
          {sympyResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 pt-2 border-t border-slate-700"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">SymPy Verified</span>
              </div>
              <p className="text-xs text-slate-300 font-mono">{sympyResult.result}</p>
              {sympyResult.latex && (
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">LaTeX: {sympyResult.latex}</p>
              )}
              {sympyResult.steps.length > 1 && (
                <div className="mt-1 space-y-0.5">
                  {sympyResult.steps.slice(1).map((step, i) => (
                    <p key={i} className="text-[10px] text-slate-500">{step}</p>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Verify button ──────────────────────────────────── */}
      <button
        onClick={verifySympyExpression}
        disabled={sympyVerifying}
        className="
          w-full py-1.5 bg-slate-800 border-x border-slate-700
          text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-slate-750
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-1.5
        "
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {sympyVerifying ? 'Verifying with SymPy…' : 'Verify with SymPy'}
      </button>

      {/* ── Button grid ────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-b-2xl p-3 border border-slate-700 border-t-0 space-y-2">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-5 gap-1.5">
            {row.map((btn, bi) => {
              const showShift = shiftActive && btn.shiftAction;
              const displayLabel = showShift ? (btn.shiftLabel || btn.label) : btn.label;
              const action = showShift ? btn.shiftAction! : btn.action;

              return (
                <button
                  key={bi}
                  onClick={action}
                  className={`
                    ${getButtonClasses(btn.variant, btn.label)}
                    ${btn.variant === 'shift' && btn.label === 'SHIFT' && shiftActive
                      ? '!bg-amber-600 ring-2 ring-amber-400/50'
                      : ''}
                    ${btn.variant === 'shift' && btn.label === 'ALPHA' && alphaActive
                      ? '!bg-indigo-600 ring-2 ring-indigo-400/50'
                      : ''}
                    ${btn.colSpan ? `col-span-${btn.colSpan}` : ''}
                    relative
                  `}
                  title={btn.shiftLabel ? `SHIFT: ${btn.shiftLabel}` : undefined}
                >
                  {/* Shift label above */}
                  {btn.shiftLabel && !shiftActive && (
                    <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[7px] text-amber-400/70 font-medium whitespace-nowrap">
                      {btn.shiftLabel}
                    </span>
                  )}
                  <span className={showShift ? 'text-amber-200' : ''}>
                    {displayLabel}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Inline mode ─────────────────────────────────────────── */
  if (inline) {
    return calculator;
  }

  /* ── Floating modal mode ─────────────────────────────────── */
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Calculator panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`
              fixed z-[201] 
              ${isMinimized 
                ? 'bottom-4 right-4 w-72' 
                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[370px]'}
            `}
          >
            {/* Header bar */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-t-2xl px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-white/50" />
                <h3 className="text-white font-bold text-sm">Scientific Calculator</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  {isMinimized ? <Maximize2 size={14} className="text-white" /> : <Minimize2 size={14} className="text-white" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            </div>

            {/* Body – collapsible */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {calculator}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Minimized preview */}
            {isMinimized && (
              <div className="bg-slate-900 rounded-b-2xl p-3 border border-slate-700 border-t-0">
                <p className="text-right text-white font-mono font-bold text-lg">{result}</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ScientificCalculator;
