import React, { useState, useMemo } from 'react';
import { View, useColorScheme, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { KATEX_CSS, KATEX_JS } from './katexAssets';

export interface MathTextProps {
  content: string;
  displayMode?: boolean;
  colorScheme?: 'light' | 'dark';
  className?: string;
  style?: ViewStyle;
}

const LIGHT_TEXT = '#0a1628';
const DARK_TEXT = '#f0f7ff';
const LIGHT_BG = '#ffffff';
const DARK_BG = '#0a1628';

const DEFAULT_INLINE_SIZE = 16;
const DEFAULT_DISPLAY_SIZE = 24;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\\/g, '\\\\');
}

export function MathText({
  content,
  displayMode = false,
  colorScheme: propColorScheme,
  className,
  style,
}: MathTextProps) {
  const systemColorScheme = useColorScheme();
  const effectiveColorScheme = propColorScheme ?? (systemColorScheme === 'dark' ? 'dark' : 'light');
  const isDark = effectiveColorScheme === 'dark';

  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const fontSize = displayMode ? DEFAULT_DISPLAY_SIZE : DEFAULT_INLINE_SIZE;
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const bgColor = isDark ? DARK_BG : LIGHT_BG;

  const html = useMemo(() => {
    const escapedContent = escapeHtml(content);
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${KATEX_CSS}
body {
  margin: 0;
  padding: 4px;
  font-family: 'Nunito', sans-serif;
  color: ${textColor};
  background: ${bgColor};
  font-size: ${fontSize}px;
}
.katex-display { margin: 0; }
#math-container { display: inline-block; }
</style>
</head>
<body>
<div id="math-container"><span id="math"></span></div>
<script>
${KATEX_JS}
</script>
<script>
try {
  katex.render('${escapedContent}', document.getElementById('math'), {
    displayMode: ${displayMode},
    throwOnError: false,
    strict: false
  });
  const el = document.getElementById('math-container');
  const rect = el.getBoundingClientRect();
  window.ReactNativeWebView.postMessage(JSON.stringify({
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height)
  }));
} catch (e) {
  window.ReactNativeWebView.postMessage(JSON.stringify({
    error: e.message,
    width: 0,
    height: 0
  }));
}
</script>
</body>
</html>`;
  }, [content, displayMode, textColor, bgColor, fontSize]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        width: number;
        height: number;
        error?: string;
      };
      if (data.error) {
        console.warn('MathText KaTeX error:', data.error);
        return;
      }
      setDimensions({ width: data.width, height: data.height });
    } catch {
      // Ignore malformed messages
    }
  };

  const webViewHeight = dimensions?.height ?? (displayMode ? DEFAULT_DISPLAY_SIZE * 2 : DEFAULT_INLINE_SIZE * 1.5);
  const webViewWidth = dimensions?.width ?? '100%';

  return (
    <View className={className} style={style}>
      <WebView
        source={{ html }}
        onMessage={handleMessage}
        style={{
          width: webViewWidth,
          height: webViewHeight,
          backgroundColor: 'transparent',
        }}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}
