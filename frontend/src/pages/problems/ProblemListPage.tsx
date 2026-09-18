import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getProblems, getTags } from "../../api/problems";
import { addProblemToCourse } from "../../api/courses";
import type { Problem, ProblemTag } from "../../types/problem";

export default function ProblemListPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("course");

  const [problems, setProblems] = useState<Problem[]>([]);
  const [tags, setTags] = useState<ProblemTag[]>([]);
  const [filters, setFilters] = useState({ difficulty: "", language: "", tag: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTags().then(setTags);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filters.difficulty) params.difficulty = filters.difficulty;
    if (filters.language) params.language = filters.language;
    if (filters.tag) params.tag = filters.tag;
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {courseId ? "Add Problems to Course" : "Problem Studio"}
        </h1>
        {(user?.role === "professor" || user?.role === "admin") && (
          <Link
            to="/problems/new"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            + New Problem
          </Link>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={filters.difficulty}
          onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          value={filters.language}
          onChange={(e) => setFilters((f) => ({ ...f, language: e.target.value }))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All Languages</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="javascript">JavaScript</option>
          <option value="c">C</option>
          <option value="cpp">C++</option>
        </select>
        <select
          value={filters.tag}
          onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All Tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : problems.length === 0 ? (
        <p className="text-gray-500">No problems found.</p>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Title</th>
                <th className="text-left px-4 py-2">Difficulty</th>
                <th className="text-left px-4 py-2">Language</th>
                <th className="text-left px-4 py-2">Tags</th>
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
                  <td className="px-4 py-2">
                    {p.tags.map((t) => (
                      <span key={t.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded mr-1">
                        {t.name}
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-2 text-right flex gap-2 justify-end">
                    {courseId && (
                      <button
                        onClick={() => handleAddToCourse(p.id)}
                        className="text-green-600 hover:text-green-800 text-xs"
                      >
                        + Add to Course
                      </button>
                    )}
                    <Link to={`/problems/${p.id}/edit`} className="text-gray-500 hover:text-gray-700 text-xs">
                      Edit
                    </Link>
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
