// ============================================
// Dialogue System with Intent + Memory
// (ACK / REFLECT / NEXT + Scene handlers)
// ============================================

class DialogueSystem {
    constructor() {
        this.currentState = 'start';

        // --- Memory (超重要：噛み合い改善) ---
        this.turnCount = 0;
        this.lastUserIntent = null;
        this.lastUserText = '';
        this.lastBotText = '';
        this.lastBotQuestion = ''; // ボットが直近に投げた質問（「え？」対策）
        this.lastTopic = null;

        // ===========================
        // Core response pools (既存)
        // ===========================
        this.ACK = [
            "うんうん、聞いたよ",
            "なるほどね",
            "そっかそっか",
            "わかったよ",
            "了解だよ",
            "大丈夫だよ",
            "それは大変だね",
            "おつかれさまだよ",
            "よく頑張ってるね",
            "それ、ちゃんとしんどいね",
            "それ、疲れちゃうよね",
            "それはモヤモヤするね",
            "それはドッとくるね",
            "それ、気持ちが重くなるね",
            "それ、心がきゅってなるね",
            "それ、地味に削られるね",
            "今日はそういう日かもね",
            "ひと息つきたいね",
            "うん、無理しなくていいよ",
            "ゆっくりで大丈夫だよ",
            "ちゃんと受け止めたよ",
            "状況、わかってきたよ",
            "それ、言葉にできてえらいよ",
            "話してくれてありがとう",
            "うん、そうなるのも自然だよ",
            "その気持ち、わかるよ",
            "それは嫌になるよね",
            "それ、気が重いよね",
            "それ、落ち着かないよね",
            "それ、やりたくなくなるよね",
            "それ、考えるだけで疲れるね",
            "うん、焦らなくていいよ",
            "今はそれで十分だよ",
            "ここまでで十分進んでるよ",
            "それ、ちゃんと大事な話だよ",
            "うん、いったん整理しなくてもいいよ",
            "まずは聞くよ",
            "もう少しだけ一緒に見よ",
            "大丈夫、ちゃんと進めるよ",
            "いったん落ち着いていこ",
            "うん、そこで止まるの分かるよ",
            "それ、抱えすぎなくていいよ",
            "それ、ひとりで持たなくていいよ",
            "よし、ここから一歩ずついこ",
            "うん、今のままでいいよ"
        ];

        this.REFLECT = [
            "〇〇ってやつだね",
            "〇〇が気になってるんだね",
            "〇〇って聞くと、ちょっと重たいね",
            "〇〇のところで止まりがちなのかな",
            "〇〇が頭の中でぐるぐるしてる感じ？",
            "〇〇、ちょっと手強いね",
            "〇〇って、地味に難しいよね",
            "〇〇、今日は強いね",
            "〇〇のところがイヤだったんだね",
            "〇〇の話、もうちょっと聞かせて",
            "〇〇がいちばん大きいのかな",
            "〇〇があると、足が止まるよね",
            "〇〇のところ、ふわっと不安？",
            "〇〇って、やる前に疲れるタイプ？",
            "〇〇、避けたくなる気持ちわかるよ",
            "〇〇の場面、想像できちゃった",
            "〇〇って、ちょっと心がザワザワするね",
            "〇〇のところ、いったん小さくしたいね",
            "〇〇が一番やっかい？",
            "〇〇って、誰かに任せたいタイプ？",
            "〇〇って、こまかいの？",
            "〇〇って、気持ちの問題？作業の問題？",
            "〇〇、時間が吸われがち？",
            "〇〇が出ると、ペース崩れるよね",
            "〇〇が気になるのは自然だよ",
            "〇〇って、今の気分に合わないやつだね",
            "〇〇って、なんか落ち着かないよね",
            "〇〇のところ、ひっかかりポイントだね",
            "〇〇って、決めづらいよね",
            "〇〇が出ると、いったん止まるね",
            "〇〇、いったん棚に置く？",
            "〇〇の話、今日はそこが主役だね",
            "〇〇、いまは優しく扱お",
            "〇〇、そこは無理しないでいいよ",
            "〇〇、今は重く感じるよね"
        ];

        this.NEXT_CHAT = [
            "いまの気分、ひとことで言うとどれかな",
            "今日は元気の残り、どれくらい？",
            "それ、今すぐじゃなくても大丈夫そう？",
            "ちょっとだけ、もう一個だけ聞いてもいい？",
            "何がいちばんイヤだった？",
            "どこで一番疲れちゃった？",
            "いま必要なの、休憩？おしゃべり？どっちかな",
            "いったん深呼吸してから、続き聞こっか",
            "ゆっくりでいいから、状況を一行で教えて",
            "それ、昨日から？今日から？",
            "それが終わったら、何したい？",
            "いま体のどこが固い？肩？頭？",
            "いまは気持ちを軽くしたい？それとも解決したい？",
            "その件、誰かに話した？まだ内緒？",
            "こうなったらうれしい、ってある？",
            "いちばん小さい一手を一緒に選ぼ",
            "今日の自分に優しくするなら、何を削る？",
            "それ、笑い話に変えるならどうなる？",
            "今の気持ちに名前つけるとしたら？",
            "その話、もうちょい聞いてもいい？",
            "大丈夫、今は整理しなくてもいいよ。聞くよ",
            "困ってるとモヤモヤ、どっちが近い？",
            "1分だけ作戦会議する？それとも雑談する？",
            "それ、明日の自分に渡しちゃうのはアリ？",
            "今、甘いもの食べたい気分？",
            "それ、やるなら朝がいい？夜がいい？",
            "やりたくない度、何点くらい？",
            "いま一番ほしいの、安心？元気？時間？",
            "その件、いったん一緒に軽くしてみよっか",
            "うんうん。で、続きはどうなったの？",
            "その場面、どんな顔になってた？",
            "その場面、音で言うとどんな感じ？",
            "今の気持ち、天気で言うと何？",
            "今日はできたことを一個だけ拾お",
            "それ、やらない選択肢もあるよ",
            "いったん、いちばん楽なルート探そ",
            "その件、優先度は高め？低め？",
            "いまだけの応急処置でいい？",
            "ちょっとだけ気分転換してから戻る？",
            "次の一歩は小さくしよ"
        ];

        this.NEXT_WORK = [
            "まずは候補を出すだけでいい感じ？",
            "候補はざっくり3つくらいでいい？",
            "いちばん大事にしたいの、スピード？安心？どっちかな",
            "絶対に外したくない条件、ひとつだけ教えて",
            "テンプレでサクッと行く？ちょい丁寧に行く？",
            "紹介文は短めでいい？ちゃんとめがいい？",
            "今ある情報だけで出しちゃって大丈夫そう？",
            "もう一個だけ聞いてから出す？それとも先に出す？",
            "似たケース、前にあった？なければOKだよ",
            "選ぶとき、いつも見てるポイントある？",
            "業界だけでも分かると助かるかも",
            "この件、急ぎ？今日中？明日でOK？",
            "候補の幅は広めがいい？ピンポイントがいい？",
            "いったんそれっぽいのを出してから直す作戦でもいいよ",
            "ミスりたくないところ、そこだけ教えて",
            "紹介先のトーンはカッチリ？やわらかめ？",
            "情報が少ないとき、いつもどう決めてる？",
            "無難に行く？ちょい攻める？どっちが気分？",
            "まずは一回出して、違ったら直すでいこ",
            "いったん仮でいい？あとで更新する？",
            "条件、ひとつだけ固定しよっか",
            "入力文、短くてもいい？長めがいい？",
            "最後のメール、定型で行けそう？",
            "やる順番、先に候補→あとで文章でいい？",
            "小さく一歩だけ進めよ"
        ];

        // ===========================
        // Scene pools (追加：噛み合い改善)
        // ===========================
        this.GREET = {
            morning: ["おはよう。", "おはようだよ。", "おはよう。今日はどんな感じ？"],
            day: ["こんにちは。", "こんにちはだよ。", "こんにちは。今日はどんな感じ？"],
            evening: ["こんばんは。", "こんばんはだよ。", "こんばんは。夜はどんな感じ？"],
            any: [
                "こんにちは。今日はどんな感じ？",
                "やっほ。今の気分だけ教えて。",
                "こんにちは。近況きく？それとも雑談する？"
            ]
        };

        this.BYE = [
            "うん、またね。",
            "また話そ。",
            "おつかれさま。またね。",
            "おやすみ。ゆっくり休んでね。"
        ];

        this.THANKS = [
            "どういたしまして。",
            "うん、よかった。",
            "役に立てたならうれしいよ。",
            "こちらこそ、話してくれてありがとう。"
        ];

        this.BACKCHANNEL = [
            "うん。",
            "なるほど。",
            "そうなんだね。",
            "了解。",
            "たしかに。",
            "うんうん。"
        ];

        // 1〜3文字や困惑用（「え？」対策）
        this.CLARIFY_SHORT = [
            "ごめん、どれに対しての返事かな？",
            "うん、今のどこが引っかかった？",
            "もう一回だけ教えて。どこが気になった？"
        ];

        // 挨拶の"次"を自然にする軽い導入
        this.GREET_NEXT = [
            "今日は元気？それとも疲れ気味？",
            "いま、何してた？",
            "最近、ちょっとでも楽しかったことある？",
            "今日の気分、ひとことで言うとどれ？"
        ];

        // 挨拶・相槌がREFLECTに落ちないようにブロックする語
        this.BLOCK_KEYWORDS = new Set([
            "こんにちは", "こんばんは", "おはよう", "はじめまして",
            "やあ", "やっほ", "もしもし",
            "うん", "うんうん", "そう", "なるほど", "へー", "了解", "おけ", "ok",
            "ありがとう", "ありがと", "助かった",
            "またね", "おやすみ", "ばいばい"
        ]);

        // ===========================
        // Scenes (10シーン)
        // ===========================
        this.SCENES = {
            sleep: {
                triggers: ["眠い", "ねむい", "寝不足", "ねぶそく", "だるい", "起きた", "まだ眠い", "二度寝", "昼寝", "ねれない", "寝れない", "夜更かし", "あくび"],
                openers: [
                    "ねむいの来たね。",
                    "眠さ、けっこう強そうだね。",
                    "それはもう、眠い案件だよ。"
                ],
                asks: [
                    "いま何点くらい眠い？10が限界として。",
                    "今日は何時間くらい寝た？",
                    "いま、頭が眠い？体が眠い？どっち寄り？",
                    "5分だけ目を閉じる作戦、アリ？",
                    "コーヒー派？水で耐える派？"
                ],
                tips: [
                    "いったん水飲も。ちょっとだけ復活するやつ。",
                    "今すぐ全部は無理でも、1個だけやるのはできるかも。",
                    "眠い時は、難しいことは明日に回していいよ。"
                ]
            },

            food: {
                triggers: ["お腹", "おなか", "腹", "はら", "ごはん", "ご飯", "昼", "夜ごはん", "朝ごはん", "何食べ", "食べた", "食べる", "空腹", "おやつ", "甘いもの", "ラーメン", "カレー", "寿司"],
                openers: [
                    "ごはんの話だ。いいね。",
                    "お腹の話、重要だよ。",
                    "それ、まず栄養だね。"
                ],
                asks: [
                    "いま何食べたい気分？しょっぱい？甘い？",
                    "今日はもう食べた？それともまだ？",
                    "一番ラクに食べられるやつ、なに？",
                    "コンビニなら、何が正解そう？",
                    "温かいのいく？冷たいのいく？"
                ],
                tips: [
                    "お腹すいてると、気持ちもザワつきやすいよ。",
                    "まず一口入れると、世界がちょっと優しくなる。",
                    "ちゃんと食べたら勝ち。"
                ]
            },

            weather: {
                triggers: ["寒い", "さむい", "暑い", "あつい", "雨", "あめ", "風", "かぜ", "雪", "ゆき", "湿気", "じめじめ", "天気", "晴れ", "くもり", "気圧", "台風"],
                openers: [
                    "天気でやられてるやつだね。",
                    "うん、今日は空が強い日だ。",
                    "それ、外のコンディションが悪いね。"
                ],
                asks: [
                    "寒い？暑い？どっちがつらい？",
                    "外出予定ある？それとも引きこもりでOK？",
                    "体のどこが影響受けてる？頭？肩？",
                    "あったかい飲み物いく？",
                    "今日の気分、天気に引っ張られてる？"
                ],
                tips: [
                    "天気悪い日は、ちょっと元気減るの普通だよ。",
                    "今日は省エネ運転でいこ。",
                    "あったかいの飲んで、体だけ先に助けよ。"
                ]
            },

            worklight: {
                triggers: ["仕事", "会議", "メール", "連絡", "返信", "タスク", "締切", "納期", "進捗", "資料", "上司", "同僚", "打ち合わせ", "スラック", "Slack", "Teams"],
                openers: [
                    "仕事のやつね。うん、いっしょに軽くしよ。",
                    "仕事モードの話だ。重くしないでいこ。",
                    "それ、やる気は後でいい。まず一歩だね。"
                ],
                asks: [
                    "いま一番だるいの、どれ？メール？会議？作業？",
                    "今日中に必要？それとも明日でも平気？",
                    "まずは10分だけ進めるとしたら、どこ触る？",
                    "誰かに投げられる部分ある？",
                    "最悪、最低ラインはどこ？"
                ],
                tips: [
                    "いったん仮で出して、あとで直すでいいよ。",
                    "1個だけ終わらせると気持ち軽くなるやつ。",
                    "やる気待たないで、手だけ動かすの強い。"
                ]
            },

            praise: {
                triggers: ["できた", "やった", "終わった", "片付けた", "提出", "送った", "進んだ", "がんばった", "頑張った", "達成", "完了", "クリア"],
                openers: [
                    "えらい。ほんとにえらい。",
                    "それ、ちゃんと前進だよ。",
                    "うんうん、勝ってる。"
                ],
                asks: [
                    "それ、何点くらいの偉さ？10が神として。",
                    "今日の『よくやった』もう一個ある？",
                    "次にやるなら、いちばん軽いやつどれ？",
                    "自分にごほうび、何がいい？",
                    "それやった時、ちょっと気分上がった？"
                ],
                tips: [
                    "できた報告は、会話の燃料だよ。",
                    "その調子で、次も小さくいこ。",
                    "今日はちゃんと勝ってる日。"
                ]
            },

            hobby: {
                triggers: [
                    "趣味", "推し", "推し活", "オタ", "沼", "グッズ", "ライブ", "現場", "配信", "イベント",
                    "ゲーム", "ガチャ", "ログイン", "周回", "ランク", "ソシャゲ", "スイッチ", "steam",
                    "映画", "ドラマ", "アニメ", "漫画", "マンガ", "小説", "本", "読書", "ネタバレ",
                    "音楽", "曲", "プレイリスト", "YouTube", "ユーチューブ", "TikTok", "ティックトック"
                ],
                openers: [
                    "いいね、その話すき。",
                    "うんうん、趣味の話しよ。",
                    "それ、心の栄養だね。",
                    "推しとか趣味の話って、元気出るやつだ。"
                ],
                asks: [
                    "それ、どこが一番好き？",
                    "今いちばん熱いの、なに？",
                    "沼り度、何点？10が底なしとして。",
                    "それ、誰かに布教したくなるタイプ？",
                    "最近それで笑った瞬間あった？",
                    "いまから5分だけ触るなら、何する？",
                    "逆に、最近ちょっと飽きてきたやつある？"
                ],
                tips: [
                    "好きなものの話は、ちゃんと回復するよ。",
                    "趣味がある時点で、生活の勝率あがる。",
                    "推しは、日々の燃料。"
                ]
            },

            body: {
                triggers: [
                    "頭痛", "ずつう", "頭が痛い", "痛い", "偏頭痛", "片頭痛",
                    "肩こり", "肩凝り", "肩が重い", "首こり", "首が痛い",
                    "目が", "目がしょぼ", "しょぼしょぼ", "目が疲れ", "眼精疲労",
                    "腰", "腰痛", "だるい", "疲れた", "疲労", "眠気", "むくみ",
                    "喉", "咳", "せき", "鼻", "鼻水", "花粉", "寒気", "熱っぽい"
                ],
                openers: [
                    "うわ、それは体がしんどいサインだね。",
                    "体の不調、地味にメンタルも削るよね。",
                    "うんうん、まず体を助けよ。",
                    "その感じ、無理しない方がいいやつ。"
                ],
                asks: [
                    "どこが一番つらい？頭？肩？目？",
                    "いまのつらさ、10段階でどれくらい？",
                    "水分は足りてそう？",
                    "今日、画面見すぎた？",
                    "あったかくするのと、ちょい伸ばすの、どっちが良さそう？",
                    "いま痛いの、ズキズキ？重い？チクチク？"
                ],
                tips: [
                    "いったん水飲も。ほんとに侮れない。",
                    "肩は1回すくめてストンって落とすだけでも少し楽。",
                    "目は遠くを見るだけで、ちょっと戻る時あるよ。",
                    "今日は省エネでいい。体が主役の日。"
                ]
            },

            social: {
                triggers: [
                    "人間関係", "上司", "同僚", "部下", "先輩", "後輩", "社内", "職場", "会社",
                    "家族", "親", "母", "父", "兄", "姉", "弟", "妹", "子ども", "旦那", "夫", "妻", "彼氏", "彼女",
                    "友達", "友人", "知り合い", "LINE", "既読", "未読", "返信", "返事",
                    "言われた", "怒られた", "注意", "揉め", "もめ", "気まず", "距離感", "空気"
                ],
                openers: [
                    "人の話は、体力使うよね。",
                    "うん、それは気を使うやつだ。",
                    "その手のやつ、地味に刺さるよね。",
                    "なるほど…それ、ちょっと心がザワつくね。"
                ],
                asks: [
                    "その人、どんな感じのタイプ？",
                    "いま一番引っかかってるの、どの一言？",
                    "それ、言い返したい？流したい？どっち寄り？",
                    "距離を取るのが良さそう？それとも話した方が良さそう？",
                    "いま欲しいのは、共感？作戦？",
                    "その件、あなたは悪くないと思う？どう感じてる？"
                ],
                tips: [
                    "人間関係って、正解探し始めると沼るよね。",
                    "まず『自分の安全』を優先でいいよ。",
                    "言葉って刺さるけど、あなたの価値は減らない。"
                ]
            },

            choice: {
                triggers: [
                    "迷う", "迷って", "決められない", "決めれない", "どっち", "どちら", "選べない", "悩む", "悩んで",
                    "AかB", "aかb", "どれがいい", "どうしよう", "詰ん", "詰んだ", "優先", "優先度", "比較"
                ],
                openers: [
                    "迷いの時間だね。あるある。",
                    "うん、決めづらいやつ来たね。",
                    "それ、どっちも捨てがたいんだね。",
                    "悩むの、ちゃんと真面目に考えてる証拠だよ。"
                ],
                asks: [
                    "いま候補って何と何？",
                    "一番大事にしたいの、安心？楽しさ？ラクさ？",
                    "最悪どっちがマシ？って聞き方なら決めやすい？",
                    "3日後の自分が助かるのはどっち？",
                    "今の体力でできるのはどっち？",
                    "誰にも見せない前提なら、どっち選ぶ？"
                ],
                tips: [
                    "迷うときは、条件を1個だけ固定すると早いよ。",
                    "『仮決め』してみると、気持ちが反応して答え出る時ある。",
                    "どっちでも大事故じゃないなら、ラクな方でOK。"
                ]
            },

            plan: {
                triggers: [
                    "予定", "週末", "今週", "来週", "今日なに", "今日何", "何する", "なにする", "どこ行",
                    "旅行", "出かけ", "外出", "散歩", "買い物", "映画行", "カフェ", "ごはん行",
                    "明日", "今日", "今夜", "今晩", "朝", "昼", "夜", "休み", "休日", "連休"
                ],
                openers: [
                    "予定の話、いいね。ちょっと整えよ。",
                    "うん、今日の流れ作るやつだね。",
                    "計画たてると、気持ちが落ち着く時あるよね。",
                    "よし、軽く予定会議しよ。"
                ],
                asks: [
                    "今日のゴール、ひとつだけ決めるなら何にする？",
                    "体力は今どれくらい？省エネでいく？",
                    "外に出たい？家で回復したい？",
                    "お金は使う日？使わない日？",
                    "時間はどれくらいある？30分？半日？",
                    "今日の気分に合うの、静か系？にぎやか系？"
                ],
                tips: [
                    "予定は『1個だけ』決めると動きやすいよ。",
                    "回復日も予定。サボりじゃない。",
                    "やること詰めすぎない方が、結局うまくいく。"
                ]
            }
        };
    }

