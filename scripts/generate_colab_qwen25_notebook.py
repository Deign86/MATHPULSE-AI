import json
from pathlib import Path
from textwrap import dedent


SYSTEM_PROMPT = """<|im_start|>system
You are DepEdMathTutor-Qwen, a specialized instructional math assistant for Philippine Senior High School Grades 11-12. You teach General Mathematics, Statistics & Probability, Business Mathematics, Precalculus, and practical quantitative problem solving per official DepEd curriculum.

MANDATORY BEHAVIOR:
- Solve ONLY using DepEd Gr 11-12 curriculum knowledge
- Provide CLEAR step-by-step solutions with explicit calculations
- Handle long contexts (module excerpts, tables, multi-problems)
- SELF-VERIFY every solution before final answer
- NEVER hallucinate formulas, values, or curriculum facts
- Use plain Tagalog-English student-friendly language

REQUIRED OUTPUT FORMAT:
Problem Restatement:
[brief exact restatement]

Given:
- [list all numerical values, units, variables]
- [list conditions, constraints]

Find:
[exact quantity/answer type needed]

Solution Steps:
1. [Step 1 with formula + substitution]
2. [Step 2 showing calculation]
3. [Step 3 with intermediate result]
...

Final Answer:
\\boxed{[numerical result or exact expression]}

Verification:
- [Quick reverse check or reasonableness test]
- [Units/dimensions correct ✓]
- [Arithmetic confirmed ✓]

LONG CONTEXT RULES:
- Reference specific table/paragraph numbers when used
- Ignore irrelevant context details
- Flag contradictions: "Note: Table A and Para 2 conflict on X value"

DEPED TOPICS COVERED:
General Math: functions, logs/exponentials, permutations/combinations, matrices
Business Math: simple/compound interest, annuities, depreciation, markup/discount
Statistics: mean/median/mode, variance, normal distribution, hypothesis testing
Precalculus: trigonometry, sequences/series, limits, analytic geometry

ERROR HANDLING:
- Missing info: "Cannot solve - need [exact missing value]"
- Ambiguous: "Assuming [interpretation] based on context"
- Impossible: "No solution exists because [reason]"
<|im_end|>"""


def md(cell_id: str, text: str) -> dict:
    return {
        "cell_type": "markdown",
        "id": cell_id,
        "metadata": {},
        "source": [text],
    }


def code(cell_id: str, text: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "id": cell_id,
        "metadata": {},
        "outputs": [],
        "source": [text],
    }


