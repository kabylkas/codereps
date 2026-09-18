import { useState } from "react";
import { generateProblems } from "../../api/generation";
import type { GenerationRequest, Problem } from "../../types/problem";

interface Props {
  topicId: string;
  topicName: string;
  courseLanguage: string;
  onClose: () => void;
  onGenerated: () => void;
}

export default function GenerationDialog({ topicId, topicName, courseLanguage, onClose, onGenerated }: Props) {
  const [form, setForm] = useState<Omit<GenerationRequest, "topic_id">>({
    num_problems: 3,
    difficulty: "easy",
    test_type: "stdin_stdout",
    num_test_cases: 3,
    language: courseLanguage,
    custom_instructions: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<Problem[] | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const problems = await generateProblems({ ...form, topic_id: topicId });
      setGenerated(problems);
      onGenerated();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Generation failed. Check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  if (generated) {
    return (
      <div className="border-t border-border px-5 py-5 bg-success-dim/30 animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h4 className="font-display font-bold text-success">
            Generated {generated.length} problems
          </h4>
        </div>
        <ul className="space-y-1.5 mb-4">
          {generated.map((p) => (
            <li key={p.id} className="text-sm text-text-secondary flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-success" />
              <span className="text-text-primary font-medium">{p.title}</span>
              <span className="text-text-tertiary text-xs">({p.difficulty})</span>
              <span className="text-text-tertiary text-xs">{p.test_cases?.length || 0} tests</span>
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="text-sm text-success hover:text-success/80 font-medium transition-colors">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-border px-5 py-5 bg-info-dim/30 animate-fade-in">
      <h4 className="font-display font-bold text-info text-sm mb-4 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        Generate for "{topicName}"
      </h4>
      <form onSubmit={handleGenerate} className="space-y-4">
        {error && (
          <div className="bg-error-dim border border-error/20 rounded-lg px-4 py-3 animate-fade-in">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Problems</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.num_problems}
              onChange={(e) => update("num_problems", parseInt(e.target.value))}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-info focus:ring-1 focus:ring-info/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => update("difficulty", e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-info focus:ring-1 focus:ring-info/30 transition-colors"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Test Type</label>
            <select
              value={form.test_type}
              onChange={(e) => update("test_type", e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-info focus:ring-1 focus:ring-info/30 transition-colors"
            >
              <option value="stdin_stdout">Stdin / Stdout</option>
              <option value="file_io">File I/O</option>
              <option value="function">Function Signature</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Tests per problem</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.num_test_cases}
              onChange={(e) => update("num_test_cases", parseInt(e.target.value))}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-info focus:ring-1 focus:ring-info/30 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Language</label>
          <select
            value={form.language}
            onChange={(e) => update("language", e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-info focus:ring-1 focus:ring-info/30 transition-colors"
          >
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Custom instructions (optional)</label>
          <textarea
            value={form.custom_instructions}
            onChange={(e) => update("custom_instructions", e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-info focus:ring-1 focus:ring-info/30 transition-colors resize-none"
            rows={2}
            placeholder="E.g. Focus on while loops, use simple variable names..."
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-info text-[#0c0d12] px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-info/90 disabled:opacity-50 transition-all duration-200 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm text-text-secondary border border-border hover:border-surface-3 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