    // ===========================================
    // Utilities
    // ===========================================
    pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // 直前と同じ文になりにくくする（地味に効く）
    pickNotSame(arr, lastText) {
        if (!arr || arr.length === 0) return "";
        if (arr.length === 1) return arr[0];
        for (let i = 0; i < 6; i++) {
            const c = this.pickRandom(arr);
            if (c !== lastText) return c;
        }
        return this.pickRandom(arr);
    }

    normalize(text) {
        return (text || "")
            .trim()
            .replace(/\s+/g, " ")
            .replace(/[！？!]+/g, "？") // 語尾統一（軽く）
            .toLowerCase();
    }

    isVeryShort(text) {
        const t = (text || "").trim();
        return t.length <= 3;
    }

    // ===========================================
    // Intent classification (超重要)
    // ===========================================
    classifyIntent(rawText) {
        const t = this.normalize(rawText);

        if (!t) return "empty";

        // greet
        if (/(おはよう|こんにちは|こんばんは|はじめまして|やあ|やっほ|もしもし)/.test(t)) return "greet";

        // bye
        if (/(またね|おやすみ|ばいばい|じゃあね|またあとで)/.test(t)) return "bye";

        // thanks
        if (/(ありがとう|ありがと|助かった|感謝)/.test(t)) return "thanks";

        // confusion / short reply
        if (this.isVeryShort(t) || /(え\??|ん\??|は\??|なに\??)/.test(t)) return "short";

        // backchannel
        if (/^(うん|うんうん|そう|なるほど|了解|おけ|ok|たしかに)$/.test(t)) return "backchannel";

        // vent / tired
        if (/(疲|しんど|つら|だる|無理|むり|もうだめ|きつい|泣)/.test(t)) return "vent";

        // question
        if (/(？|\?$|って何|どうや|教えて|わかる|できる\??)/.test(t)) return "question";

        // request
        if (/(して|やって|作って|直して|追加して|まとめて)/.test(t)) return "request";

        // light work (ワードが入ってたら仕事寄り)
        if (/(仕事|会議|タスク|メール|案件|納期|進捗|連絡)/.test(t)) return "worklight";

        return "smalltalk";
    }

