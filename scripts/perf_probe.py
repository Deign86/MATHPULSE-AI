import json
import statistics
import subprocess
import sys
import time
import urllib.request


def sample_url(url: str, n: int = 10):
    samples = []
    for _ in range(n):
        t0 = time.perf_counter()
        with urllib.request.urlopen(url):
            pass
        samples.append((time.perf_counter() - t0) * 1000)
    samples_sorted = sorted(samples)
    p95_index = max(0, int(0.95 * n) - 1)
    return {
        "avg_ms": round(statistics.mean(samples), 2),
        "p95_ms": round(samples_sorted[p95_index], 2),
        "min_ms": round(samples_sorted[0], 2),
        "max_ms": round(samples_sorted[-1], 2),
    }


def main():
    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8091",
        ],
        cwd="backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    try:
        ready = False
        for _ in range(40):
            if proc.poll() is not None:
                output = proc.stdout.read() if proc.stdout else ""
                raise RuntimeError(f"Backend exited during startup. Output:\n{output}")
            try:
                with urllib.request.urlopen("http://127.0.0.1:8091/health"):
                    ready = True
                    break
            except Exception:
                time.sleep(0.25)

        if not ready:
            output = proc.stdout.read() if proc.stdout else ""
            raise RuntimeError(f"Backend did not become ready. Output:\n{output}")

        urls = {
            "health": "http://127.0.0.1:8091/health",
            "root": "http://127.0.0.1:8091/",
            "quiz_topics": "http://127.0.0.1:8091/api/quiz/topics",
        }
        result = {name: sample_url(url) for name, url in urls.items()}
        print(json.dumps(result))
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
