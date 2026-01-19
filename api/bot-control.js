const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const config = require('../config');

// Bot durumu
router.get('/status', async (req, res) => {
    try {
        const channel = await fs.readFile(config.paths.currentChannelFile, 'utf8');
        res.json({
            status: 'running',
            channel: channel.trim(),
            bot: config.bot.username,
            uptime: process.uptime()
        });
    } catch (error) {
        res.json({
            status: 'unknown',
            channel: config.bot.defaultChannel,
            bot: config.bot.username,
            uptime: process.uptime()
        });
    }
});

// Komut gönder
router.post('/command', (req, res) => {
    const { command } = req.body;
    
    if (!command) {
        return res.status(400).json({ error: 'No command provided' });
    }
    
    // Burada bot'a komut gönderme işlemi yapılacak
    // Şimdilik simüle ediyoruz
    console.log(`📨 Command received: ${command}`);
    
    res.json({ 
        success: true, 
        message: 'Command sent to bot',
        command: command 
    });
});

// Kanal değiştir
router.post('/channel', async (req, res) => {
    const { channel } = req.body;
    
    if (!channel) {
        return res.status(400).json({ error: 'Channel name required' });
    }
    
    const cleanChannel = channel.replace('@', '').toLowerCase().trim();
    
    try {
        await fs.writeFile(config.paths.currentChannelFile, cleanChannel);
        
        // Bot restart etmek için işaret (dosya değişikliğini bot izliyor)
        console.log(`🔄 Channel changed to: ${cleanChannel}`);
        
        res.json({ 
            success: true, 
            message: `Channel changed to ${cleanChannel}`,
            channel: cleanChannel
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to change channel' });
    }
});

// Bot restart (simüle)
router.post('/restart', (req, res) => {
    console.log('🔁 Bot restart requested');
    
    // Gerçekte burada bot process'i restart edilir
    // Şimdilik sadece log
    
    res.json({ 
        success: true, 
        message: 'Bot restart signal sent',
        timestamp: new Date().toISOString()
    });
});

// Bot disconnect
router.post('/disconnect', (req, res) => {
    console.log('🔌 Bot disconnect requested');
    
    res.json({ 
        success: true, 
        message: 'Bot disconnect signal sent'
    });
});

// Bot connect
router.post('/connect', (req, res) => {
    console.log('🔗 Bot connect requested');
    
    res.json({ 
        success: true, 
        message: 'Bot connect signal sent'
    });
});

module.exports = router;