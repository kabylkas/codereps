import client from "./client";
import type { Course, CourseCreate, CourseUpdate } from "../types/course";
import type { Problem } from "../types/problem";
import type { User } from "../types/auth";

export async function getCourses(): Promise<Course[]> {
  const res = await client.get("/courses");
  return res.data;
}

export async function getCourse(id: string): Promise<Course> {
  const res = await client.get(`/courses/${id}`);
  return res.data;
}

export async function createCourse(data: CourseCreate): Promise<Course> {
  const res = await client.post("/courses", data);
  return res.data;
}

export async function updateCourse(id: string, data: CourseUpdate): Promise<Course> {
  const res = await client.patch(`/courses/${id}`, data);
  return res.data;
}

export async function deleteCourse(id: string): Promise<void> {
  await client.delete(`/courses/${id}`);
}

export async function joinCourse(joinCode: string): Promise<void> {
  await client.post(`/courses/join`, { join_code: joinCode });
}

export async function getCourseStudents(courseId: string): Promise<User[]> {
  const res = await client.get(`/courses/${courseId}/students`);
  return res.data;
}

export async function removeStudent(courseId: string, userId: string): Promise<void> {
  await client.delete(`/courses/${courseId}/students/${userId}`);
}

export async function getCourseProblems(courseId: string): Promise<Problem[]> {
  const res = await client.get(`/courses/${courseId}/problems`);
  return res.data;
}

export async function addProblemToCourse(courseId: string, problemId: string): Promise<void> {
  await client.post(`/courses/${courseId}/problems`, { problem_id: problemId });
}

export async function removeProblemFromCourse(courseId: string, problemId: string): Promise<void> {
  await client.delete(`/courses/${courseId}/problems/${problemId}`);
}
