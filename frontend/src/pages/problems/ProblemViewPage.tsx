import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getProblem, deleteProblem } from "../../api/problems";
import type { Problem } from "../../types/problem";

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

  if (loading) return <p>Loading...</p>;
  if (!problem) return <p>Problem not found.</p>;

  const canEdit = user && (user.id === problem.created_by || user.role === "admin");

  const handleDelete = async () => {
    if (!confirm("Delete this problem?")) return;
    await deleteProblem(problem.id);
    navigate("/problems");
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <div className="flex items-center gap-2 mt-1">
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
            <span className="text-sm text-gray-500">{problem.language}</span>
            {problem.tags.map((t) => (
              <span key={t.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                {t.name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/problems/${problem.id}/solve`}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
          >
            Solve
          </Link>
          {canEdit && (
            <>
              <Link
                to={`/problems/${problem.id}/edit`}
                className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-200"
              >
                Edit
              </Link>
              <button onClick={handleDelete} className="bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm hover:bg-red-200">
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-2">Description</h2>
        <div className="prose prose-sm max-w-none whitespace-pre-wrap">{problem.description}</div>
      </div>

      {problem.starter_code && (
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-2">Starter Code</h2>
          <pre className="bg-gray-900 text-gray-100 rounded p-4 text-sm overflow-x-auto">
            <code>{problem.starter_code}</code>
          </pre>
        </div>
      )}

      {canEdit && problem.solution_code && (
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-2">Solution (hidden from students)</h2>
          <pre className="bg-gray-900 text-gray-100 rounded p-4 text-sm overflow-x-auto">
            <code>{problem.solution_code}</code>
          </pre>
        </div>
      )}

      {problem.test_cases && problem.test_cases.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">
            Test Cases ({problem.test_cases.length})
          </h2>
          <div className="space-y-3">
            {problem.test_cases.map((tc, idx) => (
              <div key={tc.id} className="border border-gray-200 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500">Test {idx + 1}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{tc.test_type}</span>
                  {tc.is_hidden && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Hidden</span>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Input</p>
                    <pre className="bg-gray-50 rounded p-2 text-xs overflow-x-auto">{tc.input_data}</pre>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Expected Output</p>
                    <pre className="bg-gray-50 rounded p-2 text-xs overflow-x-auto">{tc.expected_output}</pre>
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
