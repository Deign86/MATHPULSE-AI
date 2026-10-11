import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeChatMarkdownForRender } from '../utils/chatMessageFormatting';

/**
 * AiText — the one renderer for any string that came out of the model and is
 * shown outside the chat bubble: hints, explanations, feedback, summaries,
 * insights, recommendations, intervention steps.
 *
 * It runs the same normalisation as ChatMarkdown (think-tag removal, `\(..\)`
 * → `$..$`, bare TeX wrapping, literal `\n`) and then renders Markdown with
 * KaTeX, so `**bold**`, lists and formulas never leak through as raw markup.
 *
 * `inline` renders paragraphs as fragments so the result can live inside a
 * `<p>`, `<span>`, `<li>` or button label without invalid DOM nesting.
 */
interface AiTextProps {
  children: string | null | undefined;
  inline?: boolean;
  className?: string;
}

let katexStylesPromise: Promise<unknown> | null = null;
const ensureKatexStyles = () => {
  if (!katexStylesPromise) {
    katexStylesPromise = import('katex/dist/katex.min.css');
  }
  return katexStylesPromise;
};

const inlineComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  h1: ({ children }: { children?: React.ReactNode }) => <strong>{children}</strong>,
  h2: ({ children }: { children?: React.ReactNode }) => <strong>{children}</strong>,
  h3: ({ children }: { children?: React.ReactNode }) => <strong>{children}</strong>,
  h4: ({ children }: { children?: React.ReactNode }) => <strong>{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <span className="ai-text-inline-list">{children}</span>,
  ol: ({ children }: { children?: React.ReactNode }) => <span className="ai-text-inline-list">{children}</span>,
  li: ({ children }: { children?: React.ReactNode }) => <span className="ai-text-inline-item">{children} </span>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{children}</a>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-black/5 dark:bg-white/10 px-1 py-0.5 text-[0.9em]">{children}</code>
  ),
};

const blockComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{children}</a>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => <p className="font-bold my-1">{children}</p>,
  h2: ({ children }: { children?: React.ReactNode }) => <p className="font-bold my-1">{children}</p>,
  h3: ({ children }: { children?: React.ReactNode }) => <p className="font-semibold my-1">{children}</p>,
  h4: ({ children }: { children?: React.ReactNode }) => <p className="font-semibold my-1">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-5 my-1 space-y-0.5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-5 my-1 space-y-0.5">{children}</ol>,
  p: ({ children }: { children?: React.ReactNode }) => <p className="my-1">{children}</p>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-black/5 dark:bg-white/10 px-1 py-0.5 text-[0.9em]">{children}</code>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-current/30 pl-3 my-1 opacity-90">{children}</blockquote>
  ),
};

const AiText: React.FC<AiTextProps> = ({ children, inline = false, className }) => {
  useEffect(() => {
    void ensureKatexStyles();
  }, []);

  if (typeof children !== 'string' || !children.trim()) {
    return null;
  }

  const normalized = normalizeChatMarkdownForRender(children);
  if (!normalized) {
    return null;
  }

  const Wrapper = inline ? 'span' : 'div';
  return (
    <Wrapper className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={inline ? inlineComponents : blockComponents}
      >
        {normalized}
      </ReactMarkdown>
    </Wrapper>
  );
};

export default AiText;
