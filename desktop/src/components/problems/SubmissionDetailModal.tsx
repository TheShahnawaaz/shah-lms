import React from "react";
import MonacoEditor from "@monaco-editor/react";
import { X, CheckCircle, XCircle, Clock, AlertTriangle, AlertOctagon } from "lucide-react";

interface Sample {
  input: string;
  output: string;
  explanation: string;
}

interface SampleResult {
  passed: boolean;
  status: string;
  output: string;
}

interface Submission {
  id: string;
  code: string;
  language: string;
  status: string;
  executionTimeMs: number;
  sampleResults: string | SampleResult[]; // Can be JSON string or parsed array
  createdAt: string;
}

interface SubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission | null;
  samples: Sample[];
}

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  isOpen,
  onClose,
  submission,
  samples,
}) => {
  if (!isOpen || !submission) return null;

  // Safely parse sampleResults if stored as string
  const results: SampleResult[] = Array.isArray(submission.sampleResults)
    ? submission.sampleResults
    : typeof submission.sampleResults === "string"
      ? JSON.parse(submission.sampleResults)
      : [];

  const isAccepted = submission.status === "Accepted";
  const formattedDate = new Date(submission.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const getMonacoLanguage = (lang: string) => {
    const map: { [key: string]: string } = {
      "C++14": "cpp",
      "C++": "cpp",
      C: "cpp",
      Python3: "python",
      Python: "python",
      Java: "java",
      JavaScript: "javascript",
    };
    return map[lang] || "cpp";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Main dialog card */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl z-10 flex flex-col h-[90vh] max-h-[90vh] text-foreground overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-border bg-muted/20 shrink-0">
          <div>
            <h3 className="font-bold text-sm tracking-tight">Submission Details</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Submitted on {formattedDate}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Layout Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
          
          {/* Left Side: Code Viewer */}
          <div className="flex-1 flex flex-col border-r border-border min-w-0 h-1/2 md:h-full">
            <div className="h-9 px-4 border-b border-border bg-muted/5 flex items-center justify-between shrink-0 select-none">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Submitted Code</span>
              <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded text-foreground">
                {submission.language}
              </span>
            </div>
            <div className="flex-1 min-h-0 bg-[#1e1e1e]">
              <MonacoEditor
                height="100%"
                theme="vs-dark"
                language={getMonacoLanguage(submission.language)}
                value={submission.code}
                options={{
                  readOnly: true,
                  fontSize: 13,
                  fontFamily: "Fira Code, SF Mono, Monaco, monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 12, bottom: 12 },
                  lineNumbersMinChars: 3,
                  automaticLayout: true,
                  domReadOnly: true,
                }}
              />
            </div>
          </div>

          {/* Right Side: Diagnostics & Test Cases */}
          <div className="w-full md:w-[350px] shrink-0 p-5 overflow-y-auto space-y-5 h-1/2 md:h-full bg-muted/5 flex flex-col">
            
            {/* Status Card */}
            <div className={`p-4 rounded-lg border shrink-0 flex items-center gap-3 ${
              isAccepted
                ? "bg-green-500/5 border-green-500/25 text-green-600 dark:text-green-400"
                : submission.status === "WrongAnswer"
                  ? "bg-destructive/5 border-destructive/20 text-destructive"
                  : "bg-yellow-500/5 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
            }`}>
              {isAccepted ? (
                <CheckCircle className="size-8 shrink-0 stroke-[1.5]" />
              ) : submission.status === "WrongAnswer" ? (
                <XCircle className="size-8 shrink-0 stroke-[1.5]" />
              ) : submission.status === "TimeLimitExceeded" ? (
                <Clock className="size-8 shrink-0 stroke-[1.5]" />
              ) : submission.status === "CompilationError" ? (
                <AlertTriangle className="size-8 shrink-0 stroke-[1.5]" />
              ) : (
                <AlertOctagon className="size-8 shrink-0 stroke-[1.5]" />
              )}
              
              <div>
                <div className="font-bold text-sm">
                  {submission.status === "Accepted" ? "Accepted" : submission.status === "WrongAnswer" ? "Wrong Answer" : submission.status === "TimeLimitExceeded" ? "Time Limit Exceeded" : submission.status === "CompilationError" ? "Compile Error" : "Runtime Error"}
                </div>
                {submission.status !== "CompilationError" && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Runtime: {submission.executionTimeMs} ms
                  </div>
                )}
              </div>
            </div>

            {/* Test Case Results Detail */}
            <div className="flex-1 min-h-0 space-y-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
                Sample Test Cases
              </h4>
              
              <div className="space-y-3">
                {results.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                    No run details available.
                  </div>
                ) : (
                  results.map((res, idx) => {
                    const sample = samples[idx];
                    return (
                      <div
                        key={idx}
                        className={`p-3 border rounded-lg bg-card text-left space-y-2.5 transition-all ${
                          res.passed
                            ? "border-green-500/10 hover:border-green-500/20"
                            : "border-destructive/15 hover:border-destructive/30"
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span>Case {idx + 1}</span>
                          <span className={res.passed ? "text-green-500" : "text-destructive"}>
                            {res.passed ? "Passed" : res.status === "TimeLimitExceeded" ? "TLE" : "Failed"}
                          </span>
                        </div>

                        {/* Diagnostics diff if failed */}
                        {!res.passed && sample && (
                          <div className="space-y-2 pt-1 border-t border-border/30 text-[11px]">
                            {sample.input && (
                              <div className="space-y-0.5">
                                <span className="font-bold text-muted-foreground uppercase text-[9px]">Input</span>
                                <pre className="p-1.5 bg-muted/40 border border-border rounded font-mono text-[10px] whitespace-pre-wrap">
                                  {sample.input.trim()}
                                </pre>
                              </div>
                            )}
                            <div className="space-y-0.5">
                              <span className="font-bold text-muted-foreground uppercase text-[9px]">Expected</span>
                              <pre className="p-1.5 bg-muted/40 border border-border rounded font-mono text-[10px] whitespace-pre-wrap">
                                {sample.output.trim()}
                              </pre>
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-bold text-muted-foreground uppercase text-[9px]">Actual Output</span>
                              <pre className="p-1.5 bg-destructive/5 border border-destructive/20 text-destructive rounded font-mono text-[10px] whitespace-pre-wrap">
                                {res.output ? res.output.trim() : "(No output)"}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-foreground text-background font-bold text-xs rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
export default SubmissionDetailModal;
