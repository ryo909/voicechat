// ============================================
// Dialogue System v3
// - Scenes + Slots (fill & progress)
// - Remember bot question type (open/choice/yesno)
// - Detect answer-likeness and bind to pending slot
// ============================================

class DialogueSystem {
    constructor() {
        this.state = {
            scene: "GENERIC",
            mood: "neutral",
            topic: null,

            // per-scene slot values
            slotValues: {
                HOBBY: {},
                BODY: {},
                SOCIAL: {},
                CHOICE: {},
                PLAN: {},
                GENERIC: {}
            },

            // pending question info (what bot is asking now)
            pending: null, // {scene, slot, qtype, choices, askedText, ts}

            // short history
            history: [], // {role, text, meta, ts}
            recentBot: [],

            // guard rails
            lastBotMove: null,
            questionStreak: 0, // avoid asking too many in a row
        };

        // ====== Lexicon ======
        this.lex = {
            greet: ["こんにちは", "こんばんは", "おはよう"],
            confused: ["え", "え？", "どういうこと", "わかんない", "つまり", "何それ"],
            unsure: ["わからない", "わかんない", "どっちも", "まだ", "なんでも", "うーん", "迷う"],

            accept: ["うんうん", "なるほど", "そっか", "了解だよ", "わかったよ", "うん、いいね", "うん、大丈夫"],
            acceptSoft: ["うんうん、ちゃんと聞いたよ", "そっか…それはしんどいね", "うん、それは疲れるよね", "なるほどね。無理しなくていいよ"],
            explain: [
                "ごめん、言い方がふわっとしてたね。短く聞き直すね。",
                "うん、わかりにくかったね。言い直すよ。",
                "いったんここだけ確認させて。",
            ],

            // non-verbal-ish reactions for bubble (you already made bubble random)
            bubbleAizuchi: ["うん", "なるほど", "ふむ", "ほほう", "よしよし", "わかる", "うんうん"],
            bubbleNonverbal: ["（こくこく）", "（じーっ）", "（メモ中）", "（にこっ）", "（しゅん…）", "（ぴこん）"],
        };

        // ====== Scenes ======
        this.scenes = {
            HOBBY: {
                triggers: ["読書", "本", "漫画", "アニメ", "映画", "ゲーム", "推し", "ライブ", "配信", "音楽", "YouTube"],
                slots: ["kind", "item", "feeling", "detail"],
                // slot extraction hints (very light)
                slotHints: {
                    kind: ["読書", "本", "漫画", "アニメ", "映画", "ゲーム", "推し", "音楽"],
                    feeling: ["楽しい", "嬉しい", "最高", "しんどい", "疲れた", "微妙", "刺さった", "泣いた", "笑った", "良かった"]
                },
                questions: {
                    kind: [
                        { q: "趣味の話だね。読書・映画・ゲーム・推し、どれ寄り？", qtype: "choice", choices: ["読書", "映画", "ゲーム", "推し"] },
                        { q: "それって趣味枠だと何？（読書/映画/ゲーム/推し）", qtype: "choice", choices: ["読書", "映画", "ゲーム", "推し"] },
                    ],
                    item: [
                        { q: "最近ハマってるやつ、ひとつだけ教えて。", qtype: "open" },
                        { q: "作品名とかタイトル、出せそう？（無理なら『ジャンル』だけでも）", qtype: "open" },
                    ],
                    feeling: [
                        { q: "それ、気分的には『楽しい』寄り？『落ち着く』寄り？", qtype: "choice", choices: ["楽しい", "落ち着く", "どっちも"] },
                        { q: "今の気持ち、ひとことで言うとどれ？", qtype: "open" },
                    ],
                    detail: [
                        { q: "いちばん良かったところ、ひとつだけ言うなら？", qtype: "open" },
                        { q: "どこが刺さった？一個だけでいいよ。", qtype: "open" },
                    ],
                }
            },

            BODY: {
                triggers: ["頭痛", "肩こり", "目が", "しょぼしょぼ", "眠い", "だるい", "体調", "腹", "腰", "疲れ"],
                slots: ["symptom", "when", "cause", "relief"],
                slotHints: {
                    symptom: ["頭", "肩", "目", "腰", "腹", "喉", "首", "胃"],
                    when: ["今日", "今朝", "さっき", "昨日", "最近", "ずっと"],
                    cause: ["寝不足", "画面", "パソコン", "スマホ", "冷え", "ストレス", "運動不足"],
                    relief: ["水", "ストレッチ", "寝る", "休む", "温める", "目を閉じる"]
                },
                questions: {
                    symptom: [
                        { q: "体の話だね。どこが一番つらい？（頭/肩/目/他）", qtype: "choice", choices: ["頭", "肩", "目", "他"] },
                        { q: "どのへんがしんどい？短くでOK。", qtype: "open" },
                    ],
                    when: [
                        { q: "それ、いつから？（今日だけ/数日/ずっと）", qtype: "choice", choices: ["今日だけ", "数日", "ずっと"] },
                        { q: "今朝から？それともさっきから？", qtype: "open" },
                    ],
                    cause: [
                        { q: "心当たりある？（寝不足/画面/冷え/ストレス）", qtype: "choice", choices: ["寝不足", "画面", "冷え", "ストレス", "わからない"] },
                        { q: "たぶん原因これかも、ってある？", qtype: "open" },
                    ],
                    relief: [
                        { q: "今できる『ちいさな回復』、何がよさそう？（水/伸ばす/目閉じる）", qtype: "choice", choices: ["水", "伸ばす", "目閉じる", "休む"] },
                        { q: "まず楽にするなら、何が一番効きそう？", qtype: "open" },
                    ],
                }
            },

            SOCIAL: {
                triggers: ["上司", "同僚", "部下", "家族", "友達", "人間関係", "会議", "職場", "連絡", "返信", "LINE"],
                slots: ["who", "event", "feeling", "wish"],
                slotHints: {
                    who: ["上司", "同僚", "部下", "家族", "友達", "恋人", "お客さん"],
                    feeling: ["モヤモヤ", "イラ", "しんどい", "疲れた", "困った", "不安", "悲しい", "ムカつく"],
                    wish: ["謝って", "やめて", "わかって", "手伝って", "放っておいて", "うまくやりたい"]
                },
                questions: {
                    who: [
                        { q: "人間関係の話だね。相手は誰寄り？（上司/同僚/家族/友達）", qtype: "choice", choices: ["上司", "同僚", "家族", "友達"] },
                        { q: "相手、どの立場の人？", qtype: "open" },
                    ],
                    event: [
                        { q: "何があった？一行でいいよ。", qtype: "open" },
                        { q: "いちばん引っかかった出来事ってどれ？", qtype: "open" },
                    ],
                    feeling: [
                        { q: "気分は『モヤモヤ』寄り？『イラッ』寄り？", qtype: "choice", choices: ["モヤモヤ", "イラッ", "しょんぼり", "わからない"] },
                        { q: "気持ち的に、何が一番つらかった？", qtype: "open" },
                    ],
                    wish: [
                        { q: "ほんとはどうなってほしい？（理想の形）", qtype: "open" },
                        { q: "落とし所、どんな感じがいい？", qtype: "open" },
                    ],
                }
            },

            CHOICE: {
                triggers: ["迷う", "迷って", "決められない", "どっち", "選べない", "悩む", "悩んで"],
                slots: ["options", "criteria", "fear", "next"],
                slotHints: {
                    criteria: ["楽", "安心", "早い", "安い", "好き", "疲れない", "失敗しない"],
                    fear: ["後悔", "失敗", "疲れる", "時間", "怒られる"]
                },
                questions: {
                    options: [
                        { q: "迷いの話だね。AとB、ざっくり何と何？", qtype: "open" },
                        { q: "どっちで迷ってる？短くでOK。", qtype: "open" },
                    ],
                    criteria: [
                        { q: "決めるときに大事なの、何？（楽さ/楽しさ/安心/早さ）", qtype: "choice", choices: ["楽さ", "楽しさ", "安心", "早さ", "わからない"] },
                        { q: "決め手になりそうな条件、一個だけ教えて。", qtype: "open" },
                    ],
                    fear: [
                        { q: "いちばん怖いのは何？（後悔/失敗/疲れ/時間）", qtype: "choice", choices: ["後悔", "失敗", "疲れ", "時間", "特にない"] },
                        { q: "どっちを選ぶと『あとでイヤ』になりそう？", qtype: "open" },
                    ],
                    next: [
                        { q: "いったん『仮決め』するならどっち？", qtype: "open" },
                        { q: "次の一歩を小さくするとしたら、何から？", qtype: "open" },
                    ],
                }
            },

            PLAN: {
                triggers: ["予定", "週末", "旅行", "今日", "何する", "明日", "休み", "今度"],
                slots: ["time", "constraint", "wish", "plan"],
                slotHints: {
                    time: ["今日", "明日", "週末", "来週", "今度"],
                    constraint: ["お金", "時間", "体力", "天気", "移動"],
                    wish: ["のんびり", "休む", "外出", "片付け", "遊ぶ", "寝る"]
                },
                questions: {
                    time: [
                        { q: "予定の話だね。いつの話？（今日/週末/来週）", qtype: "choice", choices: ["今日", "週末", "来週", "未定"] },
                        { q: "それ、いつの予定を決めたい？", qtype: "open" },
                    ],
                    constraint: [
                        { q: "縛りある？（お金/時間/体力/天気）", qtype: "choice", choices: ["お金", "時間", "体力", "天気", "特になし"] },
                        { q: "無理したくない条件ってある？", qtype: "open" },
                    ],
                    wish: [
                        { q: "気分的には、のんびり？アクティブ？", qtype: "choice", choices: ["のんびり", "アクティブ", "半々"] },
                        { q: "今日の理想、ひとことで言うと？", qtype: "open" },
                    ],
                    plan: [
                        { q: "じゃあ候補3つ出すね。家/外/軽め、どれがいい？", qtype: "choice", choices: ["家", "外", "軽め", "おまかせ"] },
                        { q: "今の条件だと、何が一番よさそう？一緒に決めよ。", qtype: "open" },
                    ],
                }
            },

            GENERIC: {
                triggers: [],
                slots: ["topic", "detail"],
                slotHints: {
                    topic: ["趣味", "体調", "人間関係", "予定", "迷い"]
                },
                questions: {
                    topic: [
                        { q: "今日は何の話にする？（趣味/体調/人間関係/予定/迷い）", qtype: "choice", choices: ["趣味", "体調", "人間関係", "予定", "迷い"] },
                        { q: "今いちばん話したいの、どれ？", qtype: "open" },
                    ],
                    detail: [
                        { q: "もうちょいだけ教えて。いま何が一番大きい？", qtype: "open" },
                        { q: "一行でいいから、状況を教えて。", qtype: "open" },
                    ],
                }
            }
        };
    }

