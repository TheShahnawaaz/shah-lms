import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import {
  UserPlus,
  Trash2,
  Mail,
  Shield,
  UserCheck,
  AlertTriangle,
  Search,
  Info,
  Eye,
  X
} from "lucide-react";

interface AllowedUser {
  id: string;
  email: string;
  name: string | null;
  profilePictureUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
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

export const AllowedUsers: React.FC = () => {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Form state
  const [emailInput, setEmailInput] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Impersonation modal state
  const [impersonateTarget, setImpersonateTarget] = useState<{ id: string; email: string } | null>(null);

  // Self reference to prevent deleting oneself
  const token = localStorage.getItem("az_auth_token");
  const payload = token ? parseJwt(token) : null;
  const currentAdminId = payload?.id || "";

  const handleImpersonate = (targetUserId: string, targetUserEmail: string) => {
    if (targetUserId === currentAdminId) {
      alert("Error: You cannot impersonate yourself!");
      return;
    }
    setImpersonateTarget({ id: targetUserId, email: targetUserEmail });
  };

  const executeImpersonate = async (targetUserId: string, targetUserEmail: string) => {
    try {
      const res = await api.post<{
        token: string;
        user: { id: string; name: string | null; email: string; profilePictureUrl: string | null; isAdmin: boolean };
      }>(`/admin/impersonate/${targetUserId}`);

      const adminToken = localStorage.getItem("az_auth_token") || "";
      const adminName = localStorage.getItem("az_user_name") || "";
      const adminEmail = localStorage.getItem("az_user_email") || "";
      const adminAvatar = localStorage.getItem("az_user_avatar") || "";

      // Backup admin credentials
      localStorage.setItem("az_admin_token", adminToken);
      localStorage.setItem("az_admin_name", adminName);
      localStorage.setItem("az_admin_email", adminEmail);
      if (adminAvatar) {
        localStorage.setItem("az_admin_avatar", adminAvatar);
      } else {
        localStorage.removeItem("az_admin_avatar");
      }

      // Set impersonation flag
      localStorage.setItem("az_impersonated", "true");

      // Set target user credentials as active
      api.setToken(res.data.token);
      localStorage.setItem("az_user_name", res.data.user.name || "Coder");
      localStorage.setItem("az_user_email", res.data.user.email || "");
      if (res.data.user.profilePictureUrl) {
        localStorage.setItem("az_user_avatar", res.data.user.profilePictureUrl);
      } else {
        localStorage.removeItem("az_user_avatar");
      }

      // Force page refresh and redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      alert(err.message || `Failed to impersonate ${targetUserEmail}.`);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get<AllowedUser[]>("/admin/users");
      setUsers(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load allowed users list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const res = await api.post<AllowedUser>("/admin/users", {
        email: emailInput.trim(),
        isAdmin: makeAdmin
      });

      setUsers([res.data, ...users]);
      setFormSuccess(`Successfully safelisted ${emailInput}`);
      setEmailInput("");
      setMakeAdmin(false);

      // Auto clear success message
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (err: any) {
      setFormError(err.message || "Failed to invite email.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userId === currentAdminId) {
      alert("Error: You cannot revoke your own administrator access!");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to revoke access for ${userEmail}? They will immediately be logged out and blocked from logging in.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err: any) {
      alert(err.message || "Failed to revoke user access.");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Shield className="size-6 text-primary" />
          <span>Access Control</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add or revoke Google accounts that are authorized to access ShahLMS.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Safelist Invitation Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
              <UserPlus size={16} />
              <span>Safelist New Email</span>
            </h2>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Google Account Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    required
                    disabled={submitting}
                    placeholder="user@gmail.com"
                    className="w-full bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-2 pl-9 pr-4 text-sm text-foreground outline-none transition-all"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Admin Privileges Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/80 rounded-lg">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-foreground">Admin Privileges</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    Allows email adding and seeder access
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={submitting}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  checked={makeAdmin}
                  onChange={(e) => setMakeAdmin(e.target.checked)}
                />
              </div>

              {formError && (
                <div className="text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-lg text-center animate-in fade-in">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="text-xs font-semibold text-green-500 bg-green-500/10 border border-green-500/20 p-2.5 rounded-lg text-center animate-in fade-in">
                  {formSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !emailInput}
                className="w-full py-2 px-4 rounded-lg font-semibold text-primary-foreground bg-primary hover:bg-primary/95 text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? "Processing..." : "Safelisted Access"}
              </button>
            </form>
          </div>

          <div className="p-4 bg-muted/20 border border-border rounded-xl flex gap-3 text-xs leading-relaxed text-muted-foreground select-none">
            <Info className="size-4 shrink-0 text-primary mt-0.5" />
            <div>
              <strong>Security Protocol:</strong> Access control restricts the platform only to
              pre-registered Google accounts. No password inputs are required. Profiles sync
              automatically on login.
            </div>
          </div>
        </div>

        {/* Right Side: Safelisted User Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* List Search Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search safelist by email or name..."
                className="w-full bg-card border border-input focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-1.5 pl-9 pr-4 text-xs text-foreground outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="text-xs text-muted-foreground font-semibold">
              Total Accounts: {users.length}
            </div>
          </div>

          {/* User Table Card */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>Loading users...</span>
              </div>
            ) : error ? (
              <div className="p-12 text-center text-destructive text-sm font-semibold">{error}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm font-medium">
                No pre-registered Google accounts found matching query.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Safelisted On</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {filteredUsers.map((user) => {
                      const hasLoggedIn = !!user.name;
                      const isSelf = user.id === currentAdminId;

                      return (
                        <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                          {/* User Avatar + Email */}
                          <td className="py-3.5 px-4 flex items-center gap-2.5">
                            {user.profilePictureUrl ? (
                              <img
                                src={user.profilePictureUrl}
                                alt={user.name || "User"}
                                referrerPolicy="no-referrer"
                                className="h-7 w-7 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-primary/5 text-primary border border-border flex items-center justify-center font-bold text-[10px] uppercase">
                                {user.email.charAt(0)}
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-foreground truncate max-w-[150px] sm:max-w-[200px]">
                                {user.name || "Pending User"}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                                {user.email}
                              </span>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                user.isAdmin
                                  ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {user.isAdmin ? "Admin" : "User"}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {hasLoggedIn ? (
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-500 uppercase tracking-wider">
                                <UserCheck size={12} />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <AlertTriangle size={12} />
                                <span>Pending</span>
                              </span>
                            )}
                          </td>

                          {/* Invited Date */}
                          <td className="py-3.5 px-4 text-muted-foreground font-medium select-none">
                            {new Date(user.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })}
                          </td>

                          {/* Revoke Action */}
                          <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleImpersonate(user.id, user.email)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg border border-border/80 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors ${
                                isSelf ? "opacity-30 cursor-not-allowed" : ""
                              }`}
                              title={
                                isSelf
                                  ? "Cannot impersonate self"
                                  : `Impersonate ${user.email}`
                              }
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg border border-border/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ${
                                isSelf ? "opacity-30 cursor-not-allowed" : ""
                              }`}
                              title={
                                isSelf
                                  ? "Self-deletion disabled"
                                  : `Revoke access for ${user.email}`
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Impersonation Confirmation Modal */}
      {impersonateTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setImpersonateTarget(null)} 
          />

          {/* Modal Dialog Card */}
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md z-10 flex flex-col text-foreground overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2 text-amber-500">
                <Shield className="size-4" />
                <span className="font-bold text-xs uppercase tracking-wider">Impersonation Confirm</span>
              </div>
              <button
                onClick={() => setImpersonateTarget(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mb-2">
                <Eye className="size-6 animate-pulse" />
              </div>

              <h3 className="text-base font-bold tracking-tight">
                Enter Impersonation Mode?
              </h3>
              
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to impersonate <strong>{impersonateTarget.email}</strong>? You will temporarily see their dashboard, courses, and account content.
              </p>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-left">
                <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Key Points:</h4>
                <ul className="text-[10.5px] text-muted-foreground mt-1.5 list-disc list-inside space-y-1">
                  <li>You can exit anytime using the top warning banner.</li>
                  <li>All progress and completions viewed are live from database.</li>
                  <li>Admin views are hidden during active impersonation.</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/10 flex gap-2.5 justify-end">
              <button
                onClick={() => setImpersonateTarget(null)}
                className="py-1.5 px-4 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = impersonateTarget;
                  setImpersonateTarget(null);
                  executeImpersonate(target.id, target.email);
                }}
                className="py-1.5 px-4 bg-amber-500 text-amber-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Confirm Impersonate</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
export default AllowedUsers;
