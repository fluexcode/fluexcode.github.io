const BOT_ADI   = 'fluexcode';  
const OAUTH_KEY = 'oauth:3ivyx75i7rf2uxzfk8p8sydksnle7s'; 

let KANAL_ADI = 'davidkaan06';
let DC_LINK = 'https://discord.gg/h2As7yGG8b';
let YT_LINK = 'https://www.youtube.com/@davidkaan2246';
let SV_LINK = 'https://lirin.to/register?ref=david';

// COOLDOWN AYARLARI (Saniye Cinsinden)
const KULLANICI_COOLDOWN_SURESI = 30;
const GLOBAL_COOLDOWN_SURESI = 1;

// Cooldown takip objeleri
let sonKullanimKullanici = {};
let sonKullanimGlobal = 0;

// 5 saniye sonra otomatik silinecek cooldown/bilgi mesajları için kuyruk.
let silinecekMesajKuyrugu = [];

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

// ========== SEKMELER (TABS) ==========
function sekmeGoster(sekmeAdi) {
    document.querySelectorAll('.sekme-icerik').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const hedefSekme = document.getElementById('sekme-' + sekmeAdi);
    if (hedefSekme) {
        hedefSekme.classList.add('active');
    }
    
    const hedefBtn = document.querySelector('.tab-btn[data-sekme="' + sekmeAdi + '"]');
    if (hedefBtn) {
        hedefBtn.classList.add('active');
    }
}

// ========== ÇEKİLİŞ SİSTEMİ ==========
let cekilisAktif = false;
let cekilisKatilimcilar = [];
let cekilisKazananlar = [];
let cekilisKomut = '!çekiliş';
let cekilisUstUste = 'hayir';
let cekilisTekrarKazanma = 'hayir';
let cekilisBildirim = 'evet';

// Çekiliş UI elementleri
const cekilisDurumDiv = document.getElementById('cekilisDurum');
const cekilisBaslatBtn = document.getElementById('cekilisBaslatBtn');
const cekilisBitirBtn = document.getElementById('cekilisBitirBtn');
const katilimciSayisiSpan = document.getElementById('katilimciSayisi');
const katilimciSayisiSpan2 = document.getElementById('katilimciSayisi2');
const toplamCekilisSpan = document.getElementById('toplamCekilis');
const sonKazananSpan = document.getElementById('sonKazanan');
const kazananlarListesiDiv = document.getElementById('kazananlarListesi');
const katilimciListesiDiv = document.getElementById('katilimciListesi');
const cekilisBanner = document.getElementById('cekilisBanner');
const cekilisBannerText = document.getElementById('cekilisBannerText');
const cekilisKomutGosterSpan = document.getElementById('cekilisKomutGoster');

// Çekiliş ayarlarını güncelle
function cekilisAyarlariniGuncelle() {
    const cmdInp = document.getElementById('cekilisKomutInput');
    const uuSel = document.getElementById('cekilisUstUste');
    const tkSel = document.getElementById('cekilisTekrarKazanma');
    const bldSel = document.getElementById('cekilisBildirim');

    if (cmdInp) cekilisKomut = (cmdInp.value.trim() || '!çekiliş').toLowerCase();
    if (uuSel) cekilisUstUste = uuSel.value;
    if (tkSel) cekilisTekrarKazanma = tkSel.value;
    if (bldSel) cekilisBildirim = bldSel.value;
}

// Tüm sayfa çekiliş banner'ını güncelle
function cekilisBannerGuncelle() {
    if (cekilisAktif) {
        if (cekilisBanner) cekilisBanner.style.display = 'block';
        if (cekilisBannerText) cekilisBannerText.textContent = `🎯 ÇEKİLİŞ AKTİF! Katılmak için ${cekilisKomut} yazın! (${cekilisKatilimcilar.length} katılımcı)`;
        document.body.classList.add('cekilis-banner-active');
    } else {
        if (cekilisBanner) cekilisBanner.style.display = 'none';
        document.body.classList.remove('cekilis-banner-active');
    }
}

