---
language: en
base_model: Qwen/Qwen2.5-7B-Instruct
tags:
- deped
- mathematics
- grade11
- grade12
- qwen2.5
- lora-merged
pipeline_tag: text-generation
license: apache-2.0
---

# DepEd Math Tutor Qwen2.5-7B (Merged from 700-step LoRA)

## Model Summary
This is a merged fp16 model for DepEd Grade 11-12 math tutoring.
The model is derived from the **step-700** fine-tuned LoRA and merged into base weights.

- Base model: `Qwen/Qwen2.5-7B-Instruct`
- Source adapter: `Deign86/deped-math-qwen2.5-7b-checkpoint-700-lora`
- Training checkpoint: **step 700**
- Merged target repo: `Deign86/deped-math-qwen2.5-7b-deped-math-merged`

## Intended Use
- Grade 11-12 math tutoring assistance
- Guided step-by-step explanation generation
- Model evaluation and instructional prototype workflows

## Limitations
- May generate inaccurate steps for ambiguous or out-of-domain prompts
- Requires teacher review before classroom use
- Not a substitute for curriculum validation and formal assessment

## Quick Usage
```python
from transformers import AutoTokenizer, AutoModelForCausalLM

model_id = "Deign86/deped-math-qwen2.5-7b-deped-math-merged"

tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype="auto",
    device_map="auto",
)
```
