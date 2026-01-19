const tmi = require('tmi.js');
const fs = require('fs').promises;
const config = require('./config');

console.log(`
╔══════════════════════════════════════╗
║        FLUEXCODE TWITCH BOT         ║
║        Channel: ${config.bot.defaultChannel.padEnd(15)}║
╚══════════════════════════════════════╝
`);

class FluexcodeBot {
    constructor() {
        this.currentChannel = config.bot.defaultChannel;
        this.client = null;
        this.isConnected = false;
        
        // Kanal dosyasını kontrol et
        this.init();
    }
    
    async init() {
        try {
            const channelFile = await fs.readFile(config.paths.currentChannelFile, 'utf8');
            this.currentChannel = channelFile.trim() || config.bot.defaultChannel;
        } catch (err) {
            // Dosya yoksa varsayılanı kullan
            await fs.writeFile(config.paths.currentChannelFile, config.bot.defaultChannel);
        }
        
        await this.start();
        this.watchChannelFile();
    }
    
    async start() {
        console.log(`🤖 Starting bot for channel: ${this.currentChannel}`);
        
        if (!config.bot.oauth) {
            console.error('❌ BOT_OAUTH missing in .env!');
            process.exit(1);
        }
        
        this.client = new tmi.Client({
            options: { debug: false },
            connection: {
                secure: true,
                reconnect: true,
                reconnectInterval: 1000
            },
            identity: {
                username: config.bot.username,
                password: config.bot.oauth
            },
            channels: [this.currentChannel]
        });
        
        try {
            await this.client.connect();
            this.isConnected = true;
            
            console.log(`✅ Connected to: ${this.currentChannel}`);
            this.client.say(this.currentChannel, '🚀 FluexCode Bot aktif! !yardim yazın.');
            
            this.setupEventListeners();
            
        } catch (error) {
            console.error('❌ Connection failed:', error.message);
            process.exit(1);
        }
    }
    
    setupEventListeners() {
        this.client.on('message', this.onMessage.bind(this));
        this.client.on('connected', this.onConnected.bind(this));
        this.client.on('disconnected', this.onDisconnected.bind(this));
    }
    
    onConnected(address, port) {
        console.log(`📡 Connected to ${address}:${port}`);
    }
    
    onDisconnected(reason) {
        console.log(`🔌 Disconnected: ${reason}`);
        this.isConnected = false;
    }
    
    async onMessage(channel, tags, message, self) {
        if (self) return;
        
        const msg = message.toLowerCase();
        const username = tags.username;
        
        // Komutlar
        if (msg.startsWith('!')) {
            const command = msg.split(' ')[0];
            
            switch(command) {
                case '!fluex':
                    this.client.say(channel, `🎮 @${username}, FluexCode'ye hoş geldin!`);
                    break;
                    
                case '!code':
                    this.client.say(channel, '💻 Kod öğren: github.com/fluexcode');
                    break;
                    
                case '!github':
                    this.client.say(channel, '🐱 GitHub: github.com/fluexcode');
                    break;
                    
                case '!discord':
                    this.client.say(channel, '🎮 Discord: discord.gg/fluexcode');
                    break;
                    
                case '!yardim':
                    this.client.say(channel, '📚 Komutlar: !fluex !code !github !discord !site !ping');
                    break;
                    
                case '!site':
                    this.client.say(channel, '🌐 Panel: https://fluexcode.github.io');
                    break;
                    
                case '!ping':
                    this.client.say(channel, '🏓 Pong! Bot aktif!');
                    break;
                    
                case '!kanal':
                    this.client.say(channel, `📺 Bu bot şu anda ${channel} kanalında!`);
                    break;
            }
        }
        
        // Otomatik cevaplar
        if (msg.includes('selam') || msg.includes('merhaba')) {
            this.client.say(channel, `👋 @${username}, hoş geldin!`);
        }
        
        if (msg.includes('fluexcode') || msg.includes('fluex')) {
            this.client.say(channel, `💙 @${username}, FluexCode topluluğuna hoş geldin!`);
        }
    }
    
    async changeChannel(newChannel) {
        if (!this.isConnected) return;
        
        console.log(`🔄 Changing channel: ${this.currentChannel} -> ${newChannel}`);
        
        // Eski kanaldan çık
        await this.client.part(this.currentChannel);
        
        // Yeni kanala gir
        this.currentChannel = newChannel;
        await this.client.join(newChannel);
        
        console.log(`✅ Now in channel: ${newChannel}`);
        this.client.say(newChannel, '🚀 FluexCode Bot burada!');
        
        // Dosyaya kaydet
        await fs.writeFile(config.paths.currentChannelFile, newChannel);
    }
    
    async watchChannelFile() {
        setInterval(async () => {
            try {
                const channel = await fs.readFile(config.paths.currentChannelFile, 'utf8');
                const trimmedChannel = channel.trim();
                
                if (trimmedChannel && trimmedChannel !== this.currentChannel) {
                    await this.changeChannel(trimmedChannel);
                }
            } catch (err) {
                // Dosya okunamazsa ignore
            }
        }, 5000); // 5 saniyede bir kontrol
    }
}

// Botu başlat
const bot = new FluexcodeBot();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down bot...');
    if (bot.client) {
        bot.client.disconnect();
    }
    process.exit(0);
});