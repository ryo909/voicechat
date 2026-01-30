class DialogueSystem {
    constructor() {
        this.steps = {
            'start': {
                responses: [
                    { text: "こんにちは！お話しましょう。", mood: "happy" },
                    { text: "起動しました。何か御用ですか？", mood: "calm" }
                ],
                next: 'smalltalk'
            },
            'smalltalk': {
                handler: (text, ctx) => this.handleSmallTalk(text, ctx)
            }
        };

        this.currentState = 'start';
    }

    // Main entry
    step(userText, ctx = {}) {
        // If specific state has direct responses (like start)
        if (this.steps[this.currentState].responses) {
            const reply = this.pickRandom(this.steps[this.currentState].responses);
            if (this.steps[this.currentState].next) {
                this.currentState = this.steps[this.currentState].next;
            }
            return this.finalize(reply, ctx);
        }

        // Logic handler
        if (this.steps[this.currentState].handler) {
            const reply = this.steps[this.currentState].handler(userText, ctx);
            return this.finalize(reply, ctx);
        }

        return { text: "...", mood: "neutral" };
    }

    handleSmallTalk(text, ctx) {
        const intent = this.detectIntent(text);

        const templates = {
            greet: [
                { text: "こんにちは！元気ですか？", mood: "happy" },
                { text: "やっほー！今日も頑張りましょう。", mood: "happy" }
            ],
            thanks: [
                { text: "いえいえ、どういたしまして。", mood: "calm" },
                { text: "お役に立てて嬉しいです！", mood: "happy" }
            ],
            help: [
                { text: "困っているんですね。詳しく教えてください。", mood: "concerned" },
                { text: "何か手伝えることはありますか？", mood: "neutral" }
            ],
            work: [
                { text: "仕事の話ですね。進捗はどうですか？", mood: "serious" },
                { text: "了解です。案件について確認しましょう。", mood: "serious" }
            ],
            joke: [
                { text: "あはは！面白いですね。", mood: "happy" },
                { text: "ふふっ、その冗談好きです。", mood: "happy" }
            ],
            bye: [
                { text: "またお話ししましょう！", mood: "calm" },
                { text: "お疲れ様でした。ゆっくり休んでくださいね。", mood: "calm" }
            ],
            other: [
                { text: "なるほど、それで？", mood: "neutral" },
                { text: "ふむふむ、興味深いですね。", mood: "calm" },
                { text: "もっと詳しく聞かせてください。", mood: "happy" },
                { text: "それは知らなかったです！", mood: "happy" }
            ]
        };

        const candidates = templates[intent] || templates.other;
        return this.pickRandom(candidates);
    }

    detectIntent(text) {
        if (!text) return 'other';
        const t = text.toLowerCase();

        if (t.includes('こんにちは') || t.includes('hello') || t.includes('おはよう')) return 'greet';
        if (t.includes('ありがとう') || t.includes('thanks') || t.includes('助かった')) return 'thanks';
        if (t.includes('困った') || t.includes('help') || t.includes('相談') || t.includes('どうしよう')) return 'help';
        if (t.includes('仕事') || t.includes('進捗') || t.includes('案件') || t.includes('mtg')) return 'work';
        if (t.includes('www') || t.includes('笑') || t.includes('うける')) return 'joke';
        if (t.includes('さよなら') || t.includes('bye') || t.includes('お疲れ') || t.includes('終わり')) return 'bye';

        return 'other';
    }

    finalize(reply, ctx) {
        let finalReply = { ...reply };

        // 1. Mode Prefix
        const mode = ctx.mode || 'chat';
        if (mode === 'chat') {
            const chatPrefixes = ["うんうん。", "なるほどね。", "おっけー。", "", ""];
            const prefix = this.pickRandom(chatPrefixes);
            if (prefix) finalReply.text = prefix + " " + finalReply.text;
        } else if (mode === 'work') {
            const workPrefixes = ["了解です。", "承知しました。", "はい。", "確認します。", ""];
            const prefix = this.pickRandom(workPrefixes);
            if (prefix) finalReply.text = prefix + " " + finalReply.text;
        }

        // 2. User Name Insertion (Maybe)
        if (ctx.userName && Math.random() < 0.12) {
            const suffix = [` ${ctx.userName}？`, ` ね、${ctx.userName}。`, ` ${ctx.userName}もそう思います？`];
            const add = this.pickRandom(suffix);
            if (!finalReply.text.includes(ctx.userName)) { // avoid double
                finalReply.text += add;
            }
        }

        return finalReply;
    }

    pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}
