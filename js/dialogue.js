// ============================================
// DialogueSystem v5.0 (Bubble separated + Topic lock + SideTalk handling)
// - chat text: natural text only
// - bubble: ACK / nonverbal only (never injected into text)
// - 1Q rule removed (ask is optional)
// ============================================

class DialogueSystem {
    constructor() {
        this.turn = 0;

        // --- core state
        this.currentState = "start";
        this.activeTopic = null;   // PLAN/BODY/HOBBY/SOCIAL/CHOICE
        this.activeScene = null;   // sceneId
        this.sceneStepIndex = 0;
        this.pending = null;       // { topic, scene, slot, kind, askedTurn, retries, askedText }
        this.intent = "CHAT";      // CHAT/COMFORT/DECIDE

        // --- memory
        this.memory = {
            slots: { PLAN: {}, BODY: {}, HOBBY: {}, SOCIAL: {}, CHOICE: {} },
            lastUser: "",
            lastBot: "",
            lastTopic: null,
            lastScene: null,
            sticky: [] // { key, value, topic, ttl, used }
        };

        this._ackHistory = []; // last 2 ACKs

        // --- bubble packs (非言語はここだけ)
        this.BUBBLE_ACK = ["うんうん", "なるほど", "そっか", "了解", "だいじょうぶ", "ふむふむ"];
        this.BUBBLE_REACT = ["（うなずき）", "（しんぱい）", "（にこ）", "（ふむ）", "（ほっ）", "（じーっ）", "（メモ）"];

        // --- dictionaries / templates
        this.ACT_DICT = {
            GREET: ["こんにちは", "こんちは", "やほ", "やあ", "おはよう", "こんばんは"],
            THANKS: ["ありがとう", "助かった", "たすかった", "感謝", "ありがと"],
            APOLOGY: ["ごめん", "すまん", "すみません"],
            BYE: ["またね", "ばいばい", "おやすみ", "じゃあね", "落ちる", "離脱"],

            CONFUSED: ["え？", "えっ", "は？", "ん？", "なに？", "どういうこと？", "わからん", "わかんない", "意味わからん"],
            AFFIRM: ["うん", "うんうん", "そう", "そうだね", "なるほど", "たしかに", "OK", "了解", "りょうかい"],
            DENY: ["ちがう", "違う", "いや", "それじゃない", "そうじゃない", "やだ", "無理", "ムリ"],

            TOPIC_SWITCH: ["話変える", "話を変える", "別の話", "別件", "ところで", "ちなみに", "切り替え", "話題変える"]
        };

        // scene中に話題選択しそうな時のブリッジ
        this.BRIDGE_BACK = [
            "うんうん。そっちも気になるけど、いまの続きだけ先に聞かせてね",
            "OK。あとでそっちも聞くね。まずは今の話をひとつだけ",
            "いったん今のところだけ片づけよ"
        ];

        this.CLOSING = {
            SOFT_END: ["うん、ここまでで十分だよ", "今日はそれだけでもえらいよ", "無理しないでいこ"],
            NEXT_HOOK: ["よし、形になったね", "じゃあ次の一歩だけ決めよ", "ここまで来たらもう勝ちだよ"],
            PLAYFUL_END: ["いいね、その感じだよ", "それ、ちょっと楽しみにしとくね", "あとで成果聞かせてね"]
        };

        // 言い添え（頻度低め）
        this.SOFT_TAGS = [
            "ゆっくりでいいよ",
            "大丈夫だよ",
            "いったん小さくいこ",
            "無理しないでね"
        ];

        // Retry prompts by kind
        this.RETRY = {
            time: [
                "だいたいでいいよ。いつ頃？",
                "今日の中だと、朝/昼/夜どれが近い？",
                "一言でOK。『午前』か『午後』だけでもいいよ"
            ],
            item: [
                "ざっくりでいいよ。何系を買う？",
                "食べ物/日用品/薬…どれが近い？",
                "一言でOK。『日用品』みたいな感じで大丈夫だよ"
            ],
            place: [
                "だいたいでOK。どこでやる感じ？",
                "家/会社/外だとどれが近い？",
                "一言でOK。『家』だけでもいいよ"
            ],
            yesno: [
                "うんか、いや、どっちが近い？",
                "どっちでもOK。今の気分で選んでね",
                "一言でOK。『うん』か『ちがう』で大丈夫だよ"
            ],
            feeling: [
                "気持ち、ひとことで言うとどれ？",
                "モヤ/しんど/イラ…どれが近い？",
                "一言でOK。『疲れた』だけでもいいよ"
            ],
            choice: [
                "ざっくりでいいよ。AとBってどんな二択？",
                "決め手って何になりそう？（お金/時間/気持ち/安心）",
                "一言でOK。『A寄り』か『B寄り』だけでもいいよ"
            ],
            free: [
                "一言でいいよ。どんな感じ？",
                "短くでOK。ざっくり教えて",
                "単語だけでもOKだよ"
            ]
        };

        // --- topic triggers (lightweight)
        this.TOPIC_TRIGGERS = {
            PLAN: ["予定", "今日", "明日", "週末", "土日", "旅行", "どこ行く", "買い物"],
            BODY: ["体調", "頭痛", "肩こり", "眠い", "ねむい", "だるい", "目", "しょぼ", "しょぼしょぼ"],
            HOBBY: ["趣味", "推し", "ゲーム", "映画", "アニメ", "漫画", "音楽"],
            SOCIAL: ["人間関係", "上司", "同僚", "家族", "友だち", "友達", "彼氏", "彼女"],
            CHOICE: ["迷う", "決められない", "どっち", "二択", "選べない"]
        };

        // --- scenes
        this.TOPIC_SCENES = this.buildScenes();
    }

