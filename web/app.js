// Web uygulaması için genel JavaScript

// Bot durumunu güncelle
async function updateBotStatus() {
    try {
        const response = await fetch('/api/status');
        if (!response.ok) throw new Error('API error');
        
        const data = await response.json();
        
        // Ana sayfadaki kanal bilgisini güncelle
        const channelElement = document.getElementById('currentChannel');
        if (channelElement) {
            channelElement.textContent = `Kanal: ${data.channel}`;
        }
        
        // Mesaj sayacı (simülasyon)
        const msgCountElement = document.getElementById('messageCount');
        if (msgCountElement) {
            let current = parseInt(msgCountElement.textContent) || 0;
            msgCountElement.textContent = current + Math.floor(Math.random() * 3);
        }
        
        // Kullanıcı sayacı (simülasyon)
        const userCountElement = document.getElementById('userCount');
        if (userCountElement) {
            let current = parseInt(userCountElement.textContent) || 0;
            if (Math.random() > 0.8) { // %20 şans
                userCountElement.textContent = current + 1;
            }
        }
        
    } catch (error) {
        console.log('Bot durumu güncellenemedi:', error);
    }
}

// Twitch login butonunu ayarla
function setupTwitchLogin() {
    const twitchBtn = document.querySelector('.twitch-login');
    if (twitchBtn) {
        twitchBtn.addEventListener('click', function() {
            // Client ID'yi API'den al
            fetch('/api/auth/client-id')
                .then(res => res.json())
                .then(data => {
                    if (data.clientId) {
                        const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
                        const scope = encodeURIComponent('chat:read chat:edit user:read:email');
                        const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${data.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
                        window.location.href = twitchAuthUrl;
                    }
                });
        });
    }
}

// Admin girişi
async function adminLogin(password) {
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    // Bot durumunu her 10 saniyede bir güncelle
    setInterval(updateBotStatus, 10000);
    updateBotStatus();
    
    // Twitch login butonunu ayarla
    setupTwitchLogin();
    
    // Admin login formu
    const adminForm = document.getElementById('adminForm');
    const adminBtn = document.querySelector('.admin-login');
    
    if (adminBtn && adminForm) {
        adminBtn.addEventListener('click', function() {
            adminForm.style.display = 'block';
        });
    }
    
    // Enter tuşu ile admin login
    const adminPasswordInput = document.getElementById('adminPassword');
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const password = this.value;
                adminLogin(password).then(result => {
                    if (result.success) {
                        window.location.href = result.redirect;
                    } else {
                        alert('Yanlış şifre!');
                    }
                });
            }
        });
    }
});

// Global fonksiyonlar
window.FluexcodeApp = {
    updateBotStatus,
    adminLogin,
    setupTwitchLogin
};