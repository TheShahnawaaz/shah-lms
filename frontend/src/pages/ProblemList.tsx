import React, { useEffect, useState, useRef } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import api from "../lib/api";
import { Bookmark } from "lucide-react";
import FilterBar from "../components/problems/FilterBar";
import ProblemTable from "../components/problems/ProblemTable";
import ProblemCardList from "../components/problems/ProblemCardList";

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

interface TagSummary {
  id: string;
  name: string;
}

export const ProblemList: React.FC = () => {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const location = useLocation();
  const isBookmarksPage = location.pathname === "/bookmarks";

  const search = searchParams.get("search") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const selectedTag = searchParams.get("tag") || "";
  const status = searchParams.get("status") || "";

  const [searchInput, setSearchInput] = useState(search);
  const observerRef = useRef<HTMLDivElement>(null);

  // Sync search input if URL search param changes
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Track last filters in state to detect changes during render and reset list/page
  const [lastFilters, setLastFilters] = useState({
    search,
    difficulty,
    selectedTag,
    status,
    isBookmarksPage
  });

  if (
    lastFilters.search !== search ||
    lastFilters.difficulty !== difficulty ||
    lastFilters.selectedTag !== selectedTag ||
    lastFilters.status !== status ||
    lastFilters.isBookmarksPage !== isBookmarksPage
  ) {
    setLastFilters({ search, difficulty, selectedTag, status, isBookmarksPage });
    setCurrentPage(1);
    setHasMore(true);
    setProblems([]);
  }

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
    let active = true;
    const fetchProblems = async () => {
      setLoading(true);
      try {
        let endpoint = `/problems?page=${currentPage}&limit=20`;
        if (search) endpoint += `&search=${encodeURIComponent(search)}`;
        if (difficulty) endpoint += `&difficulty=${difficulty}`;
        if (selectedTag) endpoint += `&tag=${encodeURIComponent(selectedTag)}`;
        if (status) endpoint += `&status=${encodeURIComponent(status)}`;
        if (isBookmarksPage) endpoint += `&bookmarked=true`;

        const res = await api.get<{ problems: ProblemSummary[]; pagination: any }>(endpoint);
        if (!active) return;

        if (currentPage === 1) {
          setProblems(res.data.problems);
        } else {
          setProblems((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newProblems = res.data.problems.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newProblems];
          });
        }

        const { totalPages, page } = res.data.pagination;
        setHasMore(page < totalPages);
      } catch (err) {
        console.error("Failed to fetch problems:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProblems();

    return () => {
      active = false;
    };
  }, [currentPage, search, difficulty, selectedTag, status, isBookmarksPage]);

  // Monitor intersection to load more problems
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { rootMargin: "200px" }
    );

    const currentTarget = observerRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading]);

  const handleBookmarkToggle = async (
    problemId: number,
    currentStatus: boolean,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (currentStatus) {
        await api.delete(`/problems/${problemId}/bookmark`);
        if (isBookmarksPage) {
          setProblems((prev) => prev.filter((p) => p.id !== problemId));
        } else {
          setProblems((prev) =>
            prev.map((p) => (p.id === problemId ? { ...p, isBookmarked: false } : p))
          );
        }
      } else {
        await api.post(`/problems/${problemId}/bookmark`);
        setProblems((prev) =>
          prev.map((p) => (p.id === problemId ? { ...p, isBookmarked: true } : p))
        );
      }
    } catch (err: any) {
      console.error("Failed to toggle bookmark:", err);
    }
  };

  const updateFilters = (newFilters: { [key: string]: string | number }) => {
    const updatedParams = new URLSearchParams(searchParams);

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === "") {
        updatedParams.delete(key);
      } else {
        updatedParams.set(key, value.toString());
      }
    });

    // Remove page parameter completely as we use infinite scroll
    updatedParams.delete("page");

    setSearchParams(updatedParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {isBookmarksPage ? "Bookmarked Problems" : "Problems"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isBookmarksPage
            ? "Your saved tasks. Review, manage, and practice them here."
            : "Solve tasks, explore editorials, and improve your skills."}
        </p>
      </div>

      {/* Filters */}
      <FilterBar
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        selectedTag={selectedTag}
        difficulty={difficulty}
        status={status}
        tags={tags}
        updateFilters={updateFilters}
      />

      {/* Problems List Viewports */}
      <div className="rounded-xl border-0 md:border border-border bg-transparent md:bg-card md:shadow-sm overflow-hidden">
        {loading && problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-card rounded-xl border border-border md:border-0">
            <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="text-sm">Loading problems...</span>
          </div>
        ) : problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-card rounded-xl border border-border md:border-0">
            {isBookmarksPage ? (
              <>
                <div className="p-3 bg-muted rounded-full text-muted-foreground mb-4">
                  <Bookmark size={24} className="stroke-[1.5]" />
                </div>
                <span className="text-sm mb-2 font-semibold text-foreground">
                  No bookmarks found
                </span>
                <span className="text-xs mb-6 max-w-sm text-center">
                  You haven't bookmarked any problems yet. Click the bookmark icon in any problem to
                  save it.
                </span>
                <Link
                  to="/problems"
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  Browse Problems
                </Link>
              </>
            ) : (
              <>
                <span className="text-sm mb-4">No problems match your filters.</span>
                <button
                  onClick={() => setSearchParams({})}
                  className="px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-md text-sm font-medium transition-colors"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <ProblemCardList
              problems={problems}
              updateFilters={updateFilters}
              onBookmarkToggle={handleBookmarkToggle}
            />
            <ProblemTable
              problems={problems}
              updateFilters={updateFilters}
              onBookmarkToggle={handleBookmarkToggle}
            />
          </>
        )}
      </div>

      {/* Infinite Scroll Loader & End Marker */}
      {problems.length > 0 && (
        <div ref={observerRef} className="py-8 flex justify-center">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in duration-200">
              <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
              <span>Loading more...</span>
            </div>
          ) : !hasMore ? (
            <div className="text-xs text-muted-foreground/80 font-semibold py-2.5 px-5 rounded-full border border-border/50 bg-muted/20 animate-in fade-in duration-500 shadow-sm">
              ✨ All problems loaded (Total: {problems.length})
            </div>
          ) : (
            <div className="h-4" />
          )}
        </div>
      )}
    </div>
  );
};
export default ProblemList;
