const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const config = require('../config');

// Mevcut kanalı getir
router.get('/current', async (req, res) => {
    try {
        const channel = await fs.readFile(config.paths.currentChannelFile, 'utf8');
        res.json({ channel: channel.trim() });
    } catch (error) {
        res.json({ channel: config.bot.defaultChannel });
    }
});

// Kanal değiştir
router.post('/change', async (req, res) => {
    const { channel } = req.body;
    
    if (!channel || typeof channel !== 'string') {
        return res.status(400).json({ error: 'Geçerli bir kanal adı girin' });
    }
    
    try {
        // Kanal adını temizle (başındaki @ işaretini kaldır)
        const cleanChannel = channel.replace('@', '').toLowerCase().trim();
        
        // Dosyaya kaydet
        await fs.writeFile(config.paths.currentChannelFile, cleanChannel);
        
        res.json({ 
            success: true, 
            message: `Kanal ${cleanChannel} olarak değiştirildi`,
            channel: cleanChannel
        });
    } catch (error) {
        res.status(500).json({ error: 'Kanal değiştirilemedi' });
    }
});

// Kullanıcının kanallarını getir (Twitch API ile)
router.get('/user-channels', async (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        // Burada Twitch API'den kullanıcının takip ettiği/owned kanalları alınabilir
        // Şimdilik basit versiyon
        res.json({
            channels: [
                { name: req.session.username, displayName: req.session.displayName },
                { name: 'fluexcode', displayName: 'FluexCode' }
            ]
        });
    } catch (error) {
        res.status(500).json({ error: 'Channels could not be fetched' });
    }
});

module.exports = router;