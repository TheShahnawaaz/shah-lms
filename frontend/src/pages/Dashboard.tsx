import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../lib/api";
import { Award, BookOpen, Hash, Flame, ArrowRight } from "lucide-react";

interface TagSummary {
  id: string;
  name: string;
  problemCount: number;
}

export const Dashboard: React.FC = () => {
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [totalProblems, setTotalProblems] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [diffStats, setDiffStats] = useState<{ [key: number]: number }>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  });
  const [solvedStats, setSolvedStats] = useState<{ [key: number]: number }>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  });
  const [streak, setStreak] = useState<number>(0);
  const navigate = useNavigate();

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tagsResponse, problemsResponse, statsResponse] = await Promise.all([
          api.get<TagSummary[]>("/problems/tags"),
          api.get<{ pagination: { totalCount: number } }>("/problems?limit=1"),
          api.get<{ difficultyDistribution: { [key: number]: number }; solvedDistribution: { [key: number]: number }; streak: number }>("/problems/stats")
        ]);

        setTags(tagsResponse.data);
        setTotalProblems(problemsResponse.data.pagination.totalCount);
        setDiffStats(statsResponse.data.difficultyDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
        setSolvedStats(statsResponse.data.solvedDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
        setStreak(statsResponse.data.streak || 0);
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

  const totalSolved = Object.values(solvedStats).reduce((a, b) => a + b, 0);

  const statCards = [
    { label: "Total Problems", value: loading ? "..." : totalProblems, icon: BookOpen },
    { label: "Solved Problems", value: loading ? "..." : `${totalSolved} / ${totalProblems}`, icon: Award },
    { label: "Topic Tags", value: loading ? "..." : tags.length, icon: Hash },
    { label: "Daily Streak", value: loading ? "..." : `${streak} day${streak !== 1 ? "s" : ""}`, icon: Flame }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your progress and learning materials.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -2 }}
            className="p-5 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between"
          >
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
              <span className="block text-2xl font-semibold text-foreground mt-1">
                {stat.value}
              </span>
            </div>
            <div className="p-2 bg-muted rounded-md text-muted-foreground">
              <stat.icon size={20} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm flex flex-col">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-foreground">Browse by Topic</h2>
              <p className="text-xs text-muted-foreground">
                Select a topic to view related problems.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background border border-input focus:border-ring focus:ring-1 focus:ring-ring rounded-md px-3 py-1.5 text-sm outline-none transition-all w-full sm:w-64"
            />
          </div>
          <div className="p-5 flex-1 min-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-muted-foreground text-sm">Loading tags...</span>
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No matching topics found
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto pr-2">
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagClick(tag.name)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 hover:bg-muted text-foreground rounded-md border border-border hover:border-border transition-colors text-sm"
                  >
                    <span>{tag.name}</span>
                    <span className="px-1.5 py-0.5 bg-background text-muted-foreground rounded text-[10px] font-medium">
                      {tag.problemCount}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Difficulty Distribution</h2>
            <p className="text-xs text-muted-foreground">Breakdown of problem difficulties.</p>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              {(() => {
                const getPercent = (solved: number, total: number) =>
                  total > 0 ? Math.round((solved / total) * 100) : 0;

                return [
                  {
                    label: "Novice",
                    solved: solvedStats[1] || 0,
                    total: diffStats[1] || 0,
                    color: "bg-emerald-500",
                    diffId: 1
                  },
                  {
                    label: "Easy",
                    solved: solvedStats[2] || 0,
                    total: diffStats[2] || 0,
                    color: "bg-cyan-500",
                    diffId: 2
                  },
                  {
                    label: "Medium",
                    solved: solvedStats[3] || 0,
                    total: diffStats[3] || 0,
                    color: "bg-amber-500",
                    diffId: 3
                  },
                  {
                    label: "Hard",
                    solved: solvedStats[4] || 0,
                    total: diffStats[4] || 0,
                    color: "bg-red-500",
                    diffId: 4
                  },
                  {
                    label: "Extreme",
                    solved: solvedStats[5] || 0,
                    total: diffStats[5] || 0,
                    color: "bg-purple-500",
                    diffId: 5
                  }
                ].map((diff) => {
                  const percent = getPercent(diff.solved, diff.total);
                  return (
                    <div
                      key={diff.label}
                      onClick={() => navigate(`/problems?difficulty=${diff.diffId}`)}
                      className="group cursor-pointer"
                    >
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-foreground font-medium group-hover:underline">
                          {diff.label}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {diff.solved} / {diff.total} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${diff.color}`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <button
              onClick={() => navigate("/problems")}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md border border-border bg-muted/50 text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              Explore Problems
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
