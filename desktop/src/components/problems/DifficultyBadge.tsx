import React from "react";

interface DifficultyBadgeProps {
  difficulty: number;
  className?: string;
  variant?: "list" | "detail";
}

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({
  difficulty,
  className = "",
  variant = "list"
}) => {
  if (variant === "detail") {
    return (
      <span
        className={`font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
          difficulty === 1
            ? "bg-emerald-500/10 text-emerald-500"
            : difficulty === 2
              ? "bg-cyan-500/10 text-cyan-500"
              : difficulty === 3
                ? "bg-amber-500/10 text-amber-500"
                : difficulty === 4
                  ? "bg-red-500/10 text-red-500"
                  : "bg-purple-500/10 text-purple-500"
        } ${className}`}
      >
        {difficulty === 1
          ? "Novice"
          : difficulty === 2
            ? "Easy"
            : difficulty === 3
              ? "Medium"
              : difficulty === 4
                ? "Hard"
                : "Extreme"}
      </span>
    );
  }

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1:
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case 2:
        return "text-cyan-500 bg-cyan-500/10 border-cyan-500/20";
      case 3:
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case 4:
        return "text-red-500 bg-red-500/10 border-red-500/20";
      default:
        return "text-purple-500 bg-purple-500/10 border-purple-500/20";
    }
  };

  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1:
        return "Novice";
      case 2:
        return "Easy";
      case 3:
        return "Medium";
      case 4:
        return "Hard";
      default:
        return "Extreme";
    }
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-md border ${getDifficultyColor(difficulty)} ${className}`}
    >
      {getDifficultyLabel(difficulty)}
    </span>
  );
};
export default DifficultyBadge;
