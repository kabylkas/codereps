"""Sandboxed code runner for student submissions.

Each test executes inside an ephemeral Docker container with:
  --network none           no outbound network
  --read-only              root fs is read-only
  --tmpfs /work:exec       writable tmpfs scoped to the container
  --memory 256m            hard memory limit
  --cpus 1                 single core
  --pids-limit 64          fork-bomb protection
  --user 65534:65534       nobody:nogroup
  -v <host_tmpdir>:/src    student source mounted RO (or RW for file_io)
  --rm                     auto-clean on exit

We invoke `docker run --name codereps-<uuid>` so a timeout can issue
`docker kill` and reap the container deterministically.
"""
import asyncio
import json
import os
import tempfile
import time
import uuid
from dataclasses import dataclass

from app.problems.models import TestCase

TIMEOUT_SECONDS = 5
MAX_OUTPUT_BYTES = 64 * 1024
RUNNER_IMAGE = "codereps-runner"
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
    if language not in SUPPORTED_LANGUAGES:
        return TestResult(
            test_case_id=tc.id,
            passed=False,
            error_message=f"Unsupported language: {language}",
        )
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            if language == "python":
                return await _run_python(code, tc, tmpdir)
            return await _run_c(code, tc, tmpdir)
        except Exception as e:
            return TestResult(
                test_case_id=tc.id,
                passed=False,
                error_message=f"Runner error: {e}",
            )


# ── Python ──────────────────────────────────────────────────────────

async def _run_python(code: str, tc: TestCase, tmpdir: str) -> TestResult:
    if tc.test_type == "function":
        return await _run_python_function(code, tc, tmpdir)

    code_path = os.path.join(tmpdir, "solution.py")
    with open(code_path, "w") as f:
        f.write(code)

    stdin_data, output_filename = _prepare_test_input(tc, tmpdir)
    rw_for_output = output_filename is not None

    docker_args = _docker_run_args(tmpdir, rw=rw_for_output) + [
        RUNNER_IMAGE, "python3", "/work/solution.py",
    ]
    return await _exec_and_grade(docker_args, stdin_data, tc, tmpdir, output_filename)


async def _run_python_function(code: str, tc: TestCase, tmpdir: str) -> TestResult:
    meta = json.loads(tc.metadata_json) if tc.metadata_json else {}
    assertion_code = meta.get("assertion_code", "")
    if not assertion_code:
        return TestResult(
            test_case_id=tc.id,
            passed=False,
            error_message="No assertion_code in test case metadata",
        )

    test_path = os.path.join(tmpdir, "test_solution.py")
    with open(test_path, "w") as f:
        f.write(f"{code}\n\n{assertion_code}\nprint('PASSED')")

    docker_args = _docker_run_args(tmpdir, rw=False) + [
        RUNNER_IMAGE, "python3", "/work/test_solution.py",
    ]
    return await _exec_and_grade(
        docker_args, stdin_data=None, tc=tc, tmpdir=tmpdir,
        output_filename=None, function_test=True,
    )


# ── C ────────────────────────────────────────────────────────────────

async def _run_c(code: str, tc: TestCase, tmpdir: str) -> TestResult:
    if tc.test_type == "function":
        return await _run_c_function(code, tc, tmpdir)

    code_path = os.path.join(tmpdir, "solution.c")
    with open(code_path, "w") as f:
        f.write(code)

    compile_result = await _compile_c(tmpdir, "solution.c", "solution")
    if compile_result is not None:
        return TestResult(test_case_id=tc.id, passed=False, error_message=compile_result)

    stdin_data, output_filename = _prepare_test_input(tc, tmpdir)
    rw_for_output = output_filename is not None

    docker_args = _docker_run_args(tmpdir, rw=rw_for_output) + [
        RUNNER_IMAGE, "/work/solution",
    ]
    return await _exec_and_grade(docker_args, stdin_data, tc, tmpdir, output_filename)


