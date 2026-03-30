import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, GripHorizontal, ChevronDown, ChevronUp, Keyboard } from 'lucide-react';
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

    // unary minus: treat as signed number or negation function
    if (ch === '-') {
      const prev = tokens[tokens.length - 1];
      const isUnary = !prev || ['+', '-', '×', '÷', '*', '/', '%', '^', '('].includes(prev);
      if (isUnary) {
        const next = expr[i + 1];
        if (next && (/\d/.test(next) || next === '.')) {
          let num = '-';
          i++;
          while (i < expr.length && (/[\d.]/.test(expr[i]))) { num += expr[i]; i++; }
          if (
            i < expr.length &&
            (expr[i] === 'e' || expr[i] === 'E') &&
            (i + 1 < expr.length) &&
            /[\d+-]/.test(expr[i + 1])
          ) {
            num += expr[i];
            i++;
            if (expr[i] === '+' || expr[i] === '-') { num += expr[i]; i++; }
            while (i < expr.length && /\d/.test(expr[i])) { num += expr[i]; i++; }
          }
          tokens.push(num);
          continue;
        }
        // Example: -(2+3) or -sin(30)
        tokens.push('neg');
        i++;
        continue;
      }
    }

    // number (incl. decimals)
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
    if (/^-?[\d.]+([eE][+-]?\d+)?$/.test(token)) {
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
    if (!isNaN(num) && /^-?[\d.]+([eE][+-]?\d+)?$/.test(token)) {
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
  const [isMinimized, setIsMinimized] = useState(() => {
    try { return localStorage.getItem('mathpulse_calc_minimized') === 'true'; } catch { return false; }
  });
  const [isFocused, setIsFocused] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const expressionRef = useRef<HTMLDivElement>(null);
  const calcWrapperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Position for the floating calculator — always center on open
  const [calcPos, setCalcPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      const calcW = 380;
      const calcH = 600;
      setCalcPos({
        x: Math.round((window.innerWidth - calcW) / 2),
        y: Math.max(20, Math.round((window.innerHeight - calcH) / 2)),
      });
    }
  }, [isOpen]);

  // Persist minimized state
  useEffect(() => {
    try { localStorage.setItem('mathpulse_calc_minimized', String(isMinimized)); } catch { /* noop */ }
  }, [isMinimized]);

  // Scroll expression line to the right
  useEffect(() => {
    if (expressionRef.current) {
      expressionRef.current.scrollLeft = expressionRef.current.scrollWidth;
    }
  }, [expression]);

  /* ── Focus tracking for keyboard ──────────────────────────── */
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (calcWrapperRef.current && !calcWrapperRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  /* ── Keyboard handler ────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (!isFocused) return;

      const key = e.key;

      // Alt combinations
      if (e.altKey) {
        e.preventDefault();
        if (e.shiftKey) {
          if (key === 'S' || key === 's') { handleFunction('asin'); return; }
          if (key === 'C' || key === 'c') { handleFunction('acos'); return; }
          if (key === 'T' || key === 't') { handleFunction('atan'); return; }
        }
        if (key === 's' || key === 'S') { handleFunction('sin'); return; }
        if (key === 'c' || key === 'C') { handleFunction('cos'); return; }
        if (key === 't' || key === 'T') { handleFunction('tan'); return; }
        if (key === 'l' || key === 'L') { handleFunction('log'); return; }
        if (key === 'n' || key === 'N') { handleFunction('ln'); return; }
        if (key === 'r' || key === 'R') { handleFunction('sqrt'); return; }
        if (key === 'p' || key === 'P') { handleInput('π'); return; }
        if (key === 'e' || key === 'E') { handleInput('e'); return; }
        if (key === '2') { handleInput('²'); return; }
        if (key === '3') { handleInput('³'); return; }
        if (key === '^' || key === '6') { handleInput('^'); return; }
        if (key === 'a' || key === 'A') { handleInput('Ans'); return; }
        if (key === 'd' || key === 'D') { handleToggleAngleMode(); return; }
        return;
      }

      e.stopPropagation();

      if (/^[0-9.]$/.test(key)) { handleInput(key); e.preventDefault(); }
      else if (key === '+') { handleInput('+'); e.preventDefault(); }
      else if (key === '-') { handleInput('-'); e.preventDefault(); }
      else if (key === '*') { handleInput('×'); e.preventDefault(); }
      else if (key === '/') { handleInput('÷'); e.preventDefault(); }
      else if (key === '%') { handleInput('%'); e.preventDefault(); }
      else if (key === '(') { handleInput('('); e.preventDefault(); }
      else if (key === ')') { handleInput(')'); e.preventDefault(); }
      else if (key === '^') { handleInput('^'); e.preventDefault(); }
      else if (key === 'Enter' || key === '=') { handleEquals(); e.preventDefault(); }
      else if (key === 'Backspace') { handleDelete(); e.preventDefault(); }
      else if (key === 'Escape') { handleAllClear(); e.preventDefault(); }
      else if (key === 'Delete') { handleAllClear(); e.preventDefault(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isFocused, expression, ans, angleMode]);

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
    const base = 'flex items-center justify-center rounded-2xl font-bold transition-all duration-150 active:scale-95 select-none cursor-pointer touch-manipulation relative overflow-hidden';
    const sizeNum = 'min-h-[56px] text-[16px]';
    const sizeFunc = 'min-h-[56px] text-[14px]';

    switch (variant) {
      case 'number':
        return `${base} ${sizeNum} bg-white hover:bg-[#edf1f7] text-[#0a1628] border border-[#dde3eb] shadow-sm`;
      case 'op':
        return `${base} ${sizeNum} bg-[#edf1f7] hover:bg-[#dde3eb] text-[#7274ED] border border-[#dde3eb] shadow-sm font-bold`;
      case 'func':
        return `${base} ${sizeFunc} bg-[#9956DE] hover:bg-[#8A4DCA] text-white shadow-md shadow-[#9956DE]/20`;
      case 'del':
        return `${base} ${sizeNum} ${label === 'AC' ? 'bg-[#FF8B8B] hover:bg-[#FF7373]' : 'bg-[#FB96BB] hover:bg-[#FA7DA9]'} text-[#8A1A1A] shadow-md shadow-red-900/10 font-bold border-none`;
      case 'equals':
        return `${base} ${sizeNum} bg-[#1FA7E1] hover:bg-[#1C96CB] text-white shadow-lg shadow-[#1FA7E1]/30 font-bold text-lg`;
      case 'shift':
        return `${base} ${sizeFunc} bg-white hover:bg-[#edf1f7] text-[#9956DE] border border-[#dde3eb] shadow-sm font-bold uppercase tracking-wider text-[11px]`;
      case 'mode':
        return `${base} ${sizeFunc} bg-white hover:bg-[#edf1f7] text-[#1FA7E1] border border-[#dde3eb] shadow-sm font-bold`;
      default:
        return `${base} ${sizeNum} bg-slate-100 text-[#0a1628] border border-slate-200`;
    }
  };

  /* ── Render ──────────────────────────────────────────────── */

  /** Custom drag handler for the title bar */
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = calcPos.x;
    const origY = calcPos.y;

    const onMove = (ev: MouseEvent) => {
      const newX = origX + (ev.clientX - startX);
      const newY = origY + (ev.clientY - startY);
      setCalcPos({ x: newX, y: newY });
    };
    const onUp = (ev: MouseEvent) => {
      isDragging.current = false;
      const final = { x: origX + (ev.clientX - startX), y: origY + (ev.clientY - startY) };
      setCalcPos(final);
      try { localStorage.setItem('mathpulse_calc_position', JSON.stringify(final)); } catch { /* noop */ }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [calcPos]);

  if (!isOpen) return null;

  const calculator = (
    <div className="flex flex-col w-full select-none">
      {/* ── Display ────────────────────────────────────────── */}
      <div className="bg-white rounded-t-2xl p-4 border border-slate-200 border-b-0">
        {/* Mode badges */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`
            text-[10px] font-bold px-2 py-0.5 rounded-full
            ${angleMode === 'DEG' 
              ? 'bg-rose-500/20 text-rose-400 border border-sky-500/30' 
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}
          `}>
            {angleMode}
          </span>
          {shiftActive && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6ED1CF]/30 text-[#1FA7E1] border border-[#1FA7E1]/40 animate-pulse">
              SHIFT
            </span>
          )}
          {alphaActive && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-indigo-500/30">
              ALPHA
            </span>
          )}
          {sympyVerifying && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 animate-pulse">
              Verifying…
            </span>
          )}
        </div>

        {/* Expression line (top) */}
        <div
          ref={expressionRef}
          className="text-right text-slate-500 text-[14px] font-mono h-6 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide"
        >
          {prevExpression || '\u00A0'}
        </div>

        {/* Result line (bottom) */}
        <div className={`
          text-right font-mono font-bold text-[32px] leading-tight h-10 overflow-hidden whitespace-nowrap
          ${isError ? 'text-red-400' : 'text-[#0a1628]'}
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
              className="mt-2 pt-2 border-t border-slate-300"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">SymPy Verified</span>
              </div>
              <p className="text-xs text-slate-500 font-mono">{sympyResult.result}</p>
              {sympyResult.latex && (
                <p className="text-[10px] text-[#5a6578] font-mono mt-0.5">LaTeX: {sympyResult.latex}</p>
              )}
              {sympyResult.steps.length > 1 && (
                <div className="mt-1 space-y-0.5">
                  {sympyResult.steps.slice(1).map((step, i) => (
                    <p key={i} className="text-[10px] text-[#5a6578]">{step}</p>
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
          w-full py-1.5 bg-slate-50 border-x border-slate-200
          text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-slate-100
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
      <div className="bg-white rounded-b-2xl p-4 border border-slate-200 border-t-0 space-y-1.5">
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
                      ? '!bg-[#6ED1CF]/35 !text-[#1FA7E1] ring-2 ring-[#1FA7E1]/35 border-[#1FA7E1]/30'
                      : ''}
                    ${btn.variant === 'shift' && btn.label === 'ALPHA' && alphaActive
                      ? '!bg-[#7274ED] !text-white ring-2 ring-[#9956DE]/50'
                      : ''}
                    ${btn.colSpan ? `col-span-${btn.colSpan}` : ''}
                    ${showShift && btn.variant === 'func'
                      ? '!bg-gradient-to-br !from-[#6ED1CF] !to-[#1FA7E1] hover:!from-[#8FE4DA] hover:!to-[#49BDEB] !text-white shadow-md shadow-[#1FA7E1]/20'
                      : ''}
                    ${btn.variant === 'op' && !['DEL', 'AC'].includes(btn.label) ? 'bg-gradient-to-br from-[#FFB356] to-[#FF8B8B] !text-white font-bold shadow-md' : ''}
                    relative
                  `}
                  title={btn.shiftLabel ? `SHIFT: ${btn.shiftLabel}` : undefined}
                >
                  {/* Shift label above */}
                  {btn.shiftLabel && !shiftActive && (
                    <span className="absolute top-1 right-1 text-[10px] leading-none bg-white/95 text-[#9956DE] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                      {btn.shiftLabel}
                    </span>
                  )}
                  <span className={showShift ? 'text-[#EAFBFF]' : ''}>
                    {displayLabel}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Keyboard shortcuts panel ──────────────────────── */}
      {showShortcuts && (
        <div className="bg-slate-50 border-t border-slate-200 text-xs text-slate-500 p-3 rounded-b-2xl">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+S</span><span>sin(</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+Shift+S</span><span>sin⁻¹(</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+C</span><span>cos(</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+Shift+C</span><span>cos⁻¹(</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+T</span><span>tan(</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+Shift+T</span><span>tan⁻¹(</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+L</span><span>log(</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+N</span><span>ln(</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+R</span><span>√(</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+P</span><span>π</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+E</span><span>e</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+2</span><span>²</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+3</span><span>³</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+^</span><span>^</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+A</span><span>Ans</span></div>
            <div className="flex justify-between"><span className="text-[#5a6578]">Alt+D</span><span>DEG/RAD</span></div>
          </div>
        </div>
      )}
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
          <div
            ref={calcWrapperRef}
            className="fixed z-50"
            style={{ top: calcPos.y, left: calcPos.x, width: 380 }}
            onClick={() => setIsFocused(true)}
          >
            {/* Header bar – draggable */}
            <div
              className="bg-gradient-to-r from-sky-600 to-sky-500 rounded-t-2xl px-4 py-2.5 flex items-center justify-between"
              style={{ cursor: 'move' }}
              onMouseDown={handleDragStart}
            >
              <div className="flex items-center gap-2">
                <GripHorizontal size={14} className="text-white/50" />
                <h3 className="text-white font-bold text-sm">Scientific Calculator</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowShortcuts(s => !s)}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors"
                  title="Keyboard shortcuts"
                >
                  <Keyboard size={14} className="text-white" />
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors"
                >
                  {isMinimized ? <ChevronUp size={14} className="text-white" /> : <ChevronDown size={14} className="text-white" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            </div>

            {/* Body – collapsible */}
            {!isMinimized && calculator}

            {/* Minimized preview */}
            {isMinimized && (
              <div className="bg-slate-50 rounded-b-2xl p-3 border border-slate-200 border-t-0">
                <p className="text-right text-[#0a1628] font-mono font-bold text-lg">{result}</p>
              </div>
            )}
          </div>
      )}
    </AnimatePresence>
  );
};

export default ScientificCalculator;
