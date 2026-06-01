import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Tag as TagIcon, ChevronDown, X, Filter, CheckSquare } from "lucide-react";

interface TagSummary {
  id: string;
  name: string;
}

interface FilterBarProps {
  searchInput: string;
  setSearchInput: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  selectedTag: string;
  difficulty: string;
  status: string;
  tags: TagSummary[];
  updateFilters: (newFilters: { [key: string]: string | number }) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchInput,
  setSearchInput,
  onSearchSubmit,
  selectedTag,
  difficulty,
  status,
  tags,
  updateFilters
}) => {
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [diffDropdownOpen, setDiffDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const diffDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setTagDropdownOpen(false);
      }
      if (diffDropdownRef.current && !diffDropdownRef.current.contains(event.target as Node)) {
        setDiffDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  return (
    <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col lg:flex-row gap-4 items-center">
      <form onSubmit={onSearchSubmit} className="relative flex-1 w-full">
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

      <div className="grid grid-cols-2 lg:flex lg:items-center gap-3 w-full lg:w-auto">
        {/* Topic Tag Dropdown */}
        <div className="relative col-span-1 lg:flex-none lg:w-48" ref={tagDropdownRef}>
          <div
            onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
            className="w-full bg-background border border-input rounded-lg py-2 pl-9 pr-3 text-sm text-left flex items-center justify-between cursor-pointer focus:outline-none hover:bg-muted/30 transition-all font-semibold truncate relative"
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <TagIcon size={16} />
            </span>
            <span className="truncate pr-4">{selectedTag || "All Topics"}</span>

            <div className="flex items-center gap-1 shrink-0">
              {selectedTag && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateFilters({ tag: "" });
                  }}
                  className="text-muted-foreground hover:text-foreground z-10 p-0.5 rounded hover:bg-muted transition-colors flex items-center justify-center cursor-pointer"
                  title="Clear topic filter"
                >
                  <X size={12} />
                </button>
              )}
              <ChevronDown
                size={14}
                className={`text-muted-foreground transition-transform duration-200 shrink-0 ${tagDropdownOpen ? "rotate-180" : ""}`}
              />
            </div>
          </div>

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
                        selectedTag === tag.name
                          ? "text-primary bg-primary/5 font-bold"
                          : "text-foreground"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                  {filteredTags.length === 0 && (
                    <div className="text-[10px] text-muted-foreground text-center py-3">
                      No topics found
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Difficulty Dropdown */}
        <div className="relative col-span-1 lg:flex-none lg:w-40" ref={diffDropdownRef}>
          <div
            onClick={() => setDiffDropdownOpen(!diffDropdownOpen)}
            className={`w-full bg-background border border-input rounded-lg py-2 pl-9 pr-3 text-sm text-left flex items-center justify-between cursor-pointer focus:outline-none hover:bg-muted/30 transition-all font-semibold truncate relative ${
              difficulty === "1"
                ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10"
                : difficulty === "2"
                  ? "border-cyan-500/30 text-cyan-500 bg-cyan-500/5 hover:bg-cyan-500/10"
                  : difficulty === "3"
                    ? "border-amber-500/30 text-amber-500 bg-amber-500/5 hover:bg-amber-500/10"
                    : difficulty === "4"
                      ? "border-red-500/30 text-red-500 bg-red-500/5 hover:bg-red-500/10"
                      : difficulty === "5"
                        ? "border-purple-500/30 text-purple-500 bg-purple-500/5 hover:bg-purple-500/10"
                        : ""
            }`}
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <Filter size={16} />
            </span>
            <span className="truncate pr-4">
              {difficulty === "1"
                ? "Novice"
                : difficulty === "2"
                  ? "Easy"
                  : difficulty === "3"
                    ? "Medium"
                    : difficulty === "4"
                      ? "Hard"
                      : difficulty === "5"
                        ? "Extreme"
                        : "All Difficulties"}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {difficulty && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateFilters({ difficulty: "" });
                  }}
                  className="text-muted-foreground hover:text-foreground z-10 p-0.5 rounded hover:bg-muted transition-colors flex items-center justify-center cursor-pointer"
                  title="Clear difficulty filter"
                >
                  <X size={12} />
                </button>
              )}
              <ChevronDown
                size={14}
                className={`text-muted-foreground transition-transform duration-200 shrink-0 ${diffDropdownOpen ? "rotate-180" : ""}`}
              />
            </div>
          </div>

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
                      difficulty === "1"
                        ? "text-emerald-500 bg-emerald-500/5 font-bold"
                        : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-500"
                    }`}
                  >
                    Novice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateFilters({ difficulty: "2" });
                      setDiffDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-cyan-500/10 transition-colors ${
                      difficulty === "2"
                        ? "text-cyan-500 bg-cyan-500/5 font-bold"
                        : "text-cyan-600 dark:text-cyan-400 hover:text-cyan-500"
                    }`}
                  >
                    Easy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateFilters({ difficulty: "3" });
                      setDiffDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-500/10 transition-colors ${
                      difficulty === "3"
                        ? "text-amber-500 bg-amber-500/5 font-bold"
                        : "text-amber-600 dark:text-amber-400 hover:text-amber-500"
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateFilters({ difficulty: "4" });
                      setDiffDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500/10 transition-colors ${
                      difficulty === "4"
                        ? "text-red-500 bg-red-500/5 font-bold"
                        : "text-red-600 dark:text-red-400 hover:text-red-500"
                    }`}
                  >
                    Hard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateFilters({ difficulty: "5" });
                      setDiffDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-500/10 transition-colors ${
                      difficulty === "5"
                        ? "text-purple-500 bg-purple-500/5 font-bold"
                        : "text-purple-600 dark:text-purple-400 hover:text-purple-500"
                    }`}
                  >
                    Extreme
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Dropdown */}
        <div className="relative col-span-2 lg:flex-none lg:w-40" ref={statusDropdownRef}>
          <div
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            className={`w-full bg-background border border-input rounded-lg py-2 pl-9 pr-3 text-sm text-left flex items-center justify-between cursor-pointer focus:outline-none hover:bg-muted/30 transition-all font-semibold truncate relative ${
              status === "Solved"
                ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10"
                : status === "Attempted"
                  ? "border-amber-500/30 text-amber-500 bg-amber-500/5 hover:bg-amber-500/10"
                  : status === "Todo"
                    ? "border-gray-500/30 text-muted-foreground bg-muted/20 hover:bg-muted/30"
                    : ""
            }`}
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <CheckSquare size={16} />
            </span>
            <span className="truncate pr-4">
              {status === "Solved"
                ? "Solved"
                : status === "Attempted"
                  ? "Attempted"
                  : status === "Todo"
                    ? "Todo"
                    : "All Statuses"}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {status && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateFilters({ status: "" });
                  }}
                  className="text-muted-foreground hover:text-foreground z-10 p-0.5 rounded hover:bg-muted transition-colors flex items-center justify-center cursor-pointer"
                  title="Clear status filter"
                >
                  <X size={12} />
                </button>
              )}
              <ChevronDown
                size={14}
                className={`text-muted-foreground transition-transform duration-200 shrink-0 ${statusDropdownOpen ? "rotate-180" : ""}`}
              />
            </div>
          </div>

          <AnimatePresence>
            {statusDropdownOpen && (
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
                      updateFilters({ status: "" });
                      setStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-muted transition-colors ${
                      !status ? "text-foreground bg-muted font-bold" : "text-muted-foreground"
                    }`}
                  >
                    All Statuses
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateFilters({ status: "Solved" });
                      setStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-500/10 transition-colors ${
                      status === "Solved"
                        ? "text-emerald-500 bg-emerald-500/5 font-bold"
                        : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-500"
                    }`}
                  >
                    Solved
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateFilters({ status: "Attempted" });
                      setStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-500/10 transition-colors ${
                      status === "Attempted"
                        ? "text-amber-500 bg-amber-500/5 font-bold"
                        : "text-amber-600 dark:text-amber-400 hover:text-amber-500"
                    }`}
                  >
                    Attempted
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateFilters({ status: "Todo" });
                      setStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-muted transition-colors ${
                      status === "Todo"
                        ? "text-foreground bg-muted font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    Todo
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
export default FilterBar;
