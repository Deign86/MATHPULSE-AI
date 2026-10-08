from routes.ai_monitoring import COST_TRACKING_NOTE, _aggregate_summary


def test_monitoring_summary_does_not_expose_rejected_top_level_utc_telemetry():
    summary = _aggregate_summary()["summary"]

    rejected_fields = {"dailyQuestionCount", "averageLatencyMs", "successRate"}
    assert rejected_fields.isdisjoint(summary)


def test_monitoring_summary_reports_measured_requests_and_null_cost_figures():
    telemetry = {"totalAttempts": 10, "requestsByTaskType": {"quiz_generation": 3, "chat": 7}}

    aggregated = _aggregate_summary(telemetry)
    summary = aggregated["summary"]

    assert [f["featureId"] for f in aggregated["features"]] == ["chat", "quiz_generation"]
    chat = aggregated["features"][0]
    assert chat["featureName"] == "AI Chat Tutor"
    assert chat["totalRequests"] == 7
    assert chat["requestShare"] == 70.0
    assert chat["isMostActive"] is True
    assert chat["monthlyCost"] is None and chat["cacheHitRate"] is None
    assert summary["totalUsage"] == 10
    assert summary["monthlyCost"] is None
    assert summary["costBreakdown"] is None
    assert summary["cacheHitRate"] is None
    assert summary["costTrackingNote"] == COST_TRACKING_NOTE
