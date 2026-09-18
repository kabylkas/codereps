import client from "./client";
import type { GenerationRequest, Problem } from "../types/problem";

export async function generateProblems(data: GenerationRequest): Promise<Problem[]> {
  const res = await client.post("/generation/generate", data, { timeout: 120000 });
  return res.data;
}

export interface GenerationEvent {
  type: "status" | "problem_saved" | "done" | "error";
  data: {
    message?: string;
    phase?: string;
    current?: number;
    total?: number;
    problem?: Problem;
  };
}

export function generateProblemsStream(
  data: GenerationRequest,
  onEvent: (event: GenerationEvent) => void,
): AbortController {
  const controller = new AbortController();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  const token = localStorage.getItem("access_token");

  fetch(`${API_URL}/generation/generate-stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Generation failed" }));
        onEvent({ type: "error", data: { message: err.detail || "Generation failed" } });
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && currentEventType) {
            try {
              const parsed = JSON.parse(line.slice(6));
              onEvent({ type: currentEventType as GenerationEvent["type"], data: parsed });
            } catch {
              // skip malformed data
            }
            currentEventType = "";
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onEvent({ type: "error", data: { message: String(err) } });
      }
    });

  return controller;
}
