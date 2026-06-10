import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Mail, Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { invoke } from "@tauri-apps/api/core";

const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;

export const Login: React.FC = () => {
  const [mockEmail, setMockEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Load Google GIS client dynamically on mount
  useEffect(() => {
    if (isTauri) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      const google = (window as any).google;
      if (google) {
        const client_id =
          import.meta.env.VITE_GOOGLE_CLIENT_ID ||
          "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

        google.accounts.id.initialize({
          client_id: client_id,
          callback: handleGoogleCredentialResponse
        });

        google.accounts.id.renderButton(document.getElementById("google-signin-btn"), {
          theme: theme === "dark" ? "filled_black" : "outline",
          size: "large",
          width: "320",
          text: "signin_with",
          shape: "rectangular"
        });
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [theme]);

  // Handle Google Callback
  const handleGoogleCredentialResponse = async (googleResponse: any) => {
    setError(null);
    setLoading(true);
    try {
      const idToken = googleResponse.credential;
      const response = await api.post<{
        token: string;
        user: { name: string; email: string; profilePictureUrl?: string | null; isAdmin?: boolean };
      }>("/auth/login", { idToken });

      api.setToken(response.data.token);
      localStorage.setItem("az_user_name", response.data.user.name || "Coder");
      localStorage.setItem("az_user_avatar", response.data.user.profilePictureUrl || "");
      localStorage.setItem("az_user_email", response.data.user.email || "");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Google Authentication failed. Are you authorized?");
    } finally {
      setLoading(false);
    }
  };

  const handleTauriGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const client_id =
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        "401717411208-a647egk5lo24fcgbv49o6mf5rs32ih5p.apps.googleusercontent.com";

      const idToken = await invoke<string>("start_login_flow", { clientId: client_id });

      const response = await api.post<{
        token: string;
        user: { name: string; email: string; profilePictureUrl?: string | null; isAdmin?: boolean };
      }>("/auth/login", { idToken });

      api.setToken(response.data.token);
      localStorage.setItem("az_user_name", response.data.user.name || "Coder");
      localStorage.setItem("az_user_avatar", response.data.user.profilePictureUrl || "");
      localStorage.setItem("az_user_email", response.data.user.email || "");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || err || "Google Authentication failed. Are you authorized?");
    } finally {
      setLoading(false);
    }
  };

  // Handle Mock Local Login for Development
  const handleMockLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockEmail) return;

    setError(null);
    setLoading(true);
    try {
      const idToken = `mock_token_${mockEmail.trim().toLowerCase()}`;
      const response = await api.post<{
        token: string;
        user: { name: string; email: string; profilePictureUrl?: string | null; isAdmin?: boolean };
      }>("/auth/login", { idToken });

      api.setToken(response.data.token);
      localStorage.setItem("az_user_name", response.data.user.name || "Coder");
      localStorage.setItem("az_user_avatar", response.data.user.profilePictureUrl || "");
      localStorage.setItem("az_user_email", response.data.user.email || "");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Mock login failed. Is this email registered in the database?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-background text-foreground transition-colors duration-300">
      {/* Left Panel - Form */}
      <div className="flex flex-col justify-between p-6 md:p-10">
        {/* Header - Logo and Theme Toggle */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg select-none">
            <img
              src="/logo.png"
              alt="ShahLMS Logo"
              className="size-7 rounded-lg object-cover border border-border"
            />
            <span>ShahLMS</span>
          </Link>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-border"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Center - Google Sign In Panel */}
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm space-y-8 flex flex-col items-center">
            <div className="flex flex-col gap-1.5 text-center items-center">
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-border/80 mb-2">
                <Sparkles className="size-5 text-primary animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Access Arena</h1>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Sign in with your registered Google account to access your DSA platform
              </p>
            </div>

            {error && (
              <div className="w-full bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md text-sm text-center font-medium">
                {error}
              </div>
            )}

            {/* Google Identity Services Button Container */}
            <div className="w-full flex justify-center py-2 min-h-[44px]">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
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
                  <span>Authenticating...</span>
                </div>
              ) : isTauri ? (
                <button
                  type="button"
                  onClick={handleTauriGoogleLogin}
                  className="w-full max-w-[320px] flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 rounded-md py-2.5 px-4 text-sm font-semibold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              ) : (
                <div id="google-signin-btn" />
              )}
            </div>

            {/* Development Mock Login Box (Only rendered if in dev mode or google client ID is unconfigured) */}
            {import.meta.env.MODE !== "production" && (
              <div className="w-full p-4 border border-dashed border-border rounded-xl space-y-3 bg-muted/10">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
                  Local Developer Sandbox
                </div>
                <form onSubmit={handleMockLogin} className="space-y-2">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <Mail size={14} />
                    </span>
                    <input
                      type="email"
                      required
                      disabled={loading}
                      placeholder="Enter allowed email (e.g. shahnawaz@hostel96.com)"
                      className="w-full bg-card border border-input focus:border-primary focus:ring-1 focus:ring-primary rounded-md py-1.5 pl-8 pr-3 text-xs text-foreground outline-none transition-all"
                      value={mockEmail}
                      onChange={(e) => setMockEmail(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !mockEmail}
                    className="w-full py-1.5 px-3 rounded-md font-semibold text-primary-foreground bg-primary hover:bg-primary/95 text-xs transition-colors disabled:opacity-50"
                  >
                    Mock Developer Sign In
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Access restriction notice */}
        <div className="text-center text-xs text-muted-foreground select-none">
          Protected ShahLMS area. Safe-list invitation required.
        </div>
      </div>

      {/* Right Panel - Image/Decorative Graphics */}
      <div className="bg-muted/30 relative hidden lg:block border-l border-border overflow-hidden select-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="login-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#login-grid)" />
          </svg>
        </div>

        {/* Center Graphic Design */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-border/40" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/40" />
              <div className="absolute top-1/2 left-1/2 w-[141%] h-px bg-border/20 -translate-x-1/2 -translate-y-1/2 rotate-45" />
              <div className="absolute top-1/2 left-1/2 w-[141%] h-px bg-border/20 -translate-x-1/2 -translate-y-1/2 -rotate-45" />
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-border/30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full border border-border/40" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-border/50" />

            <div className="relative w-32 h-32 rounded-full border-2 border-border bg-card flex items-center justify-center shadow-lg backdrop-blur-xl">
              <img
                src="/logo.png"
                alt="ShahLMS Logo"
                className="w-16 h-16 rounded-2xl object-cover shadow-md border border-border"
              />
            </div>
          </div>
        </div>

        {/* Corner Accents */}
        <div className="absolute top-12 right-12 w-16 h-16 border-t-2 border-r-2 border-border/40 rounded-tr-lg" />
        <div className="absolute bottom-12 left-12 w-16 h-16 border-b-2 border-l-2 border-border/40 rounded-bl-lg" />
        <div className="absolute top-12 left-12 w-16 h-16 border-t-2 border-l-2 border-border/40 rounded-tl-lg" />
        <div className="absolute bottom-12 right-12 w-16 h-16 border-b-2 border-r-2 border-border/40 rounded-br-lg" />
      </div>
    </div>
  );
};
export default Login;
