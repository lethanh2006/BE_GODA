"""Biến một mục từ thành đoạn chữ cho model embedding (bước 1.1 trong kế hoạch AI).

Mẫu đoạn chữ có tên (`TEMPLATE`) và được ghi vào file kết quả. Đổi mẫu thì phải tạo lại toàn bộ embedding,
vì "bản đồ nghĩa" của mẫu cũ và mẫu mới không so được với nhau.
"""

from __future__ import annotations

import unicodedata

TEMPLATE = "word-v1"

# Họ model e5 yêu cầu tiền tố: "query: " cho câu hỏi hoặc khi so hai thứ cùng loại (từ với từ),
# "passage: " cho phía được tìm (mục từ trong từ điển khi tìm theo mô tả).
QUERY = "query: "
PASSAGE = "passage: "

ALL_SOURCES = ("goda", "ovdp")


def clean(text: str) -> str:
    """Chuẩn hoá Unicode NFC và gộp khoảng trắng; giữ nguyên dấu tiếng Việt, kana và kanji."""
    return " ".join(unicodedata.normalize("NFC", text).split())


def word_text(word: dict, vi_sources: tuple[str, ...] = ALL_SOURCES) -> str:
    """Ví dụ: "傘 (かさ). Nghĩa: cái ô, cái dù. English: umbrella."

    `vi_sources` chọn nguồn nghĩa tiếng Việt được đưa vào. Nghĩa OVDP (lọc tự động, còn lỗi) có thể bỏ ra
    để model chỉ dựa vào nghĩa tiếng Anh của JMdict.
    """
    head = word["word"] if word["reading"] == word["word"] else f"{word['word']} ({word['reading']})"
    parts = [head]
    if word.get("viSource") in vi_sources and word.get("meaningsVi"):
        parts.append("Nghĩa: " + "; ".join(word["meaningsVi"]))
    if word.get("meaningsEn"):
        parts.append("English: " + "; ".join(word["meaningsEn"]))
    return clean(". ".join(parts) + ".")
