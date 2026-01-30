// Main Application Logic
const tts = new TTS();
const dsm = new DialogueSystem();

// State & Config
let appState = {
    mode: 'chat', // chat | work
    mascotName: 'Mascot',
    userName: '',
    affinity: 0,
    mouthConfig: { x: 50, y: 70, w: 60, h: 20 },
    devVisible: false
};

// DOM Elements
const els = {
    mascotFrame: document.getElementById('mascotFrame'),
    mascotImg: document.getElementById('mascotImg'),
    mouth: document.getElementById('mouthOverlay'),
    bubble: document.getElementById('bubble'),
    status: document.getElementById('statusDisplay'),
    chatLog: document.getElementById('chatLog'),
    input: document.getElementById('chatInput'),
    btnSend: document.getElementById('btnSend'),
    voiceSelect: document.getElementById('voiceSelect'),
    btnVoice: document.getElementById('btnVoiceToggle'),
    btnStop: document.getElementById('btnStop'),
    btnSfx: document.getElementById('btnSfxToggle'),
    btnMode: document.getElementById('btnMode'),
    affinityFill: document.getElementById('affinityFill'),
    devPanel: document.getElementById('devPanel'),
    btnToggleDev: document.getElementById('btnToggleDev'),

    // Dev Controls
    rangeX: document.getElementById('rangeX'),
    rangeY: document.getElementById('rangeY'),
    rangeW: document.getElementById('rangeW'),
    rangeH: document.getElementById('rangeH'),
    valX: document.getElementById('valX'),
    valY: document.getElementById('valY'),
    valW: document.getElementById('valW'),
    valH: document.getElementById('valH'),
    btnSaveMouth: document.getElementById('btnSaveMouth'),
    btnResetMouth: document.getElementById('btnResetMouth'),

    // Image / Profile
    imageInput: document.getElementById('imageInput'),
    btnResetImage: document.getElementById('btnResetImage'),
    userNameInput: document.getElementById('userNameInput'),
    btnSaveName: document.getElementById('btnSaveName')
};

// Init
window.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    await restoreImage();
    initUI();

    // Initial Greeting
    setTimeout(() => {
        const reply = dsm.step("", { mode: appState.mode, userName: appState.userName });
        addBotMessage(reply);
    }, 1000);
});

