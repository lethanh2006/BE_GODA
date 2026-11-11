"""Đường dẫn và hàm đọc dữ liệu dùng chung cho các script AI."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

AI_DIR = Path(__file__).resolve().parent.parent  # backend/ai
BACKEND_DIR = AI_DIR.parent
DATA_DIR = AI_DIR / "data"
RUNS_DIR = AI_DIR / "runs"
REPORTS_DIR = AI_DIR / "reports"
CACHE_DIR = AI_DIR / ".cache"
ASSETS_DIR = BACKEND_DIR / "assets" / "ai"

WORDS_FILE = DATA_DIR / "words.jsonl"
QUERIES_FILE = DATA_DIR / "test-queries.jsonl"


def read_jsonl(path: Path | str) -> list[dict]:
    with open(path, encoding="utf8") as f:
        return [json.loads(line) for line in f if line.strip()]


def write_jsonl(path: Path | str, rows: Iterable[dict]) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def load_words(path: Path | str = WORDS_FILE) -> list[dict]:
    """Từ vựng do `pnpm ai:export-words` xuất ra (mỗi dòng một từ)."""
    if not Path(path).exists():
        raise SystemExit(f"Chưa có {path}. Chạy `pnpm ai:export-words` trong thư mục backend trước.")
    return read_jsonl(path)


def load_queries(path: Path | str = QUERIES_FILE) -> list[dict]:
    return read_jsonl(path)


def load_run(path: Path | str) -> dict[str, list[str]]:
    """Kết quả một hệ thống trên bộ test: id câu → danh sách id từ theo thứ hạng."""
    return {row["id"]: row["ranked"] for row in read_jsonl(path)}
