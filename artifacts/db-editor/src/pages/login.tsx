import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Database, Eye, EyeOff, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl border border-border/50 overflow-hidden">
          <div className="bg-primary px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center bg-white/15 rounded-xl p-3 mb-4">
              <Database className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">DB BHISHM TABLET</h1>
            <p className="text-primary-foreground/70 text-sm mt-1">Supply Editor — Secure Access</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9"
                  autoComplete="username"
                  disabled={submitting || !!cooldownMs}
                  data-testid="input-username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  autoComplete="current-password"
                  disabled={submitting || !!cooldownMs}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
                {cooldownMs && (
                  <div className="mt-1 font-semibold">
                    Retry in {Math.floor(cooldownSecs / 60)}m {cooldownSecs % 60}s
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !!cooldownMs || !username || !password}
              data-testid="btn-login"
            >
              {submitting ? "Signing in…" : cooldownMs ? `Locked (${cooldownSecs}s)` : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
