import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import * as authApi from "../api/auth";

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    role: "student",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.register(form);
      navigate("/login");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-10 h-10 rounded-xl bg-lime flex items-center justify-center">
            <span className="font-mono font-bold text-lg text-[#0c0d12]">{"{}"}</span>
          </div>
          <div>
            <span className="font-display font-bold text-2xl text-text-primary">codereps</span>
            <span className="font-display font-bold text-2xl text-lime">.ai</span>
          </div>
        </div>

        <h1 className="font-display font-bold text-2xl text-text-primary mb-1 text-center">Create your account</h1>
        <p className="text-text-tertiary text-sm mb-8 text-center">Start building your coding muscle.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-error-dim border border-error/20 rounded-lg px-4 py-3 animate-fade-in">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
                placeholder="Jane Smith"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
                placeholder="jsmith"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
              placeholder="jane@university.edu"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
              placeholder="Choose a strong password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Role</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "student", label: "Student", desc: "Practice & solve" },
                { value: "professor", label: "Professor", desc: "Create & manage" },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => update("role", r.value)}
                  className={`px-4 py-3 rounded-lg border text-left transition-all duration-200 ${
                    form.role === r.value
                      ? "border-lime bg-lime-dim"
                      : "border-border bg-surface hover:border-surface-3"
                  }`}
                >
                  <p className={`text-sm font-semibold ${form.role === r.value ? "text-lime" : "text-text-primary"}`}>
                    {r.label}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-lime text-[#0c0d12] py-3 rounded-lg text-sm font-bold hover:bg-lime-hover disabled:opacity-50 transition-all duration-200 hover:shadow-[0_0_24px_var(--color-lime-glow)] mt-2"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-center text-text-tertiary mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-lime hover:text-lime-hover transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