    // ===========================================
    // Scene detection (優先順位付き)
    // ===========================================
    detectScene(rawText, ctx = {}) {
        const t = (rawText || "").trim();
        if (!t) return null;

        if (this.matchTriggers(t, this.SCENES.praise.triggers)) return "praise";
        if (this.matchTriggers(t, this.SCENES.body.triggers)) return "body";
        if (this.matchTriggers(t, this.SCENES.social.triggers)) return "social";
        if (this.matchTriggers(t, this.SCENES.choice.triggers)) return "choice";
        if (this.matchTriggers(t, this.SCENES.plan.triggers)) return "plan";
        if (this.matchTriggers(t, this.SCENES.hobby.triggers)) return "hobby";

        if (this.matchTriggers(t, this.SCENES.worklight.triggers)) return "worklight";
        if (this.matchTriggers(t, this.SCENES.sleep.triggers)) return "sleep";
        if (this.matchTriggers(t, this.SCENES.food.triggers)) return "food";
        if (this.matchTriggers(t, this.SCENES.weather.triggers)) return "weather";

        return null;
    }

    matchTriggers(text, triggers) {
        const s = String(text);
        return triggers.some(k => s.includes(k));
    }

    buildSceneReply(sceneKey, ctx) {
        const scene = this.SCENES[sceneKey];
        if (!scene) return null;

        const opener = this.pickNotSame(scene.openers, this.lastBotText);
        // 質問を投げて会話を前に進める（会話感を出す）
        const ask = this.pickNotSame(scene.asks, this.lastBotText);

        // たまにtipsを混ぜる（単調さを回避）
        const roll = Math.random();
        let out = "";
        if (roll < 0.25) {
            const tip = this.pickNotSame(scene.tips, this.lastBotText);
            out = this.joinSentences([opener, tip, ask]);
        } else {
            out = this.joinSentences([opener, ask]);
        }

        return out;
    }

