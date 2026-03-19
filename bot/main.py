import requests
import websocket
import json
import threading
import time
import os
import logging
from datetime import datetime
from dotenv import load_dotenv
import random
import signal
import sys

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'bot/logs/bot_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# .env dosyasını yükle
load_dotenv()

class KickBot:
    def __init__(self):
        self.username = os.getenv('KICK_USERNAME')
        self.password = os.getenv('KICK_PASSWORD')
        self.channel = os.getenv('KICK_CHANNEL')
        self.prefix = os.getenv('BOT_PREFIX', '!')
        
        self.token = None
        self.user_id = None
        self.channel_id = None
        self.ws = None
        self.is_running = False
        self.message_count = 0
        self.start_time = datetime.now()
        
        # Komutlar
        self.commands = {}
        self.load_commands()
        
        logger.info(f"🤖 Bot başlatılıyor... Kanal: {self.channel}")
        
    def load_commands(self):
        """Varsayılan komutları yükle"""
        self.commands = {
            'merhaba': self.cmd_merhaba,
            'yardim': self.cmd_yardim,
            'saat': self.cmd_saat,
            'tarih': self.cmd_tarih,
            'istatistik': self.cmd_istatistik,
            'sosyal': self.cmd_sosyal
        }
        logger.info(f"📚 {len(self.commands)} komut yüklendi")
        
    def login(self):
        """Kick.com'a giriş yap"""
        login_url = "https://kick.com/api/v1/login"
        
        data = {
            "email": self.username,
            "password": self.password
        }
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Content-Type": "application/json"
        }
        
        try:
            logger.info("🔐 Giriş yapılıyor...")
            response = requests.post(login_url, json=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                self.token = result.get('token')
                logger.info("✅ Giriş başarılı!")
                
                # Kullanıcı bilgilerini al
                self.get_user_info()
                return True
            else:
                logger.error(f"❌ Giriş başarısız: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Giriş hatası: {e}")
            return False
    
    def get_user_info(self):
        """Kullanıcı bilgilerini al"""
        url = "https://kick.com/api/v2/user"
        headers = {
            **self.headers,
            "Authorization": f"Bearer {self.token}"
        }
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                user_data = response.json()
                self.user_id = user_data.get('id')
                logger.info(f"👤 Kullanıcı: {user_data.get('username')}")
        except Exception as e:
            logger.error(f"Kullanıcı bilgisi alınamadı: {e}")
    
    def get_channel_info(self):
        """Kanal bilgilerini al"""
        url = f"https://kick.com/api/v2/channels/{self.channel}"
        
        try:
            response = requests.get(url)
            if response.status_code == 200:
                channel_data = response.json()
                self.channel_id = channel_data.get('id')
                logger.info(f"📺 Kanal ID: {self.channel_id}")
                return True
        except Exception as e:
            logger.error(f"Kanal bilgisi alınamadı: {e}")
            return False
    
    def connect_chat(self):
        """Chat'e bağlan"""
        if not self.channel_id:
            if not self.get_channel_info():
                return
        
        ws_url = "wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.4.0"
        
        self.ws = websocket.WebSocketApp(
            ws_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close
        )
        
        self.is_running = True
        
        # WebSocket'i ayrı thread'de başlat
        wst = threading.Thread(target=self.ws.run_forever)
        wst.daemon = True
        wst.start()
        
        # Kanal subscribe
        time.sleep(2)
        subscribe_msg = {
            "event": "pusher:subscribe",
            "data": {
                "channel": f"chatrooms.{self.channel_id}.v2"
            }
        }
        self.ws.send(json.dumps(subscribe_msg))
        
        logger.info(f"✅ {self.channel} kanalına bağlandı!")
        
    def on_open(self, ws):
        """WebSocket açıldığında"""
        logger.info("🔌 WebSocket bağlantısı açıldı")
        
    def on_message(self, ws, message):
        """Mesaj geldiğinde"""
        try:
            data = json.loads(message)
            
            if data.get('event') == 'App\\Events\\ChatMessageEvent':
                message_data = json.loads(data['data'])
                user = message_data['sender']['username']
                content = message_data['content']
                user_id = message_data['sender']['id']
                
                self.message_count += 1
                logger.info(f"💬 [{user}]: {content}")
                
                # Komut kontrolü
                if content.startswith(self.prefix):
                    self.process_command(user, content[1:], user_id)
                    
        except Exception as e:
            logger.error(f"Mesaj işleme hatası: {e}")
    
    def process_command(self, user, command_text, user_id):
        """Komutları işle"""
        parts = command_text.split()
        cmd = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []
        
        if cmd in self.commands:
            logger.info(f"⚡ Komut çalıştırılıyor: !{cmd} - Kullanıcı: {user}")
            self.commands[cmd](user, args)
    
    def send_message(self, message):
        """Mesaj gönder"""
        if not self.ws or not self.is_running:
            return
        
        msg_data = {
            "event": "App\\Events\\ChatMessageEvent",
            "data": json.dumps({
                "content": message,
                "sender": {
                    "username": self.username
                }
            })
        }
        
        try:
            self.ws.send(json.dumps(msg_data))
            logger.info(f"📤 Mesaj gönderildi: {message}")
        except Exception as e:
            logger.error(f"Mesaj gönderme hatası: {e}")
    
    # Komut fonksiyonları
    def cmd_merhaba(self, user, args):
        self.send_message(f"Merhaba @{user}! 👋 Sohbete hoş geldin!")
    
    def cmd_yardim(self, user, args):
        commands = [f"!{cmd}" for cmd in self.commands.keys()]
        self.send_message(f"@{user} Kullanılabilir komutlar: {', '.join(commands)}")
    
    def cmd_saat(self, user, args):
        now = datetime.now().strftime("%H:%M:%S")
        self.send_message(f"@{user} 🕐 Saat: {now}")
    
    def cmd_tarih(self, user, args):
        now = datetime.now().strftime("%d/%m/%Y")
        self.send_message(f"@{user} 📅 Tarih: {now}")
    
    def cmd_istatistik(self, user, args):
        uptime = datetime.now() - self.start_time
        hours = uptime.seconds // 3600
        minutes = (uptime.seconds % 3600) // 60
        
        self.send_message(
            f"@{user} 📊 Bot istatistikleri: "
            f"Mesajlar: {self.message_count}, "
            f"Çalışma: {hours}s {minutes}d"
        )
    
    def cmd_sosyal(self, user, args):
        self.send_message(f"@{user} 📱 Sosyal medya: twitter.com/example, instagram.com/example")
    
    def on_error(self, ws, error):
        logger.error(f"WebSocket hatası: {error}")
    
    def on_close(self, ws, close_status_code, close_msg):
        logger.warning("WebSocket bağlantısı kapandı")
        self.is_running = False
    
    def run(self):
        """Botu başlat"""
        logger.info("🚀 Bot başlatılıyor...")
        
        if not self.login():
            logger.error("Giriş yapılamadı, bot durduruluyor")
            return
        
        self.connect_chat()
        
        # Ana döngü
        try:
            while self.is_running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("🛑 Bot durduruluyor...")
            self.is_running = False
            if self.ws:
                self.ws.close()

if __name__ == "__main__":
    bot = KickBot()
    bot.run()