    // =========================================================
    // Public
    // =========================================================
    step(userText, ctx = {}) {
        const text = (userText || "").trim();

        // init greet
        if (!text) {
            this._push("user", "");
            const greet = "こんにちは！なに話そっか。";
            this._push("bot", greet, { move: "GREET" });
            // set pending to choose topic lightly
            const q = this._pickQ(this.scenes.GENERIC.questions.topic);
            this._setPending("GENERIC", "topic", q.qtype, q.choices, q.q);
            return { text: greet + " " + q.q, mood: "happy" };
        }

        const a = this._analyze(text);
        this.state.mood = a.mood;

        // 1) Try bind user answer to pending question (Strong)
        const bound = this._tryBindToPending(text);

        // 2) Decide scene
        const scene = this._decideScene(a, bound);
        this.state.scene = scene;

        // 3) Decide next move
        const move = this._decideMove(a, bound);

        // 4) Render
        const reply = this._render(move, a, ctx);

        // 5) Update history
        this._push("user", text, { a, bound });
        this._push("bot", reply.text, { move, a });

        return reply;
    }

    // =========================================================
    // Analyze
    // =========================================================
    _analyze(text) {
        const lower = text.toLowerCase();

        const isGreet = this.lex.greet.some(w => text.includes(w));
        const isConfused = this.lex.confused.some(w => lower.includes(w));
        const isQuestion = text.includes("？") || text.includes("?");
        const len = text.length;

        const type =
            isGreet ? "GREET" :
                isConfused ? "CONFUSED" :
                    len <= 6 ? "ONEWORD" :
                        (len <= 14 ? "SHORT" : "DETAIL");

        let mood = "neutral";
        if (lower.includes("ありがとう") || lower.includes("嬉") || lower.includes("楽")) mood = "happy";
        if (lower.includes("疲") || lower.includes("しんど") || lower.includes("困") || lower.includes("つら") || lower.includes("だる")) mood = "concerned";

        const keyword = this._extractKeyword(text);

        return { text, type, mood, isQuestion, keyword };
    }

