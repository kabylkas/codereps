import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCourse, getCourseStudents, getCourseProblems, removeStudent, removeProblemFromCourse } from "../../api/courses";
import type { Course } from "../../types/course";
import type { Problem } from "../../types/problem";
import type { User } from "../../types/auth";

import TopicManagementPanel from "./TopicManagementPanel";

type Tab = "overview" | "students" | "topics" | "problems";

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

  if (loading) return <p>Loading...</p>;
  if (!course) return <p>Course not found.</p>;

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "overview", label: "Overview", show: true },
    { key: "students", label: "Students", show: !!isOwner },
    { key: "topics", label: "Topics", show: true },
    { key: "problems", label: "Problems", show: true },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{course.title}</h1>
      <p className="text-sm text-gray-500 mb-4">{course.language}</p>

      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-2 text-sm font-medium border-b-2 ${
                tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      {tab === "overview" && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-700">{course.description || "No description."}</p>
          {isOwner && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">
                Join Code: <span className="font-mono font-bold text-gray-800">{course.join_code}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "students" && isOwner && (
        <div className="bg-white rounded-lg shadow">
          {students.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">No students enrolled.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Username</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">{s.full_name}</td>
                    <td className="px-4 py-2">{s.email}</td>
                    <td className="px-4 py-2">{s.username}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={async () => {
                          await removeStudent(course.id, s.id);
                          setStudents((prev) => prev.filter((st) => st.id !== s.id));
                        }}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "topics" && (
        <TopicManagementPanel courseId={course.id} courseLanguage={course.language} isOwner={!!isOwner} />
      )}

      {tab === "problems" && (
        <div>
          {isOwner && (
            <div className="mb-4">
              <Link
                to={`/problems?course=${course.id}`}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              >
                + Add Problems
              </Link>
            </div>
          )}
          {problems.length === 0 ? (
            <p className="text-gray-500 text-sm">No problems in this course yet.</p>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2">Title</th>
                    <th className="text-left px-4 py-2">Difficulty</th>
                    <th className="text-left px-4 py-2">Language</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {problems.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-4 py-2">
                        <Link to={`/problems/${p.id}`} className="text-blue-600 hover:underline">
                          {p.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            p.difficulty === "easy"
                              ? "bg-green-100 text-green-700"
                              : p.difficulty === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {p.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-2">{p.language}</td>
                      <td className="px-4 py-2 text-right flex gap-2 justify-end">
                        <Link to={`/problems/${p.id}/solve`} className="text-green-600 hover:text-green-800 text-xs">
                          Solve
                        </Link>
                        {isOwner && (
                          <button
                            onClick={async () => {
                              await removeProblemFromCourse(course.id, p.id);
                              setProblems((prev) => prev.filter((pr) => pr.id !== p.id));
                            }}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Remove
                          </button>
                        )}
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
