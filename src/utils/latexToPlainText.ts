// Converts LaTeX math in AI text to plain text that jsPDF's WinAnsi Helvetica can render.

const COMMAND_TEXT = new Map([
  ['times', '×'],
  ['cdot', '·'],
  ['div', '÷'],
  ['pm', '±'],
  ['le', '<='],
  ['leq', '<='],
  ['ge', '>='],
  ['geq', '>='],
  ['neq', '!='],
  ['ne', '!='],
  ['approx', '~='],
  ['infty', 'infinity'],
  ['to', '->'],
  ['rightarrow', '->'],
  ['leftarrow', '<-'],
  ['left', ''],
  ['right', ''],
  ['quad', ' '],
  ['qquad', ' '],
  ['ldots', '...'],
  ['cdots', '...'],
  ['dots', '...'],
]);

const UNICODE_TEXT = new Map([
  ['√', 'sqrt'],
  ['≤', '<='],
  ['≥', '>='],
  ['≠', '!='],
  ['≈', '~='],
  ['π', 'pi'],
  ['θ', 'theta'],
  ['∞', 'infinity'],
  ['→', '->'],
  ['←', '<-'],
]);

const SUPERSCRIPT_DIGIT = new Map([
  ['1', '¹'],
  ['2', '²'],
  ['3', '³'],
]);

const BRACE_OPEN = '\u0001';
const BRACE_CLOSE = '\u0002';
const SINGLE_TOKEN = /^\\?[\w.^]+$/;
const ALREADY_WRAPPED = /^\([^()]*\)$|^\w+\([^()]*\)$/;

const wrapIfCompound = (part: string): string => {
  const trimmed = part.trim();
  return SINGLE_TOKEN.test(trimmed) || ALREADY_WRAPPED.test(trimmed) ? trimmed : `(${trimmed})`;
};

const FRAC = /\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/;
const SQRT = /\\sqrt\s*(?:\[([^\]]*)\])?\s*\{([^{}]*)\}/;
const WRAPPER = /\\(?:text|textbf|textit|mathrm|mathbf|mathit|operatorname|boldsymbol)\s*\{([^{}]*)\}/;

const replaceUntilStable = (source: string, replacer: (current: string) => string): string => {
  let current = source;
  for (let pass = 0; pass < 50; pass += 1) {
    const next = replacer(current);
    if (next === current) return current;
    current = next;
  }
  return current;
};

const texToPlain = (tex: string): string => {
  let out = replaceUntilStable(tex, (current) => current.replace(WRAPPER, '$1'));
  out = replaceUntilStable(out, (current) =>
    current
      .replace(SQRT, (_match, root: string | undefined, radicand: string) =>
        root ? `${wrapIfCompound(radicand)}^(1/${root.trim()})` : `sqrt(${radicand.trim()})`,
      )
      .replace(FRAC, (_match, numerator: string, denominator: string) =>
        `${wrapIfCompound(numerator)}/${wrapIfCompound(denominator)}`,
      ),
  );
  out = out
    .replace(/\\\{/g, BRACE_OPEN)
    .replace(/\\\}/g, BRACE_CLOSE)
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\\\/g, ' ')
    .replace(/\\[,;: ]/g, ' ')
    .replace(/\\!/g, '')
    .replace(/\\([a-zA-Z]+)/g, (_match, name: string) => COMMAND_TEXT.get(name) ?? name)
    .replace(/\^\{([^{}]*)\}|\^(\w)/g, (_match, braced: string | undefined, bare: string | undefined) => {
      const exponent = (braced ?? bare ?? '').trim();
      const digit = SUPERSCRIPT_DIGIT.get(exponent);
      if (digit) return digit;
      return /^\w$/.test(exponent) ? `^${exponent}` : `^(${exponent})`;
    })
    .replace(/_\{([^{}]*)\}|_(\w)/g, (_match, braced: string | undefined, bare: string | undefined) =>
      braced === undefined ? (bare ?? '') : `_${braced.trim()}`,
    )
    .replace(/[{}]/g, '')
    .replace(new RegExp(BRACE_OPEN, 'g'), '{')
    .replace(new RegExp(BRACE_CLOSE, 'g'), '}');
  return out.trim();
};

const isDollarMath = (inner: string): boolean => {
  if (/^\d[\d,.]*\s+[A-Za-z]{2,}/.test(inner)) return false;
  return /[\\^_=]/.test(inner) || !/\s/.test(inner);
};

export function latexToPlainText(text: string): string {
  const converted = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_match, inner: string) => texToPlain(inner))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_match, inner: string) => texToPlain(inner))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_match, inner: string) => texToPlain(inner))
    .replace(/\$(?!\s)([^$\n]*?[^\s$])\$/g, (match, inner: string) =>
      isDollarMath(inner) ? texToPlain(inner) : match,
    );
  const bareCommands = /\\[a-zA-Z]/.test(converted) ? texToPlain(converted) : converted;
  return bareCommands.replace(/[√≤≥≠≈πθ∞→←]/g, (symbol) => UNICODE_TEXT.get(symbol) ?? symbol);
}
