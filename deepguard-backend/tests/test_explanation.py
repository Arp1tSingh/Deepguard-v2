"""Tests for build_explanation() — pure-function checks, no models needed.

Run from deepguard-backend/:  python3 tests/test_explanation.py
Exit code is non-zero on the first failure.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analysis import build_explanation  # noqa: E402

PASS = []
FAIL = []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(("PASS " if cond else "FAIL ") + name)


def make_inputs(n_valid=4, n_skipped=1):
    idx = list(range(n_valid))
    recs = [
        {"index": i, "timestamp": f"00:{i * 2:02d}"} for i in idx
    ] + [
        {"index": n_valid + j, "timestamp": f"00:{(n_valid + j) * 2:02d}"}
        for j in range(n_skipped)
    ]
    scores = {
        "xception": {i: v for i, v in zip(idx, [0.2, 0.4, 0.9, 0.7][:n_valid])},
        "spsl": {i: v for i, v in zip(idx, [0.3, 0.5, 0.8, 0.6][:n_valid])},
        "ucf": {i: v for i, v in zip(idx, [0.1, 0.3, 0.7, 0.5][:n_valid])},
    }
    means = {k: sum(v.values()) / len(v) for k, v in scores.items()}
    faith = {
        k: {"frame_index": 2, "base_score": 90.0, "masked_score": 50.0, "drop": 40.0}
        for k in scores
    }
    mean_all = sum(means.values()) / 3
    return recs, idx, scores, means, faith, mean_all


recs, idx, scores, means, faith, mean_all = make_inputs()
exp = build_explanation(idx, recs, scores, means, faith,
                        "fake", mean_all, "mixed", 0.2)

check("summary counts analyzed frames", exp["summary"]["frames_analyzed"] == 4)
check("summary counts skipped frames", exp["summary"]["frames_skipped"] == 1)
check("summary confidence matches mean",
      exp["summary"]["confidence"] == round(mean_all * 100, 1))
check("key frame is top xception frame",
      exp["key_frames"][0]["index"] == 2 and exp["key_frames"][0]["score"] == 90.0)
check("two key frames reported", len(exp["key_frames"]) == 2)
check("trend rising on climbing series", exp["trend"]["direction"] == "rising")
check("outlier is farthest-from-mean model",
      exp["spread_detail"]["outlier_key"] == max(
          means, key=lambda k: abs(means[k] - mean_all)))
check("faithfulness drop carried through",
      exp["models"][0]["faithfulness_drop"] == 40.0)
check("three caveats present", len(exp["caveats"]) == 3)
check("model std non-negative",
      all(m["std"] >= 0 for m in exp["models"]))

# Single valid frame: no crash, stable trend, zero std.
recs1, idx1, scores1, means1, faith1, mean1 = make_inputs(n_valid=1, n_skipped=0)
exp1 = build_explanation(idx1, recs1, scores1, means1, faith1,
                         "real", mean1, "high", 0.05)
check("single frame trend stable", exp1["trend"]["direction"] == "stable")
check("single frame std zero", all(m["std"] == 0.0 for m in exp1["models"]))
check("single key frame", len(exp1["key_frames"]) == 1)

print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
sys.exit(1 if FAIL else 0)