    // ===========================================
    // Keyword extraction (REFLECT用) 事故防止つき
    // ===========================================
    extractKeyword(text) {
        if (!text) return null;
        const raw = text.trim();
        const cleaned = raw.replace(/[。、！？!?]/g, "").trim();
        if (!cleaned) return null;

        // ブロック（挨拶や相槌でREFLECTしない）
        if (this.BLOCK_KEYWORDS.has(cleaned)) return null;

        // すごく短いのはREFLECTに向かない
        if (cleaned.length <= 4) return null;

        // 短いならそのまま
        if (cleaned.length <= 14) return cleaned;

        // Split by punctuation, take first segment
        const parts = raw.split(/[。、！？!?\n]/);
        let keyword = (parts[0] || "").trim();

        if (keyword.length > 14) keyword = keyword.slice(0, 14);
        keyword = keyword.replace(/[。、！？!?]/g, "").trim();

        if (!keyword || this.BLOCK_KEYWORDS.has(keyword) || keyword.length <= 4) return null;
        return keyword;
    }

    // ===========================================
    // Main entry
    // ===========================================
    step(userText, ctx = {}) {
        const mode = ctx.mode || "chat";
        const intent = this.classifyIntent(userText);

        this.turnCount += 1;
        this.lastUserText = userText || "";
        this.lastUserIntent = intent;

        // 初回挨拶（空打ち起動）
        if (!userText || userText.trim() === "") {
            if (this.currentState === "start") {
                this.currentState = "conversation";
                const greet = this.pickRandom(this.GREET.any);
                const next = this.pickRandom(this.GREET_NEXT);
                const text = this.joinSentences([greet, next]);
                return this.finalize(text, ctx, "happy", this.extractQuestion(text));
            }
            return this.finalize("うん、聞いてるよ。", ctx, "neutral", "");
        }

        this.currentState = "conversation";

        // Intent-driven response
        const replyObj = this.generateResponse(userText, { ...ctx, mode, intent });

        // Memory update
        this.lastBotText = replyObj.text;
        this.lastBotQuestion = replyObj._question || "";

        // API互換のため _question は外す
        delete replyObj._question;
        return replyObj;
    }

