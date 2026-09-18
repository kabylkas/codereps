import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getProblem, deleteProblem } from "../../api/problems";
import type { Problem } from "../../types/problem";

const difficultyColors: Record<string, string> = {
  easy: "bg-success-dim text-success",
  medium: "bg-warning-dim text-warning",
  hard: "bg-error-dim text-error",
};

export default function ProblemViewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getProblem(id)
        .then(setProblem)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl animate-fade-in">
        <div className="skeleton h-8 w-64 mb-3" />
        <div className="skeleton h-4 w-48 mb-8" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }
  if (!problem) return <p className="text-text-tertiary">Problem not found.</p>;

  const canEdit = user && (user.id === problem.created_by || user.role === "admin");

  const handleDelete = async () => {
    if (!confirm("Delete this problem?")) return;
    await deleteProblem(problem.id);
    navigate("/problems");
  };

  return (
    <div className="max-w-3xl animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors mb-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary mb-2">{problem.title}</h1>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${difficultyColors[problem.difficulty] || ""}`}>
              {problem.difficulty}
            </span>
            <span className="text-xs font-mono text-text-tertiary">{problem.language}</span>
            {problem.tags.map((t) => (
              <span key={t.id} className="bg-surface-2 text-text-tertiary text-[10px] font-medium px-2 py-0.5 rounded-full">
                {t.name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/problems/${problem.id}/solve`}
            className="bg-lime text-[#0c0d12] px-4 py-2 rounded-lg text-sm font-bold hover:bg-lime-hover transition-all duration-200 hover:shadow-[0_0_16px_var(--color-lime-glow)]"
          >
            Solve
          </Link>
          {canEdit && (
            <>
              <Link
                to={`/problems/${problem.id}/edit`}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary border border-border hover:border-surface-3 hover:text-text-primary transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium text-error/70 border border-error/20 hover:border-error/40 hover:text-error transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-border bg-surface p-6 mb-4">
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">Description</h2>
        <div className="text-text-secondary leading-relaxed whitespace-pre-wrap text-sm">{problem.description}</div>
      </div>

      {/* Starter code */}
      {problem.starter_code && (
        <div className="rounded-xl border border-border bg-surface p-6 mb-4">
          <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">Starter Code</h2>
          <pre className="bg-[#0c0d12] rounded-lg p-4 text-sm overflow-x-auto border border-border-subtle">
            <code className="text-lime/80 font-mono">{problem.starter_code}</code>
          </pre>
        </div>
      )}

      {/* Solution (professors only) */}
      {canEdit && problem.solution_code && (
        <div className="rounded-xl border border-border bg-surface p-6 mb-4">
          <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
            Solution
            <span className="text-[10px] bg-warning-dim text-warning px-2 py-0.5 rounded-full normal-case tracking-normal">Hidden from students</span>
          </h2>
          <pre className="bg-[#0c0d12] rounded-lg p-4 text-sm overflow-x-auto border border-border-subtle">
            <code className="text-lime/80 font-mono">{problem.solution_code}</code>
          </pre>
        </div>
      )}

      {/* Test cases */}
      {problem.test_cases && problem.test_cases.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-4">
            Test Cases ({problem.test_cases.length})
          </h2>
          <div className="space-y-3">
            {problem.test_cases.map((tc, idx) => (
              <div key={tc.id} className="rounded-lg border border-border-subtle bg-surface-2/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono font-bold text-text-secondary">Test {idx + 1}</span>
                  <span className="text-[10px] bg-surface-3 text-text-tertiary px-2 py-0.5 rounded-full">{tc.test_type}</span>
                  {tc.is_hidden && (
                    <span className="text-[10px] bg-warning-dim text-warning px-2 py-0.5 rounded-full">Hidden</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Input</p>
                    <pre className="bg-[#0c0d12] rounded-lg p-3 text-xs text-text-secondary font-mono overflow-x-auto border border-border-subtle">{tc.input_data}</pre>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">Expected Output</p>
                    <pre className="bg-[#0c0d12] rounded-lg p-3 text-xs text-text-secondary font-mono overflow-x-auto border border-border-subtle">{tc.expected_output}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
