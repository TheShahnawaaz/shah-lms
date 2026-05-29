import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Lock, Mail, User, Terminal } from "lucide-react";

export const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{ token: string; user: { name: string; email: string } }>(
        "/auth/register",
        { name, email, password }
      );
      api.setToken(response.data.token);
      localStorage.setItem("az_user_name", response.data.user.name || "Coder");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background glow points */}
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-violetAccent/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-emeraldAccent/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md glass-panel rounded-2xl p-8 border border-white/5 relative overflow-hidden">
        {/* Subtle top indicator line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violetAccent to-emeraldAccent"></div>

        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-indigoAccent/10 rounded-xl border border-indigoAccent/20 mb-3 text-indigoAccent">
            <Terminal size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            SHAH<span className="text-emeraldAccent">LMS</span>
          </h1>
          <p className="text-textMuted text-sm mt-1">Register for Learning & Practice</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900/40 text-red-400 p-3 rounded-lg text-sm mb-5 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-textMuted">
                <User size={18} />
              </span>
              <input
                type="text"
                required
                className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm text-white"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-textMuted">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm text-white font-mono"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-textMuted">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm text-white font-mono"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-textMuted">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm text-white font-mono"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-violetAccent to-indigoAccent hover:from-violetAccent/90 hover:to-indigoAccent/90 transition-all duration-300 shadow-neonViolet disabled:opacity-50 mt-6"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-textMuted mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-emeraldAccent hover:underline font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
export default Register;