    // ===========================================
    // Response generator (意図で分岐)
    // ===========================================
    generateResponse(text, ctx) {
        const mode = ctx.mode || "chat";
        const intent = ctx.intent || "smalltalk";
        const sceneKey = this.detectScene(text, ctx);

        // 1) greet：REFLECT禁止。導入を必ず入れる。
        if (intent === "greet") {
            const greet = this.pickGreetByTime(text);
            const next = this.pickNotSame(this.GREET_NEXT, this.lastBotText);
            const out = this.joinSentences([greet, next]);
            return this.finalize(out, ctx, "happy", this.extractQuestion(out));
        }

        // 2) bye
        if (intent === "bye") {
            const out = this.pickNotSame(this.BYE, this.lastBotText);
            return this.finalize(out, ctx, "neutral", "");
        }

        // 3) thanks
        if (intent === "thanks") {
            const out = this.pickNotSame(this.THANKS, this.lastBotText);
            return this.finalize(out, ctx, "happy", "");
        }

        // 4) backchannel（質問しない。話を続ける短い一言）
        if (intent === "backchannel") {
            const a = this.pickNotSame(this.BACKCHANNEL, this.lastBotText);
            const b = (mode === "work")
                ? "じゃあ、どこからやる？"
                : "それで、続きはどうなった？";
            const out = this.joinSentences([a, b]);
            return this.finalize(out, ctx, "neutral", this.extractQuestion(out));
        }

        // 5) short / confusion（え？等）→ 直前の質問に戻す
        if (intent === "short") {
            // 直前にボット質問があれば、それを再提示
            if (this.lastBotQuestion) {
                const out = this.joinSentences([
                    "ごめん、言い方変だったね。",
                    this.lastBotQuestion
                ]);
                return this.finalize(out, ctx, "neutral", this.lastBotQuestion);
            }
            // 質問が無ければ clarifier
            const out = this.pickRandom(this.CLARIFY_SHORT);
            return this.finalize(out, ctx, "neutral", this.extractQuestion(out));
        }

        // 6) vent：共感→選択肢（sceneがあればscene優先）
        if (intent === "vent") {
            if (sceneKey && sceneKey !== "worklight") {
                const out = this.buildSceneReply(sceneKey, ctx);
                return this.finalize(out, ctx, "concerned", this.extractQuestion(out));
            }
            const ack = this.pickNotSame(this.ACK, this.lastBotText);
            const next = (mode === "work")
                ? "いったん、今いちばん急ぐやつだけ教えて。"
                : "いまは吐き出したい？それとも少しだけ軽くしたい？";
            const out = this.joinSentences([ack, next]);
            return this.finalize(out, ctx, "concerned", this.extractQuestion(out));
        }

        // 7) question / request / worklight：まず受けて、確認を1個だけ
        if (intent === "question" || intent === "request" || intent === "worklight") {
            if (sceneKey === "worklight") {
                const out = this.buildSceneReply("worklight", ctx);
                return this.finalize(out, ctx, "serious", this.extractQuestion(out));
            }
            const ack = this.pickNotSame(this.ACK, this.lastBotText);
            const confirm = (mode === "work")
                ? "一個だけ聞くね。ゴールは何にしたい？"
                : "一個だけ聞くね。どうなったらうれしい？";
            const out = this.joinSentences([ack, confirm]);
            return this.finalize(out, ctx, intent === "worklight" ? "serious" : "neutral", this.extractQuestion(out));
        }

        // 8) smalltalkで scene が取れたら、シーン返答を優先
        if (sceneKey) {
            const out = this.buildSceneReply(sceneKey, ctx);
            return this.finalize(out, ctx, this.detectMood(text), this.extractQuestion(out));
        }

        // 9) smalltalk：基本は「ACK or REFLECT + NEXT」だが、REFLECTはキーワードが取れた時だけ
        const keyword = this.extractKeyword(text);
        const next = (mode === "work")
            ? this.pickNotSame(this.NEXT_WORK, this.lastBotText)
            : this.pickNotSame(this.NEXT_CHAT, this.lastBotText);

        let out = "";
        const roll = Math.random();

        if (keyword && roll < 0.55) {
            // REFLECT + NEXT（噛み合う時だけ）
            const template = this.pickRandom(this.REFLECT);
            out = this.joinSentences([template.replace(/〇〇/g, keyword), next]);
        } else if (roll < 0.35) {
            // ACK + NEXT
            const ack = this.pickNotSame(this.ACK, this.lastBotText);
            out = this.joinSentences([ack, next]);
        } else {
            // ACKのみ（短く）
            out = this.pickNotSame(this.ACK, this.lastBotText);
        }

        return this.finalize(out, ctx, this.detectMood(text), this.extractQuestion(out));
    }

