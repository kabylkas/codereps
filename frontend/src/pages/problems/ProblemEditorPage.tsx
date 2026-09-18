import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createProblem, getProblem, updateProblem, getTags } from "../../api/problems";
import type { ProblemTag } from "../../types/problem";
import CodeEditor from "../../components/ui/CodeEditor";

export default function ProblemEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    difficulty: "easy" as "easy" | "medium" | "hard",
    starter_code: "",
    solution_code: "",
    language: "python",
    tag_ids: [] as string[],
  });
  const [tags, setTags] = useState<ProblemTag[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTags().then(setTags);
    if (isEdit) {
      getProblem(id).then((p) => {
        setForm({
          title: p.title,
          description: p.description,
          difficulty: p.difficulty,
          starter_code: p.starter_code || "",
          solution_code: p.solution_code || "",
          language: p.language,
          tag_ids: p.tags.map((t) => t.id),
        });
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isEdit) {
        await updateProblem(id, form);
      } else {
        await createProblem(form);
      }
      navigate("/problems");
    } catch {
      setError("Failed to save problem");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const toggleTag = (tagId: string) => {
    setForm((f) => ({
      ...f,
      tag_ids: f.tag_ids.includes(tagId) ? f.tag_ids.filter((t) => t !== tagId) : [...f.tag_ids, tagId],
    }));
  };

  return (
    <div className="max-w-3xl animate-fade-in">
      <h1 className="font-display font-bold text-2xl text-text-primary mb-1">
        {isEdit ? "Edit Problem" : "Create Problem"}
      </h1>
      <p className="text-text-tertiary text-sm mb-8">
        {isEdit ? "Update the problem details below." : "Design a new practice problem for your students."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-error-dim border border-error/20 rounded-lg px-4 py-3 animate-fade-in">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
            placeholder="Problem title..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary font-mono placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors resize-none"
            rows={8}
            placeholder="Problem description with examples and constraints..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => update("difficulty", e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors cursor-pointer"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Language</label>
            <select
              value={form.language}
              onChange={(e) => update("language", e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors cursor-pointer"
            >
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="javascript">JavaScript</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Starter Code</label>
          <CodeEditor
            value={form.starter_code}
            onChange={(v) => update("starter_code", v)}
            language={form.language}
            placeholder="Code that students start with..."
            style={{ minHeight: "160px" }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Solution Code</label>
          <CodeEditor
            value={form.solution_code}
            onChange={(v) => update("solution_code", v)}
            language={form.language}
            placeholder="Reference solution..."
            style={{ minHeight: "160px" }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  form.tag_ids.includes(tag.id)
                    ? "bg-lime text-[#FDFAF5]"
                    : "bg-surface-2 text-text-tertiary border border-border hover:border-surface-3 hover:text-text-secondary"
                }`}
              >
                {tag.name}
              </button>
            ))}
            {tags.length === 0 && <span className="text-sm text-text-tertiary">No tags available</span>}
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-lime text-[#FDFAF5] px-6 py-3 rounded-lg text-sm font-bold hover:bg-lime-hover disabled:opacity-50 transition-all duration-200 hover:shadow-[0_0_20px_var(--color-lime-glow)]"
          >
            {loading ? "Saving..." : isEdit ? "Update Problem" : "Create Problem"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/problems")}
            className="px-6 py-3 rounded-lg text-sm font-medium text-text-secondary border border-border hover:border-surface-3 hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
