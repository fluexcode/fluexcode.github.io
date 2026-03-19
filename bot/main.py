import requests
import websocket
import json
import threading
import time
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class KickBot:
    def __init__(self):
        self.username = os.getenv('KICK_USERNAME')
        self.password = os.getenv('KICK_PASSWORD')
        self.channel = os.getenv('KICK_CHANNEL')
        self.token = None
        self.channel_id = None
        self.ws = None
        self.running = True
        
    def login(self):
        url = "https://kick.com/api/v1/login"
        data = {"email": self.username, "password": self.password}
        headers = {"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"}
        
        try:
            r = requests.post(url, json=data, headers=headers)
            if r.status_code == 200:
                self.token = r.json().get('token')
                print("✅ Giriş başarılı")
                return True
        except:
            print("❌ Giriş hatası")
        return False
    
    def get_channel_id(self):
        url = f"https://kick.com/api/v2/channels/{self.channel}"
        r = requests.get(url)
        if r.status_code == 200:
            self.channel_id = r.json().get('id')
            return True
        return False
    
    def connect(self):
        if not self.channel_id:
            self.get_channel_id()
            
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
        subscribe = {
            "event": "pusher:subscribe",
            "data": {"channel": f"chatrooms.{self.channel_id}.v2"}
        }
        self.ws.send(json.dumps(subscribe))
        
        while self.running:
            time.sleep(60)
            print(f"💓 Bot çalışıyor - {datetime.now()}")
    
    def on_open(self, ws):
        print(f"✅ {self.channel} kanalına bağlandı")
    
    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            if data.get('event') == 'App\\Events\\ChatMessageEvent':
                msg = json.loads(data['data'])
                user = msg['sender']['username']
                content = msg['content']
                print(f"💬 [{user}]: {content}")
                
                if content == '!merhaba':
                    self.send_message(f"Merhaba @{user}! 👋")
                elif content == '!saat':
                    now = datetime.now().strftime("%H:%M:%S")
                    self.send_message(f"@{user} 🕐 {now}")
        except:
            pass
    
    def send_message(self, text):
        if self.ws:
            msg = {
                "event": "App\\Events\\ChatMessageEvent",
                "data": json.dumps({
                    "content": text,
                    "sender": {"username": self.username}
                })
            }
            self.ws.send(json.dumps(msg))
    
    def on_error(self, ws, error):
        print(f"❌ Hata: {error}")
    
    def on_close(self, ws, close_status_code, close_msg):
        print("🔌 Bağlantı kapatıldı")
        self.running = False
    
    def run(self):
        if self.login():
            self.connect()

if __name__ == "__main__":
    bot = KickBot()
    bot.run()
