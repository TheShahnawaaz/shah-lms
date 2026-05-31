import React, { useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import MathRenderer from "../MathRenderer";
import { BookOpen, HelpCircle, Code, Clock, Terminal, Copy, Check } from "lucide-react";

interface Sample {
  input: string;
  output: string;
  explanation: string;
}

interface Editorial {
  code: string;
  language: string;
}

interface TemplateCode {
  code: string;
  language: string;
}

interface ProblemDetailData {
  id: number;
  title: string;
  body: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: number;
  memoryLimitMb: number;
  timeLimitSec: number;
  note: string | null;
  samples: Sample[];
  hints: {
    hint1?: string;
    hint2?: string;
    solution_approach?: string;
  };
  editorials: Editorial[];
  templates: TemplateCode[];
  tags: { name: string }[];
}

interface ProblemDescriptionPanelProps {
  problem: ProblemDetailData;
  activeLeftTab: "desc" | "hints" | "editorial";
  setActiveLeftTab: (tab: "desc" | "hints" | "editorial") => void;
  activeEditorialLang: string;
  setActiveEditorialLang: (lang: string) => void;
  monacoTheme: string;
  activeMobilePane: "desc" | "editor";
}

function cleanEditorialCode(code: string): string {
  if (!code) return "";
  let cleaned = code.trim();

  let changed = true;
  while (changed) {
    changed = false;

    // Match line-start code fence e.g., ```cpp, ```c++, ```java, etc. followed by newline
    const matchStart = cleaned.match(/^```[a-zA-Z0-9+#-]*\s*(\r?\n)/i);
    if (matchStart) {
      cleaned = cleaned.substring(matchStart[0].length);
      changed = true;
    }

    // Match trailing code fence e.g., ``` at the end (even if no newline before it)
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
      changed = true;
    }

    // Match inline-wrapped single-line code blocks like ```code```
    if (cleaned.startsWith("```") && cleaned.endsWith("```") && cleaned.length >= 6) {
      const firstNewlineIdx = cleaned.indexOf("\n");
      if (firstNewlineIdx !== -1) {
        cleaned = cleaned.substring(firstNewlineIdx + 1, cleaned.length - 3);
        changed = true;
      }
    }

    cleaned = cleaned.trim();
  }

  return cleaned;
}

export const ProblemDescriptionPanel: React.FC<ProblemDescriptionPanelProps> = ({
  problem,
  activeLeftTab,
  setActiveLeftTab,
  activeEditorialLang,
  setActiveEditorialLang,
  monacoTheme,
  activeMobilePane
}) => {
  const [expandedHint, setExpandedHint] = useState<"h1" | "h2" | "sa" | null>(null);
  const [copiedEditorial, setCopiedEditorial] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getMonacoLanguage = (lang: string) => {
    const map: { [key: string]: string } = {
      "C++14": "cpp",
      "C++": "cpp",
      C: "cpp",
      Python3: "python",
      Python: "python",
      Java: "java",
      JavaScript: "javascript"
    };
    return map[lang] || "cpp";
  };

  return (
    <div
      className={`w-full lg:w-1/2 flex flex-col border-r border-border h-full overflow-hidden bg-background ${activeMobilePane === "desc" ? "flex" : "hidden lg:flex"}`}
    >
      {/* Custom Description Tabs */}
      <div className="flex border-b border-border bg-card shrink-0">
        {[
          { id: "desc", label: "Description", icon: BookOpen },
          { id: "hints", label: "Hints", icon: HelpCircle },
          { id: "editorial", label: "Solutions", icon: Code }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveLeftTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold transition-all border-b-2 relative ${
              activeLeftTab === tab.id
                ? "border-primary text-foreground bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
            }`}
          >
            <tab.icon size={13} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Description Body Scrollable content */}
      {activeLeftTab !== "editorial" ? (
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          {activeLeftTab === "desc" && (
            <div className="space-y-6">
              {/* Title & Limits Info */}
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {problem.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded">
                    <Clock size={12} />
                    <span>
                      Time Limit: <strong>{problem.timeLimitSec} sec</strong>
                    </span>
                  </span>
                  <span className="flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded">
                    <Terminal size={12} />
                    <span>
                      Memory: <strong>{problem.memoryLimitMb} MB</strong>
                    </span>
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                      problem.difficulty === 1
                        ? "bg-green-500/10 text-green-500"
                        : problem.difficulty === 2
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {problem.difficulty === 1
                      ? "Easy"
                      : problem.difficulty === 2
                        ? "Medium"
                        : "Hard"}
                  </span>
                </div>
              </div>

              {/* Problem Body */}
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
                <MathRenderer content={problem.body} />
              </div>

              {/* Input Format */}
              {problem.inputFormat && (
                <div className="space-y-2 pt-4 border-t border-border/60">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                    Input Format
                  </h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                    <MathRenderer content={problem.inputFormat} />
                  </div>
                </div>
              )}

              {/* Output Format */}
              {problem.outputFormat && (
                <div className="space-y-2 pt-4 border-t border-border/60">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                    Output Format
                  </h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                    <MathRenderer content={problem.outputFormat} />
                  </div>
                </div>
              )}

              {/* Constraints */}
              {problem.constraints && (
                <div className="space-y-2 pt-4 border-t border-border/60">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                    Constraints
                  </h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed font-mono">
                    <MathRenderer content={problem.constraints} />
                  </div>
                </div>
              )}

              {/* Sample cases */}
              {problem.samples && problem.samples.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-border/60">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                    Sample Cases
                  </h3>
                  {problem.samples.map((sample, idx) => (
                    <div
                      key={idx}
                      className="space-y-3 p-4 bg-muted/20 border border-border rounded-xl"
                    >
                      <div className="flex items-center justify-between font-bold text-xs text-foreground uppercase tracking-wider">
                        <span>Sample #{idx + 1}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                            <span>Input</span>
                            <button
                              onClick={() => handleCopy(sample.input)}
                              className="hover:text-foreground p-0.5 transition-colors"
                              title="Copy input"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                          <pre className="bg-card p-3 rounded-lg text-xs text-foreground overflow-x-auto font-mono whitespace-pre-wrap border border-border/60">
                            {sample.input}
                          </pre>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                            <span>Output</span>
                            <button
                              onClick={() => handleCopy(sample.output)}
                              className="hover:text-foreground p-0.5 transition-colors"
                              title="Copy output"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                          <pre className="bg-card p-3 rounded-lg text-xs text-foreground overflow-x-auto font-mono whitespace-pre-wrap border border-border/60">
                            {sample.output}
                          </pre>
                        </div>
                      </div>
                      {sample.explanation && (
                        <div className="pt-2.5 mt-2 text-xs border-t border-border/40 text-muted-foreground leading-relaxed">
                          <strong className="text-foreground">Explanation: </strong>
                          <MathRenderer content={sample.explanation} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {problem.note && (
                <div className="space-y-2 pt-4 border-t border-border/60">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                    Notes
                  </h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                    <MathRenderer content={problem.note} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accordion Hints */}
          {activeLeftTab === "hints" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Topic Tags */}
              {problem.tags && problem.tags.length > 0 && (
                <div className="border border-border rounded-xl p-4 bg-card shadow-sm space-y-2.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Topic Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {problem.tags.map((tag) => (
                      <span
                        key={tag.name}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {[
                  { id: "h1", label: "Hint 1", content: problem.hints.hint1 },
                  { id: "h2", label: "Hint 2", content: problem.hints.hint2 },
                  { id: "sa", label: "Solution Approach", content: problem.hints.solution_approach }
                ].map((hint) => (
                  <div
                    key={hint.id}
                    className="border border-border rounded-xl overflow-hidden bg-card shadow-sm"
                  >
                    <button
                      onClick={() =>
                        setExpandedHint(expandedHint === hint.id ? null : (hint.id as any))
                      }
                      className="w-full flex justify-between items-center px-4 py-3 bg-muted/10 hover:bg-muted/20 text-foreground font-bold text-sm transition-colors border-b border-transparent data-[expanded=true]:border-border"
                      data-expanded={expandedHint === hint.id}
                    >
                      <span>{hint.label}</span>
                      <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
                        {expandedHint === hint.id ? "Hide" : "Reveal"}
                      </span>
                    </button>
                    {expandedHint === hint.id && (
                      <div className="p-4 bg-background/50 text-sm text-muted-foreground leading-relaxed">
                        {hint.content ? (
                          <MathRenderer content={hint.content} />
                        ) : (
                          <span>No {hint.label.toLowerCase()} available for this problem.</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Editorial Solutions Container */
        <div className="flex-1 flex flex-col min-h-0 p-4 bg-background">
          {!problem.editorials || problem.editorials.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs font-medium my-auto">
              No official solution code available for this problem.
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {problem.editorials
                .filter((e) => e.language === activeEditorialLang)
                .map((e, idx) => {
                  const cleanedCode = cleanEditorialCode(e.code);
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden bg-card shadow-sm min-h-0"
                    >
                      {/* Simulated IDE Editor Header Bar */}
                      <div className="h-11 border-b border-border bg-[#f8fafc] dark:bg-muted/15 flex items-center justify-between px-4 shrink-0 select-none">
                        <div className="flex items-center h-full gap-4">
                          {/* Traffic light circles */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                          </div>

                          {/* Language selector pills */}
                          <div className="flex items-center gap-1 bg-[#f1f5f9] dark:bg-[#0f172a]/30 p-0.5 rounded-lg border border-[#e2e8f0] dark:border-border/30">
                            {problem.editorials.map((tab) => {
                              const isActive = activeEditorialLang === tab.language;
                              const displayLabel =
                                tab.language === "C++14" || tab.language === "C++"
                                  ? "C++"
                                  : tab.language === "Python3" || tab.language === "Python"
                                    ? "Python"
                                    : tab.language;
                              return (
                                <button
                                  key={tab.language}
                                  onClick={() => setActiveEditorialLang(tab.language)}
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                                    isActive
                                      ? "bg-primary text-primary-foreground shadow-sm"
                                      : "text-[#64748b] dark:text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {displayLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground bg-muted-foreground/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            Read-Only Mode
                          </span>
                          <button
                            onClick={() => {
                              handleCopy(cleanedCode);
                              setCopiedEditorial(true);
                              setTimeout(() => setCopiedEditorial(false), 2000);
                            }}
                            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                            title="Copy clean solution code"
                          >
                            {copiedEditorial ? (
                              <Check size={13} className="text-green-500" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Monaco Editor Container */}
                      <div className="flex-1 min-h-0 relative bg-white dark:bg-[#1e1e1e]">
                        <MonacoEditor
                          height="100%"
                          theme={monacoTheme}
                          language={getMonacoLanguage(e.language)}
                          value={cleanedCode}
                          options={{
                            readOnly: true,
                            fontSize: 13,
                            fontFamily: "Fira Code, SF Mono, Monaco, monospace",
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            padding: { top: 12, bottom: 12 },
                            lineNumbersMinChars: 3,
                            cursorBlinking: "smooth",
                            smoothScrolling: true,
                            automaticLayout: true,
                            domReadOnly: true,
                            contextmenu: false,
                            mouseWheelZoom: true
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default ProblemDescriptionPanel;
