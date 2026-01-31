// ============================================
// Utility Functions (Must be at top)
// ============================================
const $ = function (id) { return document.getElementById(id); };

function must(id) {
    var el = $(id);
    if (!el) console.error("[MISSING ELEMENT]", id);
    return el;
}

// ============================================
// TTS & DSM Instances (created after DOM ready)
// ============================================
var tts = null;
var dsm = null;

// ============================================
// State & Config
// ============================================
var appState = {
    mode: 'chat', // chat | work
    mascotName: 'Mascot',
    userName: '',
    affinity: 0,
    devVisible: false
};

// ============================================
// Mascot Name Storage
// ============================================
const LS_NAME_KEY = "mascot_name_v1";
const DEFAULT_NAME = "まるもち";

function getMascotName() {
    return localStorage.getItem(LS_NAME_KEY) || DEFAULT_NAME;
}
function setMascotName(name) {
    const cleaned = (name || "").trim().slice(0, 24);
    localStorage.setItem(LS_NAME_KEY, cleaned || DEFAULT_NAME);
    renderMascotName();
}
function renderMascotName() {
    const name = getMascotName();
    const mascotNameLabel = document.getElementById("mascotNameLabel");
    const mascotNameInput = document.getElementById("mascotNameInput");
    if (mascotNameLabel) mascotNameLabel.textContent = name;
    if (mascotNameInput) mascotNameInput.value = name;
}

// ============================================
// Bubble Update Helper
// ============================================
function setBubble(text) {
    const el = document.getElementById("bubbleText") || document.getElementById("bubble");
    if (!el) return;
    el.textContent = text || "";
}

// ============================================
// DOM Elements (populated in initApp)
// ============================================
var els = {};

// ============================================
// Main Init
// ============================================
async function initApp() {
    console.log("[initApp] Starting...");

    // Create instances
    tts = new TTS();
    dsm = new DialogueSystem();

    // Get DOM elements (mouth-related removed)
    els = {
        mascotFrame: must('mascotFrame'),
        mascotImg: must('mascotImg'),
        bubble: must('bubble'),
        status: must('statusDisplay'),
        chatLog: must('chatLog'),
        input: must('chatInput'),
        btnSend: must('btnSend'),
        voiceSelect: must('voiceSelect'),
        btnVoice: must('btnVoiceToggle'),
        btnStop: must('btnStop'),
        btnSfx: must('btnSfxToggle'),
        btnMode: must('btnMode'),
        affinityFill: must('affinityFill'),
        devPanel: must('devPanel'),
        btnToggleDev: must('btnToggleDev'),

        // Image / Profile
        imageInput: must('imageInput'),
        btnSelectImage: must('btnSelectImage'),
        btnResetImage: must('btnResetImage'),
        userNameInput: must('userNameInput'),
        mascotNameInput: $('mascotNameInput'),
        mascotNameSave: $('mascotNameSave'),
        mascotNameLabel: $('mascotNameLabel'),
        btnSaveName: must('btnSaveName')
    };

    // Cleanup old mouth tuning data
    localStorage.removeItem("mascot_mouth_tuning_v1");

    loadSettings();
    await restoreImage();
    initUI();

    // Initialize mascot name display
    renderMascotName();

    console.log("[initApp] Complete.");

    // Initial Greeting
    setTimeout(function () {
        var reply = dsm.step("", { mode: appState.mode, userName: appState.userName, mascotName: getMascotName() });
        addBotMessage(reply);
    }, 1000);
}

// ============================================
// DOMContentLoaded
// ============================================
window.addEventListener("DOMContentLoaded", function () {
    console.log("[DOMContentLoaded] Fired.");
    initApp().catch(function (e) {
        console.error(e);
        alert("初期化エラー: " + (e && e.message ? e.message : e));
    });
});

