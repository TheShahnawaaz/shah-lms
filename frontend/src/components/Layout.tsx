import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, ListTodo, LogOut, Terminal } from "lucide-react";
import api from "../lib/api";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const userName = localStorage.getItem("az_user_name") || "Coder";

  const handleLogout = () => {
    api.clearToken();
    localStorage.removeItem("az_user_name");
    navigate("/login");
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-white/5 flex flex-col justify-between shrink-0 h-full relative z-10">
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
            <div className="p-2 bg-indigoAccent/10 rounded-lg border border-indigoAccent/20 text-indigoAccent">
              <Terminal size={20} />
            </div>
            <div>
              <span className="font-bold text-white tracking-wide font-mono block animate-pulse">
                SHAH <span className="text-emeraldAccent">LMS</span>
              </span>
              <span className="text-[10px] text-textMuted font-mono">v1.0.0</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-6 space-y-1">
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive("/dashboard")
                  ? "bg-indigoAccent/10 text-white border border-indigoAccent/20"
                  : "text-textMuted hover:text-white hover:bg-cardLight/50"
              }`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/problems"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive("/problems")
                  ? "bg-indigoAccent/10 text-white border border-indigoAccent/20"
                  : "text-textMuted hover:text-white hover:bg-cardLight/50"
              }`}
            >
              <ListTodo size={18} />
              <span>Problems</span>
            </Link>
          </nav>
        </div>

        {/* Footer Profile & Logout */}
        <div className="p-4 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2 bg-cardLight/30 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violetAccent to-indigoAccent flex items-center justify-center text-white font-mono font-bold text-sm">
              {userName[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-semibold text-white truncate">{userName}</span>
              <span className="block text-[10px] text-textMuted truncate">Student</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative h-full">
        {children}
      </main>
    </div>
  );
};
export default Layout;