async def _run_c_function(code: str, tc: TestCase, tmpdir: str) -> TestResult:
    meta = json.loads(tc.metadata_json) if tc.metadata_json else {}
    assertion_code = meta.get("assertion_code", "")
    if not assertion_code:
        return TestResult(
            test_case_id=tc.id,
            passed=False,
            error_message="No assertion_code in test case metadata",
        )

    solution_path = os.path.join(tmpdir, "solution.c")
    with open(solution_path, "w") as f:
        f.write(code)

    if "int main" in assertion_code:
        test_code = f'#include "solution.c"\n\n{assertion_code}\n'
    else:
        assertion_stripped = assertion_code.strip().rstrip(";") + ";"
        test_code = (
            '#include "solution.c"\n'
            '#include <stdio.h>\n'
            '#include <assert.h>\n\n'
            'int main() {\n'
            f'    {assertion_stripped}\n'
            '    printf("PASSED\\n");\n'
            '    return 0;\n'
            '}\n'
        )
    with open(os.path.join(tmpdir, "test_main.c"), "w") as f:
        f.write(test_code)

    compile_result = await _compile_c(tmpdir, "test_main.c", "test_solution")
    if compile_result is not None:
        # Strip the host tmpdir from any GCC output for readability
        return TestResult(test_case_id=tc.id, passed=False, error_message=compile_result)

    docker_args = _docker_run_args(tmpdir, rw=False) + [
        RUNNER_IMAGE, "/work/test_solution",
    ]
    return await _exec_and_grade(
        docker_args, stdin_data=None, tc=tc, tmpdir=tmpdir,
        output_filename=None, function_test=True,
    )


async def _compile_c(tmpdir: str, src_filename: str, out_filename: str) -> str | None:
    """Compile inside the runner image. Returns error string on failure, else None."""
    docker_args = _docker_run_args(tmpdir, rw=True) + [
        RUNNER_IMAGE, "gcc", f"/work/{src_filename}", "-o", f"/work/{out_filename}", "-lm",
    ]
    proc, container_name = await _spawn(docker_args)
    try:
        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                _read_capped(proc), timeout=TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            await _kill_container(container_name)
            await proc.wait()
            return "Compilation timed out"
        await proc.wait()
        if proc.returncode != 0:
            return f"Compilation error:\n{stderr_bytes.decode(errors='replace').strip()}"
        return None
    finally:
        # Container is auto-removed via --rm; also kill if it somehow lingers.
        if proc.returncode is None:
            await _kill_container(container_name)


# ── Docker invocation helpers ───────────────────────────────────────

def _docker_run_args(tmpdir: str, rw: bool) -> list[str]:
    container_name = f"codereps-{uuid.uuid4().hex[:12]}"
    mount_mode = "rw" if rw else "ro"
    return [
        "docker", "run", "--rm", "-i",
        "--name", container_name,
        "--network", "none",
        "--read-only",
        "--tmpfs", "/tmp:exec,size=64m",
        "--memory", "256m",
        "--cpus", "1",
        "--pids-limit", "64",
        "--user", "65534:65534",
        "-v", f"{tmpdir}:/work:{mount_mode}",
        "-w", "/work",
    ]


