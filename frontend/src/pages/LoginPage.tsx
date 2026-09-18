import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import client from "../api/client";

/** Seeded by backend/seed.py. Dev-only shortcut for replaying role scenarios. */
const DEMO_ACCOUNTS = [
  { role: "Professor", email: "professor@codereps.ai", password: "prof123" },
  { role: "Student", email: "student@codereps.ai", password: "student123" },
  { role: "Admin", email: "admin@codereps.ai", password: "admin123" },
];

/** Turn an axios failure into something a person can act on. */
function describeLoginError(err: unknown): string {
  const e = err as {
    response?: { status?: number; data?: { detail?: string } };
    code?: string;
    message?: string;
  };

  // No response at all — the request never completed. Network down, backend
  // stopped, or the origin was blocked by CORS. This is the case that used to
  // surface as a bare "Login failed".
  if (!e.response) {
    const base = client.defaults.baseURL ?? "the API";
    if (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT") {
      return `The API at ${base} timed out. Is the backend still running?`;
    }
    return `Can't reach the API at ${base}. Start the backend with \`uv run uvicorn app.main:app --reload\`, and note it must be 127.0.0.1 rather than localhost.`;
  }

  const { status, data } = e.response;
  if (status === 401) return "Email or password is incorrect.";
  if (status === 422) return "Enter both an email address and a password.";
  if (status && status >= 500) {
    return `The server errored (${status}). Check the backend log for a traceback.`;
  }
  return data?.detail || `Sign-in failed (${status}).`;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Probe the API once on mount so an unreachable backend is visible before
  // the user types a password and gets a mystery failure.
  useEffect(() => {
    let cancelled = false;
    client
      .get("/health", { timeout: 4000 })
      .then(() => !cancelled && setApiReachable(true))
      .catch(() => !cancelled && setApiReachable(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (withEmail: string, withPassword: string) => {
    setError("");
    setLoading(true);
    try {
      await login(withEmail, withPassword);
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(describeLoginError(err));
      setApiReachable(
        (err as { response?: unknown }).response !== undefined,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void signIn(email, password);
  };

  const signInAsDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    void signIn(account.email, account.password);
  };

  const canSubmit = email.trim() !== "" && password !== "" && !loading;

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--color-lime) 1px, transparent 1px), linear-gradient(90deg, var(--color-lime) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      {/* Gradient blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime/8 rounded-full blur-[140px]" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-lime/5 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        {/* Logo + tagline */}
        <div className="text-center mb-10">
          <div className="flex items-center gap-2.5 justify-center mb-5">
            <div className="w-10 h-10 rounded-xl bg-lime flex items-center justify-center shadow-[0_0_32px_var(--color-lime-glow)]">
              <span className="font-mono font-bold text-lg text-[#FDFAF5]">{"{}"}</span>
            </div>
            <div>
              <span className="font-display font-bold text-2xl text-text-primary tracking-tight">codereps</span>
              <span className="font-display font-bold text-2xl text-lime">.ai</span>
            </div>
          </div>
          <h1 className="font-display font-bold text-2xl text-text-primary mb-1">Welcome back</h1>
          <p className="text-text-tertiary text-sm">Sign in to continue your training.</p>
        </div>

        {/* Backend unreachable — shown before the user wastes a password attempt */}
        {apiReachable === false && !error && (
          <div className="mb-5 bg-warning-dim border border-warning/20 rounded-lg px-4 py-3 animate-fade-in">
            <p className="text-warning text-sm font-medium mb-1">Backend unreachable</p>
            <p className="text-text-secondary text-xs leading-relaxed">
              Nothing is answering at{" "}
              <code className="font-mono text-text-primary">{client.defaults.baseURL}</code>. Start it
              with <code className="font-mono text-text-primary">uv run uvicorn app.main:app --reload</code>{" "}
              from <code className="font-mono text-text-primary">backend/</code>.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              role="alert"
              className="bg-error-dim border border-error/20 rounded-lg px-4 py-3 animate-fade-in"
            >
              <p className="text-error text-sm leading-relaxed">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
              placeholder="you@university.edu"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg pl-4 pr-11 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-md text-text-tertiary hover:text-text-secondary focus:outline-none focus:ring-1 focus:ring-lime/30 transition-colors"
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-lime text-[#FDFAF5] py-3 rounded-lg text-sm font-bold hover:bg-lime-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_0_24px_var(--color-lime-glow)]"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Dev-only: one click per role, for replaying scenarios */}
        {import.meta.env.DEV && (
          <div className="mt-7 pt-6 border-t border-border-subtle">
            <p className="text-[10px] font-mono font-bold text-text-tertiary uppercase tracking-wider mb-3 text-center">
              Dev · sign in as
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => signInAsDemo(account)}
                  disabled={loading}
                  title={`${account.email} / ${account.password}`}
                  className="px-2 py-2 rounded-lg border border-border bg-surface text-xs font-medium text-text-secondary hover:border-lime/40 hover:text-lime disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {account.role}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-center text-text-tertiary mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-lime hover:text-lime-hover transition-colors font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
