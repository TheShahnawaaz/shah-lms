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
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md bg-card rounded-xl p-8 border border-border shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-muted rounded-xl border border-border mb-4 text-primary">
            <Terminal size={32} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            ShahLMS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Create a new account</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md text-sm mb-5 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <User size={16} />
              </span>
              <input
                type="text"
                required
                className="w-full bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary rounded-md py-2 pl-9 pr-4 text-sm text-foreground transition-all outline-none"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                className="w-full bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary rounded-md py-2 pl-9 pr-4 text-sm text-foreground transition-all outline-none"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                className="w-full bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary rounded-md py-2 pl-9 pr-4 text-sm text-foreground transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                className="w-full bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary rounded-md py-2 pl-9 pr-4 text-sm text-foreground transition-all outline-none"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 mt-6 text-sm"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
export default Register;
