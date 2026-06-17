import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import api from "../lib/api";
import WorkspaceHeader from "../components/problems/WorkspaceHeader";
import ProblemDescriptionPanel from "../components/problems/ProblemDescriptionPanel";
import CodeEditorPanel from "../components/problems/CodeEditorPanel";
import ConsoleRunner from "../components/problems/ConsoleRunner";
import { invoke } from "@tauri-apps/api/core";
import SubmissionResultModal from "../components/problems/SubmissionResultModal";
import { normalizeOutput } from "../lib/utils";


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
      window
        .atob(base64)
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
  const isDarkTheme =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const monacoTheme = isDarkTheme ? "vs-dark" : "light";

  // Tab selections
  const [activeLeftTab, setActiveLeftTab] = useState<"desc" | "hints" | "editorial" | "submissions">("desc");
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
  const [isRunning, setIsRunning] = useState(false);
  const [runStep, setRunStep] = useState<string>("");
  const [bookmarked, setBookmarked] = useState(false);

  // Per-sample results — indexed by sample position, persists until next run
  interface SampleResult {
    output: string;  // what the code printed
    passed: boolean; // matches expected
    status: string;  // Success | CompilationError | TimeLimitExceeded | RuntimeError
  }
  const [sampleResults, setSampleResults] = useState<(SampleResult | null)[]>([]);
  // Manual tab result
  const [manualResult, setManualResult] = useState<{ output: string; executed: boolean }>({ output: "", executed: false });

  // Submissions list, selection and modal flags
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    status: string;
    executionTimeMs: number;
    sampleResults: any[];
  } | null>(null);

  // Resize states
  const [leftWidth, setLeftWidth] = useState<number>(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const containerRef = useRef<HTMLDivElement>(null);

  const [consoleHeight, setConsoleHeight] = useState<number>(300);
  const [isConsoleDragging, setIsConsoleDragging] = useState(false);

  // Monitor desktop layout state
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Monitor mouse move / mouse up for drag resizing
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      // Calculate mouse offset relative to the split view container
      const offset = e.clientX - rect.left;
      // Calculate percentage relative to container width
      const newWidth = (offset / rect.width) * 100;

      // Impose boundaries (e.g., between 20% and 80%)
      if (newWidth >= 20 && newWidth <= 80) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Monitor mouse move / mouse up for vertical console dragging
  useEffect(() => {
    if (!isConsoleDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      // Calculate vertical height: relative to container's bottom edge
      const newHeight = rect.bottom - e.clientY;

      // Impose boundaries (e.g. min 100px, max container height - 100px)
      const minHeight = 100;
      const maxHeight = rect.height - 100;

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setConsoleHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsConsoleDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isConsoleDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleConsoleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsConsoleDragging(true);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

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
      const template = p.templates.find(
        (t) => t.language === lang || (lang === "C++14" && t.language === "C++")
      );
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

  const fetchSubmissions = async () => {
    try {
      const res = await api.get<any[]>(`/problems/${id}/submissions`);
      setSubmissionsList(res.data);
    } catch (err) {
      console.error("Failed to load submissions:", err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchSubmissions();
    }
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
      const template = problem.templates.find(
        (t) => t.language === editorLang || (editorLang === "C++14" && t.language === "C++")
      );
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

  const handleRunCode = async () => {
    if (!problem) return;
    setIsConsoleCollapsed(false);
    setIsRunning(true);
    setRunStep("Compiling locally...");

    // Map frontend languages to compiler expectations
    let lang = editorLang;
    if (lang === "C++14") lang = "C++";
    if (lang === "Python3") lang = "Python";

    if (runnerTab === "manual") {
      // Manual tab: run against custom input only
      try {
        const res = await invoke<any>("run_code_locally", {
          code: editorCode,
          language: lang,
          input: manualInput,
          timeLimitSec: problem.timeLimitSec || 3.0,
        });
        let output = "";
        if (res.status === "CompilationError") {
          output = `Compilation Error:\n${res.compile_output}`;
        } else if (res.status === "TimeLimitExceeded") {
          output = `Time Limit Exceeded (limit: ${problem.timeLimitSec || 3.0}s)`;
        } else if (res.status === "RuntimeError") {
          output = `Runtime Error (Exit Code: ${res.exit_code ?? "?"})\n${res.stderr || "Process crashed."}`;
        } else {
          output = res.stdout || "(No output)";
        }
        setManualResult({ output, executed: true });
      } catch (err: any) {
        setManualResult({ output: `Execution error: ${err.message || err}`, executed: true });
      }
      setIsRunning(false);
      setRunStep("");
      return;
    }

    // Sample tab: run ALL samples in parallel
    const samples = problem.samples;
    const results: (SampleResult | null)[] = new Array(samples.length).fill(null);
    setSampleResults(new Array(samples.length).fill(null));
    setRunStep("Running all samples...");

    // Fire all invocations simultaneously; update state as each resolves
    const promises = samples.map(async (sample, i) => {
      try {
        const res = await invoke<any>("run_code_locally", {
          code: editorCode,
          language: lang,
          input: sample.input,
          timeLimitSec: problem.timeLimitSec || 3.0,
        });

        let output = "";
        let passed = false;

        if (res.status === "CompilationError") {
          output = `Compilation Error:\n${res.compile_output}`;
        } else if (res.status === "TimeLimitExceeded") {
          output = `Time Limit Exceeded (limit: ${problem.timeLimitSec || 3.0}s)`;
        } else if (res.status === "RuntimeError") {
          output = `Runtime Error (Exit Code: ${res.exit_code ?? "?"})\n${res.stderr || "Process crashed."}`;
        } else {
          output = res.stdout || "(No output)";
          passed = normalizeOutput(res.stdout) === normalizeOutput(sample.output);
        }

        results[i] = { output, passed, status: res.status };
        setSampleResults([...results]);
      } catch (err: any) {
        results[i] = { output: `Execution error: ${(err as any).message || err}`, passed: false, status: "RuntimeError" };
        setSampleResults([...results]);
      }
    });

    await Promise.allSettled(promises);

    setIsRunning(false);
    setRunStep("");
  };

  const handleSubmitCode = async () => {
    if (!problem) return;
    setIsConsoleCollapsed(false);
    setIsRunning(true);
    setRunStep("Compiling code locally...");

    // Map frontend languages to compiler expectations
    let lang = editorLang;
    if (lang === "C++14") lang = "C++";
    if (lang === "Python3") lang = "Python";

    const samples = problem.samples;
    const results: any[] = new Array(samples.length).fill(null);
    setRunStep("Evaluating on sample test cases...");

    // Fire all invocations simultaneously
    const promises = samples.map(async (sample, i) => {
      try {
        const res = await invoke<any>("run_code_locally", {
          code: editorCode,
          language: lang,
          input: sample.input,
          timeLimitSec: problem.timeLimitSec || 3.0,
        });

        let output = "";
        let passed = false;

        if (res.status === "CompilationError") {
          output = res.compile_output || "Compilation failed.";
        } else if (res.status === "TimeLimitExceeded") {
          output = `Time Limit Exceeded (limit: ${problem.timeLimitSec || 3.0}s)`;
        } else if (res.status === "RuntimeError") {
          output = res.stderr || "Process crashed.";
        } else {
          output = res.stdout || "";
          passed = normalizeOutput(res.stdout) === normalizeOutput(sample.output);
        }

        results[i] = {
          passed,
          status: res.status,
          output,
          executionTimeMs: res.execution_time_ms || 0
        };
      } catch (err: any) {
        results[i] = {
          passed: false,
          status: "RuntimeError",
          output: `Execution error: ${err.message || err}`,
          executionTimeMs: 0
        };
      }
    });

    await Promise.allSettled(promises);

    // Calculate overall status
    let overallStatus = "Accepted";
    let maxTime = 0;
    
    // Check if any error exists
    const hasCompileError = results.some((r) => r.status === "CompilationError");
    const hasRuntimeError = results.some((r) => r.status === "RuntimeError");
    const hasTLE = results.some((r) => r.status === "TimeLimitExceeded");
    const hasWrongAnswer = results.some((r) => !r.passed);

    if (hasCompileError) {
      overallStatus = "CompilationError";
    } else if (hasRuntimeError) {
      overallStatus = "RuntimeError";
    } else if (hasTLE) {
      overallStatus = "TimeLimitExceeded";
    } else if (hasWrongAnswer) {
      overallStatus = "WrongAnswer";
    }

    // Get max execution time
    results.forEach((r) => {
      if (r.executionTimeMs > maxTime) maxTime = r.executionTimeMs;
    });

    // Format sample results matching DB schema expectation
    const dbSampleResults = results.map((r) => ({
      passed: r.passed,
      status: r.status,
      output: r.output
    }));

    try {
      // POST the submission details to backend database
      setRunStep("Saving submission record...");
      await api.post(`/problems/${problem.id}/submit`, {
        code: editorCode,
        language: editorLang,
        status: overallStatus,
        executionTimeMs: maxTime,
        sampleResults: dbSampleResults
      });

      // Reload submission history list
      fetchSubmissions();

      // Show result modal
      setSubmissionResult({
        status: overallStatus,
        executionTimeMs: maxTime,
        sampleResults: dbSampleResults
      });
      setIsResultModalOpen(true);
    } catch (err: any) {
      console.error("Failed to save submission:", err);
      alert(`Submission saved locally but failed to record online: ${err.message || err}`);
    } finally {
      setIsRunning(false);
      setRunStep("");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-muted-foreground text-sm font-medium animate-pulse">
          Initializing Workspace Environment...
        </span>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background">
        <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Workspace</h2>
        <p className="text-muted-foreground text-sm mb-6">{error || "Problem detail not found."}</p>
        <Link
          to="/problems"
          className="py-2 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-md text-sm font-medium transition-colors"
        >
          Back to Problems
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-screen w-full overflow-hidden bg-background text-foreground transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-50" : ""}`}
    >
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
      <div
        ref={containerRef}
        className="flex-1 flex flex-col lg:flex-row min-h-0 w-full overflow-hidden"
        style={{ "--left-panel-width": `${leftWidth}%` } as React.CSSProperties}
      >
        {/* Left Pane: Description, Hints & Editorials */}
        <ProblemDescriptionPanel
          problem={problem}
          activeLeftTab={activeLeftTab}
          setActiveLeftTab={setActiveLeftTab}
          activeEditorialLang={activeEditorialLang}
          setActiveEditorialLang={setActiveEditorialLang}
          monacoTheme={monacoTheme}
          activeMobilePane={activeMobilePane}
          submissionsList={submissionsList}
          style={
            isDesktop
              ? {
                  width: "var(--left-panel-width)",
                  pointerEvents: isDragging || isConsoleDragging ? "none" : "auto"
                }
              : undefined
          }
        />

        {/* Vertical Resizer Bar */}
        {isDesktop && (
          <div
            onMouseDown={handleMouseDown}
            className={`w-1 hover:w-1.5 cursor-col-resize select-none h-full relative z-40 transition-colors duration-150 shrink-0 ${
              isDragging ? "bg-primary w-1.5" : "bg-border hover:bg-primary/50"
            }`}
          >
            {/* Visual handle indicator */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-border/40" />
          </div>
        )}

        {/* Right Pane: Code Editor & Console */}
        <div
          style={
            isDesktop
              ? {
                  width: "calc(100% - var(--left-panel-width))",
                  pointerEvents: isDragging || isConsoleDragging ? "none" : "auto"
                }
              : undefined
          }
          className={`w-full lg:w-1/2 flex flex-col h-full overflow-hidden bg-card ${activeMobilePane === "editor" ? "flex" : "hidden lg:flex"}`}
        >
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
            sampleResults={sampleResults}
            manualResult={manualResult}
            isRunning={isRunning}
            runStep={runStep}
            manualInput={manualInput}
            setManualInput={setManualInput}
            onRunCode={handleRunCode}
            onSubmitCode={handleSubmitCode}
            consoleHeight={consoleHeight}
            isConsoleDragging={isConsoleDragging}
            onResizeMouseDown={handleConsoleResizeMouseDown}
          />
        </div>
      </div>

      <SubmissionResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        status={submissionResult?.status || ""}
        language={editorLang}
        executionTimeMs={submissionResult?.executionTimeMs || 0}
        sampleResults={submissionResult?.sampleResults || []}
        samples={problem.samples}
      />

    </div>
  );
};
export default ProblemDetail;
