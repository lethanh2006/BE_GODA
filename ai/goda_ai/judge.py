"""Phiếu chấm mù cho GĐ1 (bước 1.4 trong kế hoạch AI) và tính Precision@6 từ phiếu đã chấm.

    python -m goda_ai.judge make             # → reports/gd1-related-judging.csv
    python -m goda_ai.judge score            # đọc phiếu đã chấm → in Precision@6 của từng cách

Ba cách gợi ý được trộn lẫn và GIẤU NGUỒN trong phiếu, để người chấm không vô tình ưu ái AI:
- ai: 6 từ gần nhất theo model embedding (file related-words.v1.json);
- cung-bai: 6 từ ngẫu nhiên trong cùng bài học (baseline);
- cung-tu-loai: 6 từ phổ biến nhất có cùng từ loại (baseline).
Người chấm điền cột `huu_ich`: 1 nếu nên học cùng từ gốc, 0 nếu không. Bảng khoá (dòng nào của cách nào) nằm
trong .cache/ và sinh lại được vì mọi bước ngẫu nhiên đều cố định seed.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
from collections import defaultdict

from .data import CACHE_DIR, REPORTS_DIR, load_words
from .related import LEVELS, OUT_FILE

SEED = 42
ANCHORS = 30
TOP = 6
SHEET = REPORTS_DIR / "gd1-related-judging.csv"
KEY = CACHE_DIR / "gd1-related-judging.key.json"


def short(word: dict) -> str:
    reading = "" if word["reading"] == word["word"] else f"（{word['reading']}）"
    return f"{word['word']}{reading}: {'; '.join(word['meaningsVi'])}"


def candidates(anchor: dict, words: list[dict], neighbors: dict, rng: random.Random) -> dict[str, list[str]]:
    others = [w for w in words if w["id"] != anchor["id"]]
    same_lesson = [w["id"] for w in others if (w["level"], w["lessonNo"]) == (anchor["level"], anchor["lessonNo"])]
    first_pos = anchor["pos"][0] if anchor["pos"] else None
    same_pos = sorted((w for w in others if w["pos"] and w["pos"][0] == first_pos), key=lambda w: (w["freq"], w["id"]))
    return {
        "ai": [wid for wid, _ in neighbors[anchor["id"]][:TOP]],
        "cung-bai": rng.sample(same_lesson, min(TOP, len(same_lesson))),
        "cung-tu-loai": [w["id"] for w in same_pos[:TOP]],
    }


def make(anchors: int) -> None:
    words = [w for w in load_words() if w["level"] in LEVELS]
    by_id = {w["id"]: w for w in words}
    neighbors = json.loads(OUT_FILE.read_text(encoding="utf8"))["neighbors"]
    rng = random.Random(SEED)
    picked = rng.sample(sorted(words, key=lambda w: w["id"]), anchors)

    rows, key = [], {}
    for anchor in picked:
        sources: dict[str, list[str]] = defaultdict(list)
        for system, ids in candidates(anchor, words, neighbors, rng).items():
            for wid in ids:
                sources[wid].append(system)
        order = list(sources)
        rng.shuffle(order)
        for wid in order:
            rows.append({"stt": len(rows) + 1, "tu_goc": short(anchor), "goi_y": short(by_id[wid]), "huu_ich": ""})
            key[str(len(rows))] = {"anchor": anchor["id"], "word": wid, "systems": sources[wid]}

    SHEET.parent.mkdir(parents=True, exist_ok=True)
    with open(SHEET, "w", encoding="utf8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["stt", "tu_goc", "goi_y", "huu_ich"])
        writer.writeheader()
        writer.writerows(rows)
    KEY.parent.mkdir(parents=True, exist_ok=True)
    KEY.write_text(json.dumps(key, ensure_ascii=False), encoding="utf8")
    print(f"{anchors} từ gốc, {len(rows)} dòng cần chấm → {SHEET}")


def score() -> None:
    key = json.loads(KEY.read_text(encoding="utf8"))
    with open(SHEET, encoding="utf8") as f:
        marks = {row["stt"]: row["huu_ich"].strip() for row in csv.DictReader(f)}
    missing = [stt for stt, mark in marks.items() if mark not in ("0", "1")]
    if missing:
        raise SystemExit(f"Còn {len(missing)} dòng chưa chấm (cột huu_ich phải là 0 hoặc 1), ví dụ dòng {missing[:5]}")
    good: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for stt, info in key.items():
        for system in info["systems"]:
            good[system][info["anchor"]] += int(marks[stt])
    for system, per_anchor in sorted(good.items()):
        values = [count / TOP for count in per_anchor.values()]
        print(f"{system:14} Precision@{TOP} = {sum(values) / len(values):.2f} ({len(values)} từ gốc)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("action", choices=["make", "score"])
    parser.add_argument("--anchors", type=int, default=ANCHORS)
    args = parser.parse_args()
    make(args.anchors) if args.action == "make" else score()


if __name__ == "__main__":
    main()
