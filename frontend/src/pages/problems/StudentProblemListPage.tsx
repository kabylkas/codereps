import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getMyProblems, type StudentProblem } from "../../api/courses";
import { getTopics } from "../../api/topics";
import type { Topic } from "../../types/topic";

const difficultyColors: Record<string, string> = {
  easy: "bg-success-dim text-success",
  medium: "bg-warning-dim text-warning",
  hard: "bg-error-dim text-error",
};

const statusLabels: Record<string, { text: string; className: string }> = {
  ready: { text: "Ready", className: "bg-success-dim text-success" },
  pending: { text: "Generating...", className: "bg-warning-dim text-warning" },
  generating: { text: "Generating...", className: "bg-warning-dim text-warning" },
  failed: { text: "Error", className: "bg-error-dim text-error" },
};

export default function StudentProblemListPage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("course_id") || "";
  const topicIdParam = searchParams.get("topic_id") || "";

  const [problems, setProblems] = useState<StudentProblem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicFilter, setTopicFilter] = useState(topicIdParam);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      getTopics(courseId).then(setTopics);
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    getMyProblems(courseId, topicFilter || undefined)
      .then(setProblems)
      .finally(() => setLoading(false));
  }, [courseId, topicFilter]);

  // Poll for pending problems
  useEffect(() => {
    const hasPending = problems.some((p) => p.status === "pending" || p.status === "generating");
    if (!hasPending || !courseId) return;

    const interval = setInterval(() => {
      getMyProblems(courseId, topicFilter || undefined).then(setProblems);
    }, 3000);

    return () => clearInterval(interval);
  }, [problems, courseId, topicFilter]);

  const currentTopic = topics.find((t) => t.id === topicFilter);

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Link
            to={`/courses/${courseId}`}
            className="text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="font-display font-bold text-2xl text-text-primary">
            {currentTopic ? currentTopic.name : "My Problems"}
          </h1>
        </div>
        <p className="text-text-tertiary text-sm mt-1">
          Your personalized practice problems.
        </p>
      </div>

      {/* Topic filter */}
      {topics.length > 1 && (
        <div className="mb-6">
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors cursor-pointer"
          >
            <option value="">All Topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="skeleton h-4 flex-1" />
              <div className="skeleton h-4 w-16" />
              <div className="skeleton h-4 w-16" />
            </div>
          ))}
        </div>
      ) : problems.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface/50 p-12 text-center">
          <p className="text-text-secondary font-medium">No problems yet</p>
          <p className="text-text-tertiary text-sm mt-1">Problems will appear here once your professor adds them.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Problem</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Difficulty</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {problems.map((p, idx) => {
                const status = statusLabels[p.status] || statusLabels.pending;
                const isReady = p.status === "ready";
                return (
                  <tr key={p.id} className="border-t border-border-subtle hover:bg-surface-2/50 transition-colors">
                    <td className="px-5 py-3">
                      {isReady ? (
                        <Link
                          to={`/problems/${p.problem_id}`}
                          className="text-text-primary hover:text-lime transition-colors font-medium"
                        >
                          {p.title || `Problem ${idx + 1}`}
                        </Link>
                      ) : (
                        <span className="text-text-tertiary font-medium">
                          Problem {idx + 1}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${difficultyColors[p.difficulty] || ""}`}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.className}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isReady && (
                        <Link
                          to={`/problems/${p.problem_id}/solve`}
                          className="text-lime/70 hover:text-lime text-xs font-medium transition-colors"
                        >
                          Solve
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
