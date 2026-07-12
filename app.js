const BOT_ADI   = 'fluexcode';  
const OAUTH_KEY = 'oauth:3ivyx75i7rf2uxzfk8p8sydksnle7s'; 

let KANAL_ADI = 'davidkaan06';
let DC_LINK = 'https://discord.gg/h2As7yGG8b';
let YT_LINK = 'https://www.youtube.com/@davidkaan2246';
let SV_LINK = 'https://lirin.to/register?ref=david';

// COOLDOWN AYARLARI (Saniye Cinsinden)
const KULLANICI_COOLDOWN_SURESI = 30; // Bir kullanıcı !kazan yazdıktan sonra kaç saniye beklemeli?
const GLOBAL_COOLDOWN_SURESI = 1;     // Komut genel olarak kaç saniyede bir tetiklenebilsin?

// Cooldown takip objeleri
let sonKullanimKullanici = {}; // { 'kullanici_adi': timestamp }
let sonKullanimGlobal = 0;     // timestamp

// 5 saniye sonra otomatik silinecek cooldown/bilgi mesajları için kuyruk.
// Bot kendi mesajının echo'sunu alınca ID'sini yakalayıp /delete ile siler.
let silinecekMesajKuyrugu = []; // [{ metin: "...", chatDiv: HTMLElement, silindi: Boolean, zaman: timestamp }]

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

// Eski mesajları temizleyerek DOM'un büyüyüp yavaşlamasını engeller
const MAKS_MESAJ = 200;

function terminalYaz(mesaj, stil = 'term-line') {
    const zaman = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = stil;
    div.textContent = `[${zaman}] ${mesaj}`;
    terminalLog.appendChild(div);
    while (terminalLog.children.length > MAKS_MESAJ) {
        terminalLog.removeChild(terminalLog.firstChild);
    }
    terminalLog.scrollTop = terminalLog.scrollHeight; 
}

function chatYaz(kullanici, mesaj, isBot = false) {
    const zaman = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = 'chat-msg';
    
    const spanZaman = document.createElement('span');
    spanZaman.style.color = '#777';
    spanZaman.style.fontSize = '11px';
    spanZaman.textContent = zaman + ' ';
    div.appendChild(spanZaman);

    if (isBot) {
        const badge = document.createElement('span');
        badge.className = 'bot-badge';
        badge.textContent = 'BOT';
        div.appendChild(badge);
    }

    const spanUser = document.createElement('span');
    spanUser.className = 'user-name';
    spanUser.textContent = kullanici + ': ';
    div.appendChild(spanUser);

    const spanMsg = document.createElement('span');
    spanMsg.textContent = mesaj;
    div.appendChild(spanMsg);

    chatLog.appendChild(div);
    while (chatLog.children.length > MAKS_MESAJ) {
        chatLog.removeChild(chatLog.firstChild);
    }
    chatLog.scrollTop = chatLog.scrollHeight;
    return div;
}

// Twitch'e gönderilen geçici (cooldown) mesajını chat'te gösterir ve
// 5 saniye sonra hem Twitch'ten hem de yerel panelden silinmek üzere kuyruğa alır.
function geciciMesajGonder(mesajMetni) {
    // Çok eskide kalmış, echo'su hiç gelmemiş kayıtları temizle
    const eskiSinir = Date.now() - 30000;
    silinecekMesajKuyrugu = silinecekMesajKuyrugu.filter(k => k.zaman > eskiSinir);

    ws.send(`PRIVMSG #${KANAL_ADI} :${mesajMetni}`);
    const chatDiv = chatYaz(BOT_ADI, mesajMetni, true);
    silinecekMesajKuyrugu.push({ metin: mesajMetni, chatDiv, silindi: false, zaman: Date.now() });
}

