# GĐ1: ví dụ từ liên quan do model gợi ý

Model intfloat/multilingual-e5-small@614241f, mẫu `word-v1`, 1304 từ N5–N4. 15 từ chọn ngẫu nhiên (seed 7). Số trong ngoặc là độ tương đồng cosine, không phải xác suất đúng.

| Từ gốc | 6 gợi ý đầu |
| --- | --- |
| 喜ぶ（よろこぶ）vui mừng | 笑う（わらう）cười (0.94)<br>お祝い（おいわい）chúc mừng; quà mừng (0.94)<br>楽しみ（たのしみ）niềm vui; mong chờ (0.94)<br>うれしい（うれしい）vui, sung sướng (0.93)<br>楽しい（たのしい）vui, thú vị (0.93)<br>遊ぶ（あそぶ）chơi (0.93) |
| お金（おかね）tiền | 銀行（ぎんこう）ngân hàng (0.94)<br>財布（さいふ）ví tiền (0.94)<br>お金持ち（おかねもち）người giàu (0.94)<br>億（おく）một trăm triệu (0.94)<br>払う（はらう）trả tiền (0.94)<br>かかる（かかる）mất (thời gian, tiền) (0.93) |
| カレー（カレー）cà ri | かぎ（かぎ）chìa khóa (0.92)<br>パン（パン）bánh mì (0.92)<br>サラダ（サラダ）món sa-lát (0.92)<br>コーヒー（コーヒー）cà phê (0.92)<br>料理（りょうり）món ăn; nấu ăn (0.92)<br>フォーク（フォーク）cái nĩa (0.92) |
| 足す（たす）cộng thêm, thêm vào | 入る（はいる）vào, đi vào (0.92)<br>増える（ふえる）tăng lên (0.91)<br>足りる（たりる）đủ (0.91)<br>番号（ばんごう）số, số hiệu (0.90)<br>入れる（いれる）cho vào, đưa vào; pha (trà) (0.90)<br>付く（つく）dính, gắn vào (0.90) |
| 例えば（たとえば）ví dụ | ああ（ああ）như thế kia; à, ồ (0.92)<br>だから（だから）vì vậy (0.92)<br>あんな（あんな）như thế kia (0.92)<br>意味（いみ）ý nghĩa, nghĩa (0.92)<br>もし（もし）nếu (0.92)<br>それで（それで）vì thế, thế rồi (0.91) |
| 小さい（ちいさい）nhỏ, bé | 小さな（ちいさな）nhỏ, bé (0.99)<br>少し（すこし）một chút, một ít (0.94)<br>短い（みじかい）ngắn (0.94)<br>大きい（おおきい）to, lớn (0.94)<br>大きな（おおきな）to, lớn (0.94)<br>ちょっと（ちょっと）một chút; hơi (0.94) |
| 不便（ふべん）bất tiện | 難しい（むずかしい）khó (0.92)<br>困る（こまる）khó xử, gặp rắc rối (0.92)<br>つまらない（つまらない）chán, tẻ nhạt (0.92)<br>残念（ざんねん）đáng tiếc (0.92)<br>煩い（うるさい）ồn ào; phiền phức (0.91)<br>壊れる（こわれる）bị hỏng (0.91) |
| 降り出す（ふりだす）bắt đầu mưa | 降る（ふる）rơi (mưa, tuyết) (0.95)<br>始める（はじめる）bắt đầu (0.94)<br>雨（あめ）mưa (0.93)<br>降りる（おりる）xuống (xe, tàu) (0.93)<br>始まる（はじまる）bắt đầu (0.93)<br>起きる（おきる）thức dậy; xảy ra (0.93) |
| 山（やま）núi | 地理（ちり）địa lý (0.91)<br>雪（ゆき）tuyết (0.91)<br>石（いし）hòn đá (0.91)<br>メートル（メートル）mét (0.91)<br>公園（こうえん）công viên (0.91)<br>寺（てら）chùa (0.90) |
| 並べる（ならべる）xếp, bày ra | 並ぶ（ならぶ）xếp hàng (0.97)<br>連れる（つれる）dẫn theo (0.93)<br>立てる（たてる）dựng lên; lập (kế hoạch) (0.92)<br>座る（すわる）ngồi (0.92)<br>置く（おく）đặt, để (0.92)<br>立つ（たつ）đứng (0.92) |
| 特別（とくべつ）đặc biệt | 特に（とくに）đặc biệt là (0.97)<br>非常に（ひじょうに）rất, cực kỳ (0.93)<br>ずいぶん（ずいぶん）khá, rất (0.92)<br>別（べつ）khác, riêng (0.91)<br>興味（きょうみ）sự quan tâm, hứng thú (0.91)<br>凄い（すごい）ghê gớm, tuyệt vời (0.91) |
| 騒ぐ（さわぐ）làm ồn | 笑う（わらう）cười (0.93)<br>怒る（おこる）tức giận; mắng (0.92)<br>鳴る（なる）kêu, reo (0.92)<br>困る（こまる）khó xử, gặp rắc rối (0.91)<br>びっくりする（びっくりする）giật mình, ngạc nhiên (0.91)<br>揺れる（ゆれる）rung, lắc (0.91) |
| 変（へん）lạ, kỳ quặc | おかしい（おかしい）kỳ lạ; buồn cười (0.94)<br>怖い（こわい）sợ, đáng sợ (0.92)<br>珍しい（めずらしい）hiếm, lạ (0.92)<br>ひどい（ひどい）tồi tệ, kinh khủng (0.91)<br>危険（きけん）nguy hiểm (0.91)<br>つまらない（つまらない）chán, tẻ nhạt (0.91) |
| 再来月（さらいげつ）tháng sau nữa | 来月（らいげつ）tháng sau (0.98)<br>再来年（さらいねん）năm sau nữa (0.97)<br>再来週（さらいしゅう）tuần sau nữa (0.96)<br>先月（せんげつ）tháng trước (0.94)<br>来年（らいねん）năm sau (0.94)<br>来週（らいしゅう）tuần sau (0.94) |
| ポケット（ポケット）túi (áo, quần) | すり（すり）kẻ móc túi (0.95)<br>ハンドバッグ（ハンドバッグ）túi xách tay (0.93)<br>服（ふく）quần áo (0.92)<br>ボタン（ボタン）cái nút, cúc áo (0.92)<br>封筒（ふうとう）phong bì (0.92)<br>かばん（かばん）cái cặp, túi xách (0.92) |
