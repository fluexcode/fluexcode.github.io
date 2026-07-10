const BOT_ADI   = 'fluexcode';    
const OAUTH_KEY = 'oauth:3ivyx75i7rf2uxzfk8p8sydksnle7s'; 

let KANAL_ADI = 'davidkaan06';
let DC_LINK = 'https://discord.gg/h2As7yGG8b';
let YT_LINK = 'https://www.youtube.com/@davidkaan2246';
let SV_LINK = 'https://lirin.to/register?ref=david';

// Gelişmiş şans havuzu listesi
let SANS_HAVUZU = [
    { min: 1, max: 5, ihtimal: 1, etiket: 'Efsanevi' },
    { min: 6, max: 14, ihtimal: 5, etiket: 'Destansı' },
    { min: 15, max: 26, ihtimal: 10, etiket: 'Nadir' },
    { min: 27, max: 100, ihtimal: 84, etiket: 'Sıradan' }
];

let botKilitli = false; 
let ws;
let reconnectTimeout;

const chatLog = document.getElementById('chatLog');
const terminalLog = document.getElementById('terminalLog');
const currentChannelDisplay = document.getElementById('currentChannelDisplay');

// Panel arayüzüne yeni satır ekleyen fonksiyon
function aralikEkle(min = 0, max = 100, ihtimal = 10, etiket = 'Grup') {
    const container = document.getElementById('probRowsContainer');
    const row = document.createElement('div');
    row.className = 'prob-row';
    row.innerHTML = `
        <input type="text" class="wide etiket-input" placeholder="Grup Adı" value="${etiket}">
        <label style="font-size:11px;">Sayılar:</label>
        <input type="number" class="min-input" placeholder="Min" value="${min}">
        <span>-</span>
        <input type="number" class="max-input" placeholder="Max" value="${max}">
        <label style="font-size:11px; margin-left:10px;">Çıkma Ağırlığı:</label>
        <input type="number" class="ihtimal-input" placeholder="Şans" value="${ihtimal}">
        <button onclick="this.parentElement.remove()">❌ Sil</button>
    `;
    container.appendChild(row);
}

// Başlangıçta varsayılan listeyi ekrana çiz
function tabloyuDoldur() {
    document.getElementById('probRowsContainer').innerHTML = '';
    SANS_HAVUZU.forEach(item => {
        aralikEkle(item.min, item.max, item.ihtimal, item.etiket);
    });
}

function terminalYaz(mesaj, stil = 'term-line') {
    const zaman = new Date().toLocaleTimeString();
    terminalLog.innerHTML += `<div class="${stil}">[${zaman}] ${mesaj}</div>`;
    terminalLog.scrollTop = terminalLog.scrollHeight; 
}

function chatYaz(kullanici, mesaj, isBot = false) {
    const zaman = new Date().toLocaleTimeString();
    const badge = isBot ? `<span class="bot-badge">BOT</span>` : '';
    chatLog.innerHTML += `<div class="chat-msg"><span style="color:#777; font-size:11px;">${zaman}</span> ${badge}<span class="user-name">${kullanici}:</span> <span>${mesaj}</span></div>`;
    chatLog.scrollTop = chatLog.scrollHeight;
}

