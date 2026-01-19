require('dotenv').config();

module.exports = {
    // BOT IDENTITY
    bot: {
        username: process.env.BOT_USERNAME || 'fluexcode_bot',
        oauth: process.env.BOT_OAUTH,
        clientId: process.env.BOT_CLIENT_ID,
        clientSecret: process.env.BOT_CLIENT_SECRET,
        defaultChannel: process.env.DEFAULT_CHANNEL || 'fluexcode'
    },
    
    // WEB SERVER
    server: {
        port: process.env.PORT || 3000,
        sessionSecret: process.env.SESSION_SECRET || 'fluexcode-secret',
        adminPassword: process.env.ADMIN_PASSWORD || 'fluexcode123'
    },
    
    // PATHS
    paths: {
        data: './data',
        currentChannelFile: './data/current_channel.txt',
        usersFile: './data/users.json'
    },
    
    // TWITCH API
    twitch: {
        authUrl: 'https://id.twitch.tv/oauth2/authorize',
        tokenUrl: 'https://id.twitch.tv/oauth2/token',
        apiUrl: 'https://api.twitch.tv/helix',
        redirectUri: 'http://localhost:3000/auth/callback' // Local için
        // Production'da: 'https://fluexcode.github.io/auth/callback'
    }
};