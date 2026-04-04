import json
import math
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
            "Production profile is enabled by default and supports Kaggle T4/P100 runtimes.\n"
            "This notebook expects train.jsonl in `/kaggle/input/deped-math-sft/`.\n",
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
                import math
                import re
                os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
                os.environ.setdefault("ABSL_MIN_LOG_LEVEL", "3")

                import torch
                import unsloth
                from unsloth import FastLanguageModel
                from pathlib import Path
                from peft import PeftModel
                from torch.utils.data import DataLoader
                from datasets import load_dataset
                from huggingface_hub import login
                from transformers import DataCollatorForLanguageModeling, get_linear_schedule_with_warmup

                if torch.cuda.is_available():
                    torch.backends.cuda.matmul.allow_tf32 = True
                    torch.backends.cudnn.allow_tf32 = True

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
                TRAIN_PROFILE = os.getenv("TRAIN_PROFILE", "production").strip().lower()
                TARGET_TOTAL_STEPS = int(os.getenv("TARGET_TOTAL_STEPS", "600"))

                if TRAIN_PROFILE not in {"production", "smoke"}:
                    raise ValueError("Unsupported TRAIN_PROFILE=" + TRAIN_PROFILE + ". Use 'production' or 'smoke'.")

                max_seq_length = int(os.getenv("MAX_SEQ_LENGTH", "4096"))
                dtype = None
                load_in_4bit = True

                SYSTEM_PROMPT = {json.dumps(SYSTEM_PROMPT)}

                print("Training profile:", TRAIN_PROFILE)
                print("Max sequence length:", max_seq_length)
                print("Target total steps:", TARGET_TOTAL_STEPS)

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
                if len(dataset) > 0:
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

                def find_latest_step_checkpoint():
                    checkpoint_roots = [Path("checkpoints"), Path("/kaggle/working/checkpoints")]
                    if Path("/kaggle/input").exists():
                        checkpoint_roots.extend(Path("/kaggle/input").glob("*/checkpoints"))

                    best_checkpoint = None
                    best_step = 0
                    adapter_artifacts_found = False
                    step_pattern = re.compile(r"(?:step|checkpoint)-(\\d+)$")

                    for root in checkpoint_roots:
                        if not root.exists() or not root.is_dir():
                            continue

                        if list(root.glob("**/adapter_model.safetensors")) or list(root.glob("**/adapter_model.bin")):
                            adapter_artifacts_found = True

                        for candidate in root.iterdir():
                            if not candidate.is_dir():
                                continue
                            matched = step_pattern.search(candidate.name)
                            if not matched:
                                continue
                            step_value = int(matched.group(1))
                            if step_value > best_step:
                                best_step = step_value
                                best_checkpoint = candidate

                    return best_checkpoint, best_step, adapter_artifacts_found


                resume_checkpoint_path, resume_step, adapter_only_found = find_latest_step_checkpoint()

                if resume_checkpoint_path is not None:
                    print(f"Resuming LoRA adapters from {resume_checkpoint_path} (step={resume_step})")
                    model = PeftModel.from_pretrained(model, str(resume_checkpoint_path), is_trainable=True)
                    print("Optimizer and scheduler states are reinitialized; LR schedule will continue from resumed step.")
                else:
                    if adapter_only_found:
                        print("WARNING: Adapter artifacts were found but no step-* checkpoint folder was detected.")
                        print("WARNING: Full step resume is not possible. Starting from step 0.")
                    else:
                        print("No prior checkpoint detected. Starting from step 0.")

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

                if len(dataset) == 0:
                    raise RuntimeError("Dataset is empty; add training rows before launching production training.")

                val_text_dataset = None
                if len(dataset) >= 40:
                    val_ratio = min(0.1, max(10 / len(dataset), 0.05))
                    split_dataset = dataset.train_test_split(test_size=val_ratio, seed=3407, shuffle=True)
                    train_text_dataset = split_dataset["train"]
                    val_text_dataset = split_dataset["test"]
                    print(f"Split dataset -> train={len(train_text_dataset)} val={len(val_text_dataset)}")
                else:
                    train_text_dataset = dataset
                    print("Dataset too small for split. Validation is disabled for this run.")

                def tokenize_batch(batch):
                    return tokenizer(batch["text"], truncation=True, max_length=max_seq_length)

                map_workers = 1 if len(train_text_dataset) < 200 else 2
                tokenized_train_dataset = train_text_dataset.map(
                    tokenize_batch,
                    batched=True,
                    remove_columns=train_text_dataset.column_names,
                    num_proc=map_workers,
                    desc="Tokenizing train dataset",
                )

                tokenized_val_dataset = None
                if val_text_dataset is not None and len(val_text_dataset) > 0:
                    tokenized_val_dataset = val_text_dataset.map(
                        tokenize_batch,
                        batched=True,
                        remove_columns=val_text_dataset.column_names,
                        num_proc=1,
                        desc="Tokenizing validation dataset",
                    )

                data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)
                train_loader = DataLoader(
                    tokenized_train_dataset,
                    batch_size=1,
                    shuffle=True,
                    collate_fn=data_collator,
                    pin_memory=torch.cuda.is_available(),
                )

                val_loader = None
                if tokenized_val_dataset is not None:
                    val_loader = DataLoader(
                        tokenized_val_dataset,
                        batch_size=1,
                        shuffle=False,
                        collate_fn=data_collator,
                        pin_memory=torch.cuda.is_available(),
                    )

                if TRAIN_PROFILE == "production":
                    default_max_steps = max(600, TARGET_TOTAL_STEPS)
                    default_grad_accum = 16
                    default_learning_rate = 1.5e-4
                    default_weight_decay = 0.01
                    default_logging_steps = 10
                    default_eval_interval_steps = 50
                    default_save_interval_steps = 100
                    default_target_epochs = 3
                    default_max_eval_batches = 16
                else:
                    default_max_steps = 60
                    default_grad_accum = 8
                    default_learning_rate = 2e-4
                    default_weight_decay = 0.01
                    default_logging_steps = 1
                    default_eval_interval_steps = 20
                    default_save_interval_steps = 0
                    default_target_epochs = 1
                    default_max_eval_batches = 4

                gradient_accumulation_steps = max(
                    1,
                    int(os.getenv("GRADIENT_ACCUMULATION_STEPS", str(default_grad_accum))),
                )
                target_epochs = max(1, int(os.getenv("TARGET_EPOCHS", str(default_target_epochs))))
                steps_per_epoch = max(1, math.ceil(len(train_loader) / gradient_accumulation_steps))
                computed_steps = max(default_max_steps, steps_per_epoch * target_epochs)
                max_steps = max(1, int(os.getenv("MAX_STEPS", str(computed_steps))))

                resumed_global_step = int(resume_step) if resume_checkpoint_path is not None else 0
                if resumed_global_step > max_steps:
                    max_steps = resumed_global_step
                if resumed_global_step == max_steps:
                    print(f"Checkpoint already reached target max_steps={max_steps}. Training loop will be skipped.")

                warmup_default = max(10 if TRAIN_PROFILE == "production" else 5, int(max_steps * 0.05))
                warmup_steps = int(os.getenv("WARMUP_STEPS", str(warmup_default)))
                if max_steps > 1:
                    warmup_steps = max(0, min(warmup_steps, max_steps - 1))
                else:
                    warmup_steps = 0

                learning_rate = float(os.getenv("LEARNING_RATE", str(default_learning_rate)))
                weight_decay = float(os.getenv("WEIGHT_DECAY", str(default_weight_decay)))
                logging_steps = max(1, int(os.getenv("LOGGING_STEPS", str(default_logging_steps))))
                eval_interval_steps = max(1, int(os.getenv("EVAL_INTERVAL_STEPS", str(default_eval_interval_steps))))
                save_interval_steps = max(0, int(os.getenv("SAVE_INTERVAL_STEPS", str(default_save_interval_steps))))
                max_eval_batches = max(1, int(os.getenv("MAX_EVAL_BATCHES", str(default_max_eval_batches))))

                print(
                    {
                        "profile": TRAIN_PROFILE,
                        "train_rows": len(tokenized_train_dataset),
                        "val_rows": len(tokenized_val_dataset) if tokenized_val_dataset is not None else 0,
                        "steps_per_epoch": steps_per_epoch,
                        "max_steps": max_steps,
                        "resume_step": resumed_global_step,
                        "grad_accum": gradient_accumulation_steps,
                        "warmup_steps": warmup_steps,
                        "learning_rate": learning_rate,
                        "weight_decay": weight_decay,
                        "eval_interval_steps": eval_interval_steps,
                        "save_interval_steps": save_interval_steps,
                    }
                )

                device = "cuda" if torch.cuda.is_available() else "cpu"
                model = model.to(device)
                model.train()

                trainable_params = [param for param in model.parameters() if param.requires_grad]
                optimizer = torch.optim.AdamW(trainable_params, lr=learning_rate, weight_decay=weight_decay)
                scheduler = get_linear_schedule_with_warmup(
                    optimizer,
                    num_warmup_steps=warmup_steps,
                    num_training_steps=max_steps,
                    last_epoch=resumed_global_step - 1,
                )

                def evaluate_model(eval_loader):
                    if eval_loader is None:
                        return None

                    model.eval()
                    eval_loss_sum = 0.0
                    eval_batches = 0
                    with torch.no_grad():
                        for eval_batch in eval_loader:
                            eval_batch = {key: value.to(device) for key, value in eval_batch.items()}
                            eval_outputs = model(**eval_batch)
                            if eval_outputs.loss is None:
                                continue
                            eval_loss_sum += float(eval_outputs.loss.detach().item())
                            eval_batches += 1
                            if eval_batches >= max_eval_batches:
                                break
                    model.train()

                    if eval_batches == 0:
                        return None
                    return eval_loss_sum / eval_batches

                optimizer.zero_grad(set_to_none=True)
                global_step = resumed_global_step
                micro_step = 0
                loss_sum = 0.0
                loss_count = 0
                train_iterator = iter(train_loader)

                while global_step < max_steps:
                    try:
                        batch = next(train_iterator)
                    except StopIteration:
                        train_iterator = iter(train_loader)
                        continue

                    batch = {key: value.to(device) for key, value in batch.items()}
                    outputs = model(**batch)
                    loss = outputs.loss
                    if loss is None:
                        raise RuntimeError("Model forward returned no loss. Check labels in collator output.")

                    loss_sum += float(loss.detach().item())
                    loss_count += 1
                    (loss / gradient_accumulation_steps).backward()
                    micro_step += 1

                    should_step = micro_step % gradient_accumulation_steps == 0
                    if not should_step:
                        continue

                    torch.nn.utils.clip_grad_norm_(trainable_params, 1.0)
                    optimizer.step()
                    scheduler.step()
                    optimizer.zero_grad(set_to_none=True)
                    global_step += 1

                    if global_step % logging_steps == 0 or global_step == 1:
                        avg_loss = loss_sum / max(1, loss_count)
                        current_lr = scheduler.get_last_lr()[0]
                        log_line = f"step={global_step}/{max_steps} train_loss={avg_loss:.6f} lr={current_lr:.6e}"
                        loss_sum = 0.0
                        loss_count = 0

                        if val_loader is not None and (global_step % eval_interval_steps == 0 or global_step == 1):
                            val_loss = evaluate_model(val_loader)
                            if val_loss is not None:
                                log_line += f" val_loss={val_loss:.6f}"
                        print(log_line)

                    if save_interval_steps > 0 and global_step % save_interval_steps == 0:
                        checkpoint_dir = Path("checkpoints") / f"step-{global_step}"
                        checkpoint_dir.mkdir(parents=True, exist_ok=True)
                        model.save_pretrained(str(checkpoint_dir))
                        tokenizer.save_pretrained(str(checkpoint_dir))
                        print(f"Saved checkpoint at {checkpoint_dir}")

                print(
                    {
                        "global_step": global_step,
                        "max_steps": max_steps,
                        "profile": TRAIN_PROFILE,
                        "train_rows": len(tokenized_train_dataset),
                        "val_rows": len(tokenized_val_dataset) if tokenized_val_dataset is not None else 0,
                    }
                )
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
        md("eval_md", "## 7) Quick Evaluation Spot Check"),
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
