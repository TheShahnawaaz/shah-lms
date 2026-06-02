import React, { useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Copy, Check, Play, RotateCcw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface InlineCodeEditorProps {
  initialCode: string;
  language: string;
  title?: string;
}

export const InlineCodeEditor: React.FC<InlineCodeEditorProps> = ({
  initialCode,
  language,
  title = "Example"
}) => {
  const [code, setCode] = useState(initialCode);
  const { theme } = useTheme();

  const isDarkTheme =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const monacoTheme = isDarkTheme ? "vs-dark" : "light";
  const [copied, setCopied] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  const getMonacoLanguage = (lang: string) => {
    const cleanLang = lang.trim().toLowerCase();
    if (cleanLang.includes("cpp") || cleanLang.includes("c++")) return "cpp";
    if (cleanLang.includes("python") || cleanLang.includes("py")) return "python";
    if (cleanLang.includes("java")) return "java";
    if (cleanLang.includes("javascript") || cleanLang.includes("js")) return "javascript";
    return "cpp";
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset the example code to its original version?")) {
      setCode(initialCode);
      setOutput(null);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Executing code locally...");
    
    // Map editor language to compiler expectations
    let lang = language;
    const cleanLang = language.trim().toLowerCase();
    if (cleanLang.includes("cpp") || cleanLang.includes("c++")) lang = "C++";
    if (cleanLang.includes("python") || cleanLang.includes("py")) lang = "Python";

    try {
      const res = await invoke<any>("run_code_locally", {
        code,
        language: lang,
        input: customInput,
        timeLimitSec: 3.0,
      });

      let outputText = "";
      if (res.status === "CompilationError") {
        outputText = `Compilation Error:\n${res.compile_output}`;
      } else if (res.status === "TimeLimitExceeded") {
        outputText = `Time Limit Exceeded (limit: 3.0s)`;
      } else if (res.status === "RuntimeError") {
        outputText = `Runtime Error (Exit Code: ${res.exit_code ?? "?"})\n${res.stderr || "Process crashed."}`;
      } else {
        outputText = res.stdout || "(No output)";
      }
      setOutput(outputText);
    } catch (err: any) {
      setOutput(`Execution error: ${err.message || err}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="w-full bg-muted/25 dark:bg-card/30 backdrop-blur-md border border-border/80 hover:border-border rounded-xl shadow-sm overflow-hidden flex flex-col my-6 font-sans text-left">
      {/* Editor Header */}
      <div className="h-10 px-4 bg-muted/20 border-b border-border/80 flex items-center justify-between select-none">
        <span className="text-xs font-bold text-foreground">{title}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-background hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/80 rounded-md transition-colors"
        >
          {copied ? (
            <>
              <Check size={11} className="text-green-500" strokeWidth={3} />
              <span className="text-green-500 font-bold">Copied</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Frame */}
      <div className="h-[260px] relative bg-white dark:bg-[#1e1e1e]">
        <MonacoEditor
          height="100%"
          theme={monacoTheme}
          language={getMonacoLanguage(language)}
          value={code}
          onChange={(val) => setCode(val || "")}
          options={{
            fontSize: 13,
            fontFamily: "Fira Code, SF Mono, Monaco, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 10, bottom: 10 },
            lineNumbersMinChars: 3,
            cursorBlinking: "smooth",
            automaticLayout: true,
            tabSize: 4,
            mouseWheelZoom: false,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8
            }
          }}
        />
      </div>

      {/* Custom Input Accordion Toggle */}
      <div className="border-t border-border/50 bg-muted/5">
        <div className="px-4 py-2 flex items-center justify-between border-b border-border/20">
          <button
            onClick={() => setShowInput(!showInput)}
            className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            {showInput ? "Hide Custom Input" : "Provide Custom Input"}
          </button>
        </div>
        
        {showInput && (
          <div className="p-3 bg-muted/10">
            <textarea
              placeholder="Provide standard input (stdin) for your execution here..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="w-full h-16 p-2 bg-background border border-border rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-11 px-4 bg-muted/10 border-t border-border/50 flex items-center justify-between select-none shrink-0">
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted/80 text-muted-foreground text-[10px] font-bold uppercase tracking-wide border border-border/40 font-mono">
          {getMonacoLanguage(language)}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1.5 bg-background hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/80 rounded-lg transition-colors"
            title="Reset code"
          >
            <RotateCcw size={12} />
          </button>
          
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-lg transition-all shadow-sm disabled:opacity-50"
          >
            {isRunning ? (
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Play size={11} fill="currentColor" />
            )}
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Panel */}
      {output !== null && (
        <div className="border-t border-border/50 bg-zinc-50 dark:bg-[#0c0c0c] text-emerald-700 dark:text-green-400 p-4 font-mono text-xs overflow-x-auto max-h-48 select-text">
          <div className="flex items-center justify-between text-muted-foreground border-b border-border/30 pb-2 mb-2 select-none">
            <span>Execution Terminal</span>
            <button
              onClick={() => setOutput(null)}
              className="text-[10px] hover:text-foreground transition-colors font-bold font-sans"
            >
              Clear
            </button>
          </div>
          <pre className="whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
};
export default InlineCodeEditor;
