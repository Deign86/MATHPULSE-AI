from datetime import datetime, timezone
from unittest.mock import Mock
from zoneinfo import ZoneInfo

from routes import ai_monitoring
from services.inference_client import InferenceClient


class FakeSnapshot:
    def __init__(self, payload):
        self.payload = payload

    def to_dict(self):
        return self.payload


def test_daily_telemetry_uses_manila_days_and_documented_denominators(monkeypatch):
    manila = ZoneInfo("Asia/Manila")
    now = datetime(2025, 2, 1, 0, 0, tzinfo=manila)
    docs = [
        FakeSnapshot({"timestamp": datetime(2025, 1, 31, 15, 59, tzinfo=timezone.utc), "status": "success", "latencyMs": 100}),
        FakeSnapshot({"timestamp": datetime(2025, 1, 31, 16, 0, tzinfo=timezone.utc), "status": "error", "latencyMs": 900}),
        FakeSnapshot({"timestamp": datetime(2025, 1, 31, 17, 0, tzinfo=timezone.utc), "status": "success", "latencyMs": 300}),
    ]
    collection = Mock()
    collection.where.return_value.where.return_value.stream.return_value = docs
    firestore = Mock()
    firestore.collection.return_value = collection
    monkeypatch.setattr(ai_monitoring, "_get_firestore_client", lambda: firestore)
    monkeypatch.setattr(ai_monitoring, "_now", lambda: now)

    telemetry = ai_monitoring._aggregate_telemetry()

    recent_days = [day for day in telemetry["dailyMetrics"] if day["date"] in {"2025-01-31", "2025-02-01"}]
    assert recent_days == [
        {"date": "2025-01-31", "totalAttempts": 1, "successfulAttempts": 1, "completedRequests": 1, "averageLatencyMs": 100.0, "successRate": 100.0},
        {"date": "2025-02-01", "totalAttempts": 2, "successfulAttempts": 1, "completedRequests": 1, "averageLatencyMs": 300.0, "successRate": 50.0},
    ]
    assert telemetry["totalAttempts"] == 3
    assert telemetry["successfulAttempts"] == 2
    assert telemetry["completedRequests"] == 2
    assert telemetry["averageLatencyMs"] == 200.0
    assert telemetry["successRate"] == 66.7


def test_daily_telemetry_returns_empty_metrics_without_firestore(monkeypatch):
    monkeypatch.setattr(ai_monitoring, "_get_firestore_client", lambda: None)
    telemetry = ai_monitoring._aggregate_telemetry()

    assert telemetry["totalAttempts"] == 0
    assert telemetry["successfulAttempts"] == 0
    assert telemetry["completedRequests"] == 0
    assert telemetry["averageLatencyMs"] is None
    assert telemetry["successRate"] is None
    assert telemetry["dailyMetrics"]
    assert all(day["totalAttempts"] == 0 for day in telemetry["dailyMetrics"])


def test_generation_attempt_collector_persists_pending_then_completed_status():
    document = Mock()
    firestore = Mock()
    firestore.collection.return_value.add.return_value = (None, document)
    client = InferenceClient(firestore_client=firestore)

    telemetry_document = client._record_attempt(
        task_type="chat", provider="deepseek", route="deepseek", fallback_depth=0
    )
    client._finish_telemetry_attempt(telemetry_document, status="success", latency_ms=250.456)

    firestore.collection.assert_any_call("ai_usage_logs")
    firestore.collection.return_value.add.assert_called_once()
    event = firestore.collection.return_value.add.call_args.args[0]
    assert event["status"] == "pending"
    assert event["latencyMs"] is None
    document.update.assert_called_once_with({"status": "success", "latencyMs": 250.46})
