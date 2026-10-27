import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="space-y-3 font-normal text-[15px] sm:text-[16px] leading-relaxed text-[#29263A]">
      {parseMarkdown(content)}
    </div>
  );
};

function parseMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  // Split by code blocks ```...```
  const codeBlockRegex = /```([a-zA-Z0-9_\-\.]*)\n([\s\S]*?)```/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      const textBefore = text.slice(lastIndex, matchIndex);
      elements.push(...renderTextParagraphs(textBefore, `tb_${lastIndex}`));
    }

    const language = match[1] || 'code';
    const code = match[2];
    elements.push(
      <CodeBlock key={`cb_${matchIndex}`} language={language} code={code} />
    );

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    elements.push(...renderTextParagraphs(remainingText, `tb_${lastIndex}`));
  }

  return elements;
}

function renderTextParagraphs(text: string, keyPrefix: string): React.ReactNode[] {
  const blocks = text.split(/\n\s*\n/);
  return blocks
    .map((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Header 1 (#)
      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={`${keyPrefix}_h1_${idx}`} className="text-xl sm:text-2xl font-bold text-[#29263A] pt-2 pb-1 border-b border-[#E9E4F5]">
            {renderInline(trimmed.slice(2))}
          </h1>
        );
      }
      // Header 2 (##)
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={`${keyPrefix}_h2_${idx}`} className="text-lg sm:text-xl font-semibold text-[#29263A] pt-2 pb-1">
            {renderInline(trimmed.slice(3))}
          </h2>
        );
      }
      // Header 3 (###)
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={`${keyPrefix}_h3_${idx}`} className="text-base sm:text-lg font-medium text-[#7C3AED] pt-1">
            {renderInline(trimmed.slice(4))}
          </h3>
        );
      }
      // Blockquote (> )
      if (trimmed.startsWith('> ')) {
        const quoteContent = trimmed
          .split('\n')
          .map((line) => line.replace(/^>\s?/, ''))
          .join('\n');
        return (
          <blockquote key={`${keyPrefix}_bq_${idx}`} className="border-l-3 border-[#C4B5FD] pl-3 py-1 text-[#4B485E] italic bg-[#F8F6FF] rounded-r-xl border border-y-0 border-r-0">
            {renderInline(quoteContent)}
          </blockquote>
        );
      }
      // Bullet list items
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const lines = trimmed.split('\n');
        return (
          <ul key={`${keyPrefix}_ul_${idx}`} className="list-disc list-outside pl-5 space-y-1 text-[#29263A]">
            {lines.map((line, liIdx) => {
              const itemText = line.replace(/^[\-\*]\s+/, '');
              return <li key={liIdx}>{renderInline(itemText)}</li>;
            })}
          </ul>
        );
      }
      // Numbered list
      if (/^\d+\.\s/.test(trimmed)) {
        const lines = trimmed.split('\n');
        return (
          <ol key={`${keyPrefix}_ol_${idx}`} className="list-decimal list-outside pl-5 space-y-1 text-[#29263A]">
            {lines.map((line, liIdx) => {
              const itemText = line.replace(/^\d+\.\s+/, '');
              return <li key={liIdx}>{renderInline(itemText)}</li>;
            })}
          </ol>
        );
      }

      // Regular paragraph
      return (
        <p key={`${keyPrefix}_p_${idx}`} className="leading-relaxed text-[#29263A]">
          {renderInline(trimmed)}
        </p>
      );
    })
    .filter(Boolean) as React.ReactNode[];
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|https?:\/\/[^\s]+)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`inline_${match.index}`}
          className="font-mono text-[13px] px-1.5 py-0.5 rounded-md bg-[#EDE9FE] text-[#6D28D9] border border-[#E9E4F5]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`bold_${match.index}`} className="font-semibold text-[#29263A]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`italic_${match.index}`} className="italic text-[#4B485E]">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('http')) {
      parts.push(
        <a
          key={`link_${match.index}`}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6D28D9] underline hover:text-[#4338CA] break-all font-medium"
        >
          {token}
        </a>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden bg-[#F8F6FF] border border-[#E9E4F5] shadow-xs">
      <div className="px-3.5 py-2 bg-[#FFFFFF] border-b border-[#E9E4F5] flex items-center justify-between text-xs text-[#858398]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FECDD3]"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#BFDBFE]"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#C4B5FD]"></span>
          <span className="font-mono text-[#29263A] ml-1.5 font-medium">{language || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#29263A] transition-colors font-mono text-[11px] border border-[#E9E4F5]"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span className="text-[#7C3AED] font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 font-mono text-[13px] leading-relaxed overflow-x-auto text-[#29263A] selection:bg-[#C4B5FD]">
        <code>{highlightSyntax(code.trimEnd())}</code>
      </pre>
    </div>
  );
};

function highlightSyntax(code: string): React.ReactNode {
  const lines = code.split('\n');

  return lines.map((line, idx) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
      return (
        <div key={idx} className="text-[#858398] italic">
          {line}
        </div>
      );
    }

    const parts: React.ReactNode[] = [];
    const regex = /(["'`].*?["'`]|\b(import|export|const|let|var|function|async|await|return|if|else|from|try|catch|new|class|type|interface|throw|for|while|typeof)\b|\b(true|false|null|undefined)\b)/g;

    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIdx) {
        parts.push(line.slice(lastIdx, match.index));
      }

      const val = match[0];
      if (val.startsWith('"') || val.startsWith("'") || val.startsWith('`')) {
        parts.push(
          <span key={match.index} className="text-[#2563EB]">
            {val}
          </span>
        );
      } else if (match[2]) {
        parts.push(
          <span key={match.index} className="text-[#7C3AED] font-semibold">
            {val}
          </span>
        );
      } else if (match[3]) {
        parts.push(
          <span key={match.index} className="text-[#DB2777]">
            {val}
          </span>
        );
      }

      lastIdx = match.index + val.length;
    }

    if (lastIdx < line.length) {
      parts.push(line.slice(lastIdx));
    }

    return (
      <div key={idx} className="leading-6">
        {parts.length > 0 ? parts : line || ' '}
      </div>
    );
  });
}
