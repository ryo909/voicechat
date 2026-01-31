// ============================================
// Dialogue System with ACK / REFLECT / NEXT
// ============================================

class DialogueSystem {
    constructor() {
        this.currentState = 'start';

        // ACK responses (45 items)
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
            "うん、いったん整理しなくていいよ",
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

        // REFLECT responses (35 items) - 〇〇 will be replaced with keyword
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

        // NEXT for chat mode (40 items)
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

        // NEXT for work mode (25 items)
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
    }

    // Extract keyword from user text (simple approach)
    extractKeyword(text) {
        if (!text || text.length < 2) return null;

        // If short, use as-is
        if (text.length <= 14) {
            return text.replace(/[。、！？!?]/g, '').trim();
        }

        // Split by punctuation, take first segment
        const parts = text.split(/[。、！？!?\n]/);
        let keyword = parts[0].trim();

        // Limit to 14 chars
        if (keyword.length > 14) {
            keyword = keyword.slice(0, 14);
        }

        return keyword || null;
    }

    // Main entry
    step(userText, ctx = {}) {
        // Initial greeting
        if (!userText || userText.trim() === '') {
            if (this.currentState === 'start') {
                this.currentState = 'conversation';
                return { text: "こんにちは！何かお話ししましょう", mood: "happy" };
            }
            return { text: "うん、聞いてるよ", mood: "neutral" };
        }

        this.currentState = 'conversation';
        return this.generateResponse(userText, ctx);
    }

    generateResponse(text, ctx) {
        const mode = ctx.mode || 'chat';

        // Randomly decide response pattern
        const roll = Math.random();

        let reply;
        if (roll < 0.35) {
            // ACK only
            reply = this.pickRandom(this.ACK);
        } else if (roll < 0.55) {
            // ACK + NEXT
            const ack = this.pickRandom(this.ACK);
            const next = mode === 'work' ? this.pickRandom(this.NEXT_WORK) : this.pickRandom(this.NEXT_CHAT);
            reply = ack + "。" + next;
        } else if (roll < 0.75) {
            // REFLECT
            const keyword = this.extractKeyword(text);
            if (keyword) {
                const template = this.pickRandom(this.REFLECT);
                reply = template.replace(/〇〇/g, keyword);
            } else {
                reply = this.pickRandom(this.ACK);
            }
        } else {
            // REFLECT + NEXT
            const keyword = this.extractKeyword(text);
            const next = mode === 'work' ? this.pickRandom(this.NEXT_WORK) : this.pickRandom(this.NEXT_CHAT);
            if (keyword) {
                const template = this.pickRandom(this.REFLECT);
                reply = template.replace(/〇〇/g, keyword) + "。" + next;
            } else {
                reply = this.pickRandom(this.ACK) + "。" + next;
            }
        }

        // Maybe add user name
        if (ctx.userName && Math.random() < 0.10) {
            const suffix = [" " + ctx.userName + "、", "ね、" + ctx.userName + "。"];
            if (!reply.includes(ctx.userName)) {
                reply = this.pickRandom(suffix) + reply;
            }
        }

        return { text: reply, mood: this.detectMood(text) };
    }

    detectMood(text) {
        if (!text) return 'neutral';
        const t = text.toLowerCase();

        if (t.includes('ありがとう') || t.includes('嬉し') || t.includes('楽し')) return 'happy';
        if (t.includes('困') || t.includes('大変') || t.includes('疲') || t.includes('しんど')) return 'concerned';
        if (t.includes('仕事') || t.includes('進捗') || t.includes('案件')) return 'serious';

        return 'neutral';
    }

    pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}
