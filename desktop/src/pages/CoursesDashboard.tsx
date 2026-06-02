import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, Clock, Award, Compass } from "lucide-react";
import { motion } from "framer-motion";
import api from "../lib/api";

interface Course {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  instructorImage: string | null;
  instructorName: string | null;
  difficulty: string | null;
  isFree: boolean;
  timeInMinutes: number;
  totalResources: number;
  completedCount: number;
  completionPercentage: number;
}

export const CoursesDashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | "Beginner" | "Intermediate" | "Advanced">("All");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<Course[]>("/courses");
        setCourses(res.data);
      } catch (err: any) {
        setError(err.message || "Failed to retrieve courses.");
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course.instructorName && course.instructorName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = activeFilter === "All" ||
      (course.difficulty && course.difficulty.toLowerCase() === activeFilter.toLowerCase());

    return matchesSearch && matchesFilter;
  });

  const formatDuration = (mins: number) => {
    if (!mins) return "Self-paced";
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs === 0) return `${remainingMins}m`;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-muted-foreground text-sm font-medium animate-pulse">
          Loading learning modules...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-card border border-border rounded-xl">
        <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Courses</h3>
        <p className="text-muted-foreground text-sm max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6 text-left">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Compass size={12} />
            ShahLMS Catalog
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">
            Advance Your DSA & System Design Skills
          </h1>
          <p className="text-foreground/80 text-sm md:text-base max-w-2xl leading-relaxed">
            Choose from professional structural learning modules. Learn, practice coding tasks, solve quizzes, and track your syllabus progress in real-time.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-background/50 backdrop-blur-md border border-border p-4 rounded-xl shrink-0 self-start md:self-auto">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {courses.length}
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Available Courses</div>
            <div className="text-sm font-bold text-foreground">Syllabus Active</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search courses, instructors, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card hover:bg-card/75 focus:bg-background border border-border focus:border-primary rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 border border-border p-1 rounded-xl w-fit">
          {(["All", "Beginner", "Intermediate", "Advanced"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === filter
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl bg-card/20">
          <BookOpen className="text-muted-foreground mb-4" size={32} />
          <h3 className="text-base font-semibold text-foreground mb-1">No Courses Match Your Criteria</h3>
          <p className="text-muted-foreground text-xs max-w-xs">
            Try adjusting your search terms or selecting a different difficulty filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const hasStarted = course.completedCount > 0;
            const isCompleted = course.completionPercentage === 100;
            
            return (
              <motion.div
                key={course.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="group cursor-pointer relative flex flex-col overflow-hidden bg-card hover:bg-card/75 border border-border/80 hover:border-primary/30 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md glass-card"
              >
                {/* Background Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Top Image Banner (16:9 Aspect Ratio) */}
                <div className="aspect-video w-full overflow-hidden bg-muted border-b border-border/50 relative">
                  {course.image ? (
                    <img src={course.image} alt={course.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10 text-muted-foreground">
                      <BookOpen size={36} className="opacity-50" />
                    </div>
                  )}

                  {/* Difficulty & Price Badges (Floating on top of image) */}
                  <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                    {course.difficulty && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize shadow-sm backdrop-blur-md ${
                        course.difficulty.toLowerCase() === "beginner"
                          ? "bg-emerald-500/80 text-white border-emerald-500/25"
                          : course.difficulty.toLowerCase() === "intermediate"
                          ? "bg-amber-500/80 text-white border-amber-500/25"
                          : "bg-rose-500/80 text-white border-rose-500/25"
                      }`}>
                        {course.difficulty}
                      </span>
                    )}
                    {course.isFree && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/80 text-white dark:text-black border border-primary/20 shadow-sm backdrop-blur-md">
                        Free
                      </span>
                    )}
                  </div>
                </div>

                {/* Course Card Body */}
                <div className="p-5 flex flex-col gap-4 flex-grow">
                  {/* Info */}
                  <div className="space-y-1.5 flex-1 flex flex-col">
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {course.name}
                    </h3>
                    <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed flex-1">
                      {course.description || "Learn and master data structures, algorithms, and logical problem solving."}
                    </p>
                  </div>

                  {/* Specs row */}
                  <div className="flex items-center gap-4 text-foreground/75 text-xs font-semibold py-1 border-t border-border/40">
                    {course.timeInMinutes > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{formatDuration(course.timeInMinutes)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Award size={14} />
                      <span>{course.totalResources} resources</span>
                    </div>
                  </div>
                </div>

                {/* Progress / Footer Row */}
                <div className="bg-muted/40 p-4 border-t border-border/50 rounded-b-2xl flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className={isCompleted ? "text-emerald-500" : hasStarted ? "text-primary" : "text-muted-foreground"}>
                      {isCompleted ? "Completed ✅" : hasStarted ? "In Progress" : "Not Started"}
                    </span>
                    <span>{course.completionPercentage}%</span>
                  </div>

                  {/* Progress bar container */}
                  <div className="h-2 w-full bg-border/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? "bg-emerald-500" : "bg-primary"
                      }`}
                      style={{ width: `${course.completionPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-semibold">
                    <span>{course.completedCount} of {course.totalResources} modules</span>
                    {course.instructorName && (
                      <div className="flex items-center gap-1.5">
                        {course.instructorImage && (
                          <img src={course.instructorImage} alt={course.instructorName} className="h-3.5 w-3.5 rounded-full border border-border" />
                        )}
                        <span>{course.instructorName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default CoursesDashboard;
