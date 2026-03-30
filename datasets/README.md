# Dataset Layout (Hugging Face Ready)

This repository stores only synthetic or anonymized data for model iteration.

## Structure

- datasets/eval/grade11_12/: Evaluation problem sets used by jobs/eval_math_model.py
- datasets/synthetic/variants/: Model-generated variants from jobs/generate_variants.py
- datasets/train_like/anonymized/: Optional training-like records with anonymized identifiers only
- datasets/metadata/: Dataset card templates and split metadata

## Privacy policy

Never store real student-identifying fields in dataset files:
- name
- email
- lrn
- phone
- exact address

Use synthetic examples or irreversible hashes when identifiers are needed.
