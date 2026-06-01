import React from "react";
import { ChevronUp, ChevronDown, Terminal, Play, Send, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

interface Sample {
  input: string;
  output: string;
  explanation: string;
}

interface ProblemDetailData {
  id: number;
  samples: Sample[];
}

interface SampleResult {
  output: string;
  passed: boolean;
  status: string; // "Success" | "CompilationError" | "TimeLimitExceeded" | "RuntimeError"
}

interface ConsoleRunnerProps {
  problem: ProblemDetailData;
  isConsoleCollapsed: boolean;
  setIsConsoleCollapsed: (collapsed: boolean) => void;
  runnerTab: "sample" | "manual";
  setRunnerTab: (tab: "sample" | "manual") => void;
  activeSampleIdx: number;
  setActiveSampleIdx: (idx: number) => void;
  sampleResults: (SampleResult | null)[];
  manualResult: { output: string; executed: boolean };
  isRunning: boolean;
  runStep: string;
  manualInput: string;
  setManualInput: (val: string) => void;
  onRunCode: () => void;
  onSubmitCode: () => void;
  consoleHeight: number;
  isConsoleDragging: boolean;
  onResizeMouseDown: (e: React.MouseEvent) => void;
}

function StatusDot({ result, isRunning }: { result: SampleResult | null; isRunning: boolean }) {
  if (isRunning && result === null) return <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />;
  if (!result) return null;
  if (result.passed) return <span className="w-2 h-2 rounded-full bg-green-500" />;
  if (result.status === "CompilationError") return <span className="w-2 h-2 rounded-full bg-yellow-500" />;
  return <span className="w-2 h-2 rounded-full bg-destructive" />;
}

function StatusBadge({ result }: { result: SampleResult }) {
  if (result.passed) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
        <CheckCircle size={11} />
        <span>Passed</span>
      </div>
    );
  }
  if (result.status === "TimeLimitExceeded") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
        <Clock size={11} />
        <span>Time Limit Exceeded</span>
      </div>
    );
  }
  if (result.status === "CompilationError") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
        <AlertTriangle size={11} />
        <span>Compilation Error</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-destructive">
      <XCircle size={11} />
      <span>Failed</span>
    </div>
  );
}

