import client from "./client";
import type { GenerationRequest, Problem } from "../types/problem";

export async function generateProblems(data: GenerationRequest): Promise<Problem[]> {
  const res = await client.post("/generation/generate", data, { timeout: 120000 });
  return res.data;
}
