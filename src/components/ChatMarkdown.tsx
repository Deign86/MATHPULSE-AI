import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeChatMarkdownForRender } from '../utils/chatMessageFormatting';

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
 *  - Line breaks
 *  - LaTeX math: \(...\) for inline, $$...$$ for display
 */

interface ChatMarkdownProps {
  children: string;
}

let katexStylesPromise: Promise<unknown> | null = null;

const ensureKatexStyles = () => {
  if (!katexStylesPromise) {
    katexStylesPromise = import('katex/dist/katex.min.css');
  }

  return katexStylesPromise;
};

const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ children }) => {
  useEffect(() => {
    void ensureKatexStyles();
  }, []);

  if (!children || typeof children !== 'string') {
    return null;
  }

  const normalizedMarkdown = normalizeChatMarkdownForRender(children);

  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {children}
            </a>
          ),
          code: (props: any) => {
            const { inline, className, children, ...rest } = props;
            return (
              <code
                className={`${
                  inline
                    ? 'bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm'
                    : 'block bg-gray-100 dark:bg-gray-900 rounded p-3 overflow-x-auto my-2'
                } ${className || ''}`}
                {...rest}
              >
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-2">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => <h1 className="text-2xl font-bold my-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold my-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold my-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-base font-bold my-2">{children}</h4>,
          h5: ({ children }) => <h5 className="text-sm font-bold my-2">{children}</h5>,
          h6: ({ children }) => <h6 className="text-xs font-bold my-2">{children}</h6>,
          ul: ({ children }) => <ul className="list-disc list-inside my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside my-2">{children}</ol>,
          li: ({ children }) => <li className="ml-2">{children}</li>,
          hr: () => <hr className="my-4 border-t border-gray-300 dark:border-gray-600" />,
          p: ({ children }) => <p className="my-1">{children}</p>,
        }}
      >
        {normalizedMarkdown}
      </ReactMarkdown>
    </div>
  );
};

export default ChatMarkdown;
