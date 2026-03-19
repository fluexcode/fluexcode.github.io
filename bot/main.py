import requests
import websocket
import json
import threading
import time
import os
from datetime import datetime
from dotenv import load_dotenv
import base64

load_dotenv()

class KickBot:
    def __init__(self):
        # Client Credentials
        self.client_id = os.getenv('KICK_CLIENT_ID')
        self.client_secret = os.getenv('KICK_CLIENT_SECRET')
        self.username = os.getenv('KICK_USERNAME')  # Email
        self.password = os.getenv('KICK_PASSWORD')
        self.channel = os.getenv('KICK_CHANNEL')
        
        self.access_token = None
        self.refresh_token = None
        self.user_id = None
        self.channel_id = None
        self.ws = None
        self.running = True
        
        print(f"🤖 Bot başlatılıyor... Kanal: {self.channel}")
    
    def get_oauth_token(self):
        """OAuth2 token al"""
        token_url = "https://kick.com/api/oauth/token"
        
        # Basic Auth için client_id:client_secret base64 encode
        auth_string = f"{self.client_id}:{self.client_secret}"
        auth_bytes = auth_string.encode('ascii')
        base64_auth = base64.b64encode(auth_bytes).decode('ascii')
        
        headers = {
            "Authorization": f"Basic {base64_auth}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        # Password grant type ile token al
        data = {
            "grant_type": "password",
            "username": self.username,
            "password": self.password,
            "scope": "user:read chat:write chat:read"
        }
        
        try:
            print("🔑 Token alınıyor...")
            response = requests.post(token_url, headers=headers, data=data)
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data.get('access_token')
                self.refresh_token = token_data.get('refresh_token')
                
                print("✅ Token alındı!")
                print(f"📝 Access Token: {self.access_token[:20]}...")
                return True
            else:
                print(f"❌ Token hatası: {response.status_code}")
                print(f"Hata: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Token alma hatası: {e}")
            return False
    
    def refresh_access_token(self):
        """Token yenile"""
        if not self.refresh_token:
            return False
            
        token_url = "https://kick.com/api/oauth/token"
        
        auth_string = f"{self.client_id}:{self.client_secret}"
        auth_bytes = auth_string.encode('ascii')
        base64_auth = base64.b64encode(auth_bytes).decode('ascii')
        
        headers = {
            "Authorization": f"Basic {base64_auth}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token
        }
        
        try:
            response = requests.post(token_url, headers=headers, data=data)
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data.get('access_token')
                self.refresh_token = token_data.get('refresh_token')
                print("🔄 Token yenilendi")
                return True
        except:
            return False
    
    def get_user_info(self):
        """Kullanıcı bilgilerini al"""
        url = "https://kick.com/api/v2/user"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "User-Agent": "Mozilla/5.0"
        }
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                user_data = response.json()
                self.user_id = user_data.get('id')
                print(f"👤 Kullanıcı: {user_data.get('username')}")
                print(f"🆔 User ID: {self.user_id}")
                return True
            elif response.status_code == 401:
                # Token expired, refresh et
                if self.refresh_access_token():
                    return self.get_user_info()
            return False
        except Exception as e:
            print(f"❌ Kullanıcı bilgisi hatası: {e}")
            return False
    
    def get_channel_info(self):
        """Kanal bilgilerini al"""
        url = f"https://kick.com/api/v2/channels/{self.channel}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "User-Agent": "Mozilla/5.0"
        }
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                channel_data = response.json()
                self.channel_id = channel_data.get('id')
                print(f"📺 Kanal ID: {self.channel_id}")
                print(f"👥 Takipçi: {channel_data.get('followers_count')}")
                return True
        except Exception as e:
            print(f"❌ Kanal bilgisi hatası: {e}")
            return False
    
    def connect_chat(self):
        """Chat'e bağlan"""
        if not self.channel_id:
            self.get_channel_info()
        
        # Pusher authentication
        pusher_auth = {
            "auth": {
                "headers": {
                    "Authorization": f"Bearer {self.access_token}"
                }
            }
        }
        
        ws_url = "wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.4.0"
        
        self.ws = websocket.WebSocketApp(
            ws_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close
        )
        
        wst = threading.Thread(target=self.ws.run_forever)
        wst.daemon = True
        wst.start()
        
        time.sleep(2)
        
        # Subscribe to channel
        subscribe_msg = {
            "event": "pusher:subscribe",
            "data": {
                "channel": f"chatrooms.{self.channel_id}.v2",
                "auth": self.get_pusher_auth(f"chatrooms.{self.channel_id}.v2")
            }
        }
        
        self.ws.send(json.dumps(subscribe_msg))
        print(f"✅ {self.channel} kanalına bağlandı!")
    
    def get_pusher_auth(self, channel_name):
        """Pusher authentication"""
        import hashlib
        import hmac
        
        # Pusher auth string oluştur
        auth_string = f"{self.user_id}:{channel_name}"
        
        # HMAC SHA256 ile imzala
        secret = "your-pusher-secret"  # Pusher secret'ı
        signature = hmac.new(
            secret.encode(),
            auth_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"{self.user_id}:{signature}"
    
    def on_open(self, ws):
        print("🔌 WebSocket bağlantısı açıldı")
    
    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            
            if data.get('event') == 'App\\Events\\ChatMessageEvent':
                msg_data = json.loads(data['data'])
                user = msg_data['sender']['username']
                content = msg_data['content']
                
                print(f"💬 [{user}]: {content}")
                
                # Komutları kontrol et
                if content.startswith('!'):
                    self.process_command(user, content[1:])
                    
        except Exception as e:
            pass
    
    def process_command(self, user, command):
        """Komutları işle"""
        cmd = command.lower().split()[0]
        
        if cmd == 'merhaba':
            self.send_message(f"Merhaba @{user}! 👋")
        elif cmd == 'saat':
            now = datetime.now().strftime("%H:%M:%S")
            self.send_message(f"@{user} 🕐 {now}")
        elif cmd == 'token':
            # Test amaçlı - gerçek kullanımda gösterme!
            self.send_message(f"@{user} Token: {self.access_token[:20]}...")
    
    def send_message(self, message):
        """Mesaj gönder - API v2 ile"""
        url = f"https://kick.com/api/v2/messages/send/{self.channel}"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
        
        data = {
            "content": message,
            "type": "message"
        }
        
        try:
            response = requests.post(url, headers=headers, json=data)
            if response.status_code == 200:
                print(f"📤 Mesaj gönderildi: {message}")
            elif response.status_code == 401:
                # Token expired
                if self.refresh_access_token():
                    self.send_message(message)
            else:
                print(f"❌ Mesaj gönderilemedi: {response.status_code}")
        except Exception as e:
            print(f"❌ Mesaj hatası: {e}")
    
    def send_websocket_message(self, message):
        """WebSocket ile mesaj gönder"""
        if self.ws:
            msg = {
                "event": "App\\Events\\ChatMessageEvent",
                "data": json.dumps({
                    "content": message,
                    "sender": {
                        "username": self.username.split('@')[0]  # Email'in @'den önceki kısmı
                    }
                })
            }
            self.ws.send(json.dumps(msg))
    
    def on_error(self, ws, error):
        print(f"❌ WebSocket hatası: {error}")
    
    def on_close(self, ws, close_status_code, close_msg):
        print("🔌 WebSocket kapandı")
        self.running = False
    
    def run(self):
        """Botu başlat"""
        if self.get_oauth_token():
            if self.get_user_info():
                if self.get_channel_info():
                    self.connect_chat()
                    
                    # Ana döngü - token kontrolü
                    last_refresh = time.time()
                    
                    while self.running:
                        time.sleep(60)
                        
                        # Token'ı 30 dakikada bir yenile
                        if time.time() - last_refresh > 1800:  # 30 dakika
                            self.refresh_access_token()
                            last_refresh = time.time()
                        
                        print(f"💓 Bot çalışıyor - {datetime.now().strftime('%H:%M:%S')}")
        else:
            print("❌ Bot başlatılamadı!")

if __name__ == "__main__":
    bot = KickBot()
    
    try:
        bot.run()
    except KeyboardInterrupt:
        print("\n🛑 Bot durduruldu")
        bot.running = False
