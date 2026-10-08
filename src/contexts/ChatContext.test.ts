// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { generateTitleFromMessages } from './ChatContext';

describe('generateTitleFromMessages', () => {
  it('titles a welcome-only session "New Chat"', () => {
    expect(generateTitleFromMessages([])).toBe('New Chat');
    expect(generateTitleFromMessages([{ sender: 'ai', text: 'Hi! I am L.O.L.I.' }])).toBe('New Chat');
  });

  it('does not read "sin" or "cos" inside other words', () => {
    expect(generateTitleFromMessages([{ sender: 'user', text: 'Can you help me using fractions?' }])).toBe('Can you help me using fractions?');
    expect(generateTitleFromMessages([{ sender: 'user', text: 'How do I find the cost using a sheet?' }])).toBe('How do I find the cost using a sheet?');
  });

  it('still recognises whole-word topics', () => {
    expect(generateTitleFromMessages([{ sender: 'user', text: 'What is sin 30?' }])).toBe('Trigonometry Help');
    expect(generateTitleFromMessages([{ sender: 'user', text: 'Find the area of a circle' }])).toBe('Geometry - Area & Perimeter');
    expect(generateTitleFromMessages([{ sender: 'ai', text: 'Hi!' }, { sender: 'user', text: 'Solve for x: 2x + 1 = 5' }])).toBe('Algebra Problem Solving');
  });

  it('truncates long untopical questions', () => {
    const text = 'Could you please walk me through this homework question from yesterday?';
    expect(generateTitleFromMessages([{ sender: 'user', text }])).toBe(text.slice(0, 40) + '...');
  });
});
