from routes.ai_monitoring import _aggregate_summary


def test_monitoring_summary_does_not_expose_rejected_top_level_utc_telemetry():
    summary = _aggregate_summary()["summary"]

    rejected_fields = {"dailyQuestionCount", "averageLatencyMs", "successRate"}
    assert rejected_fields.isdisjoint(summary)
