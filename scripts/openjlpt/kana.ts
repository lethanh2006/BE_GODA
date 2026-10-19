/** Tiện ích xử lý kana dùng để sinh đáp án nhiễu kiểu JLPT. */

const DAKUTEN_PAIRS: [string, string][] = [
  ['か', 'が'], ['き', 'ぎ'], ['く', 'ぐ'], ['け', 'げ'], ['こ', 'ご'],
  ['さ', 'ざ'], ['し', 'じ'], ['す', 'ず'], ['せ', 'ぜ'], ['そ', 'ぞ'],
  ['た', 'だ'], ['ち', 'ぢ'], ['つ', 'づ'], ['て', 'で'], ['と', 'ど'],
  ['は', 'ば'], ['ひ', 'び'], ['ふ', 'ぶ'], ['へ', 'べ'], ['ほ', 'ぼ'],
  ['は', 'ぱ'], ['ひ', 'ぴ'], ['ふ', 'ぷ'], ['へ', 'ぺ'], ['ほ', 'ぽ'],
];

const O_ROW = new Set('おこごそぞとどのほぼぽもよろょを'.split(''));
const U_ROW = new Set('うくぐすずつづぬふぶぷむゆるゅ'.split(''));
const E_ROW = new Set('えけげせぜてでねへべぺめれ'.split(''));
const GEMINATE_BEFORE = new Set('かきくけこさしすせそたちつてとぱぴぷぺぽ'.split(''));
/** Âm ngắt thường xuất hiện sau âm tiết kết thúc bằng i/u (いっ, がっ←がく, しゅっ←しゅつ). */
const GEMINATE_AFTER = new Set('いきしちにひみりぎじぢびぴくすつぬふむるぐずづぶぷゆゅょ'.split(''));
const SMALL_TO_BIG: Record<string, string> = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' };
const SMALL_SWAP: Record<string, string> = { ゅ: 'ょ', ょ: 'ゅ' };
const VOWEL_END = /[あ-おか-ごさ-ぞた-どな-のは-ぽま-もやゆよら-ろわ]/;

export const isHiragana = (s: string) => /^[ぁ-ゖー]+$/.test(s);
export const isKanji = (ch: string) => /[㐀-鿿々]/.test(ch);

export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

export function voice(ch: string): string[] {
  return DAKUTEN_PAIRS.filter(([plain]) => plain === ch).map(([, voiced]) => voiced);
}

function toggleDakuten(ch: string): string[] {
  const out: string[] = [];
  for (const [plain, voiced] of DAKUTEN_PAIRS) {
    if (ch === plain) out.push(voiced);
    if (ch === voiced) out.push(plain);
  }
  return out;
}

export interface Mutation {
  kind: string;
  value: string;
}

/**
 * Sinh các cách đọc "gần đúng" theo kiểu bẫy của đề JLPT:
 * trường âm, âm ngắt っ, âm đục/bán đục, âm ghép ゃゅょ, âm mũi ん.
 */
export function readingMutations(reading: string): Mutation[] {
  const chars = [...reading];
  const out: Mutation[] = [];
  const push = (kind: string, value: string) => {
    if (value !== reading && value.length > 0 && !/^[っんーゃゅょ]/.test(value)) {
      out.push({ kind, value });
    }
  };

  chars.forEach((ch, i) => {
    const prev = chars[i - 1];
    const next = chars[i + 1];
    const before = chars.slice(0, i).join('');
    const after = chars.slice(i + 1).join('');

    // Trường âm: bỏ う/い kéo dài, hoặc thêm vào.
    if (ch === 'う' && prev && (O_ROW.has(prev) || U_ROW.has(prev))) push('long', before + after);
    if (ch === 'い' && prev && E_ROW.has(prev)) push('long', before + after);
    if ((O_ROW.has(ch) || U_ROW.has(ch)) && next !== 'う' && i < chars.length - 1) {
      push('long', before + ch + 'う' + after);
    }
    if ((O_ROW.has(ch) || ch === 'ゅ') && i === chars.length - 1 && chars.length >= 2) {
      push('long', before + ch + 'う');
    }

    // Âm ngắt.
    if (ch === 'っ') push('sokuon', before + after);
    if (i > 0 && GEMINATE_BEFORE.has(ch) && GEMINATE_AFTER.has(prev)) {
      push('sokuon', before + 'っ' + ch + after);
    }

    // Âm đục / bán đục.
    for (const alt of toggleDakuten(ch)) push('dakuten', before + alt + after);

    // Âm ghép.
    if (SMALL_TO_BIG[ch]) push('youon', before + SMALL_TO_BIG[ch] + after);
    if (SMALL_SWAP[ch]) push('youon', before + SMALL_SWAP[ch] + after);

    // Âm mũi.
    if (ch === 'ん' && i > 0) push('nasal', before + after);
    if (i > 0 && i < chars.length - 1 && VOWEL_END.test(ch) && next !== 'ん' && next !== 'っ') {
      push('nasal', before + ch + 'ん' + after);
    }
  });

  const seen = new Set<string>();
  return out.filter((m) => (seen.has(m.value) ? false : (seen.add(m.value), true)));
}
