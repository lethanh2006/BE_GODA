"""Đo GĐ2 trên bộ test: tìm từ theo mô tả bằng embedding, và ghép với bộ tra theo luật (chưa đưa lên web).

    pnpm ai:rank-rule            # (thư mục backend) tạo runs/rule.jsonl trước
    python -m goda_ai.search     # → runs/e5-*.jsonl, runs/hybrid-*.jsonl, reports/gd2-search-errors.md

- Kho tìm: 7.811 từ JLPT. Mục từ dùng tiền tố "passage: ", câu gõ dùng "query: " (yêu cầu của model e5).
- Hai biến thể đoạn chữ của mục từ: có nghĩa OVDP cho N3–N1 (lọc tự động, còn lỗi), hoặc bỏ OVDP và chỉ giữ
  nghĩa tiếng Anh JMdict cho các từ đó. Từ N5–N4 luôn có nghĩa soạn tay.
- Cách ghép (mục 2.4 trong kế hoạch, chốt TRƯỚC khi đo): giữ nguyên 5 kết quả đầu của bộ luật; khi bộ luật trả
  ít hơn 3 kết quả hoặc câu gõ dài từ 3 tiếng trở lên thì thêm một mục riêng gồm tối đa 5 gợi ý theo nghĩa không
  trùng. File hybrid xếp "5 kết quả luật + 5 gợi ý theo nghĩa", nên Recall@10 của nó là tỷ lệ câu mà người học
  nhìn thấy đáp án ở một trong hai mục. Biến thể "always" luôn hiện mục gợi ý theo nghĩa, chỉ để so sánh.
"""

from __future__ import annotations

import numpy as np

from .data import REPORTS_DIR, RUNS_DIR, load_queries, load_run, load_words, write_jsonl
from .text import ALL_SOURCES, PASSAGE, QUERY, clean, word_text

TOP_K = 10
BLOCK = 5
TRIGGER_MAX_RULE_RESULTS = 3  # bộ luật trả ít hơn từng này kết quả thì gọi thêm tìm theo nghĩa
TRIGGER_MIN_SYLLABLES = 3  # hoặc câu gõ dài từ từng này tiếng trở lên

VARIANTS = {
    "e5-small": ALL_SOURCES,  # nghĩa Việt của mọi từ, kể cả OVDP
    "e5-small-no-ovdp": ("goda",),  # chỉ nghĩa Việt soạn tay; từ N3–N1 chỉ còn nghĩa tiếng Anh
}


def rank(query_vectors: np.ndarray, word_vectors: np.ndarray, ids: list[str], k: int = TOP_K) -> list[list[str]]:
    sims = query_vectors @ word_vectors.T
    top = np.argsort(-sims, axis=1, kind="stable")[:, :k]
    return [[ids[j] for j in row] for row in top]


def triggered(query: str, rule_ranked: list[str]) -> bool:
    return len(rule_ranked) < TRIGGER_MAX_RULE_RESULTS or len(query.split()) >= TRIGGER_MIN_SYLLABLES


def hybrid(query: str, rule_ranked: list[str], semantic_ranked: list[str], always: bool = False) -> list[str]:
    shown = rule_ranked[:BLOCK]
    if not (always or triggered(query, rule_ranked)):
        return shown
    return shown + [x for x in semantic_ranked if x not in shown][:BLOCK]


def describe(word: dict) -> str:
    meaning = "; ".join(word["meaningsVi"][:2]) or "; ".join(word["meaningsEn"][:2])
    return f"{word['word']}（{word['reading']}）{word['level']}: {meaning}"


def main() -> None:
    from .model import Encoder

    words = load_words()
    ids = [w["id"] for w in words]
    by_id = {w["id"]: w for w in words}
    queries = load_queries()
    rule = load_run(RUNS_DIR / "rule.jsonl")

    encoder = Encoder()
    query_vectors = encoder.encode([clean(q["q"]) for q in queries], prefix=QUERY)
    runs = {}
    for name, sources in VARIANTS.items():
        word_vectors = encoder.encode([word_text(w, sources) for w in words], prefix=PASSAGE)
        runs[name] = dict(zip((q["id"] for q in queries), rank(query_vectors, word_vectors, ids)))
        write_jsonl(RUNS_DIR / f"{name}.jsonl", ({"id": qid, "ranked": r} for qid, r in runs[name].items()))

    # Ghép với bộ luật cho từng biến thể, theo cách ghép của kế hoạch và biến thể "luôn hiện".
    for variant, semantic in runs.items():
        suffix = variant.removeprefix("e5-small")
        for policy, always in (("hybrid", False), ("hybrid-always", True)):
            write_jsonl(
                RUNS_DIR / f"{policy}{suffix}.jsonl",
                ({"id": q["id"], "ranked": hybrid(q["q"], rule.get(q["id"], []), semantic[q["id"]], always)} for q in queries),
            )
    best = runs["e5-small-no-ovdp"]

    # Phân tích lỗi: những câu model không đưa được đáp án vào 5 kết quả đầu.
    lines = [
        "# GĐ2: các câu model trượt (biến thể bỏ nghĩa OVDP, đáp án không nằm trong 5 kết quả đầu)",
        "",
        f"Model {encoder.model_id}@{encoder.revision}. Kho tìm {len(words)} từ JLPT.",
        "",
        "| Câu gõ | Kiểu | Đáp án | Model trả về (3 kết quả đầu) |",
        "| --- | --- | --- | --- |",
    ]
    for q in queries:
        got = best[q["id"]]
        if not set(q["answers"]) & set(got[:BLOCK]):
            expected = ", ".join(q["answerWords"])
            top3 = "<br>".join(describe(by_id[x]) for x in got[:3])
            lines.append(f"| {q['q']} | {q['kind']} | {expected} | {top3} |")
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (REPORTS_DIR / "gd2-search-errors.md").write_text("\n".join(lines) + "\n", encoding="utf8")
    print(f"model {encoder.model_id}@{encoder.revision}; đã ghi runs/ và reports/gd2-search-errors.md")


if __name__ == "__main__":
    main()
