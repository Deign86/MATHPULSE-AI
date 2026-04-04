import { describe, expect, it } from 'vitest';
import { isMathRelatedQuery, MATH_ONLY_REFUSAL_MESSAGE } from './mathScope';

describe('isMathRelatedQuery', () => {
  it('accepts direct algebra prompts', () => {
    expect(isMathRelatedQuery('Solve for x in 2x + 3 = 7')).toBe(true);
  });

  it('accepts calculus terminology prompts', () => {
    expect(isMathRelatedQuery('Find the derivative of x^2 + 3x')).toBe(true);
  });

  it('rejects greetings without math context', () => {
    expect(isMathRelatedQuery('hi')).toBe(false);
  });

  it('rejects general knowledge prompts', () => {
    expect(isMathRelatedQuery('Who is Elon Musk?')).toBe(false);
  });

  it('rejects ambiguous non-math requests', () => {
    expect(isMathRelatedQuery('Can you help me?')).toBe(false);
  });
});

describe('MATH_ONLY_REFUSAL_MESSAGE', () => {
  it('matches the required strict refusal sentence', () => {
    expect(MATH_ONLY_REFUSAL_MESSAGE).toBe(
      'I’m sorry, but I can only answer math-related questions. Please ask me something related to mathematics.',
    );
  });
});
