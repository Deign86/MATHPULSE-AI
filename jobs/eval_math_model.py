import argparse
from pathlib import Path
from typing import Any, Dict, List

from backend.services.inference_client import InferenceClient, InferenceRequest
from backend.services.logging_utils import log_job_metric
from jobs.utils import (
    build_common_parser,
    generate_run_id,
    get_logger,
    load_jsonl,
    utc_now_iso,
    write_csv,
)

LOGGER = get_logger("mathpulse.jobs.eval")


def parse_args() -> argparse.Namespace:
    parser = build_common_parser("Evaluate math model on Grade 11-12 problem bank")
    parser.add_argument(
        "--dataset",
        default="datasets/eval/grade11_12/problem_bank.jsonl",
        help="Path to evaluation dataset in JSONL format",
    )
    parser.add_argument(
        "--metrics-csv",
        default="jobs/output/eval_metrics.csv",
        help="CSV output path for per-item metrics",
    )
    return parser.parse_args()


def score_step_correctness(reference: str, generated: str) -> float:
    if not reference:
        return 0.0
    overlap = len(set(reference.lower().split()) & set(generated.lower().split()))
    denom = max(1, len(set(reference.lower().split())))
    return min(1.0, overlap / denom)


def score_solution_completeness(generated: str) -> float:
    required_markers = ["step", "final answer"]
    hit = sum(1 for marker in required_markers if marker in generated.lower())
    return hit / len(required_markers)


def score_accuracy(expected_answer: str, generated: str) -> float:
    return 1.0 if expected_answer.lower() in generated.lower() else 0.0


def main() -> None:
    args = parse_args()
    run_id = generate_run_id("eval")

    dataset_path = Path(args.dataset)
    rows = load_jsonl(dataset_path)
    if args.subset != "all":
        rows = [row for row in rows if str(row.get("subset", "all")) == args.subset]
    rows = rows[: args.limit]

    client = InferenceClient()
    metrics_rows: List[Dict[str, Any]] = []

    for item in rows:
        question = str(item.get("question", "")).strip()
        expected = str(item.get("expected_answer", "")).strip()
        reference_steps = str(item.get("reference_steps", "")).strip()
        if not question:
            continue

        response = client.generate_from_messages(
            InferenceRequest(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a Grade 11-12 math tutor. Explain clearly and end with Final answer.",
                    },
                    {"role": "user", "content": question},
                ],
                model=args.model,
            )
        )

        metrics_rows.append(
            {
                "run_id": run_id,
                "timestamp": utc_now_iso(),
                "subset": item.get("subset", "all"),
                "question_id": item.get("question_id", ""),
                "accuracy": score_accuracy(expected, response),
                "step_correctness": score_step_correctness(reference_steps, response),
                "solution_completeness": score_solution_completeness(response),
                "model": args.model,
            }
        )

    output_path = Path(args.metrics_csv if args.output == "" else args.output)
    write_csv(
        output_path,
        metrics_rows,
        [
            "run_id",
            "timestamp",
            "subset",
            "question_id",
            "accuracy",
            "step_correctness",
            "solution_completeness",
            "model",
        ],
    )

    if metrics_rows:
        accuracy_avg = sum(float(r["accuracy"]) for r in metrics_rows) / len(metrics_rows)
        steps_avg = sum(float(r["step_correctness"]) for r in metrics_rows) / len(metrics_rows)
        completeness_avg = sum(float(r["solution_completeness"]) for r in metrics_rows) / len(metrics_rows)
    else:
        accuracy_avg = 0.0
        steps_avg = 0.0
        completeness_avg = 0.0

    log_job_metric(
        LOGGER,
        job_name="eval_math_model",
        run_id=run_id,
        metric_name="summary",
        metric_value={
            "rows": len(metrics_rows),
            "accuracy": round(accuracy_avg, 4),
            "step_correctness": round(steps_avg, 4),
            "solution_completeness": round(completeness_avg, 4),
            "output": str(output_path),
        },
    )


if __name__ == "__main__":
    main()
