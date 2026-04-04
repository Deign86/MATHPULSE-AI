from __future__ import annotations

import re
import subprocess
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

from huggingface_hub import HfApi
from huggingface_hub.utils import HfHubHTTPError, RepositoryNotFoundError


TransportFn = Callable[[str, Dict[str, Any]], Dict[str, Any]]


@dataclass
class MCPResult:
    ok: bool
    payload: Dict[str, Any]
    error: Optional[str] = None
    retriable: bool = False
    source: str = "unknown"


class HuggingFaceMCPClient:
    """MCP-first helper with HF Hub fallback for repository preflight checks."""

    _REPO_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._-]{1,95}$")

    def __init__(self, token: str = "", transport: Optional[TransportFn] = None) -> None:
        self._transport = transport
        self._api = HfApi(token=token.strip() or None)

    def _transport_call(self, operation: str, payload: Dict[str, Any]) -> MCPResult:
        if not self._transport:
            return MCPResult(
                ok=False,
                payload={},
                error="No Hugging Face MCP transport configured.",
                retriable=False,
                source="hf_mcp_stub",
            )

        try:
            raw = self._transport(operation, payload)
        except Exception as exc:  # pragma: no cover - defensive wrapper
            return MCPResult(
                ok=False,
                payload={},
                error=f"HF MCP transport failed: {exc}",
                retriable=True,
                source="hf_mcp_transport",
            )

        return MCPResult(
            ok=bool(raw.get("ok", False)),
            payload=dict(raw.get("payload", {})),
            error=raw.get("error"),
            retriable=bool(raw.get("retriable", False)),
            source=str(raw.get("source", "hf_mcp_transport")),
        )

    def validate_repo_name(self, repo_id: str) -> MCPResult:
        repo_id = repo_id.strip()
        is_valid = bool(self._REPO_ID_PATTERN.match(repo_id))
        return MCPResult(
            ok=True,
            payload={"repo_id": repo_id, "is_valid": is_valid},
            source="local_validation",
        )

    def verify_repo_exists(self, repo_id: str, repo_type: str = "model") -> MCPResult:
        mcp_result = self._transport_call("hf.repo_exists", {"repo_id": repo_id, "repo_type": repo_type})
        if mcp_result.ok:
            return mcp_result

        try:
            info = self._api.repo_info(repo_id=repo_id, repo_type=repo_type)
            return MCPResult(
                ok=True,
                payload={
                    "repo_id": repo_id,
                    "exists": True,
                    "private": bool(getattr(info, "private", False)),
                    "sha": getattr(info, "sha", ""),
                },
                source="hf_hub_fallback",
            )
        except RepositoryNotFoundError:
            return MCPResult(
                ok=True,
                payload={"repo_id": repo_id, "exists": False},
                source="hf_hub_fallback",
            )
        except HfHubHTTPError as exc:
            return MCPResult(
                ok=False,
                payload={"repo_id": repo_id},
                error=f"Hub check failed: {exc}",
                retriable=True,
                source="hf_hub_fallback",
            )

    def inspect_repo_metadata(self, repo_id: str, repo_type: str = "model") -> MCPResult:
        mcp_result = self._transport_call("hf.repo_metadata", {"repo_id": repo_id, "repo_type": repo_type})
        if mcp_result.ok:
            return mcp_result

        try:
            info = self._api.repo_info(repo_id=repo_id, repo_type=repo_type)
            return MCPResult(
                ok=True,
                payload={
                    "repo_id": repo_id,
                    "private": bool(getattr(info, "private", False)),
                    "sha": getattr(info, "sha", ""),
                    "last_modified": str(getattr(info, "last_modified", "")),
                    "downloads": getattr(info, "downloads", None),
                    "likes": getattr(info, "likes", None),
                },
                source="hf_hub_fallback",
            )
        except Exception as exc:  # pragma: no cover - defensive wrapper
            return MCPResult(
                ok=False,
                payload={"repo_id": repo_id},
                error=f"Unable to inspect metadata: {exc}",
                retriable=True,
                source="hf_hub_fallback",
            )

    def inspect_repo_files(self, repo_id: str, repo_type: str = "model") -> MCPResult:
        mcp_result = self._transport_call("hf.repo_files", {"repo_id": repo_id, "repo_type": repo_type})
        if mcp_result.ok:
            return mcp_result

        try:
            info = self._api.repo_info(repo_id=repo_id, repo_type=repo_type)
            siblings = getattr(info, "siblings", []) or []
            files = [getattr(item, "rfilename", "") for item in siblings if getattr(item, "rfilename", "")]
            return MCPResult(
                ok=True,
                payload={"repo_id": repo_id, "files": files, "file_count": len(files)},
                source="hf_hub_fallback",
            )
        except Exception as exc:  # pragma: no cover - defensive wrapper
            return MCPResult(
                ok=False,
                payload={"repo_id": repo_id, "files": []},
                error=f"Unable to inspect files: {exc}",
                retriable=True,
                source="hf_hub_fallback",
            )

    def lookup_publish_resources(self) -> MCPResult:
        mcp_result = self._transport_call("hf.publish_docs", {})
        if mcp_result.ok:
            return mcp_result

        resources = [
            {
                "title": "Upload files to the Hub",
                "url": "https://huggingface.co/docs/huggingface_hub/guides/upload",
            },
            {
                "title": "Hugging Face CLI reference",
                "url": "https://huggingface.co/docs/huggingface_hub/guides/cli",
            },
            {
                "title": "Model cards",
                "url": "https://huggingface.co/docs/hub/model-cards",
            },
        ]
        return MCPResult(ok=True, payload={"resources": resources}, source="static_fallback")


