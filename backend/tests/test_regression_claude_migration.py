"""Regression guards for the move from an OpenAI-compatible provider to Claude (Anthropic Messages API).

Each guard pins one way the migration could silently regress: the retired SDK or provider name creeping back,
sampling parameters Claude rejects with HTTP 400, stale model ids reaching the API, a renamed route or health
key, and the dependency pin. Per-request construction (thinking, effort, fallbacks) belongs to the ai_client
unit tests; this file only asserts what must never appear on the wire and what must always resolve.
"""
from __future__ import annotations

import ast
import dataclasses
import importlib
import inspect
import json
import os
import re
import subprocess
from collections.abc import Callable, Iterable, Iterator
from functools import lru_cache
from pathlib import Path
from typing import Any

import anthropic
import httpx2
import pytest
import yaml
from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("ANTHROPIC_API_KEY", "mock-key-for-testing")

import main as main_module
from services import ai_client, inference_client

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
AI_CLIENT_PATH = BACKEND_DIR / "services" / "ai_client.py"
BACKEND_MODELS_YAML = BACKEND_DIR / "config" / "models.yaml"
ROOT_MODELS_YAML = REPO_ROOT / "config" / "models.yaml"
REQUIREMENTS = BACKEND_DIR / "requirements.txt"

# The character class keeps the retired provider's name out of this file's own text.
RETIRED_NAME = re.compile(r"deep[s]eek", re.IGNORECASE)

SKIPPED_DIRS = frozenset({".venv", "venv", "__pycache__", "datasets", "node_modules", ".mypy_cache", ".pytest_cache", ".git"})
LOCAL_ENV_FILES = frozenset({".env", ".env.local"})
ENV_SAMPLES = (
    REPO_ROOT / ".env.example",
    BACKEND_DIR / ".env.example",
    BACKEND_DIR / "config" / "env.sample",
    REPO_ROOT / "docker-compose.yml",
)

# Claude rejects every one of these with HTTP 400.
SAMPLING_PARAMETERS = frozenset(
    {"temperature", "top_p", "top_k", "repetition_penalty", "frequency_penalty", "presence_penalty"}
)
# top_k is also a vector-store retrieval parameter, so source scans leave it out; the wire check keeps it.
SOURCE_SAMPLING_NAMES = SAMPLING_PARAMETERS - {"top_k"}

USER_TURN = [{"role": "user", "content": "What is 2 + 2?"}]
ANSWER_SCHEMA = {"type": "object", "properties": {"answer": {"type": "integer"}}, "required": ["answer"], "additionalProperties": False}
STALE_MODEL_ID = "legacy-flash-model"
WIRE_MODELS = (ai_client.CHAT_MODEL, ai_client.REASONER_MODEL, "claude-sonnet-5-5")


def _report(headline: str, offences: list[str], limit: int = 40) -> str:
    shown = "\n".join(f"  {offence}" for offence in offences[:limit])
    more = f"\n  ... and {len(offences) - limit} more" if len(offences) > limit else ""
    return f"{headline}\n{shown}{more}"


def _relative(path: Path) -> str:
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def _walk_files(root: Path) -> Iterator[Path]:
    for current, dirs, files in os.walk(root):
        dirs[:] = sorted(
            name for name in dirs if name not in SKIPPED_DIRS and not (Path(current) / name / "pyvenv.cfg").exists()
        )
        for name in sorted(files):
            yield Path(current) / name


# ─── 1. Source guards: one SDK, one choke point ──────────────────────────────────────────────────


@lru_cache(maxsize=1)
def _parsed_backend_sources() -> tuple[tuple[Path, ast.Module | None], ...]:
    parsed: list[tuple[Path, ast.Module | None]] = []
    for path in _walk_files(BACKEND_DIR):
        if path.suffix != ".py":
            continue
        try:
            parsed.append((path, ast.parse(path.read_text(encoding="utf-8-sig"))))
        except (SyntaxError, UnicodeDecodeError):
            parsed.append((path, None))
    return tuple(parsed)


def _is_test_source(path: Path) -> bool:
    relative = path.relative_to(BACKEND_DIR)
    return "tests" in relative.parts or relative.name.startswith("test_") or relative.name == "conftest.py"


def _is_package(module_name: str, package: str) -> bool:
    return module_name == package or module_name.startswith(f"{package}.")