async def _spawn(docker_args: list[str]) -> tuple[asyncio.subprocess.Process, str]:
    # Find --name flag to capture container name for kill-on-timeout
    name_idx = docker_args.index("--name") + 1
    container_name = docker_args[name_idx]
    proc = await asyncio.create_subprocess_exec(
        *docker_args,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    return proc, container_name


async def _read_capped(proc: asyncio.subprocess.Process, stdin_data: bytes | None = None) -> tuple[bytes, bytes]:
    """Send stdin (if any) and read stdout/stderr capped at MAX_OUTPUT_BYTES."""
    async def _drain(stream) -> bytes:
        if stream is None:
            return b""
        return await stream.read(MAX_OUTPUT_BYTES + 1)

    async def _write_stdin():
        if stdin_data is not None and proc.stdin is not None:
            try:
                proc.stdin.write(stdin_data)
                await proc.stdin.drain()
            except (BrokenPipeError, ConnectionResetError):
                pass
        if proc.stdin is not None:
            try:
                proc.stdin.close()
            except Exception:
                pass

    stdout_task = asyncio.create_task(_drain(proc.stdout))
    stderr_task = asyncio.create_task(_drain(proc.stderr))
    stdin_task = asyncio.create_task(_write_stdin())
    stdout_bytes, stderr_bytes, _ = await asyncio.gather(stdout_task, stderr_task, stdin_task)
    if len(stdout_bytes) > MAX_OUTPUT_BYTES:
        stdout_bytes = stdout_bytes[:MAX_OUTPUT_BYTES] + b"\n[truncated]"
    if len(stderr_bytes) > MAX_OUTPUT_BYTES:
        stderr_bytes = stderr_bytes[:MAX_OUTPUT_BYTES] + b"\n[truncated]"
    return stdout_bytes, stderr_bytes


async def _kill_container(name: str) -> None:
    try:
        kill = await asyncio.create_subprocess_exec(
            "docker", "kill", name,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(kill.wait(), timeout=3)
    except Exception:
        pass


async def _exec_and_grade(
    docker_args: list[str],
    stdin_data: str | None,
    tc: TestCase,
    tmpdir: str,
    output_filename: str | None,
    function_test: bool = False,
) -> TestResult:
    proc, container_name = await _spawn(docker_args)
    start = time.monotonic()
    try:
        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                _read_capped(proc, stdin_data.encode() if stdin_data else None),
                timeout=TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            await _kill_container(container_name)
            await proc.wait()
            return TestResult(
                test_case_id=tc.id,
                passed=False,
                error_message=f"Time limit exceeded ({TIMEOUT_SECONDS}s)",
            )
        await proc.wait()
        elapsed_ms = int((time.monotonic() - start) * 1000)

        if proc.returncode != 0:
            return TestResult(
                test_case_id=tc.id,
                passed=False,
                actual_output=stdout_bytes.decode(errors="replace").strip(),
                error_message=stderr_bytes.decode(errors="replace").strip() or "Process exited non-zero",
                execution_time_ms=elapsed_ms,
            )

        if function_test:
            return TestResult(
                test_case_id=tc.id,
                passed=True,
                actual_output="PASSED",
                execution_time_ms=elapsed_ms,
            )

        actual = _get_actual_output(tc, tmpdir, stdout_bytes, output_filename)
        expected = tc.expected_output.strip()
        return TestResult(
            test_case_id=tc.id,
            passed=actual == expected,
            actual_output=actual,
            execution_time_ms=elapsed_ms,
        )
    finally:
        # If we got here without proc.wait() completing for any reason, ensure cleanup.
        if proc.returncode is None:
            await _kill_container(container_name)


def _prepare_test_input(tc: TestCase, tmpdir: str) -> tuple[str | None, str | None]:
    """Returns (stdin_data, output_filename)."""
    if tc.test_type == "stdin_stdout":
        return tc.input_data, None
    if tc.test_type == "file_io":
        meta = json.loads(tc.metadata_json) if tc.metadata_json else {}
        input_filename = meta.get("input_filename", "input.txt")
        output_filename = meta.get("output_filename", "output.txt")
        with open(os.path.join(tmpdir, input_filename), "w") as f:
            f.write(tc.input_data)
        return None, output_filename
    return None, None


def _get_actual_output(tc: TestCase, tmpdir: str, stdout: bytes, output_filename: str | None) -> str:
    if tc.test_type == "file_io" and output_filename:
        output_path = os.path.join(tmpdir, output_filename)
        if os.path.exists(output_path):
            with open(output_path) as f:
                return f.read().strip()
        return ""
    return stdout.decode(errors="replace").strip()
