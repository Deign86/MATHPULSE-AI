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
This repository contains a **merged fp16 model** for DepEd Grade 11-12 math tutoring.
The LoRA adapter has been merged into the base model weights, so inference does not require PEFT adapters.

- Base model: `Qwen/Qwen2.5-7B-Instruct`
- Source adapter: `Deign86/deped-math-qwen2.5-7b-checkpoint-700-lora`
- Training checkpoint: **step 700**
- Target merged repo: `Deign86/deped-math-qwen2.5-7b-deped-math-merged`
- Output format: standalone fp16 Transformers model

## Intended Use
- DepEd-aligned tutoring support for Grade 11-12 mathematics
- Step-by-step instructional responses
- Prototyping, evaluation, and classroom assistant workflows

## Limitations
- Not a replacement for teacher assessment and curriculum validation
- May produce incorrect or incomplete reasoning for edge cases
- Requires prompt and output review in real classroom settings

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