    _extractKeyword(text) {
        if (!text) return null;
        const cleaned = text.replace(/[。、！？!?]/g, "").trim();
        if (cleaned.length <= 12) return cleaned;

        const firstLine = cleaned.split("\n")[0].trim();
        if (firstLine.length <= 14) return firstLine;

        const firstToken = firstLine.split(/[ 　]/)[0];
        return (firstToken || firstLine).slice(0, 14);
    }

    // =========================================================
    // Pending binding (Strength 2/3)
    // =========================================================
    _tryBindToPending(userText) {
        const p = this.state.pending;
        if (!p) return { ok: false };

        const text = userText.trim();
        const lower = text.toLowerCase();

        // If user is confused, do not bind yet
        if (this.lex.confused.some(w => lower.includes(w))) {
            return { ok: false, reason: "confused" };
        }

        // 1) If question was choice, try match
        if (p.qtype === "choice" && Array.isArray(p.choices) && p.choices.length) {
            const matched = this._matchChoice(text, p.choices);
            if (matched) {
                this._setSlot(p.scene, p.slot, matched);
                this._clearPending();
                return { ok: true, scene: p.scene, slot: p.slot, value: matched, via: "choice-match" };
            }
            // If user says unsure
            if (this.lex.unsure.some(w => lower.includes(w))) {
                this._setSlot(p.scene, p.slot, "わからない");
                this._clearPending();
                return { ok: true, scene: p.scene, slot: p.slot, value: "わからない", via: "unsure" };
            }
        }

        // 2) If open: short answers are likely slot values
        if (p.qtype === "open") {
            // If super short or keyword-like, accept as slot value
            if (text.length <= 18) {
                this._setSlot(p.scene, p.slot, text);
                this._clearPending();
                return { ok: true, scene: p.scene, slot: p.slot, value: text, via: "open-short" };
            }
            // Heuristic: if contains hint words for that slot, still accept
            const sc = this.scenes[p.scene] || this.scenes.GENERIC;
            const hints = (sc.slotHints && sc.slotHints[p.slot]) ? sc.slotHints[p.slot] : [];
            if (hints.some(h => text.includes(h))) {
                this._setSlot(p.scene, p.slot, text);
                this._clearPending();
                return { ok: true, scene: p.scene, slot: p.slot, value: text, via: "open-hint" };
            }
            // If user answered with a question, probably not binding
            if (text.includes("？") || text.includes("?")) {
                return { ok: false, reason: "user-question" };
            }
            // Otherwise accept as slot anyway (but mark as long)
            this._setSlot(p.scene, p.slot, text);
            this._clearPending();
            return { ok: true, scene: p.scene, slot: p.slot, value: text, via: "open-long" };
        }

        // 3) yes/no (future extension)
        if (p.qtype === "yesno") {
            const yes = ["はい", "うん", "そう", "そうだね", "OK", "おけ"];
            const no = ["いいえ", "いや", "ちがう", "違う", "ちょっと違う", "NO"];
            if (yes.some(w => lower.includes(w))) {
                this._setSlot(p.scene, p.slot, "YES");
                this._clearPending();
                return { ok: true, scene: p.scene, slot: p.slot, value: "YES", via: "yesno" };
            }
            if (no.some(w => lower.includes(w))) {
                this._setSlot(p.scene, p.slot, "NO");
                this._clearPending();
                return { ok: true, scene: p.scene, slot: p.slot, value: "NO", via: "yesno" };
            }
        }

        return { ok: false };
    }