function baglan() {
    botKilitli = false; 
    clearTimeout(reconnectTimeout); 
    
    terminalYaz(`#${KANAL_ADI} kanalı için yeni bağlantı kuruluyor...`, "system-info");
    currentChannelDisplay.innerText = KANAL_ADI;

    ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    ws.onopen = function() {
        ws.send(`PASS ${OAUTH_KEY}`);
        ws.send(`NICK ${BOT_ADI}`);
        ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        ws.send(`JOIN #${KANAL_ADI}`);
    };

    ws.onmessage = function(event) {
        const data = event.data;

        if (data.includes('PING')) {
            ws.send('PONG :tmi.twitch.tv');
            return;
        }

        if (data.includes('Notice Authenticating failed')) {
            terminalYaz("BAĞLANTI HATASI: Giriş başarısız, Token geçersiz veya süresi dolmuş!", "system-error");
            return;
        }

        if (data.includes('Welcome, GLHF!')) {
            terminalYaz(`${KANAL_ADI} kanal odasına bağlandı. Yetkiler sorgulanıyor...`, "term-line");
        }

        if (data.includes('USERSTATE') && data.includes(`#${KANAL_ADI}`)) {
            const isMod = data.includes('mod=1');
            const isBroadcaster = data.includes('badges=broadcaster/1');

            if (!isMod && !isBroadcaster) {
                if (!botKilitli) {
                    botKilitli = true; 
                    terminalYaz("KRİTİK UYARI: Bot bu kanalda moderatör yetkisine sahip değil!", "system-error");
                    const kilitMesaji = "⚠️ Bu kanalda Moderatör yetkim yok! Yetki verilene kadar komutlar kapatılmıştır.";
                    ws.send(`PRIVMSG #${KANAL_ADI} :${kilitMesaji}`);
                    chatYaz(BOT_ADI, kilitMesaji, true);
                }
                return;
            } else {
                if(botKilitli) terminalYaz("Moderatör yetkisi doğrulandı. Bot aktif!", "system-success");
                botKilitli = false;
            }
        }

        const match = data.match(/:([^!]+)![^@]+@[^ ]+ PRIVMSG #[^ ]+ :(.*)/);
        if (match) {
            const kullanici = match[1];
            const mesaj = match[2].trim();
            const isSelf = (kullanici.toLowerCase() === BOT_ADI.toLowerCase());

            chatYaz(kullanici, mesaj, isSelf);
            if (isSelf) return;
            if (botKilitli) return; 

            const msgLower = mesaj.toLowerCase();

            if (msgLower === '!dc' || msgLower === '!discord') {
                const cevap = `@${kullanici} Discord Sunucumuz: ${DC_LINK}`;
                ws.send(`PRIVMSG #${KANAL_ADI} :${cevap}`);
                chatYaz(BOT_ADI, cevap, true);
            } 
            else if (msgLower === '!sv' || msgLower === '!server') {
                const cevap = `@${kullanici} Kayıt Linki: ${SV_LINK}`;
                ws.send(`PRIVMSG #${KANAL_ADI} :${cevap}`);
                chatYaz(BOT_ADI, cevap, true);
            } 
            else if (msgLower === '!yt' || msgLower === '!youtube') {
                const cevap = `@${kullanici} YouTube Kanalımız: ${YT_LINK}`;
                ws.send(`PRIVMSG #${KANAL_ADI} :${cevap}`);
                chatYaz(BOT_ADI, cevap, true);
            }
            /* GELİŞMİŞ ŞANS MOTORU ALANI */
            else if (msgLower === '!kazan') {
                terminalYaz(`Komut tetiklendi: !kazan -> Gönderen: ${kullanici}`, "command-trigger");
                
                if (SANS_HAVUZU.length === 0) {
                    const cevap = `@${kullanici} Şans havuzu ayarlanmamış!`;
                    ws.send(`PRIVMSG #${KANAL_ADI} :${cevap}`);
                    return;
                }

                let toplamAgirlik = 0;
                SANS_HAVUZU.forEach(h => toplamAgirlik += h.ihtimal);

                let rastgeleZar = Math.random() * toplamAgirlik;
                let secilenAralik = null;

                for (let i = 0; i < SANS_HAVUZU.length; i++) {
                    rastgeleZar -= SANS_HAVUZU[i].ihtimal;
                    if (rastgeleZar <= 0) {
                        secilenAralik = SANS_HAVUZU[i];
                        break;
                    }
                }

                if (!secilenAralik) secilenAralik = SANS_HAVUZU[SANS_HAVUZU.length - 1];

                const sonucSayi = Math.floor(Math.random() * (secilenAralik.max - secilenAralik.min + 1)) + secilenAralik.min;
                
                // İstediğin Yeni Çıktı Formatı
                const cevap = `@${kullanici} Sayı : [${secilenAralik.etiket}] %${sonucSayi}`;
                
                ws.send(`PRIVMSG #${KANAL_ADI} :${cevap}`);
                chatYaz(BOT_ADI, cevap, true);
            }
            else if (msgLower === '!yardım' || msgLower === '!yardim' || msgLower === '!komutlar') {
                const cevap = `@${kullanici} Kullanabileceğiniz komutlar: !dc, !yt, !sv, !kazan`;
                ws.send(`PRIVMSG #${KANAL_ADI} :${cevap}`);
                chatYaz(BOT_ADI, cevap, true);
            }
        }
    };

    ws.onerror = function(err) { terminalYaz("WebSocket Hatası oluştu!", "system-error"); };
    ws.onclose = function() {
        terminalYaz("Bağlantı koptu. 3 saniye içinde yeniden bağlanılıyor...", "system-error");
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(function() { baglan(); }, 3000); 
    };
}

function ayarlariKaydet() {
    terminalYaz("Ayarlar ve Şans Grupları güncelleniyor, bot yeniden başlatılıyor...", "system-info");
    
    KANAL_ADI = document.getElementById('targetChannelInput').value.trim().toLowerCase();
    DC_LINK = document.getElementById('dcLinkInput').value.trim();
    YT_LINK = document.getElementById('ytLinkInput').value.trim();
    SV_LINK = document.getElementById('svLinkInput').value.trim();
    
    const dinamikHavuz = [];
    const rows = document.querySelectorAll('.prob-row');
    
    rows.forEach(row => {
        const etiket = row.querySelector('.etiket-input').value.trim() || 'Grup';
        const min = parseInt(row.querySelector('.min-input').value) || 0;
        const max = parseInt(row.querySelector('.max-input').value) || 100;
        const ihtimal = parseInt(row.querySelector('.ihtimal-input').value) || 1;
        
        dinamikHavuz.push({ min, max, ihtimal, etiket });
    });

    SANS_HAVUZU = dinamikHavuz;

    if (ws) {
        ws.onclose = function () {}; 
        ws.close(); 
    }
    
    baglan();
}

// Başlangıç tetiklemeleri
tabloyuDoldur();
baglan();
