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
    existing_titles: list[str] | None = None,
) -> str:
    parts = [
        f'Generate {num_problems} NEW and UNIQUE programming problem(s) about "{topic_name}".',
        f"IMPORTANT: The programming language is {language.upper()}. ALL starter_code and solution_code MUST be written in {language.upper()} only. Do NOT use any other programming language.",
    ]
    if existing_titles:
        titles_list = "\n".join(f"- {t}" for t in existing_titles)
        parts.append(
            f"\nThe following problems ALREADY EXIST for this topic. Do NOT generate duplicates or variations of these. "
            f"Create completely different problems:\n{titles_list}\n"
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
