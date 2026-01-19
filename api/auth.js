const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../config');

// Client ID endpoint
router.get('/client-id', (req, res) => {
    res.json({ 
        clientId: config.bot.clientId,
        redirectUri: config.twitch.redirectUri
    });
});

// Twitch OAuth callback
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.redirect('/login?error=no_code');
    }
    
    try {
        // Access token al
        const tokenResponse = await axios.post(config.twitch.tokenUrl, null, {
            params: {
                client_id: config.bot.clientId,
                client_secret: config.bot.clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: config.twitch.redirectUri
            }
        });
        
        const { access_token, refresh_token } = tokenResponse.data;
        
        // Kullanıcı bilgilerini al
        const userResponse = await axios.get(`${config.twitch.apiUrl}/users`, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Client-Id': config.bot.clientId
            }
        });
        
        const user = userResponse.data.data[0];
        
        // Session'a kaydet
        req.session.userId = user.id;
        req.session.username = user.login;
        req.session.displayName = user.display_name;
        req.session.accessToken = access_token;
        req.session.refreshToken = refresh_token;
        
        // Dashboard'a yönlendir
        res.redirect(`/dashboard?channel=${user.login}`);
        
    } catch (error) {
        console.error('Auth error:', error.response?.data || error.message);
        res.redirect('/login?error=auth_failed');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Session check
router.get('/session', (req, res) => {
    if (req.session.userId) {
        res.json({
            loggedIn: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
                displayName: req.session.displayName
            }
        });
    } else {
        res.json({ loggedIn: false });
    }
});

module.exports = router;