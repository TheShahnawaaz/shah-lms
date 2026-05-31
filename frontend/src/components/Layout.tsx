import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { ChevronRight, Sun, Moon, LogOut, Menu } from "lucide-react";
import { useTheme } from "next-themes";

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const Layout: React.FC<LayoutProps> = ({ children, fullWidth = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("az_auth_token");
  const payload = token ? parseJwt(token) : null;
  const userName = payload?.name || localStorage.getItem("az_user_name") || "Coder";
  const userEmail = localStorage.getItem("az_user_email") || payload?.email || "user@shahlms.com";
  const userAvatar = localStorage.getItem("az_user_avatar") || "";
  const isAdmin = payload?.isAdmin || false;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("az_auth_token");
    localStorage.removeItem("az_user_name");
    localStorage.removeItem("az_user_avatar");
    localStorage.removeItem("az_user_email");
    navigate("/login");
  };

  // Generate dynamic breadcrumbs from path
  const getBreadcrumbs = () => {
    const parts = location.pathname.split("/").filter(Boolean);
    const crumbs = [{ name: "Home", path: "/dashboard" }];

    let currentPath = "";
    parts.forEach((part) => {
      currentPath += `/${part}`;
      let name = part.charAt(0).toUpperCase() + part.slice(1);
      if (part === "dashboard") name = "Dashboard";
      if (part === "problems") name = "Problems";
      if (part === "seed") name = "Database Seeder";
      if (!isNaN(Number(part))) name = `#${part}`;
      crumbs.push({ name, path: currentPath });
    });

    // De-duplicate if last element is home
    if (crumbs.length > 1 && crumbs[1].path === "/dashboard") {
      crumbs.shift(); // Remove "Home" if the next is "Dashboard"
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-300 relative">
      {/* Sidebar - collapsible state is managed here */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Mobile menu backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky Header - Hides on fullWidth mode */}
        {!fullWidth && (
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger menu for mobile */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 lg:hidden flex-shrink-0"
                title="Open menu"
              >
                <Menu size={20} />
              </button>

              {/* Breadcrumbs */}
              <nav className="hidden sm:flex items-center gap-1.5 text-sm font-medium min-w-0">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <div key={crumb.path} className="flex items-center gap-1.5 min-w-0">
                      {idx > 0 && (
                        <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                      )}
                      {isLast ? (
                        <span className="text-foreground font-semibold truncate max-w-[200px]">
                          {crumb.name}
                        </span>
                      ) : (
                        <Link
                          to={crumb.path}
                          className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]"
                        >
                          {crumb.name}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-border"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1 rounded-lg p-1 hover:bg-muted/80 border border-border/60 transition-colors"
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
                  <div className="hidden md:flex flex-col text-left leading-tight pr-2 pl-1">
                    <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                      {userName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {isAdmin ? "Super Admin" : "User"}
                    </span>
                  </div>
                </button>

                {/* Dropdown Menu */}
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
                          <div className="text-xs font-semibold text-foreground truncate">
                            {userName}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {userEmail}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
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
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-hidden relative">
          {fullWidth ? (
            <div className="h-full w-full">{children}</div>
          ) : (
            <div className="h-full w-full overflow-y-auto bg-background">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="min-h-full w-full max-w-7xl mx-auto p-6 md:p-8"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
export default Layout;
