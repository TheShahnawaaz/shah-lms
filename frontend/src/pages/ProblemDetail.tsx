import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import MathRenderer from "../components/MathRenderer";
import MonacoEditor from "@monaco-editor/react";
import { ArrowLeft, BookOpen, Code, Copy, HelpCircle, Save, CheckCircle, RotateCcw } from "lucide-react";

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

export const ProblemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<ProblemDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab selections
  const [activeLeftTab, setActiveLeftTab] = useState<"desc" | "hints" | "editorial">("desc");
  const [activeEditorialLang, setActiveEditorialLang] = useState<string>("");
  const [editorLang, setEditorLang] = useState<string>("C++14");
  const [editorCode, setEditorCode] = useState<string>("");

  // UI state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedHint, setExpandedHint] = useState<"h1" | "h2" | "sa" | null>(null);

  useEffect(() => {
    const fetchProblemDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<ProblemDetailData>(`/problems/${id}`);
        setProblem(res.data);

        // Pre-select first editorial language if available
        if (res.data.editorials && res.data.editorials.length > 0) {
          setActiveEditorialLang(res.data.editorials[0].language);
        }

        // Recover saved workspace code or load template
        const defaultLang = localStorage.getItem("editor-language") || "C++14";
        setEditorLang(defaultLang);
        loadCodeWorkspace(res.data, defaultLang);
      } catch (err: any) {
        setError(err.message || "Failed to load problem details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProblemDetail();
  }, [id]);

  const loadCodeWorkspace = (p: ProblemDetailData, lang: string) => {
    const cacheKey = `course_0_${p.id}_${lang}`;
    const cachedCode = localStorage.getItem(cacheKey);

    if (cachedCode) {
      setEditorCode(cachedCode);
    } else {
      // Find template
      const template = p.templates.find(t => t.language === lang || (lang === "C++14" && t.language === "C++"));
      setEditorCode(template ? template.code : getDefaultTemplate(lang));
    }
  };

  const handleLanguageChange = (lang: string) => {
    if (!problem) return;
    // Save current code first
    const prevCacheKey = `course_0_${problem.id}_${editorLang}`;
    localStorage.setItem(prevCacheKey, editorCode);

    setEditorLang(lang);
    localStorage.setItem("editor-language", lang);
    loadCodeWorkspace(problem, lang);
  };

  const handleResetCode = () => {
    if (!problem) return;
    if (window.confirm("Are you sure you want to reset the editor to the default template?")) {
      const template = problem.templates.find(t => t.language === editorLang || (editorLang === "C++14" && t.language === "C++"));
      const code = template ? template.code : getDefaultTemplate(editorLang);
      setEditorCode(code);
      localStorage.setItem(`course_0_${problem.id}_${editorLang}`, code);
    }
  };

  const handleSaveCode = () => {
    if (!problem) return;
    const cacheKey = `course_0_${problem.id}_${editorLang}`;
    localStorage.setItem(cacheKey, editorCode);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getMonacoLanguage = (lang: string) => {
    const map: { [key: string]: string } = {
      "C++14": "cpp",
      "C++": "cpp",
      "C": "cpp",
      "Python3": "python",
      "Python": "python",
      "Java": "java",
      "JavaScript": "javascript"
    };
    return map[lang] || "cpp";
  };

  const getDefaultTemplate = (lang: string) => {
    if (lang.includes("Python")) {
      return "# Write your solution code here\n\nimport sys\n\ndef solve():\n    pass\n\nif __name__ == '__main__':\n    solve()\n";
    }
    if (lang === "Java") {
      return "import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        // Write your solution code here\n    }\n}\n";
    }
    return "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Write your solution code here\n    return 0;\n}\n";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-background">
        <div className="w-10 h-10 border-2 border-emeraldAccent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-textMuted text-sm font-mono animate-pulse">Initializing Workspace Environment...</span>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Workspace</h2>
        <p className="text-textMuted text-sm mb-6">{error || "Problem detail not found."}</p>
        <Link to="/problems" className="py-2.5 px-5 bg-cardLight hover:bg-cardLight/80 text-white rounded-xl font-semibold border border-white/5">
          Back to Problems Arena
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Workspace Sub-Header / Topbar */}
      <div className="h-14 border-b border-white/5 glass-panel flex items-center justify-between px-6 shrink-0 relative z-20">
        <div className="flex items-center gap-4">
          <Link to="/problems" className="p-2 text-textMuted hover:text-white hover:bg-cardLight/50 rounded-lg transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-indigoAccent font-bold">#{problem.id}</span>
            <span className="text-sm font-bold text-white font-mono truncate max-w-[300px]">{problem.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs text-emeraldAccent flex items-center gap-1 font-semibold animate-fade-in animate-pulse">
              <CheckCircle size={14} />
              <span>Workspace cached locally</span>
            </span>
          )}
          <button
            onClick={handleSaveCode}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-indigoAccent/15 hover:bg-indigoAccent/35 border border-indigoAccent/30 rounded-lg text-indigoAccent hover:text-white text-xs font-bold transition-all"
          >
            <Save size={14} />
            <span>Save Workspace</span>
          </button>
        </div>
      </div>

      {/* Main Split Screen Container */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Side: Descriptions / Hints / Editorials */}
        <div className="w-1/2 flex flex-col border-r border-white/5 bg-card/15 h-full overflow-hidden">
          {/* Tabs Selector */}
          <div className="flex border-b border-white/5 bg-cardLight/20 shrink-0">
            <button
              onClick={() => setActiveLeftTab("desc")}
              className={`flex items-center gap-1.5 px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeLeftTab === "desc"
                  ? "border-emeraldAccent text-white bg-card"
                  : "border-transparent text-textMuted hover:text-white"
              }`}
            >
              <BookOpen size={14} />
              <span>Description</span>
            </button>
            <button
              onClick={() => setActiveLeftTab("hints")}
              className={`flex items-center gap-1.5 px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeLeftTab === "hints"
                  ? "border-emeraldAccent text-white bg-card"
                  : "border-transparent text-textMuted hover:text-white"
              }`}
            >
              <HelpCircle size={14} />
              <span>Hints</span>
            </button>
            <button
              onClick={() => setActiveLeftTab("editorial")}
              className={`flex items-center gap-1.5 px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeLeftTab === "editorial"
                  ? "border-emeraldAccent text-white bg-card"
                  : "border-transparent text-textMuted hover:text-white"
              }`}
            >
              <Code size={14} />
              <span>Solutions</span>
            </button>
          </div>

          {/* Left panel scroll area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* RENDER DESCRIPTION */}
            {activeLeftTab === "desc" && (
              <div className="space-y-6">
                {/* Description Body */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider font-mono">Problem Statement</h3>
                  <MathRenderer content={problem.body} />
                </div>

                {/* Input Format */}
                {problem.inputFormat && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider font-mono">Input Format</h3>
                    <MathRenderer content={problem.inputFormat} />
                  </div>
                )}

                {/* Output Format */}
                {problem.outputFormat && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider font-mono">Output Format</h3>
                    <MathRenderer content={problem.outputFormat} />
                  </div>
                )}

                {/* Constraints */}
                {problem.constraints && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider font-mono">Constraints</h3>
                    <MathRenderer content={problem.constraints} />
                  </div>
                )}

                {/* Samples */}
                {problem.samples && problem.samples.length > 0 && (
                  <div className="space-y-4 pt-2 border-t border-white/5">
                    <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider font-mono">Sample Cases</h3>
                    {problem.samples.map((sample, idx) => (
                      <div key={idx} className="space-y-3 p-4 bg-card/60 border border-white/5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white font-mono">Sample #{idx + 1}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-textMuted uppercase tracking-wider font-mono">
                              <span>Input</span>
                              <button onClick={() => handleCopy(sample.input)} className="hover:text-white p-0.5" title="Copy input">
                                <Copy size={10} />
                              </button>
                            </div>
                            <pre className="bg-background/80 p-2.5 rounded border border-white/5 text-xs text-textMain overflow-x-auto font-mono whitespace-pre-wrap">{sample.input}</pre>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-textMuted uppercase tracking-wider font-mono">
                              <span>Output</span>
                              <button onClick={() => handleCopy(sample.output)} className="hover:text-white p-0.5" title="Copy output">
                                <Copy size={10} />
                              </button>
                            </div>
                            <pre className="bg-background/80 p-2.5 rounded border border-white/5 text-xs text-textMain overflow-x-auto font-mono whitespace-pre-wrap">{sample.output}</pre>
                          </div>
                        </div>
                        {sample.explanation && (
                          <div className="pt-2 text-xs border-t border-white/5 text-textMuted font-mono">
                            <strong className="text-white">Explanation: </strong> {sample.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Note */}
                {problem.note && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider font-mono">Explanation Notes</h3>
                    <MathRenderer content={problem.note} />
                  </div>
                )}
              </div>
            )}

            {/* RENDER HINTS ACCORDION */}
            {activeLeftTab === "hints" && (
              <div className="space-y-4">
                <div className="border border-white/5 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedHint(expandedHint === "h1" ? null : "h1")}
                    className="w-full flex justify-between items-center px-5 py-4 bg-cardLight/30 text-white font-bold text-sm"
                  >
                    <span>Hint 1</span>
                    <span className="text-xs text-indigoAccent">{expandedHint === "h1" ? "Hide" : "Reveal"}</span>
                  </button>
                  {expandedHint === "h1" && (
                    <div className="p-5 border-t border-white/5 text-sm text-textMain/90 font-mono">
                      {problem.hints.hint1 || "No Hint 1 available for this problem."}
                    </div>
                  )}
                </div>

                <div className="border border-white/5 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedHint(expandedHint === "h2" ? null : "h2")}
                    className="w-full flex justify-between items-center px-5 py-4 bg-cardLight/30 text-white font-bold text-sm"
                  >
                    <span>Hint 2</span>
                    <span className="text-xs text-indigoAccent">{expandedHint === "h2" ? "Hide" : "Reveal"}</span>
                  </button>
                  {expandedHint === "h2" && (
                    <div className="p-5 border-t border-white/5 text-sm text-textMain/90 font-mono">
                      {problem.hints.hint2 || "No Hint 2 available for this problem."}
                    </div>
                  )}
                </div>

                <div className="border border-white/5 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedHint(expandedHint === "sa" ? null : "sa")}
                    className="w-full flex justify-between items-center px-5 py-4 bg-cardLight/30 text-white font-bold text-sm"
                  >
                    <span>Solution Approach</span>
                    <span className="text-xs text-indigoAccent">{expandedHint === "sa" ? "Hide" : "Reveal"}</span>
                  </button>
                  {expandedHint === "sa" && (
                    <div className="p-5 border-t border-white/5 space-y-2">
                      {problem.hints.solution_approach ? (
                        <MathRenderer content={problem.hints.solution_approach} />
                      ) : (
                        <span className="text-sm text-textMuted font-mono">No solution approach available for this problem.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RENDER EDITORIALS */}
            {activeLeftTab === "editorial" && (
              <div className="space-y-4">
                {(!problem.editorials || problem.editorials.length === 0) ? (
                  <div className="text-center py-12 text-textMuted text-sm font-mono">
                    No official solution code compiled for this problem.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Editorial Language Selector */}
                    <div className="flex gap-2 flex-wrap border-b border-white/5 pb-3">
                      {problem.editorials.map((e) => (
                        <button
                          key={e.language}
                          onClick={() => setActiveEditorialLang(e.language)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                            activeEditorialLang === e.language
                              ? "bg-emeraldAccent/15 border-emeraldAccent text-white"
                              : "bg-card border-white/5 text-textMuted hover:text-white"
                          }`}
                        >
                          {e.language}
                        </button>
                      ))}
                    </div>

                    {/* Display Code */}
                    {problem.editorials
                      .filter(e => e.language === activeEditorialLang)
                      .map((e, idx) => (
                        <div key={idx} className="relative group border border-white/5 rounded-xl overflow-hidden">
                          <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleCopy(e.code.replace(/```\w+\n|```$/g, ""))}
                              className="p-2 bg-cardLight/95 hover:bg-cardLight text-textMain rounded-lg border border-white/10"
                              title="Copy code"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          <pre className="p-5 bg-card/45 text-sm font-mono overflow-x-auto text-emeraldAccent/95 selection:bg-emeraldAccent/15 leading-relaxed">
                            {e.code}
                          </pre>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Code Editor */}
        <div className="w-1/2 flex flex-col bg-[#0b0c10] h-full overflow-hidden">
          {/* Editor Header controls */}
          <div className="h-12 border-b border-white/5 bg-cardLight/10 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <select
                value={editorLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="glass-input rounded-lg py-1 px-3 text-xs text-white appearance-none cursor-pointer bg-card font-semibold"
              >
                <option value="C++14">C++14</option>
                <option value="Java">Java</option>
                <option value="Python3">Python3</option>
              </select>

              <button
                onClick={handleResetCode}
                className="p-1.5 text-textMuted hover:text-white hover:bg-cardLight/50 rounded-lg transition-all"
                title="Reset to template"
              >
                <RotateCcw size={14} />
              </button>
            </div>
            
            <span className="text-[10px] text-textMuted font-mono">Local scratchpad workspace</span>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-0 relative">
            <MonacoEditor
              height="100%"
              theme="vs-dark"
              language={getMonacoLanguage(editorLang)}
              value={editorCode}
              onChange={(value) => setEditorCode(value || "")}
              options={{
                fontSize: 14,
                fontFamily: "Fira Code, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
                lineNumbersMinChars: 3,
                cursorBlinking: "smooth",
                smoothScrolling: true,
                automaticLayout: true
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProblemDetail;
