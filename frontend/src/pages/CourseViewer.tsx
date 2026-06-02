import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Check,
  Copy,
  Sun,
  Moon,
  LogOut,
  PanelRightOpen,
  PanelRightClose,
  X,
  PlayCircle,
  Code2,
  CheckSquare,
  Lightbulb
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";
import VideoPlayer from "../components/courses/VideoPlayer";
import InlineCodeEditor from "../components/courses/InlineCodeEditor";

// Reuse existing coding problem components
import ProblemDescriptionPanel from "../components/problems/ProblemDescriptionPanel";
import CodeEditorPanel from "../components/problems/CodeEditorPanel";
import ConsoleRunner from "../components/problems/ConsoleRunner";
import DownloadPromptModal from "../components/problems/DownloadPromptModal";

interface Resource {
  resource_id: number;
  resource_name: string;
  resource_type: string;
  problem_id: number | null;
  isCompleted: boolean;
}

interface Playlist {
  playlist_id: number;
  playlist_name: string;
  resources: Resource[];
}

interface Chapter {
  chapter_id: number;
  chapter_name: string;
  playlists: Playlist[];
}

interface CourseDetail {
  course_id: number;
  course_name: string;
  fully_scraped: boolean;
  image?: string | null;
  chapters: Chapter[];
}

interface ResourceDetailData {
  resource_id: number;
  playlist_id: number;
  resource_name: string;
  resource_type: string;
  order: number;
  problem_id: number | null;
  isCompleted: boolean;
  details: any;
}

// Problem Details interface mapping (for CODING_PROBLEM integration)
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
  samples: any[];
  hints: any;
  editorials: any[];
  templates: any[];
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

