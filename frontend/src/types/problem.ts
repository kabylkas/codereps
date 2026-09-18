export interface ProblemTag {
  id: string;
  name: string;
}

export interface TestCase {
  id: string;
  problem_id: string;
  test_type: "stdin_stdout" | "file_io" | "function";
  input_data: string;
  expected_output: string;
  metadata_json: string | null;
  order_index: number;
  is_hidden: boolean;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  starter_code: string | null;
  solution_code: string | null;
  language: string;
  created_by: string;
  is_public: boolean;
  topic_id: string | null;
  tags: ProblemTag[];
  test_cases: TestCase[];
  created_at: string;
}

export interface GenerationRequest {
  topic_id: string;
  num_problems: number;
  difficulty: "easy" | "medium" | "hard";
  test_type: "stdin_stdout" | "file_io" | "function";
  num_test_cases: number;
  language: string;
  custom_instructions?: string;
}

export interface ProblemCreate {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  starter_code?: string;
  solution_code?: string;
  language: string;
  tag_ids?: string[];
}

export interface ProblemUpdate {
  title?: string;
  description?: string;
  difficulty?: "easy" | "medium" | "hard";
  starter_code?: string;
  solution_code?: string;
  language?: string;
  tag_ids?: string[];
}
