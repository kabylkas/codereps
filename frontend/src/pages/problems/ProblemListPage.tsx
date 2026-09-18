import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getProblems, getTags } from "../../api/problems";
import { getTopics } from "../../api/topics";
import { addProblemToCourse } from "../../api/courses";
import type { Problem, ProblemTag } from "../../types/problem";
import type { Topic } from "../../types/topic";

const difficultyColors: Record<string, string> = {
  easy: "bg-success-dim text-success",
  medium: "bg-warning-dim text-warning",
  hard: "bg-error-dim text-error",
};

export default function ProblemListPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("course");

  const topicIdParam = searchParams.get("topic_id") || "";
  const courseIdForTopics = searchParams.get("course") || searchParams.get("course_id") || "";

  const [problems, setProblems] = useState<Problem[]>([]);
  const [tags, setTags] = useState<ProblemTag[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filters, setFilters] = useState({ difficulty: "", language: "", tag: "", topic_id: topicIdParam });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTags().then(setTags);
  }, []);

  useEffect(() => {
    if (courseIdForTopics) {
      getTopics(courseIdForTopics).then(setTopics);
    }
  }, [courseIdForTopics]);

  useEffect(() => {
    if (topicIdParam && topicIdParam !== filters.topic_id) {
      setFilters((f) => ({ ...f, topic_id: topicIdParam }));
    }
  }, [topicIdParam]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filters.difficulty) params.difficulty = filters.difficulty;
    if (filters.language) params.language = filters.language;
    if (filters.tag) params.tag = filters.tag;
    if (filters.topic_id) params.topic_id = filters.topic_id;
    getProblems(params)
      .then(setProblems)
      .finally(() => setLoading(false));
  }, [filters]);

  const handleAddToCourse = async (problemId: string) => {
    if (!courseId) return;
    try {
      await addProblemToCourse(courseId, problemId);
      alert("Problem added to course");
    } catch {
      alert("Failed to add (may already be in course)");
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">
            {courseId ? "Add Problems to Course" : "Problem Studio"}
          </h1>
          <p className="text-text-tertiary text-sm mt-1">
            {courseId ? "Select problems to add to your course." : "Create, edit, and manage practice problems."}
          </p>
        </div>
        {(user?.role === "professor" || user?.role === "admin") && (
          <Link
            to="/problems/new"
            className="bg-lime text-[#0c0d12] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-lime-hover transition-all duration-200 hover:shadow-[0_0_20px_var(--color-lime-glow)] flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Problem
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 animate-fade-in stagger-1">
        {[
          {
            value: filters.difficulty,
            onChange: (v: string) => setFilters((f) => ({ ...f, difficulty: v })),
            options: [
              { value: "", label: "All Difficulties" },
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ],
          },
          {
            value: filters.language,
            onChange: (v: string) => setFilters((f) => ({ ...f, language: v })),
            options: [
              { value: "", label: "All Languages" },
              { value: "python", label: "Python" },
              { value: "java", label: "Java" },
              { value: "javascript", label: "JavaScript" },
              { value: "c", label: "C" },
              { value: "cpp", label: "C++" },
            ],
          },
        ].map((filter, i) => (
          <select
            key={i}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors cursor-pointer"
          >
            {filter.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ))}
        <select
          value={filters.tag}
          onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors cursor-pointer"
        >
          <option value="">All Tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>
        {topics.length > 0 && (
          <select
            value={filters.topic_id}
            onChange={(e) => setFilters((f) => ({ ...f, topic_id: e.target.value }))}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors cursor-pointer"
          >
            <option value="">All Topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="skeleton h-4 flex-1" />
              <div className="skeleton h-4 w-16" />
              <div className="skeleton h-4 w-16" />
            </div>
          ))}
        </div>
      ) : problems.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface/50 p-12 text-center">
          <div className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <p className="text-text-secondary font-medium">No problems found</p>
          <p className="text-text-tertiary text-sm mt-1">Try adjusting your filters or create a new problem.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Problem</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Difficulty</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Language</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Tags</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {problems.map((p) => (
                <tr key={p.id} className="border-t border-border-subtle hover:bg-surface-2/50 transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/problems/${p.id}`} className="text-text-primary hover:text-lime transition-colors font-medium">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${difficultyColors[p.difficulty] || ""}`}>
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-text-tertiary text-xs">{p.language}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.tags.map((t) => (
                        <span key={t.id} className="bg-surface-2 text-text-tertiary text-[10px] font-medium px-2 py-0.5 rounded-full">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      {courseId && (
                        <button
                          onClick={() => handleAddToCourse(p.id)}
                          className="text-lime/70 hover:text-lime text-xs font-medium transition-colors"
                        >
                          + Add
                        </button>
                      )}
                      <Link to={`/problems/${p.id}/edit`} className="text-text-tertiary hover:text-text-secondary text-xs font-medium transition-colors">
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
