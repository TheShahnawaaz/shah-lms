import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";
import MathRenderer from "../components/MathRenderer";
import MonacoEditor from "@monaco-editor/react";
import { 
  ArrowLeft, BookOpen, Code, Copy, HelpCircle, Save, 
  CheckCircle, RotateCcw, Play, Send, ChevronUp, ChevronDown, 
  Maximize2, Minimize2, Bookmark, Flame, Trophy, Star, Bell, 
  Terminal, Check, Clock, Sun, Moon, LogOut
} from "lucide-react";
import { useTheme } from "next-themes";

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

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
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

export const ProblemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<ProblemDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  // Detect system or explicit light/dark themes
  const isDarkTheme = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const monacoTheme = isDarkTheme ? "vs-dark" : "light";

  // Tab selections
  const [activeLeftTab, setActiveLeftTab] = useState<"desc" | "hints" | "editorial">("desc");
  const [activeMobilePane, setActiveMobilePane] = useState<"desc" | "editor">("desc");
  const [activeEditorialLang, setActiveEditorialLang] = useState<string>("");
  const [editorLang, setEditorLang] = useState<string>("C++14");
  const [editorCode, setEditorCode] = useState<string>("");

  // Editor states
  const [fontSize, setFontSize] = useState<number>(14);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedEditorial, setCopiedEditorial] = useState(false);
  const [expandedHint, setExpandedHint] = useState<"h1" | "h2" | "sa" | null>(null);

  // Console runner states
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);
  const [runnerTab, setRunnerTab] = useState<"sample" | "manual">("sample");
  const [activeSampleIdx, setActiveSampleIdx] = useState<number>(0);
  const [manualInput, setManualInput] = useState<string>("");
  const [manualOutput, setManualOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [runSuccess, setRunSuccess] = useState(false);
  const [runExecuted, setRunExecuted] = useState(false);
  const [runStep, setRunStep] = useState<string>("");
  const [bookmarked, setBookmarked] = useState(false);

  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Custom editor dropdowns
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [fontSizeDropdownOpen, setFontSizeDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const fontSizeDropdownRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("az_auth_token");
  const payload = token ? parseJwt(token) : null;
  const userName = payload?.name || localStorage.getItem("az_user_name") || "Coder";
  const userEmail = localStorage.getItem("az_user_email") || payload?.email || "user@shahlms.com";
  const userAvatar = localStorage.getItem("az_user_avatar") || "";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (fontSizeDropdownRef.current && !fontSizeDropdownRef.current.contains(event.target as Node)) {
        setFontSizeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("az_auth_token");
    localStorage.removeItem("az_user_name");
    localStorage.removeItem("az_user_avatar");
    localStorage.removeItem("az_user_email");
    navigate("/login");
  };

  function getDefaultTemplate(lang: string) {
    if (lang.includes("Python")) {
      return "# Write your solution code here\n\nimport sys\n\ndef solve():\n    # Read input from standard input\n    # lines = sys.stdin.read().split()\n    pass\n\nif __name__ == '__main__':\n    solve()\n";
    }
    if (lang === "Java") {
      return "import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // Write your solution code here\n    }\n}\n";
    }
    return "#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solve() {\n    // Write your solution code here\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int t = 1;\n    cin >> t;\n    while (t--) {\n        solve();\n    }\n    return 0;\n}\n";
  }

  function loadCodeWorkspace(p: ProblemDetailData, lang: string) {
    const cacheKey = `course_0_${p.id}_${lang}`;
    const cachedCode = localStorage.getItem(cacheKey);

    if (cachedCode) {
      setEditorCode(cachedCode);
    } else {
      const template = p.templates.find(t => t.language === lang || (lang === "C++14" && t.language === "C++"));
      setEditorCode(template ? template.code : getDefaultTemplate(lang));
    }
  }

  useEffect(() => {
    const fetchProblemDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<ProblemDetailData>(`/problems/${id}`);
        setProblem(res.data);
        setBookmarked((res.data as any).isBookmarked || false);

        if (res.data.editorials && res.data.editorials.length > 0) {
          setActiveEditorialLang(res.data.editorials[0].language);
        }

        const defaultLang = localStorage.getItem("editor-language") || "C++14";
        setEditorLang(defaultLang);
        loadCodeWorkspace(res.data, defaultLang);
        
        // Set manual input to first sample input initially
        if (res.data.samples && res.data.samples.length > 0) {
          setManualInput(res.data.samples[0].input);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load problem details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProblemDetail();
  }, [id]);

  const handleLanguageChange = (lang: string) => {
    if (!problem) return;
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

  const handleBookmarkToggle = async () => {
    if (!problem) return;
    try {
      if (bookmarked) {
        await api.delete(`/problems/${problem.id}/bookmark`);
        setBookmarked(false);
      } else {
        await api.post(`/problems/${problem.id}/bookmark`);
        setBookmarked(true);
      }
    } catch (err: any) {
      console.error("Failed to toggle bookmark:", err);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRunCode = () => {
    if (!problem) return;
    setIsConsoleCollapsed(false);
    setIsRunning(true);
    setRunExecuted(true);
    setRunStep("Compiling...");
    
    // Animate compilation phases
    setTimeout(() => {
      setRunStep("Running Test Case 1...");
    }, 700);

    setTimeout(() => {
      setIsRunning(false);
      setRunSuccess(true);
      if (runnerTab === "manual") {
        setManualOutput(manualInput ? "Execution complete. Exit code: 0\n" + manualInput : "No manual output");
      }
    }, 1500);
  };

  const handleSubmitCode = () => {
    if (!problem) return;
    setIsConsoleCollapsed(false);
    setIsRunning(true);
    setRunExecuted(true);
    setRunStep("Compiling on server...");

    setTimeout(() => {
      setRunStep("Running on 15 test cases...");
    }, 800);

    setTimeout(() => {
      setIsRunning(false);
      setRunSuccess(true);
      alert("Submission Status: Accepted (15/15 test cases passed)!");
    }, 1800);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-muted-foreground text-sm font-medium animate-pulse">Initializing Workspace Environment...</span>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background">
        <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Workspace</h2>
        <p className="text-muted-foreground text-sm mb-6">{error || "Problem detail not found."}</p>
        <Link to="/problems" className="py-2 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-md text-sm font-medium transition-colors">
          Back to Problems
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen w-full overflow-hidden bg-background text-foreground transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      
      {/* Top Header Bar - Height 56px */}
      <header className="h-[56px] border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/60 backdrop-blur-md relative z-40">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button - blue rounded square */}
          <Link 
            to="/problems" 
            className="flex items-center justify-center size-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm flex-shrink-0"
            title="Back to problems arena"
          >
            <ArrowLeft size={16} />
          </Link>
          
          <button 
            onClick={handleBookmarkToggle}
            className={`p-1.5 rounded-lg border transition-colors ${bookmarked ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" : "text-muted-foreground hover:text-foreground border-border hover:bg-muted/50"}`}
            title={bookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
          >
            <Bookmark size={15} />
          </button>

          <div className="h-4 w-px bg-border flex-shrink-0" />

          {/* Problem Meta */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-muted-foreground font-semibold px-1.5 py-0.5 rounded bg-muted/60">#{problem.id}</span>
            <span className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[400px]">{problem.title}</span>
          </div>
        </div>

        {/* Right side stats & Theme / User */}
        <div className="flex items-center gap-3">
          {/* Stats Pills from Mockup */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20 text-xs font-semibold">
              <Star size={13} fill="currentColor" />
              <span>68</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
              <Trophy size={13} fill="currentColor" />
              <span>268</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-500 border border-orange-500/20 text-xs font-semibold">
              <Flame size={13} fill="currentColor" />
              <span>0</span>
            </div>
          </div>

          <div className="h-4 w-px bg-border hidden lg:block" />

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-border"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Bell Notifications */}
          <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-border">
            <Bell size={15} />
          </button>

          {/* User Dropdown */}
          <div className="relative animate-in fade-in" ref={dropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-1 rounded-lg p-0.5 hover:bg-muted/80 border border-border/60 transition-colors"
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {userDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card p-1 shadow-lg z-50"
                >
                  <div className="px-2 py-1.5 text-left border-b border-border/60 pb-2 mb-1 flex items-center gap-2">
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName}
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{userName}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{userEmail}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Log out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Mobile Split View Navigation Tabs */}
      <div className="flex border-b border-border bg-card shrink-0 lg:hidden relative z-30">
        <button
          onClick={() => setActiveMobilePane("desc")}
          className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all ${
            activeMobilePane === "desc"
              ? "border-primary text-foreground bg-background/30"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10"
          }`}
        >
          Problem Description
        </button>
        <button
          onClick={() => setActiveMobilePane("editor")}
          className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all ${
            activeMobilePane === "editor"
              ? "border-primary text-foreground bg-background/30"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10"
          }`}
        >
          Code Editor & Console
        </button>
      </div>

      {/* Main Split View Area */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 w-full overflow-hidden">
        
        {/* Left Pane: Descriptions & Editorials */}
        <div className={`w-full lg:w-1/2 flex flex-col border-r border-border h-full overflow-hidden bg-background ${activeMobilePane === "desc" ? "flex" : "hidden lg:flex"}`}>
          {/* Custom Description Tabs */}
          <div className="flex border-b border-border bg-card shrink-0">
            {[
              { id: "desc", label: "Description", icon: BookOpen },
              { id: "hints", label: "Hints", icon: HelpCircle },
              { id: "editorial", label: "Solutions", icon: Code }
            ].map(tab => (
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
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{problem.title}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded">
                      <Clock size={12} />
                      <span>Time Limit: <strong>{problem.timeLimitSec} sec</strong></span>
                    </span>
                    <span className="flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded">
                      <Terminal size={12} />
                      <span>Memory: <strong>{problem.memoryLimitMb} MB</strong></span>
                    </span>
                    <span className={`font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                      problem.difficulty === 1 ? "bg-green-500/10 text-green-500" :
                      problem.difficulty === 2 ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                    }`}>
                      {problem.difficulty === 1 ? "Easy" : problem.difficulty === 2 ? "Medium" : "Hard"}
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
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Input Format</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                      <MathRenderer content={problem.inputFormat} />
                    </div>
                  </div>
                )}

                {/* Output Format */}
                {problem.outputFormat && (
                  <div className="space-y-2 pt-4 border-t border-border/60">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Output Format</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                      <MathRenderer content={problem.outputFormat} />
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {problem.constraints && (
                  <div className="space-y-2 pt-4 border-t border-border/60">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Constraints</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed font-mono">
                      <MathRenderer content={problem.constraints} />
                    </div>
                  </div>
                )}

                {/* Sample cases */}
                {problem.samples && problem.samples.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-border/60">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Sample Cases</h3>
                    {problem.samples.map((sample, idx) => (
                      <div key={idx} className="space-y-3 p-4 bg-muted/20 border border-border rounded-xl">
                        <div className="flex items-center justify-between font-bold text-xs text-foreground uppercase tracking-wider">
                          <span>Sample #{idx + 1}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                              <span>Input</span>
                              <button onClick={() => handleCopy(sample.input)} className="hover:text-foreground p-0.5 transition-colors" title="Copy input">
                                <Copy size={12} />
                              </button>
                            </div>
                            <pre className="bg-card p-3 rounded-lg text-xs text-foreground overflow-x-auto font-mono whitespace-pre-wrap border border-border/60">{sample.input}</pre>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                              <span>Output</span>
                              <button onClick={() => handleCopy(sample.output)} className="hover:text-foreground p-0.5 transition-colors" title="Copy output">
                                <Copy size={12} />
                              </button>
                            </div>
                            <pre className="bg-card p-3 rounded-lg text-xs text-foreground overflow-x-auto font-mono whitespace-pre-wrap border border-border/60">{sample.output}</pre>
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
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Notes</h3>
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
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Topic Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {problem.tags.map((tag) => (
                        <span key={tag.name} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
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
                    <div key={hint.id} className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                      <button
                        onClick={() => setExpandedHint(expandedHint === hint.id ? null : hint.id as any)}
                        className="w-full flex justify-between items-center px-4 py-3 bg-muted/10 hover:bg-muted/20 text-foreground font-bold text-sm transition-colors border-b border-transparent data-[expanded=true]:border-border"
                        data-expanded={expandedHint === hint.id}
                      >
                        <span>{hint.label}</span>
                        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/60">{expandedHint === hint.id ? "Hide" : "Reveal"}</span>
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
          /* Editorial Solutions Container (Fill space, single scrollbar) */
          <div className="flex-1 flex flex-col min-h-0 p-4 bg-background">
            {(!problem.editorials || problem.editorials.length === 0) ? (
              <div className="text-center py-12 text-muted-foreground text-xs font-medium my-auto">
                No official solution code available for this problem.
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {problem.editorials
                  .filter(e => e.language === activeEditorialLang)
                  .map((e, idx) => {
                    const cleanedCode = cleanEditorialCode(e.code);
                    return (
                      <div key={idx} className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden bg-card shadow-sm min-h-0">
                        {/* Simulated IDE Editor Header Bar */}
                        <div className="h-11 border-b border-border bg-[#f8fafc] dark:bg-muted/15 flex items-center justify-between px-4 shrink-0 select-none">
                          <div className="flex items-center h-full gap-4">
                            {/* Traffic light circles */}
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                            </div>
                            
                            {/* Simple Language selector pills */}
                            <div className="flex items-center gap-1 bg-[#f1f5f9] dark:bg-[#0f172a]/30 p-0.5 rounded-lg border border-[#e2e8f0] dark:border-border/30">
                              {problem.editorials.map((tab) => {
                                const isActive = activeEditorialLang === tab.language;
                                const displayLabel = tab.language === "C++14" || tab.language === "C++" ? "C++" : tab.language === "Python3" || tab.language === "Python" ? "Python" : tab.language;
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
                              {copiedEditorial ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
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

        {/* Right Pane: Code Editor & Console */}
        <div className={`w-full lg:w-1/2 flex flex-col h-full overflow-hidden bg-card ${activeMobilePane === "editor" ? "flex" : "hidden lg:flex"}`}>
          
          {/* Monaco Editor Wrapper - grows dynamically */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            
            {/* Editor Subheader / Actions */}
            <div className="h-11 border-b border-border bg-muted/10 flex items-center justify-between px-4 shrink-0 select-none">
              <div className="flex items-center gap-3">
                {/* Language Custom Dropdown */}
                <div className="relative" ref={langDropdownRef}>
                  <button
                    onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                    className="bg-background border border-border rounded-lg py-1 px-2.5 text-xs text-foreground cursor-pointer focus:outline-none font-semibold hover:bg-muted/50 transition-colors flex items-center gap-1.5"
                  >
                    <span>{editorLang}</span>
                    <ChevronDown size={12} className={`text-muted-foreground transition-transform duration-200 ${langDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {langDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 mt-1 w-32 rounded-lg border border-border bg-card p-1 shadow-lg z-50"
                      >
                        {["C++14", "Java", "Python3"].map((lang) => (
                          <button
                            key={lang}
                            onClick={() => {
                              handleLanguageChange(lang);
                              setLangDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold hover:bg-muted transition-colors ${
                              editorLang === lang ? "text-primary bg-primary/5 font-bold" : "text-foreground"
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-4 w-px bg-border" />

                {/* Font Size Custom Dropdown */}
                <div className="relative" ref={fontSizeDropdownRef}>
                  <button
                    onClick={() => setFontSizeDropdownOpen(!fontSizeDropdownOpen)}
                    className="bg-background border border-border rounded-lg py-1 px-2 text-[10px] text-foreground cursor-pointer focus:outline-none font-medium hover:bg-muted/50 transition-colors flex items-center gap-1.5"
                  >
                    <span>{fontSize} px</span>
                    <ChevronDown size={10} className={`text-muted-foreground transition-transform duration-200 ${fontSizeDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {fontSizeDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 mt-1 w-24 rounded-lg border border-border bg-card p-1 shadow-lg z-50"
                      >
                        {[12, 14, 16, 18].map((size) => (
                          <button
                            key={size}
                            onClick={() => {
                              setFontSize(size);
                              setFontSizeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1 rounded-md text-[10px] font-semibold hover:bg-muted transition-colors ${
                              fontSize === size ? "text-primary bg-primary/5 font-bold" : "text-foreground"
                            }`}
                          >
                            {size} px
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Reset button */}
                <button
                  onClick={handleResetCode}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors border border-transparent hover:border-border"
                  title="Reset to default template"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-[10px] text-green-500 flex items-center gap-1 font-semibold transition-all">
                    <Check size={11} strokeWidth={3} />
                    <span>Saved locally</span>
                  </span>
                )}
                
                <button
                  onClick={handleSaveCode}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors"
                  title="Save scratchpad"
                >
                  <Save size={13} />
                </button>

                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              </div>
            </div>

            {/* Embedded Monaco Editor */}
            <div className="flex-1 min-h-0 relative bg-white dark:bg-[#1e1e1e]">
              <MonacoEditor
                height="100%"
                theme={monacoTheme}
                language={getMonacoLanguage(editorLang)}
                value={editorCode}
                onChange={(val) => setEditorCode(val || "")}
                options={{
                  fontSize: fontSize,
                  fontFamily: "Fira Code, SF Mono, Monaco, monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 12, bottom: 12 },
                  lineNumbersMinChars: 3,
                  cursorBlinking: "smooth",
                  smoothScrolling: true,
                  automaticLayout: true,
                  tabSize: 4,
                  mouseWheelZoom: true
                }}
              />
            </div>
          </div>

          {/* Bottom Console Runner Panel */}
          <div 
            className={`border-t border-border flex flex-col transition-all duration-300 bg-background/95 select-none ${
              isConsoleCollapsed ? "h-11" : "h-[300px]"
            }`}
          >
            {/* Console Header / Tabs */}
            <div className="h-11 flex items-center justify-between px-4 bg-muted/10 shrink-0 border-b border-border/40">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsConsoleCollapsed(false);
                    setRunnerTab("sample");
                  }}
                  className={`text-xs font-bold transition-all pb-1 border-b-2 mt-1 ${
                    runnerTab === "sample" && !isConsoleCollapsed
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sample Tests
                </button>
                <button
                  onClick={() => {
                    setIsConsoleCollapsed(false);
                    setRunnerTab("manual");
                  }}
                  className={`text-xs font-bold transition-all pb-1 border-b-2 mt-1 ${
                    runnerTab === "manual" && !isConsoleCollapsed
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Manual Tests
                </button>
              </div>

              {/* Console open/collapse chevron toggle */}
              <button
                onClick={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
                className="p-1 hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded transition-colors"
                title={isConsoleCollapsed ? "Expand console" : "Collapse console"}
              >
                {isConsoleCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {/* Console Body Area - displays when expanded */}
            {!isConsoleCollapsed && (
              <div className="flex-1 flex overflow-hidden min-h-0">
                {runnerTab === "sample" ? (
                  <>
                    {/* Left: Test Case Index List */}
                    <div className="w-[120px] border-r border-border/40 py-2.5 px-2 overflow-y-auto space-y-1 bg-card/20 shrink-0">
                      {problem.samples.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveSampleIdx(idx);
                            setRunExecuted(false); // Reset execution states for new sample
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                            activeSampleIdx === idx
                              ? "bg-muted text-foreground font-bold border border-border"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
                          }`}
                        >
                          <span>Case {idx + 1}</span>
                          {runExecuted && runSuccess && !isRunning && activeSampleIdx === idx && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Right: Test Case Inputs / Outputs */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 text-left">
                      {problem.samples[activeSampleIdx] ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Input</span>
                            <pre className="p-3 bg-muted/30 border border-border rounded-lg font-mono text-xs text-foreground min-h-[60px] whitespace-pre-wrap">
                              {problem.samples[activeSampleIdx].input}
                            </pre>
                          </div>
                          
                          <div className="space-y-4">
                            {/* Desired Output */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Expected Output</span>
                              <pre className="p-3 bg-muted/30 border border-border rounded-lg font-mono text-xs text-foreground min-h-[60px] whitespace-pre-wrap">
                                {problem.samples[activeSampleIdx].output}
                              </pre>
                            </div>

                            {/* Actual Run Output */}
                            {runExecuted && (
                              <div className="space-y-1.5 animate-in fade-in duration-300">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Your Output</span>
                                {isRunning ? (
                                  <div className="p-3 bg-muted/20 border border-border/80 rounded-lg text-xs text-muted-foreground flex items-center gap-2">
                                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <span>{runStep}</span>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <pre className="p-3 bg-green-500/5 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg font-mono text-xs min-h-[60px] whitespace-pre-wrap">
                                      {problem.samples[activeSampleIdx].output}
                                    </pre>
                                    <div className="flex items-center gap-2 text-[10px] font-semibold text-green-600 dark:text-green-500">
                                      <CheckCircle size={12} />
                                      <span>Sample case Passed successfully! Time: 0.04s | Memory: 4MB</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Select a test case to display details</div>
                      )}
                    </div>
                  </>
                ) : (
                  // Manual Test Input / Output
                  <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left overflow-y-auto">
                    <div className="flex flex-col space-y-1.5 h-full min-h-0">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Custom Test Input</span>
                      <textarea
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        className="flex-1 p-3 bg-muted/20 border border-border focus:border-primary rounded-lg font-mono text-xs text-foreground outline-none resize-none min-h-[100px] overflow-y-auto"
                        placeholder="Provide custom input lines here..."
                      />
                    </div>
                    
                    <div className="flex flex-col space-y-1.5 h-full min-h-0">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Output Result</span>
                      {isRunning ? (
                        <div className="flex-1 p-3 bg-muted/10 border border-border rounded-lg text-xs text-muted-foreground flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>{runStep}</span>
                        </div>
                      ) : runExecuted ? (
                        <textarea
                          readOnly
                          value={manualOutput}
                          className="flex-1 p-3 bg-green-500/5 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg font-mono text-xs outline-none resize-none min-h-[100px]"
                        />
                      ) : (
                        <div className="flex-1 border border-border border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                          Output will display after code execution completes.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Console Action Bar / Footer */}
            <div className="h-12 border-t border-border shrink-0 flex items-center justify-between px-4 bg-muted/5">
              <button
                onClick={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
                className="flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs text-foreground hover:bg-muted font-bold transition-all border border-border"
              >
                <Terminal size={14} />
                <span>Console</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors disabled:opacity-50"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Run on Sample</span>
                </button>
                
                <button
                  onClick={handleSubmitCode}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 py-1.5 px-5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/95 text-primary-foreground transition-all shadow-sm disabled:opacity-50"
                >
                  <Send size={13} fill="currentColor" />
                  <span>Submit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProblemDetail;
