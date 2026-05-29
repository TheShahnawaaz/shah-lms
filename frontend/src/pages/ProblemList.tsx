import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import Layout from "../components/Layout";
import { Search, Tag as TagIcon, ArrowLeft, ArrowRight, Eye } from "lucide-react";

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

  // Read search filters from URL query parameters
  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const selectedTag = searchParams.get("tag") || "";

  // Temporary local state for search inputs
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

    // Reset page to 1 on filter update
    if (!newFilters.page) {
      updatedParams.delete("page");
    }

    setSearchParams(updatedParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  const getDifficultyBadge = (level: number) => {
    switch (level) {
      case 1:
        return <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emeraldAccent border border-emeraldAccent/15">Easy</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/15">Medium</span>;
      case 3:
        return <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/15">Hard</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/15">Harder</span>;
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-mono">
            PROBLEM <span className="text-emeraldAccent">ARENA</span>
          </h1>
          <p className="text-textMuted">Solve compiled DSA tasks, explore editorials, and improve your skills.</p>
        </div>

        {/* Filter Controls Panel */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Box */}
            <form onSubmit={handleSearchSubmit} className="md:col-span-2 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-textMuted pointer-events-none">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search problems by name..."
                className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm text-white"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </form>

            {/* Tag Filter */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-textMuted pointer-events-none">
                <TagIcon size={16} />
              </span>
              <select
                className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm text-white appearance-none cursor-pointer bg-card font-semibold"
                value={selectedTag}
                onChange={(e) => updateFilters({ tag: e.target.value })}
              >
                <option value="">All Topics</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <select
                className="w-full glass-input rounded-xl py-2.5 px-4 text-sm text-white appearance-none cursor-pointer bg-card font-semibold"
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

        {/* Problems Table/List */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-8 h-8 border-2 border-indigoAccent border-t-transparent rounded-full animate-spin"></div>
              <span className="text-textMuted text-sm font-mono animate-pulse">Retrieving Arena Problems...</span>
            </div>
          ) : problems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="text-textMuted font-mono text-sm">No problems match your filter selection.</span>
              <button
                onClick={() => setSearchParams({})}
                className="mt-4 px-4 py-2 bg-indigoAccent/10 border border-indigoAccent/20 hover:border-indigoAccent/40 rounded-xl text-indigoAccent text-xs font-bold transition-all"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-cardLight/50 border-b border-white/5">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-textMuted font-mono w-20">ID</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-textMuted">Title</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-textMuted w-28 text-center">Difficulty</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-textMuted">Topics</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-textMuted w-32">Limits</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-textMuted w-24 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {problems.map((problem) => (
                    <tr key={problem.id} className="hover:bg-cardLight/20 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono font-semibold text-indigoAccent">{problem.id}</td>
                      <td className="px-6 py-4">
                        <Link to={`/problems/${problem.id}`} className="text-white hover:text-indigoAccent font-bold transition-colors">
                          {problem.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-center">{getDifficultyBadge(problem.difficulty)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                          {problem.tags.slice(0, 3).map((t, idx) => (
                            <span
                              key={idx}
                              onClick={() => updateFilters({ tag: t.name })}
                              className="px-2 py-0.5 bg-cardLight text-[10px] text-textMuted rounded hover:text-white hover:bg-indigoAccent/20 hover:border-indigoAccent/15 border border-white/5 cursor-pointer font-semibold transition-all"
                            >
                              {t.name}
                            </span>
                          ))}
                          {problem.tags.length > 3 && (
                            <span className="text-[10px] text-textMuted align-middle self-center font-mono">+{problem.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-textMuted font-mono space-y-0.5">
                        <div className="font-semibold">{problem.timeLimitSec}s limit</div>
                        <div>{problem.memoryLimitMb}MB limit</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          to={`/problems/${problem.id}`}
                          className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-indigoAccent/10 border border-indigoAccent/20 hover:border-indigoAccent/40 hover:bg-indigoAccent/20 rounded-xl text-indigoAccent text-xs font-bold transition-all shadow-neonViolet/5"
                        >
                          <Eye size={14} />
                          <span>Solve</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Panel */}
        {!loading && problems.length > 0 && (
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-xs text-textMuted font-mono">
              Showing page <strong className="text-white">{pagination.page}</strong> of <strong className="text-white">{pagination.totalPages}</strong> ({pagination.totalCount} problems)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => updateFilters({ page: pagination.page - 1 })}
                className="inline-flex items-center gap-1 py-2 px-3 rounded-xl border border-white/5 bg-cardLight/50 hover:bg-cardLight text-textMain text-xs font-bold disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Prev</span>
              </button>

              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => updateFilters({ page: pagination.page + 1 })}
                className="inline-flex items-center gap-1 py-2 px-3 rounded-xl border border-white/5 bg-cardLight/50 hover:bg-cardLight text-textMain text-xs font-bold disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <span>Next</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
export default ProblemList;