    // -----------------------------
    // Public API
    // -----------------------------
    step(userText, ctx = {}) {
        this.turn++;

        const text = (userText || "").trim();
        const userName = (ctx.userName || "").trim();
        const mascotName = (ctx.mascotName || "").trim();

        // 初回
        if (!text) {
            if (this.currentState === "start") {
                this.currentState = "conversation";
                this.activeTopic = null;
                this.activeScene = null;
                this.pending = null;
                return this.decorate(this.formatReplyV5({
                    lead: "こんにちは！",
                    body: "何かお話ししよ",
                    ask: null,
                    mood: "happy",
                    bubbleType: "ack"
                }), userName, mascotName);
            }
            return this.decorate(this.formatReplyV5({
                lead: "うん",
                body: "聞いてるよ",
                ask: null,
                mood: "neutral",
                bubbleType: "ack"
            }), userName, mascotName);
        }

        this.currentState = "conversation";
        this.memory.lastUser = text;

        const act = this.classifyAct(text);

        // グローバル
        const global = this.handleGlobalActs(act);
        if (global) return this.decorate(global, userName, mascotName);

        // 明示 topic switch（scene中でも最優先で通す）
        if (act === "TOPIC_SWITCH") {
            this.resetTopic();
            return this.decorate(this.formatReplyV5({
                lead: "OK",
                body: "話変えよ",
                ask: "いま何の話にする？（予定/体調/趣味/人間関係/迷い）",
                mood: "neutral",
                bubbleType: "react"
            }), userName, mascotName);
        }

        // intent（参考）
        this.intent = this.inferIntent(this.activeTopic, text);

        // pending中（質問済みの回答待ち）
        if (this.pending) {
            const out = this.handlePending(act, text);
            return this.decorate(out, userName, mascotName);
        }

        // scene中は保持（topic飛び防止）
        if (this.activeTopic && this.activeScene) {
            const out = this.advanceScene(text);
            return this.decorate(out, userName, mascotName);
        }

        // sceneなし：topic決定→scene開始
        const topic = this.pickTopic(text);
        if (topic) {
            this.startTopic(topic, text);
            const entry = this.getSceneEntry();
            return this.decorate(entry, userName, mascotName);
        }

        // どれでもない：メニュー（質問は1つにこだわらないが、ここは軽く）
        return this.decorate(this.formatReplyV5({
            lead: "うんうん",
            body: null,
            ask: "いま何の話が近い？（予定/体調/趣味/人間関係/迷い）",
            mood: "neutral",
            bubbleType: "ack"
        }), userName, mascotName);
    }

    // -----------------------------
    // Bubble picker
    // -----------------------------
    pickBubble(type = "auto") {
        if (type === "react") return this.pick(this.BUBBLE_REACT);
        if (type === "ack") return this.pick(this.BUBBLE_ACK);
        return (Math.random() < 0.25) ? this.pick(this.BUBBLE_REACT) : this.pick(this.BUBBLE_ACK);
    }

    // -----------------------------
    // Acts
    // -----------------------------
    classifyAct(text) {
        const t = (text || "").trim();

        if (this.matchesAnyExact(t, this.ACT_DICT.GREET)) return "GREET";
        if (this.matchesAnyExact(t, this.ACT_DICT.THANKS)) return "THANKS";
        if (this.matchesAnyExact(t, this.ACT_DICT.APOLOGY)) return "APOLOGY";
        if (this.matchesAnyExact(t, this.ACT_DICT.BYE)) return "BYE";

        // TOPIC_SWITCH は includes で強く拾う
        if (this.matchesAnyInclude(t, this.ACT_DICT.TOPIC_SWITCH)) return "TOPIC_SWITCH";

        if (this.matchesAnyExact(t, this.ACT_DICT.CONFUSED) || /どういうこと|意味/.test(t)) return "CONFUSED";
        if (this.matchesAnyExact(t, this.ACT_DICT.DENY)) return "DENY";
        if (this.matchesAnyExact(t, this.ACT_DICT.AFFIRM)) return "AFFIRM";

        // short noun/topic select
        if (t.length <= 6) {
            const topic = this.pickTopic(t);
            if (topic) return "TOPIC_SELECT";
        }

        return "FREE";
    }

