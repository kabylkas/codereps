import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { getCourses } from "../api/courses";
import { Link } from "react-router-dom";
import type { Course } from "../types/course";

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 transition-all duration-200 ${
      accent
        ? "bg-lime-dim border-lime/20"
        : "bg-surface border-border hover:border-surface-3"
    }`}>
      <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-display font-bold ${accent ? "text-lime" : "text-text-primary"}`}>{value}</p>
    </div>
  );
}

function ActionCard({ to, label, description, icon }: { to: string; label: string; description: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-border bg-surface p-5 hover:border-lime/40 transition-all duration-300 hover:shadow-[0_0_24px_-4px_var(--color-lime-glow)]"
    >
      <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center mb-3 group-hover:bg-lime-dim transition-colors duration-300">
        <span className="text-text-tertiary group-hover:text-lime transition-colors duration-300">{icon}</span>
      </div>
      <p className="text-sm font-semibold text-text-primary group-hover:text-lime transition-colors duration-300">{label}</p>
      <p className="text-xs text-text-tertiary mt-1">{description}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCourses()
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-text-primary">
          {greeting()}, <span className="text-lime">{user?.full_name?.split(" ")[0]}</span>
        </h1>
        <p className="text-text-tertiary text-sm mt-1">
          {user?.role === "professor"
            ? "Manage your courses and curate problems."
            : user?.role === "admin"
            ? "Platform overview and management."
            : "Ready for your next coding rep?"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 animate-fade-in stagger-1">
        <StatCard
          label={user?.role === "professor" ? "Your Courses" : user?.role === "admin" ? "Total Courses" : "Enrolled"}
          value={loading ? "—" : courses.length}
          accent
        />
        {user?.role === "professor" && (
          <>
            <ActionCard
              to="/courses/new"
              label="Create Course"
              description="Set up a new course with topics and problems."
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              }
            />
            <ActionCard
              to="/problems"
              label="Problem Studio"
              description="Create, edit, and generate practice problems."
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              }
            />
          </>
        )}
        {user?.role === "student" && (
          <ActionCard
            to="/courses"
            label="Join a Course"
            description="Browse available courses and start practicing."
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            }
          />
        )}
        {user?.role === "admin" && (
          <>
            <ActionCard
              to="/users"
              label="Manage Users"
              description="View and manage platform users."
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
            <ActionCard
              to="/problems"
              label="Problem Studio"
              description="Browse and manage all problems."
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              }
            />
          </>
        )}
      </div>

      {/* Course list */}
      <div className="animate-fade-in stagger-2">
        <h2 className="font-display font-bold text-lg text-text-primary mb-4">
          {user?.role === "professor" ? "Your Courses" : "Enrolled Courses"}
        </h2>
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
          <div className="rounded-xl border border-border-subtle bg-surface/50 p-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm font-medium">No courses yet</p>
            <p className="text-text-tertiary text-xs mt-1">
              {user?.role === "professor" ? "Create your first course to get started." : "Join a course to start practicing."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="group rounded-xl border border-border bg-surface p-5 hover:border-lime/30 transition-all duration-300 hover:shadow-[0_0_20px_-6px_var(--color-lime-glow)]"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-display font-bold text-text-primary group-hover:text-lime transition-colors">
                    {course.title}
                  </h3>
                  <span className="text-[10px] font-mono bg-surface-2 text-text-tertiary px-2 py-0.5 rounded-full uppercase">
                    {course.language}
                  </span>
                </div>
                {course.description && (
                  <p className="text-sm text-text-tertiary line-clamp-2 leading-relaxed">{course.description}</p>
                )}
                <div className="mt-4 flex items-center gap-1 text-xs text-text-tertiary group-hover:text-lime/60 transition-colors">
                  <span>Open course</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
