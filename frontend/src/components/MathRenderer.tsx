import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Copy, Check } from "lucide-react";

const PreContext = React.createContext<boolean>(false);

function extractText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node.props && node.props.children) return extractText(node.props.children);
  return "";
}

interface PreBlockProps {
  children?: React.ReactNode;
  [key: string]: any;
}

const PreBlock: React.FC<PreBlockProps> = ({ children, ...props }) => {
  const [copied, setCopied] = React.useState(false);

  const codeText = React.useMemo(() => {
    return extractText(children).trim();
  }, [children]);

  const language = React.useMemo(() => {
    let lang = "";
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const className = (child.props as any)?.className || "";
        const match = /language-(\w+)/.exec(className);
        if (match) {
          lang = match[1];
        }
      }
    });
    return lang;
  }, [children]);

  const handleCopy = async () => {
    if (!codeText) return;
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  return (
    <PreContext.Provider value={true}>
      <div className="relative group my-4 rounded-xl border border-borderDark bg-cardLight overflow-hidden shadow-sm">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-borderDark text-xs text-textMuted select-none">
          <span className="font-mono uppercase tracking-wider text-indigoAccent/90 font-semibold">
            {language || "code block"}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 hover:text-textMain transition-colors duration-200 focus:outline-none"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emeraldAccent" />
                <span className="text-emeraldAccent font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span className="font-medium">Copy</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto text-sm font-mono text-textMain/90 leading-relaxed max-h-[450px]" {...props}>
          {children}
        </pre>
      </div>
    </PreContext.Provider>
  );
};

interface MathRendererProps {
  content: string;
}

function htmlToMarkdown(html: string): string {
  if (!html) return "";
  
  let md = html;
  
  // 1. Replace HTML entities & spaces
  md = md
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&nbsp/g, " ");

  // 1.5. Convert HTML pre-formatted code blocks to Markdown code blocks
  md = md.replace(/<pre[^>]*>\s*<code[^>]*class=["']([^"']+)["'][^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_match, className, code) => {
    const langMatch = className.match(/language-(\w+)/i);
    const lang = langMatch ? langMatch[1] : "";
    return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
  });
  
  md = md.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_match, code) => {
    return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
  });

  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_match, code) => {
    return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
  });

  // 2. Convert images BEFORE stripping other tags
  md = md.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
    const altMatch = match.match(/alt=["']([^"']+)["']/i);
    const alt = altMatch ? altMatch[1] : "illustration";
    return `![${alt}](${src})`;
  });

  // 3. Convert lists
  md = md
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<ul[^>]*>/gi, "")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<ol[^>]*>/gi, "")
    .replace(/<\/ol>/gi, "\n");

  // 4. Convert inline tags
  md = md
    .replace(/<(b|strong)>/gi, "**")
    .replace(/<\/(b|strong)>/gi, "**")
    .replace(/<(i|em)>/gi, "*")
    .replace(/<\/(i|em)>/gi, "*")
    .replace(/<u>/gi, "")
    .replace(/<\/u>/gi, "")
    .replace(/<code>/gi, "`")
    .replace(/<\/code>/gi, "`")
    .replace(/<sub>([^<]+)<\/sub>/gi, "_$1")
    .replace(/<sup>([^<]+)<\/sup>/gi, "^$1")
    .replace(/<br\s*\/?>/gi, "\n");

  // 5. Handle paragraph tags
  md = md
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n");

  // 6. Strip any other remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");

  return md;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content }) => {
  // Pre-process HTML tags into markdown and handle newlines
  const markdown = htmlToMarkdown(content);
  const parsedContent = markdown
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => (line.endsWith("  ") ? line : line + "  "))
    .join("\n");

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
          img: ({ node, ...props }) => (
            <div className="flex justify-center my-4 select-none">
              <div className="bg-white p-4 rounded-xl border border-borderDark max-w-full md:max-w-[85%] shadow-sm">
                <img
                  className="rounded-lg max-h-[350px] object-contain mx-auto"
                  {...props}
                  alt={props.alt || "Problem illustration"}
                />
              </div>
            </div>
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-emeraldAccent hover:text-emeraldAccent/80 underline underline-offset-4 transition-colors font-semibold"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          pre: PreBlock,
          code: ({ node, className, children, ...props }) => {
            const isInsidePre = React.useContext(PreContext);
            if (isInsidePre) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-cardLight px-1.5 py-0.5 rounded text-indigoAccent text-sm font-mono border border-borderDark" {...props}>
                {children}
              </code>
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
