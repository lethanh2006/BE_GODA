import { extractVietnamese } from './ovdp.js';

describe('extractVietnamese', () => {
  it('giữ nguyên mục do người biên soạn', () => {
    expect(extractVietnamese(['@がっこう\n- trường học, nhà trường.'], '学校', 'がっこう', ['n'])).toEqual([
      'trường học, nhà trường',
    ]);
  });

  it('bỏ câu ví dụ và nhãn từ loại', () => {
    const body = '@かんぺき\n* tính từ\n- Hoàn hảo, xuất sắc\n= 完ぺきね +: Thật hoàn hảo';
    expect(extractVietnamese([body], '完璧', 'かんぺき', ['adj-na'])).toEqual(['Hoàn hảo, xuất sắc']);
  });

  it('mục ghép máy: giữ vài nét đầu, bỏ ngoặc chú thích và thành ngữ tiếng Anh', () => {
    const body =
      '- {きれい}\n- {pretty} , xinh, xinh xinh, xinh xắn, xinh đẹp, (mỉa mai) hay gớm, my pretty con nhỏ của tôi';
    expect(extractVietnamese([body], '綺麗', 'きれい', ['adj-na'])).toEqual(['xinh, xinh xinh, xinh xắn']);
  });

  it('động từ không nhận nghĩa danh từ của từ tiếng Anh', () => {
    const body = '- {あう}\n- {meet} , cuộc gặp gỡ (của những người đi săn), gặp, gặp gỡ, đi đón';
    expect(extractVietnamese([body], '会う', 'あう', ['v5u'])).toEqual(['gặp, gặp gỡ, đi đón']);
  });

  it('từ tiếng Anh không kèm nghĩa thì bỏ qua, mỗi nghĩa chỉ lấy một lần', () => {
    const body = '- {がいねん}\n- {general idea}\n- {concept} , (Tech) khái niệm, quan niệm\n- {notion} , ý niệm, khái niệm';
    expect(extractVietnamese([body], '概念', 'がいねん', ['n'])).toEqual(['khái niệm, quan niệm', 'ý niệm']);
  });

  it('bỏ mục của từ đồng tự khác âm', () => {
    expect(extractVietnamese(['@ぎょう\n- chủ đề, nhan đề'], '題', 'だい', ['n'])).toEqual([]);
    const both = '- {うわて}\n- {upper part} , phần trên\n- {じょうず}\n- {skilled} , giỏi, khéo';
    expect(extractVietnamese([both], '上手', 'じょうず', ['adj-na'])).toEqual(['giỏi, khéo']);
  });

  it('từ khoá kana nhận mục ghi chữ Hán', () => {
    expect(extractVietnamese(['@彼処\n- chỗ kìa, đằng kia'], 'あそこ', 'あそこ', ['n'])).toEqual(['chỗ kìa, đằng kia']);
  });
});