function initUI() {
    // Top Bar
    els.btnVoice.addEventListener('click', () => {
        tts.toggle(!tts.enabled);
        els.btnVoice.textContent = tts.enabled ? '🔈 ON' : '🔈 OFF';
        els.btnVoice.classList.toggle('active', tts.enabled);
        if (tts.enabled) tts.unlock();
    });

    els.btnStop.addEventListener('click', () => tts.stop());

    els.btnSfx.addEventListener('click', () => {
        tts.sfxEnabled = !tts.sfxEnabled;
        els.btnSfx.textContent = tts.sfxEnabled ? '🔔 ON' : '🔔 OFF';
        els.btnSfx.classList.toggle('active', tts.sfxEnabled);
        saveSettings();
    });

    els.btnMode.addEventListener('click', toggleMode);

    // Voice List
    window.addEventListener('voices-updated', (e) => {
        els.voiceSelect.innerHTML = '';
        e.detail.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.voiceURI;
            opt.textContent = \`\${v.name} (\${v.lang})\`;
            els.voiceSelect.appendChild(opt);
        });
        // Restore selection if exists
        const saved = localStorage.getItem('mascot_voice_uri');
        if (saved) els.voiceSelect.value = saved;
    });

    els.voiceSelect.addEventListener('change', (e) => {
        tts.setProfile({ voiceURI: e.target.value });
        localStorage.setItem('mascot_voice_uri', e.target.value);
    });

    document.getElementById('rateRange').addEventListener('input', (e) => tts.setProfile({ rate: e.target.value }));
    document.getElementById('pitchRange').addEventListener('input', (e) => tts.setProfile({ pitch: e.target.value }));

    // Chat
    els.btnSend.addEventListener('click', handleSend);
    els.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // Dev Panel
    els.btnToggleDev.addEventListener('click', () => {
        appState.devVisible = !appState.devVisible;
        els.devPanel.classList.toggle('hidden', !appState.devVisible);
        saveSettings();
    });

    // Mouth Tuning
    const updateMouth = () => {
        appState.mouthConfig = {
            x: els.rangeX.value,
            y: els.rangeY.value,
            w: els.rangeW.value,
            h: els.rangeH.value
        };
        els.valX.innerText = appState.mouthConfig.x;
        els.valY.innerText = appState.mouthConfig.y;
        els.valW.innerText = appState.mouthConfig.w;
        els.valH.innerText = appState.mouthConfig.h;
        applyMouthStyle();
    };
    [els.rangeX, els.rangeY, els.rangeW, els.rangeH].forEach(r => r.addEventListener('input', updateMouth));
    
    els.btnSaveMouth.addEventListener('click', saveSettings);
    els.btnResetMouth.addEventListener('click', () => {
        appState.mouthConfig = { x: 50, y: 70, w: 60, h: 20 };
        renderDevPanelValues();
        applyMouthStyle();
    });

    // Image Replace
    els.imageInput.addEventListener('change', handleImageUpload);
    els.btnResetImage.addEventListener('click', resetImage);

    // Profile
    els.btnSaveName.addEventListener('click', () => {
        appState.userName = els.userNameInput.value;
        saveSettings();
        alert('保存しました');
    });

    // Initial Renders
    applyMouthStyle();
    renderDevPanelValues();
    updateAffinityUI();
    updateModeUI();
}

function handleSend() {
    const text = els.input.value.trim();
    if (!text) return;
    
    // Unlock Audio Context on user gesture
    tts.unlockAudioIfNeeded ? tts.unlockAudioIfNeeded() : tts.ensureAudio();

    // UI Updates
    els.input.value = '';
    addLog(text, 'user');
    
    // Effects
    els.mascotFrame.classList.add('react');
    createSparkle();
    tts.playPing();
    
    setTimeout(() => els.mascotFrame.classList.remove('react'), 220);

    // Logic
    increaseAffinity();

    // Bot Response
    const reply = dsm.step(text, { mode: appState.mode, userName: appState.userName });
    
    // Thinking Delay
    setThinking(true);
    const delay = 400 + Math.random() * 800; // 0.4s - 1.2s
    
    setTimeout(() => {
        setThinking(false);
        addBotMessage(reply);
    }, delay);
}

function addLog(text, type) {
    const div = document.createElement('div');
    div.className = \`msg-row \${type}\`;
    div.innerHTML = \`<div class="msg-bubble">\${escapeHtml(text)}</div>\`;
    els.chatLog.appendChild(div);
    els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function addBotMessage(reply) {
    addLog(reply.text, 'bot');
    els.bubble.innerText = reply.text;
    
    // Speak
    els.mascotFrame.classList.add('speaking');
    els.status.innerText = "発話中...";
    
    tts.speak(reply.text, reply.mood, 
        () => { /* start */ },
        () => { /* end */
            els.mascotFrame.classList.remove('speaking');
            els.status.innerText = "待機中";
        }
    );
}

function setThinking(bool) {
    if (bool) {
        els.mascotFrame.classList.add('thinking');
        els.status.innerText = "考え中...";
        els.bubble.innerText = "...";
    } else {
        els.mascotFrame.classList.remove('thinking');
    }
}

function toggleMode() {
    appState.mode = appState.mode === 'chat' ? 'work' : 'chat';
    saveSettings();
    updateModeUI();
    
    const msg = appState.mode === 'chat' ? "雑談モードにしました。気楽に話しましょう。" : "仕事モードです。集中します。";
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

function increaseAffinity() {
    appState.affinity = Math.min(100, appState.affinity + 5);
    updateAffinityUI();
    saveSettings();
}

function updateAffinityUI() {
    els.affinityFill.style.width = appState.affinity + '%';
}

function createSparkle() {
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.style.left = (20 + Math.random() * 60) + '%';
    s.style.top = (20 + Math.random() * 60) + '%';
    document.getElementById('sparkleContainer').appendChild(s);
    setTimeout(() => s.remove(), 600);
}

// Settings & Storage
function loadSettings() {
    const sName = localStorage.getItem('mascot_user_name_v1');
    if (sName) appState.userName = sName;
    els.userNameInput.value = appState.userName;

    const sAff = localStorage.getItem('mascot_affinity_v1');
    if (sAff) appState.affinity = parseInt(sAff);

    const sMouth = localStorage.getItem('mascot_mouth_tuning_v1');
    if (sMouth) appState.mouthConfig = JSON.parse(sMouth);

    const sMode = localStorage.getItem('mascot_mode_v1');
    if (sMode) appState.mode = sMode;
    
    const sDev = localStorage.getItem('mascot_dev_visible_v1');
    if (sDev === 'true') {
        appState.devVisible = true;
        els.devPanel.classList.remove('hidden');
    }
    
    const sSfx = localStorage.getItem('mascot_sfx_enabled_v1');
    if (sSfx === 'true') {
        tts.sfxEnabled = true;
        els.btnSfx.textContent = '🔔 ON';
        els.btnSfx.classList.add('active');
    }
}

function saveSettings() {
    localStorage.setItem('mascot_user_name_v1', appState.userName);
    localStorage.setItem('mascot_affinity_v1', appState.affinity);
    localStorage.setItem('mascot_mouth_tuning_v1', JSON.stringify(appState.mouthConfig));
    localStorage.setItem('mascot_mode_v1', appState.mode);
    localStorage.setItem('mascot_dev_visible_v1', appState.devVisible);
    localStorage.setItem('mascot_sfx_enabled_v1', tts.sfxEnabled);
}

function applyMouthStyle() {
    const { x, y, w, h } = appState.mouthConfig;
    els.mouth.style.left = x + '%';
    els.mouth.style.top = y + '%';
    els.mouth.style.width = w + 'px';
    els.mouth.style.height = h + 'px';
}

function renderDevPanelValues() {
    els.rangeX.value = appState.mouthConfig.x;
    els.rangeY.value = appState.mouthConfig.y;
    els.rangeW.value = appState.mouthConfig.w;
    els.rangeH.value = appState.mouthConfig.h;
    
    els.valX.innerText = appState.mouthConfig.x;
    els.valY.innerText = appState.mouthConfig.y;
    els.valW.innerText = appState.mouthConfig.w;
    els.valH.innerText = appState.mouthConfig.h;
}

// IndexedDB for Image
function getDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('mascot_talk_db', 1);
        req.onupgradeneeded = (e) => {
            e.target.result.createObjectStore('kv');
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e);
    });
}

async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Save to DB
    const db = await getDB();
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(file, 'mascot_image_blob');
    
    // Display
    const url = URL.createObjectURL(file);
    els.mascotImg.src = url;
    document.getElementById('fileNameDisplay').innerText = file.name;
    
    alert('画像を保存しました（端末内のみ）');
}

async function restoreImage() {
    try {
        const db = await getDB();
        const tx = db.transaction('kv', 'readonly');
        const req = tx.objectStore('kv').get('mascot_image_blob');
        req.onsuccess = (e) => {
            const file = e.target.result;
            if (file) {
                const url = URL.createObjectURL(file);
                els.mascotImg.src = url;
                document.getElementById('fileNameDisplay').innerText = "保存された画像";
            }
        };
    } catch (err) {
        console.warn('DB Error', err);
    }
}

async function resetImage() {
    const db = await getDB();
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').delete('mascot_image_blob');
    
    els.mascotImg.src = "./assets/mascot.png";
    document.getElementById('fileNameDisplay').innerText = "（未選択）";
}

// Utils
function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
