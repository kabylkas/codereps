import client from "./client";
import type { Submission, SubmissionSummary } from "../types/submission";

export async function submitCode(problemId: string, code: string, language: string): Promise<Submission> {
  const res = await client.post(`/problems/${problemId}/submit`, { code, language }, { timeout: 60000 });
  return res.data;
}

export async function getSubmissions(problemId: string): Promise<SubmissionSummary[]> {
  const res = await client.get(`/problems/${problemId}/submissions`);
  return res.data;
}

export async function getSubmission(submissionId: string): Promise<Submission> {
  const res = await client.get(`/submissions/${submissionId}`);
  return res.data;
}
