import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface MathRendererProps {
  content: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content }) => {
  // Gracefully handle backslash double line-breaks that scraper might dump
  const parsedContent = content
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "");

  return (
    <div className="prose prose-invert max-w-none text-textMain/90 text-[15px] leading-relaxed selection:bg-indigoAccent/30">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 text-white border-b border-borderDark pb-1" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2 text-white" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-2 mb-1 text-white" {...props} />,
          p: ({ node, ...props }) => <p className="mb-3" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
          a: ({ node, ...props }) => (
            <a
              className="text-emeraldAccent hover:text-emeraldAccent/80 underline underline-offset-4 transition-colors font-semibold"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match;
            return isInline ? (
              <code className="bg-cardLight px-1.5 py-0.5 rounded text-indigoAccent text-sm font-mono border border-borderDark" {...props}>
                {children}
              </code>
            ) : (
              <pre className="bg-card p-3 rounded-lg border border-borderDark overflow-x-auto text-sm font-mono text-textMain/90 my-3">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-borderDark">
              <table className="min-w-full divide-y divide-borderDark bg-card/45" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-cardLight" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="divide-y divide-borderDark/50" {...props} />,
          tr: ({ node, ...props }) => <tr className="hover:bg-cardLight/30 transition-colors" {...props} />,
          th: ({ node, ...props }) => (
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-textMuted uppercase tracking-wider font-sans border-b border-borderDark" {...props} />
          ),
          td: ({ node, ...props }) => <td className="px-4 py-2 text-sm text-textMain/80 font-mono" {...props} />,
        }}
      >
        {parsedContent}
      </ReactMarkdown>
    </div>
  );
};
export default MathRenderer;