def build_cells() -> list[dict]:
    return [
        md(
            "title",
            "# Complete Kaggle QLoRA Training for DepEd Math Qwen2.5-7B-Instruct\n"
            "Compatible with Kaggle T4/P100 runtimes. This notebook expects train.jsonl in `/kaggle/input/deped-math-sft/`.\n",
        ),
        md("install_md", "## 1) Install Dependencies"),
        code(
            "install",
            dedent(
                """
                !pip install -q --upgrade pip
                !pip uninstall -y bigframes gcsfs s3fs || true
                !pip install -q "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
                !pip install -q trl==0.22.2 peft accelerate bitsandbytes xformers
                !pip install -q datasets huggingface_hub==0.34.4 transformers==4.57.3 fsspec==2025.9.0
                """
            ).strip()
            + "\n",
        ),
        md("imports_md", "## 2) Imports and Runtime Setup"),
        code(
            "imports",
            dedent(
                """
                import os
                os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
                os.environ.setdefault("ABSL_MIN_LOG_LEVEL", "3")

                import torch
                import unsloth
                from unsloth import FastLanguageModel
                from torch.utils.data import DataLoader
                from datasets import load_dataset
                from huggingface_hub import login
                from transformers import DataCollatorForLanguageModeling, get_linear_schedule_with_warmup

                print("CUDA available:", torch.cuda.is_available())
                if torch.cuda.is_available():
                    print("GPU:", torch.cuda.get_device_name(0))
                """
            ).strip()
            + "\n",
        ),
        md("config_md", "## 3) Config and Master Prompt"),
        code(
            "config",
            dedent(
                f"""
                HF_TOKEN = ''
                HF_USERNAME = "deignlazaro"
                DATASET_PATH = "/kaggle/input/deped-math-sft/train.jsonl"
                DATASET_REPO = "deignlazaro/deped-math-sft"
                BASE_MODEL = "Qwen/Qwen2.5-7B-Instruct"
                REPO_ID = f"{{HF_USERNAME}}/deped-math-qwen2.5-7b"

                max_seq_length = 4096
                dtype = None
                load_in_4bit = True

                SYSTEM_PROMPT = {json.dumps(SYSTEM_PROMPT)}

                token = HF_TOKEN.strip() or os.getenv("HF_TOKEN", "").strip()
                if token:
                    login(token=token, add_to_git_credential=False)
                    print("Hugging Face token configured.")
                else:
                    print("HF token not set. Hub upload may fail unless runtime secret is configured.")
                """
            ).strip()
            + "\n",
        ),
        md("dataset_md", "## 4) Load and Normalize JSONL Dataset"),
        code(
            "dataset",
            dedent(
                """
                import glob


                def messages_to_chatml(messages):
                    chunks = []
                    for msg in messages:
                        role = str(msg.get("role", "")).strip()
                        content = str(msg.get("content", "")).strip()

                        prefix = f"<|im_start|>{role}\\n"
                        suffix = "\\n<|im_end|>"
                        if content.startswith(prefix) and content.endswith(suffix):
                            content = content[len(prefix) : -len(suffix)].strip()

                        if role in {"system", "user", "assistant"} and content:
                            chunks.append(f"<|im_start|>{role}\\n{content}\\n<|im_end|>")
                    return "\\n".join(chunks)


                def row_to_text(row):
                    text = row.get("text")
                    if isinstance(text, str) and text.strip():
                        return {"text": text}

                    chatml = row.get("chatml")
                    if isinstance(chatml, str) and chatml.strip():
                        return {"text": chatml}

                    messages = row.get("messages")
                    if isinstance(messages, list):
                        rendered = messages_to_chatml(messages)
                        if rendered:
                            return {"text": rendered}

                    system = row.get("system")
                    user = row.get("user")
                    assistant = row.get("assistant")
                    if all(isinstance(v, str) and v.strip() for v in (system, user, assistant)):
                        rendered = messages_to_chatml(
                            [
                                {"role": "system", "content": system},
                                {"role": "user", "content": user},
                                {"role": "assistant", "content": assistant},
                            ]
                        )
                        return {"text": rendered}

                    raise ValueError("Each row must provide one of: text/chatml/messages or system+user+assistant.")


                def find_kaggle_train_file() -> str | None:
                    matches = sorted(glob.glob("/kaggle/input/**/train.jsonl", recursive=True))
                    if not matches:
                        return None
                    deped_matches = [path for path in matches if "deped" in path.lower()]
                    return deped_matches[0] if deped_matches else matches[0]


                resolved_local_path = DATASET_PATH if os.path.exists(DATASET_PATH) else find_kaggle_train_file()
                if resolved_local_path:
                    print(f"Using local dataset file: {resolved_local_path}")
                    dataset = load_dataset("json", data_files=resolved_local_path, split="train")
                elif DATASET_REPO:
                    print(f"Using Hub dataset repo: {DATASET_REPO}")
                    dataset = load_dataset(DATASET_REPO, split="train")
                elif "/" in DATASET_PATH and not DATASET_PATH.startswith("/"):
                    dataset = load_dataset(DATASET_PATH, split="train")
                else:
                    available_inputs = sorted(glob.glob("/kaggle/input/*")) if os.path.isdir("/kaggle/input") else []
                    raise FileNotFoundError(
                        "Dataset not found. Checked DATASET_PATH and /kaggle/input/**/train.jsonl. "
                        f"DATASET_PATH={DATASET_PATH}. Available /kaggle/input entries: {available_inputs}"
                    )

                dataset = dataset.map(row_to_text, remove_columns=dataset.column_names)
                print("Train rows:", len(dataset))
                print(dataset[0]["text"][:600])
                """
            ).strip()
            + "\n",
        ),
        md("train_md", "## 5) Load Model, Attach LoRA, and Train"),
        code(
            "train",
            dedent(
                """
                model, tokenizer = FastLanguageModel.from_pretrained(
                    model_name=BASE_MODEL,
                    max_seq_length=max_seq_length,
                    dtype=dtype,
                    load_in_4bit=load_in_4bit,
                )

                model = FastLanguageModel.get_peft_model(
                    model,
                    r=32,
                    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
                    lora_alpha=16,
                    lora_dropout=0.05,
                    bias="none",
                    use_gradient_checkpointing="unsloth",
                    random_state=3407,
                    use_rslora=False,
                    loftq_config=None,
                )

                if tokenizer.pad_token is None:
                    tokenizer.pad_token = tokenizer.eos_token

                def tokenize_batch(batch):
                    return tokenizer(batch["text"], truncation=True, max_length=max_seq_length)

                map_workers = 1 if len(dataset) < 2 else 2
                tokenized_dataset = dataset.map(
                    tokenize_batch,
                    batched=True,
                    remove_columns=dataset.column_names,
                    num_proc=map_workers,
                    desc="Tokenizing dataset",
                )

                data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)
                train_loader = DataLoader(
                    tokenized_dataset,
                    batch_size=1,
                    shuffle=True,
                    collate_fn=data_collator,
                    pin_memory=torch.cuda.is_available(),
                )

                max_steps = 60
                gradient_accumulation_steps = 8
                warmup_steps = 5
                learning_rate = 2e-4
                weight_decay = 0.01
                logging_steps = 1

                device = "cuda" if torch.cuda.is_available() else "cpu"
                model = model.to(device)
                model.train()

                trainable_params = [param for param in model.parameters() if param.requires_grad]
                optimizer = torch.optim.AdamW(trainable_params, lr=learning_rate, weight_decay=weight_decay)
                scheduler = get_linear_schedule_with_warmup(
                    optimizer,
                    num_warmup_steps=warmup_steps,
                    num_training_steps=max_steps,
                )

                optimizer.zero_grad(set_to_none=True)
                global_step = 0
                micro_step = 0
                loss_sum = 0.0

                while global_step < max_steps:
                    for batch in train_loader:
                        batch = {key: value.to(device) for key, value in batch.items()}
                        outputs = model(**batch)
                        loss = outputs.loss
                        if loss is None:
                            raise RuntimeError("Model forward returned no loss. Check labels in collator output.")

                        loss_sum += float(loss.detach().item())
                        (loss / gradient_accumulation_steps).backward()
                        micro_step += 1

                        if micro_step % gradient_accumulation_steps == 0:
                            torch.nn.utils.clip_grad_norm_(trainable_params, 1.0)
                            optimizer.step()
                            scheduler.step()
                            optimizer.zero_grad(set_to_none=True)
                            global_step += 1

                            if global_step % logging_steps == 0:
                                avg_loss = loss_sum / logging_steps
                                current_lr = scheduler.get_last_lr()[0]
                                print(f"step={global_step}/{max_steps} loss={avg_loss:.6f} lr={current_lr:.6e}")
                                loss_sum = 0.0

                            if global_step >= max_steps:
                                break

                    if len(train_loader) == 0:
                        raise RuntimeError("Tokenized dataset is empty; cannot train.")

                print({"global_step": global_step, "max_steps": max_steps})
                """
            ).strip()
            + "\n",
        ),
        md("save_md", "## 6) Save LoRA and Merged Weights"),
        code(
            "save",
            dedent(
                """
                model.save_pretrained("deped-math-lora")
                model.save_pretrained_merged("deped-math-7b-merged", tokenizer, save_method="merged_16bit")
                tokenizer.save_pretrained("deped-math-7b-merged")
                print("Saved: deped-math-lora and deped-math-7b-merged")
                """
            ).strip()
            + "\n",
        ),
        md("eval_md", "## 7) Quick Evaluation Smoke Test"),
        code(
            "eval",
            dedent(
                """
                model.eval()
                test_prompt = f'''{SYSTEM_PROMPT}
                <|im_start|>user
                Grade 12 Statistics: Mean of test scores 85, SD 12. What % score above 97? Use z-table approx.
                <|im_end|>
                <|im_start|>assistant
                '''
                device = "cuda" if torch.cuda.is_available() else "cpu"
                inputs = tokenizer(test_prompt, return_tensors="pt").to(device)
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=512,
                    use_cache=True,
                    temperature=0.1,
                    do_sample=False,
                )
                print(tokenizer.batch_decode(outputs, skip_special_tokens=False)[0])
                """
            ).strip()
            + "\n",
        ),
    ]


def write_notebook(notebook: dict, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(notebook, ensure_ascii=True, indent=2), encoding="utf-8")
    print(f"Wrote {output_path} with {len(notebook['cells'])} cells")


def main() -> None:
    notebook = {
        "cells": build_cells(),
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }

    outputs = [
        Path("training/deped_qwen25_pack/deped-math-qlora-training.ipynb"),
        Path("colab_qwen25_deped_lora.ipynb"),
        Path("qwen25_deped_lora_colab.ipynb"),
    ]
    for output_path in outputs:
        write_notebook(notebook, output_path)


if __name__ == "__main__":
    main()
