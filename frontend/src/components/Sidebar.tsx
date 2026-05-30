import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Code2, Settings, LogOut, ChevronsUpDown, Users } from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const [footerOpen, setFooterOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const footerRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("az_auth_token");
  const payload = token ? parseJwt(token) : null;
  const userName = payload?.name || localStorage.getItem("az_user_name") || "Coder";
  const userEmail = payload?.email || "user@shahlms.com";
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
    navigate("/login");
  };

  // Grouped Navigation configuration
  const groups = [
    {
      label: "Platform",
      items: [
        { name: "Dashboard", path: "/dashboard", icon: Home },
        { name: "Problems", path: "/problems", icon: Code2 },
      ]
    },
    {
      label: "Admin",
      visible: isAdmin,
      items: [
        { name: "Database Seeder", path: "/admin/seed", icon: Settings },
        { name: "Allowed Users", path: "/admin/users", icon: Users }
      ]
    }
  ];

  return (
    <motion.aside
      initial={{ width: isCollapsed ? 68 : 240 }}
      animate={{ width: isCollapsed ? 68 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen bg-card border-r border-border flex flex-col flex-shrink-0 z-30 select-none"
    >
      {/* Sidebar Header / Branding */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-border">
        {!isCollapsed ? (
          <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
            {/* Custom geometric logo badge */}
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-base flex-shrink-0 shadow-sm border border-border">
              S
            </div>
            <div className="flex flex-col text-left leading-none min-w-0">
              <span className="font-bold text-sm text-foreground truncate">ShahLMS</span>
              <span className="text-[10px] text-muted-foreground font-medium truncate">Admin Panel</span>
            </div>
          </Link>
        ) : (
          <div className="mx-auto">
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-sm border border-border">
              S
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Menu Scrollable Body */}
      <nav className="flex-1 py-4 flex flex-col gap-6 px-3 overflow-y-auto overflow-x-hidden">
        {groups
          .filter(group => group.visible !== false)
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
                  const isActive = location.pathname === item.path || 
                    (item.path !== "/dashboard" && location.pathname.startsWith(item.path + "/"));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                        isActive
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      } ${isCollapsed ? "justify-center" : ""}`}
                      title={isCollapsed ? item.name : undefined}
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

      {/* Sidebar Footer / User Dropdown */}
      <div className="p-3 border-t border-border relative" ref={footerRef}>
        {/* Dropup list */}
        <AnimatePresence>
          {footerOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: -4, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute left-3 right-3 bottom-full mb-1 border border-border bg-card p-1 rounded-lg shadow-lg z-50 overflow-hidden"
            >
              <div className="px-2 py-1.5 border-b border-border/60 pb-2 mb-1">
                <div className="text-xs font-semibold text-foreground truncate">{userName}</div>
                <div className="text-[10px] text-muted-foreground truncate">{userEmail}</div>
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
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
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
  );
};
export default Sidebar;
