const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const open = require('open');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_DIR = path.join(__dirname, 'data');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const YT_AUTH_PATH = path.join(CONFIG_DIR, 'browser.json');
const YT_AUTH_PATH_SECONDARY = path.join(CONFIG_DIR, 'browser_secondary.json');

// Ensure data directory exists
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Load configuration
function loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

// Helper: Save configuration
function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

// Helper: Run python script for YT Music API
function runPythonHelper(data) {
    return new Promise((resolve, reject) => {
        const py = spawn('python', [path.join(__dirname, 'ytmusic_helper.py')]);
        let stdout = '';
        let stderr = '';
        
        py.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });
        
        py.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        
        py.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python process exited with code ${code}. Stderr: ${stderr}`));
                return;
            }
            try {
                const response = JSON.parse(stdout);
                if (response.success === false) {
                    reject(new Error(response.error || 'Unknown error in Python helper'));
                } else {
                    resolve(response);
                }
            } catch (err) {
                reject(new Error(`Failed to parse Python response: ${err.message}. Raw output: ${stdout}`));
            }
        });
        
        py.stdin.write(JSON.stringify(data));
        py.stdin.end();
    });
}

// Helper: Get Spotify Access Token (with refresh if expired)
async function getSpotifyToken() {
    const config = loadConfig();
    
    // Prioritize the Web Player token if it exists
    if (config.spotifyWebPlayerToken) {
        return config.spotifyWebPlayerToken;
    }
    
    if (!config.spotifyClientId || !config.spotifyClientSecret) {
        throw new Error('Spotify credentials not configured');
    }
    
    const now = Date.now();
    if (!config.spotifyAccessToken || (config.spotifyTokenExpires && now >= config.spotifyTokenExpires - 60000)) {
        if (!config.spotifyRefreshToken) {
            // Fallback to client_credentials flow if user is not authorized via OAuth
            const authHeader = Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString('base64');
            try {
                const response = await axios.post('https://accounts.spotify.com/api/token', 
                    new URLSearchParams({
                        grant_type: 'client_credentials'
                    }), {
                    headers: {
                        'Authorization': `Basic ${authHeader}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                config.spotifyAccessToken = response.data.access_token;
                config.spotifyTokenExpires = Date.now() + (response.data.expires_in * 1000);
                saveConfig(config);
                return config.spotifyAccessToken;
            } catch (error) {
                throw new Error('Failed to get Client Credentials token: ' + (error.response?.data?.error_description || error.message));
            }
        }
        
        // Refresh token
        const authHeader = Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString('base64');
        try {
            const response = await axios.post('https://accounts.spotify.com/api/token', 
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: config.spotifyRefreshToken
                }), {
                    headers: {
                        'Authorization': `Basic ${authHeader}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
            
            config.spotifyAccessToken = response.data.access_token;
            if (response.data.refresh_token) {
                config.spotifyRefreshToken = response.data.refresh_token;
            }
            config.spotifyTokenExpires = Date.now() + (response.data.expires_in * 1000);
            saveConfig(config);
        } catch (error) {
            throw new Error('Failed to refresh Spotify token: ' + (error.response?.data?.error_description || error.message));
        }
    }
    
    return config.spotifyAccessToken;
}

// Helper: Handle Spotify API errors gracefully
function handleSpotifyError(error, res) {
    const status = error.response?.status;
    const errorData = error.response?.data?.error;
    const msg = errorData?.message || error.message;
    const isPremiumError = status === 403 || msg.includes('403') || msg.toLowerCase().includes('premium');
    const isExpiredToken = status === 401 || msg.includes('401') || msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('unauthorized');
    
    res.status(200).json({
        success: false,
        error: isExpiredToken ? 'Jeton d\'accès expiré' : (isPremiumError ? 'Spotify Premium requis' : msg),
        isPremiumError: !!isPremiumError,
        isExpiredToken: !!isExpiredToken
    });
}


let ytAccountCached = null;
let ytSecondaryAccountCached = null;
let spotifyAccountCached = null;

async function getOrFetchYtAccount(force = false) {
    if (!fs.existsSync(YT_AUTH_PATH)) {
        ytAccountCached = null;
        return null;
    }
    if (force) {
        ytAccountCached = null;
    }
    if (ytAccountCached && !force) return ytAccountCached;
    try {
        const res = await runPythonHelper({
            action: 'get_account_info',
            auth_path: YT_AUTH_PATH
        });
        console.log("getOrFetchYtAccount resolved to:", JSON.stringify(res));
        ytAccountCached = res;
        return res;
    } catch (e) {
        console.error("Error in getOrFetchYtAccount:", e.message);
        ytAccountCached = null;
        return null;
    }
}

async function getOrFetchYtSecondaryAccount(force = false) {
    if (!fs.existsSync(YT_AUTH_PATH_SECONDARY)) {
        ytSecondaryAccountCached = null;
        return null;
    }
    if (force) {
        ytSecondaryAccountCached = null;
    }
    if (ytSecondaryAccountCached && !force) return ytSecondaryAccountCached;
    try {
        const res = await runPythonHelper({
            action: 'get_account_info',
            auth_path: YT_AUTH_PATH_SECONDARY
        });
        console.log("getOrFetchYtSecondaryAccount resolved to:", JSON.stringify(res));
        ytSecondaryAccountCached = res;
        return res;
    } catch (e) {
        console.error("Error in getOrFetchYtSecondaryAccount:", e.message);
        ytSecondaryAccountCached = null;
        return null;
    }
}

async function getOrFetchSpotifyAccount(force = false) {
    const config = loadConfig();
    const usingWebPlayerToken = !!config.spotifyWebPlayerToken;
    const spotifyAuthorized = !!config.spotifyRefreshToken || usingWebPlayerToken;
    if (!spotifyAuthorized) {
        spotifyAccountCached = null;
        return null;
    }
    if (spotifyAccountCached && !force) return spotifyAccountCached;
    try {
        const token = await getSpotifyToken();
        const response = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        spotifyAccountCached = {
            displayName: response.data.display_name,
            email: response.data.email || null,
            photoUrl: response.data.images && response.data.images[0] ? response.data.images[0].url : null
        };
        return spotifyAccountCached;
    } catch (e) {
        return null;
    }
}

// Ensure profiles directory exists
const PROFILES_DIR = path.join(__dirname, 'data', 'profiles');
if (!fs.existsSync(PROFILES_DIR)) {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

async function initializeProfiles() {
    try {
        const config = loadConfig();
        // If config.ytProfiles is empty or doesn't exist, and browser.json exists, we can import them.
        if (!config.ytProfiles || config.ytProfiles.length === 0) {
            config.ytProfiles = [];
            
            // Check primary account
            if (fs.existsSync(YT_AUTH_PATH)) {
                console.log("Importation automatique du profil principal existant...");
                try {
                    const info = await runPythonHelper({
                        action: 'get_account_info',
                        auth_path: YT_AUTH_PATH
                    });
                    if (info && info.success) {
                        const accountName = info.accountName || 'Compte Principal';
                        const channelHandle = info.channelHandle || '';
                        const accountPhotoUrl = info.accountPhotoUrl || '';
                        const cleanHandle = channelHandle ? channelHandle.replace(/[^a-zA-Z0-9_\-]/g, '') : '';
                        const id = cleanHandle ? `handle_${cleanHandle}` : `id_primary_${Date.now()}`;
                        const filename = `profile_${id}.json`;
                        const profilePath = path.join(PROFILES_DIR, filename);
                        
                        // Copy active browser.json to profiles directory
                        fs.copyFileSync(YT_AUTH_PATH, profilePath);
                        
                        const profileData = {
                            id,
                            accountName,
                            channelHandle,
                            accountPhotoUrl,
                            filename
                        };
                        config.ytProfiles.push(profileData);
                        config.activePrimaryProfileId = id;
                        console.log(`Profil principal importé : ${accountName}`);
                    }
                } catch (e) {
                    console.error("Erreur lors de l'import du compte principal existant:", e.message);
                }
            }
            
            // Check secondary account
            if (fs.existsSync(YT_AUTH_PATH_SECONDARY)) {
                console.log("Importation automatique du profil secondaire existant...");
                try {
                    const info = await runPythonHelper({
                        action: 'get_account_info',
                        auth_path: YT_AUTH_PATH_SECONDARY
                    });
                    if (info && info.success) {
                        const accountName = info.accountName || 'Compte Secondaire';
                        const channelHandle = info.channelHandle || '';
                        const accountPhotoUrl = info.accountPhotoUrl || '';
                        const cleanHandle = channelHandle ? channelHandle.replace(/[^a-zA-Z0-9_\-]/g, '') : '';
                        
                        // Avoid ID collision if it's the same account
                        let id = cleanHandle ? `handle_${cleanHandle}` : `id_secondary_${Date.now()}`;
                        const filename = `profile_${id}.json`;
                        const profilePath = path.join(PROFILES_DIR, filename);
                        
                        // If it's the same handle, we don't need a duplicate file, we can reuse
                        const existingProfile = config.ytProfiles.find(p => p.id === id);
                        if (existingProfile) {
                            config.activeSecondaryProfileId = id;
                            console.log(`Profil secondaire réutilisé depuis le profil principal : ${accountName}`);
                        } else {
                            fs.copyFileSync(YT_AUTH_PATH_SECONDARY, profilePath);
                            const profileData = {
                                id,
                                accountName,
                                channelHandle,
                                accountPhotoUrl,
                                filename
                            };
                            config.ytProfiles.push(profileData);
                            config.activeSecondaryProfileId = id;
                            console.log(`Profil secondaire importé : ${accountName}`);
                        }
                    }
                } catch (e) {
                    console.error("Erreur lors de l'import du compte secondaire existant:", e.message);
                }
            }
            
            saveConfig(config);
        }
    } catch (err) {
        console.error("Erreur lors de l'initialisation des profils :", err);
    }
}

async function saveYtProfile(headersRaw, activePath) {
    const tempPath = path.join(__dirname, 'data', 'temp_setup.json');
    
    // Write headers temporarily to run validation
    await runPythonHelper({
        action: 'setup_auth',
        headers_raw: headersRaw,
        filepath: tempPath
    });
    
    // Validate by fetching account info
    const info = await runPythonHelper({
        action: 'get_account_info',
        auth_path: tempPath
    });
    
    if (!info || !info.success) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        throw new Error(info?.error || "Impossible de valider le compte YouTube Music. En-têtes invalides.");
    }
    
    const accountName = info.accountName || 'Compte Inconnu';
    const channelHandle = info.channelHandle || '';
    const accountPhotoUrl = info.accountPhotoUrl || '';
    
    // Generate profile id
    const cleanHandle = channelHandle ? channelHandle.replace(/[^a-zA-Z0-9_\-]/g, '') : '';
    const id = cleanHandle ? `handle_${cleanHandle}` : `id_${Date.now()}`;
    const filename = `profile_${id}.json`;
    const profilePath = path.join(PROFILES_DIR, filename);
    
    // Move temp file to profile path
    fs.copyFileSync(tempPath, profilePath);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    
    // Update config
    const config = loadConfig();
    if (!config.ytProfiles) config.ytProfiles = [];
    
    const existingIndex = config.ytProfiles.findIndex(p => p.id === id);
    const profileData = {
        id,
        accountName,
        channelHandle,
        accountPhotoUrl,
        filename
    };
    
    if (existingIndex > -1) {
        config.ytProfiles[existingIndex] = profileData;
    } else {
        config.ytProfiles.push(profileData);
    }
    
    if (activePath === YT_AUTH_PATH) {
        config.activePrimaryProfileId = id;
    } else if (activePath === YT_AUTH_PATH_SECONDARY) {
        config.activeSecondaryProfileId = id;
    }
    
    saveConfig(config);
    
    // Copy to active path
    fs.copyFileSync(profilePath, activePath);
    
    return profileData;
}

// API: Get App Status and Config
app.get('/api/status', async (req, res) => {
    const config = loadConfig();
    const usingWebPlayerToken = !!config.spotifyWebPlayerToken;
    const spotifyConfigured = !!(config.spotifyClientId && config.spotifyClientSecret) || usingWebPlayerToken;
    const spotifyAuthorized = !!config.spotifyRefreshToken || usingWebPlayerToken;
    const ytMusicConfigured = fs.existsSync(YT_AUTH_PATH);
    const ytMusicSecondaryConfigured = fs.existsSync(YT_AUTH_PATH_SECONDARY);
    
    const ytAccount = ytMusicConfigured ? await getOrFetchYtAccount() : null;
    const ytSecondaryAccount = ytMusicSecondaryConfigured ? await getOrFetchYtSecondaryAccount() : null;
    const spotifyAccount = spotifyAuthorized ? await getOrFetchSpotifyAccount() : null;
    
    res.json({
        spotifyConfigured,
        spotifyAuthorized,
        spotifyClientId: config.spotifyClientId || '',
        ytMusicConfigured,
        ytMusicSecondaryConfigured,
        usingWebPlayerToken,
        spotifyWebPlayerToken: config.spotifyWebPlayerToken || '',
        ytAccount,
        ytSecondaryAccount,
        spotifyAccount
    });
});

// API: Get Saved YTM Profiles
app.get('/api/ytmusic/profiles', (req, res) => {
    const config = loadConfig();
    res.json({
        success: true,
        profiles: config.ytProfiles || [],
        activePrimaryId: config.activePrimaryProfileId || null,
        activeSecondaryId: config.activeSecondaryProfileId || null
    });
});

// API: Select YTM Profile
app.post('/api/ytmusic/profiles/select', async (req, res) => {
    const { profileId, target } = req.body;
    if (!profileId || !target || (target !== 'primary' && target !== 'secondary')) {
        return res.status(400).json({ success: false, error: 'profileId and valid target (primary/secondary) are required.' });
    }
    
    const config = loadConfig();
    const profiles = config.ytProfiles || [];
    const profile = profiles.find(p => p.id === profileId);
    
    if (!profile) {
        return res.status(404).json({ success: false, error: 'Profil introuvable.' });
    }
    
    const profilePath = path.join(PROFILES_DIR, profile.filename);
    if (!fs.existsSync(profilePath)) {
        return res.status(404).json({ success: false, error: 'Fichier de profil introuvable sur le disque.' });
    }
    
    try {
        if (target === 'primary') {
            fs.copyFileSync(profilePath, YT_AUTH_PATH);
            config.activePrimaryProfileId = profileId;
            saveConfig(config);
            await getOrFetchYtAccount(true);
        } else {
            fs.copyFileSync(profilePath, YT_AUTH_PATH_SECONDARY);
            config.activeSecondaryProfileId = profileId;
            saveConfig(config);
            await getOrFetchYtSecondaryAccount(true);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Delete YTM Profile
app.delete('/api/ytmusic/profiles/:id', (req, res) => {
    const profileId = req.params.id;
    if (!profileId) {
        return res.status(400).json({ success: false, error: 'profileId is required.' });
    }
    
    const config = loadConfig();
    const profiles = config.ytProfiles || [];
    const profileIndex = profiles.findIndex(p => p.id === profileId);
    
    if (profileIndex === -1) {
        return res.status(404).json({ success: false, error: 'Profil introuvable.' });
    }
    
    const profile = profiles[profileIndex];
    const profilePath = path.join(PROFILES_DIR, profile.filename);
    
    try {
        if (fs.existsSync(profilePath)) {
            fs.unlinkSync(profilePath);
        }
        
        // Remove from list
        profiles.splice(profileIndex, 1);
        
        // Reset active fields if deleted
        if (config.activePrimaryProfileId === profileId) {
            config.activePrimaryProfileId = null;
            if (fs.existsSync(YT_AUTH_PATH)) fs.unlinkSync(YT_AUTH_PATH);
            ytAccountCached = null;
        }
        if (config.activeSecondaryProfileId === profileId) {
            config.activeSecondaryProfileId = null;
            if (fs.existsSync(YT_AUTH_PATH_SECONDARY)) fs.unlinkSync(YT_AUTH_PATH_SECONDARY);
            ytSecondaryAccountCached = null;
        }
        
        config.ytProfiles = profiles;
        saveConfig(config);
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Save Credentials
app.post('/api/config', async (req, res) => {
    const { spotifyClientId, spotifyClientSecret, ytHeaders, ytHeadersSecondary, spotifyWebPlayerToken } = req.body;
    const config = loadConfig();
    
    if (spotifyClientId !== undefined) config.spotifyClientId = spotifyClientId.trim();
    if (spotifyClientSecret !== undefined) config.spotifyClientSecret = spotifyClientSecret.trim();
    if (spotifyWebPlayerToken !== undefined) config.spotifyWebPlayerToken = spotifyWebPlayerToken.trim();
    
    saveConfig(config);
    
    try {
        if (ytHeaders && ytHeaders.trim()) {
            await saveYtProfile(ytHeaders, YT_AUTH_PATH);
            await getOrFetchYtAccount(true);
        }
        if (ytHeadersSecondary && ytHeadersSecondary.trim()) {
            await saveYtProfile(ytHeadersSecondary, YT_AUTH_PATH_SECONDARY);
            await getOrFetchYtSecondaryAccount(true);
        }
        if (spotifyWebPlayerToken !== undefined) {
            await getOrFetchSpotifyAccount(true);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Spotify Login Redirect
app.get('/api/spotify/login', (req, res) => {
    const config = loadConfig();
    if (!config.spotifyClientId) {
        return res.status(400).send('Spotify Client ID not configured.');
    }
    
    const redirectUri = `http://127.0.0.1:${PORT}/api/spotify/callback`;
    const scopes = 'user-library-read user-library-modify playlist-read-private playlist-modify-public playlist-modify-private user-read-private user-read-email';
    const spotifyAuthUrl = `https://accounts.spotify.com/authorize?` + 
        new URLSearchParams({
            response_type: 'code',
            client_id: config.spotifyClientId,
            scope: scopes,
            redirect_uri: redirectUri,
            show_dialog: 'true'
        }).toString();
        
    res.redirect(spotifyAuthUrl);
});