// ============================================
// UI Setup
// ============================================
function initUI() {
    // Debug: Click Logger
    document.addEventListener("click", function (e) {
        console.log("CLICK:", e.target);
    });

    // Top Bar
    els.btnVoice.addEventListener('click', function () {
        tts.toggle(!tts.enabled);
        els.btnVoice.textContent = tts.enabled ? '🔈 ON' : '🔈 OFF';
        els.btnVoice.classList.toggle('active', tts.enabled);
        if (tts.enabled) tts.unlock();
    });

    els.btnStop.addEventListener('click', function () { tts.stop(); });

    els.btnSfx.addEventListener('click', function () {
        tts.sfxEnabled = !tts.sfxEnabled;
        els.btnSfx.textContent = tts.sfxEnabled ? '🔔 ON' : '🔔 OFF';
        els.btnSfx.classList.toggle('active', tts.sfxEnabled);
        saveSettings();
    });

    els.btnMode.addEventListener('click', toggleMode);

    // Voice List - Fixed to apply voice to TTS
    window.addEventListener('voices-updated', function (e) {
        els.voiceSelect.innerHTML = '';
        e.detail.forEach(function (v) {
            var opt = document.createElement('option');
            opt.value = v.voiceURI;
            opt.textContent = v.name + " (" + v.lang + ")" + (v.default ? " *" : "");
            els.voiceSelect.appendChild(opt);
        });

        var saved = localStorage.getItem('mascot_voice_uri');

        if (saved) {
            els.voiceSelect.value = saved;
            tts.setProfile({ voiceURI: saved }); // Apply to TTS
        } else {
            if (els.voiceSelect.value) {
                tts.setProfile({ voiceURI: els.voiceSelect.value }); // Set initial voice
            }
        }
    });

    els.voiceSelect.addEventListener('change', function (e) {
        tts.setProfile({ voiceURI: e.target.value });
        localStorage.setItem('mascot_voice_uri', e.target.value);
    });

    must('rateRange').addEventListener('input', function (e) { tts.setProfile({ rate: e.target.value }); });
    must('pitchRange').addEventListener('input', function (e) { tts.setProfile({ pitch: e.target.value }); });

    // Chat
    els.btnSend.addEventListener('click', handleSend);
    els.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleSend();
    });

    // Dev Panel
    els.btnToggleDev.addEventListener('click', function () {
        appState.devVisible = !appState.devVisible;
        els.devPanel.classList.toggle('hidden', !appState.devVisible);
        saveSettings();
    });

    // Image Replace
    els.btnSelectImage.addEventListener('click', function () {
        els.imageInput.click();
    });
    els.imageInput.addEventListener('change', handleImageUpload);
    els.btnResetImage.addEventListener('click', resetImage);

    // Profile - User Name
    els.btnSaveName.addEventListener('click', function () {
        appState.userName = els.userNameInput.value;
        saveSettings();
        setStatus("呼び名を保存しました");
        setTimeout(function () { setStatus("待機中"); }, 700);
    });

    // Profile - Mascot Name
    if (els.mascotNameSave) {
        els.mascotNameSave.addEventListener("click", function () {
            setMascotName(els.mascotNameInput.value);
            setStatus("キャラ名を保存しました");
            setTimeout(function () { setStatus("待機中"); }, 700);
        });
    }

    // Initial Renders
    updateAffinityUI();
    updateModeUI();
}

// ============================================
// Chat Handling
// ============================================
function handleSend() {
    var text = els.input.value.trim();
    if (!text) return;

    // Unlock Audio Context on user gesture
    if (tts.ensureAudio) tts.ensureAudio();

    // UI Updates
    els.input.value = '';
    addLog(text, 'user');

    // Effects
    els.mascotFrame.classList.add('react');
    createSparkle();
    tts.playPing();

    setTimeout(function () { els.mascotFrame.classList.remove('react'); }, 220);

    // Logic
    increaseAffinity();

    // Bot Response
    var reply = dsm.step(text, { mode: appState.mode, userName: appState.userName, mascotName: getMascotName() });

    // Thinking Delay
    setThinking(true);
    var delay = 400 + Math.random() * 800; // 0.4s - 1.2s

    setTimeout(function () {
        setThinking(false);
        addBotMessage(reply);
    }, delay);
}

