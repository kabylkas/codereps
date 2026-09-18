import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCourses, joinCourse } from "../../api/courses";
import type { Course } from "../../types/course";

export default function CourseListPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    getCourses()
      .then(setCourses)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    try {
      await joinCourse(joinCode);
      setJoinCode("");
      load();
    } catch {
      setJoinError("Invalid join code or already enrolled");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Courses</h1>
        {user?.role === "professor" && (
          <Link
            to="/courses/new"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            + New Course
          </Link>
        )}
      </div>

      {user?.role === "student" && (
        <form onSubmit={handleJoin} className="mb-6 flex gap-2 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Join Code</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter join code"
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
            Join
          </button>
          {joinError && <span className="text-red-600 text-sm">{joinError}</span>}
        </form>
      )}

      {courses.length === 0 ? (
        <p className="text-gray-500">No courses found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold">{course.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{course.language}</p>
              {course.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{course.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
