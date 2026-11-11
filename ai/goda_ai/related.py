"""GĐ1: tính sẵn "Từ liên quan để học tiếp" cho từ N5–N4 và ghi file cho backend đọc.

    python -m goda_ai.related                 # → backend/assets/ai/related-words.v1.json

Cách làm (mục K15–K17 trong kế hoạch AI): biến mỗi từ thành một vector 384 số bằng model e5, rồi với mỗi từ
lấy 12 từ có vector gần nhất (cosine lớn nhất), bỏ chính nó. Không cần train gì; server chỉ đọc file kết quả.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from .data import ASSETS_DIR, load_words
from .text import QUERY, TEMPLATE, word_text

LEVELS = ("N5", "N4")
NEIGHBORS = 12
SCHEMA_VERSION = 1
OUT_FILE = ASSETS_DIR / "related-words.v1.json"


def corpus_sha256(words: list[dict]) -> str:
    """Dấu vân tay danh sách từ đã dùng: dữ liệu từ vựng đổi thì dấu này đổi."""
    canon = sorted(
        ({k: w[k] for k in ("id", "word", "reading", "meaningsVi", "meaningsEn")} for w in words),
        key=lambda w: w["id"],
    )
    return hashlib.sha256(json.dumps(canon, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def nearest(vectors: np.ndarray, words: list[dict], k: int = NEIGHBORS) -> dict[str, list[tuple[str, float]]]:
    """Với mỗi từ: k từ gần nhất theo cosine, bỏ chính nó và mục trùng cả mặt chữ lẫn cách đọc.

    Điểm bằng nhau thì từ phổ biến hơn (freq nhỏ) đứng trước, rồi tới id, để chạy lại luôn ra cùng kết quả.
    """
    sims = vectors @ vectors.T
    freq = np.array([w["freq"] for w in words])
    id_rank = np.argsort(np.argsort([w["id"] for w in words]))
    keys = [(w["word"], w["reading"]) for w in words]
    result: dict[str, list[tuple[str, float]]] = {}
    for i, w in enumerate(words):
        order = np.lexsort((id_rank, freq, -np.round(sims[i], 6)))
        picks: list[tuple[str, float]] = []
        for j in order:
            if j == i or keys[j] == keys[i]:
                continue
            picks.append((words[j]["id"], round(float(sims[i, j]), 4)))
            if len(picks) == k:
                break
        result[w["id"]] = picks
    return result


def write_artifact(path: Path, meta: dict, neighbors: dict[str, list[tuple[str, float]]]) -> None:
    """JSON gọn: phần thông tin đầu file dễ đọc, mỗi từ một dòng để git diff còn xem được."""
    path.parent.mkdir(parents=True, exist_ok=True)
    head = json.dumps(meta, ensure_ascii=False, indent=2)[:-2]  # bỏ "\n}" để nối tiếp phần neighbors
    rows = [f'    "{wid}": {json.dumps([[n, s] for n, s in items])}' for wid, items in sorted(neighbors.items())]
    path.write_text(head + ',\n  "neighbors": {\n' + ",\n".join(rows) + "\n  }\n}\n", encoding="utf8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", default=str(OUT_FILE))
    args = parser.parse_args()

    from .model import Encoder

    words = [w for w in load_words() if w["level"] in LEVELS]
    encoder = Encoder()
    vectors = encoder.encode([word_text(w) for w in words], prefix=QUERY)
    neighbors = nearest(vectors, words)
    meta = {
        "schemaVersion": SCHEMA_VERSION,
        "modelId": encoder.model_id,
        "modelRevision": encoder.revision,
        "textTemplate": TEMPLATE,
        "prefix": QUERY,
        "levels": list(LEVELS),
        "corpusSize": len(words),
        "corpusSha256": corpus_sha256(words),
        "neighborsPerWord": NEIGHBORS,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    write_artifact(Path(args.out), meta, neighbors)
    print(f"{len(words)} từ, mỗi từ {NEIGHBORS} gợi ý → {args.out} ({Path(args.out).stat().st_size / 1024:.0f} KB)")
    print(f"model {encoder.model_id}@{encoder.revision}")
    write_samples(words, neighbors, meta)


def write_samples(words: list[dict], neighbors: dict[str, list[tuple[str, float]]], meta: dict, n: int = 15) -> None:
    """Xem tận mắt: n từ chọn ngẫu nhiên (seed cố định) và 6 gợi ý đầu. Chỉ để xem, không thay cho chấm điểm."""
    import random

    by_id = {w["id"]: w for w in words}
    picked = random.Random(7).sample(sorted(words, key=lambda w: w["id"]), n)
    short = lambda w: f"{w['word']}（{w['reading']}）{'; '.join(w['meaningsVi'])}"  # noqa: E731
    lines = [
        "# GĐ1: ví dụ từ liên quan do model gợi ý",
        "",
        f"Model {meta['modelId']}@{meta['modelRevision'][:7]}, mẫu `{meta['textTemplate']}`, {meta['corpusSize']} từ N5–N4. "
        f"{n} từ chọn ngẫu nhiên (seed 7). Số trong ngoặc là độ tương đồng cosine, không phải xác suất đúng.",
        "",
        "| Từ gốc | 6 gợi ý đầu |",
        "| --- | --- |",
    ]
    for w in picked:
        tops = "<br>".join(f"{short(by_id[n_id])} ({score:.2f})" for n_id, score in neighbors[w["id"]][:6])
        lines.append(f"| {short(w)} | {tops} |")
    from .data import REPORTS_DIR

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (REPORTS_DIR / "gd1-related-samples.md").write_text("\n".join(lines) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
