import React from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Bookmark, CheckCircle, Circle } from "lucide-react";
import DifficultyBadge from "./DifficultyBadge";

interface ProblemSummary {
  id: number;
  title: string;
  difficulty: number;
  timeLimitSec: number;
  memoryLimitMb: number;
  tags: { name: string }[];
  isBookmarked: boolean;
  status?: "Solved" | "Attempted" | "Todo";
}

interface ProblemCardListProps {
  problems: ProblemSummary[];
  updateFilters: (newFilters: { [key: string]: string | number }) => void;
  onBookmarkToggle: (problemId: number, currentStatus: boolean, e: React.MouseEvent) => void;
}

export const ProblemCardList: React.FC<ProblemCardListProps> = ({
  problems,
  updateFilters,
  onBookmarkToggle
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:hidden">
      <AnimatePresence initial={false}>
        {problems.map((problem) => (
          <motion.div
            key={problem.id}
            layout
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  {problem.status === "Solved" ? (
                    <span className="inline-flex items-center justify-center text-green-500" title="Solved">
                      <CheckCircle className="size-3.5 stroke-[2.5]" />
                    </span>
                  ) : problem.status === "Attempted" ? (
                    <span className="inline-flex items-center justify-center text-amber-500" title="Attempted">
                      <Circle className="size-3 fill-current" />
                    </span>
                  ) : null}
                  <span className="text-xs font-mono text-muted-foreground font-semibold px-1.5 py-0.5 rounded bg-muted/60">
                    #{problem.id}
                  </span>
                  <DifficultyBadge
                    difficulty={problem.difficulty}
                    className="text-[10px] font-semibold"
                  />
                </div>
                <Link
                  to={`/problems/${problem.id}`}
                  className="font-bold text-sm text-foreground hover:text-primary transition-colors block truncate"
                >
                  {problem.title}
                </Link>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => onBookmarkToggle(problem.id, problem.isBookmarked, e)}
                  className={`flex items-center justify-center size-8 rounded-lg border transition-colors ${
                    problem.isBookmarked
                      ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
                      : "text-muted-foreground hover:text-foreground border-border hover:bg-muted/50"
                  }`}
                  title={problem.isBookmarked ? "Remove bookmark" : "Bookmark problem"}
                >
                  <Bookmark size={14} fill={problem.isBookmarked ? "currentColor" : "none"} />
                </button>
                <Link
                  to={`/problems/${problem.id}`}
                  className="flex items-center justify-center size-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-sm"
                  title="Solve Problem"
                >
                  <Eye size={15} />
                </Link>
              </div>
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
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
export default ProblemCardList;