    handleGlobalActs(act) {
        if (act === "GREET") return this.formatReplyV5({ lead: "やほ", body: "今日はどんな感じ？", ask: null, mood: "happy", bubbleType: "ack" });
        if (act === "THANKS") return this.formatReplyV5({ lead: "うんうん", body: "そう言ってもらえるの嬉しいよ", ask: null, mood: "happy", bubbleType: "react" });
        if (act === "APOLOGY") return this.formatReplyV5({ lead: "だいじょうぶ", body: "気にしないでね", ask: null, mood: "calm", bubbleType: "react" });
        if (act === "BYE") return this.formatReplyV5({ lead: "うん", body: "またね。いつでも呼んでね", ask: null, mood: "calm", bubbleType: "ack" });

        // AFFIRM/DENYだけで飛んできたとき
        if (!this.activeTopic && !this.pending && (act === "AFFIRM" || act === "DENY")) {
            return this.formatReplyV5({
                lead: "うんうん",
                body: null,
                ask: "いま何の話が近い？（予定/体調/趣味/人間関係/迷い）",
                mood: "neutral",
                bubbleType: "ack"
            });
        }
        return null;
    }

    // -----------------------------
    // SideTalk detector (補足/愚痴/状況説明を「回答」と誤認しにくくする)
    // -----------------------------
    isSideTalk(text, step) {
        const t = (text || "").trim();
        if (!t) return false;

        // 長い＝補足になりがち
        if (t.length >= 35) return true;

        // つなぎ言葉
        if (/(ちなみに|というか|てか|でも|だって|なんか|それで|いやさ|あと|あとさ)/.test(t)) return true;

        // kind が time/place/item のとき、感情が濃いと横道扱い
        if (step && (step.kind === "time" || step.kind === "place" || step.kind === "item")) {
            if (/(疲れ|しんど|モヤ|イラ|不安|つら|最悪|泣)/.test(t)) return true;
        }
        return false;
    }

    // -----------------------------
    // Pending (回答待ち)
    // -----------------------------
    handlePending(act, text) {
        const p = this.pending;

        // CONFUSED: 聞き方変える（pending維持）
        if (act === "CONFUSED") {
            p.retries = Math.min(2, (p.retries || 0) + 1);
            const ask = this.retryAsk(p.kind, p.retries);
            return this.formatReplyV5({
                lead: "ごめんね",
                body: "言い方変えるね",
                ask,
                mood: this.detectMood(text),
                bubbleType: "react"
            });
        }

        // DENY: 形式を簡単に（pending維持）
        if (act === "DENY") {
            p.retries = Math.min(2, (p.retries || 0) + 1);
            const ask = this.retryAsk(p.kind, Math.max(1, p.retries));
            return this.formatReplyV5({
                lead: "OK",
                body: "聞き方変えるね",
                ask,
                mood: "calm",
                bubbleType: "react"
            });
        }

        // 横道：scene進行させず、同じ質問をやさしく言い直す（pending維持）
        const step = this.getCurrentStep();
        if (this.isSideTalk(text, step)) {
            const soften = [
                "うんうん",
                "そっか",
                "なるほどね",
                "それはそうなるよね"
            ];
            const ask = this.retryAsk(p.kind, p.retries || 0) || p.askedText || "もう一回だけ教えて";
            return this.formatReplyV5({
                lead: this.pick(soften),
                body: null,
                ask,
                mood: this.detectMood(text),
                bubbleType: "react"
            });
        }

        // kind一致 → 保存して次へ
        if (this.matchAnswerKind(text, p.kind)) {
            this.saveSlot(p.topic, p.slot, text);

            // branch
            const branched = this.applyBranchIfAny(text);
            if (branched) { this.pending = null; return branched; }

            this.pending = null;
            this.sceneStepIndex++;

            return this.askNextStepOrClose(text);
        }

        // mismatch -> retry（回数制限）
        p.retries = (p.retries || 0) + 1;
        if (p.retries >= 3) {
            // あきらめて前に進める（詰めない）
            this.pending = null;
            this.sceneStepIndex++;
            const next = this.getCurrentStep();
            if (!next) return this.closeScene();

            // 次の質問を出す（軽め）
            const ask = this.pick(next.ask || ["もうちょい教えて"]);
            this.pending = {
                topic: this.activeTopic,
                scene: this.activeScene,
                slot: next.slot,
                kind: next.kind || "free",
                askedTurn: this.turn,
                retries: 0,
                askedText: ask
            };

            return this.formatReplyV5({
                lead: "OK",
                body: "そこは今は保留でいこ",
                ask,
                mood: "calm",
                bubbleType: "ack"
            });
        }

        const ask = this.retryAsk(p.kind, p.retries);
        p.askedText = ask;

        return this.formatReplyV5({
            lead: "うんうん",
            body: null,
            ask,
            mood: this.detectMood(text),
            bubbleType: "ack"
        });
    }

    retryAsk(kind, retries) {
        const arr = this.RETRY[kind] || this.RETRY.free;
        const idx = Math.min(arr.length - 1, retries || 0);
        return arr[idx];
    }