// ─── Inline MCQ Card (self-contained state per MCQ) ──────────────────────────
const InlineMcqCard: React.FC<{ mcq: any }> = ({ mcq }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

  const details = mcq.details;
  if (!details) return null;

  // Use description as fallback when title is null
  const questionText = details.title || details.description || "";

  const handleCheck = () => {
    if (selected === null) return;
    const opt = (details.options || []).find((o: any) => o.id === selected);
    setChecked(true);
    setIsCorrect(opt ? opt.iscorrect : false);
  };

  // ── Markdown overrides for block areas (question, explanation) ────────────
  const blockMdComponents: any = {
    code: ({ node, className, children, ...props }: any) => {
      const isInsidePre = React.useContext(PreContext);
      if (isInsidePre) {
        return <code className={className} {...props}>{children}</code>;
      }
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded text-primary text-[12px] font-mono border border-border" {...props}>
          {children}
        </code>
      );
    },
    pre: PreBlock,
    p: ({ children }: any) => <p className="my-1 leading-relaxed">{children}</p>,
  };

  // ── Markdown overrides for option bodies (inside <button>) ────────────────
  // Must stay inline-safe: override <p> to fragment so no block inside button
  const optionMdComponents: any = {
    p: ({ children }: any) => <>{children}</>,
    code: ({ node, className, children, ...props }: any) => {
      const isInsidePre = React.useContext(PreContext);
      if (isInsidePre) {
        return <code className={className} {...props}>{children}</code>;
      }
      return (
        <code className="bg-muted/60 px-1 py-0.5 rounded text-primary text-[11px] font-mono border border-border/60" {...props}>
          {children}
        </code>
      );
    },
    // Rare: code blocks inside an option — render as a contained block
    pre: ({ children }: any) => (
      <pre className="block w-full bg-muted p-2 rounded-lg text-[11px] font-mono overflow-x-auto my-1 border border-border/50 whitespace-pre-wrap text-left">
        {children}
      </pre>
    ),
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm my-6">
      {/* Question — full markdown rendering */}
      <div className="text-sm font-semibold text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:text-foreground prose-p:my-1 prose-strong:text-foreground prose-code:text-primary">
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          remarkPlugins={[remarkGfm]}
          components={blockMdComponents}
        >
          {questionText}
        </ReactMarkdown>
      </div>

      {/* Options — each body rendered through markdown */}
      <div className="flex flex-col gap-2">
        {(details.options || []).map((option: any) => {
          const isSelected = selected === option.id;
          let style = "border-border hover:bg-muted/30 text-foreground";

          if (isSelected && !checked) {
            style = "border-primary bg-primary/5 text-primary";
          }

          if (checked) {
            if (option.iscorrect) {
              style = "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
            } else if (isSelected) {
              style = "border-rose-500 bg-rose-500/10 text-rose-500";
            } else {
              style = "border-border/40 text-muted-foreground opacity-60";
            }
          }

          return (
            <button
              key={option.id}
              onClick={() => !checked && setSelected(option.id)}
              disabled={checked}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-150 flex items-center justify-between gap-3 ${style}`}
            >
              <span className="flex-1 min-w-0 [&_strong]:font-extrabold [&_em]:italic [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-primary [&_code]:text-[11px] [&_code]:font-mono [&_code]:border [&_code]:border-border/60 [&_pre]:block [&_pre]:w-full [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:text-[11px] [&_pre]:font-mono [&_pre]:overflow-x-auto [&_pre]:my-1 [&_pre]:border [&_pre]:border-border/50 [&_pre]:whitespace-pre-wrap [&_pre]:text-left">
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                  remarkPlugins={[remarkGfm]}
                  components={optionMdComponents}
                >
                  {option.body}
                </ReactMarkdown>
              </span>
              {checked && option.iscorrect && (
                <Check size={14} className="text-emerald-500 shrink-0" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>

      {/* Actions row: Check Answer + optional Hint button */}
      {!checked ? (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleCheck}
            disabled={selected === null}
            className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground disabled:opacity-50 text-xs font-bold rounded-lg transition-all shadow-sm"
          >
            Check Answer
          </button>
          {details.hint && (
            <button
              onClick={() => setHintVisible((v) => !v)}
              className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Lightbulb size={12} />
              {hintVisible ? "Hide Hint" : "Show Hint"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 pt-2 border-t border-border/50">
          <span className={`text-xs font-extrabold uppercase tracking-wider ${isCorrect ? "text-emerald-500" : "text-rose-500"}`}>
            {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
          </span>
          {details.explanation && (
            <div className="bg-muted/40 p-3.5 rounded-xl border border-border/40 text-xs leading-relaxed text-muted-foreground prose prose-xs dark:prose-invert max-w-none prose-p:text-muted-foreground prose-strong:text-foreground [&_code]:bg-background/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-primary [&_code]:font-mono [&_code]:border [&_code]:border-border [&_pre]:bg-background/80 [&_pre]:p-2.5 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-1.5 [&_pre]:border [&_pre]:border-border [&_ol]:pl-4 [&_ul]:pl-4">
              <p className="font-bold text-foreground mb-1.5 not-prose text-xs">Explanation:</p>
              <ReactMarkdown
                rehypePlugins={[rehypeRaw]}
                remarkPlugins={[remarkGfm]}
                components={blockMdComponents}
              >
                {details.explanation}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Hint reveal panel */}
      {hintVisible && details.hint && !checked && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-200">
          <Lightbulb size={13} className="shrink-0 mt-0.5 text-amber-500" />
          <span>{details.hint}</span>
        </div>
      )}
    </div>
  );
};

const PreContext = React.createContext<boolean>(false);

function extractText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node.props && node.props.children) return extractText(node.props.children);
  return "";
}

interface PreBlockProps {
  children?: React.ReactNode;
  [key: string]: any;
}

const PreBlock: React.FC<PreBlockProps> = ({ children, ...props }) => {
  const [copied, setCopied] = React.useState(false);

  const codeText = React.useMemo(() => {
    return extractText(children).trim();
  }, [children]);

  const language = React.useMemo(() => {
    let lang = "";
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const className = (child.props as any)?.className || "";
        const match = /language-(\w+)/.exec(className);
        if (match) {
          lang = match[1];
        }
      }
    });
    return lang;
  }, [children]);

  const handleCopy = async () => {
    if (!codeText) return;
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  return (
    <PreContext.Provider value={true}>
      <div className="relative group my-4 rounded-xl border border-border bg-muted/20 overflow-hidden shadow-sm">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border text-xs text-muted-foreground select-none">
          <span className="font-mono uppercase tracking-wider text-primary font-bold">
            {language || "code block"}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors duration-200 focus:outline-none font-semibold"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-500" />
                <span className="text-emerald-500 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <pre
          className="!bg-transparent !m-0 p-4 overflow-x-auto text-sm font-mono text-foreground leading-relaxed max-h-[450px]"
          {...props}
        >
          {children}
        </pre>
      </div>
    </PreContext.Provider>
  );
};

// ─── Main CourseViewer Component ──────────────────────────────────────────────
export const CourseViewer: React.FC = () => {
  const { courseId, resourceId } = useParams<{ courseId: string; resourceId?: string }>();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Theme support
  const isDarkTheme =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const monacoTheme = isDarkTheme ? "vs-dark" : "light";

  // User info for header
  const token = localStorage.getItem("az_auth_token");
  const payload = token ? parseJwt(token) : null;
  const userName = payload?.name || localStorage.getItem("az_user_name") || "Coder";
  const userEmail = localStorage.getItem("az_user_email") || payload?.email || "user@shahlms.com";
  const userAvatar = localStorage.getItem("az_user_avatar") || "";
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
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

  // State
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loadingSyllabus, setLoadingSyllabus] = useState(true);
  const [errorSyllabus, setErrorSyllabus] = useState<string | null>(null);

  // Collapsed states for chapters (mapping: chapter_id -> boolean)
  const [collapsedChapters, setCollapsedChapters] = useState<{ [key: number]: boolean }>({});
  // Syllabus overlay state
  const [syllabusOpen, setSyllabusOpen] = useState(false);

  // Ref for scrolling active chapter into view
  const activeChapterRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to active chapter when syllabus drawer is opened
  useEffect(() => {
    if (syllabusOpen) {
      const timer = setTimeout(() => {
        if (activeChapterRef.current) {
          activeChapterRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }, 200); // Wait for the drawer's slide-in spring animation to finish
      return () => clearTimeout(timer);
    }
  }, [syllabusOpen, resourceId]);

  // Active resource state
  const [activeResource, setActiveResource] = useState<ResourceDetailData | null>(null);
  const [loadingResource, setLoadingResource] = useState(false);
  const [errorResource, setErrorResource] = useState<string | null>(null);
  const [completionUpdating, setCompletionUpdating] = useState(false);

  // Flattened resources list for navigation
  const flatResources = React.useMemo(() => {
    if (!course || !course.chapters) return [];
    const list: Resource[] = [];
    course.chapters.forEach((ch) => {
      ch.playlists.forEach((pl) => {
        pl.resources.forEach((r) => {
          list.push(r);
        });
      });
    });
    return list;
  }, [course]);

  // Find index of active resource
  const activeResourceIndex = React.useMemo(() => {
    if (!resourceId || flatResources.length === 0) return -1;
    const targetId = parseInt(resourceId);
    return flatResources.findIndex((r) => r.resource_id === targetId);
  }, [resourceId, flatResources]);

  // Get previous and next resource
  const prevResource = activeResourceIndex > 0 ? flatResources[activeResourceIndex - 1] : null;
  const nextResource = activeResourceIndex !== -1 && activeResourceIndex < flatResources.length - 1 ? flatResources[activeResourceIndex + 1] : null;

  // Coding problem state (if activeResource is CODING_PROBLEM)
  const [codingProblem, setCodingProblem] = useState<ProblemDetailData | null>(null);
  const [loadingCodingProblem, setLoadingCodingProblem] = useState(false);
  const [codingProblemError, setCodingProblemError] = useState<string | null>(null);

  // Tab/Editor states for integrated coding problem workspace
  const [activeLeftTab, setActiveLeftTab] = useState<"desc" | "hints" | "editorial" | "submissions">("desc");
  const [editorLang, setEditorLang] = useState<string>("C++14");
  const [editorCode, setEditorCode] = useState<string>("");
  const [fontSize, setFontSize] = useState<number>(14);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDownloadPromptOpen, setIsDownloadPromptOpen] = useState(false);

  // Integrated console runner states
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);
  const [runnerTab, setRunnerTab] = useState<"sample" | "manual">("sample");
  const [activeSampleIdx, setActiveSampleIdx] = useState<number>(0);
  const [manualInput, setManualInput] = useState<string>("");
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);

  // Split View widths & Heights for integrated coding problem
  const [leftWidth, setLeftWidth] = useState<number>(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState<number>(300);
  const [isConsoleDragging, setIsConsoleDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const offset = e.clientX - rect.left;
      const newWidth = (offset / rect.width) * 100;
      if (newWidth >= 20 && newWidth <= 80) setLeftWidth(newWidth);
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
      const newHeight = rect.bottom - e.clientY;
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

  // Fetch lightweight syllabus tree
  const fetchSyllabus = async (selectFirst = false) => {
    setLoadingSyllabus(true);
    setErrorSyllabus(null);
    try {
      const res = await api.get<CourseDetail>(`/courses/${courseId}`);
      setCourse(res.data);

      // Expand the chapter containing the active resource by default
      let expandedChapterId = res.data.chapters[0]?.chapter_id;
      if (resourceId) {
        const targetResId = Number(resourceId);
        const activeChapter = res.data.chapters.find((ch) =>
          ch.playlists.some((pl) =>
            pl.resources.some((r) => r.resource_id === targetResId)
          )
        );
        if (activeChapter) {
          expandedChapterId = activeChapter.chapter_id;
        }
      }

      if (expandedChapterId) {
        setCollapsedChapters((prev) => ({
          ...prev,
          [expandedChapterId]: false
        }));
      }

      // Automatically select first resource if requested and none is active
      if (selectFirst && !resourceId) {
        const firstCh = res.data.chapters[0];
        const firstPl = firstCh?.playlists[0];
        const firstRes = firstPl?.resources[0];
        if (firstRes) {
          navigate(`/courses/${courseId}/resource/${firstRes.resource_id}`, { replace: true });
        }
      }
    } catch (err: any) {
      setErrorSyllabus(err.message || "Failed to load syllabus.");
    } finally {
      setLoadingSyllabus(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchSyllabus(true);
    }
  }, [courseId]);

  // Load detailed active resource
  const fetchResourceDetails = async (id: number) => {
    setLoadingResource(true);
    setErrorResource(null);
    setCodingProblem(null);

    try {
      const res = await api.get<ResourceDetailData>(`/courses/resources/${id}`);
      setActiveResource(res.data);

      // If CODING_PROBLEM, fetch problem specifications
      if (res.data.resource_type === "CODING_PROBLEM" && res.data.problem_id) {
        fetchCodingProblemDetails(res.data.problem_id);
      }
    } catch (err: any) {
      setErrorResource(err.message || "Failed to load resource content.");
    } finally {
      setLoadingResource(false);
    }
  };

  useEffect(() => {
    if (resourceId) {
      const targetResId = parseInt(resourceId);
      // Only fetch resource details if it's not already loaded
      if (!activeResource || activeResource.resource_id !== targetResId) {
        fetchResourceDetails(targetResId);
      }

      // Auto-expand the chapter containing the new resource
      if (course && course.chapters) {
        const activeChapter = course.chapters.find((ch) =>
          ch.playlists.some((pl) =>
            pl.resources.some((r) => r.resource_id === targetResId)
          )
        );
        if (activeChapter) {
          setCollapsedChapters((prev) => ({
            ...prev,
            [activeChapter.chapter_id]: false
          }));
        }
      }
    } else {
      setActiveResource(null);
    }
  }, [resourceId, course, activeResource]);

  // Fetch coding problem specifications
  const fetchCodingProblemDetails = async (probId: number) => {
    setLoadingCodingProblem(true);
    setCodingProblemError(null);
    try {
      const res = await api.get<ProblemDetailData>(`/problems/${probId}`);
      setCodingProblem(res.data);

      const defaultLang = localStorage.getItem("editor-language") || "C++14";
      setEditorLang(defaultLang);
      loadCodingWorkspace(res.data, defaultLang);

      if (res.data.samples && res.data.samples.length > 0) {
        setManualInput(res.data.samples[0].input);
      }

      // Load submissions history
      const subs = await api.get<any[]>(`/problems/${probId}/submissions`);
      setSubmissionsList(subs.data);
    } catch (err: any) {
      setCodingProblemError(err.message || "Failed to load coding problem specifications.");
    } finally {
      setLoadingCodingProblem(false);
    }
  };

  const loadCodingWorkspace = (p: ProblemDetailData, lang: string) => {
    const cacheKey = `course_${courseId}_${p.id}_${lang}`;
    const cachedCode = localStorage.getItem(cacheKey);
    if (cachedCode) {
      setEditorCode(cachedCode);
    } else {
      const template = p.templates.find(
        (t) => t.language === lang || (lang === "C++14" && t.language === "C++")
      );
      setEditorCode(template ? template.code : getDefaultTemplate(lang));
    }
  };

  const getDefaultTemplate = (lang: string) => {
    if (lang.includes("Python")) {
      return "# Write solution here\nimport sys\n";
    }
    if (lang === "Java") {
      return "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n    }\n}\n";
    }
    return "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n";
  };

  const handleLanguageChange = (lang: string) => {
    if (!codingProblem) return;
    localStorage.setItem(`course_${courseId}_${codingProblem.id}_${editorLang}`, editorCode);
    setEditorLang(lang);
    localStorage.setItem("editor-language", lang);
    loadCodingWorkspace(codingProblem, lang);
  };

  const handleResetCode = () => {
    if (!codingProblem) return;
    if (window.confirm("Reset editor to default template?")) {
      const template = codingProblem.templates.find(
        (t) => t.language === editorLang || (editorLang === "C++14" && t.language === "C++")
      );
      const code = template ? template.code : getDefaultTemplate(editorLang);
      setEditorCode(code);
    }
  };

  const handleSaveCode = () => {
    if (!codingProblem) return;
    localStorage.setItem(`course_${courseId}_${codingProblem.id}_${editorLang}`, editorCode);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Toggle completion status for any resource ID (manual resources only)
  const toggleResourceCompletionById = async (rId: number, isComp: boolean) => {
    if (completionUpdating) return;
    setCompletionUpdating(true);
    try {
      if (isComp) {
        await api.delete(`/courses/resources/${rId}/complete`);
      } else {
        await api.post(`/courses/resources/${rId}/complete`);
      }

      // If toggled resource is the active one, update its state
      if (activeResource && activeResource.resource_id === rId) {
        setActiveResource((prev) => prev ? { ...prev, isCompleted: !isComp } : null);
      }

      // Update local syllabus completion list
      await fetchSyllabus(false);
    } catch (err: any) {
      alert("Failed to update completion status: " + (err.message || err));
    } finally {
      setCompletionUpdating(false);
    }
  };

  // Toggle completion status (manual resources only) for active resource
  const handleToggleCompletion = async () => {
    if (!activeResource) return;
    await toggleResourceCompletionById(activeResource.resource_id, activeResource.isCompleted);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
        return <PlayCircle size={14} className="shrink-0 text-indigo-500 dark:text-indigo-400" />;
      case "MCQ":
        return <HelpCircle size={14} className="shrink-0 text-amber-500 dark:text-amber-400" />;
      case "QUIZ":
        return <CheckSquare size={14} className="shrink-0 text-orange-500 dark:text-orange-400" />;
      case "CODING_PROBLEM":
        return <Code2 size={14} className="shrink-0 text-emerald-500 dark:text-emerald-400" />;
      case "READING_MATERIAL":
        return <FileText size={14} className="shrink-0 text-sky-500 dark:text-sky-400" />;
      default:
        return <ExternalLink size={14} className="shrink-0 text-slate-400" />;
    }
  };

  const getPlatformLogo = (platform: string) => {
    const cleanPlatform = (platform || "").trim().toUpperCase();
    let logoUrl = "";

    switch (cleanPlatform) {
      case "LEETCODE":
        logoUrl = "/external-logos/leetcode.svg";
        break;
      case "CODEFORCES":
        logoUrl = "/external-logos/codeforces.svg";
        break;
      case "ATCODER":
        logoUrl = "/external-logos/atcoder.svg";
        break;
      case "CODECHEF":
        logoUrl = "/external-logos/codechef.svg";
        break;
      case "SPOJ":
        logoUrl = "/external-logos/spoj.svg";
        break;
      case "HACKEREARTH":
        logoUrl = "/external-logos/hackerearth.svg";
        break;
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs shrink-0 border border-border">
            EX
          </div>
        );
    }

    // Since our local SVG files for LeetCode, Codeforces, AtCoder, CodeChef, and SPOJ are already colorful, we only need to invert HackerEarth in dark mode (as it is a black SVG from simpleicons)
    const shouldInvert = cleanPlatform === "HACKEREARTH";

    return (
      <img
        src={logoUrl}
        alt={platform}
        className={`w-8 h-8 object-contain shrink-0 ${shouldInvert ? "dark:invert" : ""}`}
        onError={(e) => {
          // Fallback to text box if loading fails
          e.currentTarget.style.display = "none";
        }}
      />
    );
  };

  const toggleChapter = (chapterId: number) => {
    setCollapsedChapters((prev) => ({
      ...prev,
      [chapterId]: prev[chapterId] === false ? true : false
    }));
  };

  // Detect if the current resource is a coding problem for layout purposes
  const isCodingProblemView = activeResource?.resource_type === "CODING_PROBLEM";

  if (loadingSyllabus && !course) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-muted-foreground text-sm font-semibold animate-pulse">
          Loading course structure...
        </span>
      </div>
    );
  }

  if (errorSyllabus || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background">
        <h2 className="text-xl font-bold text-destructive mb-2">Error Loading Syllabus</h2>
        <p className="text-muted-foreground text-sm mb-6">{errorSyllabus || "Course not found."}</p>
        <Link to="/courses" className="py-2 px-4 bg-muted hover:bg-muted/80 rounded-md text-sm font-medium">
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background text-foreground relative">
      {/* ═══ Fix 5: WorkspaceHeader-style Top Bar ═══ */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/60 backdrop-blur-md relative z-40">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button */}
          <button
            onClick={() => navigate("/courses")}
            className="flex items-center justify-center size-7 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm flex-shrink-0"
            title="Back to courses"
          >
            <ArrowLeft size={14} />
          </button>

          <div className="h-4 w-px bg-border shrink-0" />

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[350px]">
              {course.course_name}
            </span>
            {activeResource && (
              <>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground truncate max-w-[180px] sm:max-w-[300px]">
                  {activeResource.resource_name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2.5">
          {/* Header Navigation Controls (Option C) */}
          {(prevResource || nextResource) && (
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-muted/25 dark:bg-muted/10 mr-1 shrink-0">
              <button
                onClick={() => prevResource && navigate(`/courses/${courseId}/resource/${prevResource.resource_id}`)}
                disabled={!prevResource}
                className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title={prevResource ? `Previous: ${prevResource.resource_name}` : "No previous resource"}
              >
                <ChevronLeft size={15} />
              </button>
              <div className="w-px h-4 bg-border" />
              <button
                onClick={() => nextResource && navigate(`/courses/${courseId}/resource/${nextResource.resource_id}`)}
                disabled={!nextResource}
                className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title={nextResource ? `Next: ${nextResource.resource_name}` : "No next resource"}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* Syllabus toggle */}
          <button
            onClick={() => setSyllabusOpen(!syllabusOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              syllabusOpen
                ? "bg-muted text-foreground border-border hover:bg-muted/80"
                : "bg-primary/10 text-primary border-primary/25 hover:bg-primary/20"
            }`}
            title={syllabusOpen ? "Close syllabus" : "Open syllabus"}
          >
            {syllabusOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            <span>{syllabusOpen ? "Close" : "Syllabus"}</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-border"
            title="Toggle Theme"
          >
            {isDarkTheme ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-1 rounded-lg p-0.5 hover:bg-muted/80 border border-border/60 transition-colors"
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

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

      {/* ═══ Main Content Area (full width, syllabus is overlay) ═══ */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Content Pane — always fills full width */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {loadingResource ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-muted-foreground font-semibold animate-pulse">Loading material...</span>
            </div>
          ) : errorResource ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 border border-border bg-card/30 rounded-xl m-6">
              <h4 className="text-sm font-bold text-destructive mb-1">Failed to load content</h4>
              <p className="text-xs text-muted-foreground">{errorResource}</p>
            </div>
          ) : activeResource ? (
            <>
              {/* ═══ Fix 3: CODING_PROBLEM fills full viewport ═══ */}
              {isCodingProblemView ? (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative select-text">
                  {loadingCodingProblem ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-3">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-muted-foreground font-medium animate-pulse">Mounting IDE Environment...</span>
                    </div>
                  ) : codingProblemError ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <h4 className="text-sm font-bold text-destructive mb-1">Failed to mount problem</h4>
                      <p className="text-xs text-muted-foreground max-w-sm">{codingProblemError}</p>
                    </div>
                  ) : codingProblem ? (
                    <div
                      ref={containerRef}
                      className="flex-1 flex flex-col lg:flex-row min-h-0 w-full overflow-hidden"
                      style={{ "--left-panel-width": `${leftWidth}%` } as React.CSSProperties}
                    >
                      <ProblemDescriptionPanel
                        problem={codingProblem}
                        activeLeftTab={activeLeftTab}
                        setActiveLeftTab={setActiveLeftTab}
                        activeEditorialLang={""}
                        setActiveEditorialLang={() => {}}
                        monacoTheme={monacoTheme}
                        activeMobilePane={"desc"}
                        submissionsList={submissionsList}
                        style={{
                          width: "var(--left-panel-width)",
                          pointerEvents: isDragging || isConsoleDragging ? "none" : "auto"
                        }}
                      />

                      <div
                        onMouseDown={handleMouseDown}
                        className="w-1 cursor-col-resize select-none h-full bg-border shrink-0 hover:bg-primary transition-colors"
                      />

                      <div
                        style={{
                          width: "calc(100% - var(--left-panel-width))",
                          pointerEvents: isDragging || isConsoleDragging ? "none" : "auto"
                        }}
                        className="flex flex-col h-full overflow-hidden bg-card"
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
                          problem={codingProblem}
                          isConsoleCollapsed={isConsoleCollapsed}
                          setIsConsoleCollapsed={setIsConsoleCollapsed}
                          runnerTab={runnerTab}
                          setRunnerTab={setRunnerTab}
                          activeSampleIdx={activeSampleIdx}
                          setActiveSampleIdx={setActiveSampleIdx}
                          runExecuted={false}
                          setRunExecuted={() => {}}
                          runSuccess={false}
                          isRunning={false}
                          runStep={""}
                          manualInput={manualInput}
                          setManualInput={setManualInput}
                          manualOutput={""}
                          onRunCode={() => setIsDownloadPromptOpen(true)}
                          onSubmitCode={() => setIsDownloadPromptOpen(true)}
                          consoleHeight={consoleHeight}
                          isConsoleDragging={isConsoleDragging}
                          onResizeMouseDown={handleConsoleResizeMouseDown}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                /* ═══ Non-coding resource: scrollable content ═══ */
                <div className="flex-1 min-h-0 overflow-y-auto p-6 scroll-smooth">
                  <div className="max-w-4xl mx-auto space-y-6 pb-20">
                    {/* Type 1: VIDEO */}
                    {activeResource.resource_type === "VIDEO" && activeResource.details && (
                      <div className="space-y-4">
                        <VideoPlayer video={activeResource.details} />
                        <div className="space-y-2">
                          <h1 className="text-xl font-extrabold text-foreground">{activeResource.resource_name}</h1>
                          {activeResource.details.description && (
                            <p className="text-sm text-foreground/90 leading-relaxed">{activeResource.details.description}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Type 2: READING_MATERIAL — Fix 1 & Fix 2 */}
                    {activeResource.resource_type === "READING_MATERIAL" && activeResource.details && (
                      <div className="space-y-6">
                        <h1 className="text-xl font-extrabold text-foreground pb-2 border-b border-border/50">
                          {activeResource.resource_name}
                        </h1>

                        {(activeResource.details.content || []).map((block: any, idx: number) => {
                          // ─── READING block: markdown + inline HTML ───
                          if (block.type === "READING" && block.data) {
                            return (
                              <div
                                key={idx}
                                className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground prose-li:text-foreground prose-table:text-xs font-sans"
                              >
                                <ReactMarkdown
                                  rehypePlugins={[rehypeRaw]}
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    pre: PreBlock,
                                    code: ({ node, className, children, ...props }) => {
                                      const isInsidePre = React.useContext(PreContext);
                                      if (isInsidePre) {
                                        return (
                                          <code className={className} {...props}>
                                            {children}
                                          </code>
                                        );
                                      }
                                      return (
                                        <code
                                          className="bg-muted px-1.5 py-0.5 rounded text-primary text-sm font-mono border border-border"
                                          {...props}
                                        >
                                          {children}
                                        </code>
                                      );
                                    },
                                    img: ({ node, ...props }) => (
                                      <div className="flex justify-center my-8 select-none">
                                        <div className="bg-white dark:bg-card p-3 rounded-2xl border border-border/80 dark:border-border/30 shadow-md hover:shadow-xl dark:shadow-primary/5 dark:hover:shadow-primary/15 hover:-translate-y-0.5 transition-all duration-300 max-w-full md:max-w-[85%]">
                                          <img
                                            className="rounded-xl max-h-[400px] object-contain mx-auto"
                                            {...props}
                                            alt={props.alt || "Resource illustration"}
                                          />
                                        </div>
                                      </div>
                                    ),
                                    table: ({ node, ...props }) => (
                                      <div className="overflow-x-auto my-6 border border-border/80 dark:border-border/30 rounded-xl shadow-md hover:shadow-xl dark:shadow-primary/5 dark:hover:shadow-primary/15 hover:-translate-y-0.5 transition-all duration-300 bg-card/20 select-text">
                                        <table className="min-w-full divide-y divide-border/60 text-left font-sans text-xs !my-0" {...props} />
                                      </div>
                                    ),
                                    thead: ({ node, ...props }) => (
                                      <thead className="bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60" {...props} />
                                    ),
                                    th: ({ node, ...props }) => (
                                      <th className="px-4 py-3 font-semibold text-foreground border-none" {...props} />
                                    ),
                                    td: ({ node, ...props }) => (
                                      <td className="px-4 py-3 border-t border-border/40 dark:border-border/20 text-muted-foreground font-medium" {...props} />
                                    ),
                                    tr: ({ node, ...props }) => (
                                      <tr className="hover:bg-muted/10 transition-colors border-none" {...props} />
                                    )
                                  }}
                                >
                                  {block.data.content}
                                </ReactMarkdown>
                              </div>
                            );
                          }

                          // ─── MCQ block (inline within reading material) ─── Fix 2
                          if (block.type === "MCQ" && block.data) {
                            return <InlineMcqCard key={idx} mcq={block.data} />;
                          }

                          // ─── CODE block ───
                          if (block.type === "CODE" && block.data) {
                            return (
                              <InlineCodeEditor
                                key={idx}
                                initialCode={block.data.code}
                                language={block.data.language || "cpp"}
                                title={`Example ${idx + 1}`}
                              />
                            );
                          }

                          // ─── VIDEO block (embedded) ───
                          if (block.type === "VIDEO" && block.data?.details) {
                            return (
                              <div key={idx} className="my-4">
                                <VideoPlayer video={block.data.details} />
                              </div>
                            );
                          }

                          // ─── EXTERNAL block ───
                          if (block.type === "EXTERNAL" && block.data) {
                            const list = Array.isArray(block.data) ? block.data : [];
                            return (
                              <div key={idx} className="space-y-3 my-6">
                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Practice Tasks</h4>
                                <div className="grid grid-cols-1 gap-3">
                                  {list.map((item: any, i: number) => (
                                    <a
                                      key={i}
                                      href={item.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-stretch bg-card hover:bg-muted/40 border border-border hover:border-primary/30 rounded-xl transition-all group overflow-hidden"
                                    >
                                      <div className="flex items-center justify-center bg-muted/40 dark:bg-muted/20 px-3 border-r border-border shrink-0 group-hover:bg-muted/60 transition-colors">
                                        {getPlatformLogo(item.platform)}
                                      </div>
                                      <div className="flex-1 flex items-center justify-between p-3 min-w-0">
                                        <div className="space-y-0.5 min-w-0 pr-4">
                                          <div className="line-clamp-1 group-hover:text-primary transition-colors text-xs font-semibold text-foreground">{item.title}</div>
                                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono font-bold block">
                                            {item.platform}
                                          </span>
                                        </div>
                                        <ExternalLink size={13} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    )}

                    {/* Type 3: EXTERNAL (top-level) */}
                    {activeResource.resource_type === "EXTERNAL" && activeResource.details && (
                      <div className="space-y-4">
                        <h1 className="text-xl font-extrabold text-foreground pb-2 border-b border-border/50">
                          {activeResource.resource_name}
                        </h1>

                        <div className="grid grid-cols-1 gap-4 pt-2">
                          {(Array.isArray(activeResource.details.data) ? activeResource.details.data : []).map((item: any, i: number) => (
                            <a
                              key={i}
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-stretch bg-card hover:bg-muted/40 border border-border hover:border-primary/30 rounded-xl transition-all group overflow-hidden"
                            >
                              <div className="flex items-center justify-center bg-muted/40 dark:bg-muted/20 px-3.5 border-r border-border shrink-0 group-hover:bg-muted/60 transition-colors">
                                {getPlatformLogo(item.platform)}
                              </div>
                              <div className="flex-1 flex items-center justify-between p-3.5 min-w-0">
                                <div className="space-y-0.5 min-w-0 pr-4">
                                  <div className="line-clamp-1 group-hover:text-primary transition-colors text-xs font-semibold text-foreground">
                                    {item.title}
                                  </div>
                                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono font-bold block">
                                    {item.platform}
                                  </span>
                                </div>
                                <ExternalLink size={13} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manual Completions Bottom Bar (non-coding resources only) */}
                    {activeResource.resource_type !== "CODING_PROBLEM" && (
                      <div className="pt-8 border-t border-border/50 flex justify-center">
                        <button
                          onClick={handleToggleCompletion}
                          disabled={completionUpdating}
                          className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl transition-all shadow-sm ${
                            activeResource.isCompleted
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-primary text-primary-foreground hover:bg-primary/95 border border-transparent"
                          }`}
                        >
                          {activeResource.isCompleted ? (
                            <>
                              <Check size={14} strokeWidth={3} />
                              <span>Completed (Click to undo)</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={14} />
                              <span>{completionUpdating ? "Updating..." : "Mark as Completed"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Option B: Inline Bottom Content Navigation Footer */}
                    {activeResource.resource_type !== "CODING_PROBLEM" && (prevResource || nextResource) && (
                      <div className="mt-8 pt-6 border-t border-border/50 grid grid-cols-2 gap-4">
                        <div>
                          {prevResource ? (
                            <button
                              onClick={() => navigate(`/courses/${courseId}/resource/${prevResource.resource_id}`)}
                              className="w-full flex flex-col items-start gap-1 p-4 bg-muted/20 hover:bg-muted/40 border border-border hover:border-primary/20 rounded-xl transition-all group text-left"
                            >
                              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1 group-hover:text-primary transition-colors">
                                <ChevronLeft size={10} strokeWidth={3} /> Previous Task
                              </span>
                              <span className="text-xs font-semibold text-foreground truncate w-full">
                                {prevResource.resource_name}
                              </span>
                            </button>
                          ) : (
                            <div className="h-full border border-dashed border-border/40 rounded-xl p-4 flex items-center justify-center text-[10px] text-muted-foreground/60 italic font-medium">
                              No previous task
                            </div>
                          )}
                        </div>
                        <div>
                          {nextResource ? (
                            <button
                              onClick={() => navigate(`/courses/${courseId}/resource/${nextResource.resource_id}`)}
                              className="w-full flex flex-col items-end gap-1 p-4 bg-muted/20 hover:bg-muted/40 border border-border hover:border-primary/20 rounded-xl transition-all group text-right"
                            >
                              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1 group-hover:text-primary transition-colors">
                                Next Task <ChevronRight size={10} strokeWidth={3} />
                              </span>
                              <span className="text-xs font-semibold text-foreground truncate w-full">
                                {nextResource.resource_name}
                              </span>
                            </button>
                          ) : (
                            <div className="h-full border border-dashed border-border/40 rounded-xl p-4 flex items-center justify-center text-[10px] text-muted-foreground/60 italic font-medium">
                              Course completed! 🎉
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 max-w-lg mx-auto space-y-6">
              {course.image ? (
                <div className="w-full aspect-video rounded-2xl overflow-hidden border border-border shadow-md">
                  <img src={course.image} alt={course.course_name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center text-primary/70 animate-pulse border border-primary/10">
                  <BookOpen size={28} />
                </div>
              )}
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-foreground">{course.course_name}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Choose a reading note, video player, coding problem, or external assignment from the syllabus panel to begin.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Fix 4: Overlay Syllabus Drawer ═══ */}
        <AnimatePresence>
          {syllabusOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSyllabusOpen(false)}
                className="absolute inset-0 bg-black z-40"
              />

              {/* Drawer Panel */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="absolute right-0 top-0 bottom-0 w-80 bg-card border-l border-border flex flex-col z-50 shadow-2xl select-none"
              >
                {/* Drawer Header */}
                <div className="h-12 border-b border-border bg-card/80 flex items-center justify-between px-4 shrink-0">
                  <span className="font-bold text-xs uppercase text-muted-foreground tracking-wider">
                    Course Syllabus
                  </span>
                  <button
                    onClick={() => setSyllabusOpen(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    title="Close syllabus"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Syllabus Tree */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  {course.chapters.map((chapter) => {
                    const isCollapsed = collapsedChapters[chapter.chapter_id] !== false;
                    const hasActiveChapter = chapter.playlists.some((pl) =>
                      pl.resources.some((res) => resourceId === res.resource_id.toString())
                    );

                    return (
                      <div
                        key={chapter.chapter_id}
                        ref={hasActiveChapter ? activeChapterRef : undefined}
                        className="space-y-1"
                      >
                        {/* Chapter Title Row */}
                        <button
                          onClick={() => toggleChapter(chapter.chapter_id)}
                          className="w-full flex items-center justify-between py-1.5 px-2 rounded-md text-xs font-bold text-foreground/90 text-left hover:bg-muted/50 transition-colors"
                        >
                          <span className="truncate pr-2">{chapter.chapter_name}</span>
                          <ChevronDown
                            size={14}
                            className={`text-muted-foreground shrink-0 transition-transform duration-150 ${
                              isCollapsed ? "-rotate-90" : "rotate-0"
                            }`}
                          />
                        </button>

                        {/* Playlists and Resources under Chapter */}
                        {!isCollapsed && (
                          <div className="pl-3 space-y-3.5 border-l border-border/40 ml-3.5 py-1">
                            {chapter.playlists.map((playlist) => {
                              return (
                                <div
                                  key={playlist.playlist_id}
                                  className="space-y-1"
                                >
                                  <div className="px-2 py-0.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                                    {playlist.playlist_name}
                                  </div>

                                  <div className="flex flex-col gap-0.5">
                                    {playlist.resources.map((res) => {
                                      const isActive = resourceId === res.resource_id.toString();

                                      return (
                                        <button
                                          key={res.resource_id}
                                          onClick={() => {
                                            navigate(`/courses/${courseId}/resource/${res.resource_id}`);
                                            setSyllabusOpen(false);
                                          }}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-xs transition-colors ${
                                          isActive
                                            ? "bg-primary/10 text-primary font-semibold"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                          {getResourceIcon(res.resource_type)}
                                          <span className="truncate">
                                            {res.resource_name}
                                          </span>
                                        </div>

                                        {res.resource_type !== "CODING_PROBLEM" ? (
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleResourceCompletionById(res.resource_id, res.isCompleted);
                                            }}
                                            className="p-1 -mr-1 rounded hover:bg-muted/80 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                                            title={res.isCompleted ? "Mark as Incomplete" : "Mark as Completed"}
                                          >
                                            {res.isCompleted ? (
                                              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" strokeWidth={3} />
                                            ) : (
                                              <Circle size={13} className="text-muted-foreground/30 hover:text-muted-foreground/70 shrink-0" />
                                            )}
                                          </span>
                                        ) : (
                                          <span className="p-1 -mr-1 shrink-0 select-none flex items-center justify-center opacity-60">
                                            {res.isCompleted ? (
                                              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" strokeWidth={3} />
                                            ) : (
                                              <Circle size={13} className="text-muted-foreground/20 shrink-0" />
                                            )}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Compiler Interceptor Modal */}
      <DownloadPromptModal
        isOpen={isDownloadPromptOpen}
        onClose={() => setIsDownloadPromptOpen(false)}
      />
    </div>
  );
};
export default CourseViewer;
