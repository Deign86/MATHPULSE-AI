import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { MathText } from '../components/MathText';

// Mock the WebView synchronously (no setTimeout) so the rendered tree is
// fully resolved by the time TestRenderer.create() returns. The real WebView
// sends a postMessage with dimensions after layout; for unit tests we only
// need to verify the HTML payload and prop wiring, not the runtime message
// round-trip (that's covered by manual QA on-device).
vi.mock('react-native-webview', () => ({
  WebView: (props: { source: { html: string } }) => {
    return React.createElement('WebView', {
      'data-html': props.source?.html ?? '',
    });
  },
}));

const mockUseColorScheme = vi.fn();

vi.mock('react-native', () => ({
  View: (props: React.PropsWithChildren<{ className?: string; style?: Record<string, unknown> }>) => {
    return React.createElement('View', props, props.children);
  },
  useColorScheme: () => mockUseColorScheme(),
}));

vi.mock('../components/katexAssets', () => ({
  KATEX_CSS: '/* mock-katex-css */',
  KATEX_JS: '/* mock-katex-js */',
}));

function renderMathText(props: { content: string; displayMode?: boolean; colorScheme?: 'light' | 'dark'; className?: string }) {
  let tree: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(React.createElement(MathText, props));
  });
  return tree!;
}

describe('MathText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
  });

  it('renders inline math by default', () => {
    const tree = renderMathText({ content: 'E = mc^2' });
    const webview = tree.root.findByType('WebView' as never);
    const html = (webview.props as { 'data-html': string })['data-html'];
    expect(html).toContain('E = mc^2');
    expect(html).toContain('displayMode: false');
    expect(html).toContain('font-size: 16px');
    expect(html).toContain('color: #0a1628');
  });

  it('renders display math with larger font', () => {
    const tree = renderMathText({ content: '\\sum_{i=1}^n i', displayMode: true });
    const webview = tree.root.findByType('WebView' as never);
    const html = (webview.props as { 'data-html': string })['data-html'];
    expect(html).toContain('displayMode: true');
    expect(html).toContain('font-size: 24px');
  });

  it('uses dark theme when system is in dark mode', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const tree = renderMathText({ content: 'a^2 + b^2 = c^2' });
    const webview = tree.root.findByType('WebView' as never);
    const html = (webview.props as { 'data-html': string })['data-html'];
    expect(html).toContain('color: #f0f7ff');
    expect(html).toContain('background: #0a1628');
  });

  it('allows explicit colorScheme prop to override system', () => {
    const tree = renderMathText({
      content: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
      colorScheme: 'dark',
    });
    const webview = tree.root.findByType('WebView' as never);
    const html = (webview.props as { 'data-html': string })['data-html'];
    expect(html).toContain('color: #f0f7ff');
    expect(html).toContain('background: #0a1628');
  });

  it('escapes HTML special characters in content', () => {
    const tree = renderMathText({ content: 'a < b & c > d' });
    const webview = tree.root.findByType('WebView' as never);
    const html = (webview.props as { 'data-html': string })['data-html'];
    expect(html).toContain('a &lt; b &amp; c &gt; d');
  });

  it('includes inlined KaTeX assets with no external network references', () => {
    const tree = renderMathText({ content: '\\pi' });
    const webview = tree.root.findByType('WebView' as never);
    const html = (webview.props as { 'data-html': string })['data-html'];
    expect(html).toContain('/* mock-katex-css */');
    expect(html).toContain('/* mock-katex-js */');
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('applies className to outer View', () => {
    const tree = renderMathText({ content: '\\int_0^1 x dx', className: 'my-math-class' });
    const view = tree.root.findByType('View' as never);
    const viewProps = view.props as { className?: string };
    expect(viewProps.className).toBe('my-math-class');
  });

  it('renders the component without crashing for a simple expression', () => {
    const tree = renderMathText({ content: 'y = mx + b' });
    expect(tree.toJSON()).toBeTruthy();
  });
});
