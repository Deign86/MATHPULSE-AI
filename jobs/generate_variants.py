import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from backend.services.inference_client import InferenceClient, InferenceRequest
from backend.services.logging_utils import log_job_metric
from jobs.utils import build_common_parser, generate_run_id, get_logger, load_jsonl, utc_now_iso

LOGGER = get_logger("mathpulse.jobs.generate_variants")


def parse_args() -> argparse.Namespace:
    parser = build_common_parser("Generate new problem variants for Grade 11-12 sets")
    parser.add_argument(
        "--dataset",
        default="datasets/eval/grade11_12/problem_bank.jsonl",
        help="Base question dataset in JSONL format",
    )
    parser.add_argument(
        "--output-jsonl",
        default="datasets/synthetic/variants/generated_variants.jsonl",
        help="Path to generated variant JSONL",
    )
    parser.add_argument(
        "--variants-per-item",
        type=int,
        default=3,
        help="How many variants to generate per source question",
    )
    return parser.parse_args()


def build_variant_prompt(question: str, variant_count: int) -> str:
    return (
        "Generate mathematically valid variants of this Grade 11-12 question. "
        f"Create exactly {variant_count} variants with mixed difficulty. "
        "Return JSON as: {\"variants\":[{\"question\":\"...\",\"difficulty\":\"easy|medium|hard\"}]}.\n\n"
        f"Original question: {question}"
    )


def parse_variants(text: str) -> List[Dict[str, Any]]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return []
    try:
        payload = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return []
    variants = payload.get("variants", [])
    if not isinstance(variants, list):
        return []
    cleaned: List[Dict[str, Any]] = []
    for v in variants:
        if not isinstance(v, dict):
            continue
        q = str(v.get("question", "")).strip()
        d = str(v.get("difficulty", "medium")).strip().lower()
        if q:
            cleaned.append({"question": q, "difficulty": d})
    return cleaned


def main() -> None:
    args = parse_args()
    run_id = generate_run_id("variants")

    dataset_rows = load_jsonl(Path(args.dataset))
    if args.subset != "all":
        dataset_rows = [row for row in dataset_rows if str(row.get("subset", "all")) == args.subset]
    dataset_rows = dataset_rows[: args.limit]

    client = InferenceClient()
    output_path = Path(args.output_jsonl if args.output == "" else args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    total_variants = 0
    with output_path.open("w", encoding="utf-8") as fh:
        for row in dataset_rows:
            question = str(row.get("question", "")).strip()
            if not question:
                continue
            raw = client.generate_from_messages(
                InferenceRequest(
                    messages=[
                        {"role": "system", "content": "You generate robust Grade 11-12 math problem variants in JSON."},
                        {"role": "user", "content": build_variant_prompt(question, args.variants_per_item)},
                    ],
                    model=args.model,
                    task_type="variant_generation",
                    request_tag=run_id,
                )
            )
            variants = parse_variants(raw)
            for index, variant in enumerate(variants):
                out = {
                    "run_id": run_id,
                    "timestamp": utc_now_iso(),
                    "source_question_id": row.get("question_id", ""),
                    "subset": row.get("subset", "all"),
                    "variant_index": index,
                    "question": variant["question"],
                    "difficulty": variant["difficulty"],
                    "model": args.model,
                    "synthetic": True,
                }
                fh.write(json.dumps(out, ensure_ascii=True) + "\n")
                total_variants += 1

    log_job_metric(
        LOGGER,
        job_name="generate_variants",
        run_id=run_id,
        metric_name="summary",
        metric_value={
            "source_items": len(dataset_rows),
            "generated_variants": total_variants,
            "output": str(output_path),
        },
    )


if __name__ == "__main__":
    main()
