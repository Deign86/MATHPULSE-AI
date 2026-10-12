import { describe, expect, it } from 'vitest';
import { latexToPlainText } from './latexToPlainText';

describe('latexToPlainText', () => {
  it.each([
    ['$G = r \\times d$', 'G = r × d'],
    ['$\\frac{1}{2}$', '1/2'],
    ['$$\\text{Profit} = S - C$$', 'Profit = S - C'],
    ['\\[ a \\cdot b \\div c \\pm d \\]', 'a · b ÷ c ± d'],
    ['\\(x \\le 3\\) and \\(y \\geq 2\\)', 'x <= 3 and y >= 2'],
    ['$a \\neq b \\approx c$', 'a != b ~= c'],
    ['$\\pi r^2 + \\theta$', 'pi r² + theta'],
    ['$x \\to \\infty$', 'x -> infinity'],
    ['$\\frac{a+1}{b}$', '(a+1)/b'],
    ['$\\frac{\\sqrt{x}}{2}$', 'sqrt(x)/2'],
    ['$\\sqrt[3]{x}$', 'x^(1/3)'],
    ['$x^3 + y^{n+1} + z^{2}$', 'x³ + y^(n+1) + z²'],
    ['$x_1 + x_{ij}$', 'x1 + x_ij'],
    ['$\\left( \\frac{x}{y} \\right)$', '( x/y )'],
    ['$50\\% \\, \\ldots \\{a\\}$', '50%   ... {a}'],
    ['$\\mathbf{v} = \\mathrm{ab}$', 'v = ab'],
    ['$\\sin x \\alpha$', 'sin x alpha'],
  ])('converts %s', (input, expected) => {
    expect(latexToPlainText(input)).toBe(expected);
  });

  it('converts math embedded in prose', () => {
    expect(latexToPlainText('Gross income $G = r \\times d$ per month')).toBe(
      'Gross income G = r × d per month',
    );
  });

  it('leaves currency untouched', () => {
    expect(latexToPlainText('Pay $500 per week plus $20 fee')).toBe('Pay $500 per week plus $20 fee');
  });

  it('maps unicode math symbols Helvetica cannot render to ASCII', () => {
    expect(latexToPlainText('√9 ≤ 4 ≠ π → ∞')).toBe('sqrt9 <= 4 != pi -> infinity');
  });

  it('returns plain text unchanged', () => {
    expect(latexToPlainText('Hello world')).toBe('Hello world');
  });
});
