import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { Search, Tag as TagIcon, ArrowLeft, ArrowRight, Eye, Filter } from "lucide-react";

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
          <div className="relative flex-1 md:flex-none md:w-48">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <TagIcon size={16} />
            </span>
            <select
              className="w-full bg-background border border-input rounded-md py-2 pl-9 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              value={selectedTag}
              onChange={(e) => updateFilters({ tag: e.target.value })}
            >
              <option value="">All Topics</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.name}>{tag.name}</option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 md:flex-none md:w-40">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <Filter size={16} />
            </span>
            <select
              className="w-full bg-background border border-input rounded-md py-2 pl-9 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              value={difficulty}
              onChange={(e) => updateFilters({ difficulty: e.target.value })}
            >
              <option value="">All Difficulties</option>
              <option value="1">Easy</option>
              <option value="2">Medium</option>
              <option value="3">Hard</option>
              <option value="4">Harder</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="text-sm">Loading problems...</span>
          </div>
        ) : problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <span className="text-sm mb-4">No problems match your filters.</span>
            <button
              onClick={() => setSearchParams({})}
              className="px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-md text-sm font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
