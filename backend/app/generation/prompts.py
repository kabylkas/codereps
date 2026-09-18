SYSTEM_PROMPT = """You are an expert programming problem creator for educational purposes. \
You create high-quality, Leetcode-style programming problems for introductory computer science courses. \
Each problem must include a clear description with examples and constraints, starter code, a complete working solution, and test cases. \
Always respond with valid JSON matching the requested schema exactly."""

TEST_TYPE_INSTRUCTIONS = {
    "stdin_stdout": (
        "Test type: stdin/stdout.\n"
        "Each test case should have:\n"
        "- input_data: the exact stdin input string (use \\n for newlines)\n"
        "- expected_output: the exact expected stdout output string\n"
        "- metadata_json: null\n"
        "The starter code should read from stdin and print to stdout."
    ),
    "file_io": (
        "Test type: file I/O.\n"
        "Each test case should have:\n"
        "- input_data: the content of the input file\n"
        "- expected_output: the expected content of the output file\n"
        '- metadata_json: a JSON string like {"input_filename": "input.txt", "output_filename": "output.txt"}\n'
        "The starter code should read from a file and write to a file."
    ),
    "function": (
        "Test type: function signature.\n"
        "Each test case should have:\n"
        "- input_data: a JSON string of the function arguments\n"
        "- expected_output: a JSON string of the expected return value\n"
        '- metadata_json: a JSON string with "function_name", "function_signature", and "assertion_code"\n'
        "The assertion_code MUST match the programming language:\n"
        "  - For Python: use assert, e.g. assert add(2, 3) == 5\n"
        "  - For C: use assert() macro, e.g. assert(add(2, 3) == 5);\n"
        "The starter code should be a function signature with an empty body.\n"
        "For C: do NOT include main() in starter_code or solution_code — only the function itself.\n"
        "  The student's code will be #included as a library by the test harness."
    ),
}


def build_generation_prompt(
    topic_name: str,
    topic_description: str | None,
    language: str,
    difficulty: str,
    num_problems: int,
    num_test_cases: int,
    test_type: str,
    custom_instructions: str | None,
    existing_problems: list[dict] | None = None,
) -> str:
    parts = [
        f'Generate {num_problems} NEW and UNIQUE programming problem(s) about "{topic_name}".',
        f"IMPORTANT: The programming language is {language.upper()}. ALL starter_code and solution_code MUST be written in {language.upper()} only. Do NOT use any other programming language.",
        (
            "\nCREATIVE PROBLEM MODELING (very important):\n"
            "The underlying algorithm for each problem can be similar or even identical, but you MUST "
            "get very creative with how the problem is framed and explained. Wrap the algorithmic "
            "concept in a vivid, unique real-world scenario or story.\n"
            "\n"
            "For example, a simple 'sum of even numbers from 1 to N' problem could be remodeled as:\n"
            "- A savings story: you receive money every day but only save on even-numbered days. How much did you save?\n"
            "- A workout tracker: you train daily from day 1 to N, but only even days are heavy workouts. "
            "Each day number = effort units. What is the total effort on heavy days?\n"
            "- A factory quality check: products roll off an assembly line numbered 1 to N, but only "
            "even-numbered products get inspected. Sum of inspected product IDs?\n"
            "\n"
            "The student should NOT be able to tell that two problems use the same algorithm just by reading "
            "the descriptions. Each problem must feel like a genuinely different challenge even if the "
            "solution logic is the same. Use diverse domains: finance, sports, science, games, cooking, "
            "travel, nature, music, etc.\n"
        ),
    ]
    if existing_problems:
        problem_list = "\n".join(
            f'- "{p["title"]}": {p["description"][:150]}...'
            if len(p.get("description", "") or "") > 150
            else f'- "{p["title"]}": {p.get("description", "")}'
            for p in existing_problems
        )
        parts.append(
            f"\nEXISTING PROBLEMS for this topic (for context):\n{problem_list}\n\n"
            "DEDUPLICATION RULES:\n"
            "- You MUST use a different creative story/scenario/mental model than any existing problem. "
            "Do NOT reuse the same real-world framing (e.g., if a savings story exists, do not make another savings story).\n"
            "- You MAY reuse the same underlying algorithmic concept — that is encouraged. "
            "The goal is many problems that solve the same way but LOOK completely different.\n"
            "- Each new problem MUST have a unique, descriptive title that reflects its specific story, "
            "not the algorithm.\n"
        )
    if topic_description:
        parts.append(f"Topic context: {topic_description}")
    parts.append(f"Difficulty: {difficulty}")
    parts.append(f"Number of test cases per problem: {num_test_cases}")
    parts.append("")
    parts.append(TEST_TYPE_INSTRUCTIONS[test_type])
    if custom_instructions:
        parts.append(f"\nAdditional instructions from the professor:\n{custom_instructions}")
    parts.append(
        '\nRespond with a JSON object with this exact structure:\n'
        '{\n'
        '  "problems": [\n'
        '    {\n'
        '      "title": "string",\n'
        '      "description": "string (Leetcode-style with Examples and Constraints sections)",\n'
        '      "starter_code": "string",\n'
        '      "solution_code": "string (complete working solution)",\n'
        '      "test_cases": [\n'
        '        {\n'
        '          "input_data": "string",\n'
        '          "expected_output": "string",\n'
        '          "metadata_json": "string or null"\n'
        '        }\n'
        '      ]\n'
        '    }\n'
        '  ]\n'
        '}'
    )
    return "\n".join(parts)
