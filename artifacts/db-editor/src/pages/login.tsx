import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { isAuthenticated, isLoading, refetch } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [cooldownMs, setCooldownMs] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/");
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!cooldownMs) return;
    const interval = setInterval(() => {
      setCooldownMs((prev) => {
        if (!prev || prev <= 1000) { clearInterval(interval); return null; }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownMs]);

  const cooldownSecs = cooldownMs ? Math.ceil(cooldownMs / 1000) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || cooldownMs) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        refetch();
        navigate("/");
      } else if (res.status === 429) {
        setCooldownMs(data.remainingMs ?? 5 * 60 * 1000);
        setError("Too many failed attempts. Please wait before trying again.");
      } else if (res.status === 403) {
        setError("Access from VPN or proxy networks is not allowed.");
      } else {
        setError(data.message ?? "Invalid username or password.");
        if (data.locked) setCooldownMs(data.remainingMs ?? 5 * 60 * 1000);
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return null;

  const isDisabled = submitting || !!cooldownMs;
  const canSubmit = !isDisabled && username.trim() && password;

  return (
    <div className="aurora-bg stripe-pattern min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative orbs */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: "-10%", left: "-5%",
          width: "40vw", height: "40vw",
          background: "radial-gradient(circle, rgba(74,122,242,0.15) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: "-15%", right: "-5%",
          width: "35vw", height: "35vw",
          background: "radial-gradient(circle, rgba(28,208,200,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-3xl"
          style={{
            background: "linear-gradient(135deg, rgba(74,122,242,0.25), rgba(28,208,200,0.15))",
            filter: "blur(1px)",
            transform: "scale(1.01)",
          }}
        />

        {/* Card */}
        <div className="relative glass-card rounded-3xl overflow-hidden">
          {/* Brand header */}
          <div
            className="gradient-brand px-8 py-9 text-center relative overflow-hidden"
          >
            {/* Shine lines */}
            <div className="absolute inset-0 stripe-pattern opacity-20" />
            <div className="relative z-10">
              <div
                className="inline-flex items-center justify-center rounded-2xl mb-5 w-16 h-16"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="16" cy="8" rx="12" ry="5" fill="rgba(255,255,255,0.9)" />
                  <path d="M4 8v8c0 2.76 5.37 5 12 5s12-2.24 12-5V8" stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="none"/>
                  <path d="M4 16v8c0 2.76 5.37 5 12 5s12-2.24 12-5v-8" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-wide mb-1">DB BHISHM TABLET</h1>
              <p className="text-white/60 text-sm">Supply Editor · Secure Access</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-4.5 6a4.5 4.5 0 0 1 9 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isDisabled}
                  autoComplete="username"
                  data-testid="input-username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all disabled:opacity-40"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1px solid rgba(74,122,242,0.6)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(74,122,242,0.12), inset 0 1px 0 rgba(255,255,255,0.04)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                    e.target.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04)";
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="2" y="6" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isDisabled}
                  autoComplete="current-password"
                  data-testid="input-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all disabled:opacity-40"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1px solid rgba(74,122,242,0.6)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(74,122,242,0.12), inset 0 1px 0 rgba(255,255,255,0.04)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                    e.target.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04)";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  background: "rgba(220, 60, 60, 0.12)",
                  border: "1px solid rgba(220, 60, 60, 0.25)",
                  color: "#ff6b6b",
                }}
              >
                {error}
                {cooldownMs && (
                  <div className="mt-1 font-bold text-xs">
                    Retry in {Math.floor(cooldownSecs / 60)}m {cooldownSecs % 60}s
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              data-testid="btn-login"
              className="gradient-button w-full py-2.5 rounded-xl text-sm font-semibold tracking-wide mt-2"
              style={{ letterSpacing: "0.05em" }}
            >
              {submitting
                ? "Signing in…"
                : cooldownMs
                ? `Locked (${cooldownSecs}s)`
                : "SIGN IN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