def _legacy_sdk_uses(module: ast.Module) -> list[tuple[int, str]]:
    uses: list[tuple[int, str]] = []
    for node in ast.walk(module):
        if isinstance(node, ast.Import):
            uses.extend((node.lineno, f"import {alias.name}") for alias in node.names if _is_package(alias.name, "openai"))
        elif isinstance(node, ast.ImportFrom):
            if node.level == 0 and _is_package(node.module or "", "openai"):
                uses.append((node.lineno, f"from {node.module} import ..."))
        elif isinstance(node, ast.Attribute):
            if node.attr == "completions" and isinstance(node.value, ast.Attribute) and node.value.attr == "chat":
                uses.append((node.lineno, "calls .chat.completions"))
        elif isinstance(node, ast.Constant) and isinstance(node.value, str):
            if re.fullmatch(r"openai(?:\.\w+)+", node.value):
                uses.append((node.lineno, f"names the module {node.value!r} (a mock or patch target)"))
    return uses


def _is_anthropic_error_class(module_name: str, name: str) -> bool:
    candidate = getattr(importlib.import_module(module_name), name, None)
    return isinstance(candidate, type) and issubclass(candidate, BaseException)


def _anthropic_sdk_uses(module: ast.Module) -> list[tuple[int, str]]:
    """Direct SDK use: a bare import, an import of anything but an error class, or a .messages call."""
    uses: list[tuple[int, str]] = []
    for node in ast.walk(module):
        if isinstance(node, ast.Import):
            uses.extend((node.lineno, f"import {alias.name}") for alias in node.names if _is_package(alias.name, "anthropic"))
        elif isinstance(node, ast.ImportFrom):
            source = node.module or ""
            if node.level == 0 and _is_package(source, "anthropic"):
                uses.extend(
                    (node.lineno, f"from {source} import {alias.name}")
                    for alias in node.names
                    if not _is_anthropic_error_class(source, alias.name)
                )
        elif isinstance(node, ast.Attribute):
            if node.attr in {"create", "stream", "count_tokens"} and isinstance(node.value, ast.Attribute) and node.value.attr == "messages":
                uses.append((node.lineno, f"calls .messages.{node.attr}"))
    return uses


def _sampling_declarations(module: ast.Module) -> list[tuple[int, str]]:
    found: list[tuple[int, str]] = []
    for node in ast.walk(module):
        if isinstance(node, ast.arg) and node.arg in SOURCE_SAMPLING_NAMES:
            found.append((node.lineno, f"parameter {node.arg}"))
        elif isinstance(node, ast.keyword) and node.arg in SOURCE_SAMPLING_NAMES:
            found.append((node.value.lineno, f"keyword argument {node.arg}="))
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id in SOURCE_SAMPLING_NAMES:
            found.append((node.lineno, f"field {node.target.id}"))
        elif isinstance(node, ast.Constant) and isinstance(node.value, str) and node.value in SOURCE_SAMPLING_NAMES:
            found.append((node.lineno, f"key {node.value!r}"))
    return found


def _source_offences(find: Callable[[ast.Module], list[tuple[int, str]]], *, skip_tests: bool, skip: Path | None = None) -> list[str]:
    offences: list[str] = []
    for path, module in _parsed_backend_sources():
        if (skip_tests and _is_test_source(path)) or path == skip:
            continue
        if module is None:
            offences.append(f"{_relative(path)}: does not parse, so it cannot be checked")
            continue
        offences.extend(f"{_relative(path)}:{line}: {what}" for line, what in find(module))
    return offences


# Assembled from parts so the repo-wide "no OpenAI SDK import" grep gate does not match these snippets.
LEGACY_SDK = "open" + "ai"


@pytest.mark.parametrize(
    ("snippet", "expected_uses"),
    [
        (f"import {LEGACY_SDK}\n", 1),
        (f"import json, {LEGACY_SDK}.types\n", 1),
        (f"from {LEGACY_SDK} import OpenAI\n", 1),
        ("reply = client.chat.completions.create(model='m')\n", 1),
        (f"patch('{LEGACY_SDK}.OpenAI')\n", 1),
        (f"# {LEGACY_SDK}.OpenAI used to live here\nreply = client.completions\n", 0),
        ("from services.ai_client import complete_text\n", 0),
    ],
)
def test_legacy_sdk_detector_flags_only_real_uses(snippet, expected_uses):
    assert len(_legacy_sdk_uses(ast.parse(snippet))) == expected_uses


