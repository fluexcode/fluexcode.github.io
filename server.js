const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const config = require('./config');
const fs = require('fs-extra');

// API Routes
const authRoutes = require('./api/auth');
const channelRoutes = require('./api/channels');
const botRoutes = require('./api/bot-control');

const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'web')));

// Session
app.use(session({
    secret: config.server.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // HTTPS için true yap
}));

// Data klasörünü oluştur
fs.ensureDirSync(config.paths.data);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/bot', botRoutes);

// Web Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    // Basit auth kontrol
    if (!req.session.userId && !req.query.admin) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'web', 'dashboard.html'));
});

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (password === config.server.adminPassword) {
        req.session.admin = true;
        req.session.userId = 'admin';
        res.json({ success: true, redirect: '/dashboard' });
    } else {
        res.status(401).json({ success: false, error: 'Wrong password' });
    }
});

// Bot durumu
app.get('/api/status', (req, res) => {
    const currentChannel = fs.readFileSync(config.paths.currentChannelFile, 'utf8').trim();
    res.json({
        status: 'running',
        channel: currentChannel || config.bot.defaultChannel,
        bot: config.bot.username,
        uptime: process.uptime()
    });
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`🤖 Bot: ${config.bot.username}`);
    console.log(`📺 Default Channel: ${config.bot.defaultChannel}`);
});