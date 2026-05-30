import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import Layout from "../components/Layout";
import { Award, BookOpen, Hash, Flame, ArrowRight } from "lucide-react";

// Trigger Vercel auto-deploy build with new monorepo configuration

interface TagSummary {
  id: string;
  name: string;
  problemCount: number;
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const Dashboard: React.FC = () => {
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [totalProblems, setTotalProblems] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem("az_auth_token");
  let isAdmin = false;
  if (token) {
    const decoded = parseJwt(token);
    isAdmin = !!decoded?.isAdmin;
  }

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tags and counts
        const tagsResponse = await api.get<TagSummary[]>("/problems/tags");
        setTags(tagsResponse.data);

        // Fetch problems count from problems endpoint
        const problemsResponse = await api.get<{ pagination: { totalCount: number } }>("/problems?limit=1");
        setTotalProblems(problemsResponse.data.pagination.totalCount);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleTagClick = (tagName: string) => {
    navigate(`/problems?tag=${encodeURIComponent(tagName)}`);
  };

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-mono">
              CODER <span className="text-emeraldAccent">DASHBOARD</span>
            </h1>
            <p className="text-textMuted">Welcome back. Track your learning progress and tags coverage.</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => navigate("/admin/seed")}
              className="py-2.5 px-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold rounded-xl transition-all duration-300 shadow-md shadow-violet-500/20 hover:shadow-violet-500/40 flex items-center gap-2 self-start md:self-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Admin Panel
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-indigoAccent/10 rounded-xl text-indigoAccent border border-indigoAccent/15">
              <BookOpen size={24} />
            </div>
            <div>
              <span className="block text-xs font-semibold text-textMuted uppercase tracking-wider">Total problems</span>
              <span className="block text-2xl font-bold text-white font-mono mt-0.5">
                {loading ? "..." : totalProblems}
              </span>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigoAccent/5 rounded-full blur-xl translate-x-8 -translate-y-8"></div>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-emeraldAccent/10 rounded-xl text-emeraldAccent border border-emeraldAccent/15">
              <Award size={24} />
            </div>
            <div>
              <span className="block text-xs font-semibold text-textMuted uppercase tracking-wider">Solved Problems</span>
              <span className="block text-2xl font-bold text-white font-mono mt-0.5">
                0 <span className="text-xs text-textMuted">/ {totalProblems}</span>
              </span>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-emeraldAccent/5 rounded-full blur-xl translate-x-8 -translate-y-8"></div>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-violetAccent/10 rounded-xl text-violetAccent border border-violetAccent/15">
              <Hash size={24} />
            </div>
            <div>
              <span className="block text-xs font-semibold text-textMuted uppercase tracking-wider">Topic Tags</span>
              <span className="block text-2xl font-bold text-white font-mono mt-0.5">
                {loading ? "..." : tags.length}
              </span>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-violetAccent/5 rounded-full blur-xl translate-x-8 -translate-y-8"></div>
          </div>

          {/* Card 4 */}
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500 border border-yellow-500/15">
              <Flame size={24} />
            </div>
            <div>
              <span className="block text-xs font-semibold text-textMuted uppercase tracking-wider">Daily Streak</span>
              <span className="block text-2xl font-bold text-white font-mono mt-0.5">
                1 <span className="text-xs text-textMuted">day</span>
              </span>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl translate-x-8 -translate-y-8"></div>
          </div>
        </div>

        {/* Tag Cloud & Progress Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Topic tags distribution */}
          <div className="glass-panel p-6 rounded-2xl md:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                  <Hash size={18} className="text-indigoAccent" />
                  <span>Browse by Topic</span>
                </h2>
                <p className="text-xs text-textMuted">Click a tag name to view related problems.</p>
              </div>
              <input
                type="text"
                placeholder="Search topic tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950/60 border border-slate-800/80 focus:border-indigoAccent/50 rounded-xl px-4 py-2 text-xs text-white focus:outline-none placeholder-slate-500 font-mono transition-all duration-300 w-full sm:w-56"
              />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-textMuted text-sm font-mono animate-pulse">Loading tags...</span>
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 font-mono text-xs">
                <span>No matching topics found</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagClick(tag.name)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-cardLight/50 hover:bg-indigoAccent/25 text-textMain/90 hover:text-white rounded-xl border border-white/5 hover:border-indigoAccent/30 transition-all duration-200 text-xs font-semibold"
                  >
                    <span>{tag.name}</span>
                    <span className="px-1.5 py-0.5 bg-background text-[10px] text-indigoAccent rounded font-mono font-bold">
                      {tag.problemCount}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Difficulty breakdown */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <Award size={18} className="text-emeraldAccent" />
                <span>Difficulty Distribution</span>
              </h2>
              
              {/* Custom CSS Progress Bars */}
              <div className="space-y-4 pt-2">
                <div 
                  onClick={() => navigate("/problems?difficulty=1")}
                  className="space-y-1.5 cursor-pointer group hover:bg-white/5 p-1 px-1.5 -mx-1.5 rounded-xl transition-all duration-200"
                >
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-emeraldAccent group-hover:underline">Easy</span>
                    <span className="text-textMuted">35%</span>
                  </div>
                  <div className="w-full bg-cardLight h-2 rounded-full overflow-hidden">
                    <div className="bg-emeraldAccent h-full rounded-full transition-all duration-500" style={{ width: "35%" }}></div>
                  </div>
                </div>

                <div 
                  onClick={() => navigate("/problems?difficulty=2")}
                  className="space-y-1.5 cursor-pointer group hover:bg-white/5 p-1 px-1.5 -mx-1.5 rounded-xl transition-all duration-200"
                >
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-yellow-500 group-hover:underline">Medium</span>
                    <span className="text-textMuted">45%</span>
                  </div>
                  <div className="w-full bg-cardLight h-2 rounded-full overflow-hidden">
                    <div className="bg-yellow-500 h-full rounded-full transition-all duration-500" style={{ width: "45%" }}></div>
                  </div>
                </div>

                <div 
                  onClick={() => navigate("/problems?difficulty=3")}
                  className="space-y-1.5 cursor-pointer group hover:bg-white/5 p-1 px-1.5 -mx-1.5 rounded-xl transition-all duration-200"
                >
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-red-500 group-hover:underline">Hard</span>
                    <span className="text-textMuted">15%</span>
                  </div>
                  <div className="w-full bg-cardLight h-2 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{ width: "15%" }}></div>
                  </div>
                </div>

                <div 
                  onClick={() => navigate("/problems?difficulty=4")}
                  className="space-y-1.5 cursor-pointer group hover:bg-white/5 p-1 px-1.5 -mx-1.5 rounded-xl transition-all duration-200"
                >
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-fuchsia-500 group-hover:underline">Harder</span>
                    <span className="text-textMuted">5%</span>
                  </div>
                  <div className="w-full bg-cardLight h-2 rounded-full overflow-hidden">
                    <div className="bg-fuchsia-500 h-full rounded-full transition-all duration-500" style={{ width: "5%" }}></div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/problems")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/5 bg-cardLight/50 text-white font-semibold text-sm hover:bg-cardLight hover:border-emeraldAccent/30 transition-all duration-300"
            >
              <span>Explore Problems</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default Dashboard;
