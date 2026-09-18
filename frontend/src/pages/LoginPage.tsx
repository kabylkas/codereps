import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string }; status?: number }; message?: string };
      const detail = axiosErr.response?.data?.detail || axiosErr.message || "Login failed";
      console.error("Login error:", axiosErr.response?.status, axiosErr.response?.data);
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-6 relative overflow-hidden">
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
              <span className="font-mono font-bold text-lg text-[#0c0d12]">{"{}"}</span>
            </div>
            <div>
              <span className="font-display font-bold text-2xl text-text-primary tracking-tight">codereps</span>
              <span className="font-display font-bold text-2xl text-lime">.ai</span>
            </div>
          </div>
          <h1 className="font-display font-bold text-2xl text-text-primary mb-1">Welcome back</h1>
          <p className="text-text-tertiary text-sm">Sign in to continue your training.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-error-dim border border-error/20 rounded-lg px-4 py-3 animate-fade-in">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
              placeholder="Enter your username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-lime text-[#0c0d12] py-3 rounded-lg text-sm font-bold hover:bg-lime-hover disabled:opacity-50 transition-all duration-200 hover:shadow-[0_0_24px_var(--color-lime-glow)]"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

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
