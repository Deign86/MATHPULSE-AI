# Hugging Face Spaces Dev Mode Guide

This guide is for fast iteration on the Hugging Face Space app, prompts, and evaluation scripts.

## 1. Enable Dev Mode

1. Open your Space settings on Hugging Face.
2. Enable Dev Mode for the target Space.
3. Wait for the Space to restart with Dev Mode enabled.

## 2. Connect with SSH or VS Code Remote

1. In the Space page, open Dev Mode connection details.
2. Copy the SSH command provided by Hugging Face.
3. Connect using your terminal.
4. Optional: use VS Code Remote SSH and paste the same host details.

## 3. Fast edit workflow

1. Pull latest branch changes in the Space environment.
2. Edit these high-impact files first:
   - app.py
   - config/models.yaml
   - jobs/eval_math_model.py
   - jobs/generate_variants.py
3. Run one-command app reload with scripts/dev_reload.sh.
4. Smoke test endpoints:
   - GET /health
   - POST /generate
5. Keep prompt edits versioned in commit messages.

## 4. Recommended loop for prompts and models

1. Adjust model parameters in config/models.yaml.
2. Update prompt framing in app.py or backend prompt builders.
3. Run 5 to 10 representative Grade 11-12 questions.
4. Launch a short eval job on a subset:
   - python jobs/eval_math_model.py --limit 25 --subset algebra
5. Compare CSV metrics against previous run before promoting changes.

## 5. Safety and rollback

1. Never store student-identifying data in datasets/.
2. Keep only synthetic or anonymized records.
3. If quality regresses, revert to last known good model config and rerun smoke tests.