@pytest.mark.parametrize(
    ("snippet", "expected_uses"),
    [
        ("import anthropic\n", 1),
        ("from anthropic import Anthropic\n", 1),
        ("from anthropic import APIError, Anthropic\n", 1),
        ("from anthropic.types.beta import BetaMessage\n", 1),
        ("reply = client.beta.messages.create(**request)\n", 1),
        ("with client.messages.stream(**request) as stream:\n    pass\n", 1),
        ("from anthropic import APIError, APIConnectionError\n", 0),
        ("from services.ai_client import APIError, complete_text\n", 0),
        ("models = client.models.list()\n", 0),
    ],
)
def test_anthropic_sdk_detector_flags_only_direct_sdk_use(snippet, expected_uses):
    assert len(_anthropic_sdk_uses(ast.parse(snippet))) == expected_uses


@pytest.mark.parametrize(
    ("snippet", "expected_uses"),
    [
        ("def call(messages, temperature=0.2):\n    pass\n", 1),
        ("call(messages, top_p=0.9)\n", 1),
        ("body = {'temperature': 0.7}\n", 1),
        ("class Settings(BaseModel):\n    repetition_penalty: float = 1.1\n", 1),
        ("retrieve(query, top_k=5)\n", 0),
        ("def call(messages, max_tokens=512):\n    pass\n", 0),
    ],
)
def test_sampling_detector_flags_removed_parameters_but_not_retrieval_top_k(snippet, expected_uses):
    assert len(_sampling_declarations(ast.parse(snippet))) == expected_uses


def test_backend_never_imports_the_openai_sdk_or_calls_chat_completions():
    offences = _source_offences(_legacy_sdk_uses, skip_tests=False)
    assert not offences, _report(
        "The retired OpenAI-compatible SDK is back in backend/. Every AI call goes through services.ai_client:", offences
    )


def test_only_ai_client_touches_the_anthropic_sdk():
    sdk_modules = {path: module for path, module in _parsed_backend_sources() if module is not None}
    assert AI_CLIENT_PATH in sdk_modules and _anthropic_sdk_uses(sdk_modules[AI_CLIENT_PATH]), (
        "scanner sanity: services/ai_client.py must be found and must use the anthropic SDK"
    )
    offences = _source_offences(_anthropic_sdk_uses, skip_tests=True, skip=AI_CLIENT_PATH)
    assert not offences, _report(
        "Backend code outside services/ai_client.py reaches the Anthropic SDK directly. Only its error classes may "
        "be imported elsewhere; build requests with complete_text / stream_text / open_stream / create_message:",
        offences,
    )


# ─── 2. Name guard: the retired provider is gone from code, config, docs and samples ─────────────


def _retired_name_hits(paths: Iterable[Path]) -> list[str]:
    hits: list[str] = []
    for path in paths:
        relative = _relative(path)
        if RETIRED_NAME.search(relative):
            hits.append(f"{relative}: the file path itself")
        raw = path.read_bytes()
        if b"\0" in raw[:8192]:
            continue
        for number, line in enumerate(raw.decode("utf-8", errors="replace").splitlines(), start=1):
            if RETIRED_NAME.search(line):
                hits.append(f"{relative}:{number}: {line.strip()[:100]}")
    return hits


def test_name_scanner_flags_text_lines_and_file_names_but_skips_binary_files(tmp_path):
    retired = "deep" + "seek"
    notes = tmp_path / "notes.md"
    notes.write_text(f"intro\nreplaced {retired.title()} calls\n", encoding="utf-8")
    renamed = tmp_path / f"{retired}_routes.py"
    renamed.write_text("pass\n", encoding="utf-8")
    blob = tmp_path / "blob.bin"
    blob.write_bytes(b"\0" + retired.encode())

    hits = _retired_name_hits([notes, renamed, blob])

    assert len(hits) == 2, hits
    assert any(hit.split(": ")[0].endswith("notes.md:2") for hit in hits), hits
    assert any(hit.endswith("the file path itself") for hit in hits), hits