    // -----------------------------
    // Topic / Scene
    // -----------------------------
    resetTopic() {
        this.activeTopic = null;
        this.activeScene = null;
        this.sceneStepIndex = 0;
        this.pending = null;
    }

    pickTopic(text) {
        const t = text || "";
        for (const k of Object.keys(this.TOPIC_TRIGGERS)) {
            const arr = this.TOPIC_TRIGGERS[k];
            if (arr.some(w => t.includes(w))) return k;
        }
        return null;
    }

    startTopic(topic, text) {
        this.activeTopic = topic;
        this.activeScene = this.pickScene(topic, text);
        this.sceneStepIndex = 0;
        this.pending = null;

        this.memory.lastTopic = topic;
        this.memory.lastScene = this.activeScene;
    }

    pickScene(topic, text) {
        const t = text || "";
        if (topic === "PLAN") {
            if (/(週末|土日)/.test(t)) return "plan-weekend";
            if (/(買い物|スーパー|コンビニ)/.test(t)) return "plan-shopping";
            return "plan-general";
        }
        if (topic === "BODY") {
            if (/(目|しょぼ)/.test(t)) return "body-eyes";
            if (/(眠|ねむ)/.test(t)) return "body-sleepy";
            return "body-check";
        }
        if (topic === "HOBBY") {
            if (/(推し)/.test(t)) return "hobby-oshi";
            if (/(映画|ゲーム|アニメ|漫画)/.test(t)) return "hobby-moviegame";
            return "hobby-general";
        }
        if (topic === "SOCIAL") {
            if (/(上司)/.test(t)) return "social-boss";
            if (/(家族|母|父)/.test(t)) return "social-family";
            return "social-moya";
        }
        if (topic === "CHOICE") {
            if (/(仕事|案件|進捗)/.test(t)) return "choice-worklight";
            if (/(決められない)/.test(t) && t.length > 8) return "choice-small";
            return "choice-2way";
        }
        return null;
    }

    getSceneEntry() {
        const scene = this.getScene();
        const line = scene && scene.entry ? this.pick(scene.entry) : "うんうん。で、どうしたの？";

        // entryは「質問」っぽいので ask に入れて pending は立てない（次の発言を step0 で処理）
        return this.formatReplyV5({
            lead: this.pickAck(),
            body: null,
            ask: line,
            mood: "neutral",
            bubbleType: "ack"
        });
    }

    advanceScene(userText) {
        const step = this.getCurrentStep();
        if (!step) return this.closeScene();

        // scene中の topic select はブリッジして戻す（ただし明示switchは別で処理済み）
        const act = this.classifyAct(userText);
        if (act === "TOPIC_SELECT") {
            return this.formatReplyV5({
                lead: this.pickAck("CALM"),
                body: this.pick(this.BRIDGE_BACK),
                ask: this.pick(step.ask || ["もう一回だけ、短く教えてね"]),
                mood: "calm",
                bubbleType: "react"
            });
        }

        // 横道は「受け止め」＋同じ質問をやさしく（進めない／pending立てない）
        if (this.isSideTalk(userText, step)) {
            const ask = this.retryAsk(step.kind || "free", 0) || this.pick(step.ask || ["もうちょい教えて"]);
            return this.formatReplyV5({
                lead: this.pick(["うんうん", "そっか", "なるほどね", "それはそうなるよね"]),
                body: null,
                ask,
                mood: this.detectMood(userText),
                bubbleType: "react"
            });
        }

        // ここからは「step0への回答」として扱う
        // もし kind が合うなら保存→次へ
        if (this.matchAnswerKind(userText, step.kind || "free")) {
            this.saveSlot(this.activeTopic, step.slot, userText);

            const branched = this.applyBranchIfAny(userText);
            if (branched) return branched;

            this.sceneStepIndex++;
            return this.askNextStepOrClose(userText);
        }

        // 合わない場合：retry質問を出して pending を立てる（質問した時だけ pending）
        const ask = this.retryAsk(step.kind || "free", 1);
        this.pending = {
            topic: this.activeTopic,
            scene: this.activeScene,
            slot: step.slot,
            kind: step.kind || "free",
            askedTurn: this.turn,
            retries: 1,
            askedText: ask
        };

        return this.formatReplyV5({
            lead: this.pickAck(),
            body: null,
            ask,
            mood: this.detectMood(userText),
            bubbleType: "ack"
        });
    }

