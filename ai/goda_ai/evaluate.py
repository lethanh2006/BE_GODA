"""Chấm điểm các hệ thống tìm từ trên bộ test (GĐ0–GĐ3 trong kế hoạch AI).

    python -m goda_ai.evaluate rule=runs/rule.jsonl e5=runs/e5-small.jsonl --out reports/search.md

Thước đo (mục K10 trong kế hoạch):
- Recall@k: tỷ lệ câu có ít nhất một đáp án đúng nằm trong k kết quả đầu.
- MRR@10: trung bình của 1 / (vị trí đáp án đúng đầu tiên); không có trong 10 kết quả đầu thì tính 0.
Kèm khoảng tin cậy 95% bằng bootstrap: với 100 câu, chênh vài điểm phần trăm có thể chỉ là may rủi.
"""

from __future__ import annotations

import argparse
import random
from collections import defaultdict
from pathlib import Path

from .data import QUERIES_FILE, load_queries, load_run

KS = (1, 5, 10)
MRR_CUTOFF = 10


def first_hit(ranked: list[str], answers: list[str] | set[str]) -> int | None:
    """Vị trí (tính từ 1) của đáp án đúng đầu tiên, None nếu không có."""
    if len(set(ranked)) != len(ranked):
        raise ValueError(f"Danh sách kết quả có id trùng: {ranked}")
    answers = set(answers)
    for position, item in enumerate(ranked, start=1):
        if item in answers:
            return position
    return None


def recall_at(ranked: list[str], answers: list[str], k: int) -> float:
    hit = first_hit(ranked, answers)
    return 1.0 if hit is not None and hit <= k else 0.0


def reciprocal_rank(ranked: list[str], answers: list[str], cutoff: int = MRR_CUTOFF) -> float:
    hit = first_hit(ranked, answers)
    return 1.0 / hit if hit is not None and hit <= cutoff else 0.0


def score_run(run: dict[str, list[str]], queries: list[dict]) -> list[dict]:
    """Điểm từng câu. Câu không có trong `run` coi như hệ thống không trả kết quả nào."""
    rows = []
    for q in queries:
        ranked = run.get(q["id"], [])
        rows.append(
            {
                "id": q["id"],
                "q": q["q"],
                "kind": q["kind"],
                "group": q["group"],
                "hit": first_hit(ranked, q["answers"]),
                **{f"recall@{k}": recall_at(ranked, q["answers"], k) for k in KS},
                "rr": reciprocal_rank(ranked, q["answers"]),
            }
        )
    return rows


def mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def bootstrap_ci(values: list[float], samples: int = 2000, seed: int = 42) -> tuple[float, float]:
    """Khoảng tin cậy 95% của trung bình: lấy mẫu lại có hoàn lại từ chính các câu test."""
    if not values:
        return (0.0, 0.0)
    rng = random.Random(seed)
    n = len(values)
    means = sorted(mean([values[rng.randrange(n)] for _ in range(n)]) for _ in range(samples))
    return (means[int(0.025 * samples)], means[int(0.975 * samples) - 1])


def summarize(rows: list[dict]) -> dict[str, float]:
    return {**{f"recall@{k}": mean([r[f"recall@{k}"] for r in rows]) for k in KS}, "mrr": mean([r["rr"] for r in rows])}


def pct(x: float) -> str:
    return f"{100 * x:.0f}%"


def report(systems: dict[str, dict[str, list[str]]], queries: list[dict]) -> str:
    scored = {name: score_run(run, queries) for name, run in systems.items()}
    lines = [
        f"Bộ test: {len(queries)} câu. Recall@k = tỷ lệ câu có đáp án trong k kết quả đầu; "
        "MRR@10 = trung bình 1/(vị trí đáp án đúng đầu tiên). Khoảng trong ngoặc là khoảng tin cậy 95% (bootstrap).",
        "",
        "| Hệ thống | Recall@1 | Recall@5 | Recall@10 | MRR@10 |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for name, rows in scored.items():
        s = summarize(rows)
        lo, hi = bootstrap_ci([r["recall@5"] for r in rows])
        lines.append(
            f"| {name} | {pct(s['recall@1'])} | {pct(s['recall@5'])} ({pct(lo)}–{pct(hi)}) | {pct(s['recall@10'])} | {s['mrr']:.2f} |"
        )

    for field, title in (("kind", "Recall@5 theo kiểu câu"), ("group", "Recall@5 theo cấp")):
        groups = sorted({q[field] for q in queries})
        counts = {g: sum(1 for q in queries if q[field] == g) for g in groups}
        lines += ["", f"**{title}**", "", "| Hệ thống | " + " | ".join(f"{g} ({counts[g]})" for g in groups) + " |"]
        lines.append("| --- |" + " ---: |" * len(groups))
        for name, rows in scored.items():
            by = defaultdict(list)
            for r in rows:
                by[r[field]].append(r["recall@5"])
            lines.append(f"| {name} | " + " | ".join(pct(mean(by[g])) for g in groups) + " |")
    return "\n".join(lines) + "\n"


def misses(rows: list[dict], k: int = 5) -> list[dict]:
    return [r for r in rows if not r[f"recall@{k}"]]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("runs", nargs="+", help="tên=đường dẫn file kết quả, ví dụ rule=runs/rule.jsonl")
    parser.add_argument("--queries", default=str(QUERIES_FILE))
    parser.add_argument("--out", help="ghi bảng điểm ra file markdown")
    parser.add_argument("--title", help="tiêu đề đặt đầu file markdown")
    args = parser.parse_args()

    queries = load_queries(args.queries)
    systems = {}
    for spec in args.runs:
        name, _, path = spec.partition("=")
        systems[name] = load_run(path or name)
    text = report(systems, queries)
    if args.title:
        text = f"# {args.title}\n\n{text}"
    print(text)
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(text, encoding="utf8")
        print(f"đã ghi {args.out}")


if __name__ == "__main__":
    main()
