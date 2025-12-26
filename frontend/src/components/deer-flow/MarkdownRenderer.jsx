import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const MarkdownRenderer = ({ content }) => {
  return (
    <ReactMarkdown
      className="prose prose-slate max-w-none prose-sm 
        prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
        prose-p:text-slate-600 prose-p:leading-relaxed
        prose-strong:text-slate-900 prose-code:text-blue-600
        prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-100"
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={oneLight}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