    askNextStepOrClose(userText) {
        const nextStep = this.getCurrentStep();
        if (!nextStep) return this.closeScene();

        // たまに「質問なし」で返して詰問感を消す（ただし scene は進めない）
        const noAskRate = 0.35; // 好みで調整
        const shouldNoAsk = (Math.random() < noAskRate);

        // 軽い言い添え（頻度低め）
        const tagRate = 0.15;
        const maybeTag = (Math.random() < tagRate) ? this.pick(this.SOFT_TAGS) : null;

        if (shouldNoAsk) {
            // pendingは立てない（質問してないので）
            return this.formatReplyV5({
                lead: this.pickAck(),
                body: maybeTag || this.pick(["その感じでいこ", "ゆっくりで大丈夫だよ", "ここまでで十分だよ"]),
                ask: null,
                mood: this.detectMood(userText || ""),
                bubbleType: (this.intent === "COMFORT") ? "react" : "ack"
            });
        }

        // 質問する場合だけ pending を立てる
        const ask = this.pick(nextStep.ask || ["もうちょい教えて"]);
        this.pending = {
            topic: this.activeTopic,
            scene: this.activeScene,
            slot: nextStep.slot,
            kind: nextStep.kind || "free",
            askedTurn: this.turn,
            retries: 0,
            askedText: ask
        };

        return this.formatReplyV5({
            lead: this.pickAck(this.pickTone(this.activeTopic, userText || "")),
            body: maybeTag,
            ask,
            mood: this.detectMood(userText || ""),
            bubbleType: (this.intent === "COMFORT") ? "react" : "ack"
        });
    }

    closeScene() {
        let closingType = "PLAYFUL_END";
        if (this.intent === "COMFORT" || this.activeTopic === "BODY" || this.activeTopic === "SOCIAL") closingType = "SOFT_END";
        if (this.intent === "DECIDE" || this.activeTopic === "PLAN" || this.activeTopic === "CHOICE") closingType = "NEXT_HOOK";

        const closeLine = this.pick(this.CLOSING[closingType] || this.CLOSING.PLAYFUL_END);

        // scene reset（topicは残してもいいが、ここは一旦scene切りで安定）
        this.activeScene = null;
        this.sceneStepIndex = 0;
        this.pending = null;

        // ここは質問ありでも無しでもOK。今回は軽い質問を添える（会話継続しやすい）
        return this.formatReplyV5({
            lead: this.pickAck(this.pickTone(this.activeTopic, this.memory.lastUser || "")),
            body: closeLine,
            ask: "この話もうちょい続ける？それとも別の話にする？",
            mood: "neutral",
            bubbleType: "ack"
        });
    }

    // -----------------------------
    // Branching（v4.6踏襲）
    // -----------------------------
    applyBranchIfAny(answerText) {
        const step = this.getPrevStep();
        if (!step || !step.branch || !Array.isArray(step.branch)) return null;

        for (const b of step.branch) {
            try {
                if (b.test && b.test.test(answerText)) {
                    const say = b.say || "うんうん";
                    const goto = b.goto;
                    if (goto) {
                        const nextTopic = this.inferTopicFromScene(goto) || this.activeTopic;
                        this.activeTopic = nextTopic;
                        this.activeScene = goto;
                        this.sceneStepIndex = 0;
                        this.pending = null;

                        const scene = this.getScene();
                        const q = scene && scene.entry ? this.pick(scene.entry) : "うん、続き聞くね";

                        return this.formatReplyV5({
                            lead: this.pickAck(this.pickTone(this.activeTopic, answerText)),
                            body: say,
                            ask: q,
                            mood: "neutral",
                            bubbleType: "react"
                        });
                    }
                }
            } catch (e) { }
        }
        return null;
    }

    inferTopicFromScene(sceneId) {
        if (!sceneId) return null;
        if (sceneId.startsWith("plan-")) return "PLAN";
        if (sceneId.startsWith("body-")) return "BODY";
        if (sceneId.startsWith("hobby-")) return "HOBBY";
        if (sceneId.startsWith("social-")) return "SOCIAL";
        if (sceneId.startsWith("choice-")) return "CHOICE";
        return null;
    }

    // -----------------------------
    // Memory
    // -----------------------------
    saveSlot(topic, slot, value) {
        if (!topic || !slot) return;
        if (!this.memory.slots[topic]) this.memory.slots[topic] = {};
        this.memory.slots[topic][slot] = value;

        // stickyは「引用くどさ」になりやすいので軽めに（短い時だけ）
        const v = (value || "").trim();
        if (v && v.length <= 10) {
            this.memory.sticky.push({ key: slot, value: v, topic, ttl: 5, used: false });
            if (this.memory.sticky.length > 3) this.memory.sticky.shift();
        }

        // decay
        this.memory.sticky.forEach(s => s.ttl--);
        this.memory.sticky = this.memory.sticky.filter(s => s.ttl > 0);
    }

    // -----------------------------
    // Reply formatting (text + bubble)
    // -----------------------------
    formatReplyV5({ lead, body, ask, mood, bubbleType }) {
        const parts = [];
        if (lead) parts.push(lead);
        if (body) parts.push(body);
        if (ask) parts.push(ask);

        let text = parts.filter(Boolean).join("。");
        text = text.replace(/。。+/g, "。").replace(/。\./g, "。");

        return {
            text,
            bubble: this.pickBubble(bubbleType || "auto"),
            mood: mood || "neutral"
        };
    }

    decorate(reply, userName, mascotName) {
        // userName をたまに先頭につける（任意）
        if (userName && Math.random() < 0.10 && !reply.text.includes(userName)) {
            reply.text = userName + "、" + reply.text;
        }
        return reply;
    }