// API: Spotify Callback
app.get('/api/spotify/callback', async (req, res) => {
    const { code, error } = req.query;
    if (error) {
        return res.status(400).send(`Spotify Authorization Error: ${error}`);
    }
    
    const config = loadConfig();
    const redirectUri = `http://127.0.0.1:${PORT}/api/spotify/callback`;
    const authHeader = Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString('base64');
    
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri
            }), {
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        config.spotifyAccessToken = response.data.access_token;
        config.spotifyRefreshToken = response.data.refresh_token;
        config.spotifyTokenExpires = Date.now() + (response.data.expires_in * 1000);
        config.spotifyWebPlayerToken = ''; // Clear Web Player token on successful OAuth login
        saveConfig(config);
        
        getOrFetchSpotifyAccount(true).catch(() => {});
        
        // Redirect back to home dashboard
        res.redirect('/');
    } catch (e) {
        res.status(500).send('Failed to exchange Spotify auth code: ' + (e.response?.data?.error_description || e.message));
    }
});

// API: Fetch Liked Tracks from Spotify (with Pagination)
app.get('/api/spotify/tracks', async (req, res) => {
    try {
        const token = await getSpotifyToken();
        let tracks = [];
        let url = 'https://api.spotify.com/v1/me/tracks?limit=50';
        
        // In SSE or standard HTTP, let's fetch all.
        // For standard HTTP: fetch in a loop.
        while (url) {
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const items = response.data.items.map(item => ({
                id: item.track.id,
                title: item.track.name,
                artist: item.track.artists.map(a => a.name).join(', '),
                album: item.track.album.name,
                duration_ms: item.track.duration_ms,
                thumbnail: item.track.album.images[0]?.url || item.track.album.images[1]?.url || '',
                added_at: item.added_at
            }));
            
            tracks = tracks.concat(items);
            url = response.data.next;
        }
        
        res.json({ success: true, count: tracks.length, tracks });
    } catch (e) {
        handleSpotifyError(e, res);
    }
});

