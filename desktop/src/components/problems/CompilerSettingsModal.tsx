import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Settings, Cpu, Save, RefreshCw, CheckCircle2, AlertCircle, Play } from "lucide-react";

interface CompilerPaths {
  cpp_path: string;
  cpp_args: string;
  python_path: string;
  java_path: string;
  javac_path: string;
}

interface CompilerStatus {
  cpp_version: string;
  cpp_available: boolean;
  python_version: string;
  python_available: boolean;
  java_version: string;
  java_available: boolean;
  javac_version: string;
  javac_available: boolean;
}

interface CompilerSettings {
  paths: CompilerPaths;
  status: CompilerStatus;
}

interface CompilerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompilerSettingsModal: React.FC<CompilerSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<CompilerSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [testingLang, setTestingLang] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await invoke<CompilerSettings>("get_compiler_settings");
      setSettings(res);
    } catch (err) {
      console.error("Failed to load compiler settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoDetect() {
    setLoading(true);
    try {
      const res = await invoke<CompilerSettings>("detect_compilers");
      setSettings(res);
    } catch (err) {
      console.error("Auto detect failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;
    setSaveStatus("saving");
    try {
      const res = await invoke<CompilerSettings>("save_compiler_settings", { settings });
      setSettings(res);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to save compiler settings:", err);
      setSaveStatus("error");
    }
  }

  async function testCompilerPath(lang: string, path: string) {
    if (!path) return;
    setTestingLang(lang);
    try {
      // Runs the version check locally to verify the path executable
      const version = await invoke<string>("run_code_locally", {
        code: lang === "Python" ? "print('OK')" : lang === "Java" ? "public class Main { public static void main(String[] args) { System.out.println(\"OK\"); } }" : "#include <iostream>\nint main() { std::cout << \"OK\" << std::endl; return 0; }",
        language: lang === "C++" ? "C++14" : lang,
        input: "",
        timeLimitSec: 3.0,
      });
      setTestResult((prev) => ({
        ...prev,
        [lang]: (version as any).status === "Success" ? "Verified! Command ran successfully." : `Failed: ${(version as any).stderr || (version as any).compile_output || "Unknown error"}`,
      }));
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [lang]: `Verification error: ${err.message || err}`,
      }));
    } finally {
      setTestingLang(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Dark overlay backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Settings Dialog Card */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 z-10 flex flex-col max-h-[90vh] text-foreground overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="size-4.5 text-primary" />
            <h3 className="font-bold text-sm tracking-tight">Local Compiler Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          <div className="flex justify-between items-center bg-muted/40 p-3.5 rounded-lg border border-border/50">
            <div>
              <h4 className="text-xs font-bold">System Auto-Detection</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Automatically scans standard system directories for installed tools.
              </p>
            </div>
            <button
              onClick={handleAutoDetect}
              disabled={loading}
              className="py-1.5 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Auto Detect
            </button>
          </div>

          {loading && !settings ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Loading configurations...</span>
            </div>
          ) : (
            settings && (
              <div className="space-y-4">
                
                {/* C++ Settings */}
                <div className="p-3 border border-border rounded-lg bg-muted/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold">C++ Compiler (GCC / Clang)</span>
                    </div>
                    {settings.status.cpp_available ? (
                      <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-500 border border-green-500/20 py-0.5 px-2 rounded-full text-[9px] font-semibold">
                        <CheckCircle2 className="size-3" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 py-0.5 px-2 rounded-full text-[9px] font-semibold">
                        <AlertCircle className="size-3" />
                        Not Installed
                      </span>
                    )}
                  </div>
                  
                  {settings.status.cpp_available && settings.status.cpp_version && (
                    <div className="text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded border border-border/40 font-mono leading-tight">
                      {settings.status.cpp_version}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Path</label>
                      <input
                        type="text"
                        value={settings.paths.cpp_path}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            paths: { ...settings.paths, cpp_path: e.target.value },
                          })
                        }
                        placeholder="/usr/bin/g++"
                        className="w-full mt-1 bg-background border border-border rounded-lg py-1.5 px-3 text-xs focus:border-primary focus:outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Compilation Arguments</label>
                      <input
                        type="text"
                        value={settings.paths.cpp_args}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            paths: { ...settings.paths, cpp_args: e.target.value },
                          })
                        }
                        placeholder="-O2 -std=c++17"
                        className="w-full mt-1 bg-background border border-border rounded-lg py-1.5 px-3 text-xs focus:border-primary focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => testCompilerPath("C++", settings.paths.cpp_path)}
                      disabled={testingLang !== null || !settings.paths.cpp_path}
                      className="py-1 px-2.5 bg-muted/60 hover:bg-muted text-[10px] font-semibold rounded border border-border hover:border-border/80 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Play className="size-3" />
                      Test compiler
                    </button>
                    {testResult["C++"] && (
                      <span className="text-[10px] font-medium text-muted-foreground max-w-[250px] truncate" title={testResult["C++"]}>
                        {testResult["C++"]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Python Settings */}
                <div className="p-3 border border-border rounded-lg bg-muted/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold">Python Interpreter (Python 3.x)</span>
                    </div>
                    {settings.status.python_available ? (
                      <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-500 border border-green-500/20 py-0.5 px-2 rounded-full text-[9px] font-semibold">
                        <CheckCircle2 className="size-3" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 py-0.5 px-2 rounded-full text-[9px] font-semibold">
                        <AlertCircle className="size-3" />
                        Not Installed
                      </span>
                    )}
                  </div>
                  
                  {settings.status.python_available && settings.status.python_version && (
                    <div className="text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded border border-border/40 font-mono leading-tight">
                      {settings.status.python_version}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Path</label>
                    <input
                      type="text"
                      value={settings.paths.python_path}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          paths: { ...settings.paths, python_path: e.target.value },
                        })
                      }
                      placeholder="/usr/bin/python3"
                      className="w-full mt-1 bg-background border border-border rounded-lg py-1.5 px-3 text-xs focus:border-primary focus:outline-none font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => testCompilerPath("Python", settings.paths.python_path)}
                      disabled={testingLang !== null || !settings.paths.python_path}
                      className="py-1 px-2.5 bg-muted/60 hover:bg-muted text-[10px] font-semibold rounded border border-border hover:border-border/80 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Play className="size-3" />
                      Test interpreter
                    </button>
                    {testResult["Python"] && (
                      <span className="text-[10px] font-medium text-muted-foreground max-w-[250px] truncate" title={testResult["Python"]}>
                        {testResult["Python"]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Java Settings */}
                <div className="p-3 border border-border rounded-lg bg-muted/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold">Java JDK (Runtime & Compiler)</span>
                    </div>
                    {settings.status.java_available && settings.status.javac_available ? (
                      <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-500 border border-green-500/20 py-0.5 px-2 rounded-full text-[9px] font-semibold">
                        <CheckCircle2 className="size-3" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 py-0.5 px-2 rounded-full text-[9px] font-semibold">
                        <AlertCircle className="size-3" />
                        Not Installed
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Java Executable Path</label>
                      <input
                        type="text"
                        value={settings.paths.java_path}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            paths: { ...settings.paths, java_path: e.target.value },
                          })
                        }
                        placeholder="/usr/bin/java"
                        className="w-full mt-1 bg-background border border-border rounded-lg py-1.5 px-3 text-xs focus:border-primary focus:outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Javac Compiler Path</label>
                      <input
                        type="text"
                        value={settings.paths.javac_path}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            paths: { ...settings.paths, javac_path: e.target.value },
                          })
                        }
                        placeholder="/usr/bin/javac"
                        className="w-full mt-1 bg-background border border-border rounded-lg py-1.5 px-3 text-xs focus:border-primary focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => testCompilerPath("Java", settings.paths.java_path)}
                      disabled={testingLang !== null || !settings.paths.java_path || !settings.paths.javac_path}
                      className="py-1 px-2.5 bg-muted/60 hover:bg-muted text-[10px] font-semibold rounded border border-border hover:border-border/80 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Play className="size-3" />
                      Test Java environment
                    </button>
                    {testResult["Java"] && (
                      <span className="text-[10px] font-medium text-muted-foreground max-w-[250px] truncate" title={testResult["Java"]}>
                        {testResult["Java"]}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3 border-t border-border bg-muted/20 shrink-0">
          <span className="text-[10px] text-muted-foreground font-semibold">
            Paths are persisted inside the local tauri app config directory.
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="py-1.5 px-3 border border-border hover:bg-muted text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving" || !settings}
              className="py-1.5 px-4 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {saveStatus === "saving" ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Saving
                </>
              ) : saveStatus === "success" ? (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
