import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { formatAssistantResponseForDisplay } from '../utils/chatMessageFormatting';

/**
 * ChatMarkdown — Markdown → React renderer for AI chat messages with LaTeX math support.
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
 *  - LaTeX math: \(...\) for inline, $$...$$ for display
 */

interface ChatMarkdownProps {
  children: string;
}

const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ children }) => {
  if (!children || typeof children !== 'string') {
    return null;
  }

  const formattedMarkdown = formatAssistantResponseForDisplay(children);

  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="chat-markdown-link">
              {children}
            </a>
          ),
          code: (props: any) => {
            const { inline, className, children, ...rest } = props;
            const codeText = String(children ?? '').replace(/\n$/, '');

            if (inline) {
              return (
                <code className="chat-inline-code" {...rest}>
                  {codeText}
                </code>
              );
            }

            return (
              <code
                className={`chat-code-block ${className || ''}`.trim()}
                {...rest}
              >
                {codeText}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="chat-markdown-table-wrap">
              <table>{children}</table>
            </div>
          ),
          blockquote: ({ children }) => (
            <blockquote className="chat-blockquote">
              {children}
            </blockquote>
          ),
          pre: ({ children }) => <pre>{children}</pre>,
        }}
      >
        {formattedMarkdown}
      </ReactMarkdown>
    </div>
  );
};

export default ChatMarkdown;