// Similarity helper functions
function cleanString(str) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        // Remove features in parentheses or brackets (e.g. "(feat. Drake)")
        .replace(/\((feat|featuring|with|ft)\.?\s+.*?\)/gi, '')
        .replace(/\[(feat|featuring|with|ft)\.?\s+.*?\]/gi, '')
        .replace(/\b(feat|featuring|with|ft)\.?\s+.*/gi, '')
        // Remove common YouTube video tags in parentheses or brackets
        .replace(/\((official video|official audio|music video|lyrics?\s*video|lyrics?|clip officiel|video clip|clip|hq|hd|4k)\)/gi, '')
        .replace(/\[(official video|official audio|music video|lyrics?\s*video|lyrics?|clip officiel|video clip|clip|hq|hd|4k)\]/gi, '')
        // Remove common suffixes like "- Official Video" or "- Lyrics"
        .replace(/-\s+(official video|official audio|music video|lyrics?\s*video|lyrics?|clip officiel|video clip|clip|hq|hd|4k)$/gi, '')
        // Remove remaster / live / deluxe / version info in parentheses or brackets
        .replace(/\((.*?remaster.*?|re-recorded|live|radio edit|deluxe|bonus|.*?revisited.*?)\)/gi, '')
        .replace(/\[(.*?remaster.*?|re-recorded|live|radio edit|deluxe|bonus|.*?revisited.*?)\]/gi, '')
        .replace(/-\s+(.*?remaster.*?|re-recorded|live|radio edit|deluxe|bonus|.*?revisited.*?)$/gi, '')
        .replace(/\s+remaster(ed)?(\s+\d+)?/gi, '')
        // Remove non-alphanumeric characters except spaces
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function stringSimilarity(s1, s2) {
    if (!s1 || !s2) return 0;
    const words1 = new Set(s1.split(' '));
    const words2 = new Set(s2.split(' '));
    let intersection = 0;
    for (const w of words1) {
        if (words2.has(w)) intersection++;
    }
    const union = words1.size + words2.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

function calculateMatchScore(spotifyTrack, ytCandidate) {
    const cleanSpotifyTitle = cleanString(spotifyTrack.title);
    const cleanYtTitle = cleanString(ytCandidate.title);
    const titleScore = stringSimilarity(cleanSpotifyTitle, cleanYtTitle);
    
    const cleanSpotifyArtist = cleanString(spotifyTrack.artist);
    const cleanYtArtist = cleanString(ytCandidate.artist);
    const artistScore = stringSimilarity(cleanSpotifyArtist, cleanYtArtist);
    
    const spotifyDurationSec = spotifyTrack.duration_ms / 1000;
    const ytDurationSec = ytCandidate.duration_seconds;
    const durationDiff = Math.abs(spotifyDurationSec - ytDurationSec);
    
    let durationScore = 1;
    if (durationDiff > 15) {
        durationScore = Math.max(0, 1 - (durationDiff - 15) / 30); // decay score if difference is > 15 seconds
    }
    
    // Weights: 45% title, 45% artist, 10% duration
    return (titleScore * 0.45) + (artistScore * 0.45) + (durationScore * 0.1);
}

// API: Search track on YT Music and find best match
app.post('/api/ytmusic/search-track', async (req, res) => {
    const { track } = req.body; // spotify track object
    if (!track) {
        return res.status(400).json({ success: false, error: 'Track object required' });
    }
    
    try {
        // Construct query: "Title Artist"
        const query = `${track.title} ${track.artist}`;
        
        // Retry logic for robust searches
        const maxRetries = 3;
        let attempt = 0;
        let helperResponse = null;
        let lastError = null;
        
        while (attempt < maxRetries) {
            try {
                helperResponse = await runPythonHelper({
                    action: 'search_songs',
                    auth_path: YT_AUTH_PATH,
                    query: query
                });
                break; // success, exit retry loop
            } catch (err) {
                attempt++;
                lastError = err;
                console.warn(`[Recherche YTMusic] Tentative ${attempt}/${maxRetries} échouée pour "${track.title}": ${err.message}`);
                if (attempt < maxRetries) {
                    // Backoff exponential delay: 1s, 2s...
                    await new Promise(r => setTimeout(r, attempt * 1000));
                }
            }
        }
        
        if (!helperResponse) {
            console.error(`[Recherche YTMusic] Échec définitif après ${maxRetries} tentatives pour "${track.title} - ${track.artist}":`, lastError);
            return res.status(500).json({ success: false, error: lastError.message });
        }
        
        const candidates = helperResponse.results || [];
        
        // Score each candidate
        const scoredCandidates = candidates.map(c => {
            const score = calculateMatchScore(track, c);
            return { ...c, matchScore: score };
        });
        
        // Sort by match score descending
        scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
        
        const bestMatch = scoredCandidates[0] || null;
        
        res.json({
            success: true,
            bestMatch,
            candidates: scoredCandidates
        });
    } catch (e) {
        console.error(`[Recherche YTMusic] Erreur générale pour "${track.title} - ${track.artist}":`, e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Get Playlists
app.get('/api/ytmusic/playlists', async (req, res) => {
    try {
        const response = await runPythonHelper({
            action: 'get_playlists',
            auth_path: YT_AUTH_PATH
        });
        res.json({ success: true, playlists: response.playlists });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Create Playlist
app.post('/api/ytmusic/playlists', async (req, res) => {
    const { title, description } = req.body;
    try {
        const response = await runPythonHelper({
            action: 'create_playlist',
            auth_path: YT_AUTH_PATH,
            title,
            description
        });
        res.json({ success: true, playlistId: response.playlist_id });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Get Playlist Tracks
app.get('/api/ytmusic/playlists/:id/tracks', async (req, res) => {
    const playlistId = req.params.id;
    try {
        const response = await runPythonHelper({
            action: 'get_playlist_tracks',
            auth_path: YT_AUTH_PATH,
            playlist_id: playlistId
        });
        res.json({ success: true, tracks: response.tracks });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Get Playlists for Secondary YT Music Account
app.get('/api/ytmusic/secondary/playlists', async (req, res) => {
    try {
        if (!fs.existsSync(YT_AUTH_PATH_SECONDARY)) {
            return res.json({ success: true, playlists: [] });
        }
        const response = await runPythonHelper({
            action: 'get_playlists',
            auth_path: YT_AUTH_PATH_SECONDARY
        });
        res.json({ success: true, playlists: response.playlists });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Merge YouTube Music Playlists
app.post('/api/ytmusic/merge-playlists', async (req, res) => {
    const { sourcePlaylistIds, newPlaylistName, skipDuplicates } = req.body;
    if (!sourcePlaylistIds || !Array.isArray(sourcePlaylistIds) || sourcePlaylistIds.length === 0 || !newPlaylistName) {
        return res.status(400).json({ success: false, error: 'Source playlists and new playlist name are required.' });
    }
    
    try {
        // 1. Create the new YTM playlist
        const createRes = await runPythonHelper({
            action: 'create_playlist',
            auth_path: YT_AUTH_PATH,
            title: newPlaylistName,
            description: 'Playlist fusionnée depuis plusieurs playlists YouTube Music'
        });
        const newPlaylistId = createRes.playlist_id;
        
        // 2. Fetch tracks from all selected source playlists
        let allVideoIds = [];
        const seenVideoIds = new Set();
        
        for (const playlistId of sourcePlaylistIds) {
            const tracksRes = await runPythonHelper({
                action: 'get_playlist_tracks',
                auth_path: YT_AUTH_PATH,
                playlist_id: playlistId
            });
            const tracks = tracksRes.tracks || [];
            
            for (const t of tracks) {
                if (t.videoId) {
                    if (skipDuplicates) {
                        if (!seenVideoIds.has(t.videoId)) {
                            seenVideoIds.add(t.videoId);
                            allVideoIds.push(t.videoId);
                        }
                    } else {
                        allVideoIds.push(t.videoId);
                    }
                }
            }
        }
        
        // 3. Add tracks to the new playlist
        if (allVideoIds.length > 0) {
            const batchSize = 100;
            for (let i = 0; i < allVideoIds.length; i += batchSize) {
                const batch = allVideoIds.slice(i, i + batchSize);
                await runPythonHelper({
                    action: 'add_tracks',
                    auth_path: YT_AUTH_PATH,
                    playlist_id: newPlaylistId,
                    video_ids: batch,
                    duplicates: !skipDuplicates
                });
            }
        }
        
        res.json({ success: true, playlistId: newPlaylistId, trackCount: allVideoIds.length });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Copy YTM Playlist to another YTM Playlist (same or different account)
app.post('/api/ytmusic/copy-playlist', async (req, res) => {
    const { sourcePlaylistId, destPlaylistId, destPlaylistName, useSecondaryAccount, skipDuplicates } = req.body;
    
    if (!sourcePlaylistId || !destPlaylistId) {
        return res.status(400).json({ success: false, error: 'Source playlist ID and destination playlist ID are required.' });
    }
    
    try {
        const destAuthPath = useSecondaryAccount ? YT_AUTH_PATH_SECONDARY : YT_AUTH_PATH;
        if (useSecondaryAccount && !fs.existsSync(YT_AUTH_PATH_SECONDARY)) {
            return res.status(400).json({ success: false, error: 'Secondary YTM account not configured.' });
        }
        
        // 1. Fetch tracks from the source playlist (always using primary account)
        const tracksRes = await runPythonHelper({
            action: 'get_playlist_tracks',
            auth_path: YT_AUTH_PATH,
            playlist_id: sourcePlaylistId
        });
        const tracks = tracksRes.tracks || [];
        
        if (tracks.length === 0) {
            return res.json({ success: true, message: 'Source playlist has no tracks.', trackCount: 0 });
        }
        
        // 2. Resolve destination playlist ID (create new if specified)
        let resolvedDestPlaylistId = destPlaylistId;
        if (destPlaylistId === '__new__') {
            const title = destPlaylistName || 'YTM Copy Playlist';
            const createRes = await runPythonHelper({
                action: 'create_playlist',
                auth_path: destAuthPath,
                title: title,
                description: 'Copie de playlist YouTube Music'
            });
            resolvedDestPlaylistId = createRes.playlist_id;
        }
        
        // 3. Fetch existing tracks in destination playlist to avoid duplicates if checked
        let existingVideoIds = new Set();
        if (skipDuplicates && resolvedDestPlaylistId !== '__new__') {
            try {
                const destTracksRes = await runPythonHelper({
                    action: 'get_playlist_tracks',
                    auth_path: destAuthPath,
                    playlist_id: resolvedDestPlaylistId
                });
                const destTracks = destTracksRes.tracks || [];
                destTracks.forEach(t => {
                    if (t.videoId) existingVideoIds.add(t.videoId);
                });
            } catch (err) {
                // Ignore errors reading dest playlist
            }
        }
        
        // 4. Collect video IDs to add
        let videoIdsToAdd = [];
        const seenInBatch = new Set();
        
        for (const t of tracks) {
            if (t.videoId) {
                const isDuplicate = skipDuplicates && (existingVideoIds.has(t.videoId) || seenInBatch.has(t.videoId));
                if (!isDuplicate) {
                    videoIdsToAdd.push(t.videoId);
                    seenInBatch.add(t.videoId);
                }
            }
        }
        
        // 5. Add tracks in batches of 100
        if (videoIdsToAdd.length > 0) {
            const batchSize = 100;
            for (let i = 0; i < videoIdsToAdd.length; i += batchSize) {
                const batch = videoIdsToAdd.slice(i, i + batchSize);
                await runPythonHelper({
                    action: 'add_tracks',
                    auth_path: destAuthPath,
                    playlist_id: resolvedDestPlaylistId,
                    video_ids: batch,
                    duplicates: !skipDuplicates
                });
            }
        }
        
        res.json({ success: true, playlistId: resolvedDestPlaylistId, trackCount: videoIdsToAdd.length });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Merge YouTube Music Playlists via Server-Sent Events (SSE)
app.get('/api/ytmusic/merge-playlists-stream', async (req, res) => {
    const { sourcePlaylistIds: sourceIdsStr, newPlaylistName, skipDuplicates: skipDupStr } = req.query;
    
    if (!sourceIdsStr || !newPlaylistName) {
        return res.status(400).send('Missing sourcePlaylistIds or newPlaylistName parameters');
    }
    
    const sourcePlaylistIds = sourceIdsStr.split(',');
    const skipDuplicates = skipDupStr === 'true';
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    
    try {
        sendEvent('info', { message: 'Création de la nouvelle playlist...' });
        const createRes = await runPythonHelper({
            action: 'create_playlist',
            auth_path: YT_AUTH_PATH,
            title: newPlaylistName,
            description: 'Playlist fusionnée depuis plusieurs playlists YouTube Music'
        });
        const newPlaylistId = createRes.playlist_id;
        sendEvent('info', { message: `Nouvelle playlist créée (ID: ${newPlaylistId})` });
        
        let allVideoIds = [];
        const seenVideoIds = new Set();
        
        for (let idx = 0; idx < sourcePlaylistIds.length; idx++) {
            const playlistId = sourcePlaylistIds[idx];
            sendEvent('info', { message: `Lecture des titres de la playlist source ${idx + 1}/${sourcePlaylistIds.length}...` });
            const tracksRes = await runPythonHelper({
                action: 'get_playlist_tracks',
                auth_path: YT_AUTH_PATH,
                playlist_id: playlistId
            });
            const tracks = tracksRes.tracks || [];
            
            for (const t of tracks) {
                if (t.videoId) {
                    if (skipDuplicates) {
                        if (!seenVideoIds.has(t.videoId)) {
                            seenVideoIds.add(t.videoId);
                            allVideoIds.push(t.videoId);
                        }
                    } else {
                        allVideoIds.push(t.videoId);
                    }
                }
            }
        }
        
        sendEvent('info', { message: `Total de titres à ajouter : ${allVideoIds.length}. Préparation de l'ajout...` });
        
        let processedTracks = 0;
        if (allVideoIds.length > 0) {
            const batchSize = 100;
            const batches = [];
            for (let i = 0; i < allVideoIds.length; i += batchSize) {
                batches.push(allVideoIds.slice(i, i + batchSize));
            }
            
            for (let b = 0; b < batches.length; b++) {
                const batch = batches[b];
                const batchStartIndex = b * batchSize;
                sendEvent('info', { message: `Ajout du lot ${b + 1}/${batches.length} (titres ${batchStartIndex + 1}-${batchStartIndex + batch.length})...` });
                
                await runPythonHelper({
                    action: 'add_tracks',
                    auth_path: YT_AUTH_PATH,
                    playlist_id: newPlaylistId,
                    video_ids: batch,
                    duplicates: !skipDuplicates
                });
                
                processedTracks += batch.length;
                const progress = Math.min(100, Math.round((processedTracks / allVideoIds.length) * 100));
                sendEvent('progress', {
                    added: processedTracks,
                    total: allVideoIds.length,
                    percent: progress,
                    message: `${processedTracks} sur ${allVideoIds.length} titres ajoutés.`
                });
                
                if (b < batches.length - 1) {
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }
        
        sendEvent('success', { message: 'Fusion terminée avec succès !', playlistId: newPlaylistId, total: allVideoIds.length });
    } catch (err) {
        sendEvent('error', { error: err.message });
    } finally {
        res.end();
    }
});

// API: Copy YTM Playlist via Server-Sent Events (SSE)
app.get('/api/ytmusic/copy-playlist-stream', async (req, res) => {
    const { sourcePlaylistId, destPlaylistId, destPlaylistName, useSecondaryAccount: useSecStr, skipDuplicates: skipDupStr } = req.query;
    
    if (!sourcePlaylistId || !destPlaylistId) {
        return res.status(400).send('Missing sourcePlaylistId or destPlaylistId parameters');
    }
    
    const useSecondaryAccount = useSecStr === 'true';
    const skipDuplicates = skipDupStr === 'true';
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    
    try {
        const destAuthPath = useSecondaryAccount ? YT_AUTH_PATH_SECONDARY : YT_AUTH_PATH;
        if (useSecondaryAccount && !fs.existsSync(YT_AUTH_PATH_SECONDARY)) {
            throw new Error('Le compte YouTube Music secondaire n\'est pas configuré.');
        }
        
        sendEvent('info', { message: 'Lecture des titres de la playlist source...' });
        const tracksRes = await runPythonHelper({
            action: 'get_playlist_tracks',
            auth_path: YT_AUTH_PATH,
            playlist_id: sourcePlaylistId
        });
        const tracks = tracksRes.tracks || [];
        
        if (tracks.length === 0) {
            sendEvent('success', { message: 'La playlist source ne contient aucun titre.', playlistId: destPlaylistId, total: 0 });
            return;
        }
        
        let resolvedDestPlaylistId = destPlaylistId;
        if (destPlaylistId === '__new__') {
            sendEvent('info', { message: `Création de la nouvelle playlist de destination : "${destPlaylistName}"...` });
            const title = destPlaylistName || 'YTM Copy Playlist';
            const createRes = await runPythonHelper({
                action: 'create_playlist',
                auth_path: destAuthPath,
                title: title,
                description: 'Copie de playlist YouTube Music'
            });
            resolvedDestPlaylistId = createRes.playlist_id;
            sendEvent('info', { message: `Nouvelle playlist créée (ID: ${resolvedDestPlaylistId})` });
        }
        
        let existingVideoIds = new Set();
        if (skipDuplicates && destPlaylistId !== '__new__') {
            sendEvent('info', { message: 'Analyse des titres déjà existants dans la destination...' });
            try {
                const destTracksRes = await runPythonHelper({
                    action: 'get_playlist_tracks',
                    auth_path: destAuthPath,
                    playlist_id: resolvedDestPlaylistId
                });
                const destTracks = destTracksRes.tracks || [];
                destTracks.forEach(t => {
                    if (t.videoId) existingVideoIds.add(t.videoId);
                });
                sendEvent('info', { message: `${existingVideoIds.size} titre(s) déjà présent(s) détecté(s).` });
            } catch (err) {
                sendEvent('info', { message: '⚠️ Impossible de lire les titres existants de la destination. On continue sans déduplication existante.' });
            }
        }
        
        let videoIdsToAdd = [];
        const seenInBatch = new Set();
        let duplicatesCount = 0;
        
        for (const t of tracks) {
            if (t.videoId) {
                const isDuplicate = skipDuplicates && (existingVideoIds.has(t.videoId) || seenInBatch.has(t.videoId));
                if (!isDuplicate) {
                    videoIdsToAdd.push(t.videoId);
                    seenInBatch.add(t.videoId);
                } else {
                    duplicatesCount++;
                }
            }
        }
        
        sendEvent('info', { message: `${videoIdsToAdd.length} titre(s) à copier (${duplicatesCount} doublon(s) ignoré(s)).` });
        
        let processedTracks = 0;
        if (videoIdsToAdd.length > 0) {
            const batchSize = 100;
            const batches = [];
            for (let i = 0; i < videoIdsToAdd.length; i += batchSize) {
                batches.push(videoIdsToAdd.slice(i, i + batchSize));
            }
            
            for (let b = 0; b < batches.length; b++) {
                const batch = batches[b];
                const batchStartIndex = b * batchSize;
                sendEvent('info', { message: `Copie du lot ${b + 1}/${batches.length} (titres ${batchStartIndex + 1}-${batchStartIndex + batch.length})...` });
                
                await runPythonHelper({
                    action: 'add_tracks',
                    auth_path: destAuthPath,
                    playlist_id: resolvedDestPlaylistId,
                    video_ids: batch,
                    duplicates: !skipDuplicates
                });
                
                processedTracks += batch.length;
                const progress = Math.min(100, Math.round((processedTracks / videoIdsToAdd.length) * 100));
                sendEvent('progress', {
                    added: processedTracks,
                    total: videoIdsToAdd.length,
                    percent: progress,
                    duplicatesSkipped: duplicatesCount,
                    message: `${processedTracks} sur ${videoIdsToAdd.length} titres copiés.`
                });
                
                if (b < batches.length - 1) {
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }
        
        sendEvent('success', { message: 'Copie terminée avec succès !', playlistId: resolvedDestPlaylistId, total: videoIdsToAdd.length, duplicatesSkipped: duplicatesCount });
    } catch (err) {
        sendEvent('error', { error: err.message });
    } finally {
        res.end();
    }
});

// API: Transfer tracks with progress updates via Server-Sent Events (SSE)
app.get('/api/ytmusic/transfer-stream', async (req, res) => {
    const { playlistId, trackData, skipDuplicates } = req.query; // trackData is JSON string array of videoIds
    
    if (!playlistId || !trackData) {
        return res.status(400).send('Missing playlistId or trackData parameters');
    }
    
    let videoIds = [];
    try {
        videoIds = JSON.parse(trackData);
    } catch (e) {
        return res.status(400).send('Invalid trackData format (must be JSON array of strings)');
    }
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    
    try {
        sendEvent('info', { message: `Starting transfer of ${videoIds.length} tracks...` });
        
        // We will add the tracks in batches of 50.
        // The user wanted "De plus récent en haut au plus vieux en bas".
        // Spotify retrieved them from newest to oldest.
        // If we append them in that order, the first item added (newest) remains at index 0,
        // and subsequent items go below it.
        // So the order is perfectly preserved.
        const batchSize = 100; // Larger batch size to prevent API rate limit issues
        const batches = [];
        for (let i = 0; i < videoIds.length; i += batchSize) {
            batches.push(videoIds.slice(i, i + batchSize));
        }
        
        let processedTracks = 0;
        // Process batches in reverse order (oldest tracks batch first, newest tracks batch last)
        // This ensures that the newest tracks have the newest addition timestamps on YouTube Music,
        // making the "Le plus récent en premier" sort order match the Spotify order perfectly.
        for (let b = batches.length - 1; b >= 0; b--) {
            const batch = batches[b];
            const batchStartIndex = b * batchSize;
            sendEvent('info', { message: `Adding batch ${b + 1} of ${batches.length} (tracks ${batchStartIndex + 1}-${batchStartIndex + batch.length})...` });
            
            // Retry logic for adding tracks to playlist (robust against temporary YTM issues)
            const maxRetries = 3;
            let attempt = 0;
            let success = false;
            let lastError = null;
            let lastResult = null;
            
            const allowDuplicates = skipDuplicates === 'false';
            while (attempt < maxRetries) {
                try {
                    lastResult = await runPythonHelper({
                        action: 'add_tracks',
                        auth_path: YT_AUTH_PATH,
                        playlist_id: playlistId,
                        video_ids: batch,
                        duplicates: allowDuplicates
                    });
                    success = true;
                    break;
                } catch (err) {
                    attempt++;
                    lastError = err;
                    sendEvent('info', { message: `⚠️ Tentative ${attempt}/${maxRetries} échouée pour le lot ${b + 1} : ${err.message}. Nouvel essai dans ${attempt * 3}s...` });
                    // Exponential-like backoff wait: 3s, 6s...
                    await new Promise(r => setTimeout(r, attempt * 3000));
                }
            }
            
            if (!success) {
                throw new Error(`Impossible d'ajouter le lot ${b + 1} après ${maxRetries} tentatives. Dernière erreur : ${lastError.message}`);
            }
            
            // Check for partial failures (Liked Music individual song failures)
            let batchFailed = 0;
            const batchStatus = lastResult && lastResult.status;
            if (batchStatus && batchStatus.failed && batchStatus.failed > 0) {
                batchFailed = batchStatus.failed;
                sendEvent('info', { message: `⚠️ ${batchFailed} titre(s) du lot ${b + 1} n'ont pas pu être aimés après 3 tentatives.` });
            }
            
            processedTracks += batch.length - batchFailed;
            const progress = Math.min(100, Math.round((processedTracks / videoIds.length) * 100));
            sendEvent('progress', { 
                added: processedTracks,
                total: videoIds.length,
                percent: progress,
                message: `Successfully transferred ${processedTracks} of ${videoIds.length} songs.`
            });
            
            // Subtle sleep to prevent rapid rate limiting
            await new Promise(r => setTimeout(r, 2000));
        }
        
        sendEvent('success', { message: 'Transfer completed successfully!' });
    } catch (err) {
        sendEvent('error', { error: err.message });
    } finally {
        res.end();
    }
});

// API: Clear all Liked Tracks on YT Music with progress updates via Server-Sent Events (SSE)
app.get('/api/ytmusic/clear-liked-stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    
    try {
        let attempts = 0;
        const maxAttempts = 3;
        let done = false;
        
        while (!done && attempts < maxAttempts) {
            attempts++;
            if (attempts > 1) {
                sendEvent('info', { message: `Vérification des titres restants (Passage ${attempts}/${maxAttempts})...` });
            } else {
                sendEvent('info', { message: 'Récupération de la liste des titres likés sur YouTube Music...' });
            }
            
            const response = await runPythonHelper({
                action: 'get_liked_tracks',
                auth_path: YT_AUTH_PATH
            });
            
            const tracks = response.tracks || [];
            const videoIds = tracks.map(t => t.videoId).filter(Boolean);
            
            if (videoIds.length === 0) {
                if (attempts === 1) {
                    sendEvent('success', { message: 'Aucun titre liké trouvé sur votre compte YouTube Music.' });
                } else {
                    sendEvent('success', { message: 'Tous les titres likés ont été supprimés avec succès !' });
                }
                done = true;
                break;
            }
            
            sendEvent('info', { message: `Passage ${attempts} : Trouvé ${videoIds.length} titres likés. Début de la suppression...` });
            
            // Batch unlikes (batchSize 100 works well)
            const batchSize = 100;
            const batches = [];
            for (let i = 0; i < videoIds.length; i += batchSize) {
                batches.push(videoIds.slice(i, i + batchSize));
            }
            
            let processedTracks = 0;
            for (let b = 0; b < batches.length; b++) {
                const batch = batches[b];
                const batchStartIndex = b * batchSize;
                sendEvent('info', { message: `Suppression du lot ${b + 1} sur ${batches.length} (titres ${batchStartIndex + 1}-${batchStartIndex + batch.length})...` });
                
                const maxRetries = 3;
                let attempt = 0;
                let success = false;
                let lastError = null;
                let lastResult = null;
                
                while (attempt < maxRetries) {
                    try {
                        lastResult = await runPythonHelper({
                            action: 'unlike_tracks',
                            auth_path: YT_AUTH_PATH,
                            video_ids: batch
                        });
                        success = true;
                        break;
                    } catch (err) {
                        attempt++;
                        lastError = err;
                        sendEvent('info', { message: `⚠️ Tentative ${attempt}/${maxRetries} échouée pour le lot ${b + 1} de suppression : ${err.message}. Nouvel essai dans ${attempt * 3}s...` });
                        await new Promise(r => setTimeout(r, attempt * 3000));
                    }
                }
                
                if (!success) {
                    throw new Error(`Impossible de supprimer le lot ${b + 1} après ${maxRetries} tentatives. Dernière erreur : ${lastError.message}`);
                }
                
                let batchFailed = 0;
                const batchStatus = lastResult && lastResult.status;
                if (batchStatus && batchStatus.failed && batchStatus.failed > 0) {
                    batchFailed = batchStatus.failed;
                    sendEvent('info', { message: `⚠️ ${batchFailed} titre(s) du lot ${b + 1} n'ont pas pu être supprimés après 3 tentatives.` });
                }
                
                processedTracks += batch.length - batchFailed;
                const progress = Math.min(100, Math.round((processedTracks / videoIds.length) * 100));
                sendEvent('progress', { 
                    added: processedTracks,
                    total: videoIds.length,
                    percent: progress,
                    message: `Passage ${attempts} : ${processedTracks} titres sur ${videoIds.length} traités.`
                });
                
                // Subtle sleep to prevent rapid rate limiting
                await new Promise(r => setTimeout(r, 1000));
            }
            
            // Wait 3 seconds before next check/pass to let YouTube servers catch up
            if (attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 3000));
            }
        }
        
        if (!done) {
            sendEvent('success', { message: 'Le processus est terminé. Si certains titres restent encore aimés (dû aux limites de YouTube), vous pouvez relancer le nettoyage.' });
        }
    } catch (err) {
        sendEvent('error', { error: err.message });
    } finally {
        res.end();
    }
});

// API: Fetch Playlists from Spotify
app.get('/api/spotify/playlists', async (req, res) => {
    try {
        const token = await getSpotifyToken();
        let playlists = [];
        let url = 'https://api.spotify.com/v1/me/playlists?limit=50';
        
        while (url) {
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const items = response.data.items.map(item => ({
                id: item.id,
                title: item.name
            }));
            
            playlists = playlists.concat(items);
            url = response.data.next;
        }
        
        res.json({ success: true, playlists });
    } catch (e) {
        handleSpotifyError(e, res);
    }
});

// API: Create Playlist on Spotify
app.post('/api/spotify/playlists', async (req, res) => {
    const { title, description } = req.body;
    try {
        const token = await getSpotifyToken();
        
        // 1. Get user profile to find user ID
        const meResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userId = meResponse.data.id;
        
        // 2. Create playlist
        const createResponse = await axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            name: title,
            description: description || 'Transfert depuis YouTube Music',
            public: false
        }, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        res.json({ success: true, playlistId: createResponse.data.id });
    } catch (e) {
        handleSpotifyError(e, res);
    }
});

// API: Get Tracks of a Spotify Playlist (or Liked Songs)
app.get('/api/spotify/playlists/:id/tracks', async (req, res) => {
    const playlistId = req.params.id;
    try {
        const token = await getSpotifyToken();
        let tracks = [];
        let url = playlistId === 'LM' 
            ? 'https://api.spotify.com/v1/me/tracks?limit=50'
            : `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
            
        while (url) {
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const items = response.data.items.map(item => {
                if (!item.track) return null;
                return {
                    videoId: item.track.id, // Spotify ID mapped to videoId for consistency
                    title: item.track.name,
                    artist: item.track.artists.map(a => a.name).join(', '),
                    album: item.track.album?.name || '',
                    duration_seconds: Math.round(item.track.duration_ms / 1000)
                };
            }).filter(Boolean);
            
            tracks = tracks.concat(items);
            url = response.data.next;
        }
        
        res.json({ success: true, tracks });
    } catch (e) {
        handleSpotifyError(e, res);
    }
});

// API: Search track on Spotify and find best match
app.post('/api/spotify/search-track', async (req, res) => {
    const { track } = req.body; // YTM track object
    if (!track) {
        return res.status(400).json({ success: false, error: 'Track object required' });
    }
    
    try {
        const token = await getSpotifyToken();
        const query = `${track.title} ${track.artist}`;
        
        const axiosGetWithRetry = async (url, configOpts, retries = 5) => {
            let delay = 2000;
            for (let attempt = 0; attempt < retries; attempt++) {
                try {
                    return await axios.get(url, configOpts);
                } catch (error) {
                    if (error.response && error.response.status === 429) {
                        const retryAfter = error.response.headers['retry-after'] || error.response.headers['Retry-After'];
                        const waitTime = retryAfter ? (parseInt(retryAfter) + 1) * 1000 : delay;
                        console.warn(`⏳ [Rate Limit Backend] Pause de ${Math.round(waitTime/1000)}s...`);
                        await new Promise(r => setTimeout(r, waitTime));
                        delay *= 2;
                        continue;
                    }
                    throw error;
                }
            }
            return await axios.get(url, configOpts);
        };

        const response = await axiosGetWithRetry('https://api.spotify.com/v1/search', {
            params: {
                q: query,
                type: 'track',
                limit: 10
            },
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const spotifyTracks = response.data.tracks?.items || [];
        const candidates = spotifyTracks.map(t => {
            const artists = t.artists.map(a => a.name).join(', ');
            const thumbnail = t.album.images[0]?.url || t.album.images[1]?.url || '';
            return {
                videoId: t.id, // Spotify ID
                title: t.name,
                artist: artists,
                album: t.album.name,
                duration_seconds: Math.round(t.duration_ms / 1000),
                thumbnail
            };
        });
        
        // Score each candidate
        const scoredCandidates = candidates.map(c => {
            const score = calculateMatchScore(track, c);
            return { ...c, matchScore: score };
        });
        
        // Sort by match score descending
        scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
        
        const bestMatch = scoredCandidates[0] || null;
        
        res.json({
            success: true,
            bestMatch,
            candidates: scoredCandidates
        });
    } catch (e) {
        handleSpotifyError(e, res);
    }
});

// API: Transfer tracks to Spotify with progress updates via Server-Sent Events (SSE)
app.get('/api/spotify/transfer-stream', async (req, res) => {
    const { playlistId, trackData, skipDuplicates } = req.query; // trackData is JSON string array of Spotify IDs
    
    if (!playlistId || !trackData) {
        return res.status(400).send('Missing playlistId or trackData parameters');
    }
    
    let spotifyTrackIds = [];
    try {
        spotifyTrackIds = JSON.parse(trackData);
    } catch (e) {
        return res.status(400).send('Invalid trackData format (must be JSON array of strings)');
    }
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    
    try {
        const token = await getSpotifyToken();
        sendEvent('info', { message: `Lancement du transfert de ${spotifyTrackIds.length} titres vers Spotify...` });
        
        // Spotify has batch limits:
        // - Adding to a Playlist: max 100 tracks per request.
        // - Adding to Liked Songs (user library): max 50 tracks per request.
        const batchSize = playlistId === 'LM' ? 50 : 100;
        const batches = [];
        for (let i = 0; i < spotifyTrackIds.length; i += batchSize) {
            batches.push(spotifyTrackIds.slice(i, i + batchSize));
        }
        
        let processedTracks = 0;
        // Process batches in reverse order (oldest tracks batch first, newest tracks batch last)
        // to preserve chronological order on Spotify!
        for (let b = batches.length - 1; b >= 0; b--) {
            const batch = batches[b];
            const batchStartIndex = b * batchSize;
            sendEvent('info', { message: `Ajout du lot ${b + 1} sur ${batches.length} (titres ${batchStartIndex + 1}-${batchStartIndex + batch.length})...` });
            
            const maxRetries = 3;
            let attempt = 0;
            let success = false;
            let lastError = null;
            
            while (attempt < maxRetries) {
                try {
                    if (playlistId === 'LM') {
                        // Save tracks for current user (Liked Songs)
                        await axios.put('https://api.spotify.com/v1/me/tracks', {
                            ids: batch
                        }, {
                            headers: { 
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                    } else {
                        // Add items to playlist
                        const uris = batch.map(id => `spotify:track:${id}`);
                        await axios.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                            uris: uris
                        }, {
                            headers: { 
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                    }
                    success = true;
                    break;
                } catch (err) {
                    attempt++;
                    lastError = err;
                    const errorMsg = err.response?.data?.error?.message || err.message;
                    sendEvent('info', { message: `⚠️ Tentative ${attempt}/${maxRetries} échouée : ${errorMsg}. Nouvel essai dans ${attempt * 3}s...` });
                    await new Promise(r => setTimeout(r, attempt * 3000));
                }
            }
            
            if (!success) {
                throw new Error(`Impossible de transférer le lot ${b + 1} après ${maxRetries} tentatives. Dernière erreur : ${lastError.message}`);
            }
            
            processedTracks += batch.length;
            const progress = Math.min(100, Math.round((processedTracks / spotifyTrackIds.length) * 100));
            sendEvent('progress', { 
                added: processedTracks,
                total: spotifyTrackIds.length,
                percent: progress,
                message: `${processedTracks} titres sur ${spotifyTrackIds.length} ont été transférés sur Spotify.`
            });
            
            // Subtle sleep
            await new Promise(r => setTimeout(r, 1500));
        }
        
        sendEvent('success', { message: 'Transfert vers Spotify terminé avec succès !' });
    } catch (err) {
        sendEvent('error', { error: err.message });
    } finally {
        res.end();
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
    // Initialize profiles from existing files if config has none
    initializeProfiles().catch(err => console.error("Profile auto-import error:", err));
    
    // Open application in default web browser
    open(`http://127.0.0.1:${PORT}`).catch(err => {
        console.log(`Failed to auto-open browser: ${err.message}`);
    });
});
