import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Bookmark, Star, Trophy, Flame, Sun, Moon, Bell, LogOut 
} from "lucide-react";

interface WorkspaceHeaderProps {
  problemId: number;
  problemTitle: string;
  bookmarked: boolean;
  onBookmarkToggle: () => void;
  theme: string;
  onThemeToggle: () => void;
  userAvatar: string;
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  problemId,
  problemTitle,
  bookmarked,
  onBookmarkToggle,
  theme,
  onThemeToggle,
  userAvatar,
  userName,
  userEmail,
  onLogout
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-[56px] border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/60 backdrop-blur-md relative z-40">
      <div className="flex items-center gap-3 min-w-0">
        {/* Back button */}
        <Link 
          to="/problems" 
          className="flex items-center justify-center size-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm flex-shrink-0"
          title="Back to problems arena"
        >
          <ArrowLeft size={16} />
        </Link>
        
        <button 
          onClick={onBookmarkToggle}
          className={`p-1.5 rounded-lg border transition-colors ${
            bookmarked 
              ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" 
              : "text-muted-foreground hover:text-foreground border-border hover:bg-muted/50"
          }`}
          title={bookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
        >
          <Bookmark size={15} />
        </button>

        <div className="h-4 w-px bg-border flex-shrink-0" />

        {/* Problem Meta */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-muted-foreground font-semibold px-1.5 py-0.5 rounded bg-muted/60">#{problemId}</span>
          <span className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[400px]">{problemTitle}</span>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {/* Stats Pills */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20 text-xs font-semibold">
            <Star size={13} fill="currentColor" />
            <span>68</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
            <Trophy size={13} fill="currentColor" />
            <span>268</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-500 border border-orange-500/20 text-xs font-semibold">
            <Flame size={13} fill="currentColor" />
            <span>0</span>
          </div>
        </div>

        <div className="h-4 w-px bg-border hidden lg:block" />

        {/* Theme Switcher */}
        <button
          onClick={onThemeToggle}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-border"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Bell Notifications */}
        <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-border">
          <Bell size={15} />
        </button>

        {/* User Dropdown */}
        <div className="relative animate-in fade-in" ref={dropdownRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-1 rounded-lg p-0.5 hover:bg-muted/80 border border-border/60 transition-colors"
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          <AnimatePresence>
            {userDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card p-1 shadow-lg z-50"
              >
                <div className="px-2 py-1.5 text-left border-b border-border/60 pb-2 mb-1 flex items-center gap-2">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{userName}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{userEmail}</div>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut size={14} />
                  <span>Log out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
export default WorkspaceHeader;
