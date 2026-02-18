import React from 'react';

/**
 * ChatMarkdown — lightweight Markdown → React renderer for AI chat messages.
 *
 * Supports:
 *  - Headings (# – ###)
 *  - Bold (**text** / __text__)
 *  - Italic (*text* / _text_)
 *  - Bold+Italic (***text***)
 *  - Inline code (`code`)
 *  - Fenced code blocks (```…```)
 *  - Ordered & unordered lists (including nested)
 *  - Blockquotes (> …)
 *  - Horizontal rules (---, ***, ___)
 *  - Links [text](url)
 *  - Tables (GFM)
 *  - Line breaks
 */

interface ChatMarkdownProps {
  children: string;
}

/* ─── Inline parser ────────────────────────────────────────── */

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Regex handles: bold+italic, bold, italic, inline code, links
  const inlineRx =
    /(\*\*\*(.+?)\*\*\*)|(\*\*(.+?)\*\*)|(__(.+?)__)|(\*(.+?)\*)|(_([^_]+?)_)|(`([^`]+?)`)|(\[([^\]]+?)\]\(([^)]+?)\))/g;

  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRx.exec(text)) !== null) {
    // Push any text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // ***bold+italic***
      nodes.push(
        <strong key={key++}>
          <em>{parseInline(match[2])}</em>
        </strong>,
      );
    } else if (match[3]) {
      // **bold**
      nodes.push(<strong key={key++}>{parseInline(match[4])}</strong>);
    } else if (match[5]) {
      // __bold__
      nodes.push(<strong key={key++}>{parseInline(match[6])}</strong>);
    } else if (match[7]) {
      // *italic*
      nodes.push(<em key={key++}>{parseInline(match[8])}</em>);
    } else if (match[9]) {
      // _italic_
      nodes.push(<em key={key++}>{parseInline(match[10])}</em>);
    } else if (match[11]) {
      // `code`
      nodes.push(<code key={key++}>{match[12]}</code>);
    } else if (match[13]) {
      // [text](url)
      nodes.push(
        <a key={key++} href={match[15]} target="_blank" rel="noopener noreferrer">
          {match[14]}
        </a>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

/* ─── Block parser ─────────────────────────────────────────── */

interface ParsedBlock {
  type:
    | 'heading'
    | 'codeblock'
    | 'blockquote'
    | 'hr'
    | 'table'
    | 'ul'
    | 'ol'
    | 'paragraph';
  level?: number; // heading level
  lang?: string; // code block language
  content: string;
  rows?: string[][]; // table rows
  headers?: string[]; // table headers
  items?: string[]; // list items
}

function parseBlocks(markdown: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ──
    const codeMatch = line.match(/^```(\w*)/);
    if (codeMatch) {
      const lang = codeMatch[1] || '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: 'codeblock', lang, content: codeLines.join('\n') });
      continue;
    }

    // ── Horizontal rule ──
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr', content: '' });
      i++;
      continue;
    }

    // ── Headings ──
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // ── Blockquote ──
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: 'blockquote', content: quoteLines.join('\n') });
      continue;
    }

    // ── Table ──
    if (
      i + 1 < lines.length &&
      line.includes('|') &&
      /^\|?\s*[-:]+[-| :]*$/.test(lines[i + 1])
    ) {
      const parseRow = (r: string) =>
        r
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseRow(line);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', content: '', headers, rows });
      continue;
    }

    // ── Unordered list ──
    if (/^[\s]*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', content: '', items });
      continue;
    }

    // ── Ordered list ──
    if (/^[\s]*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*\d+[.)]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', content: '', items });
      continue;
    }

    // ── Empty line ──
    if (line.trim() === '') {
      i++;
      continue;
    }

    // ── Paragraph (default) ──
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('> ') &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+[.)]\s+/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', content: paraLines.join('\n') });
  }

  return blocks;
}

/* ─── React renderer ───────────────────────────────────────── */

const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ children }) => {
  if (!children || typeof children !== 'string') {
    return null;
  }

  const blocks = parseBlocks(children);

  return (
    <div className="chat-markdown">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const level = Math.min(block.level || 1, 6);
            return React.createElement(
              `h${level}`,
              { key: idx },
              ...parseInline(block.content),
            );
          }
          case 'codeblock':
            return (
              <pre key={idx}>
                <code>{block.content}</code>
              </pre>
            );
          case 'blockquote':
            return <blockquote key={idx}>{parseInline(block.content)}</blockquote>;
          case 'hr':
            return <hr key={idx} />;
          case 'table':
            return (
              <table key={idx}>
                <thead>
                  <tr>
                    {block.headers?.map((h, hi) => (
                      <th key={hi}>{parseInline(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows?.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci}>{parseInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case 'ul':
            return (
              <ul key={idx}>
                {block.items?.map((item, li) => (
                  <li key={li}>{parseInline(item)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx}>
                {block.items?.map((item, li) => (
                  <li key={li}>{parseInline(item)}</li>
                ))}
              </ol>
            );
          case 'paragraph':
          default:
            return <p key={idx}>{parseInline(block.content)}</p>;
        }
      })}
    </div>
  );
};

export default ChatMarkdown;
