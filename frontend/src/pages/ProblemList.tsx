import React, { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";
import { Search, Tag as TagIcon, ArrowLeft, ArrowRight, Eye, Filter, ChevronDown, X } from "lucide-react";

interface ProblemSummary {
  id: number;
  title: string;
  difficulty: number;
  timeLimitSec: number;
  memoryLimitMb: number;
  tags: { name: string }[];
}

interface TagSummary {
  id: string;
  name: string;
}

export const ProblemList: React.FC = () => {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 1
  });

  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const selectedTag = searchParams.get("tag") || "";

  const [searchInput, setSearchInput] = useState(search);

  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [diffDropdownOpen, setDiffDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const diffDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setTagDropdownOpen(false);
      }
      if (diffDropdownRef.current && !diffDropdownRef.current.contains(event.target as Node)) {
        setDiffDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await api.get<TagSummary[]>("/problems/tags");
        setTags(res.data);
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    const fetchProblems = async () => {
      setLoading(true);
      try {
        let endpoint = `/problems?page=${page}&limit=20`;
        if (search) endpoint += `&search=${encodeURIComponent(search)}`;
        if (difficulty) endpoint += `&difficulty=${difficulty}`;
        if (selectedTag) endpoint += `&tag=${encodeURIComponent(selectedTag)}`;

        const res = await api.get<{ problems: ProblemSummary[]; pagination: any }>(endpoint);
        setProblems(res.data.problems);
        setPagination(res.data.pagination);
      } catch (err) {
        console.error("Failed to fetch problems:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
  }, [page, search, difficulty, selectedTag]);

  const updateFilters = (newFilters: { [key: string]: string | number }) => {
    const updatedParams = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === "") {
        updatedParams.delete(key);
      } else {
        updatedParams.set(key, value.toString());
      }
    });

    if (!newFilters.page) {
      updatedParams.delete("page");
    }

    setSearchParams(updatedParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1: return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case 2: return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case 3: return "text-red-500 bg-red-500/10 border-red-500/20";
      default: return "text-purple-500 bg-purple-500/10 border-purple-500/20";
    }
  };

  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1: return "Easy";
      case 2: return "Medium";
      case 3: return "Hard";
      default: return "Harder";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Problems</h1>
        <p className="text-sm text-muted-foreground">Solve tasks, explore editorials, and improve your skills.</p>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search problems..."
            className="w-full bg-background border border-input rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Topic Tag Dropdown */}
          <div className="relative flex-1 md:flex-none md:w-48" ref={tagDropdownRef}>
            <button
              type="button"
              onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
              className="w-full bg-background border border-input rounded-lg py-2 pl-9 pr-8 text-sm text-left flex items-center justify-between cursor-pointer focus:outline-none hover:bg-muted/30 transition-all font-semibold truncate relative"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                <TagIcon size={16} />
              </span>
              <span className="truncate pr-4">{selectedTag || "All Topics"}</span>
              
              {selectedTag && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateFilters({ tag: "" });
                  }}
                  className="absolute inset-y-0 right-8 flex items-center pr-1 text-muted-foreground hover:text-foreground z-10"
                  title="Clear topic filter"
                >
                  <X size={12} />
                </button>
              )}
              
              <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${tagDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            
            <AnimatePresence>
              {tagDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 mt-1.5 w-64 rounded-xl border border-border bg-card p-1.5 shadow-lg z-50 overflow-hidden"
                >
                  {/* Inner Search bar */}
                  <div className="relative mb-1.5 p-1 border-b border-border/40 pb-2">
                    <span className="absolute inset-y-0 left-3.5 flex items-center text-muted-foreground pointer-events-none">
                      <Search size={12} />
                    </span>
                    <input
                      type="text"
                      placeholder="Search topic..."
                      className="w-full bg-background border border-input rounded-lg py-1 pl-7 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      value={tagSearchQuery}
                      onChange={(e) => setTagSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        updateFilters({ tag: "" });
                        setTagDropdownOpen(false);
                        setTagSearchQuery("");
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-muted/50 transition-colors ${
                        !selectedTag ? "text-primary bg-primary/5 font-bold" : "text-foreground"
                      }`}
                    >
                      All Topics
                    </button>
                    {filteredTags.map((tag) => (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => {
                          updateFilters({ tag: tag.name });
                          setTagDropdownOpen(false);
                          setTagSearchQuery("");
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-muted/50 transition-colors truncate ${
                          selectedTag === tag.name ? "text-primary bg-primary/5 font-bold" : "text-foreground"
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                    {filteredTags.length === 0 && (
                      <div className="text-[10px] text-muted-foreground text-center py-3">No topics found</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Difficulty Dropdown */}
          <div className="relative flex-1 md:flex-none md:w-40" ref={diffDropdownRef}>
            <button
              type="button"
              onClick={() => setDiffDropdownOpen(!diffDropdownOpen)}
              className={`w-full bg-background border border-input rounded-lg py-2 pl-9 pr-8 text-sm text-left flex items-center justify-between cursor-pointer focus:outline-none hover:bg-muted/30 transition-all font-semibold truncate relative ${
                difficulty === "1" ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10" :
                difficulty === "2" ? "border-amber-500/30 text-amber-500 bg-amber-500/5 hover:bg-amber-500/10" :
                difficulty === "3" ? "border-red-500/30 text-red-500 bg-red-500/5 hover:bg-red-500/10" :
                difficulty === "4" ? "border-purple-500/30 text-purple-500 bg-purple-500/5 hover:bg-purple-500/10" : ""
              }`}
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                <Filter size={16} />
              </span>
              <span className="truncate pr-4">
                {difficulty === "1" ? "Easy" :
                 difficulty === "2" ? "Medium" :
                 difficulty === "3" ? "Hard" :
                 difficulty === "4" ? "Harder" : "All Difficulties"}
              </span>
              
              {difficulty && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateFilters({ difficulty: "" });
                  }}
                  className="absolute inset-y-0 right-8 flex items-center pr-1 text-muted-foreground hover:text-foreground z-10"
                  title="Clear difficulty filter"
                >
                  <X size={12} />
                </button>
              )}
              
              <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${diffDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            
            <AnimatePresence>
              {diffDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 mt-1.5 w-full min-w-[160px] rounded-xl border border-border bg-card p-1 shadow-lg z-50 overflow-hidden"
                >
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        updateFilters({ difficulty: "" });
                        setDiffDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-muted transition-colors ${
                        !difficulty ? "text-foreground bg-muted font-bold" : "text-muted-foreground"
                      }`}
                    >
                      All Difficulties
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilters({ difficulty: "1" });
                        setDiffDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-500/10 transition-colors ${
                        difficulty === "1" ? "text-emerald-500 bg-emerald-500/5 font-bold" : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-500"
                      }`}
                    >
                      Easy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilters({ difficulty: "2" });
                        setDiffDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-500/10 transition-colors ${
                        difficulty === "2" ? "text-amber-500 bg-amber-500/5 font-bold" : "text-amber-600 dark:text-amber-400 hover:text-amber-500"
                      }`}
                    >
                      Medium
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilters({ difficulty: "3" });
                        setDiffDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500/10 transition-colors ${
                        difficulty === "3" ? "text-red-500 bg-red-500/5 font-bold" : "text-red-600 dark:text-red-400 hover:text-red-500"
                      }`}
                    >
                      Hard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilters({ difficulty: "4" });
                        setDiffDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-500/10 transition-colors ${
                        difficulty === "4" ? "text-purple-500 bg-purple-500/5 font-bold" : "text-purple-600 dark:text-purple-400 hover:text-purple-500"
                      }`}
                    >
                      Harder
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border-0 md:border border-border bg-transparent md:bg-card md:shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-card rounded-xl border border-border md:border-0">
            <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="text-sm">Loading problems...</span>
          </div>
        ) : problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-card rounded-xl border border-border md:border-0">
            <span className="text-sm mb-4">No problems match your filters.</span>
            <button
              onClick={() => setSearchParams({})}
              className="px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-md text-sm font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card List View (Visible on mobile, hidden on desktop) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {problems.map((problem) => (
                <div key={problem.id} className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground font-semibold px-1.5 py-0.5 rounded bg-muted/60">
                          #{problem.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getDifficultyColor(problem.difficulty)}`}>
                          {getDifficultyLabel(problem.difficulty)}
                        </span>
                      </div>
                      <Link to={`/problems/${problem.id}`} className="font-bold text-sm text-foreground hover:text-primary transition-colors block truncate">
                        {problem.title}
                      </Link>
                    </div>
                    
                    <Link
                      to={`/problems/${problem.id}`}
                      className="flex items-center justify-center size-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shrink-0 shadow-sm"
                      title="Solve Problem"
                    >
                      <Eye size={15} />
                    </Link>
                  </div>

                  {/* Topic Tags */}
                  {problem.tags && problem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-t border-border/40 pt-2.5">
                      {problem.tags.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          onClick={() => updateFilters({ tag: t.name })}
                          className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px] cursor-pointer hover:bg-foreground hover:text-background transition-colors"
                        >
                          {t.name}
                        </span>
                      ))}
                      {problem.tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground pt-0.5 font-medium align-middle">
                          +{problem.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View (Hidden on mobile, visible on desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-3 font-medium text-muted-foreground w-16">ID</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Title</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Difficulty</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Topics</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {problems.map((problem) => (
                    <tr key={problem.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 text-muted-foreground font-mono">{problem.id}</td>
                      <td className="px-6 py-4">
                        <Link to={`/problems/${problem.id}`} className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {problem.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${getDifficultyColor(problem.difficulty)}`}>
                          {getDifficultyLabel(problem.difficulty)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[250px] truncate">
                          {problem.tags.slice(0, 3).map((t, idx) => (
                            <span
                              key={idx}
                              onClick={() => updateFilters({ tag: t.name })}
                              className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px] cursor-pointer hover:bg-foreground hover:text-background transition-colors"
                            >
                              {t.name}
                            </span>
                          ))}
                          {problem.tags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground align-middle">+{problem.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/problems/${problem.id}`}
                          className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Solve Problem"
                        >
                          <Eye size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && problems.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing <span className="font-medium text-foreground">{pagination.page}</span> of <span className="font-medium text-foreground">{pagination.totalPages}</span> pages
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => updateFilters({ page: pagination.page - 1 })}
              className="px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              Prev
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateFilters({ page: pagination.page + 1 })}
              className="px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-1"
            >
              Next
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProblemList;