    pickTone(activeTopic, text) {
        const t = text || "";
        if (activeTopic === "HOBBY") return "HYPE";
        if (activeTopic === "CHOICE") return "CALM";
        if (/疲れ|しんど|つら|困|不安|モヤ/.test(t)) return "WARM";
        return "LIGHT";
    }

    pickAck(forceTone) {
        const tone = forceTone || this.pickTone(this.activeTopic, this.memory.lastUser || "");
        const ACK_TONE = {
            LIGHT: ["うんうん", "なるほどね", "そっかそっか", "了解だよ", "オッケーだよ"],
            WARM: ["それは大変だね", "うん、しんどいね", "それ、疲れちゃうよね", "無理しなくていいよ", "ちゃんと聞くよ"],
            HYPE: ["いいね！", "それ楽しそうだね", "わかる、それ最高だよ", "うわ、それ気になる", "それ、良いやつだね"],
            CALM: ["うん、大丈夫だよ", "焦らなくていいよ", "ゆっくり決めよ", "いったん落ち着こ", "まずは一個ずつね"]
        };
        const arr = ACK_TONE[tone] || ACK_TONE.LIGHT;
        return this.pickNoRepeat(arr);
    }

    pickNoRepeat(arr) {
        let out = arr[Math.floor(Math.random() * arr.length)];
        for (let i = 0; i < 6; i++) {
            if (!this._ackHistory.includes(out)) break;
            out = arr[Math.floor(Math.random() * arr.length)];
        }
        this._ackHistory.push(out);
        while (this._ackHistory.length > 2) this._ackHistory.shift();
        return out;
    }

    // -----------------------------
    // Mood / Intent
    // -----------------------------
    detectMood(text) {
        const t = (text || "").toLowerCase();
        if (t.includes("ありがとう") || t.includes("嬉し") || t.includes("楽し")) return "happy";
        if (t.includes("困") || t.includes("大変") || t.includes("疲") || t.includes("しんど")) return "concerned";
        if (t.includes("仕事") || t.includes("進捗") || t.includes("案件")) return "serious";
        return "neutral";
    }

    inferIntent(activeTopic, text) {
        const t = text || "";
        if (/どうすれば|決めたい|どっち|選べ|迷う/.test(t)) return "DECIDE";
        if (/疲れ|しんど|つら|泣|無理|最悪|モヤ|不安/.test(t)) return "COMFORT";
        if (activeTopic === "HOBBY") return "CHAT";
        return "CHAT";
    }

