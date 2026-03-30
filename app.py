import logging
import os
import time
from typing import Any, Dict, List, Optional, Tuple

import gradio as gr
import spaces
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from backend.services.logging_utils import configure_structured_logging, log_model_call

LOGGER = configure_structured_logging("mathpulse.space")

MODEL_ID = os.getenv("HF_SPACE_MODEL_ID", "Qwen/Qwen2.5-Math-7B-Instruct")
MAX_NEW_TOKENS = int(os.getenv("HF_SPACE_MAX_NEW_TOKENS", "512"))
DEFAULT_TEMPERATURE = float(os.getenv("HF_SPACE_TEMPERATURE", "0.2"))
DEFAULT_TOP_P = float(os.getenv("HF_SPACE_TOP_P", "0.9"))

_TOKENIZER = None
_MODEL = None
_LOAD_ERROR: Optional[str] = None


class ModelNotLoadedError(RuntimeError):
    pass


def _messages_to_prompt(question: str, history: List[Tuple[str, str]]) -> str:
    parts: List[str] = [
        "SYSTEM:\nYou are MathPulse Tutor for Grade 11-12 math students. "
        "Explain clearly, show steps, and end with 'Final answer: ...'."
    ]
    for user_msg, assistant_msg in history:
        if user_msg:
            parts.append(f"USER:\n{user_msg}")
        if assistant_msg:
            parts.append(f"ASSISTANT:\n{assistant_msg}")
    parts.append(f"USER:\n{question}")
    parts.append("ASSISTANT:")
    return "\n\n".join(parts)


def _lazy_load_model() -> Tuple[Any, Any]:
    global _TOKENIZER, _MODEL, _LOAD_ERROR

    if _TOKENIZER is not None and _MODEL is not None:
        return _TOKENIZER, _MODEL

    try:
        LOGGER.info("Loading model %s", MODEL_ID)
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            torch_dtype="auto",
            device_map="auto",
        )
        _TOKENIZER = tokenizer
        _MODEL = model
        _LOAD_ERROR = None
        LOGGER.info("Model loaded: %s", MODEL_ID)
        return tokenizer, model
    except Exception as exc:
        _LOAD_ERROR = str(exc)
        LOGGER.exception("Model load failed")
        raise


@spaces.GPU
def _generate_with_gpu(
    question: str,
    history: List[Tuple[str, str]],
    temperature: float,
    top_p: float,
    max_new_tokens: int,
) -> str:
    tokenizer, model = _lazy_load_model()
    prompt = _messages_to_prompt(question, history)
    inputs = tokenizer(prompt, return_tensors="pt")
    inputs = {k: v.to(model.device) for k, v in inputs.items()}

    start = time.perf_counter()
    outputs = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        temperature=temperature,
        top_p=top_p,
        do_sample=temperature > 0,
        pad_token_id=tokenizer.eos_token_id,
    )
    elapsed_ms = (time.perf_counter() - start) * 1000

    generated_ids = outputs[0][inputs["input_ids"].shape[-1] :]
    text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

    log_model_call(
        LOGGER,
        provider="local_zerogpu",
        model=MODEL_ID,
        endpoint="/generate",
        latency_ms=elapsed_ms,
        input_tokens=int(inputs["input_ids"].shape[-1]),
        output_tokens=int(generated_ids.shape[-1]),
        status="ok",
    )

    return text


def generate(
    question: str,
    history: List[Tuple[str, str]],
    temperature: float,
    top_p: float,
    max_new_tokens: int,
) -> str:
    if not question or not question.strip():
        return "Please enter a math question."

    try:
        return _generate_with_gpu(question.strip(), history, temperature, top_p, max_new_tokens)
    except Exception as exc:
        log_model_call(
            LOGGER,
            provider="local_zerogpu",
            model=MODEL_ID,
            endpoint="/generate",
            latency_ms=0.0,
            input_tokens=None,
            output_tokens=None,
            status="error",
            error_class=exc.__class__.__name__,
            error_message=str(exc),
        )
        return "The model is warming up or unavailable. Please retry in a few seconds."


def health_check() -> Dict[str, Any]:
    loaded = _TOKENIZER is not None and _MODEL is not None
    return {
        "status": "healthy",
        "space": "mathpulse-zerogpu",
        "model": MODEL_ID,
        "modelLoaded": loaded,
        "loadError": _LOAD_ERROR,
    }


with gr.Blocks(title="MathPulse AI ZeroGPU Demo") as demo:
    gr.Markdown("# MathPulse AI (ZeroGPU Demo)\nAsk Grade 11-12 math questions.")

    chatbot = gr.Chatbot(height=420)
    question = gr.Textbox(label="Question", placeholder="Example: Solve 2x^2 - 7x + 3 = 0")

    with gr.Row():
        temperature = gr.Slider(0.0, 1.0, value=DEFAULT_TEMPERATURE, step=0.05, label="Temperature")
        top_p = gr.Slider(0.1, 1.0, value=DEFAULT_TOP_P, step=0.05, label="Top-p")
        max_tokens = gr.Slider(64, 1024, value=MAX_NEW_TOKENS, step=32, label="Max new tokens")

    status = gr.JSON(label="Health")

    def _chat(message: str, chat_history: List[Tuple[str, str]], temp: float, tp: float, mnt: int):
        response = generate(message, chat_history, temp, tp, int(mnt))
        chat_history = chat_history + [(message, response)]
        return "", chat_history

    question.submit(_chat, [question, chatbot, temperature, top_p, max_tokens], [question, chatbot], api_name="generate")

    with gr.Row():
        health_btn = gr.Button("Run health check")
        clear_btn = gr.Button("Clear chat")

    health_btn.click(fn=health_check, outputs=status, api_name="health")
    clear_btn.click(lambda: [], outputs=chatbot)

if __name__ == "__main__":
    demo.queue(max_size=64).launch(server_name="0.0.0.0", server_port=int(os.getenv("PORT", "7860")))