// Çekiliş durum panellerini güncelle
function cekilisUIguncelle() {
    if (cekilisAktif) {
        if (cekilisDurumDiv) {
            cekilisDurumDiv.className = 'cekilis-durum aktif';
            cekilisDurumDiv.innerHTML = `<span>🎯 ÇEKİLİŞ AKTİF! Katılmak için <strong>${cekilisKomut}</strong> yazın!</span>`;
        }
        if (cekilisBaslatBtn) cekilisBaslatBtn.style.display = 'none';
        if (cekilisBitirBtn) cekilisBitirBtn.style.display = 'inline-block';
    } else {
        if (cekilisDurumDiv) {
            cekilisDurumDiv.className = 'cekilis-durum';
            cekilisDurumDiv.innerHTML = '<span>⏸️ Çekiliş aktif değil</span>';
        }
        if (cekilisBaslatBtn) cekilisBaslatBtn.style.display = 'inline-block';
        if (cekilisBitirBtn) cekilisBitirBtn.style.display = 'none';
    }
    
    if (katilimciSayisiSpan) katilimciSayisiSpan.textContent = cekilisKatilimcilar.length;
    if (katilimciSayisiSpan2) katilimciSayisiSpan2.textContent = cekilisKatilimcilar.length;
    if (toplamCekilisSpan) toplamCekilisSpan.textContent = cekilisKazananlar.length;
    
    if (cekilisKazananlar.length > 0 && sonKazananSpan) {
        sonKazananSpan.textContent = cekilisKazananlar[cekilisKazananlar.length - 1];
    }
    
    if (cekilisKomutGosterSpan) cekilisKomutGosterSpan.textContent = cekilisKomut;
    
    kazananlarListesiniGuncelle();
    katilimciListesiniGuncelle();
    cekilisBannerGuncelle();
}

// Katılımcı listesini UI'da göster
function katilimciListesiniGuncelle() {
    if (!katilimciListesiDiv) return;
    katilimciListesiDiv.innerHTML = '';
    
    if (cekilisKatilimcilar.length === 0) {
        katilimciListesiDiv.innerHTML = '<div class="kazanan-yok" style="padding:10px;">Katılımcı yok</div>';
        return;
    }
    
    const gorulen = new Set();
    const benzersiz = cekilisKatilimcilar.filter(k => {
        const varMi = gorulen.has(k.kullanici);
        gorulen.add(k.kullanici);
        return !varMi;
    });
    
    const tersListe = [...benzersiz].reverse();
    tersListe.forEach((k) => {
        const item = document.createElement('div');
        item.className = 'katilimci-item';
        
        const avatar = document.createElement('img');
        avatar.className = 'katilimci-avatar';
        avatar.src = `https://static-cdn.jtvnw.net/jtv_user_pictures/${k.kullanici}-profile_image-70x70.png`;
        avatar.onerror = function() { this.src = 'https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-profile_image-70x70.png'; };
        
        const isimSpan = document.createElement('span');
        isimSpan.className = 'katilimci-isim';
        isimSpan.textContent = k.kullanici;
        
        item.appendChild(avatar);
        item.appendChild(isimSpan);
        katilimciListesiDiv.appendChild(item);
    });
}

// Kazananlar listesini UI'da göster
function kazananlarListesiniGuncelle() {
    if (!kazananlarListesiDiv) return;
    kazananlarListesiDiv.innerHTML = '';
    
    if (cekilisKazananlar.length === 0) {
        kazananlarListesiDiv.innerHTML = '<div class="kazanan-yok">Henüz kazanan yok</div>';
        return;
    }
    
    const tersListe = [...cekilisKazananlar].reverse();
    tersListe.forEach((kazanan, index) => {
        const item = document.createElement('div');
        item.className = 'kazanan-item';
        
        const isimSpan = document.createElement('span');
        isimSpan.className = 'kazanan-isim';
        isimSpan.textContent = kazanan;
        
        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'kazanan-badge';
        badgeSpan.textContent = `#${cekilisKazananlar.length - index}`;
        
        item.appendChild(isimSpan);
        item.appendChild(badgeSpan);
        kazananlarListesiDiv.appendChild(item);
    });
}

// Çekiliş BAŞLAT
function cekilisBaslat() {
    if (cekilisAktif) {
        terminalYaz('Çekiliş zaten aktif!', 'system-error');
        return;
    }
    
    cekilisAyarlariniGuncelle();
    cekilisKatilimcilar = [];
    cekilisAktif = true;
    
    terminalYaz(`🎯 Çekiliş başlatıldı! Komut: ${cekilisKomut}`, 'system-success');
    
    if (cekilisBildirim === 'evet' && ws && ws.readyState === WebSocket.OPEN) {
        const duyuru = `🎯 ÇEKİLİŞ BAŞLADI! Katılmak için ${cekilisKomut} yazın! Kazanan belli olana kadar katılabilirsiniz!`;
        ws.send(`PRIVMSG #${KANAL_ADI} :${duyuru}`);
        chatYaz(BOT_ADI, duyuru, true);
    }
    
    cekilisUIguncelle();
}