    // -----------------------------
    // Scenes data（v4.6 そのまま）
    // -----------------------------
    buildScenes() {
        const SCENES_PLAN = {
            "plan-general": {
                entry: ["予定の話だね。今日なにする予定？"],
                steps: [
                    { slot: "planWhat", kind: "free", ask: ["今日なにする感じ？"] },
                    { slot: "planWhen", kind: "time", ask: ["それ、いつやる？"] },
                    { slot: "planAfter", kind: "free", ask: ["終わったら何したい？"] }
                ]
            },
            "plan-shopping": {
                entry: ["買い物するんだね。何買う予定？"],
                steps: [
                    {
                        slot: "buyItem", kind: "item", ask: ["何買うの？"],
                        branch: [
                            { test: /薬|頭痛|目薬|湿布/, goto: "body-check", say: "体のケア系だね。体調のほうも少し見る？" },
                            { test: /お菓子|アイス|ケーキ|甘/, goto: "plan-after-treat", say: "ごほうび感あるね。買い物のあと、回復もしよ" }
                        ]
                    },
                    { slot: "buyWhen", kind: "time", ask: ["いつ行く？"] },
                    { slot: "buyPlace", kind: "place", ask: ["どこで買う予定？（近所とかでOK）"] }
                ]
            },
            "plan-weekend": {
                entry: ["週末の話だね。週末、なにしたい？"],
                steps: [
                    { slot: "weekendWish", kind: "free", ask: ["週末、なにしたい？"] },
                    { slot: "weekendConstraint", kind: "free", ask: ["絶対に外せない条件ある？（疲れない、とかでもOK）"] },
                    { slot: "weekendFirstStep", kind: "free", ask: ["じゃあ一番ラクな一歩、どれにする？"] }
                ]
            },
            "plan-after-treat": {
                entry: ["ごほうびの気配だね。買い物のあと、何で回復したい？"],
                steps: [
                    { slot: "treat", kind: "free", ask: ["買い物のあと、何で回復したい？（甘いの/のんびり/寝る…）"] },
                    { slot: "treatWhen", kind: "time", ask: ["それ、いつやる？"] }
                ]
            }
        };

        const SCENES_BODY = {
            "body-check": {
                entry: ["体調の話だね。いまどこがつらい？"],
                steps: [
                    { slot: "bodyWhere", kind: "free", ask: ["どこがつらい？（頭/肩/目/お腹…）"] },
                    {
                        slot: "bodyLevel", kind: "free", ask: ["つらさ、10段階だとどれくらい？"],
                        branch: [
                            { test: /^(8|9|10)/, goto: "body-rest", say: "それはきついね。今日は休むの優先でいこ" },
                            { test: /^(1|2|3)/, goto: "body-light", say: "それならまだ守れるね。軽く整えていこ" }
                        ]
                    },
                    { slot: "bodyNow", kind: "yesno", ask: ["今日は『楽にする方向』でいこっか？"] }
                ]
            },
            "body-eyes": {
                entry: ["目がしょぼしょぼ系かな。いま画面見すぎ？"],
                steps: [
                    { slot: "eyeCause", kind: "yesno", ask: ["いま画面見すぎ？"] },
                    { slot: "eyeRelief", kind: "free", ask: ["一番ラクになるの、目閉じる？水飲む？伸びる？"] },
                    { slot: "eyeTime", kind: "time", ask: ["休めるなら、いつ休めそう？"] }
                ]
            },
            "body-sleepy": {
                entry: ["眠い感じ？いま意識、どれくらい残ってる？"],
                steps: [
                    { slot: "sleepyLevel", kind: "free", ask: ["眠さ、軽め？中くらい？重め？"] },
                    { slot: "sleepyNeed", kind: "free", ask: ["いま必要なの、仮眠？コーヒー？気分転換？"] },
                    { slot: "sleepyPlan", kind: "free", ask: ["じゃあ一番やさしいやつ、どれにする？"] }
                ]
            },
            "body-rest": {
                entry: ["今日は休む寄りでいこ。いま一番ラクにできるの、どれ？"],
                steps: [
                    { slot: "restPick", kind: "free", ask: ["横になる/水飲む/目閉じる…どれが一番ラク？"] },
                    { slot: "restWhen", kind: "time", ask: ["それ、いつできそう？"] }
                ]
            },
            "body-light": {
                entry: ["軽く整える感じだね。いま一番効きそうなのどれ？"],
                steps: [
                    { slot: "lightPick", kind: "free", ask: ["伸びる/姿勢直す/目を休める…どれがよさそう？"] },
                    { slot: "lightWhen", kind: "time", ask: ["それ、いつやる？（今/あとででもOK）"] }
                ]
            }
        };

        const SCENES_HOBBY = {
            "hobby-general": {
                entry: ["趣味の話しよ。最近ハマってるの、なに？"],
                steps: [
                    { slot: "hobbyWhat", kind: "free", ask: ["最近ハマってるの、なに？"] },
                    { slot: "hobbyPoint", kind: "free", ask: ["どこが一番好き？"] },
                    { slot: "hobbyNext", kind: "time", ask: ["次それやるなら、いつやる？"] }
                ]
            },
            "hobby-oshi": {
                entry: ["推しの話だね。いま推し、だれ（なに）？"],
                steps: [
                    { slot: "oshiWho", kind: "free", ask: ["いま推し、だれ（なに）？"] },
                    { slot: "oshiMoment", kind: "free", ask: ["最近『やば…』ってなった瞬間あった？"] },
                    { slot: "oshiAction", kind: "free", ask: ["今日は推し活、なにする？（見る/聴く/眺める/語る）"] }
                ]
            },
            "hobby-moviegame": {
                entry: ["映画とかゲームの話？最近やった（見た）のある？"],
                steps: [
                    { slot: "mgTitle", kind: "free", ask: ["最近やった（見た）のある？"] },
                    { slot: "mgBest", kind: "free", ask: ["一番良かったところ、ひとつだけ教えて"] },
                    { slot: "mgNext", kind: "yesno", ask: ["それ、もう一回いきたくなるタイプ？"] }
                ]
            }
        };

        const SCENES_SOCIAL = {
            "social-moya": {
                entry: ["人間関係の話だね。だれ周りの話？"],
                steps: [
                    { slot: "who", kind: "free", ask: ["だれ周りの話？（上司/同僚/家族/友だち）"] },
                    { slot: "whatHappened", kind: "free", ask: ["なにが一番イヤだった？"] },
                    { slot: "todayMode", kind: "free", ask: ["今日は、吐き出すだけにする？ちょっと軽く対処する？"] }
                ]
            },
            "social-boss": {
                entry: ["上司の話かな。いま一番きついの、どのへん？"],
                steps: [
                    { slot: "bossPain", kind: "free", ask: ["いま一番きついの、どのへん？（言い方/量/急ぎ…）"] },
                    { slot: "bossScene", kind: "free", ask: ["それ、どんな場面で起きた？"] },
                    { slot: "bossNext", kind: "free", ask: ["今日は『やり過ごす』でいく？『ちょい手当て』する？"] }
                ]
            },
            "social-family": {
                entry: ["家族の話だね。いま気になるの、なに？"],
                steps: [
                    { slot: "famConcern", kind: "free", ask: ["いま気になるの、なに？"] },
                    { slot: "famFeeling", kind: "feeling", ask: ["気持ちで言うと、何に近い？（モヤ/しんど/かなしい…）"] },
                    { slot: "famWish", kind: "free", ask: ["本当はどうなってほしい？"] }
                ]
            }
        };

        const SCENES_CHOICE = {
            "choice-2way": {
                entry: ["迷いの話だね。いま迷ってるの、どんな二択？"],
                steps: [
                    { slot: "choiceAB", kind: "choice", ask: ["いま迷ってるの、どんな二択？（A/BそのままでもOK）"] },
                    { slot: "choiceAxis", kind: "free", ask: ["決め手って、何になりそう？（お金/時間/気持ち/安心）"] },
                    { slot: "choiceTemp", kind: "yesno", ask: ["今日は『仮決め』だけしとく？"] }
                ]
            },
            "choice-small": {
                entry: ["決められないやつだね。いま一番ひっかかってるの、どこ？"],
                steps: [
                    { slot: "stuckPoint", kind: "free", ask: ["いま一番ひっかかってるの、どこ？"] },
                    { slot: "fear", kind: "free", ask: ["決めたら怖いのって、何？"] },
                    { slot: "tiny", kind: "free", ask: ["じゃあ『決めないで進む』なら、何ができそう？"] }
                ]
            },
            "choice-worklight": {
                entry: ["仕事の迷いっぽい？決める期限、ある？"],
                steps: [
                    {
                        slot: "deadline", kind: "time", ask: ["決める期限、ある？（今日/明日/週内とかでOK）"],
                        branch: [
                            { test: /(今日|明日)/, goto: "choice-quick", say: "期限近いね。サクッと仮決め寄りでいこ" }
                        ]
                    },
                    { slot: "risk", kind: "free", ask: ["一番避けたいの、ミス？手戻り？気まずさ？"] },
                    { slot: "first", kind: "yesno", ask: ["まずは『無難寄り』で仮置きする？"] }
                ]
            },
            "choice-quick": {
                entry: ["よし、仮決めモードね。いま一番大事なの何？"],
                steps: [
                    { slot: "quickAxis", kind: "free", ask: ["一番大事なの何？（速さ/安心/正確さ…）"] },
                    { slot: "quickGo", kind: "yesno", ask: ["じゃあその軸で『仮決め』しちゃう？"] }
                ]
            }
        };

        return {
            PLAN: SCENES_PLAN,
            BODY: SCENES_BODY,
            HOBBY: SCENES_HOBBY,
            SOCIAL: SCENES_SOCIAL,
            CHOICE: SCENES_CHOICE
        };
    }

