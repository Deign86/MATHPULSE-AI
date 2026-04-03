import argparse
from pathlib import Path


PROMPT = """
Generate 100 DepEd Gr 11-12 math problems in JSONL format. Mix topics:
30% General Math (functions, logs, matrices)
25% Business Math (interest, annuities, depreciation)
25% Statistics (descriptive, probability, hypothesis testing)
20% Precalculus (trig, sequences, analytic geometry)

Each example MUST follow exact format:
{"messages":[{"role":"system","content":"[FULL SYSTEM PROMPT]"},{"role":"user","content":"[REALISTIC PROBLEM]"},{"role":"assistant","content":"[CORRECT FORMATTED SOLUTION]"}]}

PROBLEM TYPES:
- Word problems with Philippine context (peso amounts, local businesses)
- Long-context (table data, module excerpts, multi-part)
- MCQs with explanation before choice
- "Fix this wrong solution" correction tasks
- Insufficient info refusal cases

SOLUTION REQUIREMENTS:
- Exact step format from system prompt
- All calculations shown (no skipping)
- Proper boxing of final answer
- Meaningful verification step
""".strip()


def load_system_prompt(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Missing system prompt file: {path}")
    return path.read_text(encoding="utf-8").strip()


def build_generator_prompt(system_prompt: str) -> str:
    return PROMPT.replace("[FULL SYSTEM PROMPT]", system_prompt)


def main() -> None:
    parser = argparse.ArgumentParser(description="Print synthetic data generation prompt for DepEd QLoRA dataset creation.")
    parser.add_argument("--system-prompt", default="training/deped_qwen25_pack/system_prompt.txt")
    parser.add_argument("--out", help="Optional file to write the final prompt.")
    args = parser.parse_args()

    system_prompt = load_system_prompt(Path(args.system_prompt))
    final_prompt = build_generator_prompt(system_prompt)

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(final_prompt + "\n", encoding="utf-8")
        print(f"Wrote prompt to {out_path}")
    else:
        print(final_prompt)


if __name__ == "__main__":
    main()
