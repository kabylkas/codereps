import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCourse, getCourseStudents, getCourseProblems, removeStudent, removeProblemFromCourse } from "../../api/courses";
import type { Course } from "../../types/course";
import type { Problem } from "../../types/problem";
import type { User } from "../../types/auth";

import TopicManagementPanel from "./TopicManagementPanel";

type Tab = "overview" | "students" | "topics" | "problems";

const difficultyColors: Record<string, string> = {
  easy: "bg-success-dim text-success",
  medium: "bg-warning-dim text-warning",
  hard: "bg-error-dim text-error",
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  const isOwner = user && course && (user.id === course.owner_id || user.role === "admin");

  useEffect(() => {
    if (!id) return;
    getCourse(id)
      .then(setCourse)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (tab === "students" && isOwner) {
      getCourseStudents(id).then(setStudents);
    }
    if (tab === "problems") {
      getCourseProblems(id).then(setProblems);
    }
  }, [id, tab, isOwner]);

  if (loading) {
    return (
      <div className="animate-fade-in max-w-5xl">
        <div className="skeleton h-8 w-64 mb-3" />
        <div className="skeleton h-4 w-32 mb-8" />
        <div className="skeleton h-10 w-full mb-6" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }
  if (!course) return <p className="text-text-tertiary">Course not found.</p>;

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "overview", label: "Overview", show: true },
    { key: "students", label: "Students", show: !!isOwner },
    { key: "topics", label: "Topics", show: true },
    { key: "problems", label: "Problems", show: true },
  ];

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display font-bold text-2xl text-text-primary">{course.title}</h1>
          <span className="text-[10px] font-mono bg-surface-2 text-text-tertiary px-2.5 py-1 rounded-full uppercase">
            {course.language}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 pb-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                tab === t.key
                  ? "border-lime text-lime"
                  : "border-transparent text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="animate-fade-in">
          <div className="rounded-xl border border-border bg-surface p-6">
            <p className="text-text-secondary leading-relaxed">{course.description || "No description provided."}</p>
            {isOwner && (
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">Join Code</p>
                <div className="inline-flex items-center gap-3 bg-surface-2 rounded-lg px-4 py-2.5">
                  <span className="font-mono font-bold text-lime text-lg tracking-wider">{course.join_code}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(course.join_code)}
                    className="text-text-tertiary hover:text-text-primary transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "students" && isOwner && (
        <div className="animate-fade-in">
          {students.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-surface/50 p-10 text-center">
              <p className="text-text-secondary font-medium">No students enrolled yet</p>
              <p className="text-text-tertiary text-sm mt-1">Share the join code with your students.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Email</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-t border-border-subtle hover:bg-surface-2/50 transition-colors">
                      <td className="px-5 py-3 text-text-primary">{s.full_name}</td>
                      <td className="px-5 py-3 text-text-secondary">{s.email}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={async () => {
                            await removeStudent(course.id, s.id);
                            setStudents((prev) => prev.filter((st) => st.id !== s.id));
                          }}
                          className="text-error/60 hover:text-error text-xs font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "topics" && (
        <div className="animate-fade-in">
          <TopicManagementPanel courseId={course.id} courseLanguage={course.language} isOwner={!!isOwner} />
        </div>
      )}

      {tab === "problems" && (
        <div className="animate-fade-in">
          {isOwner && (
            <div className="mb-5">
              <Link
                to={`/problems?course=${course.id}`}
                className="inline-flex items-center gap-2 bg-lime text-[#FDFAF5] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-lime-hover transition-all duration-200 hover:shadow-[0_0_20px_var(--color-lime-glow)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Problems
              </Link>
            </div>
          )}
          {problems.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-surface/50 p-10 text-center">
              <p className="text-text-secondary font-medium">No problems in this course yet</p>
              <p className="text-text-tertiary text-sm mt-1">Add problems from the Problem Studio or generate new ones.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Problem</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Difficulty</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Language</th>
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
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-3 justify-end">
                          <Link to={`/problems/${p.id}/solve`} className="text-lime/70 hover:text-lime text-xs font-medium transition-colors">
                            Solve
                          </Link>
                          {isOwner && (
                            <button
                              onClick={async () => {
                                await removeProblemFromCourse(course.id, p.id);
                                setProblems((prev) => prev.filter((pr) => pr.id !== p.id));
                              }}
                              className="text-error/60 hover:text-error text-xs font-medium transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