    getScene() {
        if (!this.activeTopic || !this.activeScene) return null;
        const pack = this.TOPIC_SCENES[this.activeTopic];
        return pack ? pack[this.activeScene] : null;
    }

    getCurrentStep() {
        const scene = this.getScene();
        if (!scene || !scene.steps) return null;
        return scene.steps[this.sceneStepIndex] || null;
    }

    getPrevStep() {
        const scene = this.getScene();
        if (!scene || !scene.steps) return null;
        const idx = Math.max(0, this.sceneStepIndex - 1);
        return scene.steps[idx] || null;
    }

    // -----------------------------
    // Utils
    // -----------------------------
    matchesAnyExact(text, arr) {
        return arr && arr.some(w => text === w);
    }

    matchesAnyInclude(text, arr) {
        return arr && arr.some(w => text.includes(w));
    }

    pick(arr) {
        if (!arr || !arr.length) return "";
        return arr[Math.floor(Math.random() * arr.length)];
    }

    matchAnswerKind(text, kind) {
        const t = (text || "").trim();
        if (!t) return false;

        const yes = /^(はい|うん|うんうん|そう|そうだね|OK|おっけ|了解|りょうかい)$/;
        const no = /^(いいえ|いや|ちがう|違う|やだ|無理|ムリ)$/;

        const time = /(今|あとで|後で|さっき|これから|朝|昼|夕方|夜|午前|午後|週末|今日|明日|今週|来週|月曜|火曜|水曜|木曜|金曜|土曜|日曜|\d{1,2}時|\d{1,2}:\d{2})/;
        const place = /(家|会社|職場|学校|駅|近所|スーパー|コンビニ|店|カフェ|病院|美容院|ジム|外|中|自宅)/;

        const item = /(日用品|食材|食品|本|服|プレゼント|薬|飲み物|お菓子|コーヒー|パン|米|野菜|肉|魚|シャンプー|ティッシュ|洗剤)/;

        const feeling = /(疲れ|しんど|つら|眠|だる|モヤ|イラ|むかつ|不安|怖|うれし|たのし|かなし|さみし)/;

        const choice = /(どっち|二択|AかB|AとB|迷う|決められない)/;

        if (kind === "yesno") return yes.test(t) || no.test(t);
        if (kind === "time") return time.test(t);
        if (kind === "place") return place.test(t);
        if (kind === "item") return item.test(t) || (t.length <= 12 && !place.test(t) && !time.test(t));
        if (kind === "feeling") return feeling.test(t);
        if (kind === "choice") return choice.test(t);
        if (kind === "free") return t.length >= 1;

        return false;
    }
}