// Çekiliş BİTİR ve kazananı seç
function cekilisBitir() {
    if (!cekilisAktif) {
        terminalYaz('Aktif bir çekiliş yok!', 'system-error');
        return;
    }
    
    cekilisAktif = false;
    
    let uygunKatilimcilar = [...cekilisKatilimcilar];
    
    if (cekilisUstUste === 'hayir') {
        const gorulen = new Set();
        uygunKatilimcilar = uygunKatilimcilar.filter(k => {
            const varMi = gorulen.has(k.kullanici);
            gorulen.add(k.kullanici);
            return !varMi;
        });
    }
    
    if (cekilisTekrarKazanma === 'hayir' && cekilisKazananlar.length > 0) {
        uygunKatilimcilar = uygunKatilimcilar.filter(k => !cekilisKazananlar.includes(k.kullanici));
    }
    
    if (uygunKatilimcilar.length === 0) {
        terminalYaz('Çekiliş bitti! Ama katılımcı yok veya uygun katılımcı kalmadı!', 'system-error');
        
        if (cekilisBildirim === 'evet' && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(`PRIVMSG #${KANAL_ADI} :😞 Çekiliş bitti ama katılımcı olmadığı için kazanan seçilemedi!`);
            chatYaz(BOT_ADI, '😞 Çekiliş bitti ama katılımcı olmadığı için kazanan seçilemedi!', true);
        }
        
        cekilisUIguncelle();
        return;
    }
    
    const kazananIndex = Math.floor(Math.random() * uygunKatilimcilar.length);
    const kazanan = uygunKatilimcilar[kazananIndex].kullanici;
    
    cekilisKazananlar.push(kazanan);
    
    terminalYaz(`🏆 Çekiliş kazananı: ${kazanan}!`, 'system-success');
    
    if (cekilisBildirim === 'evet' && ws && ws.readyState === WebSocket.OPEN) {
        const kazananMesaj = `🎉🎉 ÇEKİLİŞ KAZANANI: @${kazanan}! Tebrikler! 🎉🎉`;
        ws.send(`PRIVMSG #${KANAL_ADI} :${kazananMesaj}`);
        chatYaz(BOT_ADI, kazananMesaj, true);
    }
    
    cekilisUIguncelle();
}

// Kazananlar geçmişini temizle
function kazananlariTemizle() {
    if (cekilisKazananlar.length === 0) return;
    
    if (confirm('Tüm kazanan geçmişini temizlemek istediğinize emin misiniz?')) {
        cekilisKazananlar = [];
        terminalYaz('Kazananlar geçmişi temizlendi.', 'system-info');
        cekilisUIguncelle();
    }
}

// Panel arayüzüne yeni satır ekleyen fonksiyon
function aralikEkle(min = 0, max = 100, ihtimal = 10, etiket = 'Grup') {
    const container = document.getElementById('probRowsContainer');
    if(!container) return;
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
    const container = document.getElementById('probRowsContainer');
    if(!container) return;
    container.innerHTML = '';
    SANS_HAVUZU.forEach(item => {
        aralikEkle(item.min, item.max, item.ihtimal, item.etiket);
    });
}

const MAKS_MESAJ = 200;

