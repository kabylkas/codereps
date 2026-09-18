# ── Step 1: Problem statement generation (Gemini Flash Lite) ──

PROBLEM_SYSTEM_PROMPT = """\
You are an expert programming problem creator for educational purposes. \
You create high-quality, Leetcode-style programming problems for introductory computer science courses. \
Each problem must include a clear description with examples and constraints, plus starter code. \
Format the description in Markdown: use **bold** for section headers like **Examples** and **Constraints**, \
use `backticks` for inline values and variable names, and use code blocks for input/output examples. \
Do NOT generate solutions or test cases — only the problem statement and starter code. \
Always respond with valid JSON matching the requested schema exactly."""

TEST_TYPE_STARTER_INSTRUCTIONS = {
    "stdin_stdout": (
        "Test type: stdin/stdout.\n"
        "The starter code should read from stdin and print to stdout."
    ),
    "file_io": (
        "Test type: file I/O.\n"
        "The starter code should read from a file and write to a file."
    ),
    "function": (
        "Test type: function signature.\n"
        "The starter code should be a function signature with an empty body.\n"
        "For C: do NOT include main() in starter_code — only the function itself."
    ),
}


def build_problem_prompt(
    topic_name: str,
    topic_description: str | None,
    language: str,
    difficulty: str,
    num_problems: int,
    test_type: str,
    custom_instructions: str | None,
    existing_problems: list[dict] | None = None,
) -> str:
    parts = [
        f'Generate {num_problems} NEW and UNIQUE programming problem(s) about "{topic_name}".',
        f"IMPORTANT: The programming language is {language.upper()}. ALL starter_code MUST be written in {language.upper()} only.",
        (
            "\nCREATIVE PROBLEM MODELING (very important):\n"
            "The underlying algorithm for each problem can be similar or even identical, but you MUST "
            "get very creative with how the problem is framed and explained. Wrap the algorithmic "
            "concept in a vivid, unique real-world scenario or story.\n"
            "\n"
            "For example, a simple 'sum of even numbers from 1 to N' problem could be remodeled as:\n"
            "- A savings story: you receive money every day but only save on even-numbered days.\n"
            "- A workout tracker: only even days are heavy workouts, each day number = effort units.\n"
            "- A factory quality check: only even-numbered products get inspected.\n"
            "\n"
            "The student should NOT be able to tell that two problems use the same algorithm just by reading "
            "the descriptions. Use diverse domains: finance, sports, science, games, cooking, "
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
            "- Use a different creative story/scenario than any existing problem.\n"
            "- You MAY reuse the same underlying algorithm — that is encouraged.\n"
            "- Each new problem MUST have a unique, descriptive title reflecting its story.\n"
        )
    if topic_description:
        parts.append(f"Topic context: {topic_description}")
    parts.append(f"Difficulty: {difficulty}")
    parts.append("")
    parts.append(TEST_TYPE_STARTER_INSTRUCTIONS[test_type])
    if custom_instructions:
        parts.append(f"\nAdditional instructions from the professor:\n{custom_instructions}")
    parts.append(
        '\nRespond with a JSON object with this exact structure:\n'
        '{\n'
        '  "problems": [\n'
        '    {\n'
        '      "title": "string",\n'
        '      "description": "string (Markdown formatted, with **Examples** and **Constraints** sections, use `backticks` for inline code and code blocks for I/O examples)",\n'
        '      "starter_code": "string"\n'
        '    }\n'
        '  ]\n'
        '}'
    )
    return "\n".join(parts)


# ── Step 2: Solution generation (Mimo V2 Pro) ──

SOLUTION_SYSTEM_PROMPT = """\
You are an expert programmer. Given a programming problem, write a complete, correct, \
and efficient solution that compiles and runs without errors. \
The code must handle all edge cases described in the problem. \
Return ONLY valid JSON — no explanations, no markdown."""


def build_solution_prompt(
    title: str,
    description: str,
    starter_code: str | None,
    language: str,
    test_type: str,
) -> str:
    parts = [
        f"Write a complete working solution in {language.upper()} for this problem:",
        f"\nTitle: {title}",
        f"\nDescription:\n{description}",
    ]
    if starter_code:
        parts.append(f"\nStarter code:\n{starter_code}")

    if test_type == "stdin_stdout":
        parts.append(
            "\nThe solution MUST read from stdin and print to stdout."
            "\nIt must be a COMPLETE, SELF-CONTAINED program that can be run directly."
            "\nInclude all necessary imports/headers at the top."
            "\nMake sure input parsing matches the format described in the problem exactly."
        )
    elif test_type == "file_io":
        parts.append("\nThe solution must read from an input file and write to an output file.")
    elif test_type == "function":
        parts.append("\nThe solution must implement the function defined in the starter code.")
        parts.append("For C: do NOT include main() — only the function itself.")

    parts.append(
        '\nRespond with a JSON object:\n'
        '{\n'
        '  "solution_code": "string (complete working solution)"\n'
        '}'
    )
    return "\n".join(parts)


def build_fix_solution_prompt(
    title: str,
    description: str,
    starter_code: str | None,
    language: str,
    test_type: str,
    broken_code: str,
    error_samples: list[dict],
) -> str:
    """Build a prompt asking the model to fix a broken solution."""
    parts = [
        f"The following {language.upper()} solution has runtime errors. Fix it.",
        f"\nTitle: {title}",
        f"\nDescription:\n{description}",
        f"\nBroken solution:\n```{language}\n{broken_code}\n```",
        "\nErrors encountered when running with test inputs:",
    ]
    for sample in error_samples[:3]:
        parts.append(f"\n  Input: {sample['input']}")
        parts.append(f"  Error: {sample['error']}")

    if starter_code:
        parts.append(f"\nOriginal starter code:\n{starter_code}")

    if test_type == "stdin_stdout":
        parts.append(
            "\nThe fixed solution MUST read from stdin and print to stdout."
            "\nIt must be COMPLETE and SELF-CONTAINED with all imports/headers."
            "\nDouble-check that input parsing matches the problem's input format exactly."
        )
    elif test_type == "file_io":
        parts.append("\nThe fixed solution must read from an input file and write to an output file.")
    elif test_type == "function":
        parts.append("\nThe fixed solution must implement the function from the starter code.")

    parts.append(
        '\nRespond with a JSON object:\n'
        '{\n'
        '  "solution_code": "string (complete fixed solution)"\n'
        '}'
    )
    return "\n".join(parts)


# ── Step 3: Test input generation (Mimo V2 Pro) ──
# Only generates INPUTS. Expected outputs come from actually running the solution.

TEST_INPUT_SYSTEM_PROMPT = """\
You are an expert at designing test inputs for programming problems. Given a problem description, \
generate diverse test inputs that cover basic cases, edge cases, and larger inputs. \
Do NOT generate expected outputs — only inputs. \
Return ONLY valid JSON — no explanations, no markdown."""

TEST_TYPE_INPUT_INSTRUCTIONS = {
    "stdin_stdout": (
        "Test type: stdin/stdout.\n"
        "Each test input should be the exact stdin string the program will receive (use \\n for newlines).\n"
        "Return each as a plain string in the inputs array."
    ),
    "file_io": (
        "Test type: file I/O.\n"
        "Each test input should be the content of the input file.\n"
        "Return each as a plain string in the inputs array."
    ),
    "function": (
        "Test type: function call.\n"
        "Each test input should be a JSON string encoding the function arguments.\n"
        "Return each as a string in the inputs array."
    ),
}


def build_test_input_prompt(
    title: str,
    description: str,
    language: str,
    test_type: str,
    num_test_cases: int,
) -> str:
    parts = [
        f"Generate {num_test_cases} test input(s) for this {language.upper()} problem.",
        f"\nTitle: {title}",
        f"\nDescription:\n{description}",
        f"\n{TEST_TYPE_INPUT_INSTRUCTIONS[test_type]}",
        "\nInclude a mix of: basic/simple cases, edge cases (empty input, minimum values, boundary conditions), and a couple of larger inputs.",
        (
            '\nRespond with a JSON object:\n'
            '{\n'
            '  "inputs": ["string", "string", ...]\n'
            '}'
        ),
    ]
    return "\n".join(parts)
