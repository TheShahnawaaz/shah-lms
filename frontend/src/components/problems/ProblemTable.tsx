import React from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Bookmark } from "lucide-react";
import DifficultyBadge from "./DifficultyBadge";

interface ProblemSummary {
  id: number;
  title: string;
  difficulty: number;
  timeLimitSec: number;
  memoryLimitMb: number;
  tags: { name: string }[];
  isBookmarked: boolean;
}

interface ProblemTableProps {
  problems: ProblemSummary[];
  updateFilters: (newFilters: { [key: string]: string | number }) => void;
  onBookmarkToggle: (problemId: number, currentStatus: boolean, e: React.MouseEvent) => void;
}

export const ProblemTable: React.FC<ProblemTableProps> = ({
  problems,
  updateFilters,
  onBookmarkToggle
}) => {
  return (
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
          <AnimatePresence initial={false}>
            {problems.map((problem) => (
              <motion.tr
                key={problem.id}
                layout
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="hover:bg-muted/30 transition-colors group"
              >
                <td className="px-6 py-4 text-muted-foreground font-mono">{problem.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => onBookmarkToggle(problem.id, problem.isBookmarked, e)}
                      className={`p-1 rounded-md transition-colors ${
                        problem.isBookmarked
                          ? "text-yellow-500 hover:text-yellow-600 bg-yellow-500/10"
                          : "text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-muted/50"
                      }`}
                      title={problem.isBookmarked ? "Remove bookmark" : "Bookmark problem"}
                    >
                      <Bookmark size={14} fill={problem.isBookmarked ? "currentColor" : "none"} />
                    </button>
                    <Link to={`/problems/${problem.id}`} className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {problem.title}
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <DifficultyBadge difficulty={problem.difficulty} />
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
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
};
export default ProblemTable;