// Twitch'ten belirli bir mesaj ID'sini siler (moderator yetkisi gerektirir)
function mesajSil(msgId) {
    ws.send(`PRIVMSG #${KANAL_ADI} :/delete ${msgId}`);
    terminalYaz(`Cooldown mesajı Twitch'ten silindi (ID: ${msgId})`, "system-info");
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

            // Botun KENDİ gönderdiği mesajların echo'su gelir. Eğer bu mesaj
            // silinmek üzere bekleyen bir cooldown mesajıysa; ID'sini yakalayıp
            // 5 saniye sonra /delete ile siliyoruz. Echo'yu tekrar ekrana basmıyoruz.
            if (isSelf) {
                const idx = silinecekMesajKuyrugu.findIndex(k => k.metin === mesaj && !k.silindi);
                if (idx !== -1) {
                    const kayit = silinecekMesajKuyrugu[idx];
                    silinecekMesajKuyrugu.splice(idx, 1);
                    // Twitch tag'lerinden id alanı: id=<uuid> formatında
                    const idEslesmesi = data.match(/id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i) 
                                     || data.match(/id=([0-9a-z-]+)/i);
                    if (idEslesmesi && idEslesmesi[1]) {
                        const msgId = idEslesmesi[1];
                        kayit.silindi = true;
                        terminalYaz(`Cooldown mesajı 5 saniye sonra silinecek (ID: ${msgId})`, "system-info");
                        setTimeout(function () {
                            mesajSil(msgId);
                            if (kayit.chatDiv && kayit.chatDiv.parentNode) kayit.chatDiv.remove();
                        }, 5000);
                    } else {
                        terminalYaz(`Cooldown mesajı için ID bulunamadı, otomatik silme atlanıyor.`, "system-info");
                    }
                    return; // echo zaten yerel panelde gösterildi, tekrar gösterme
                }
                // Botun kendi mesajı ama kuyrukta yoksa (normal komut cevapları vs.) — ekrana yaz ve geç
                chatYaz(kullanici, mesaj, true);
                return;
            }

            chatYaz(kullanici, mesaj, false);
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
                const simdi = Date.now();

                // 1. Global Cooldown Kontrolü
                if (simdi - sonKullanimGlobal < GLOBAL_COOLDOWN_SURESI * 1000) {
                    const kalanGlobal = Math.ceil((GLOBAL_COOLDOWN_SURESI * 1000 - (simdi - sonKullanimGlobal)) / 1000);
                    terminalYaz(`Komut engellendi (Global Cooldown): !kazan -> Gönderen: ${kullanici} (Kalan: ${kalanGlobal}sn)`, "system-info");
                    geciciMesajGonder(`@${kullanici} ⏳ Global cooldown'a takıldınız! ${kalanGlobal} saniye sonra tekrar deneyin.`);
                    return; // Komutu iptal et, cooldown mesajı 5 sn sonra otomatik silinir
                }

                // 2. Kullanıcı Cooldown Kontrolü
                if (sonKullanimKullanici[kullanici]) {
                    const gecenSure = (simdi - sonKullanimKullanici[kullanici]) / 1000;
                    if (gecenSure < KULLANICI_COOLDOWN_SURESI) {
                        const kalanSure = Math.ceil(KULLANICI_COOLDOWN_SURESI - gecenSure);
                        terminalYaz(`Komut engellendi (Kullanıcı Cooldown): !kazan -> Gönderen: ${kullanici} (Kalan: ${kalanSure}sn)`, "system-info");
                        geciciMesajGonder(`@${kullanici} ⏳ Kişisel cooldown'a takıldınız! ${kalanSure} saniye sonra tekrar deneyin.`);
                        return; // Komutu iptal et, cooldown mesajı 5 sn sonra otomatik silinir
                    }
                }

                // Cooldown sürelerini güncelle
                sonKullanimGlobal = simdi;
                sonKullanimKullanici[kullanici] = simdi;

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

    // Ayarlar kaydolduğunda cooldown hafızasını sıfırlayalım
    sonKullanimKullanici = {};
    sonKullanimGlobal = 0;

    if (ws) {
        ws.onclose = function () {}; 
        ws.close(); 
    }
    
    baglan();
}

// Başlangıç tetiklemeleri
tabloyuDoldur();
baglan();
