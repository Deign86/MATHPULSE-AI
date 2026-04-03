import json
from pathlib import Path


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


cells = [
    md(
        "title",
        "# Qwen2.5 DepEd Grade 11-12 Math LoRA Fine-tuning (Colab)\n"
        "Manual checkpoints: Colab login/runtime, GPU selection, dataset file presence, HF token entry if needed.",
    ),
    md("s1", "## 1. Set Up Python Environment and Imports (Cell A)"),
    code(
        "a",
        "%pip -q install --upgrade pip\n"
        "%pip -q install \"unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git\"\n"
        "%pip -q install trl==0.22.2 transformers==4.57.3 accelerate peft datasets huggingface_hub bitsandbytes\n"
        "\n"
        "import logging\n"
        "from dataclasses import dataclass\n"
        "from pathlib import Path\n"
        "from typing import Any, Dict, List\n"
        "\n"
        "import unsloth\n"
        "from unsloth import FastLanguageModel\n"
        "import torch\n"
        "from datasets import load_dataset\n"
        "from huggingface_hub import HfApi, create_repo, login\n"
        "from peft import PeftModel\n"
        "from trl import SFTConfig, SFTTrainer\n"
        "\n"
        "print('CUDA:', torch.cuda.is_available())\n"
        "if torch.cuda.is_available():\n"
        "    print('GPU:', torch.cuda.get_device_name(0))\n",
    ),
    md("s2", "## 2. Create Project Configuration Variables (Cell B)"),
    code(
        "b",
        "HF_TOKEN = ''  # TODO\n"
        "HF_USERNAME = 'Deign86'  # TODO\n"
        "DATA_PATH = 'Deign86/deped-math-sft-dataset'  # HF dataset repo id or local jsonl path\n"
        "OUTPUT_DIR = '/content/qwen2.5-deped-math-lora'\n"
        "REPO_ID = f'{HF_USERNAME}/qwen2.5-deped-math-instruct-lora'\n"
        "MODEL_NAME = 'Qwen/Qwen2.5-7B-Instruct'\n"
        "MAX_SEQ_LENGTH = 2048\n"
        "NUM_TRAIN_EPOCHS = 2\n"
        "PER_DEVICE_TRAIN_BATCH_SIZE = 1\n"
        "GRADIENT_ACCUMULATION_STEPS = 8\n"
        "LEARNING_RATE = 2e-4\n"
        "SEED = 3407\n"
        "LORA_R = 16\n"
        "LORA_ALPHA = 32\n"
        "LORA_DROPOUT = 0.05\n"
        "CREATE_DATASET_REPO = False\n"
        "DATASET_REPO_ID = f'{HF_USERNAME}/deped-math-sft-dataset'\n",
    ),
    md("s3", "## 3. Define Core Data Structures"),
    code(
        "c1",
        "@dataclass\n"
        "class TrainingConfig:\n"
        "    hf_token: str\n"
        "    hf_username: str\n"
        "    data_path: str\n"
        "    output_dir: str\n"
        "    repo_id: str\n"
        "    model_name: str\n"
        "    max_seq_length: int\n"
        "    num_train_epochs: int\n"
        "\n"
        "REQUIRED_LEGACY_COLUMNS = {'system', 'user', 'assistant'}\n"
        "cfg = TrainingConfig(HF_TOKEN, HF_USERNAME, DATA_PATH, OUTPUT_DIR, REPO_ID, MODEL_NAME, MAX_SEQ_LENGTH, NUM_TRAIN_EPOCHS)\n",
    ),
    md("s4", "## 4. Implement Initial Business Logic Functions (Cells C-D)"),
    code(
        "c2",
        "def setup_hf_and_repos(cfg: TrainingConfig) -> None:\n"
        "    if cfg.hf_token.strip():\n"
        "        login(token=cfg.hf_token, add_to_git_credential=False)\n"
        "    else:\n"
        "        print('HF_TOKEN empty. Use notebook_login if required.')\n"
        "    create_repo(repo_id=cfg.repo_id, repo_type='model', exist_ok=True)\n"
        "\n"
        "def to_qwen_chatml(system: str, user: str, assistant: str) -> str:\n"
        "    return ('<|im_start|>system\\n' + system.strip() + '\\n<|im_end|>\\n' + '<|im_start|>user\\n' + user.strip() + '\\n<|im_end|>\\n' + '<|im_start|>assistant\\n' + assistant.strip() + '\\n<|im_end|>')\n"
        "\n"
        "def messages_to_chatml(messages: List[Dict[str, Any]]) -> str:\n"
        "    chunks: List[str] = []\n"
        "    for msg in messages:\n"
        "        role = str(msg.get('role', '')).strip()\n"
        "        content = str(msg.get('content', '')).strip()\n"
        "        if role in {'system', 'user', 'assistant'} and content:\n"
        "            chunks.append(f'<|im_start|>{role}\\n{content}\\n<|im_end|>')\n"
        "    return '\\n'.join(chunks)\n"
        "\n"
        "def load_and_format_dataset(data_path: str):\n"
        "    if Path(data_path).exists():\n"
        "        ds = load_dataset('json', data_files=data_path, split='train')\n"
        "    elif '/' in data_path and not data_path.startswith('/'):\n"
        "        ds = load_dataset(data_path, split='train')\n"
        "    else:\n"
        "        raise FileNotFoundError(f'Missing dataset: {data_path}. Use a local JSONL path or a Hub dataset repo id like user/name.')\n"
        "    cols = set(ds.column_names)\n"
        "    def _map_fn(ex: Dict[str, Any]) -> Dict[str, str]:\n"
        "        if isinstance(ex.get('text'), str) and ex['text'].strip():\n"
        "            return {'text': ex['text']}\n"
        "        if isinstance(ex.get('chatml'), str) and ex['chatml'].strip():\n"
        "            return {'text': ex['chatml']}\n"
        "        if REQUIRED_LEGACY_COLUMNS.issubset(cols):\n"
        "            return {'text': to_qwen_chatml(ex['system'], ex['user'], ex['assistant'])}\n"
        "        if isinstance(ex.get('messages'), list):\n"
        "            chatml = messages_to_chatml(ex['messages'])\n"
        "            if chatml.strip():\n"
        "                return {'text': chatml}\n"
        "        raise ValueError('Row missing supported SFT fields: expected text/chatml/messages or system+user+assistant.')\n"
        "    out = ds.map(_map_fn, remove_columns=ds.column_names)\n"
        "    print('Rows:', len(out))\n"
        "    print('Sample:\\n', out[0]['text'][:1200])\n"
        "    return out\n",
    ),
    md("s5", "## 5. Wire Functions into an Executable Workflow (Cells C-F)"),
    code(
        "cf",
        "setup_hf_and_repos(cfg)\n"
        "train_dataset = load_and_format_dataset(cfg.data_path)\n"
        "model, tokenizer = FastLanguageModel.from_pretrained(model_name=cfg.model_name, max_seq_length=cfg.max_seq_length, dtype=None, load_in_4bit=True)\n"
        "model = FastLanguageModel.get_peft_model(model, r=LORA_R, target_modules=['q_proj','k_proj','v_proj','o_proj','gate_proj','up_proj','down_proj'], lora_alpha=LORA_ALPHA, lora_dropout=LORA_DROPOUT, bias='none', use_gradient_checkpointing='unsloth', random_state=SEED)\n"
        "use_bf16 = torch.cuda.is_available() and torch.cuda.is_bf16_supported()\n"
        "trainer_args = SFTConfig(output_dir=cfg.output_dir, dataset_text_field='text', max_length=cfg.max_seq_length, per_device_train_batch_size=PER_DEVICE_TRAIN_BATCH_SIZE, gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS, warmup_steps=5, num_train_epochs=cfg.num_train_epochs, learning_rate=LEARNING_RATE, logging_steps=1, optim='adamw_8bit', weight_decay=0.01, lr_scheduler_type='linear', seed=SEED, fp16=not use_bf16, bf16=use_bf16, report_to='none', save_strategy='steps', save_steps=50, save_total_limit=2)\n"
        "trainer = SFTTrainer(model=model, tokenizer=tokenizer, train_dataset=train_dataset, args=trainer_args)\n"
        "train_result = trainer.train()\n"
        "print(train_result.metrics)\n"
        "Path(cfg.output_dir).mkdir(parents=True, exist_ok=True)\n"
        "model.save_pretrained(cfg.output_dir)\n"
        "tokenizer.save_pretrained(cfg.output_dir)\n",
    ),
    md("s6", "## 6. Add Basic Logging and Error Handling (Cell G)"),
    code(
        "g",
        "logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')\n"
        "logger = logging.getLogger('push')\n"
        "fallback_cmds = f'''# Fallback commands\n"
        "hf auth login\n"
        "hf upload {cfg.repo_id} {cfg.output_dir} . --repo-type model --commit-message \"Upload LoRA adapter\"\n"
        "'''\n"
        "try:\n"
        "    if cfg.hf_token.strip():\n"
        "        login(token=cfg.hf_token, add_to_git_credential=False)\n"
        "    model.push_to_hub(cfg.repo_id)\n"
        "    tokenizer.push_to_hub(cfg.repo_id)\n"
        "except Exception as e:\n"
        "    logger.exception('Push failed: %s', repr(e))\n"
        "    print(fallback_cmds)\n",
    ),
    md("s7", "## 7. Write Unit Tests for Core Functions"),
    code(
        "t",
        "import unittest\n"
        "\n"
        "class TestCoreFormatting(unittest.TestCase):\n"
        "    def test_chatml_has_roles(self):\n"
        "        txt = to_qwen_chatml('sys', 'usr', 'asst')\n"
        "        self.assertIn('<|im_start|>system', txt)\n"
        "        self.assertIn('<|im_start|>user', txt)\n"
        "        self.assertIn('<|im_start|>assistant', txt)\n"
        "\n"
        "def run_unit_tests() -> None:\n"
        "    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestCoreFormatting)\n"
        "    result = unittest.TextTestRunner(verbosity=2).run(suite)\n"
        "    if not result.wasSuccessful():\n"
        "        raise AssertionError('Core unit tests failed')\n",
    ),
    md("s8", "## 8. Run Tests and Inspect Output (Cell H)"),
    code(
        "h",
        "run_unit_tests()\n"
        "base_model, infer_tokenizer = FastLanguageModel.from_pretrained(model_name=cfg.model_name, max_seq_length=cfg.max_seq_length, dtype=None, load_in_4bit=True)\n"
        "infer_model = PeftModel.from_pretrained(base_model, cfg.output_dir)\n"
        "FastLanguageModel.for_inference(infer_model)\n"
        "messages = [\n"
        "    {'role':'system','content':'You are a precise DepEd SHS General Math tutor. Use numbered steps, show derivations, include a short self-check, then final answer.'},\n"
        "    {'role':'user','content':'A rectangle has perimeter 54 cm and length 3 cm more than width. Find length and width.'}\n"
        "]\n"
        "prompt = infer_tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)\n"
        "inputs = infer_tokenizer([prompt], return_tensors='pt').to(infer_model.device)\n"
        "with torch.no_grad():\n"
        "    outputs = infer_model.generate(**inputs, max_new_tokens=256, do_sample=False, eos_token_id=infer_tokenizer.eos_token_id, pad_token_id=infer_tokenizer.eos_token_id)\n"
        "completion = infer_tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)\n"
        "print(completion)\n",
    ),
]

nb = {
    "cells": cells,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}

out = Path("colab_qwen25_deped_lora.ipynb")
out.write_text(json.dumps(nb, ensure_ascii=True, indent=2), encoding="utf-8")
print(f"Wrote {out} with {len(cells)} cells")
