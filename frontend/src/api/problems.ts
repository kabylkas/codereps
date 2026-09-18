import client from "./client";
import type { Problem, ProblemCreate, ProblemTag, ProblemUpdate, TestCase } from "../types/problem";

export async function getProblems(params?: {
  difficulty?: string;
  language?: string;
  tag?: string;
  topic_id?: string;
}): Promise<Problem[]> {
  const res = await client.get("/problems", { params });
  return res.data;
}

export async function getProblem(id: string): Promise<Problem> {
  const res = await client.get(`/problems/${id}`);
  return res.data;
}

export async function createProblem(data: ProblemCreate): Promise<Problem> {
  const res = await client.post("/problems", data);
  return res.data;
}

export async function updateProblem(id: string, data: ProblemUpdate): Promise<Problem> {
  const res = await client.patch(`/problems/${id}`, data);
  return res.data;
}

export async function deleteProblem(id: string): Promise<void> {
  await client.delete(`/problems/${id}`);
}

export async function getTags(): Promise<ProblemTag[]> {
  const res = await client.get("/problems/tags");
  return res.data;
}

export async function createTag(name: string): Promise<ProblemTag> {
  const res = await client.post("/problems/tags", { name });
  return res.data;
}

export async function getTestCases(problemId: string): Promise<TestCase[]> {
  const res = await client.get(`/problems/${problemId}/test-cases`);
  return res.data;
}

export async function createTestCase(problemId: string, data: Omit<TestCase, "id" | "problem_id">): Promise<TestCase> {
  const res = await client.post(`/problems/${problemId}/test-cases`, data);
  return res.data;
}

export async function deleteTestCase(problemId: string, testCaseId: string): Promise<void> {
  await client.delete(`/problems/${problemId}/test-cases/${testCaseId}`);
}