    // ===========================================
    // Output polish
    // ===========================================
    joinSentences(parts) {
        const cleaned = (parts || [])
            .filter(Boolean)
            .map(s => String(s).trim())
            .filter(s => s.length > 0);

        if (cleaned.length === 0) return "";

        // 句点がすでにあるなら足さない
        const out = [];
        for (let i = 0; i < cleaned.length; i++) {
            let s = cleaned[i];
            if (i === 0) { out.push(s); continue; }
            // 前が「？」や「。」で終わってなければ「。」でつなぐ
            const prev = out[out.length - 1];
            const end = prev.slice(-1);
            if (end !== "。" && end !== "？" && end !== "!" && end !== "！") {
                out[out.length - 1] = prev + "。";
            }
            out.push(s);
        }
        return out.join(" ");
    }

    // ボットの文から「質問っぽい部分」だけ抽出（簡易）
    extractQuestion(text) {
        if (!text) return "";
        const t = String(text).trim();

        // 末尾が？なら全体を質問として扱う
        if (t.endsWith("？")) return t;

        // 文中に？があれば最後の？を含む文を拾う
        const idx = t.lastIndexOf("？");
        if (idx >= 0) {
            // 直前の句点から切る
            const before = t.lastIndexOf("。", idx);
            const start = before >= 0 ? before + 1 : 0;
            return t.slice(start).trim();
        }
        return "";
    }

