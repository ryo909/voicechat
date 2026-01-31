// ============================================
// DialogueSystem v4.6 (Act + Pending + Scene + Branch + Retry + Memory)
// ============================================

class DialogueSystem {
    constructor() {
        this.turn = 0;

        // --- core state
        this.currentState = "start";
        this.activeTopic = null;   // PLAN/BODY/HOBBY/SOCIAL/CHOICE
        this.activeScene = null;   // sceneId
        this.sceneStepIndex = 0;
        this.pending = null;       // expected answer info
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

        this.BRIDGE_BACK = [
            "それも気になるけど、いまの続きだけ先に聞かせてね",
            "うんうん。あとでそっちも聞くね。まずは今のとこだけ",
            "OK。いったん今の話をひとつだけ片づけよ"
        ];

        this.CLOSING = {
            SOFT_END: ["うん、ここまでで十分だよ", "今日はそれだけでもえらいよ", "無理しないでいこ"],
            NEXT_HOOK: ["よし、形になったね", "じゃあ次の一歩だけ決めよ", "ここまで来たらもう勝ちだよ"],
            PLAYFUL_END: ["いいね、その感じだよ", "それ、ちょっと楽しみにしとくね", "あとで成果聞かせてね"]
        };

        this.QUIRKS = [
            "よしよしだよ",
            "それでいいよ",
            "だいじょうぶだよ",
            "いったん深呼吸しよ",
            "ちょっとだけ一緒にやろ",
            "うんうん、そうだね",
            "それ、えらいよ",
            "無理しないが正解だよ"
        ];

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

        // --- scenes (15 + small extra)
        this.TOPIC_SCENES = this.buildScenes();
    }

    // -----------------------------
    // Public API
    // -----------------------------
    step(userText, ctx = {}) {
        this.turn++;

        const text = (userText || "").trim();
        const mode = ctx.mode || "chat"; // (現UIのmodeは残しておく)
        const userName = (ctx.userName || "").trim();
        const mascotName = (ctx.mascotName || "").trim();

        // initial greeting
        if (!text) {
            if (this.currentState === "start") {
                this.currentState = "conversation";
                this.activeTopic = null;
                this.activeScene = null;
                this.pending = null;
                const greet = "こんにちは！何かお話ししよ";
                return { text: greet, mood: "happy" };
            }
            return { text: "うん、聞いてるよ", mood: "neutral" };
        }

        this.currentState = "conversation";

        // update last user
        this.memory.lastUser = text;

        // Act classify
        const act = this.classifyAct(text);

        // global acts first
        const global = this.handleGlobalActs(act, text, userName);
        if (global) return global;

        // infer intent (topic-aware later)
        this.intent = this.inferIntent(this.activeTopic, text);

        // If pending exists: prioritize pending handling
        if (this.pending) {
            const out = this.handlePending(act, text);
            if (out) return this.decorate(out, userName, mascotName);
            // if not handled, fallthrough
        }

        // Topic switching explicit
        if (act === "TOPIC_SWITCH") {
            this.resetTopic();
            return this.decorate({ text: "OK、話変えよ。いま何の話にする？（予定/体調/趣味/人間関係/迷い）", mood: "neutral" }, userName, mascotName);
        }

        // scene is active -> keep it unless explicit switch
        if (this.activeTopic && this.activeScene) {
            const out = this.advanceScene(text);
            return this.decorate(out, userName, mascotName);
        }

        // No active scene: decide topic
        const topic = this.pickTopic(text);
        if (topic) {
            this.startTopic(topic, text);
            const entry = this.getSceneEntry();
            return this.decorate(entry, userName, mascotName);
        }

        // still unknown: show gentle topic menu (1 question)
        const menu = "うんうん。いま何の話が近い？（予定/体調/趣味/人間関係/迷い）";
        return this.decorate({ text: menu, mood: "neutral" }, userName, mascotName);
    }

    // -----------------------------
    // Core: classify / global acts
    // -----------------------------
    classifyAct(text) {
        const t = text.trim();

        // exact-ish matches for short phrases
        if (this.matchesAny(t, this.ACT_DICT.GREET)) return "GREET";
        if (this.matchesAny(t, this.ACT_DICT.THANKS)) return "THANKS";
        if (this.matchesAny(t, this.ACT_DICT.APOLOGY)) return "APOLOGY";
        if (this.matchesAny(t, this.ACT_DICT.BYE)) return "BYE";

        if (this.matchesAny(t, this.ACT_DICT.TOPIC_SWITCH)) return "TOPIC_SWITCH";

        if (this.matchesAny(t, this.ACT_DICT.CONFUSED) || /どういうこと|意味/.test(t)) return "CONFUSED";
        if (this.matchesAny(t, this.ACT_DICT.DENY)) return "DENY";
        if (this.matchesAny(t, this.ACT_DICT.AFFIRM)) return "AFFIRM";

        // short noun/topic select
        if (t.length <= 6) {
            const topic = this.pickTopic(t);
            if (topic) return "TOPIC_SELECT";
        }

        return "FREE";
    }

