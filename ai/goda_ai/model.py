"""Tải model embedding và biến đoạn chữ thành vector (mục K15 trong kế hoạch AI).

Model: intfloat/multilingual-e5-small — giấy phép MIT, khoảng 118 triệu tham số, 12 lớp, vector 384 số,
học từ dữ liệu khoảng 100 ngôn ngữ (có tiếng Việt và tiếng Nhật). Chạy được bằng CPU.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np

from .data import CACHE_DIR

MODEL_ID = "intfloat/multilingual-e5-small"
# Ghim đúng một phiên bản (commit) trên Hugging Face: cùng tên model nhưng khác phiên bản thì vector có thể khác.
MODEL_REVISION = "614241f622f53c4eeff9890bdc4f31cfecc418b3"
# Chỉ tải những file SentenceTransformer cần (bản safetensors + tokenizer), bỏ các bản ONNX/OpenVINO/PyTorch thừa.
MODEL_FILES = ["*.json", "sentencepiece.bpe.model", "model.safetensors", "1_Pooling/*"]
HF_CACHE = CACHE_DIR / "hf"
EMB_CACHE = CACHE_DIR / "emb"


def model_path(model_id: str = MODEL_ID, revision: str = MODEL_REVISION) -> Path:
    """Tải (lần đầu) hoặc lấy từ bộ nhớ đệm; tên thư mục trả về chính là commit của model."""
    from huggingface_hub import snapshot_download

    return Path(snapshot_download(model_id, revision=revision, cache_dir=HF_CACHE, allow_patterns=MODEL_FILES))


class Encoder:
    """Bọc SentenceTransformer: luôn chuẩn hoá vector (độ dài 1) để cosine chỉ còn là tích vô hướng."""

    def __init__(self, model_id: str = MODEL_ID, revision: str = MODEL_REVISION):
        from sentence_transformers import SentenceTransformer  # nạp chậm (vài giây), chỉ khi cần

        path = model_path(model_id, revision)
        self.model_id = model_id
        self.revision = path.name
        self.model = SentenceTransformer(str(path), device="cpu")

    def encode(self, texts: list[str], prefix: str, batch_size: int = 64) -> np.ndarray:
        """Vector float32 đã chuẩn hoá, mỗi dòng ứng với một đoạn chữ. Có lưu đệm trên đĩa để chạy lại cho nhanh."""
        key = hashlib.sha256("\n".join([self.model_id, self.revision, prefix, *texts]).encode()).hexdigest()[:24]
        cached = EMB_CACHE / f"{key}.npy"
        if cached.exists():
            return np.load(cached)
        vectors = self.model.encode(
            [prefix + t for t in texts],
            batch_size=batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=len(texts) >= 1000,
        ).astype(np.float32)
        EMB_CACHE.mkdir(parents=True, exist_ok=True)
        np.save(cached, vectors)
        return vectors