class KaggleMCPClient:
    """Kaggle MCP helper placeholder for monitoring kernel runs."""

    def __init__(self, transport: Optional[TransportFn] = None) -> None:
        self._transport = transport

    @property
    def is_available(self) -> bool:
        return self._transport is not None

    def _call(self, operation: str, payload: Dict[str, Any]) -> MCPResult:
        if not self._transport:
            return MCPResult(
                ok=False,
                payload={},
                error="No Kaggle MCP transport configured.",
                retriable=False,
                source="kaggle_mcp_stub",
            )

        try:
            raw = self._transport(operation, payload)
        except Exception as exc:  # pragma: no cover - defensive wrapper
            return MCPResult(
                ok=False,
                payload={},
                error=f"Kaggle MCP transport failed: {exc}",
                retriable=True,
                source="kaggle_mcp_transport",
            )

        return MCPResult(
            ok=bool(raw.get("ok", False)),
            payload=dict(raw.get("payload", {})),
            error=raw.get("error"),
            retriable=bool(raw.get("retriable", False)),
            source=str(raw.get("source", "kaggle_mcp_transport")),
        )

    def check_run_status(self, kernel_ref: str) -> MCPResult:
        return self._call("kaggle.kernel_status", {"kernel_ref": kernel_ref})

    def confirm_run_started(self, kernel_ref: str) -> MCPResult:
        return self._call("kaggle.run_started", {"kernel_ref": kernel_ref})

    def read_logs(self, kernel_ref: str) -> MCPResult:
        return self._call("kaggle.run_logs", {"kernel_ref": kernel_ref})

    def list_outputs(self, kernel_ref: str) -> MCPResult:
        return self._call("kaggle.run_outputs", {"kernel_ref": kernel_ref})

    def confirm_merge_completed(self, kernel_ref: str, merged_folder: str) -> MCPResult:
        return self._call(
            "kaggle.merge_completed",
            {"kernel_ref": kernel_ref, "merged_folder": merged_folder},
        )

    def confirm_upload_succeeded(self, kernel_ref: str) -> MCPResult:
        return self._call("kaggle.upload_succeeded", {"kernel_ref": kernel_ref})


def _parse_kaggle_status_text(raw: str) -> str:
    lowered = raw.lower()
    explicit = re.search(r"\b(status|state)\s*[:=]\s*([a-z_\-]+)", lowered)
    if explicit:
        return explicit.group(2)

    for token in ["complete", "completed", "running", "queued", "pending", "starting", "failed", "error"]:
        if token in lowered:
            return token
    return "unknown"


def _kaggle_cli_status(kernel_id: str) -> MCPResult:
    proc = subprocess.run(
        ["kaggle", "kernels", "status", kernel_id],
        check=False,
        text=True,
        capture_output=True,
    )
    raw = f"{proc.stdout}\n{proc.stderr}".strip()
    return MCPResult(
        ok=proc.returncode == 0,
        payload={
            "kernel_id": kernel_id,
            "status": _parse_kaggle_status_text(raw),
            "raw": raw,
        },
        error=None if proc.returncode == 0 else "kaggle kernels status failed",
        retriable=True,
        source="kaggle_cli_fallback",
    )


