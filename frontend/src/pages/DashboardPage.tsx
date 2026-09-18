import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { getCourses } from "../api/courses";
import { Link } from "react-router-dom";
import type { Course } from "../types/course";

export default function DashboardPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    getCourses().then(setCourses).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Welcome, {user?.full_name}
      </h1>

      {user?.role === "professor" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Your Courses</p>
            <p className="text-2xl font-bold">{courses.length}</p>
          </div>
          <Link
            to="/courses/new"
            className="bg-blue-600 text-white rounded-lg shadow p-4 flex items-center justify-center hover:bg-blue-700"
          >
            + Create Course
          </Link>
          <Link
            to="/problems"
            className="bg-white rounded-lg shadow p-4 flex items-center justify-center hover:bg-gray-50 text-gray-700"
          >
            Problem Studio
          </Link>
        </div>
      )}

      {user?.role === "student" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Enrolled Courses</p>
            <p className="text-2xl font-bold">{courses.length}</p>
          </div>
          <Link
            to="/courses"
            className="bg-blue-600 text-white rounded-lg shadow p-4 flex items-center justify-center hover:bg-blue-700"
          >
            Join a Course
          </Link>
        </div>
      )}

      {user?.role === "admin" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Courses</p>
            <p className="text-2xl font-bold">{courses.length}</p>
          </div>
          <Link
            to="/users"
            className="bg-white rounded-lg shadow p-4 flex items-center justify-center hover:bg-gray-50 text-gray-700"
          >
            Manage Users
          </Link>
          <Link
            to="/problems"
            className="bg-white rounded-lg shadow p-4 flex items-center justify-center hover:bg-gray-50 text-gray-700"
          >
            Problem Studio
          </Link>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">
        {user?.role === "professor" ? "Your Courses" : "Enrolled Courses"}
      </h2>
      {courses.length === 0 ? (
        <p className="text-gray-500 text-sm">No courses yet.</p>
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
