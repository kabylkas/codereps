import asyncio
import json
import os
import tempfile
import time
from dataclasses import dataclass

from app.problems.models import TestCase

TIMEOUT_SECONDS = 5
SUPPORTED_LANGUAGES = {"python", "c"}


@dataclass
class TestResult:
    test_case_id: str
    passed: bool
    actual_output: str | None = None
    error_message: str | None = None
    execution_time_ms: int | None = None


async def run_code(code: str, language: str, test_cases: list[TestCase]) -> list[TestResult]:
    results = []
    for tc in test_cases:
        result = await _execute_single_test(code, language, tc)
        results.append(result)
    return results


async def _execute_single_test(code: str, language: str, tc: TestCase) -> TestResult:
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            if language == "python":
                return await _run_python(code, tc, tmpdir)
            elif language == "c":
                return await _run_c(code, tc, tmpdir)
            else:
                return TestResult(
                    test_case_id=tc.id,
                    passed=False,
                    error_message=f"Unsupported language: {language}",
                )
        except asyncio.TimeoutError:
            return TestResult(
                test_case_id=tc.id,
                passed=False,
                error_message=f"Time limit exceeded ({TIMEOUT_SECONDS}s)",
            )
        except Exception as e:
            return TestResult(
                test_case_id=tc.id,
                passed=False,
                error_message=str(e),
            )


async def _run_python(code: str, tc: TestCase, tmpdir: str) -> TestResult:
    if tc.test_type == "function":
        return await _run_function_test(code, tc, tmpdir, "python")

    code_path = os.path.join(tmpdir, "solution.py")
    with open(code_path, "w") as f:
        f.write(code)

    stdin_data, output_file = _prepare_test_input(tc, tmpdir)

    start = time.monotonic()
    proc = await asyncio.create_subprocess_exec(
        "python3", code_path,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=tmpdir,
    )
    stdout, stderr = await asyncio.wait_for(
        proc.communicate(input=stdin_data.encode() if stdin_data else None),
        timeout=TIMEOUT_SECONDS,
    )
    elapsed_ms = int((time.monotonic() - start) * 1000)

    if proc.returncode != 0:
        return TestResult(
            test_case_id=tc.id,
            passed=False,
            actual_output=stdout.decode(errors="replace").strip(),
            error_message=stderr.decode(errors="replace").strip(),
            execution_time_ms=elapsed_ms,
        )

    actual = _get_actual_output(tc, tmpdir, stdout)
    expected = tc.expected_output.strip()
    passed = actual == expected

    return TestResult(
        test_case_id=tc.id,
        passed=passed,
        actual_output=actual,
        error_message=None if passed else None,
        execution_time_ms=elapsed_ms,
    )


async def _run_c(code: str, tc: TestCase, tmpdir: str) -> TestResult:
    if tc.test_type == "function":
        return await _run_function_test(code, tc, tmpdir, "c")

    code_path = os.path.join(tmpdir, "solution.c")
    binary_path = os.path.join(tmpdir, "solution")
    with open(code_path, "w") as f:
        f.write(code)

    # Compile
    compile_proc = await asyncio.create_subprocess_exec(
        "gcc", code_path, "-o", binary_path, "-lm",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=tmpdir,
    )
    _, compile_err = await asyncio.wait_for(
        compile_proc.communicate(),
        timeout=TIMEOUT_SECONDS,
    )
    if compile_proc.returncode != 0:
        return TestResult(
            test_case_id=tc.id,
            passed=False,
            error_message=f"Compilation error:\n{compile_err.decode(errors='replace').strip()}",
        )

    stdin_data, output_file = _prepare_test_input(tc, tmpdir)

    start = time.monotonic()
    proc = await asyncio.create_subprocess_exec(
        binary_path,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=tmpdir,
    )
    stdout, stderr = await asyncio.wait_for(
        proc.communicate(input=stdin_data.encode() if stdin_data else None),
        timeout=TIMEOUT_SECONDS,
    )
    elapsed_ms = int((time.monotonic() - start) * 1000)

    if proc.returncode != 0:
        return TestResult(
            test_case_id=tc.id,
            passed=False,
            actual_output=stdout.decode(errors="replace").strip(),
            error_message=stderr.decode(errors="replace").strip(),
            execution_time_ms=elapsed_ms,
        )

    actual = _get_actual_output(tc, tmpdir, stdout)
    expected = tc.expected_output.strip()
    passed = actual == expected

    return TestResult(
        test_case_id=tc.id,
        passed=passed,
        actual_output=actual,
        execution_time_ms=elapsed_ms,
    )


