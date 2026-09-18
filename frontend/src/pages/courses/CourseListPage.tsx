import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCourses, joinCourse } from "../../api/courses";
import type { Course } from "../../types/course";

export default function CourseListPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    getCourses()
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    setJoinLoading(true);
    try {
      await joinCourse(joinCode);
      const updated = await getCourses();
      setCourses(updated);
      setJoinCode("");
    } catch {
      setJoinError("Invalid code or already enrolled.");
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Courses</h1>
          <p className="text-text-tertiary text-sm mt-1">
            {user?.role === "professor" ? "Manage and create your courses." : "Your enrolled courses."}
          </p>
        </div>
        {(user?.role === "professor" || user?.role === "admin") && (
          <Link
            to="/courses/new"
            className="bg-lime text-[#FDFAF5] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-lime-hover transition-all duration-200 hover:shadow-[0_0_20px_var(--color-lime-glow)] flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Course
          </Link>
        )}
      </div>

      {/* Join course (students) */}
      {user?.role === "student" && (
        <form onSubmit={handleJoin} className="mb-8 animate-fade-in stagger-1">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">Join with code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary font-mono placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
                placeholder="Enter course code..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={joinLoading}
              className="bg-lime text-[#FDFAF5] px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-lime-hover disabled:opacity-50 transition-all duration-200"
            >
              {joinLoading ? "Joining..." : "Join"}
            </button>
          </div>
          {joinError && <p className="text-error text-xs mt-2">{joinError}</p>}
        </form>
      )}

      {/* Course grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-5">
              <div className="skeleton h-5 w-2/3 mb-3" />
              <div className="skeleton h-3 w-1/3 mb-4" />
              <div className="skeleton h-3 w-full" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface/50 p-12 text-center">
          <div className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
          <p className="text-text-secondary font-medium">No courses yet</p>
          <p className="text-text-tertiary text-sm mt-1">
            {user?.role === "professor" ? "Create your first course to start building a problem pool." : "Enter a join code from your professor to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course, i) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className={`group rounded-xl border border-border bg-surface p-5 hover:border-lime/30 transition-all duration-300 hover:shadow-[0_0_20px_-6px_var(--color-lime-glow)] animate-fade-in stagger-${Math.min(i + 1, 5)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display font-bold text-text-primary group-hover:text-lime transition-colors">
                  {course.title}
                </h3>
                <span className="text-[10px] font-mono bg-surface-2 text-text-tertiary px-2 py-0.5 rounded-full uppercase shrink-0 ml-2">
                  {course.language}
                </span>
              </div>
              {course.description && (
                <p className="text-sm text-text-tertiary line-clamp-2 leading-relaxed">{course.description}</p>
              )}
              <div className="mt-4 flex items-center gap-1 text-xs text-text-tertiary group-hover:text-lime/60 transition-colors">
                <span>View course</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
