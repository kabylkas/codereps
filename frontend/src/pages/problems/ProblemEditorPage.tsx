import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createProblem, getProblem, updateProblem, getTags } from "../../api/problems";
import type { ProblemTag } from "../../types/problem";

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
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? "Edit Problem" : "Create Problem"}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (Markdown)</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
            rows={8}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => update("difficulty", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select
              value={form.language}
              onChange={(e) => update("language", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Starter Code</label>
          <textarea
            value={form.starter_code}
            onChange={(e) => update("starter_code", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono bg-gray-50"
            rows={6}
            placeholder="Code that students start with..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Solution Code</label>
          <textarea
            value={form.solution_code}
            onChange={(e) => update("solution_code", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono bg-gray-50"
            rows={6}
            placeholder="Reference solution..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1 rounded text-xs ${
                  form.tag_ids.includes(tag.id)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tag.name}
              </button>
            ))}
            {tags.length === 0 && <span className="text-sm text-gray-400">No tags yet</span>}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : isEdit ? "Update Problem" : "Create Problem"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/problems")}
            className="border border-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
