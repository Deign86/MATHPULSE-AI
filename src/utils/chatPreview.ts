const DEFAULT_PREVIEW_MAX_LENGTH = 80;

/**
 * Convert markdown-heavy chat content to compact plain text suitable for list previews.
 */
export function toChatPreviewText(input: string, maxLength: number = DEFAULT_PREVIEW_MAX_LENGTH): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const plainText = input
    // Preserve label text while removing markdown link wrappers.
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
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
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return plainText.slice(0, maxLength);
}
