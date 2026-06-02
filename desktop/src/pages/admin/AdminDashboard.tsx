import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import {
  LayoutDashboard,
  BookOpen,
  Code2,
  Users,
  Settings,
  ArrowRight
} from "lucide-react";

interface Stats {
  totalProblems: number;
  totalCourses: number;
  totalUsers: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await api.get<Stats>("/admin/stats");
      setStats(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load system statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <LayoutDashboard className="size-6 text-primary" />
          <span>Admin Dashboard</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          System-wide database statistics and administrative controls.
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-border bg-card p-6 flex flex-col justify-between animate-pulse"
            >
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-8 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 border border-destructive/20 bg-destructive/5 rounded-xl text-center text-sm font-semibold text-destructive">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Courses Stats */}
          <Link
            to="/courses"
            className="group block border border-border hover:border-primary/50 bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all text-primary">
              <BookOpen size={96} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Courses
              </span>
              <BookOpen className="size-5 text-primary" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground tracking-tight">
                {stats?.totalCourses}
              </span>
              <span className="text-xs text-muted-foreground font-medium">Syllabi Ingested</span>
            </div>
          </Link>

          {/* Problems Stats */}
          <Link
            to="/problems"
            className="group block border border-border hover:border-primary/50 bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all text-primary">
              <Code2 size={96} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                DSA Problems
              </span>
              <Code2 className="size-5 text-primary" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground tracking-tight">
                {stats?.totalProblems}
              </span>
              <span className="text-xs text-muted-foreground font-medium">Problems Seeded</span>
            </div>
          </Link>

          {/* Safelisted Users Stats */}
          <Link
            to="/admin/users"
            className="group block border border-border hover:border-primary/50 bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all text-primary">
              <Users size={96} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Safelisted Accounts
              </span>
              <Users className="size-5 text-primary" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground tracking-tight">
                {stats?.totalUsers}
              </span>
              <span className="text-xs text-muted-foreground font-medium">Authorized Emails</span>
            </div>
          </Link>
        </div>
      )}

      {/* Quick Actions / Management Section */}
      <div className="space-y-4 text-left">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          Administrative Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Access Control Tool */}
          <div className="border border-border bg-card rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
            <div className="space-y-3">
              <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Users size={20} />
              </div>
              <h3 className="font-bold text-foreground">Access Control</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add or revoke Google accounts that are authorized to access the system, or promote
                users to administrators.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/50">
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:text-primary/80 transition-colors animate-none"
              >
                <span>Manage Users</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Course Management Tool */}
          <div className="border border-border bg-card rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
            <div className="space-y-3">
              <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <BookOpen size={20} />
              </div>
              <h3 className="font-bold text-foreground">Course Management</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                List and manage course visibility, delete course content hierarchically, or upload and sync LMS course JSON payloads.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/50">
              <Link
                to="/admin/courses"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:text-primary/80 transition-colors animate-none"
              >
                <span>Manage Courses</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Problem Seeder Tool */}
          <div className="border border-border bg-card rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
            <div className="space-y-3">
              <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Settings size={20} />
              </div>
              <h3 className="font-bold text-foreground">Problem Seeder</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bulk upload programming problems from local JSON files to populate the practice problem
                library and update statements or testcases.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/50">
              <Link
                to="/admin/seed"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:text-primary/80 transition-colors animate-none"
              >
                <span>Seed Problems</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
