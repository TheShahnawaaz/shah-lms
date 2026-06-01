import React from "react";
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

interface SubmissionResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: string; // "Accepted" | "WrongAnswer" | "TimeLimitExceeded" | "RuntimeError" | "CompilationError"
  language: string;
  executionTimeMs: number;
  sampleResults: SampleResult[];
  samples: Sample[];
}

export const SubmissionResultModal: React.FC<SubmissionResultModalProps> = ({
  isOpen,
  onClose,
  status,
  language,
  executionTimeMs,
  sampleResults,
  samples,
}) => {
  if (!isOpen) return null;

  const isAccepted = status === "Accepted";

  // Confetti particles generator
  const renderConfetti = () => {
    if (!isAccepted) return null;
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
        {Array.from({ length: 50 }).map((_, i) => {
          const style = {
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 20}%`,
            backgroundColor: ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"][
              Math.floor(Math.random() * 6)
            ],
            transform: `rotate(${Math.random() * 360}deg)`,
            animation: `confetti-fall ${2 + Math.random() * 3}s linear infinite`,
            animationDelay: `${Math.random() * 2.5}s`,
            width: `${6 + Math.random() * 8}px`,
            height: `${12 + Math.random() * 12}px`,
            position: "absolute" as const,
            opacity: 0.8,
          };
          return <div key={i} style={style} />;
        })}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes confetti-fall {
            0% { top: -10%; transform: translateY(0) rotate(0deg); }
            100% { top: 110%; transform: translateY(100vh) rotate(720deg); }
          }
        `}} />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Confetti */}
      {renderConfetti()}

      {/* Main dialog card */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl z-10 flex flex-col max-h-[85vh] text-foreground overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-border bg-muted/20 shrink-0">
          <h3 className="font-bold text-sm tracking-tight">Submission Result</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
          
          {/* Main Status Block */}
          <div className={`p-6 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
            isAccepted
              ? "bg-green-500/5 border-green-500/25 text-green-600 dark:text-green-400"
              : status === "WrongAnswer"
                ? "bg-destructive/5 border-destructive/20 text-destructive"
                : "bg-yellow-500/5 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
          }`}>
            <div className="flex items-center gap-3.5">
              {isAccepted ? (
                <CheckCircle className="size-10 shrink-0 stroke-[1.5]" />
              ) : status === "WrongAnswer" ? (
                <XCircle className="size-10 shrink-0 stroke-[1.5]" />
              ) : status === "TimeLimitExceeded" ? (
                <Clock className="size-10 shrink-0 stroke-[1.5]" />
              ) : status === "CompilationError" ? (
                <AlertTriangle className="size-10 shrink-0 stroke-[1.5]" />
              ) : (
                <AlertOctagon className="size-10 shrink-0 stroke-[1.5]" />
              )}

              <div>
                <h4 className="text-lg font-bold tracking-tight">
                  {status === "Accepted"
                    ? "Accepted / Solved!"
                    : status === "WrongAnswer"
                      ? "Wrong Answer"
                      : status === "TimeLimitExceeded"
                        ? "Time Limit Exceeded"
                        : status === "CompilationError"
                          ? "Compilation Error"
                          : "Runtime Error"}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Evaluated against {sampleResults.length} sample test cases locally.
                </p>
              </div>
            </div>

            {/* Quick stats badges */}
            <div className="flex flex-wrap gap-2.5 items-center">
              <span className="bg-muted px-2.5 py-1 rounded-md text-xs font-semibold text-foreground border border-border">
                {language}
              </span>
              {status !== "CompilationError" && (
                <span className="bg-muted px-2.5 py-1 rounded-md text-xs font-semibold text-foreground border border-border">
                  {executionTimeMs} ms
                </span>
              )}
            </div>
          </div>

          {/* Detailed Fail Diagnostic (For Wrong Answer) */}
          {!isAccepted && status === "WrongAnswer" && (
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                First Failed Test Case Diagnostics
              </h5>
              
              {(() => {
                const failedIdx = sampleResults.findIndex((r) => !r.passed);
                if (failedIdx === -1 || !samples[failedIdx]) return null;
                const sample = samples[failedIdx];
                const result = sampleResults[failedIdx];

                return (
                  <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-4">
                    <div className="text-xs font-bold text-destructive">
                      Mismatch found on Sample Case {failedIdx + 1}:
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Input</span>
                        <pre className="p-3 bg-muted/40 border border-border rounded-md font-mono text-xs text-foreground whitespace-pre-wrap min-h-[50px]">
                          {sample.input}
                        </pre>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Expected Output</span>
                          <pre className="p-3 bg-muted/40 border border-border rounded-md font-mono text-xs text-foreground whitespace-pre-wrap min-h-[50px]">
                            {sample.output}
                          </pre>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Your Output</span>
                          <pre className="p-3 bg-destructive/5 border border-destructive/25 text-destructive rounded-md font-mono text-xs whitespace-pre-wrap min-h-[50px]">
                            {result.output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Compilation Logs (For Compile Errors) */}
          {status === "CompilationError" && (
            <div className="space-y-2.5">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Compiler Output logs
              </h5>
              <pre className="p-4 bg-destructive/5 border border-destructive/20 text-destructive rounded-lg font-mono text-xs whitespace-pre-wrap max-h-72 overflow-y-auto">
                {sampleResults[0]?.output || "Unknown compilation failure."}
              </pre>
            </div>
          )}

          {/* Runtime Error Diagnostic */}
          {status === "RuntimeError" && (
            <div className="space-y-2.5">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Diagnostics info
              </h5>
              {sampleResults.map((r, idx) => {
                if (r.status !== "RuntimeError") return null;
                return (
                  <div key={idx} className="p-4 border border-border rounded-lg bg-muted/10 space-y-2">
                    <div className="text-xs font-bold text-destructive">
                      Process crashed on Sample Case {idx + 1}:
                    </div>
                    <pre className="p-3 bg-destructive/5 border border-destructive/25 text-destructive rounded font-mono text-xs whitespace-pre-wrap">
                      {r.output}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}

          {/* Case-by-case Summary List */}
          {status !== "CompilationError" && (
            <div className="space-y-3.5">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Test Case Execution Summary
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {sampleResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-lg flex items-center justify-between text-xs font-medium bg-card ${
                      result.passed
                        ? "border-green-500/20 text-green-600 dark:text-green-400"
                        : "border-destructive/20 text-destructive"
                    }`}
                  >
                    <span>Sample Case {idx + 1}</span>
                    <span className="font-bold uppercase tracking-wide">
                      {result.passed ? "Passed" : result.status === "TimeLimitExceeded" ? "TLE" : "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
export default SubmissionResultModal;
