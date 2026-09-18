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
      <div className="mt-4 border border-green-200 rounded-lg p-4 bg-green-50">
        <h4 className="font-semibold text-green-800 mb-2">
          Generated {generated.length} problems for "{topicName}"
        </h4>
        <ul className="text-sm space-y-1">
          {generated.map((p) => (
            <li key={p.id} className="text-green-700">
              {p.title} ({p.difficulty}) - {p.test_cases?.length || 0} test cases
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="mt-3 text-sm text-green-700 hover:text-green-900 underline">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 border border-purple-200 rounded-lg p-4 bg-purple-50">
      <h4 className="font-semibold text-purple-800 mb-3">Generate Problems for "{topicName}"</h4>
      <form onSubmit={handleGenerate} className="space-y-3">
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Number of Problems</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.num_problems}
              onChange={(e) => update("num_problems", parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => update("difficulty", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Test Type</label>
            <select
              value={form.test_type}
              onChange={(e) => update("test_type", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="stdin_stdout">Stdin / Stdout</option>
              <option value="file_io">File I/O</option>
              <option value="function">Function Signature</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Test Cases per Problem</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.num_test_cases}
              onChange={(e) => update("num_test_cases", parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
          <select
            value={form.language}
            onChange={(e) => update("language", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Custom Instructions (optional)</label>
          <textarea
            value={form.custom_instructions}
            onChange={(e) => update("custom_instructions", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            rows={3}
            placeholder="E.g. Focus on while loops, use simple variable names, problems should involve counting..."
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Generating (this may take a minute)..." : "Generate"}
          </button>
          <button type="button" onClick={onClose} className="border border-gray-300 px-4 py-2 rounded text-sm">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