    pickGreetByTime(text) {
        const t = this.normalize(text);
        if (t.includes("おはよう")) return this.pickRandom(this.GREET.morning);
        if (t.includes("こんばんは")) return this.pickRandom(this.GREET.evening);
        if (t.includes("こんにちは")) return this.pickRandom(this.GREET.day);
        return this.pickRandom(this.GREET.any);
    }

    detectMood(text) {
        if (!text) return "neutral";
        const t = this.normalize(text);

        if (/(ありがとう|嬉|楽し)/.test(t)) return "happy";
        if (/(困|大変|疲|しんど|つら|だる)/.test(t)) return "concerned";
        if (/(仕事|進捗|案件|会議|納期)/.test(t)) return "serious";
        return "neutral";
    }

    // 仕上げ：呼び名差し込み（今の仕様を維持しつつ、前置きだけに）
    finalize(text, ctx, mood, question) {
        let out = String(text || "").trim();

        // userNameは前置きに入れる（乱数は少し下げる）
        if (ctx.userName && Math.random() < 0.07) {
            const prefix = this.pickRandom([`${ctx.userName}、`, `${ctx.userName}、ね。`]);
            if (!out.startsWith(ctx.userName)) out = prefix + out;
        }

        // 同じ返答を続けない（最低限）
        if (out === this.lastBotText) {
            out = out + " うん。";
        }

        return { text: out, mood: mood || "neutral", _question: question || "" };
    }
}