@pytest.mark.parametrize("scope", ["backend", "config", "scripts"])
def test_retired_provider_name_is_gone_from_directory(scope):
    root = REPO_ROOT / scope
    assert root.is_dir(), f"{scope}/ is missing, so it cannot be scanned"
    hits = _retired_name_hits(path for path in _walk_files(root) if path.name not in LOCAL_ENV_FILES)
    assert not hits, _report(f"The retired provider's name still appears under {scope}/:", hits)


def test_retired_provider_name_is_gone_from_env_samples():
    hits = _retired_name_hits(ENV_SAMPLES)
    assert not hits, _report("The retired provider's name still appears in an env sample or compose file:", hits)


def _repository_files() -> list[Path]:
    """Every file git tracks or would add (untracked, not ignored); skips the test when git cannot list them.

    No tree is left out: vendored and dataset text count, and _retired_name_hits skips binaries by their NUL bytes.
    """
    try:
        listing = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
            capture_output=True,
            check=True,
            timeout=60,
        ).stdout
    except (OSError, subprocess.SubprocessError) as error:
        pytest.skip(f"git cannot list the repository files here, so the repo-wide name scan cannot run: {error}")
    candidates = (REPO_ROOT / name for name in os.fsdecode(listing).split("\0") if name)
    return [path for path in candidates if path.is_file() and path.name not in LOCAL_ENV_FILES]


def test_retired_provider_name_is_gone_from_every_repository_file():
    files = _repository_files()
    assert AI_CLIENT_PATH in files and any(not path.is_relative_to(BACKEND_DIR) for path in files), (
        "scanner sanity: the listing must reach backend/ and the files outside it (src/, docs/, functions/, ...)"
    )
    hits = _retired_name_hits(files)
    assert not hits, _report("The retired provider's name still appears in a file git tracks or would add:", hits)


# ─── 3. Sampling guard: Claude rejects temperature / top_p / top_k with HTTP 400 ─────────────────

_SIGNATURES_WITHOUT_SAMPLING = (
    (main_module, "call_hf_chat"),
    (main_module, "call_hf_chat_async"),
    (main_module, "call_hf_chat_stream"),
    (main_module, "call_hf_chat_stream_async"),
    (inference_client, "rag_grounded_completion"),
    (ai_client, "create_message"),
    (ai_client, "complete_text"),
    (ai_client, "complete_json"),
    (ai_client, "open_stream"),
    (ai_client, "stream_text"),
)


def test_inference_request_has_no_sampling_fields():
    fields = {field.name for field in dataclasses.fields(inference_client.InferenceRequest)}
    assert not fields & SAMPLING_PARAMETERS, (
        f"InferenceRequest still declares {sorted(fields & SAMPLING_PARAMETERS)}; Claude rejects them"
    )


@pytest.mark.parametrize(
    ("owner", "function_name"),
    _SIGNATURES_WITHOUT_SAMPLING,
    ids=[f"{owner.__name__}.{name}" for owner, name in _SIGNATURES_WITHOUT_SAMPLING],
)
def test_ai_entry_points_take_no_sampling_parameters(owner, function_name):
    parameters = set(inspect.signature(getattr(owner, function_name)).parameters)
    assert not parameters & SAMPLING_PARAMETERS, (
        f"{owner.__name__}.{function_name} still accepts {sorted(parameters & SAMPLING_PARAMETERS)}"
    )


def test_backend_source_never_declares_or_passes_sampling_parameters():
    offences = _source_offences(_sampling_declarations, skip_tests=True)
    assert not offences, _report(
        "Sampling parameters survive in backend source. A leftover keyword argument raises TypeError the "
        "first time that route runs, and a leftover request key is an HTTP 400 from Claude:",
        offences,
    )


def _sampling_key_paths(node: object, path: str = "$") -> list[str]:
    if isinstance(node, dict):
        paths = [f"{path}.{key}" for key in node if key in SAMPLING_PARAMETERS]
        for key, child in node.items():
            paths.extend(_sampling_key_paths(child, f"{path}.{key}"))
        return paths
    if isinstance(node, list):
        return [found for index, child in enumerate(node) for found in _sampling_key_paths(child, f"{path}[{index}]")]
    return []


def test_sampling_key_paths_finds_keys_at_any_depth():
    body = {"model": "m", "output_config": {"top_p": 0.9}, "messages": [{"role": "user", "temperature": 1}], "top_k": 5}

    assert _sampling_key_paths(body) == ["$.top_k", "$.output_config.top_p", "$.messages[0].temperature"]


