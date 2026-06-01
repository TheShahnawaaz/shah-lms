import React, { useState, useEffect, useRef } from "react";
import MonacoEditor from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, RotateCcw, Save, Maximize2, Minimize2, Check } from "lucide-react";

interface CodeEditorPanelProps {
  editorLang: string;
  onLanguageChange: (lang: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  onResetCode: () => void;
  onSaveCode: () => void;
  saveSuccess: boolean;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
  monacoTheme: string;
  editorCode: string;
  setEditorCode: (code: string) => void;
}

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  editorLang,
  onLanguageChange,
  fontSize,
  setFontSize,
  onResetCode,
  onSaveCode,
  saveSuccess,
  isFullscreen,
  setIsFullscreen,
  monacoTheme,
  editorCode,
  setEditorCode
}) => {
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [fontSizeDropdownOpen, setFontSizeDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const fontSizeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (
        fontSizeDropdownRef.current &&
        !fontSizeDropdownRef.current.contains(event.target as Node)
      ) {
        setFontSizeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
              <ChevronDown
                size={12}
                className={`text-muted-foreground transition-transform duration-200 ${langDropdownOpen ? "rotate-180" : ""}`}
              />
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
                        onLanguageChange(lang);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold hover:bg-muted transition-colors ${
                        editorLang === lang
                          ? "text-primary bg-primary/5 font-bold"
                          : "text-foreground"
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
              <ChevronDown
                size={10}
                className={`text-muted-foreground transition-transform duration-200 ${fontSizeDropdownOpen ? "rotate-180" : ""}`}
              />
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
                        fontSize === size
                          ? "text-primary bg-primary/5 font-bold"
                          : "text-foreground"
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
            onClick={onResetCode}
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
            onClick={onSaveCode}
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
            automaticLayout: true,
            tabSize: 4,
            mouseWheelZoom: true
          }}
        />
      </div>
    </div>
  );
};
export default CodeEditorPanel;