function addLog(text, type) {
    var div = document.createElement('div');
    div.className = 'msg-row ' + type;

    // Add mascot name label for bot messages
    if (type === 'bot') {
        div.innerHTML = '<div class="msg-bubble"><div class="msgLabel">' + escapeHtml(getMascotName()) + '</div>' + escapeHtml(text) + '</div>';
    } else {
        div.innerHTML = '<div class="msg-bubble">' + escapeHtml(text) + '</div>';
    }

    els.chatLog.appendChild(div);
    els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function setStatus(msg) {
    if (els.status) els.status.innerText = msg;
}

function addBotMessage(reply) {
    addLog(reply.text, 'bot');
    setBubble(reply.text);

    // Speak
    els.mascotFrame.classList.add('speaking');
    els.status.innerText = "発話中...";

    tts.speak(reply.text, reply.mood,
        function () { /* start */ },
        function () { /* end */
            els.mascotFrame.classList.remove('speaking');
            els.status.innerText = "待機中";
        }
    );
}

function setThinking(bool) {
    if (bool) {
        els.mascotFrame.classList.add('thinking');
        els.status.innerText = "考え中...";
        setBubble("...");
    } else {
        els.mascotFrame.classList.remove('thinking');
    }
}

// ============================================
// Mode Toggle
// ============================================
function toggleMode() {
    appState.mode = appState.mode === 'chat' ? 'work' : 'chat';
    saveSettings();
    updateModeUI();

    var msg = appState.mode === 'chat' ? "雑談モードにしました。気楽に話しましょう。" : "仕事モードです。集中します。";
    addBotMessage({ text: msg, mood: 'neutral' });
}

function updateModeUI() {
    if (appState.mode === 'chat') {
        els.btnMode.textContent = "🫧 雑談";
        els.btnMode.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    } else {
        els.btnMode.textContent = "🧰 仕事";
        els.btnMode.style.background = "linear-gradient(135deg, #434343 0%, #000000 100%)";
    }
}

// ============================================
// Affinity
// ============================================
function increaseAffinity() {
    appState.affinity = Math.min(100, appState.affinity + 5);
    updateAffinityUI();
    saveSettings();
}

function updateAffinityUI() {
    if (els.affinityFill) els.affinityFill.style.width = appState.affinity + '%';
}

// ============================================
// Sparkle Effect
// ============================================
function createSparkle() {
    var container = $('sparkleContainer');
    if (!container) return;
    var s = document.createElement('div');
    s.className = 'sparkle';
    s.style.left = (20 + Math.random() * 60) + '%';
    s.style.top = (20 + Math.random() * 60) + '%';
    container.appendChild(s);
    setTimeout(function () { s.remove(); }, 600);
}

// ============================================
// Settings & Storage (mouth config removed)
// ============================================
function loadSettings() {
    var sName = localStorage.getItem('mascot_user_name_v1');
    if (sName) appState.userName = sName;
    if (els.userNameInput) els.userNameInput.value = appState.userName;

    var sAff = localStorage.getItem('mascot_affinity_v1');
    if (sAff) appState.affinity = parseInt(sAff);

    var sMode = localStorage.getItem('mascot_mode_v1');
    if (sMode) appState.mode = sMode;

    var sDev = localStorage.getItem('mascot_dev_visible_v1');
    if (sDev === 'true') {
        appState.devVisible = true;
        if (els.devPanel) els.devPanel.classList.remove('hidden');
    }

    var sSfx = localStorage.getItem('mascot_sfx_enabled_v1');
    if (sSfx === 'true' && tts) {
        tts.sfxEnabled = true;
        if (els.btnSfx) {
            els.btnSfx.textContent = '🔔 ON';
            els.btnSfx.classList.add('active');
        }
    }

    // Restore voice to TTS
    var savedVoice = localStorage.getItem('mascot_voice_uri');
    if (savedVoice && tts) {
        tts.setProfile({ voiceURI: savedVoice });
    }
}

function saveSettings() {
    localStorage.setItem('mascot_user_name_v1', appState.userName);
    localStorage.setItem('mascot_affinity_v1', appState.affinity);
    localStorage.setItem('mascot_mode_v1', appState.mode);
    localStorage.setItem('mascot_dev_visible_v1', appState.devVisible);
    if (tts) localStorage.setItem('mascot_sfx_enabled_v1', tts.sfxEnabled);
}

// ============================================
// IndexedDB for Image
// ============================================
function getDB() {
    return new Promise(function (resolve, reject) {
        var req = indexedDB.open('mascot_talk_db', 1);
        req.onupgradeneeded = function (e) {
            e.target.result.createObjectStore('kv');
        };
        req.onsuccess = function (e) { resolve(e.target.result); };
        req.onerror = function (e) { reject(e); };
    });
}

function handleImageUpload(e) {
    var file = e.target.files[0];
    if (!file) return;

    getDB().then(function (db) {
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(file, 'mascot_image_blob');

        // Display
        var url = URL.createObjectURL(file);
        if (els.mascotImg) els.mascotImg.src = url;
        var fileDisplay = $('fileNameDisplay');
        if (fileDisplay) fileDisplay.innerText = file.name;

        alert('画像を保存しました（端末内のみ）');
    }).catch(function (err) {
        console.error('DB Save Error', err);
    });
}

function restoreImage() {
    return getDB().then(function (db) {
        return new Promise(function (resolve) {
            var tx = db.transaction('kv', 'readonly');
            var req = tx.objectStore('kv').get('mascot_image_blob');
            req.onsuccess = function (e) {
                var file = e.target.result;
                if (file) {
                    var url = URL.createObjectURL(file);
                    if (els.mascotImg) els.mascotImg.src = url;
                    var fileDisplay = $('fileNameDisplay');
                    if (fileDisplay) fileDisplay.innerText = "保存された画像";
                }
                resolve();
            };
            req.onerror = function () { resolve(); };
        });
    }).catch(function (err) {
        console.warn('DB Error', err);
    });
}

function resetImage() {
    getDB().then(function (db) {
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').delete('mascot_image_blob');

        if (els.mascotImg) els.mascotImg.src = "./assets/mascot.png";
        var fileDisplay = $('fileNameDisplay');
        if (fileDisplay) fileDisplay.innerText = "（未選択）";
    }).catch(function (err) {
        console.error('DB Error', err);
    });
}

// ============================================
// Utils
// ============================================
function escapeHtml(text) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}