    handleGlobalActs(act, text, userName) {
        if (act === "GREET") return { text: "やほ。今日はどんな感じ？", mood: "happy" };
        if (act === "THANKS") return { text: "うんうん。そう言ってもらえるの嬉しいよ", mood: "happy" };
        if (act === "APOLOGY") return { text: "だいじょうぶだよ。気にしないでね", mood: "calm" };
        if (act === "BYE") return { text: "うん、またね。いつでも呼んでね", mood: "calm" };

        // If user only affirms/denies without context and no pending, keep it light
        if (!this.pending && (act === "AFFIRM" || act === "DENY") && !this.activeTopic) {
            return { text: "うんうん。いま何の話が近い？（予定/体調/趣味/人間関係/迷い）", mood: "neutral" };
        }
        return null;
    }

    // -----------------------------
    // Pending (Expected Answer)
    // -----------------------------
    handlePending(act, text) {
        const p = this.pending;

        // CONFUSED: keep pending, rephrase question (retry)
        if (act === "CONFUSED") {
            const ask = this.retryAsk(p.kind, p.retries);
            p.retries = Math.min(2, (p.retries || 0) + 1);
            return this.formatReply({ ack: this.pickAck(), summary: this.pickConfusedPrefix(text), question: ask, mood: this.detectMood(text) });
        }

        // DENY: keep pending but give choice/short format
        if (act === "DENY") {
            const ask = this.retryAsk(p.kind, Math.max(1, p.retries || 1));
            p.retries = Math.min(2, (p.retries || 0) + 1);
            return this.formatReply({ ack: this.pickAck("CALM"), summary: "OK、聞き方変えるね", question: ask, mood: "calm" });
        }

        // Try match answer to pending.kind
        if (this.matchAnswerKind(text, p.kind)) {
            this.saveSlot(p.topic, p.slot, text);
            // apply branch if exists on that step
            const branched = this.applyBranchIfAny(text);
            if (branched) return branched;

            // move to next step
            this.pending = null;
            this.sceneStepIndex++;
            return this.askNextStepOrClose();
        }

        // If mismatched: try smart-swap (time<->item etc)
        const swapped = this.trySwapKindSave(text, p);
        if (swapped) {
            this.pending = null;
            this.sceneStepIndex++;
            return this.askNextStepOrClose();
        }

        // retry ask (no infinite)
        p.retries = (p.retries || 0) + 1;
        if (p.retries >= 3) {
            // give up gracefully, move on
            this.pending = null;
            this.sceneStepIndex++;
            return this.formatReply({ ack: this.pickAck("CALM"), summary: "OK、そこは今は保留でいこ", question: this.peekNextAsk() || "このまま続ける？", mood: "calm" });
        }

        const ask = this.retryAsk(p.kind, p.retries);
        return this.formatReply({ ack: this.pickAck(), summary: "うんうん", question: ask, mood: this.detectMood(text) });
    }

    retryAsk(kind, retries) {
        const arr = this.RETRY[kind] || this.RETRY.free;
        const idx = Math.min(arr.length - 1, retries || 0);
        return arr[idx];
    }

    pickConfusedPrefix(text) {
        const sub = this.confusedSubtype(text);
        const map = {
            HEAR: "ごめんね、言い方変えるね",
            MEANING: "むずかしく言っちゃった。ひとつだけ聞くね",
            CHOICE: "じゃあ二択にするね",
            PREMISE: "あ、そっちじゃなかったね。聞き方直すね"
        };
        return map[sub] || "ごめんね、言い方変えるね";
    }

    confusedSubtype(text) {
        const t = (text || "").trim();
        if (/どういうこと|意味|何言って/.test(t)) return "MEANING";
        if (/どれ|どっち|何から/.test(t)) return "CHOICE";
        if (/ちがう|違う/.test(t)) return "PREMISE";
        return "HEAR";
    }