def _sse(event: str, payload: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


_MESSAGE_REPLY: dict[str, Any] = {
    "id": "msg_regression",
    "type": "message",
    "role": "assistant",
    "model": "claude-regression",
    "content": [{"type": "text", "text": '{"answer": 4}'}],
    "stop_reason": "end_turn",
    "stop_sequence": None,
    "usage": {"input_tokens": 3, "output_tokens": 1},
}

_STREAM_REPLY = "".join(
    [
        _sse("message_start", {"type": "message_start", "message": {**_MESSAGE_REPLY, "content": [], "stop_reason": None}}),
        _sse("content_block_start", {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}),
        _sse("content_block_delta", {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "4"}}),
        _sse("content_block_stop", {"type": "content_block_stop", "index": 0}),
        _sse(
            "message_delta",
            {"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence": None}, "usage": {"output_tokens": 1}},
        ),
        _sse("message_stop", {"type": "message_stop"}),
    ]
).encode()


@pytest.fixture
def wire(monkeypatch: pytest.MonkeyPatch) -> Iterator[list[dict[str, Any]]]:
    """Request bodies that reach the Messages API, answered by an in-memory transport instead of the network."""
    bodies: list[dict[str, Any]] = []

    def answer(request: httpx2.Request) -> httpx2.Response:
        body = json.loads(request.content)
        bodies.append(body)
        if body.get("stream"):
            return httpx2.Response(200, headers={"content-type": "text/event-stream"}, content=_STREAM_REPLY)
        return httpx2.Response(200, json=_MESSAGE_REPLY)

    client = anthropic.Anthropic(api_key="test", http_client=httpx2.Client(transport=httpx2.MockTransport(answer)))
    monkeypatch.setattr(ai_client, "get_anthropic_client", lambda: client)
    monkeypatch.setattr(inference_client, "is_enabled", lambda: True)
    monkeypatch.setattr(main_module, "get_inference_client", lambda: inference_client.InferenceClient())
    monkeypatch.setattr("time.sleep", lambda _seconds: None)
    monkeypatch.delenv("INFERENCE_ENFORCE_LOCK_MODEL", raising=False)
    yield bodies
    client.close()


def _via_complete_text(model: str) -> object:
    return ai_client.complete_text(USER_TURN, model=model)


def _via_json_output(model: str) -> object:
    return ai_client.complete_text(USER_TURN, model=model, json_output=True)


def _via_complete_json(model: str) -> object:
    return ai_client.complete_json(USER_TURN, schema=ANSWER_SCHEMA, model=model)


def _via_open_stream(model: str) -> object:
    with ai_client.open_stream(USER_TURN, model=model) as stream:
        return list(stream.text_stream)


def _via_stream_text(model: str) -> object:
    return list(ai_client.stream_text(USER_TURN, model=model))


def _via_call_hf_chat(model: str) -> object:
    return main_module.call_hf_chat(USER_TURN, model=model, task_type="default")


def _via_call_hf_chat_stream(model: str) -> object:
    return list(main_module.call_hf_chat_stream(USER_TURN, model=model, task_type="default"))


def _via_rag_grounded_completion(model: str) -> object:
    return inference_client.rag_grounded_completion(model, "You are a math tutor.", "What is 2 + 2?")


ENTRY_POINTS: dict[str, Callable[[str], object]] = {
    "ai_client.complete_text": _via_complete_text,
    "ai_client.complete_text(json_output)": _via_json_output,
    "ai_client.complete_json": _via_complete_json,
    "ai_client.open_stream": _via_open_stream,
    "ai_client.stream_text": _via_stream_text,
    "main.call_hf_chat": _via_call_hf_chat,
    "main.call_hf_chat_stream": _via_call_hf_chat_stream,
    "inference_client.rag_grounded_completion": _via_rag_grounded_completion,
}


@pytest.mark.parametrize("model", WIRE_MODELS)
@pytest.mark.parametrize("entry_point", list(ENTRY_POINTS))
def test_requests_carry_no_sampling_parameters(wire, entry_point, model):
    ENTRY_POINTS[entry_point](model)

    assert wire, f"{entry_point} sent nothing to the Messages API"
    sent = [path for body in wire for path in _sampling_key_paths(body)]
    assert not sent, f"{entry_point} sent sampling parameters to {model}: {sent}"