    _matchChoice(text, choices) {
        // exact include
        for (const c of choices) {
            if (!c) continue;
            if (text.includes(c)) return c;
        }
        // common synonyms (small)
        const map = {
            "のんびり": ["休む", "だらだら", "まったり"],
            "アクティブ": ["外", "出かけ", "動く"],
            "趣味": ["読書", "映画", "ゲーム", "推し", "アニメ"],
            "体調": ["頭痛", "肩こり", "眠い", "だるい"],
            "人間関係": ["上司", "同僚", "家族", "友達"],
            "予定": ["週末", "旅行", "明日", "今日"],
            "迷い": ["どっち", "決められない", "悩む"],
        };
        for (const c of choices) {
            const syn = map[c];
            if (syn && syn.some(s => text.includes(s))) return c;
        }
        return null;
    }

    // =========================================================
    // Scene decision
    // =========================================================
    _decideScene(a, bound) {
        // If we just bound from pending, use that scene
        if (bound && bound.ok && bound.scene) return bound.scene;

        // else infer from triggers
        for (const key of ["HOBBY", "BODY", "SOCIAL", "CHOICE", "PLAN"]) {
            const sc = this.scenes[key];
            if (sc.triggers.some(t => a.text.includes(t))) return key;
        }
        return this.state.scene || "GENERIC";
    }

