import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getProblem } from "../../api/problems";
import { submitCode, getSubmissions } from "../../api/submissions";
import type { Problem } from "../../types/problem";
import type { Submission, SubmissionSummary } from "../../types/submission";
import CodeEditor from "../../components/ui/CodeEditor";
import Markdown from "react-markdown";

const difficultyColors: Record<string, string> = {
  easy: "bg-success-dim text-success",
  medium: "bg-warning-dim text-warning",
  hard: "bg-error-dim text-error",
};

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


  if (loading || !problem) {
    return (
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        <div className="w-1/2 space-y-4">
          <div className="skeleton h-7 w-48" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
        <div className="w-1/2">
          <div className="skeleton h-full rounded-xl" />
        </div>
      </div>
    );
  }

  const canSeeHidden = user && (user.role === "admin" || user.role === "professor");
  const visibleTestCases = problem.test_cases?.filter((tc) => canSeeHidden || !tc.is_hidden) || [];

  return (
    <div className="flex gap-5 h-[calc(100vh-8rem)] animate-fade-in">
      {/* Left: Problem description */}
      <div className="w-[45%] overflow-y-auto pr-2 space-y-4">
        <div className="flex items-center gap-3">
          <Link to={`/problems/${problem.id}`} className="text-text-tertiary hover:text-text-secondary transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="font-display font-bold text-lg text-text-primary">{problem.title}</h1>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${difficultyColors[problem.difficulty] || ""}`}>
            {problem.difficulty}
          </span>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="text-sm text-text-secondary leading-relaxed prose-custom">
            <Markdown>{problem.description}</Markdown>
          </div>
        </div>

        {/* Example test cases */}
        {visibleTestCases.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">Examples</h3>
            {visibleTestCases.slice(0, 3).map((tc, idx) => (
              <div key={tc.id} className="mb-3 last:mb-0 rounded-lg border border-border-subtle bg-surface-2/50 p-3">
                <p className="text-[10px] font-mono font-bold text-text-tertiary mb-2">Test {idx + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-text-tertiary mb-1">Input</p>
                    <pre className="bg-[#2A2623] rounded p-2 text-xs text-text-secondary font-mono border border-border-subtle">{tc.input_data}</pre>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-tertiary mb-1">Expected</p>
                    <pre className="bg-[#2A2623] rounded p-2 text-xs text-text-secondary font-mono border border-border-subtle">{tc.expected_output}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submission history */}
        {history.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
              Submission History
            </h3>
            <div className="space-y-1">
              {history.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs py-2 border-b border-border-subtle last:border-0">
                  <span className={`font-bold ${
                    s.status === "passed" ? "text-success" : s.status === "failed" ? "text-error" : "text-text-tertiary"
                  }`}>
                    {s.status === "passed" ? "Passed" : s.status === "failed" ? "Failed" : s.status}
                  </span>
                  <span className="font-mono text-text-tertiary">
                    {s.passed_tests}/{s.total_tests}
                  </span>
                  <span className="text-text-tertiary">{new Date(s.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Code editor + results */}
      <div className="w-[55%] flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text-secondary focus:outline-none focus:border-lime transition-colors cursor-pointer"
            >
              <option value="python">Python</option>
              <option value="c">C</option>
            </select>
            <span className="text-[10px] text-text-tertiary font-mono">
              {code.split("\n").length} lines
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !code.trim()}
            className="bg-lime text-[#FDFAF5] px-5 py-2 rounded-lg text-sm font-bold hover:bg-lime-hover disabled:opacity-50 transition-all duration-200 hover:shadow-[0_0_20px_var(--color-lime-glow)] flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Submit
              </>
            )}
          </button>
        </div>

        {/* Code editor */}
        <div className="flex-1 min-h-[300px]">
          <CodeEditor
            value={code}
            onChange={setCode}
            language={language}
            placeholder="Write your solution here..."
            style={{ minHeight: "300px", height: "100%" }}
          />
        </div>

        {/* Results */}
        {result && (
          <div className="mt-4 overflow-y-auto max-h-[280px] animate-fade-in">
            {/* Summary banner */}
            <div className={`rounded-xl p-4 mb-3 border ${
              result.status === "passed"
                ? "bg-success-dim border-success/20"
                : "bg-error-dim border-error/20"
            }`}>
              <p className={`font-display font-bold text-sm ${
                result.status === "passed" ? "text-success" : "text-error"
              }`}>
                {result.status === "passed"
                  ? `All tests passed! (${result.passed_tests}/${result.total_tests})`
                  : `${result.passed_tests}/${result.total_tests} tests passed`}
              </p>
            </div>

            {/* Individual results */}
            <div className="space-y-2">
              {result.results.map((r, idx) => (
                <div
                  key={r.id}
                  className={`rounded-lg border p-3 text-sm ${
                    r.passed
                      ? "border-success/10 bg-success-dim/30"
                      : "border-error/10 bg-error-dim/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-mono font-bold ${r.passed ? "text-success" : "text-error"}`}>
                      Test {idx + 1}: {r.passed ? "PASS" : "FAIL"}
                    </span>
                    {r.execution_time_ms != null && (
                      <span className="text-[10px] font-mono text-text-tertiary">{r.execution_time_ms}ms</span>
                    )}
                  </div>
                  {!r.passed && r.actual_output && (
                    <div className="mt-2">
                      <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Your output</p>
                      <pre className="bg-[#2A2623] rounded p-2 text-xs text-text-secondary font-mono overflow-x-auto border border-border-subtle">{r.actual_output}</pre>
                    </div>
                  )}
                  {r.error_message && (
                    <div className="mt-2">
                      <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Error</p>
                      <pre className="bg-[#2A2623] rounded p-2 text-xs text-error font-mono overflow-x-auto border border-border-subtle">
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
