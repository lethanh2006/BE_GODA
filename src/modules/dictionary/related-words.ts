/**
 * File "Từ liên quan để học tiếp" do phần AI tính sẵn (ai/goda_ai/related.py, GĐ1 trong kế hoạch AI).
 * Server chỉ đọc file, không chạy model. Kiểm tra kỹ lúc nạp: file hỏng thì tắt tính năng chứ không trả dữ liệu sai.
 */

export interface RelatedNeighbor {
  id: string;
  /** Độ tương đồng cosine giữa hai từ, từ -1 đến 1. Không phải xác suất đúng. */
  score: number;
}

export interface RelatedWordsArtifact {
  schemaVersion: 1;
  modelId: string;
  modelRevision: string;
  textTemplate: string;
  corpusSha256: string;
  generatedAt: string;
  neighbors: Map<string, RelatedNeighbor[]>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function text(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`thiếu trường ${key}`);
  return value;
}

/** Kiểm tra và chuyển nội dung file JSON thành dữ liệu dùng được; sai bất kỳ chỗ nào thì ném lỗi. */
export function parseRelatedWordsArtifact(input: unknown): RelatedWordsArtifact {
  if (!isObject(input)) throw new Error('file không phải một object JSON');
  if (input.schemaVersion !== 1) throw new Error(`schemaVersion không hỗ trợ: ${String(input.schemaVersion)}`);
  if (!isObject(input.neighbors)) throw new Error('thiếu neighbors');

  const neighbors = new Map<string, RelatedNeighbor[]>();
  for (const [id, raw] of Object.entries(input.neighbors)) {
    if (!Array.isArray(raw)) throw new Error(`neighbors của ${id} không phải mảng`);
    const items = raw.map((pair: unknown): RelatedNeighbor => {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || typeof pair[1] !== 'number') {
        throw new Error(`gợi ý của ${id} sai dạng [id, score]`);
      }
      const [otherId, score] = pair as [string, number];
      if (!Number.isFinite(score) || score < -1 || score > 1) throw new Error(`điểm của ${id} → ${otherId} không hợp lệ`);
      if (otherId === id) throw new Error(`${id} tự gợi ý chính nó`);
      return { id: otherId, score };
    });
    if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`gợi ý của ${id} bị trùng`);
    if (items.some((item, i) => i > 0 && item.score > items[i - 1].score)) {
      throw new Error(`gợi ý của ${id} không xếp theo điểm giảm dần`);
    }
    neighbors.set(id, items);
  }

  return {
    schemaVersion: 1,
    modelId: text(input, 'modelId'),
    modelRevision: text(input, 'modelRevision'),
    textTemplate: text(input, 'textTemplate'),
    corpusSha256: text(input, 'corpusSha256'),
    generatedAt: text(input, 'generatedAt'),
    neighbors,
  };
}