    trySwapKindSave(text, p) {
        // Example: asked time but got item, etc.
        const kinds = ["time", "item", "place", "feeling", "yesno", "choice"];
        for (const k of kinds) {
            if (k === p.kind) continue;
            if (this.matchAnswerKind(text, k)) {
                // save into a "best guess" slot in same topic (lightweight)
                // If current pending slot is time but text looks like item, store in same slot anyway (keeps progress)
                this.saveSlot(p.topic, p.slot, text);
                return true;
            }
        }
        return false;
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
        // direct triggers
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
        // PLAN
        if (topic === "PLAN") {
            if (/(週末|土日)/.test(t)) return "plan-weekend";
            if (/(買い物|スーパー|コンビニ)/.test(t)) return "plan-shopping";
            return "plan-general";
        }
        // BODY
        if (topic === "BODY") {
            if (/(目|しょぼ)/.test(t)) return "body-eyes";
            if (/(眠|ねむ)/.test(t)) return "body-sleepy";
            return "body-check";
        }
        // HOBBY
        if (topic === "HOBBY") {
            if (/(推し)/.test(t)) return "hobby-oshi";
            if (/(映画|ゲーム|アニメ|漫画)/.test(t)) return "hobby-moviegame";
            return "hobby-general";
        }
        // SOCIAL
        if (topic === "SOCIAL") {
            if (/(上司)/.test(t)) return "social-boss";
            if (/(家族|母|父)/.test(t)) return "social-family";
            return "social-moya";
        }
        // CHOICE
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
        // entry is a question already; keep format 1Q
        return this.formatReply({ ack: this.pickAck(), summary: null, question: line, mood: "neutral", raw: true });
    }

    advanceScene(userText) {
        // If user tries to topic-select during a scene, bridge back unless explicit switch
        const act = this.classifyAct(userText);
        if (act === "TOPIC_SELECT") {
            const bridge = this.pick(this.BRIDGE_BACK);
            const q = this.peekCurrentAsk() || "もう一回だけ、短く教えてね";
            return this.formatReply({ ack: this.pickAck("CALM"), summary: bridge, question: q, mood: "calm" });
        }

        // Consume user input as answer to current step
        const step = this.getCurrentStep();
        if (!step) {
            // scene ended -> close
            return this.closeScene();
        }

        // Set pending based on current step and handle via pending logic
        this.pending = {
            topic: this.activeTopic,
            scene: this.activeScene,
            slot: step.slot,
            kind: step.kind || "free",
            askedTurn: this.turn,
            retries: 0
        };

        // Try immediately match (so it feels responsive)
        if (this.matchAnswerKind(userText, this.pending.kind)) {
            this.saveSlot(this.pending.topic, this.pending.slot, userText);

            // branch check
            const branched = this.applyBranchIfAny(userText);
            if (branched) { this.pending = null; return branched; }

            this.pending = null;
            this.sceneStepIndex++;
            return this.askNextStepOrClose(userText);
        }

        // mismatch -> ask retry version
        this.pending.retries = 1;
        const ask = this.retryAsk(this.pending.kind, 1);
        return this.formatReply({
            ack: this.pickAck(),
            summary: this.recallMaybe() || "うんうん",
            question: ask,
            mood: this.detectMood(userText)
        });
    }

    askNextStepOrClose(userText) {
        // memory recall maybe
        const recall = this.recallMaybe();

        const nextStep = this.getCurrentStep();
        if (!nextStep) return this.closeScene();

        // set pending for next question (we ask now)
        this.pending = {
            topic: this.activeTopic,
            scene: this.activeScene,
            slot: nextStep.slot,
            kind: nextStep.kind || "free",
            askedTurn: this.turn,
            retries: 0
        };

        const ask = this.pick(nextStep.ask || ["もうちょい教えて"]);
        const ack = this.pickAck(this.pickTone(this.activeTopic, userText || ""));
        const summary = recall; // may be null
        return this.formatReply({ ack, summary, question: ask, mood: this.detectMood(userText || "") });
    }

    peekCurrentAsk() {
        const step = this.getCurrentStep();
        if (!step) return null;
        return this.pick(step.ask || []);
    }

    peekNextAsk() {
        const scene = this.getScene();
        const idx = this.sceneStepIndex;
        const step = scene && scene.steps ? scene.steps[idx] : null;
        if (!step) return null;
        return this.pick(step.ask || []);
    }