    // =========================================================
    // Move decision
    // =========================================================
    _decideMove(a, bound) {
        // confusion: explain + re-ask pending
        if (a.type === "CONFUSED") return { type: "EXPLAIN_REASK" };

        // greet: offer topic
        if (a.type === "GREET") return { type: "OFFER_TOPIC" };

        // If user answer was bound, progress to next slot (or small reflect then ask)
        if (bound && bound.ok) return { type: "PROGRESS_SLOT", bound };

        // If no pending and user gave one-word/short -> ask first slot
        if (!this.state.pending && (a.type === "ONEWORD" || a.type === "SHORT")) return { type: "ASK_FIRST_SLOT" };

        // If detail -> reflect lightly, then ask next missing slot
        return { type: "REFLECT_AND_ASK_NEXT" };
    }

    // =========================================================
    // Render
    // =========================================================
    _render(move, a, ctx) {
        const userName = (ctx.userName || "").trim();
        const prefix = this._maybeCallName(userName);

        const accept = (a.mood === "concerned") ? this._pick(this.lex.acceptSoft) : this._pick(this.lex.accept);

        const sceneKey = this.state.scene || "GENERIC";
        const sc = this.scenes[sceneKey] || this.scenes.GENERIC;

        // find next missing slot
        const nextSlot = this._nextMissingSlot(sceneKey);
        const firstSlot = sc.slots[0] || "topic";

        // pick a question for a slot and register pending
        const ask = (slot) => {
            const pool = (sc.questions && sc.questions[slot]) ? sc.questions[slot] : this.scenes.GENERIC.questions.topic;
            const q = this._pickQ(pool);
            this._setPending(sceneKey, slot, q.qtype, q.choices, q.q);
            // update question streak
            this.state.questionStreak = Math.min(5, this.state.questionStreak + 1);
            return q.q;
        };

        // small light reflect (non-consulting)
        const softTag = () => {
            if (sceneKey === "HOBBY") return "趣味の話";
            if (sceneKey === "BODY") return "体の話";
            if (sceneKey === "SOCIAL") return "人間関係の話";
            if (sceneKey === "CHOICE") return "迷いの話";
            if (sceneKey === "PLAN") return "予定の話";
            return "今の話";
        };

        // avoid question spamming: if streak high, sometimes just accept and wait
        const canAsk = this.state.questionStreak < 3 || (a.type !== "ONEWORD" && a.type !== "SHORT");

        if (move.type === "OFFER_TOPIC") {
            const q = this._pickQ(this.scenes.GENERIC.questions.topic);
            this._setPending("GENERIC", "topic", q.qtype, q.choices, q.q);
            this.state.questionStreak = 1;
            return { text: prefix + "こんにちは。 " + q.q, mood: "happy" };
        }

        if (move.type === "EXPLAIN_REASK") {
            const head = this._pick(this.lex.explain);
            const p = this.state.pending;
            if (p) {
                // re-ask same question
                this.state.questionStreak = Math.min(5, this.state.questionStreak + 1);
                return { text: prefix + head + " " + p.askedText, mood: a.mood };
            }
            // if no pending, ask topic
            return { text: prefix + head + " " + ask("topic"), mood: a.mood };
        }

        if (move.type === "ASK_FIRST_SLOT") {
            // If user gave one word but we can infer scene, ask first missing slot rather than strict firstSlot
            const slot = nextSlot || firstSlot;
            if (!canAsk) {
                this._clearPending();
                this.state.questionStreak = 0;
                return { text: prefix + accept + "。うんうん。", mood: a.mood };
            }
            return { text: prefix + accept + "。 " + ask(slot), mood: a.mood };
        }

        if (move.type === "PROGRESS_SLOT") {
            const b = move.bound;
            // Light confirm then ask next missing
            const confirm = this._confirmSlot(sceneKey, b.slot, b.value);

            // If all slots filled, switch to free chat loop (ask "more?" or offer)
            const next = this._nextMissingSlot(sceneKey);
            if (!next) {
                this._clearPending();
                this.state.questionStreak = 0;
                const follow = this._followAfterComplete(sceneKey);
                return { text: prefix + accept + "。 " + confirm + "。 " + follow, mood: a.mood };
            }

            if (!canAsk) {
                this._clearPending();
                this.state.questionStreak = 0;
                return { text: prefix + accept + "。 " + confirm + "。", mood: a.mood };
            }

            return { text: prefix + accept + "。 " + confirm + "。 " + ask(next), mood: a.mood };
        }

        if (move.type === "REFLECT_AND_ASK_NEXT") {
            const kw = a.keyword ? "「" + a.keyword + "」" : "";
            const reflect = kw ? (kw + "のこと、" + softTag() + "っぽいね") : (softTag() + "っぽいね");

            const slot = nextSlot || firstSlot;

            // If the user wrote a lot, ask fewer questions
            if (!canAsk) {
                this._clearPending();
                this.state.questionStreak = 0;
                return { text: prefix + accept + "。 " + reflect + "。", mood: a.mood };
            }

            return { text: prefix + accept + "。 " + reflect + "。 " + ask(slot), mood: a.mood };
        }

        // fallback
        return { text: prefix + accept + "。 " + ask("topic"), mood: a.mood };
    }

