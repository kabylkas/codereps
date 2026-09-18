import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCourse } from "../../api/courses";

export default function CourseCreatePage() {
  const [form, setForm] = useState({ title: "", description: "", language: "python" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const course = await createCourse(form);
      navigate(`/courses/${course.id}`);
    } catch {
      setError("Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="max-w-lg animate-fade-in">
      <h1 className="font-display font-bold text-2xl text-text-primary mb-1">Create Course</h1>
      <p className="text-text-tertiary text-sm mb-8">Set up a new course with a problem pool for your students.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-error-dim border border-error/20 rounded-lg px-4 py-3 animate-fade-in">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Course Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
            placeholder="e.g. CS 101 — Intro to Programming"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors resize-none"
            rows={3}
            placeholder="Brief description of the course..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Programming Language</label>
          <select
            value={form.language}
            onChange={(e) => update("language", e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors appearance-none cursor-pointer"
          >
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-lime text-[#0c0d12] px-6 py-3 rounded-lg text-sm font-bold hover:bg-lime-hover disabled:opacity-50 transition-all duration-200 hover:shadow-[0_0_20px_var(--color-lime-glow)]"
          >
            {loading ? "Creating..." : "Create Course"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/courses")}
            className="px-6 py-3 rounded-lg text-sm font-medium text-text-secondary border border-border hover:border-surface-3 hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
