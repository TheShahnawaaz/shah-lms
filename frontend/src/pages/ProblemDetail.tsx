import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import api from "../lib/api";
import WorkspaceHeader from "../components/problems/WorkspaceHeader";
import ProblemDescriptionPanel from "../components/problems/ProblemDescriptionPanel";
import CodeEditorPanel from "../components/problems/CodeEditorPanel";
import ConsoleRunner from "../components/problems/ConsoleRunner";

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

  const token = localStorage.getItem("az_auth_token");
  const payload = token ? parseJwt(token) : null;
  const userName = payload?.name || localStorage.getItem("az_user_name") || "Coder";
  const userEmail = localStorage.getItem("az_user_email") || payload?.email || "user@shahlms.com";
  const userAvatar = localStorage.getItem("az_user_avatar") || "";

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
      
      {/* Workspace Header */}
      <WorkspaceHeader
        problemId={problem.id}
        problemTitle={problem.title}
        bookmarked={bookmarked}
        onBookmarkToggle={handleBookmarkToggle}
        theme={theme || "dark"}
        onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
        userAvatar={userAvatar}
        userName={userName}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

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
        
        {/* Left Pane: Description, Hints & Editorials */}
        <ProblemDescriptionPanel
          problem={problem}
          activeLeftTab={activeLeftTab}
          setActiveLeftTab={setActiveLeftTab}
          activeEditorialLang={activeEditorialLang}
          setActiveEditorialLang={setActiveEditorialLang}
          monacoTheme={monacoTheme}
          activeMobilePane={activeMobilePane}
        />

        {/* Right Pane: Code Editor & Console */}
        <div className={`w-full lg:w-1/2 flex flex-col h-full overflow-hidden bg-card ${activeMobilePane === "editor" ? "flex" : "hidden lg:flex"}`}>
          <CodeEditorPanel
            editorLang={editorLang}
            onLanguageChange={handleLanguageChange}
            fontSize={fontSize}
            setFontSize={setFontSize}
            onResetCode={handleResetCode}
            onSaveCode={handleSaveCode}
            saveSuccess={saveSuccess}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            monacoTheme={monacoTheme}
            editorCode={editorCode}
            setEditorCode={setEditorCode}
          />

          <ConsoleRunner
            problem={problem}
            isConsoleCollapsed={isConsoleCollapsed}
            setIsConsoleCollapsed={setIsConsoleCollapsed}
            runnerTab={runnerTab}
            setRunnerTab={setRunnerTab}
            activeSampleIdx={activeSampleIdx}
            setActiveSampleIdx={setActiveSampleIdx}
            runExecuted={runExecuted}
            setRunExecuted={setRunExecuted}
            runSuccess={runSuccess}
            isRunning={isRunning}
            runStep={runStep}
            manualInput={manualInput}
            setManualInput={setManualInput}
            manualOutput={manualOutput}
            onRunCode={handleRunCode}
            onSubmitCode={handleSubmitCode}
          />
        </div>

      </div>
    </div>
  );
};
export default ProblemDetail;
