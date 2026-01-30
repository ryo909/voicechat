class TTS {
    constructor() {
        this.synth = window.speechSynthesis;
        this.enabled = true; // Default ON? User toggle controls this.
        this.voices = [];
        this.audioCtx = null;
        this.sfxEnabled = false;
        
        // Profile for speech
        this.voiceURI = null;
        this.lang = 'ja-JP';
        this.rate = 1.0;
        this.pitch = 1.0;
        this.volume = 1.0;

        // Populate voices
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.updateVoices();
        }
        this.updateVoices();
    }

    updateVoices() {
        this.voices = this.synth.getVoices().sort((a, b) => {
            const aJa = a.lang.startsWith('ja') ? -1 : 1;
            const bJa = b.lang.startsWith('ja') ? -1 : 1;
            return aJa - bJa;
        });

        // Trigger event for UI to update list
        window.dispatchEvent(new CustomEvent('voices-updated', { detail: this.voices }));
    }

    getVoices() {
        return this.voices;
    }

    setProfile(profile) {
        if (profile.voiceURI !== undefined) this.voiceURI = profile.voiceURI;
        if (profile.rate !== undefined) this.rate = parseFloat(profile.rate);
        if (profile.pitch !== undefined) this.pitch = parseFloat(profile.pitch);
    }

    toggle(bool) {
        this.enabled = bool;
        if (!bool) this.stop();
    }

    stop() {
        this.synth.cancel();
    }

    // iOS/Mobile Unlock for AudioContext & Speech
    unlock() {
        // Unlock Web Audio
        this.ensureAudio();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        // Unlock Speech (speak empty)
        if (this.enabled) {
            const u = new SpeechSynthesisUtterance('');
            this.synth.speak(u);
        }
    }

    ensureAudio() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
    }

    playPing() {
        if (!this.sfxEnabled) return;
        this.ensureAudio();
        if (!this.audioCtx) return;

        const t = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, t);
        osc.frequency.linearRampToValueAtTime(990, t + 0.1);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.start(t);
        osc.stop(t + 0.15);
    }

    speak(text, mood = 'neutral', onStart, onEnd) {
        if (!this.enabled) {
            // Even if disabled, fire events to simulate timing?
            // For now, just fire end immediately or skip
             if (onEnd) onEnd();
            return;
        }

        this.stop(); // Preempt previous

        const u = new SpeechSynthesisUtterance(text);
        u.lang = this.lang;
        u.rate = this.rate;
        u.pitch = this.pitch;
        u.volume = this.volume;

        // Apply mood variations (subtle)
        if (mood === 'happy') {
            u.pitch = Math.min(2.0, this.pitch + 0.2);
            u.rate = Math.min(2.0, this.rate + 0.1);
        } else if (mood === 'calm') {
            u.pitch = Math.max(0.1, this.pitch - 0.1);
            u.rate = Math.max(0.1, this.rate - 0.1);
        }

        // Select voice
        if (this.voiceURI) {
            const v = this.voices.find(v => v.voiceURI === this.voiceURI);
            if (v) u.voice = v;
        }

        u.onstart = () => { if(onStart) onStart(); };
        u.onend = () => { if(onEnd) onEnd(); };
        u.onerror = (e) => { 
            console.warn("TTS Error", e); 
            if(onEnd) onEnd(); 
        };

        this.synth.speak(u);
    }
}
