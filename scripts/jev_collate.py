"""Claude collation ledger for GitHub issues #150-164 (plan todo 2).

Single clean script (Ponytail: no orchestration framework), one structured Claude call per judgment:
  area      -> one label from five areas (hierarchical classification pattern)
  severity/repro/reach -> three ordinal levels in one call; weights applied in code
             (composite scoring pattern)
  duplicate -> 3-level pairwise verdict, ONLY for prefiltered candidates
             (entity alignment pattern)
  urgent    -> probability the issue is in the fix-first set (rerank pattern)
  confidence gating -> curator queue (level/area confidence < 0.7, urgent probability 0.3-0.7)

Usage: python scripts/jev_collate.py --issues 150-164
Writes: artifacts/e2e/jev-collation-ledger.md + raw JSON (--raw-out).
Reads ANTHROPIC_API_KEY from the environment only; never prints it.
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import subprocess
import sys
import time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "backend"))

from services.ai_client import CHAT_MODEL, complete_json  # noqa: E402

CALL_TIMEOUT = 60.0  # hung-command probe: every Claude call bounded, latency recorded

TRIAGE_QUERY = "game-breaking battle bugs and login safety first"

AREA_CRITERIA = {
    "battle": "real-time Quiz Battle gameplay, scoring, rounds, matchmaking, timers",
    "auth-security": "login, credentials, roles, Firestore rules, secrets, PII/telemetry exposure",
    "backend-data": "FastAPI routes, RAG retrieval, memory service, CORS, backend errors (5xx/503)",
    "ux-frontend": "dashboard sync, modals, routing, calculator, chat UI, notifications display",
    "config-dev": "env wiring, hosts/URLs, build gates, meta tags, dev-only setup",
}

SEVERITY_LEVELS = [
    "cosmetic or hygiene nit; no user impact",
    "minor UX papercut; easy workaround exists",
    "feature degraded; workaround painful or partial",
    "core flow broken or real security weakness; no workaround",
    "game-breaking, data-loss, or exploitable security hole; needs immediate fix",
]
REPRO_LEVELS = [
    "vague; no steps to reproduce",
    "steps or partial evidence given",
    "exact repro plus logs, request IDs, or screenshots",
]
REACH_LEVELS = [
    "single edge case",
    "subset of one role",
    "whole role or multiple surfaces",
    "all users, or security-wide exposure",
]
DUPE_LEVELS = [
    "unrelated: different problems, different fixes",
    "related: same area, but distinct fixes required",
    "duplicate: same root cause; one fix closes both",
]

# Plan wave per issue (.omo/plans/jev-issues-collation-fix-session.md dependency matrix)
PLAN_WAVE = {154: 1, 155: 1, 161: 2, 160: 2, 163: 2, 156: 2, 157: 2,
             158: 3, 162: 3, 164: 3, 150: 3, 151: 4, 152: 4, 153: 4, 159: 4}

STOPWORDS = set("the a an and or of to in on for with is are was were be by as at from that this it its into over under than then so such no not all any each per via vs".split())

NUMBER = {"type": "number"}


def strict_schema(**properties: dict) -> dict:
    """Structured outputs need closed objects: additionalProperties false and every key required."""
    return {"type": "object", "properties": properties, "required": list(properties),
            "additionalProperties": False}


def rating_schema(levels: list[str]) -> dict:
    return strict_schema(score={"type": "integer", "enum": list(range(len(levels)))},
                         confidence=NUMBER)


def levels_text(levels: list[str]) -> str:
    return "\n".join(f"{level} {meaning}" for level, meaning in enumerate(levels))


AREA_SYSTEM = ("Which single area does this GitHub issue belong to? Give the area and your "
               "confidence from 0 to 1.\n"
               + "\n".join(f"- {name}: {meaning}" for name, meaning in AREA_CRITERIA.items()))
AREA_SCHEMA = strict_schema(area={"type": "string", "enum": list(AREA_CRITERIA)},
                            confidence=NUMBER)

COMPOSITE_SYSTEM = (
    "Rate this GitHub issue on three scales. For each, give the level number and your "
    "confidence from 0 to 1.\n"
    f"severity (how severe is this issue?):\n{levels_text(SEVERITY_LEVELS)}\n"
    f"repro (how reproducible is this issue from the report?):\n{levels_text(REPRO_LEVELS)}\n"
    f"reach (how many users does this issue reach?):\n{levels_text(REACH_LEVELS)}")
COMPOSITE_SCHEMA = strict_schema(severity=rating_schema(SEVERITY_LEVELS),
                                 repro=rating_schema(REPRO_LEVELS),
                                 reach=rating_schema(REACH_LEVELS))

URGENT_SYSTEM = (
    "Given the triage query, is this issue in the fix-first set? Give the probability from 0 to 1.\n"
    "- High: game-breaking battle defect or login/security risk matching the triage query\n"
    "- Low: hygiene, minor UX, or dev-setup issue that can wait behind fix-first items")
URGENT_SCHEMA = strict_schema(urgent_probability=NUMBER)

DUPE_SYSTEM = ("Are these two issues duplicates of each other? Give the level number and your "
               f"confidence from 0 to 1.\n{levels_text(DUPE_LEVELS)}")
DUPE_SCHEMA = rating_schema(DUPE_LEVELS)


def tokens(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {w for w in words if w not in STOPWORDS and len(w) > 2}


def parse_range(spec: str) -> list[int]:
    lo, hi = spec.split("-")
    return list(range(int(lo), int(hi) + 1))


def load_issue(num: int) -> tuple[dict, str]:
    """Load one issue via gh (live). Returns (data, source)."""
    proc = subprocess.run(
        ["gh", "issue", "view", str(num), "--json", "number,title,body,labels,state"],
        capture_output=True, timeout=CALL_TIMEOUT, cwd=REPO)
    if proc.returncode != 0:
        raise RuntimeError(f"gh issue view {num} failed: {proc.stderr.decode()[:300]}")
    data = json.loads(proc.stdout.decode("utf-8"))
    return data, "gh-live"


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def candidate_pairs(issues: dict[int, dict]) -> list[tuple[int, int, float]]:
    toks = {n: tokens(d["title"]) | tokens(d["title"]) | tokens(d.get("body") or "")
            for n, d in issues.items()}
    pairs = []
    nums = sorted(issues)
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            sim = jaccard(toks[nums[i]], toks[nums[j]])
            if sim >= 0.15:
                pairs.append((nums[i], nums[j], round(sim, 3)))
    pairs.sort(key=lambda p: -p[2])
    return pairs[:12]


def timed(system: str, state: dict, schema: dict, tag: str, log: list[dict]) -> dict:
    t0 = time.time()
    try:
        answers = complete_json(
            [{"role": "system", "content": system},
             {"role": "user", "content": json.dumps(state, ensure_ascii=False)}],
            schema=schema, model=CHAT_MODEL, max_tokens=512, timeout=CALL_TIMEOUT)
    except Exception as exc:  # fail loudly: no offline fallback for collation
        log.append({"tag": tag, "ok": False, "error": type(exc).__name__,
                    "latency_ms": round((time.time() - t0) * 1000, 1)})
        raise
    latency = round((time.time() - t0) * 1000, 1)
    log.append({"tag": tag, "ok": True, "model": CHAT_MODEL,
                "latency_ms": latency, "answers": answers})
    return answers


def priority_of(composite: float) -> str:
    if composite >= 0.65:
        return "P0"
    if composite >= 0.40:
        return "P1"
    return "P2"


def assign_wave(area: str, priority: str) -> int:
    if area == "battle":
        return 1
    if priority == "P0":
        return 2
    if area in ("auth-security", "backend-data"):
        return 2
    if priority == "P1":
        return 3
    return 4


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--issues", default="150-164")
    ap.add_argument("--out", default="artifacts/e2e/jev-collation-ledger.md")
    ap.add_argument("--raw-out",
                    default=".omo/evidence/task-2-jev-raw.json")
    args = ap.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("auth: missing ANTHROPIC_API_KEY", file=sys.stderr)
        return 2
    nums = parse_range(args.issues)
    call_log: list[dict] = []

    issues: dict[int, dict] = {}
    sources: dict[int, str] = {}
    for n in nums:
        data, src = load_issue(n)
        issues[n] = data
        sources[n] = src
    print(f"loaded {len(issues)} issues from gh-live")

    rows: dict[int, dict] = {}
    for n in nums:
        d = issues[n]
        body = (d.get("body") or "")[:3000]
        state = {"number": n, "title": d["title"], "body": body}
        area_ans = timed(AREA_SYSTEM, state, AREA_SCHEMA, f"area-{n}", call_log)
        comp = timed(COMPOSITE_SYSTEM, state, COMPOSITE_SCHEMA, f"composite-{n}", call_log)
        sev = comp["severity"]["score"] / 4
        rep = comp["repro"]["score"] / 2
        rea = comp["reach"]["score"] / 3
        composite = round(0.5 * sev + 0.25 * rep + 0.25 * rea, 3)
        rank_ans = timed(URGENT_SYSTEM,
                         {"triage_query": TRIAGE_QUERY,
                          "issue_title": d["title"], "issue_body": body},
                         URGENT_SCHEMA, f"urgent-{n}", call_log)
        rows[n] = {
            "title": d["title"], "area": area_ans["area"],
            "area_conf": area_ans["confidence"],
            "severity": comp["severity"]["score"],
            "severity_conf": comp["severity"]["confidence"],
            "repro": comp["repro"]["score"], "repro_conf": comp["repro"]["confidence"],
            "reach": comp["reach"]["score"], "reach_conf": comp["reach"]["confidence"],
            "composite": composite, "priority": priority_of(composite),
            "urgent": round(rank_ans["urgent_probability"], 3),
        }
        rows[n]["wave"] = assign_wave(rows[n]["area"], rows[n]["priority"])
        print(f"#{n} area={rows[n]['area']} sev={rows[n]['severity']} "
              f"comp={composite} pri={rows[n]['priority']} "
              f"urgent={rows[n]['urgent']} wave={rows[n]['wave']}")

    pairs = candidate_pairs(issues)
    print(f"prefilter: {len(pairs)} candidate pairs (jaccard>=0.15, cap 12)")
    dupes: list[dict] = []
    for a, b, sim in pairs:
        ans = timed(DUPE_SYSTEM,
                    {"issue_a": f"#{a} {issues[a]['title']}\n"
                                f"{(issues[a].get('body') or '')[:1500]}",
                     "issue_b": f"#{b} {issues[b]['title']}\n"
                                f"{(issues[b].get('body') or '')[:1500]}"},
                    DUPE_SCHEMA, f"dupe-{a}-{b}", call_log)
        level = ans["score"]
        dupes.append({"a": a, "b": b, "jaccard": sim, "level": level,
                      "label": DUPE_LEVELS[level], "confidence": ans["confidence"]})
        print(f"pair #{a}-#{b} sim={sim} level={level} "
              f"conf={ans['confidence']}")

    true_dupes = [d for d in dupes if d["level"] == 2 and d["confidence"] >= 0.7]

    curator: list[dict] = []
    for n in nums:
        r = rows[n]
        reasons = []
        if r["area_conf"] < 0.7:
            reasons.append(f"area confidence {r['area_conf']}")
        for dim in ("severity", "repro", "reach"):
            if r[f"{dim}_conf"] < 0.7:
                reasons.append(f"{dim} confidence {r[f'{dim}_conf']}")
        if 0.3 <= r["urgent"] <= 0.7:
            reasons.append(f"urgent probability {r['urgent']} in uncertain band")
        if r["wave"] != PLAN_WAVE.get(n):
            reasons.append(f"wave {r['wave']} differs from plan wave "
                           f"{PLAN_WAVE.get(n)} -> plan wins pending review")
        if reasons:
            curator.append({"issue": n, "reasons": reasons,
                            "disposition": "plan wave stands; human confirms "
                                           "at fix time" if r["wave"] != PLAN_WAVE.get(n)
                            else "accept Claude values; low risk to ordering"})

    order = sorted(nums, key=lambda n: (rows[n]["wave"], -rows[n]["composite"],
                                        -rows[n]["urgent"]))
    total_lat = sum(e["latency_ms"] for e in call_log)
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    lines = [f"# Collation Ledger — issues {args.issues}",
             f"_Live Claude run {now}; model `{CHAT_MODEL}`; "
             f"{len(call_log)} Claude calls, {round(total_lat/1000,1)}s total; "
             "key via env only, never logged._", "",
             "## Per-issue verdicts",
             "| # | Title | Area (conf) | Sev | Repro | Reach | Composite | Pri | "
             "Urgent | Wave | Plan |",
             "|---|-------|-------------|-----|-------|-------|-----------|-----|--------|------|------|"]
    for n in nums:
        r = rows[n]
        agree = "match" if r["wave"] == PLAN_WAVE.get(n) else "DIFF->curator"
        lines.append(f"| {n} | {r['title']} | {r['area']} ({r['area_conf']}) | "
                     f"{r['severity']} | {r['repro']} | {r['reach']} | "
                     f"{r['composite']} | {r['priority']} | {r['urgent']} | "
                     f"{r['wave']} | {agree} |")
    lines += ["", "## Duplicate verdicts",
              f"Prefilter (deterministic token Jaccard>=0.15): {len(pairs)} pairs "
              "scored with 3-level pairwise verdicts; all other pairs verdict=0 "
              "(unrelated, no Claude call needed).",
              f"**True duplicates: {len(true_dupes)}** "
              "(level=2 with confidence>=0.7)."]
    for d in dupes:
        lines.append(f"- #{d['a']} x #{d['b']}: jaccard={d['jaccard']} "
                     f"level={d['level']} ({d['label']}) conf={d['confidence']}")
    lines += ["", "## Final execution wave order (wave, composite desc, urgent desc)"]
    for n in order:
        r = rows[n]
        lines.append(f"{order.index(n)+1}. Wave {r['wave']} — #{n} {r['title']} "
                     f"[{r['priority']}/{r['area']}, comp={r['composite']}, "
                     f"urgent={r['urgent']}]")
    lines += ["", "## Curator queue "
                   "(confidence<0.7, urgent probability 0.3-0.7, or wave diff)"]
    if curator:
        for c in curator:
            lines.append(f"- #{c['issue']}: {'; '.join(c['reasons'])} "
                         f"-> disposition: {c['disposition']}")
    else:
        lines.append("Empty — all confidences high and all waves match plan.")
    lines += ["", "## Patterns applied",
              "- hierarchical classification: one label over 5 areas",
              "- composite scoring: severity+repro+reach normalized 0-1, "
              "weights 0.5/0.25/0.25 in code",
              "- entity alignment: pairwise 3-level verdict on prefiltered pairs only",
              "- rerank: one urgent probability per issue vs the triage query, "
              "sort by urgent",
              "- confidence gating: confidence<0.7 or urgent probability in 0.3-0.7 "
              "goes to the curator queue; raw answers in "
              ".omo/evidence/task-2-jev-raw.json",
              ""]
    out_path = os.path.join(REPO, args.out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    raw_path = os.path.join(REPO, args.raw_out)
    os.makedirs(os.path.dirname(raw_path), exist_ok=True)
    with open(raw_path, "w", encoding="utf-8") as fh:
        json.dump({"model": CHAT_MODEL, "issues": args.issues, "run_utc": now,
                   "sources": {str(k): v for k, v in sources.items()},
                   "rows": rows, "dupes": dupes, "true_dupes": true_dupes,
                   "curator": curator, "order": order, "calls": call_log},
                  fh, indent=1)
    print(f"ledger -> {out_path}")
    print(f"raw -> {raw_path}")
    print(f"calls={len(call_log)} model={CHAT_MODEL} "
          f"total_latency_s={round(total_lat/1000,1)} curator={len(curator)} "
          f"true_dupes={len(true_dupes)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
