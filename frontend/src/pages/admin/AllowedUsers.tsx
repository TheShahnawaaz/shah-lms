import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { UserPlus, Trash2, Mail, Shield, UserCheck, AlertTriangle, Search, Info } from "lucide-react";

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

  // Self reference to prevent deleting oneself
  const token = localStorage.getItem("az_auth_token");
  const payload = token ? parseJwt(token) : null;
  const currentAdminId = payload?.id || "";

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

    if (!window.confirm(`Are you sure you want to revoke access for ${userEmail}? They will immediately be logged out and blocked from logging in.`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.message || "Failed to revoke user access.");
    }
  };

  const filteredUsers = users.filter(user =>
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
                  <span className="text-[10px] text-muted-foreground mt-0.5">Allows email adding and seeder access</span>
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
              <strong>Security Protocol:</strong> Access control restricts the platform only to pre-registered Google accounts. No password inputs are required. Profiles sync automatically on login.
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
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                              user.isAdmin 
                                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" 
                                : "bg-muted text-muted-foreground border-border"
                            }`}>
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
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg border border-border/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ${
                                isSelf ? "opacity-30 cursor-not-allowed" : ""
                              }`}
                              title={isSelf ? "Self-deletion disabled" : `Revoke access for ${user.email}`}
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
    </div>
  );
};
export default AllowedUsers;
