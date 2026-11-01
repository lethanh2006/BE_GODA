/** Chuyển đổi kana ↔ romaji cho từ điển: hiển thị phiên âm và cho phép gõ romaji khi tra từ. */

const ROMAJI_BY_KANA: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'i', ゑ: 'e', を: 'o', ん: 'n', ゔ: 'vu',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゎ: 'wa',
  ゃ: 'ya', ゅ: 'yu', ょ: 'yo',
};

/** Âm ghép: phụ âm của chữ đầu + ゃゅょ. */
const COMBO_PREFIX: Record<string, string> = {
  き: 'ky', ぎ: 'gy', し: 'sh', じ: 'j', ち: 'ch', ぢ: 'j', に: 'ny',
  ひ: 'hy', び: 'by', ぴ: 'py', み: 'my', り: 'ry',
};
const COMBO_VOWEL: Record<string, string> = { ゃ: 'a', ゅ: 'u', ょ: 'o' };

/** Âm katakana mở rộng: ファ, ティ, シェ… */
const EXTENDED: Record<string, string> = {
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du',
  しぇ: 'she', じぇ: 'je', ちぇ: 'che', うぃ: 'wi', うぇ: 'we', うぉ: 'wo', ゔぁ: 'va', ゔぃ: 'vi',
  ゔぇ: 've', ゔぉ: 'vo', つぁ: 'tsa', つぃ: 'tsi', つぇ: 'tse', つぉ: 'tso',
};

/** Katakana → hiragana. Dấu ー và ký tự khác giữ nguyên. */
export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** Kana → romaji Hepburn, trường âm viết đôi (べんきょう → benkyou). Ký tự không phải kana giữ nguyên. */
export function kanaToRomaji(kana: string): string {
  const text = toHiragana(kana);
  let out = '';
  let geminate = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === 'っ') {
      geminate = true;
      continue;
    }
    if (ch === 'ー') {
      out += out.at(-1) ?? '';
      continue;
    }
    let syllable: string;
    if (next && EXTENDED[ch + next]) {
      syllable = EXTENDED[ch + next];
      i++;
    } else if (next && COMBO_PREFIX[ch] && COMBO_VOWEL[next]) {
      syllable = COMBO_PREFIX[ch] + COMBO_VOWEL[next];
      i++;
    } else {
      syllable = ROMAJI_BY_KANA[ch] ?? ch;
    }
    if (geminate) {
      out += syllable.startsWith('ch') ? 't' : syllable[0];
      geminate = false;
    }
    out += syllable;
  }
  return out;
}

const VOWELS: Record<string, string> = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' };
const ROW: Record<string, [string, string, string, string, string]> = {
  k: ['か', 'き', 'く', 'け', 'こ'], g: ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
  s: ['さ', 'し', 'す', 'せ', 'そ'], z: ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
  t: ['た', 'ち', 'つ', 'て', 'と'], d: ['だ', 'ぢ', 'づ', 'で', 'ど'],
  n: ['な', 'に', 'ぬ', 'ね', 'の'], h: ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  f: ['ふぁ', 'ふぃ', 'ふ', 'ふぇ', 'ふぉ'],
  b: ['ば', 'び', 'ぶ', 'べ', 'ぼ'], p: ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'],
  m: ['ま', 'み', 'む', 'め', 'も'], y: ['や', 'い', 'ゆ', 'いぇ', 'よ'],
  r: ['ら', 'り', 'る', 'れ', 'ろ'], l: ['ら', 'り', 'る', 'れ', 'ろ'],
  w: ['わ', 'うぃ', 'う', 'うぇ', 'を'], v: ['ゔぁ', 'ゔぃ', 'ゔ', 'ゔぇ', 'ゔぉ'],
};
const VOWEL_INDEX: Record<string, number> = { a: 0, i: 1, u: 2, e: 3, o: 4 };
const Y_SMALL: Record<string, string> = { a: 'ゃ', u: 'ゅ', o: 'ょ' };
/** Phụ âm đôi dạng Hepburn: sha, cha, ja, tsu, shi, chi. */
const DIGRAPH: Record<string, string> = { sh: 'し', ch: 'ち', j: 'じ' };

/**
 * Romaji → hiragana (nhận cả Hepburn lẫn Kunrei: shi/si, chi/ti, tsu/tu, ja/zya).
 * Trả về null nếu chuỗi không phải romaji hợp lệ — khi đó coi như người dùng gõ tiếng Việt / Anh.
 */
export function romajiToHiragana(input: string): string | null {
  const text = input.toLowerCase().replace(/[\s-]/g, '').replace(/’/g, "'");
  if (!text || !/^[a-z']+$/.test(text)) return null;
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (VOWELS[ch]) {
      out += VOWELS[ch];
      i += 1;
    } else if (ch === "'") {
      i += 1;
    } else if (ch === 'n' && !/[aiueoy]/.test(next ?? '')) {
      out += 'ん';
      // "nn" đứng trước phụ âm hoặc cuối chuỗi là cách gõ ん của bộ gõ; "konnichi" thì n sau thuộc âm に.
      i += next === 'n' && !/[aiueoy]/.test(text[i + 2] ?? '') ? 2 : 1;
    } else if (next === ch && ch !== 'n') {
      out += 'っ';
      i += 1;
    } else if (ch === 't' && next === 'c' && text[i + 2] === 'h') {
      out += 'っ';
      i += 1;
    } else if (text.startsWith('tsu', i)) {
      out += 'つ';
      i += 3;
    } else {
      const digraph = text.startsWith('sh', i) ? 'sh' : text.startsWith('ch', i) ? 'ch' : ch === 'j' ? 'j' : null;
      if (digraph) {
        const vowel = text[i + digraph.length];
        if (!vowel || !VOWELS[vowel]) return null;
        const base = DIGRAPH[digraph];
        out += vowel === 'i' ? base : vowel === 'e' ? `${base}ぇ` : `${base}${Y_SMALL[vowel]}`;
        i += digraph.length + 1;
      } else if (ROW[ch] && next === 'y' && text[i + 2] && Y_SMALL[text[i + 2]]) {
        out += ROW[ch][1] + Y_SMALL[text[i + 2]];
        i += 3;
      } else if (ROW[ch] && next && VOWELS[next]) {
        out += ROW[ch][VOWEL_INDEX[next]];
        i += 2;
      } else {
        return null;
      }
    }
  }
  return out;
}

/** Bỏ trường âm và gộp づ/ず, ぢ/じ để gõ "benkyo", "tokyo", "tsuzuku" vẫn khớp べんきょう, とうきょう, つづく. */
export function foldLongVowels(hiragana: string): string {
  return hiragana
    .replace(/ー/g, '')
    .replace(/づ/g, 'ず')
    .replace(/ぢ/g, 'じ')
    .replace(/([おこごそぞとどのほぼぽもよろょ])[うお]/g, '$1')
    .replace(/([うくぐすずつづぬふぶぷむゆるゅ])う/g, '$1')
    .replace(/([あかがさざただなはばぱまやらわゃ])あ/g, '$1')
    .replace(/([いきぎしじちぢにひびぴみり])い/g, '$1')
    .replace(/([えけげせぜてでねへべぺめれ])[えい]/g, '$1');
}
