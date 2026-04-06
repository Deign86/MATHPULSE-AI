import { describe, expect, it } from 'vitest';
import {
  getScopeBoundaryResponse,
  GREETING_RESPONSES,
  isMathRelatedQuery,
  NON_MATH_REDIRECT_RESPONSES,
  THANKS_RESPONSES,
} from './mathScope';

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

describe('getScopeBoundaryResponse', () => {
  it('returns null for math-related input', () => {
    expect(getScopeBoundaryResponse('Solve for x in 2x + 3 = 7')).toBeNull();
  });

  it('allows minimal follow-up when assistant invited continuation', () => {
    const response = getScopeBoundaryResponse('go', {
      history: [
        { role: 'assistant', content: 'Great work. Shall we continue?' },
      ],
    });
    expect(response).toBeNull();
  });

  it('allows punctuated follow-up token when assistant invited continuation', () => {
    const withContext = {
      history: [{ role: 'assistant', content: 'Would you like to continue?' }],
    };
    expect(getScopeBoundaryResponse('ok,', withContext)).toBeNull();
    expect(getScopeBoundaryResponse('ok.', withContext)).toBeNull();
    expect(getScopeBoundaryResponse('go!', withContext)).toBeNull();
  });

  it('keeps follow-up token blocked without continuation context', () => {
    const response = getScopeBoundaryResponse('go');
    expect(response).not.toBeNull();
    expect(NON_MATH_REDIRECT_RESPONSES).toContain(response as string);
  });

  it('keeps punctuated follow-up token blocked without continuation context', () => {
    for (const token of ['ok,', 'ok.', 'go!']) {
      const response = getScopeBoundaryResponse(token);
      expect(response).not.toBeNull();
      expect(NON_MATH_REDIRECT_RESPONSES).toContain(response as string);
    }
  });

  it('still redirects explicit non-math prompts with continuation context', () => {
    const response = getScopeBoundaryResponse('Who is Elon Musk?', {
      history: [
        { role: 'assistant', content: 'Would you like to continue?' },
      ],
    });
    expect(response).not.toBeNull();
    expect(NON_MATH_REDIRECT_RESPONSES).toContain(response as string);
  });

  it('returns a friendly greeting response', () => {
    const response = getScopeBoundaryResponse('hello');
    expect(response).not.toBeNull();
    expect(GREETING_RESPONSES).toContain(response as string);
  });

  it('returns a friendly thanks response', () => {
    const response = getScopeBoundaryResponse('thanks for the help');
    expect(response).not.toBeNull();
    expect(THANKS_RESPONSES).toContain(response as string);
  });

  it('returns a friendly non-math redirect response', () => {
    const response = getScopeBoundaryResponse('Who is Elon Musk?');
    expect(response).not.toBeNull();
    expect(NON_MATH_REDIRECT_RESPONSES).toContain(response as string);
  });

  it('returns a redirect response for empty input', () => {
    const response = getScopeBoundaryResponse('');
    expect(response).not.toBeNull();
    expect(NON_MATH_REDIRECT_RESPONSES).toContain(response as string);
  });
});