# ─── 4. Routing guard: only Claude ids ever resolve or reach the API ─────────────────────────────


def _read_yaml(path: Path) -> dict[str, Any]:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def _generation_model_ids(config: dict[str, Any]) -> list[tuple[str, str]]:
    """Every model id the config routes generation to; the embedding model is not a generation model."""
    found: list[tuple[str, str]] = []
    for name, entry in (config.get("models") or {}).items():
        if name == "embedding" or not isinstance(entry, dict):
            continue
        if "id" in entry:
            found.append((f"models.{name}.id", str(entry["id"])))
        if name == "model_capabilities":
            found.extend((f"models.{name}.{capability}", str(model_id)) for capability, ids in entry.items() for model_id in ids or [])
    routing = config.get("routing") or {}
    found.extend((f"routing.task_model_map.{task}", str(model_id)) for task, model_id in (routing.get("task_model_map") or {}).items())
    for task, chain in (routing.get("task_fallback_model_map") or {}).items():
        found.extend((f"routing.task_fallback_model_map.{task}", str(model_id)) for model_id in chain or [])
    return found


def test_generation_model_ids_cover_every_routing_section_and_exempt_the_embedding_model():
    config = {
        "models": {
            "primary": {"id": "claude-haiku-5-5"},
            "embedding": {"id": "BAAI/bge-small-en-v1.5"},
            "model_capabilities": {"supports_thinking": ["claude-opus-5-5"]},
        },
        "routing": {
            "task_model_map": {"chat": "claude-haiku-5-5"},
            "task_fallback_model_map": {"chat": ["claude-opus-5-5"]},
        },
    }

    assert _generation_model_ids(config) == [
        ("models.primary.id", "claude-haiku-5-5"),
        ("models.model_capabilities.supports_thinking", "claude-opus-5-5"),
        ("routing.task_model_map.chat", "claude-haiku-5-5"),
        ("routing.task_fallback_model_map.chat", "claude-opus-5-5"),
    ]


ROUTED_MODELS: dict[str, str] = (_read_yaml(BACKEND_MODELS_YAML).get("routing") or {}).get("task_model_map") or {}
ROUTED_TASKS = sorted(ROUTED_MODELS)
MODEL_ID_KEYS = (
    "INFERENCE_MODEL_ID",
    "INFERENCE_CHAT_MODEL_ID",
    "INFERENCE_CHAT_MODEL_TEMP_OVERRIDE",
    "INFERENCE_LOCK_MODEL_ID",
    "INFERENCE_FALLBACK_MODELS",
    "HF_QUIZ_MODEL_ID",
    "HF_RAG_MODEL_ID",
)
# What every model-id variable holds in each environment: blank is not configured, a stale id is a leftover.
PLANTED_MODEL_IDS = {"clean": "", "stale-ids": STALE_MODEL_ID}


def _plant_model_ids(monkeypatch: pytest.MonkeyPatch, model_id: str) -> None:
    """Put `model_id` in every env var and runtime override a deployment can configure; "" means not configured."""
    monkeypatch.delenv("INFERENCE_ENFORCE_LOCK_MODEL", raising=False)
    monkeypatch.setattr(inference_client, "_RUNTIME_PROFILE", "")
    for key in MODEL_ID_KEYS:
        monkeypatch.setenv(key, model_id)
        monkeypatch.setitem(inference_client._RUNTIME_OVERRIDES, key, model_id)


def test_models_yaml_copies_are_identical():
    backend_copy = BACKEND_MODELS_YAML.read_text(encoding="utf-8").replace("\r\n", "\n")
    root_copy = ROOT_MODELS_YAML.read_text(encoding="utf-8").replace("\r\n", "\n")
    assert backend_copy == root_copy, "backend/config/models.yaml and config/models.yaml drifted apart; they must match"


def test_models_yaml_declares_task_routes():
    assert ROUTED_TASKS, "backend/config/models.yaml has no routing.task_model_map, so no task is parametrized"


