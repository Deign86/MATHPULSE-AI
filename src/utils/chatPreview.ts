import { normalizeChatMarkdownForRender } from './chatMessageFormatting';

const DEFAULT_PREVIEW_MAX_LENGTH = 80;

/**
 * Convert markdown-heavy chat content to compact plain text suitable for list previews.
 */
export function toChatPreviewText(input: string, maxLength: number = DEFAULT_PREVIEW_MAX_LENGTH): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const plainText = normalizeChatMarkdownForRender(input)
    // Preserve label text while removing markdown link wrappers.
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\((https?:\/\/[^)\s]+)\)/g, '')
    .replace(/```(?:[a-zA-Z0-9_-]+\n)?([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\$\$([\s\S]+?)\$\$/g, '$1')
    .replace(/\$([^$\n]+)\$/g, '$1')
    .replace(/\\\(([\s\S]+?)\\\)/g, '$1')
    .replace(/\\\[([\s\S]+?)\\\]/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/^\s{0,3}(?:[-*_]\s?){3,}$/gm, ' ')
    .replace(/\\boxed\{([^{}]+)\}/g, '$1')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)')
    .replace(/\\(?:cdot|times)/g, '*')
    .replace(/\\(alpha|beta|gamma|delta|theta|pi|sum|int|pm|mp|leq|geq|neq|approx)\b/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\*{2,}|_{2,}|~{2,}/g, '')
    .replace(/`+/g, '')
    .replace(/\|/g, ' ')
    .replace(/([A-Za-z0-9])-\s+(?=[A-Za-z])/g, '$1 ')
    .replace(/:\s*(?=\S)/g, ': ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return plainText.slice(0, maxLength);
}
