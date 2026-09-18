import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getProblem } from "../../api/problems";
import { submitCode, getSubmissions } from "../../api/submissions";
import type { Problem } from "../../types/problem";
import type { Submission, SubmissionSummary } from "../../types/submission";

export default function ProblemSolvePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Submission | null>(null);
  const [history, setHistory] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getProblem(id).then((p) => {
      setProblem(p);
      setCode(p.starter_code || "");
      setLanguage(p.language || "python");
      setLoading(false);
    });
    getSubmissions(id).then(setHistory);
  }, [id]);

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await submitCode(id, code, language);
      setResult(res);
      getSubmissions(id).then(setHistory);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      alert(axiosErr.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !problem) return <p>Loading...</p>;

  const canSeeHidden = user && (user.role === "admin" || user.role === "professor");
  const visibleTestCases = problem.test_cases?.filter((tc) => canSeeHidden || !tc.is_hidden) || [];

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left: Problem description */}
      <div className="w-1/2 overflow-y-auto pr-4">
        <div className="flex items-center gap-2 mb-3">
          <Link to={`/problems/${problem.id}`} className="text-blue-600 hover:underline text-sm">
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold">{problem.title}</h1>
          <span
            className={`px-2 py-0.5 rounded text-xs ${
              problem.difficulty === "easy"
                ? "bg-green-100 text-green-700"
                : problem.difficulty === "medium"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {problem.difficulty}
          </span>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">{problem.description}</div>
        </div>

        {visibleTestCases.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Example Test Cases</h3>
            {visibleTestCases.slice(0, 3).map((tc, idx) => (
              <div key={tc.id} className="mb-3 border border-gray-100 rounded p-2">
                <p className="text-xs font-medium text-gray-500 mb-1">Test {idx + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-400">Input</p>
                    <pre className="bg-gray-50 rounded p-2 text-xs">{tc.input_data}</pre>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Expected Output</p>
                    <pre className="bg-gray-50 rounded p-2 text-xs">{tc.expected_output}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submission history */}
        {history.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Submission History</h3>
            <div className="space-y-1">
              {history.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                  <span
                    className={`font-medium ${
                      s.status === "passed" ? "text-green-600" : s.status === "failed" ? "text-red-600" : "text-gray-500"
                    }`}
                  >
                    {s.status === "passed" ? "Passed" : s.status === "failed" ? "Failed" : s.status}
                  </span>
                  <span className="text-gray-400">
                    {s.passed_tests}/{s.total_tests} tests
                  </span>
                  <span className="text-gray-400">{new Date(s.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Code editor + results */}
      <div className="w-1/2 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="python">Python</option>
            <option value="c">C</option>
          </select>
          <button
            onClick={handleSubmit}
            disabled={submitting || !code.trim()}
            className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Running..." : "Submit"}
          </button>
        </div>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px]"
          placeholder="Write your solution here..."
          spellCheck={false}
        />

        {/* Results */}
        {result && (
          <div className="mt-4 overflow-y-auto max-h-[300px]">
            <div
              className={`rounded-lg p-3 mb-3 ${
                result.status === "passed" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={`font-semibold text-sm ${
                  result.status === "passed" ? "text-green-700" : "text-red-700"
                }`}
              >
                {result.status === "passed"
                  ? `All tests passed! (${result.passed_tests}/${result.total_tests})`
                  : `${result.passed_tests}/${result.total_tests} tests passed`}
              </p>
            </div>

            <div className="space-y-2">
              {result.results.map((r, idx) => (
                <div
                  key={r.id}
                  className={`rounded border p-3 text-sm ${
                    r.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium ${r.passed ? "text-green-700" : "text-red-700"}`}>
                      Test {idx + 1}: {r.passed ? "Passed" : "Failed"}
                    </span>
                    {r.execution_time_ms != null && (
                      <span className="text-xs text-gray-400">{r.execution_time_ms}ms</span>
                    )}
                  </div>
                  {!r.passed && r.actual_output && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-500">Your output:</p>
                      <pre className="bg-white rounded p-2 text-xs mt-1 overflow-x-auto">{r.actual_output}</pre>
                    </div>
                  )}
                  {r.error_message && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-500">Error:</p>
                      <pre className="bg-white rounded p-2 text-xs mt-1 overflow-x-auto text-red-600">
                        {r.error_message}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