@pytest.mark.parametrize("path", [BACKEND_MODELS_YAML, ROOT_MODELS_YAML], ids=_relative)
def test_models_yaml_generation_ids_are_claude_models(path):
    model_ids = _generation_model_ids(_read_yaml(path))
    assert any(origin.startswith("routing.task_model_map.") for origin, _ in model_ids), (
        f"{_relative(path)} routes no tasks; the schema this guard reads has changed"
    )
    foreign = [f"{origin}: {model_id}" for origin, model_id in model_ids if not model_id.startswith("claude-")]
    assert not foreign, _report(f"{_relative(path)} routes generation to ids that are not Claude models:", foreign)


@pytest.mark.parametrize("path", [BACKEND_MODELS_YAML, ROOT_MODELS_YAML], ids=_relative)
def test_models_yaml_has_no_sampling_keys(path):
    sampling = _sampling_key_paths(_read_yaml(path))
    assert not sampling, f"{_relative(path)} still configures sampling, which Claude rejects: {sampling}"


# get_model_for_task reads env vars, runtime overrides and the active profile, never models.yaml: with no Claude id
# configured (blank, or only stale ids) every task falls back to the chat model. The YAML routes are what
# InferenceClient sends, which test_routed_task_is_sent_to_the_model_models_yaml_names pins on the wire.
@pytest.mark.parametrize("environment", PLANTED_MODEL_IDS)
@pytest.mark.parametrize("task", ROUTED_TASKS)
def test_routed_task_without_a_configured_model_resolves_to_the_chat_model(monkeypatch, task, environment):
    _plant_model_ids(monkeypatch, PLANTED_MODEL_IDS[environment])
    resolved = inference_client.get_model_for_task(task)
    assert resolved == ai_client.CHAT_MODEL, f"get_model_for_task({task!r}) returned {resolved!r} with {environment} env"


@pytest.mark.parametrize("profile_source", ["startup-env", "runtime-profile"])
def test_prod_profile_routes_only_rag_tasks_to_the_reasoner_model(monkeypatch, profile_source):
    """The prod profile gives every rag_* task the reasoner (HF_RAG_MODEL_ID) and every other task the chat model."""
    monkeypatch.delenv("INFERENCE_ENFORCE_LOCK_MODEL", raising=False)
    monkeypatch.setattr(inference_client, "_RUNTIME_OVERRIDES", {})
    for key in inference_client._MODEL_PROFILES["prod"]:
        monkeypatch.setenv(key, "")
    if profile_source == "startup-env":
        monkeypatch.setattr(inference_client, "_RUNTIME_PROFILE", "")
        monkeypatch.setenv("MODEL_PROFILE", "prod")
        inference_client._apply_model_profile()
    else:
        monkeypatch.setattr(inference_client, "_RUNTIME_PROFILE", "prod")

    resolved = {task: inference_client.get_model_for_task(task) for task in ROUTED_TASKS}
    expected = {
        task: ai_client.REASONER_MODEL if task.startswith("rag_") else ai_client.CHAT_MODEL for task in ROUTED_TASKS
    }
    assert resolved == expected


@pytest.mark.parametrize("environment", PLANTED_MODEL_IDS)
@pytest.mark.parametrize("task", ROUTED_TASKS)
def test_routed_task_is_sent_to_the_model_models_yaml_names(wire, monkeypatch, task, environment):
    _plant_model_ids(monkeypatch, PLANTED_MODEL_IDS[environment])
    client = inference_client.InferenceClient()

    try:
        client.generate_from_messages(inference_client.InferenceRequest(messages=USER_TURN, task_type=task))
    except RuntimeError as exc:
        pytest.fail(f"task {task!r} has no Claude model to call: {exc}")

    sent = [body["model"] for body in wire]
    assert sent == [ROUTED_MODELS[task]], (
        f"task {task!r} sent {sent} with {environment} env; models.yaml routes it to {ROUTED_MODELS[task]}"
    )


@pytest.mark.parametrize(
    "entry_point",
    ["ai_client.open_stream", "main.call_hf_chat", "main.call_hf_chat_stream", "inference_client.rag_grounded_completion"],
)
def test_stale_model_id_argument_falls_back_to_a_claude_model(wire, monkeypatch, entry_point):
    _plant_model_ids(monkeypatch, STALE_MODEL_ID)

    ENTRY_POINTS[entry_point](STALE_MODEL_ID)

    sent = [body["model"] for body in wire]
    assert sent, f"{entry_point} sent nothing to the Messages API"
    assert all(model.startswith("claude-") for model in sent), f"{entry_point} sent {sent} for model={STALE_MODEL_ID!r}"