    closeScene() {
        // pick closing type
        let closingType = "PLAYFUL_END";
        if (this.intent === "COMFORT" || this.activeTopic === "BODY" || this.activeTopic === "SOCIAL") closingType = "SOFT_END";
        if (this.intent === "DECIDE" || this.activeTopic === "PLAN" || this.activeTopic === "CHOICE") closingType = "NEXT_HOOK";

        const closeLine = this.pick(this.CLOSING[closingType] || this.CLOSING.PLAYFUL_END);

        // reset scene but keep topic (optional). Here we allow continue or switch by 1Q.
        this.activeScene = null;
        this.sceneStepIndex = 0;
        this.pending = null;

        // one question only
        const q = "この話、もうちょい続ける？それとも別の話にする？";
        const ack = this.pickAck(this.pickTone(this.activeTopic, this.memory.lastUser || ""));
        const out = this.formatReply({ ack, summary: closeLine, question: q, mood: "neutral" });

        // after asking, allow next user response to pick topic or continue
        // keep activeTopic for now (so user can continue)
        return out;
    }

    // -----------------------------
    // Branching
    // -----------------------------
    applyBranchIfAny(answerText) {
        const step = this.getPrevStep(); // branch attached to the step we just filled
        if (!step || !step.branch || !Array.isArray(step.branch)) return null;

        for (const b of step.branch) {
            try {
                if (b.test && b.test.test(answerText)) {
                    // say one line (no question), then jump scene entry next turn
                    const say = b.say || "うんうん";
                    const goto = b.goto;
                    if (goto) {
                        // switch topic/scene if needed
                        // If goto contains "body-" etc, infer topic by prefix
                        const nextTopic = this.inferTopicFromScene(goto) || this.activeTopic;
                        this.activeTopic = nextTopic;
                        this.activeScene = goto;
                        this.sceneStepIndex = 0;
                        this.pending = null;

                        // return "say + entry(question)" as one message but keep 1 question rule:
                        // We make summary = say, question = entry line
                        const entry = this.getSceneEntry();
                        // entry is already formatted reply; unpack it is annoying, so we rebuild:
                        const scene = this.getScene();
                        const q = scene && scene.entry ? this.pick(scene.entry) : "うん、続き聞くね";
                        return this.formatReply({
                            ack: this.pickAck(this.pickTone(this.activeTopic, answerText)),
                            summary: say,
                            question: q,
                            mood: "neutral"
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
    // Memory: save / recall
    // -----------------------------
    saveSlot(topic, slot, value) {
        if (!topic || !slot) return;
        if (!this.memory.slots[topic]) this.memory.slots[topic] = {};
        this.memory.slots[topic][slot] = value;

        // sticky (short-lived recall)
        const v = (value || "").trim();
        if (v && v.length <= 12) {
            this.memory.sticky.push({ key: slot, value: v, topic, ttl: 6, used: false });
            if (this.memory.sticky.length > 3) this.memory.sticky.shift();
        }

        // decay TTL
        this.memory.sticky.forEach(s => s.ttl--);
        this.memory.sticky = this.memory.sticky.filter(s => s.ttl > 0);
    }

    recallMaybe() {
        // 25% recall, only if has unused sticky in same topic and same scene running
        if (!this.activeTopic) return null;
        if (Math.random() > 0.25) return null;

        const cand = this.memory.sticky.find(s => s.topic === this.activeTopic && !s.used && s.value);
        if (!cand) return null;

        cand.used = true;
        const templates = [
            "さっきの〇〇のやつね",
            "〇〇って言ってたやつ、続き聞いていい？",
            "〇〇なら、こっちはどうする？"
        ];
        const t = this.pick(templates).replace(/〇〇/g, cand.value);
        return t;
    }

    // -----------------------------
    // Reply formatting
    // -----------------------------
    formatReply({ ack, summary, question, mood, raw }) {
        // raw=true means question already contains entry sentence (don't prepend ack sometimes)
        let parts = [];

        if (ack) parts.push(ack);

        if (summary) parts.push(summary);

        if (question) parts.push(question);

        let out = parts.filter(Boolean).join("。");

        // quirks (low chance; comfort a bit higher)
        const qRate = (this.intent === "COMFORT") ? 0.35 : 0.25;
        if (Math.random() < qRate) {
            const q = this.pick(this.QUIRKS);
            // put as suffix lightly
            if (!out.includes(q)) out = out + "。" + q;
        }

        // enforce no double punctuation
        out = out.replace(/。。+/g, "。").replace(/。\./g, "。");

        return { text: out, mood: mood || "neutral" };
    }

    decorate(reply, userName, mascotName) {
        // optionally add user name rarely (as you had)
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
    // Scenes data
    // -----------------------------
    buildScenes() {
        // PLAN
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

        // BODY
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

        // HOBBY
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

        // SOCIAL
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

        // CHOICE
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
    matchesAny(text, arr) {
        return arr && arr.some(w => text === w);
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