export const ConsoleRunner: React.FC<ConsoleRunnerProps> = ({
  problem,
  isConsoleCollapsed,
  setIsConsoleCollapsed,
  runnerTab,
  setRunnerTab,
  activeSampleIdx,
  setActiveSampleIdx,
  sampleResults,
  manualResult,
  isRunning,
  runStep,
  manualInput,
  setManualInput,
  onRunCode,
  onSubmitCode,
  consoleHeight,
  isConsoleDragging,
  onResizeMouseDown,
}) => {
  const activeResult = sampleResults[activeSampleIdx] ?? null;
  const hasAnyResult = sampleResults.some((r) => r !== null);

  // Summary counts across all samples
  const passedCount = sampleResults.filter((r) => r?.passed).length;
  const totalRan = sampleResults.filter((r) => r !== null).length;

  return (
    <div
      className={`border-t border-border flex flex-col bg-background/95 select-none relative ${
        isConsoleCollapsed ? "h-11" : ""
      } ${isConsoleDragging ? "" : "transition-all duration-300"}`}
      style={!isConsoleCollapsed ? { height: `${consoleHeight}px` } : undefined}
    >
      {!isConsoleCollapsed && (
        <div
          onMouseDown={onResizeMouseDown}
          className={`h-1 hover:h-1.5 cursor-row-resize select-none absolute top-0 left-0 right-0 z-50 transition-all duration-150 ${
            isConsoleDragging ? "bg-primary h-1.5" : "bg-border hover:bg-primary/50"
          }`}
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-border/40" />
        </div>
      )}

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
            {hasAnyResult && !isRunning && (
              <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                passedCount === totalRan
                  ? "bg-green-500/15 text-green-600 dark:text-green-400"
                  : "bg-destructive/15 text-destructive"
              }`}>
                {passedCount}/{totalRan}
              </span>
            )}
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

        <button
          onClick={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
          className="p-1 hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded transition-colors"
          title={isConsoleCollapsed ? "Expand console" : "Collapse console"}
        >
          {isConsoleCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Console Body */}
      {!isConsoleCollapsed && (
        <div className="flex-1 flex overflow-hidden min-h-0">
          {runnerTab === "sample" ? (
            <>
              {/* Left: Test Case Index List */}
              <div className="w-[120px] border-r border-border/40 py-2.5 px-2 overflow-y-auto space-y-1 bg-card/20 shrink-0">
                {problem.samples.map((_, idx) => {
                  const result = sampleResults[idx] ?? null;
                  const isThisRunning = isRunning && result === null;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveSampleIdx(idx)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                        activeSampleIdx === idx
                          ? "bg-muted text-foreground font-bold border border-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
                      }`}
                    >
                      <span>Case {idx + 1}</span>
                      <StatusDot result={result} isRunning={isThisRunning} />
                    </button>
                  );
                })}
              </div>

              {/* Right: Selected test case detail */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-left">
                {problem.samples[activeSampleIdx] ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Input */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Input
                      </span>
                      <pre className="p-3 bg-muted/30 border border-border rounded-lg font-mono text-xs text-foreground min-h-[60px] whitespace-pre-wrap">
                        {problem.samples[activeSampleIdx].input}
                      </pre>
                    </div>

                    <div className="space-y-4">
                      {/* Expected Output */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Expected Output
                        </span>
                        <pre className="p-3 bg-muted/30 border border-border rounded-lg font-mono text-xs text-foreground min-h-[60px] whitespace-pre-wrap">
                          {problem.samples[activeSampleIdx].output}
                        </pre>
                      </div>

                      {/* Your Output — shown after run */}
                      {(activeResult !== null || isRunning) && (
                        <div className="space-y-1.5 animate-in fade-in duration-300">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Your Output
                          </span>
                          {isRunning && activeResult === null ? (
                            <div className="p-3 bg-muted/20 border border-border/80 rounded-lg text-xs text-muted-foreground flex items-center gap-2">
                              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <span>{runStep}</span>
                            </div>
                          ) : activeResult ? (
                            <div className="space-y-2">
                              <pre className={`p-3 border rounded-lg font-mono text-xs min-h-[60px] whitespace-pre-wrap ${
                                activeResult.passed
                                  ? "bg-green-500/5 border-green-500/20 text-green-600 dark:text-green-400"
                                  : "bg-destructive/5 border-destructive/20 text-destructive"
                              }`}>
                                {activeResult.output}
                              </pre>
                              <StatusBadge result={activeResult} />
                            </div>
                          ) : null}
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
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Custom Test Input
                </span>
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-1 p-3 bg-muted/20 border border-border focus:border-primary rounded-lg font-mono text-xs text-foreground outline-none resize-none min-h-[100px] overflow-y-auto"
                  placeholder="Provide custom input lines here..."
                />
              </div>

              <div className="flex flex-col space-y-1.5 h-full min-h-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Output Result
                </span>
                {isRunning ? (
                  <div className="flex-1 p-3 bg-muted/10 border border-border rounded-lg text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>{runStep}</span>
                  </div>
                ) : manualResult.executed ? (
                  <textarea
                    readOnly
                    value={manualResult.output}
                    className="flex-1 p-3 bg-muted/10 border border-border text-foreground rounded-lg font-mono text-xs outline-none resize-none min-h-[100px]"
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
            onClick={onRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{runStep || "Running..."}</span>
              </>
            ) : (
              <>
                <Play size={13} fill="currentColor" />
                <span>Run on Sample</span>
              </>
            )}
          </button>

          <button
            onClick={onSubmitCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 py-1.5 px-5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/95 text-primary-foreground transition-all shadow-sm disabled:opacity-50"
          >
            <Send size={13} fill="currentColor" />
            <span>Submit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConsoleRunner;
