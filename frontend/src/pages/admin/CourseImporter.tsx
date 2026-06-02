import React, { useState, useRef, useEffect } from "react";
import api from "../../lib/api";
import {
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Info,
  BookOpen,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Clock,
  Settings,
  Plus
} from "lucide-react";

interface ValidationResult {
  valid: boolean;
  message?: string;
  courseDetails?: {
    id: number;
    name: string;
    chaptersCount: number;
    playlistsCount: number;
    resourcesCount: number;
    difficulty: string;
    isFree: boolean;
    timeInMinutes: number;
  };
}

interface CourseAdmin {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  difficulty: string | null;
  isFree: boolean;
  timeInMinutes: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  chaptersCount: number;
  playlistsCount: number;
  resourcesCount: number;
}

export const CourseImporter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"manage" | "import">("manage");

  // --- Course List State ---
  const [courses, setCourses] = useState<CourseAdmin[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  // --- Course Import State ---
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [courseData, setCourseData] = useState<any | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [syncOutcome, setSyncOutcome] = useState<{ type: "success" | "skipped" | "error"; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Fetch Courses for Management ---
  const fetchCourses = async () => {
    setLoadingCourses(true);
    setCoursesError(null);
    try {
      const res = await api.get<CourseAdmin[]>("/admin/courses");
      setCourses(res.data);
    } catch (err: any) {
      setCoursesError(err.message || "Failed to load courses list.");
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    if (activeTab === "manage") {
      fetchCourses();
    }
  }, [activeTab]);

  // --- Visibility Toggle Action ---
  const handleToggleVisibility = async (courseId: number, currentVisibility: boolean) => {
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.add(courseId);
      return next;
    });

    try {
      const nextVisibility = !currentVisibility;
      await api.patch(`/admin/courses/${courseId}/visibility`, { isVisible: nextVisibility });
      setCourses((prevCourses) =>
        prevCourses.map((c) => (c.id === courseId ? { ...c, isVisible: nextVisibility } : c))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update course visibility.");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
    }
  };

  // --- Cascade Delete Action ---
  const handleDeleteCourse = async (courseId: number, courseName: string) => {
    const message = `Are you sure you want to delete "${courseName}"?\n\n` +
      `WARNING: This will permanently delete this course and all its chapters, playlists, resource details, and user completions.\n\n` +
      `IMPORTANT: The programming problem statements, tests, and student submissions will NOT be deleted.`;

    if (!window.confirm(message)) {
      return;
    }

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(courseId);
      return next;
    });

    try {
      await api.delete(`/admin/courses/${courseId}`);
      setCourses((prevCourses) => prevCourses.filter((c) => c.id !== courseId));
    } catch (err: any) {
      alert(err.message || "Failed to delete course.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
    }
  };

  // --- Ingestion JSON Validator ---
  const validateCourseJSON = (json: any): ValidationResult => {
    if (!json || typeof json !== "object") {
      return { valid: false, message: "Invalid JSON format: Must be an object." };
    }
    if (!json.course_id) {
      return { valid: false, message: "Missing required property: 'course_id'." };
    }
    if (!json.course_name) {
      return { valid: false, message: "Missing required property: 'course_name'." };
    }
    if (!json.chapters || !Array.isArray(json.chapters)) {
      return { valid: false, message: "Missing or invalid property: 'chapters' must be an array." };
    }

    let playlistsCount = 0;
    let resourcesCount = 0;

    for (const ch of json.chapters) {
      if (ch.playlists && Array.isArray(ch.playlists)) {
        playlistsCount += ch.playlists.length;
        for (const pl of ch.playlists) {
          if (pl.resources && Array.isArray(pl.resources)) {
            resourcesCount += pl.resources.length;
          }
        }
      }
    }

    return {
      valid: true,
      courseDetails: {
        id: json.course_id,
        name: json.course_name,
        chaptersCount: json.chapters.length,
        playlistsCount,
        resourcesCount,
        difficulty: json.difficulty || "Not specified",
        isFree: !!json.is_free,
        timeInMinutes: json.time_in_minutes || 0
      }
    };
  };

  const handleFile = async (file: File) => {
    setValidation(null);
    setCourseData(null);
    setSyncOutcome(null);
    setStatus("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        const valRes = validateCourseJSON(parsed);
        setValidation(valRes);
        if (valRes.valid) {
          setCourseData(parsed);
        } else {
          setCourseData(null);
        }
      } catch (err: any) {
        setValidation({
          valid: false,
          message: `Failed to parse JSON file: ${err.message || err}`
        });
      }
    };
    reader.onerror = () => {
      setValidation({ valid: false, message: "Error reading file." });
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".json")) {
        handleFile(file);
      } else {
        setValidation({ valid: false, message: "Only JSON files are supported." });
      }
    }
  };

  const runCourseSync = async () => {
    if (!courseData) return;
    setIsSyncing(true);
    setSyncOutcome(null);
    setStatus("Uploading payload and synchronizing syllabus details...");

    try {
      const res = await api.post<any>("/admin/courses/import", courseData);
      const outcome = res.data;

      if (outcome.status === "skipped") {
        setSyncOutcome({
          type: "skipped",
          message: outcome.message || "Course is already up-to-date."
        });
      } else {
        setSyncOutcome({
          type: "success",
          message: outcome.message || "Course imported successfully."
        });
      }
      setStatus("Syllabus synchronization completed!");
    } catch (err: any) {
      setSyncOutcome({
        type: "error",
        message: err.message || "An unexpected error occurred during import."
      });
      setStatus("Sync aborted due to errors.");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Filtering Courses for Management ---
  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="size-6 text-primary" />
            <span>Course Management</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage course visibility, view database catalog stats, and ingest new syllabus JSON structures.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-muted/40 border border-border p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("manage")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "manage"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Settings size={14} />
            <span>Manage Courses</span>
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "import"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Plus size={14} />
            <span>Import Course</span>
          </button>
        </div>
      </div>

      {activeTab === "manage" ? (
        // --- Tab 1: Course Management List ---
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search courses in database..."
                className="w-full bg-card border border-input focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-1.5 pl-9 pr-4 text-xs text-foreground outline-none transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground font-semibold">
              Total Courses: {courses.length}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {loadingCourses ? (
              <div className="p-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Loading database catalog...</span>
              </div>
            ) : coursesError ? (
              <div className="p-12 text-center text-destructive text-sm font-semibold">{coursesError}</div>
            ) : filteredCourses.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm font-medium">
                No courses found in database. Feel free to import one!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      <th className="py-3 px-4">Course Info</th>
                      <th className="py-3 px-4">Syllabus Details</th>
                      <th className="py-3 px-4">Difficulty & Pricing</th>
                      <th className="py-3 px-4">Visibility</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {filteredCourses.map((course) => {
                      const isToggling = togglingIds.has(course.id);
                      const isDeleting = deletingIds.has(course.id);

                      return (
                        <tr key={course.id} className="hover:bg-muted/10 transition-colors">
                          {/* Course Thumbnail & Title */}
                          <td className="py-4 px-4 max-w-[280px]">
                            <div className="flex gap-3">
                              <div className="h-10 w-16 rounded overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                                {course.image ? (
                                  <img src={course.image} alt={course.name} className="h-full w-full object-cover" />
                                ) : (
                                  <BookOpen className="size-5 opacity-40 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-foreground truncate block">
                                  {course.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                  {course.description || "No description provided."}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Syllabus Stats */}
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1 text-[10px] font-medium text-foreground">
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                                <span>{course.chaptersCount} Chapters</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                                <span>{course.playlistsCount} Playlists</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                                <span>{course.resourcesCount} Resources</span>
                              </span>
                            </div>
                          </td>

                          {/* Difficulty, Pricing, Time */}
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 select-none">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase shrink-0 ${
                                  course.difficulty?.toLowerCase() === "beginner"
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : course.difficulty?.toLowerCase() === "intermediate"
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                }`}>
                                  {course.difficulty || "Undefined"}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase shrink-0 ${
                                  course.isFree
                                    ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                                    : "bg-muted text-muted-foreground border-border"
                                }`}>
                                  {course.isFree ? "Free" : "Paid"}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                                <Clock size={11} />
                                <span>{course.timeInMinutes ? `${course.timeInMinutes} mins` : "Self-paced"}</span>
                              </span>
                            </div>
                          </td>

                          {/* Visibility Toggle Button */}
                          <td className="py-4 px-4">
                            <button
                              onClick={() => handleToggleVisibility(course.id, course.isVisible)}
                              disabled={isToggling}
                              className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all select-none ${
                                course.isVisible
                                  ? "bg-green-500/10 text-green-500 border-green-500/25 hover:bg-green-500/20"
                                  : "bg-muted text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                              } disabled:opacity-50`}
                              title={course.isVisible ? "Visible to students. Click to hide." : "Hidden from students. Click to publish."}
                            >
                              {isToggling ? (
                                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : course.isVisible ? (
                                <Eye size={13} />
                              ) : (
                                <EyeOff size={13} />
                              )}
                              <span>{course.isVisible ? "Visible" : "Hidden"}</span>
                            </button>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleDeleteCourse(course.id, course.name)}
                              disabled={isDeleting}
                              className="p-2 rounded-lg border border-border/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 inline-flex items-center justify-center"
                              title={`Delete course details for "${course.name}"`}
                            >
                              {isDeleting ? (
                                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // --- Tab 2: Existing Ingestion Dropzone & Valiator ---
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side (Dropzone and details) */}
          <div className="lg:col-span-2 space-y-6">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary bg-muted/10 hover:bg-muted/30"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
              <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <UploadCloud size={32} />
              </div>
              <div className="text-center select-none">
                <p className="text-sm font-medium text-foreground">
                  Drag & drop course JSON or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">Supports single course syllabus file</p>
              </div>
            </div>

            {/* Validation Error Banner */}
            {validation && !validation.valid && (
              <div className="border border-destructive/20 rounded-xl p-6 bg-destructive/5 flex gap-3 text-sm text-destructive items-start">
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block">File Validation Failed</strong>
                  <span className="text-xs mt-1 block font-mono bg-background/50 p-2 rounded border border-destructive/10">
                    {validation.message}
                  </span>
                </div>
              </div>
            )}

            {/* Course Details Pre-Ingest Panel */}
            {validation && validation.valid && validation.courseDetails && (
              <div className="border border-border rounded-xl p-6 bg-card shadow-sm space-y-6">
                <div className="border-b border-border pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-base">Syllabus Overview</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Verify parsed metadata fields.</p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                    ID: {validation.courseDetails.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Course Name", value: validation.courseDetails.name, span: "col-span-2" },
                    { label: "Difficulty", value: validation.courseDetails.difficulty },
                    { label: "Price Tier", value: validation.courseDetails.isFree ? "Free" : "Paid" },
                    { label: "Total Duration", value: `${validation.courseDetails.timeInMinutes} mins` },
                    { label: "Chapters Count", value: validation.courseDetails.chaptersCount },
                    { label: "Playlists Count", value: validation.courseDetails.playlistsCount },
                    { label: "Resources Count", value: validation.courseDetails.resourcesCount }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg bg-muted/40 border border-border/60 ${
                        item.span || ""
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                        {item.label}
                      </span>
                      <span className="text-xs font-semibold text-foreground mt-1 block truncate">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {!isSyncing && !syncOutcome ? (
                  <button
                    onClick={runCourseSync}
                    className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Trigger Database Sync
                  </button>
                ) : (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-primary truncate pr-4">{status}</span>
                    </div>
                    {isSyncing && (
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary h-full rounded-full w-1/3 animate-pulse" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side (Outcome details & Helper info) */}
          <div className="space-y-6">
            {/* Sync Outcomes */}
            {syncOutcome && (
              <div
                className={`border rounded-xl p-6 shadow-sm space-y-3 ${
                  syncOutcome.type === "success"
                    ? "border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400"
                    : syncOutcome.type === "skipped"
                    ? "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                    : "border-destructive/20 bg-destructive/5 text-destructive"
                }`}
              >
                <h4 className="text-sm font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                  {syncOutcome.type === "success" && <CheckCircle size={16} />}
                  {syncOutcome.type === "skipped" && <Info size={16} />}
                  {syncOutcome.type === "error" && <AlertCircle size={16} />}
                  <span>Syllabus Sync Outcome</span>
                </h4>
                <p className="text-xs leading-relaxed font-mono p-3 bg-background border border-border/60 rounded-lg text-foreground">
                  {syncOutcome.message}
                </p>
              </div>
            )}

            {/* Quick Info Box */}
            <div className="p-5 border border-border bg-card rounded-xl shadow-sm space-y-4">
              <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-2">
                <Info size={14} className="text-primary" />
                <span>Ingestion Guide</span>
              </h3>
              <ul className="text-xs space-y-2.5 leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>
                    <strong>Cascading Updates</strong>: Importing a course with modified chapters will
                    cascade-delete the previous structure and seed the new hierarchy cleanly.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>
                    <strong>MD5 Optimization</strong>: The backend checks file content hash. Unmodified
                    files are skipped instantly, reducing DB load.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>
                    <strong>Referential Integrity</strong>: Problems linked in `CODING_PROBLEM` resources must
                    exist in the global Problem list first. Make sure to run Seeder first if needed.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CourseImporter;
