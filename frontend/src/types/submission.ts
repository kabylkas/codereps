export interface SubmissionResult {
  id: string;
  test_case_id: string;
  passed: boolean;
  actual_output: string | null;
  error_message: string | null;
  execution_time_ms: number | null;
}

export interface Submission {
  id: string;
  problem_id: string;
  user_id: string;
  code: string;
  language: string;
  status: "pending" | "running" | "passed" | "failed" | "error";
  total_tests: number;
  passed_tests: number;
  results: SubmissionResult[];
  created_at: string;
}

export interface SubmissionSummary {
  id: string;
  status: string;
  total_tests: number;
  passed_tests: number;
  language: string;
  created_at: string;
}