function terminalYaz(mesaj, stil = 'term-line') {
    if(!terminalLog) return;
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
    if(!chatLog) return;
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

function geciciMesajGonder(mesajMetni) {
    const eskiSinir = Date.now() - 30000;
    silinecekMesajKuyrugu = silinecekMesajKuyrugu.filter(k => k.zaman > eskiSinir);

    ws.send(`PRIVMSG #${KANAL_ADI} :${mesajMetni}`);
    const chatDiv = chatYaz(BOT_ADI, mesajMetni, true);
    silinecekMesajKuyrugu.push({ metin: mesajMetni, chatDiv, silindi: false, zaman: Date.now() });
}

function mesajSil(msgId) {
    ws.send(`PRIVMSG #${KANAL_ADI} :/delete ${msgId}`);
    terminalYaz(`Cooldown mesajı Twitch'ten silindi (ID: ${msgId})`, "system-info");
}

function baglan() {
    botKilitli = false; 
    clearTimeout(reconnectTimeout); 
    
    terminalYaz(`#${KANAL_ADI} kanalı için yeni bağlantı kuruluyor...`, "system-info");
    if(currentChannelDisplay) currentChannelDisplay.innerText = KANAL_ADI;

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

            if (isSelf) {
                const idx = silinecekMesajKuyrugu.findIndex(k => k.metin === mesaj && !k.silindi);
                if (idx !== -1) {
                    const kayit = silinecekMesajKuyrugu[idx];
                    silinecekMesajKuyrugu.splice(idx, 1);
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
                    return;
                }
                chatYaz(kullanici, mesaj, true);
                return;
            }

            chatYaz(kullanici, mesaj, false);
            if (botKilitli) return; 

            const msgLower = mesaj.toLowerCase();

            // ========== ÇEKİLİŞ KOMUTLARI ==========
            if (msgLower === '!katılan' || msgLower === '!katilan' || msgLower === '!katil') {
                if (cekilisKatilimcilar.length === 0) {
                    const cevap = `@${kullanici} Henüz çekilişe katılan olmadı veya çekiliş aktif değil.`;
                    ws.send(`PRIVMSG #${KANAL_ADI} :${cevap}`);
                    chatYaz(BOT_ADI, cevap, true);
                } else {
                    const gorulen = new Set();
                    const benzersiz = cekilisKatilimcilar.filter(k => {
                        const varMi = gorulen.has(k.kullanici);
                        gorulen.add(k.kullanici);
                        return !varMi;
                    });
                    
                    const katilanListe = benzersiz.map(k => k.kullanici).join(', ');
                    const cevap = `@${kullanici} Çekilişe katılanlar (${benzersiz.length} kişi): ${katilanListe}`;
                    ws.send(`PRIVMSG #${KANAL_ADI} :${cevap}`);
                    chatYaz(BOT_ADI, cevap, true);
                    terminalYaz(`!katilan sorgusu: ${kullanici} katılımcı listesini istedi.`, "command-trigger");
                }
                return;
            }
            
            else if (msgLower === cekilisKomut.toLowerCase()) {
                if (!cekilisAktif) {
                    terminalYaz(`Çekiliş aktif değil! ${kullanici} katılmaya çalıştı.`, "system-info");
                    return;
                }
                
                cekilisKatilimcilar.push({ kullanici: kullanici, zaman: Date.now() });
                terminalYaz(`🎯 ${kullanici} çekilişe katıldı! (Toplam: ${cekilisKatilimcilar.length})`, "command-trigger");
                
                if (cekilisBildirim === 'evet') {
                    const cevap = `@${kullanici} ✅ Çekilişe katıldın! Başarılar! 🍀`;
                    ws.send(`PRIVMSG #${KANAL_ADI} :${cevap}`);
                    chatYaz(BOT_ADI, cevap, true);
                }
                return;
            }

            // Normal komutlar
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
            else if (msgLower === '!kazan') {
                const simdi = Date.now();

                if (simdi - sonKullanimGlobal < GLOBAL_COOLDOWN_SURESI * 1000) {
                    const kalanGlobal = Math.ceil((GLOBAL_COOLDOWN_SURESI * 1000 - (simdi - sonKullanimGlobal)) / 1000);
                    terminalYaz(`Komut engellendi (Global Cooldown): !kazan -> Gönderen: ${kullanici} (Kalan: ${kalanGlobal}sn)`, "system-info");
                    geciciMesajGonder(`@${kullanici} ⏳ Global cooldown'a takıldınız! ${kalanGlobal} saniye sonra tekrar deneyin.`);
                    return;
                }

                if (sonKullanimKullanici[kullanici]) {
                    const gecenSure = (simdi - sonKullanimKullanici[kullanici]) / 1000;
                    if (gecenSure < KULLANICI_COOLDOWN_SURESI) {
                        const kalanSure = Math.ceil(KULLANICI_COOLDOWN_SURESI - gecenSure);
                        terminalYaz(`Komut engellendi (Kullanıcı Cooldown): !kazan -> Gönderen: ${kullanici} (Kalan: ${kalanSure}sn)`, "system-info");
                        geciciMesajGonder(`@${kullanici} ⏳ Kişisel cooldown'a takıldınız! ${kalanSure} saniye sonra tekrar deneyin.`);
                        return;
                    }
                }

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
                
                const cevap = `@${kullanici} Sayı : [${secilenAralik.etiket}] %${sonucSayi}`;
                
                ws.send(`PRIVMSG #${KANAL_ADI} :${cevap}`);
                chatYaz(BOT_ADI, cevap, true);
            }
            else if (msgLower === '!yardım' || msgLower === '!yardim' || msgLower === '!komutlar') {
                const cevap = `@${kullanici} Kullanabileceğiniz komutlar: !dc, !yt, !sv, !kazan, ${cekilisKomut}, !katılan`;
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
    
    const targetInp = document.getElementById('targetChannelInput');
    const dcInp = document.getElementById('dcLinkInput');
    const ytInp = document.getElementById('ytLinkInput');
    const svInp = document.getElementById('svLinkInput');

    if(targetInp) KANAL_ADI = targetInp.value.trim().toLowerCase();
    if(dcInp) DC_LINK = dcInp.value.trim();
    if(ytInp) YT_LINK = ytInp.value.trim();
    if(svInp) SV_LINK = svInp.value.trim();
    
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

    cekilisAyarlariniGuncelle();

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
cekilisUIguncelle();
sekmeGoster('anasayfa');
baglan();