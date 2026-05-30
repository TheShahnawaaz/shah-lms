import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Mail, Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";

export const Login: React.FC = () => {
  const [mockEmail, setMockEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Load Google GIS client dynamically on mount
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      const google = (window as any).google;
      if (google) {
        const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
        
        google.accounts.id.initialize({
          client_id: client_id,
          callback: handleGoogleCredentialResponse,
        });

        google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { 
            theme: theme === "dark" ? "filled_black" : "outline", 
            size: "large", 
            width: "320",
            text: "signin_with",
            shape: "rectangular"
          }
        );
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [theme]);

  // Handle Google Callback
  const handleGoogleCredentialResponse = async (googleResponse: any) => {
    setError(null);
    setLoading(true);
    try {
      const idToken = googleResponse.credential;
      const response = await api.post<{ token: string; user: { name: string; email: string } }>(
        "/auth/login",
        { idToken }
      );
      
      api.setToken(response.data.token);
      localStorage.setItem("az_user_name", response.data.user.name || "Coder");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Google Authentication failed. Are you authorized?");
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
      const response = await api.post<{ token: string; user: { name: string; email: string } }>(
        "/auth/login",
        { idToken }
      );
      
      api.setToken(response.data.token);
      localStorage.setItem("az_user_name", response.data.user.name || "Coder");
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
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground border border-border">
              S
            </div>
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
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Authenticating...</span>
                </div>
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
              <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-3xl shadow-md border border-border">
                S
              </div>
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
