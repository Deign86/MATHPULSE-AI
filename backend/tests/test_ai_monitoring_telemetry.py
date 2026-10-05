from routes.ai_monitoring import _monitoring_telemetry


def test_monitoring_telemetry_returns_daily_count_latency_and_success_rate():
    metrics = {
        "requests_today": 12,
        "metrics_date_utc": "2026-10-05",
        "requests_total": 20,
        "requests_ok": 18,
        "avg_latency_ms": 325.4,
    }

    assert _monitoring_telemetry(metrics, "2026-10-05") == {
        "dailyQuestionCount": 12,
        "averageLatencyMs": 325.4,
        "successRate": 0.9,
    }


def test_monitoring_telemetry_safely_handles_missing_or_stale_counters():
    assert _monitoring_telemetry({"requests_today": 9, "metrics_date_utc": "2026-10-04"}, "2026-10-05") == {
        "dailyQuestionCount": 0,
        "averageLatencyMs": 0,
        "successRate": 0.0,
    }
