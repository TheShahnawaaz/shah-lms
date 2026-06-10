import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Code2,
  Settings,
  LogOut,
  ChevronsUpDown,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Bookmark,
  Cpu,
  BookOpen,
  LayoutDashboard
} from "lucide-react";
import { CompilerSettingsModal } from "./problems/CompilerSettingsModal";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
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

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile
}) => {
  const [footerOpen, setFooterOpen] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCompilerSettingsOpen, setIsCompilerSettingsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const token = localStorage.getItem("az_auth_token");
  const payload = token ? parseJwt(token) : null;
  const userName = payload?.name || localStorage.getItem("az_user_name") || "Coder";
  const userEmail = localStorage.getItem("az_user_email") || payload?.email || "user@shahlms.com";
  const userAvatar = localStorage.getItem("az_user_avatar") || "";
  const isAdmin = payload?.isAdmin || false;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (footerRef.current && !footerRef.current.contains(event.target as Node)) {
        setFooterOpen(false);
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

  const handleSidebarClick = (e: React.MouseEvent) => {
    if (!isCollapsed) return;
    const target = e.target as HTMLElement;
    // Don't expand if user clicked a link, button, dropdown, or input
    if (target.closest("button") || target.closest("a") || target.closest("input")) {
      return;
    }
    onToggleCollapse();
  };

  // Grouped Navigation configuration
  const groups = [
    {
      label: "Platform",
      items: [
        { name: "Dashboard", path: "/dashboard", icon: Home },
        { name: "Courses", path: "/courses", icon: BookOpen },
        { name: "Problems", path: "/problems", icon: Code2 },
        { name: "Bookmarks", path: "/bookmarks", icon: Bookmark }
      ]
    },
    {
      label: "Admin",
      visible: isAdmin,
      items: [
        { name: "Admin Dashboard", path: "/admin", icon: LayoutDashboard },
        { name: "Course Management", path: "/admin/courses", icon: BookOpen },
        { name: "Problem Seeder", path: "/admin/seed", icon: Settings },
        { name: "Allowed Users", path: "/admin/users", icon: Users }
      ]
    }
  ];

  return (
    <>
    <motion.aside
      initial={false}
      animate={{ width: isMobile ? 240 : isCollapsed ? 68 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      onClick={handleSidebarClick}
      className={`fixed inset-y-0 left-0 lg:static z-50 lg:z-30 h-full bg-card border-r border-border flex flex-col flex-shrink-0 select-none transition-transform lg:transition-none duration-300 lg:transform-none ${
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } ${isCollapsed && !isMobile ? "lg:cursor-pointer" : ""}`}
    >
      {/* Sidebar Header / Branding */}
      <div className="flex items-center justify-between p-4 h-14 border-b border-border">
        {!isCollapsed || isMobile ? (
          <>
            <Link
              to="/dashboard"
              onClick={onCloseMobile}
              className="flex items-center gap-2 min-w-0"
            >
              {/* Custom geometric logo badge */}
              <img
                src="/logo.png"
                alt="ShahLMS Logo"
                className="w-7 h-7 rounded-lg object-cover flex-shrink-0 shadow-sm border border-border"
              />
              <div className="flex flex-col text-left leading-none min-w-0">
                <span className="font-bold text-sm text-foreground truncate">ShahLMS</span>
                <span className="text-[10px] text-muted-foreground font-medium truncate">
                  Admin Panel
                </span>
              </div>
            </Link>
            {isMobile ? (
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-border/40 lg:hidden"
                title="Close menu"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse();
                }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-border/40"
                title="Collapse sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </>
        ) : (
          <div
            onMouseEnter={() => setIsHeaderHovered(true)}
            onMouseLeave={() => setIsHeaderHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className="w-full flex justify-center cursor-pointer py-1.5"
            title="Expand sidebar"
          >
            {isHeaderHovered ? (
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center transition-all duration-150">
                <ChevronRight size={16} />
              </div>
            ) : (
              <img
                src="/logo.png"
                alt="ShahLMS Logo"
                className="w-7 h-7 rounded-lg object-cover shadow-sm border border-border transition-all duration-150"
              />
            )}
          </div>
        )}
      </div>

      {/* Sidebar Menu Scrollable Body */}
      <nav className="flex-1 py-4 flex flex-col gap-6 px-3 overflow-y-auto overflow-x-hidden">
        {groups
          .filter((group) => group.visible !== false)
          .map((group) => (
            <div key={group.label} className="flex flex-col gap-1.5">
              {/* Group Label */}
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  {group.label}
                </span>
              )}
              {/* Group Items */}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== "/dashboard" &&
                      item.path !== "/admin" &&
                      location.pathname.startsWith(item.path + "/"));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onCloseMobile}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                        isActive
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      } ${isCollapsed && !isMobile ? "justify-center" : ""}`}
                      title={isCollapsed && !isMobile ? item.name : undefined}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="truncate"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
      </nav>

      {/* Compiler Settings Button */}
      <div className={`px-3 pb-2 ${isCollapsed && !isMobile ? "flex justify-center" : ""}`}>
        <button
          onClick={() => setIsCompilerSettingsOpen(true)}
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm w-full text-muted-foreground hover:text-foreground hover:bg-muted/50 ${
            isCollapsed && !isMobile ? "justify-center" : ""
          }`}
          title={isCollapsed && !isMobile ? "Compiler Settings" : undefined}
        >
          <Cpu size={18} className="flex-shrink-0" />
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="truncate"
            >
              Compiler Settings
            </motion.span>
          )}
        </button>
      </div>

      {/* Sidebar Footer / User Dropdown */}
      <div className="p-3 border-t border-border relative" ref={footerRef}>
        {/* Dropup list */}
        <AnimatePresence>
          {footerOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: isCollapsed ? 0 : -4, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className={`absolute border border-border bg-card p-1 rounded-lg shadow-lg z-50 overflow-hidden ${
                isCollapsed ? "left-[72px] bottom-2 w-56" : "left-3 right-3 bottom-full mb-1"
              }`}
            >
              <div className="px-2 py-1.5 border-b border-border/60 pb-2 mb-1 flex items-center gap-2">
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
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={14} />
                <span>Log out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer trigger */}
        <button
          onClick={() => setFooterOpen(!footerOpen)}
          className={`flex items-center gap-2 p-1.5 rounded-lg text-left hover:bg-muted/80 transition-colors w-full border border-transparent hover:border-border/60 ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? "User Settings" : undefined}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-full object-cover flex-shrink-0 border border-border"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          {!isCollapsed && (
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <div className="flex flex-col leading-tight min-w-0 pr-1">
                <span className="text-xs font-semibold text-foreground truncate">{userName}</span>
                <span className="text-[10px] text-muted-foreground truncate">{userEmail}</span>
              </div>
              <ChevronsUpDown size={14} className="text-muted-foreground flex-shrink-0" />
            </div>
          )}
        </button>
      </div>
    </motion.aside>
  <CompilerSettingsModal
    isOpen={isCompilerSettingsOpen}
    onClose={() => setIsCompilerSettingsOpen(false)}
  />
  </>
  );
};
export default Sidebar;