# ─── 5. API surface: renamed routes and the /health payload ──────────────────────────────────────


def _registered_routes(app: FastAPI) -> set[tuple[str, str]]:
    """(METHOD, path) for every route on the app, including routers mounted with include_router."""
    registered: set[tuple[str, str]] = set()
    pending = [(route, "") for route in app.routes]
    while pending:
        route, prefix = pending.pop()
        router = getattr(route, "original_router", None)
        if router is not None:
            mount_prefix = getattr(getattr(route, "include_context", None), "prefix", "")
            pending.extend((child, prefix + mount_prefix) for child in router.routes)
            continue
        path, methods = getattr(route, "path", None), getattr(route, "methods", None)
        if path and methods:
            registered.update((method, prefix + path) for method in methods)
    return registered


def test_route_scanner_applies_include_router_prefixes():
    router = APIRouter(prefix="/ai")

    @router.post("/tips")
    def tips():
        return {}

    app = FastAPI()
    app.include_router(router, prefix="/api")
    app.add_api_route("/health", lambda: {}, methods=["GET"])

    assert {("POST", "/api/ai/tips"), ("GET", "/health")} <= _registered_routes(app)


@pytest.mark.parametrize("path", ["/api/ai/weakness-detection", "/api/ai/module-preview", "/api/ai/study-tips"])
def test_ai_insight_routes_are_registered(path):
    routes = _registered_routes(main_module.app)
    ai_routes = sorted(f"{method} {found}" for method, found in routes if found.startswith("/api/ai"))
    assert ("POST", path) in routes, f"POST {path} is not registered; /api/ai routes: {ai_routes}"


def test_no_route_path_names_the_retired_provider():
    routes = _registered_routes(main_module.app)
    offending = sorted(f"{method} {path}" for method, path in routes if RETIRED_NAME.search(path))
    assert not offending, f"Routes still carry the retired provider's name: {offending}"


def test_health_reports_the_anthropic_probe_without_the_raw_key(monkeypatch):
    import startup_validation

    raw_key = "sk-ant-regression-key-9876"
    probe_state = {
        "status": "auth_failed",
        "key_suffix": startup_validation.compute_key_fingerprint(raw_key),
        "checked_at": "2026-10-12T00:00:00+00:00",
    }
    assert probe_state["key_suffix"] == "****9876", "the key fingerprint must be the masked last four characters"
    monkeypatch.setenv("ANTHROPIC_API_KEY", raw_key)
    monkeypatch.setattr(startup_validation, "cached_anthropic_auth_state", probe_state)

    response = TestClient(main_module.app).get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body.get("anthropic") == probe_state, f"/health 'anthropic' block is {body.get('anthropic')!r}"
    assert set(body["anthropic"]) == {"status", "key_suffix", "checked_at"}
    assert raw_key not in response.text, "/health leaked the raw API key"
    assert not [key for key in body if RETIRED_NAME.search(key)], f"/health still has a retired-provider key: {sorted(body)}"


def test_health_anthropic_block_defaults_to_unchecked_before_any_probe(monkeypatch):
    import startup_validation

    monkeypatch.setattr(startup_validation, "cached_anthropic_auth_state", {})

    body = TestClient(main_module.app).get("/health").json()

    assert body.get("anthropic") == {"status": "unchecked", "key_suffix": "****", "checked_at": None}


# ─── 6. Dependency guard ─────────────────────────────────────────────────────────────────────────


def _requirement_lines() -> list[str]:
    stripped = (line.strip() for line in REQUIREMENTS.read_text(encoding="utf-8").splitlines())
    return [line for line in stripped if line and not line.startswith("#")]


def test_requirements_pin_the_anthropic_sdk():
    pins = [line for line in _requirement_lines() if re.match(r"anthropic\s*>=", line, re.IGNORECASE)]
    assert pins, "backend/requirements.txt must contain an 'anthropic>=<version>' line"


def test_requirements_drop_the_openai_sdk():
    names = [re.split(r"[<>=!~\[;\s]", line, maxsplit=1)[0].lower() for line in _requirement_lines()]
    assert "openai" not in names, "backend/requirements.txt still installs the retired openai SDK"