def hf_mcp_check_repo_exists(
    repo_id: str,
    repo_type: str = "model",
    client: Optional[HuggingFaceMCPClient] = None,
    token: str = "",
) -> MCPResult:
    hf_client = client or HuggingFaceMCPClient(token=token)
    return hf_client.verify_repo_exists(repo_id=repo_id, repo_type=repo_type)


def hf_mcp_get_repo_metadata(
    repo_id: str,
    repo_type: str = "model",
    client: Optional[HuggingFaceMCPClient] = None,
    token: str = "",
) -> MCPResult:
    hf_client = client or HuggingFaceMCPClient(token=token)
    return hf_client.inspect_repo_metadata(repo_id=repo_id, repo_type=repo_type)


def hf_mcp_search_docs(
    query: str,
    client: Optional[HuggingFaceMCPClient] = None,
    token: str = "",
) -> MCPResult:
    hf_client = client or HuggingFaceMCPClient(token=token)
    resources_result = hf_client.lookup_publish_resources()
    if not resources_result.ok:
        return resources_result

    resources = list(resources_result.payload.get("resources", []))
    q = query.strip().lower()
    if not q:
        return MCPResult(
            ok=True,
            payload={"query": query, "resources": resources, "filtered_count": len(resources), "total_count": len(resources)},
            source=resources_result.source,
        )

    filtered = [
        item
        for item in resources
        if q in str(item.get("title", "")).lower() or q in str(item.get("url", "")).lower()
    ]
    return MCPResult(
        ok=True,
        payload={
            "query": query,
            "resources": filtered if filtered else resources,
            "filtered_count": len(filtered),
            "total_count": len(resources),
        },
        source=resources_result.source,
    )


def kaggle_mcp_get_run_status(
    kernel_id: str,
    client: Optional[KaggleMCPClient] = None,
) -> MCPResult:
    kaggle_client = client or KaggleMCPClient(transport=None)
    mcp_result = kaggle_client.check_run_status(kernel_id)
    if mcp_result.ok and mcp_result.payload.get("status"):
        return mcp_result
    return _kaggle_cli_status(kernel_id)


def kaggle_mcp_get_run_logs(
    kernel_id: str,
    client: Optional[KaggleMCPClient] = None,
) -> MCPResult:
    kaggle_client = client or KaggleMCPClient(transport=None)
    mcp_result = kaggle_client.read_logs(kernel_id)
    if mcp_result.ok:
        return mcp_result

    cli_status = _kaggle_cli_status(kernel_id)
    if cli_status.ok:
        return MCPResult(
            ok=True,
            payload={
                "kernel_id": kernel_id,
                "status": cli_status.payload.get("status", "unknown"),
                "log_summary": cli_status.payload.get("raw", ""),
            },
            source=cli_status.source,
        )

    return MCPResult(
        ok=False,
        payload={"kernel_id": kernel_id},
        error=mcp_result.error or cli_status.error or "Unable to fetch Kaggle logs.",
        retriable=True,
        source="kaggle_mcp_wrapper",
    )


def kaggle_mcp_wait_until_done(
    kernel_id: str,
    poll_interval: int = 60,
    timeout_minutes: int = 240,
    client: Optional[KaggleMCPClient] = None,
) -> MCPResult:
    kaggle_client = client or KaggleMCPClient(transport=None)
    started = time.time()
    timeout_seconds = max(1, timeout_minutes) * 60
    history = []

    while True:
        status_result = kaggle_mcp_get_run_status(kernel_id, client=kaggle_client)
        status = str(status_result.payload.get("status", "unknown")).lower()
        history.append({"status": status, "source": status_result.source, "timestamp": int(time.time())})

        if status in {"complete", "completed"}:
            return MCPResult(
                ok=True,
                payload={"kernel_id": kernel_id, "status": "completed", "history": history},
                source=status_result.source,
            )

        if status in {"failed", "error"}:
            logs_result = kaggle_mcp_get_run_logs(kernel_id, client=kaggle_client)
            return MCPResult(
                ok=False,
                payload={
                    "kernel_id": kernel_id,
                    "status": status,
                    "history": history,
                    "logs": logs_result.payload,
                },
                error=f"Kaggle kernel ended with status '{status}'.",
                retriable=False,
                source=status_result.source,
            )

        if time.time() - started > timeout_seconds:
            return MCPResult(
                ok=False,
                payload={"kernel_id": kernel_id, "status": "timeout", "history": history},
                error="Timed out waiting for Kaggle kernel completion.",
                retriable=True,
                source=status_result.source,
            )

        time.sleep(max(10, poll_interval))