async def _run_function_test(code: str, tc: TestCase, tmpdir: str, language: str) -> TestResult:
    meta = json.loads(tc.metadata_json) if tc.metadata_json else {}
    assertion_code = meta.get("assertion_code", "")
    if not assertion_code:
        return TestResult(
            test_case_id=tc.id,
            passed=False,
            error_message="No assertion_code in test case metadata",
        )

    if language == "python":
        test_code = f"{code}\n\n{assertion_code}\nprint('PASSED')"
        test_path = os.path.join(tmpdir, "test_solution.py")
        with open(test_path, "w") as f:
            f.write(test_code)

        start = time.monotonic()
        proc = await asyncio.create_subprocess_exec(
            "python3", test_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=tmpdir,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(),
            timeout=TIMEOUT_SECONDS,
        )
        elapsed_ms = int((time.monotonic() - start) * 1000)

        if proc.returncode != 0:
            return TestResult(
                test_case_id=tc.id,
                passed=False,
                actual_output=stdout.decode(errors="replace").strip(),
                error_message=stderr.decode(errors="replace").strip(),
                execution_time_ms=elapsed_ms,
            )

        return TestResult(
            test_case_id=tc.id,
            passed=True,
            actual_output="PASSED",
            execution_time_ms=elapsed_ms,
        )
    elif language == "c":
        # Student code goes into solution.c (treated as a library)
        solution_path = os.path.join(tmpdir, "solution.c")
        with open(solution_path, "w") as f:
            f.write(code)

        # Build a test_main.c that #includes the student code and runs assertions
        test_path = os.path.join(tmpdir, "test_main.c")
        binary_path = os.path.join(tmpdir, "test_solution")

        # Ensure assertion ends with semicolon
        assertion_stripped = assertion_code.strip().rstrip(";") + ";"

        if "int main" in assertion_code:
            # assertion_code already has main(), just include the student code
            test_code = f'#include "solution.c"\n\n{assertion_code}\n'
        else:
            # Wrap assertion_code in a main() that includes the student code
            test_code = (
                f'#include "solution.c"\n'
                f'#include <stdio.h>\n'
                f'#include <assert.h>\n\n'
                f'int main() {{\n'
                f'    {assertion_stripped}\n'
                f'    printf("PASSED\\n");\n'
                f'    return 0;\n'
                f'}}\n'
            )

        with open(test_path, "w") as f:
            f.write(test_code)

        # Compile test_main.c (which #includes solution.c)
        compile_proc = await asyncio.create_subprocess_exec(
            "gcc", test_path, "-o", binary_path, "-lm",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=tmpdir,
        )
        _, compile_err = await asyncio.wait_for(
            compile_proc.communicate(),
            timeout=TIMEOUT_SECONDS,
        )
        if compile_proc.returncode != 0:
            err_text = compile_err.decode(errors="replace").strip()
            # Clean up temp paths from error messages for readability
            err_text = err_text.replace(tmpdir + "/", "")
            return TestResult(
                test_case_id=tc.id,
                passed=False,
                error_message=f"Compilation error:\n{err_text}",
            )

        start = time.monotonic()
        proc = await asyncio.create_subprocess_exec(
            binary_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=tmpdir,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(),
            timeout=TIMEOUT_SECONDS,
        )
        elapsed_ms = int((time.monotonic() - start) * 1000)

        if proc.returncode != 0:
            return TestResult(
                test_case_id=tc.id,
                passed=False,
                actual_output=stdout.decode(errors="replace").strip(),
                error_message=stderr.decode(errors="replace").strip() or "Assertion failed",
                execution_time_ms=elapsed_ms,
            )

        return TestResult(
            test_case_id=tc.id,
            passed=True,
            actual_output="PASSED",
            execution_time_ms=elapsed_ms,
        )
    else:
        return TestResult(
            test_case_id=tc.id,
            passed=False,
            error_message=f"Function test type not supported for {language}",
        )


def _prepare_test_input(tc: TestCase, tmpdir: str) -> tuple[str | None, str | None]:
    """Returns (stdin_data, output_filename)."""
    if tc.test_type == "stdin_stdout":
        return tc.input_data, None
    elif tc.test_type == "file_io":
        meta = json.loads(tc.metadata_json) if tc.metadata_json else {}
        input_filename = meta.get("input_filename", "input.txt")
        output_filename = meta.get("output_filename", "output.txt")
        input_path = os.path.join(tmpdir, input_filename)
        with open(input_path, "w") as f:
            f.write(tc.input_data)
        return None, output_filename
    return None, None


def _get_actual_output(tc: TestCase, tmpdir: str, stdout: bytes) -> str:
    if tc.test_type == "file_io":
        meta = json.loads(tc.metadata_json) if tc.metadata_json else {}
        output_filename = meta.get("output_filename", "output.txt")
        output_path = os.path.join(tmpdir, output_filename)
        if os.path.exists(output_path):
            with open(output_path) as f:
                return f.read().strip()
        return ""
    return stdout.decode(errors="replace").strip()