    // =========================================================
    // Slot management (Strength 1)
    // =========================================================
    _setSlot(scene, slot, value) {
        if (!this.state.slotValues[scene]) this.state.slotValues[scene] = {};
        this.state.slotValues[scene][slot] = value;
    }

    _nextMissingSlot(scene) {
        const sc = this.scenes[scene] || this.scenes.GENERIC;
        const values = this.state.slotValues[scene] || {};
        for (const s of sc.slots) {
            if (values[s] === undefined || values[s] === null || values[s] === "") return s;
        }
        return null;
    }

    _confirmSlot(scene, slot, value) {
        // keep it cute & short (avoid consulting tone)
        const v = (value || "").toString();
        if (scene === "HOBBY" && slot === "kind") return v + "ね、いいね";
        if (scene === "BODY" && slot === "symptom") return v + "がつらいんだね";
        if (scene === "SOCIAL" && slot === "who") return v + "のことなんだね";
        if (scene === "PLAN" && slot === "time") return v + "の予定ね";
        if (scene === "CHOICE" && slot === "criteria") return "大事なのは" + v + "だね";
        return v + "、了解だよ";
    }

    _followAfterComplete(scene) {
        // When slots are filled, move to "deepen or lighten"
        const pool = [
            "もうちょい聞いてもいい？",
            "それで、今はどんな気分？",
            "ここからは雑談でゆるっといく？",
            "今いちばん言いたいの、どれ？",
        ];
        if (scene === "PLAN") {
            return "じゃあ、候補を一緒に決めよっか？";
        }
        if (scene === "CHOICE") {
            return "いったん『仮』で置くなら、どっち寄り？";
        }
        return this._pick(pool);
    }

    // =========================================================
    // Pending management (Strength 2)
    // =========================================================
    _setPending(scene, slot, qtype, choices, askedText) {
        this.state.pending = { scene, slot, qtype, choices: choices || null, askedText, ts: Date.now() };
    }
    _clearPending() {
        this.state.pending = null;
    }

    // =========================================================
    // Utilities
    // =========================================================
    _pick(arr) {
        // avoid repeating the exact same sentence
        for (let i = 0; i < 6; i++) {
            const s = arr[Math.floor(Math.random() * arr.length)];
            if (!this.state.recentBot.includes(s)) {
                this.state.recentBot.unshift(s);
                this.state.recentBot = this.state.recentBot.slice(0, 12);
                return s;
            }
        }
        const s = arr[Math.floor(Math.random() * arr.length)];
        this.state.recentBot.unshift(s);
        this.state.recentBot = this.state.recentBot.slice(0, 12);
        return s;
    }

    _pickQ(qArr) {
        const q = qArr[Math.floor(Math.random() * qArr.length)];
        // normalize
        return {
            q: q.q || q,
            qtype: q.qtype || "open",
            choices: q.choices || null
        };
    }

    _push(role, text, meta = null) {
        this.state.history.push({ role, text, meta, ts: Date.now() });
        this.state.history = this.state.history.slice(-40);
    }

    _maybeCallName(userName) {
        if (!userName) return "";
        if (Math.random() < 0.12) return userName + "、";
        return "";
    }
}
