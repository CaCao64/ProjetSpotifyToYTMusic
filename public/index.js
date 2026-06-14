// Application State
let appState = {
    spotifyConfigured: false,
    spotifyAuthorized: false,
    ytMusicConfigured: false,
    tracks: [], // Spotify liked tracks
    matches: {}, // videoId matches keyed by spotify track ID
    playlists: [] // user's YT Music playlists
};

let activeTab = 'spotify-to-yt'; // 'spotify-to-yt' or 'yt-to-spotify'
let ytState = {
    tracks: [], // YouTube Music tracks
    matches: {}, // Spotify matches keyed by YTM videoId
    playlists: [] // user's Spotify playlists
};

let currentOverrideTrackIndex = null;
let currentOverrideSelectedCandidate = null;

// DOM Elements
const el = {
    spotifyStatus: document.getElementById('spotify-status'),
    ytStatus: document.getElementById('yt-status'),
    spotifyClientId: document.getElementById('spotify-client-id'),
    spotifyClientSecret: document.getElementById('spotify-client-secret'),
    ytHeaders: document.getElementById('yt-headers'),
    btnSaveSpotify: document.getElementById('btn-save-spotify'),
    btnAuthSpotify: document.getElementById('btn-auth-spotify'),
    btnSaveYt: document.getElementById('btn-save-yt'),
    btnClearLiked: document.getElementById('btn-clear-liked'),
    ytToolsSection: document.getElementById('yt-tools-section'),
    
    // Dashboard Controls
    transferDashboard: document.getElementById('transfer-dashboard'),
    playlistSelect: document.getElementById('playlist-select'),
    newPlaylistName: document.getElementById('new-playlist-name'),
    btnLoadSpotifySongs: document.getElementById('btn-load-spotify-songs'),
    btnStartMatching: document.getElementById('btn-start-matching'),
    btnExecuteTransfer: document.getElementById('btn-execute-transfer'),
    settingSkipDuplicates: document.getElementById('setting-skip-duplicates'),
    settingReverseOrder: document.getElementById('setting-reverse-order'),
    
    // Stats
    summaryBar: document.getElementById('summary-bar'),
    statSpotifyCount: document.getElementById('stat-spotify-count'),
    statSelectedCount: document.getElementById('stat-selected-count'),
    statMatchedCount: document.getElementById('stat-matched-count'),
    statAvgConfidence: document.getElementById('stat-avg-confidence'),
    
    // Table
    tracksTableBody: document.getElementById('tracks-table-body'),
    selectAllTracks: document.getElementById('select-all-tracks'),
    tableSearch: document.getElementById('table-search'),
    
    // Modal
    overrideModal: document.getElementById('override-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelModal: document.getElementById('btn-cancel-modal'),
    btnConfirmModal: document.getElementById('btn-confirm-modal'),
    modalSpotifyInfo: document.getElementById('modal-spotify-info'),
    modalSearchInput: document.getElementById('modal-search-input'),
    btnModalSearch: document.getElementById('btn-modal-search'),
    modalCandidatesList: document.getElementById('modal-candidates-list'),
    
    // Progress Card
    progressCard: document.getElementById('transfer-progress-card'),
    progressTitle: document.getElementById('transfer-progress-title'),
    progressCounter: document.getElementById('transfer-progress-counter'),
    progressBarFill: document.getElementById('transfer-progress-bar-fill'),
    consoleLog: document.getElementById('transfer-console-log'),
    
    // Matching Progress Card
    matchingProgressCard: document.getElementById('matching-progress-card'),
    matchingProgressCounter: document.getElementById('matching-progress-counter'),
    matchingProgressBarFill: document.getElementById('matching-progress-bar-fill'),
    matchingProgressEstimation: document.getElementById('matching-progress-estimation')
};

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    checkStatus();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Saves & Auth
    el.btnSaveSpotify.addEventListener('click', saveSpotifyConfig);
    el.btnAuthSpotify.addEventListener('click', authorizeSpotify);
    el.btnSaveYt.addEventListener('click', saveYtConfig);
    if (el.btnClearLiked) {
        el.btnClearLiked.addEventListener('click', clearLikedSongs);
    }
    
    // Tabs Navigation
    const btnTabSpotifyToYt = document.getElementById('btn-tab-spotify-to-yt');
    const btnTabYtToSpotify = document.getElementById('btn-tab-yt-to-spotify');
    if (btnTabSpotifyToYt) btnTabSpotifyToYt.addEventListener('click', () => switchTab('spotify-to-yt'));
    if (btnTabYtToSpotify) btnTabYtToSpotify.addEventListener('click', () => switchTab('yt-to-spotify'));
    
    // Alternative Non-Premium Import listeners
    const fileInput = document.getElementById('import-json-file');
    const btnTriggerFile = document.getElementById('btn-trigger-file');
    const btnCopyScript = document.getElementById('btn-copy-script');
    
    if (btnTriggerFile && fileInput) {
        btnTriggerFile.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (activeTab === 'spotify-to-yt') {
                handleFileImport(e);
            } else {
                handleYtFileImport(e);
            }
        });
    }
    if (btnCopyScript) {
        btnCopyScript.addEventListener('click', copyScraperScript);
    }
    const btnCopyTransferScript = document.getElementById('btn-copy-transfer-script');
    if (btnCopyTransferScript) {
        btnCopyTransferScript.addEventListener('click', copyTransferScript);
    }
    const btnCopyScraperWarning = document.getElementById('btn-copy-scraper-script-warning');
    if (btnCopyScraperWarning) {
        btnCopyScraperWarning.addEventListener('click', copyScraperScript);
    }
    const btnCopyTransferWarning = document.getElementById('btn-copy-transfer-script-warning');
    if (btnCopyTransferWarning) {
        btnCopyTransferWarning.addEventListener('click', copyTransferScript);
    }
    
    // Dashboard actions (Spotify ➔ YTM)
    el.playlistSelect.addEventListener('change', handlePlaylistSelectChange);
    if (el.btnLoadSpotifySongs) {
        el.btnLoadSpotifySongs.addEventListener('click', loadSpotifySongs);
    }
    el.btnStartMatching.addEventListener('click', startMatching);
    el.btnExecuteTransfer.addEventListener('click', executeTransfer);
    if (el.settingReverseOrder) {
        el.settingReverseOrder.addEventListener('change', handleReverseOrderChange);
    }
    
    // Dashboard actions (YTM ➔ Spotify)
    const btnLoadYtSongs = document.getElementById('btn-load-yt-songs');
    const spotifyDestPlaylistSelect = document.getElementById('spotify-dest-playlist-select');
    const btnYtStartMatching = document.getElementById('btn-yt-start-matching');
    const btnYtExecuteTransfer = document.getElementById('btn-yt-execute-transfer');
    const ytSettingReverseOrder = document.getElementById('yt-setting-reverse-order');
    const ytSelectAllTracks = document.getElementById('yt-select-all-tracks');
    
    if (btnLoadYtSongs) btnLoadYtSongs.addEventListener('click', loadYtSongs);
    if (spotifyDestPlaylistSelect) spotifyDestPlaylistSelect.addEventListener('change', handleSpotifyDestPlaylistSelectChange);
    if (btnYtStartMatching) btnYtStartMatching.addEventListener('click', startYtMatching);
    if (btnYtExecuteTransfer) btnYtExecuteTransfer.addEventListener('click', executeTransferToSpotify);
    if (ytSettingReverseOrder) ytSettingReverseOrder.addEventListener('change', handleReverseOrderChangeYt);
    if (ytSelectAllTracks) ytSelectAllTracks.addEventListener('change', handleSelectAllChangeYt);
    
    // Table select all
    el.selectAllTracks.addEventListener('change', handleSelectAllChange);
    
    // Table search and filters (Spotify ➔ YTM)
    el.tableSearch.addEventListener('input', filterTracksTable);
    
    const filterScoreMin = document.getElementById('filter-score-min');
    const filterScoreMax = document.getElementById('filter-score-max');
    const filterOnlyRed = document.getElementById('filter-only-red');
    const btnResetFilters = document.getElementById('btn-reset-filters');
    
    if (filterScoreMin) filterScoreMin.addEventListener('input', filterTracksTable);
    if (filterScoreMax) filterScoreMax.addEventListener('input', filterTracksTable);
    if (filterOnlyRed) filterOnlyRed.addEventListener('change', filterTracksTable);
    if (btnResetFilters) {
        btnResetFilters.addEventListener('click', () => {
            if (filterScoreMin) filterScoreMin.value = 0;
            if (filterScoreMax) filterScoreMax.value = 100;
            if (filterOnlyRed) filterOnlyRed.checked = false;
            filterTracksTable();
        });
    }
    
    // Table search and filters (YTM ➔ Spotify)
    const ytTableSearch = document.getElementById('yt-table-search');
    const ytFilterScoreMin = document.getElementById('yt-filter-score-min');
    const ytFilterScoreMax = document.getElementById('yt-filter-score-max');
    const ytFilterOnlyRed = document.getElementById('yt-filter-only-red');
    const ytBtnResetFilters = document.getElementById('yt-btn-reset-filters');
    
    if (ytTableSearch) ytTableSearch.addEventListener('input', filterYtTracksTable);
    if (ytFilterScoreMin) ytFilterScoreMin.addEventListener('input', filterYtTracksTable);
    if (ytFilterScoreMax) ytFilterScoreMax.addEventListener('input', filterYtTracksTable);
    if (ytFilterOnlyRed) ytFilterOnlyRed.addEventListener('change', filterYtTracksTable);
    if (ytBtnResetFilters) {
        ytBtnResetFilters.addEventListener('click', () => {
            if (ytFilterScoreMin) ytFilterScoreMin.value = 0;
            if (ytFilterScoreMax) ytFilterScoreMax.value = 100;
            if (ytFilterOnlyRed) ytFilterOnlyRed.checked = false;
            filterYtTracksTable();
        });
    }
    
    const btnExportJson = document.getElementById('btn-export-json');
    if (btnExportJson) {
        btnExportJson.addEventListener('click', exportMatchesJSON);
    }
    
    const btnYtExportJson = document.getElementById('btn-yt-export-json');
    if (btnYtExportJson) {
        btnYtExportJson.addEventListener('click', exportYtMatchesJSON);
    }
    
    const btnImportResults = document.getElementById('btn-import-results');
    if (btnImportResults && fileInput) {
        btnImportResults.addEventListener('click', () => fileInput.click());
    }
    
    const btnYtImportResults = document.getElementById('btn-yt-import-results');
    if (btnYtImportResults && fileInput) {
        btnYtImportResults.addEventListener('click', () => fileInput.click());
    }
    
    // Modal controls
    el.btnCloseModal.addEventListener('click', closeModal);
    el.btnCancelModal.addEventListener('click', closeModal);
    el.btnConfirmModal.addEventListener('click', () => {
        if (activeTab === 'spotify-to-yt') {
            confirmOverride();
        } else {
            confirmOverrideYt();
        }
    });
    el.btnModalSearch.addEventListener('click', triggerModalSearchGlobal);
    el.modalSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') triggerModalSearchGlobal();
    });

    // Setup tabs switching for Spotify config
    const btnSetupTabWeb = document.getElementById('btn-setup-tab-web');
    const btnSetupTabOauth = document.getElementById('btn-setup-tab-oauth');
    const setupPanelWeb = document.getElementById('setup-panel-web');
    const setupPanelOauth = document.getElementById('setup-panel-oauth');
    
    if (btnSetupTabWeb && btnSetupTabOauth && setupPanelWeb && setupPanelOauth) {
        btnSetupTabWeb.addEventListener('click', () => {
            btnSetupTabWeb.classList.add('active');
            btnSetupTabWeb.style.background = '';
            btnSetupTabWeb.style.color = '';
            btnSetupTabOauth.classList.remove('active');
            btnSetupTabOauth.style.background = 'transparent';
            btnSetupTabOauth.style.color = 'var(--text-secondary)';
            
            setupPanelWeb.style.display = 'block';
            setupPanelOauth.style.display = 'none';
        });
        
        btnSetupTabOauth.addEventListener('click', () => {
            btnSetupTabOauth.classList.add('active');
            btnSetupTabOauth.style.background = '';
            btnSetupTabOauth.style.color = '';
            btnSetupTabWeb.classList.remove('active');
            btnSetupTabWeb.style.background = 'transparent';
            btnSetupTabWeb.style.color = 'var(--text-secondary)';
            
            setupPanelOauth.style.display = 'block';
            setupPanelWeb.style.display = 'none';
        });
    }

    // Save Spotify Web Player access token
    const btnSaveWebToken = document.getElementById('btn-save-web-token');
    const spotifyWebTokenInput = document.getElementById('spotify-web-token');
    if (btnSaveWebToken && spotifyWebTokenInput) {
        btnSaveWebToken.addEventListener('click', async () => {
            const token = spotifyWebTokenInput.value.trim();
            if (!token) {
                if (confirm('Voulez-vous supprimer le jeton Web Player enregistré ?')) {
                    await saveWebToken('');
                }
                return;
            }
            if (!token.startsWith('BQ')) {
                alert('Le jeton Spotify Web Player doit commencer par "BQ".');
                return;
            }
            await saveWebToken(token);
        });
    }
}

// Check configuration status
async function checkStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        appState.spotifyConfigured = data.spotifyConfigured;
        appState.spotifyAuthorized = data.spotifyAuthorized;
        appState.ytMusicConfigured = data.ytMusicConfigured;
        
        // Update Spotify elements
        if (data.spotifyConfigured) {
            el.spotifyStatus.classList.add('active');
            if (data.usingWebPlayerToken) {
                el.spotifyStatus.innerHTML = '<span class="dot"></span> Spotify Configuré (Jeton Web)';
                const tokenInput = document.getElementById('spotify-web-token');
                if (tokenInput && !tokenInput.value) {
                    tokenInput.value = data.spotifyWebPlayerToken || '';
                }
                
                // Show Web panel by default if using Web Player token
                const btnSetupTabWeb = document.getElementById('btn-setup-tab-web');
                const btnSetupTabOauth = document.getElementById('btn-setup-tab-oauth');
                const setupPanelWeb = document.getElementById('setup-panel-web');
                const setupPanelOauth = document.getElementById('setup-panel-oauth');
                if (btnSetupTabWeb && btnSetupTabOauth && setupPanelWeb && setupPanelOauth) {
                    btnSetupTabWeb.classList.add('active');
                    btnSetupTabWeb.style.background = '';
                    btnSetupTabWeb.style.color = '';
                    btnSetupTabOauth.classList.remove('active');
                    btnSetupTabOauth.style.background = 'transparent';
                    btnSetupTabOauth.style.color = 'var(--text-secondary)';
                    setupPanelWeb.style.display = 'block';
                    setupPanelOauth.style.display = 'none';
                }
            } else {
                el.spotifyStatus.innerHTML = '<span class="dot"></span> Spotify Configuré';
            }
            el.spotifyClientId.value = data.spotifyClientId;
            el.btnAuthSpotify.removeAttribute('disabled');
        } else {
            el.spotifyStatus.classList.remove('active');
            el.spotifyStatus.innerHTML = '<span class="dot"></span> Spotify Non Configuré';
            el.btnAuthSpotify.setAttribute('disabled', 'true');
        }
        
        // Update YT Music badge
        if (data.ytMusicConfigured) {
            el.ytStatus.classList.add('active');
            if (el.ytToolsSection) el.ytToolsSection.style.display = 'block';
        } else {
            el.ytStatus.classList.remove('active');
            if (el.ytToolsSection) el.ytToolsSection.style.display = 'none';
        }
        
        // Show dashboard if everything is configured
        if (data.spotifyAuthorized && data.ytMusicConfigured) {
            el.transferDashboard.style.display = 'block';
            loadPlaylists();
        } else {
            el.transferDashboard.style.display = 'none';
        }
    } catch (e) {
        console.error('Failed to fetch status:', e);
    }
}

// Save Spotify Web Player Access Token helper
async function saveWebToken(spotifyWebPlayerToken) {
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spotifyWebPlayerToken })
        });
        const data = await res.json();
        if (data.success) {
            alert(spotifyWebPlayerToken ? 'Jeton d\'accès Spotify Web Player enregistré !' : 'Jeton supprimé.');
            checkStatus();
        } else {
            alert('Erreur: ' + data.error);
        }
    } catch (e) {
        alert('Erreur de communication : ' + e.message);
    }
}

// Save Spotify Client info
async function saveSpotifyConfig() {
    const spotifyClientId = el.spotifyClientId.value.trim();
    const spotifyClientSecret = el.spotifyClientSecret.value.trim();
    
    if (!spotifyClientId || !spotifyClientSecret) {
        alert('Veuillez remplir le Client ID et le Client Secret Spotify.');
        return;
    }
    
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spotifyClientId, spotifyClientSecret })
        });
        const data = await res.json();
        if (data.success) {
            alert('Identifiants Spotify enregistrés ! Veuillez maintenant vous connecter.');
            checkStatus();
        } else {
            alert('Erreur: ' + data.error);
        }
    } catch (e) {
        alert('Erreur de communication : ' + e.message);
    }
}

// Redirect to Spotify Auth
function authorizeSpotify() {
    window.location.href = '/api/spotify/login';
}

// Save YT Music Headers
async function saveYtConfig() {
    const ytHeaders = el.ytHeaders.value.trim();
    if (!ytHeaders) {
        alert('Veuillez coller vos en-têtes (Headers) YouTube Music.');
        return;
    }
    
    el.btnSaveYt.setAttribute('disabled', 'true');
    el.btnSaveYt.textContent = 'Validation en cours...';
    
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ytHeaders })
        });
        const data = await res.json();
        if (data.success) {
            alert('Authentification YouTube Music réussie !');
            el.ytHeaders.value = ''; // Clear for safety
            checkStatus();
        } else {
            alert('Erreur d\'authentification : ' + data.error);
        }
    } catch (e) {
        alert('Erreur de communication : ' + e.message);
    } finally {
        el.btnSaveYt.removeAttribute('disabled');
        el.btnSaveYt.textContent = 'Sauvegarder l\'authentification';
    }
}

// Handle playlist selection change
function handlePlaylistSelectChange() {
    if (el.playlistSelect.value === '__new__') {
        el.newPlaylistName.style.display = 'inline-block';
        el.newPlaylistName.value = 'Spotify Liked Songs';
    } else {
        el.newPlaylistName.style.display = 'none';
    }
    validateReadyToTransfer();
}

// Load Playlists
async function loadPlaylists() {
    el.playlistSelect.innerHTML = '<option value="">Chargement des playlists...</option>';
    const ytSourceSelect = document.getElementById('yt-source-playlist-select');
    if (ytSourceSelect) ytSourceSelect.innerHTML = '<option value="LM">Titres Likés (Liked Music)</option>';
    try {
        const res = await fetch('/api/ytmusic/playlists');
        const data = await res.json();
        
        if (data.success) {
            appState.playlists = data.playlists;
            
            let html = '<option value="__new__">➕ [Créer une nouvelle playlist]</option>';
            let htmlYtSource = '<option value="LM">Titres Likés (Liked Music)</option>';
            data.playlists.forEach(p => {
                html += `<option value="${p.id}">${p.title}</option>`;
                htmlYtSource += `<option value="${p.id}">${p.title}</option>`;
            });
            
            el.playlistSelect.innerHTML = html;
            if (ytSourceSelect) ytSourceSelect.innerHTML = htmlYtSource;
            handlePlaylistSelectChange();
        } else {
            el.playlistSelect.innerHTML = '<option value="">Erreur de chargement</option>';
        }
    } catch (e) {
        el.playlistSelect.innerHTML = '<option value="">Erreur de communication</option>';
    }
}

// Load Spotify Tracks
async function loadSpotifySongs() {
    const warningBanner = document.getElementById('spotify-premium-warning-banner');
    if (el.btnLoadSpotifySongs) {
        el.btnLoadSpotifySongs.setAttribute('disabled', 'true');
        el.btnLoadSpotifySongs.textContent = 'Chargement...';
    }
    
    el.tracksTableBody.innerHTML = `
        <tr>
            <td colspan="4" class="table-loading-overlay">
                <div class="spinner"></div>
                <p>Récupération de vos titres Spotify en cours...</p>
            </td>
        </tr>
    `;
    
    try {
        const res = await fetch('/api/spotify/tracks');
        const data = await res.json();
        
        if (data.success) {
            if (warningBanner) warningBanner.style.display = 'none';
            // Note: Spotify returns tracks from newest to oldest. We preserve this exact order.
            appState.tracks = data.tracks;
            appState.matches = {};
            
            renderTracksTable();
            updateStats();
            
            el.btnStartMatching.removeAttribute('disabled');
        } else {
            const isExpired = data.isExpiredToken;
            const errorMsg = isExpired 
                ? "⚠️ Jeton d'accès Spotify Web expiré. Veuillez récupérer et copier un nouveau jeton dans le panneau de configuration."
                : "⚠️ API Spotify bloquée (Spotify Premium requis). Veuillez configurer le Jeton Web Player (Option alternative Sans Premium) dans le panneau de configuration.";
            
            if (warningBanner) warningBanner.style.display = 'block';
            el.tracksTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="table-loading-overlay">
                        <p style="color: var(--danger)">${errorMsg}</p>
                    </td>
                </tr>
            `;
        }
    } catch (e) {
        if (warningBanner) warningBanner.style.display = 'block';
        el.tracksTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="table-loading-overlay">
                    <p style="color: var(--danger)">⚠️ Erreur de communication : ${e.message}</p>
                </td>
            </tr>
        `;
    } finally {
        if (el.btnLoadSpotifySongs) {
            el.btnLoadSpotifySongs.removeAttribute('disabled');
            el.btnLoadSpotifySongs.textContent = '1. Recharger Spotify';
        }
    }
}

// Render Tracks Table
function renderTracksTable() {
    if (appState.tracks.length === 0) {
        el.tracksTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="table-loading-overlay">
                    <p>Aucun titre trouvé.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    appState.tracks.forEach((t, index) => {
        const match = appState.matches[t.id];
        let matchHtml = '<span class="text-muted">Non recherché</span>';
        let actionDisabled = 'disabled';
        
        if (match) {
            if (match.manual) {
                matchHtml = `
                    <div class="track-cell">
                        <img class="track-artwork" src="${match.thumbnail || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 style=%22background:%23334155%22></svg>'">
                        <div class="track-details">
                            <span class="track-name">${match.title}</span>
                            <span class="track-artist">${match.artist}</span>
                        </div>
                        <span class="match-badge high">Manuel 100%</span>
                    </div>
                `;
            } else if (match.bestMatch) {
                const score = Math.round(match.bestMatch.matchScore * 100);
                let badgeClass = 'low';
                if (score >= 80) badgeClass = 'high';
                else if (score >= 50) badgeClass = 'medium';
                
                matchHtml = `
                    <div class="track-cell">
                        <img class="track-artwork" src="${match.bestMatch.thumbnail || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 style=%22background:%23334155%22></svg>'">
                        <div class="track-details">
                            <span class="track-name">${match.bestMatch.title}</span>
                            <span class="track-artist">${match.bestMatch.artist}</span>
                        </div>
                        <span class="match-badge ${badgeClass}">${score}% Match</span>
                    </div>
                `;
            } else {
                matchHtml = '<span class="match-badge none">Aucun résultat</span>';
            }
            actionDisabled = '';
        }
        let rowClass = '';
        if (match) {
            if (match.manual) {
                // manual override is high confidence (no highlight)
            } else if (match.bestMatch) {
                const score = Math.round(match.bestMatch.matchScore * 100);
                if (score < 50) {
                    rowClass = 'low-confidence-row';
                }
            } else {
                rowClass = 'no-match-row';
            }
        }
        
        // Format duration
        const minutes = Math.floor(t.duration_ms / 60000);
        const seconds = Math.floor((t.duration_ms % 60000) / 1000).toString().padStart(2, '0');
        const durationStr = `${minutes}:${seconds}`;
        
        html += `
            <tr data-index="${index}" id="row-${t.id}" class="${rowClass}">
                <td class="col-cb">
                    <input type="checkbox" class="track-selector" checked onchange="updateSelectedCount()">
                </td>
                <td class="col-spotify">
                    <div class="track-cell">
                        <img class="track-artwork" src="${t.thumbnail}">
                        <div class="track-details">
                            <span class="track-name">${t.title}</span>
                            <span class="track-artist">${t.artist} • <span class="text-muted">${durationStr}</span></span>
                            <span class="track-album">${t.album}</span>
                        </div>
                    </div>
                </td>
                <td class="col-match" id="match-cell-${t.id}">
                    ${matchHtml}
                </td>
                <td class="col-action">
                    <div style="display: flex; gap: 0.4rem; justify-content: center;">
                        <button class="btn btn-secondary btn-edit-match" style="padding: 0.35rem 0.6rem; font-size: 0.75rem; width: auto; flex-grow: 1;" ${actionDisabled} onclick="openOverrideModal(${index})">Corriger</button>
                        <button class="btn btn-secondary btn-delete-track" style="padding: 0.35rem 0.6rem; font-size: 0.75rem; background-color: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: var(--danger); width: auto; flex-grow: 1;" onclick="deleteTrack(${index})">Supprimer</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    el.tracksTableBody.innerHTML = html;
    filterTracksTable(); // Apply search if any
}

// Global scope bindings for inline onchanges
window.updateSelectedCount = function() {
    updateStats();
    validateReadyToTransfer();
};

// Filter table based on search input, score range, and status filters
function filterTracksTable() {
    const query = el.tableSearch.value.toLowerCase().trim();
    const minScoreInput = document.getElementById('filter-score-min');
    const maxScoreInput = document.getElementById('filter-score-max');
    const onlyRedInput = document.getElementById('filter-only-red');
    
    const minScore = minScoreInput ? (parseInt(minScoreInput.value) || 0) : 0;
    const maxScore = maxScoreInput ? (parseInt(maxScoreInput.value) || 100) : 100;
    const onlyRed = onlyRedInput ? onlyRedInput.checked : false;
    
    const rows = el.tracksTableBody.getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.querySelector('.table-loading-overlay')) continue;
        
        const index = parseInt(row.getAttribute('data-index'));
        const track = appState.tracks[index];
        if (!track) continue;
        
        // Match status text search
        const trackText = row.querySelector('.col-spotify').innerText.toLowerCase();
        const matchesText = trackText.includes(query);
        
        // Calculate current match score (or status)
        const match = appState.matches[track.id];
        const isSearching = match && match.searching;
        
        let score = -1; // Non recherché
        if (match && !isSearching) {
            if (match.manual) {
                score = 100;
            } else if (match.bestMatch) {
                score = Math.round(match.bestMatch.matchScore * 100);
            } else {
                score = 0; // Aucun résultat
            }
        }
        
        const hasScoreOrColorFilter = (minScore > 0) || (maxScore < 100) || onlyRed;
        
        // Score range logic
        let matchesScore = false;
        if (isSearching || score === -1) {
            // Unsearched or currently searching items only match if no score/color filter is active
            matchesScore = !hasScoreOrColorFilter;
        } else {
            matchesScore = (score >= minScore && score <= maxScore);
        }
        
        // Only red (low confidence / no result) logic
        // Red matches are: score === 0 (Aucun résultat) or (score > 0 && score < 50)
        let matchesRed = true;
        if (onlyRed) {
            if (isSearching || score === -1) {
                matchesRed = false; // Cannot be confirmed as low confidence until done
            } else {
                matchesRed = (score >= 0 && score < 50);
            }
        }
        
        if (matchesText && matchesScore && matchesRed) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
}

// Update stats count bar
function updateStats() {
    el.summaryBar.style.display = 'grid';
    el.statSpotifyCount.textContent = appState.tracks.length;
    
    // Selected Count
    const selectors = document.querySelectorAll('input.track-selector');
    let selectedCount = 0;
    selectors.forEach(s => { if (s.checked) selectedCount++; });
    el.statSelectedCount.textContent = selectedCount;
    
    // Matched stats
    let matchedCount = 0;
    let totalScore = 0;
    
    Object.keys(appState.matches).forEach(id => {
        const m = appState.matches[id];
        if (m && (m.bestMatch || m.manual)) {
            matchedCount++;
            if (m.manual) {
                totalScore += 1.0;
            } else {
                totalScore += m.bestMatch.matchScore;
            }
        }
    });
    
    el.statMatchedCount.textContent = matchedCount;
    
    const avgConfidence = matchedCount > 0 ? Math.round((totalScore / matchedCount) * 100) : 0;
    el.statAvgConfidence.textContent = `${avgConfidence}%`;
    
    if (avgConfidence >= 80) {
        el.statAvgConfidence.className = 'stat-value success';
    } else if (avgConfidence >= 50) {
        el.statAvgConfidence.className = 'stat-value warning';
    } else {
        el.statAvgConfidence.className = 'stat-value danger';
    }
}

// Enable select all
function handleSelectAllChange() {
    const checked = el.selectAllTracks.checked;
    const selectors = document.querySelectorAll('input.track-selector');
    selectors.forEach(s => {
        // Only set if parent row is visible (not filtered out by search)
        const row = s.closest('tr');
        if (row && row.style.display !== 'none') {
            s.checked = checked;
        }
    });
    updateStats();
    validateReadyToTransfer();
}

// Reverse the order of the tracks array
function handleReverseOrderChange() {
    appState.tracks.reverse();
    
    // Also reverse the indices in the DOM rows if needed, or simply re-render the table
    // Re-rendering is clean and safe, but we must preserve existing matches.
    // Since appState.matches is keyed by track.id, they are preserved automatically!
    renderTracksTable();
    updateStats();
}

// Delete a track from the list
window.deleteTrack = function(index) {
    const track = appState.tracks[index];
    if (!track) return;
    
    if (confirm(`Voulez-vous retirer "${track.title}" de la liste de transfert ?`)) {
        appState.tracks.splice(index, 1);
        if (appState.matches[track.id]) {
            delete appState.matches[track.id];
        }
        
        // Hide transfer progress if visible
        if (el.progressCard) el.progressCard.style.display = 'none';
        
        renderTracksTable();
        updateStats();
        validateReadyToTransfer();
    }
}

// Start automatic matching with concurrency control
async function startMatching() {
    // Hide transfer progress if visible
    if (el.progressCard) el.progressCard.style.display = 'none';
    
    if (el.btnLoadSpotifySongs) el.btnLoadSpotifySongs.setAttribute('disabled', 'true');
    el.btnStartMatching.setAttribute('disabled', 'true');
    el.btnStartMatching.textContent = 'Matching en cours...';
    
    // Find visible & checked tracks
    const selectors = document.querySelectorAll('input.track-selector');
    const tracksToMatch = [];
    
    selectors.forEach((s) => {
        const row = s.closest('tr');
        const index = parseInt(row.getAttribute('data-index'));
        if (s.checked) {
            tracksToMatch.push({
                track: appState.tracks[index],
                index
            });
        }
    });
    
    if (tracksToMatch.length === 0) {
        alert('Veuillez cocher au moins un titre à matcher.');
        el.btnStartMatching.removeAttribute('disabled');
        el.btnStartMatching.textContent = '1. Lancer la recherche';
        if (el.btnLoadSpotifySongs) el.btnLoadSpotifySongs.removeAttribute('disabled');
        return;
    }
    
    // Show matching progress card
    if (el.matchingProgressCard) {
        el.matchingProgressCard.style.display = 'block';
        if (el.matchingProgressBarFill) el.matchingProgressBarFill.style.width = '0%';
        if (el.matchingProgressCounter) el.matchingProgressCounter.textContent = `0 / ${tracksToMatch.length}`;
        if (el.matchingProgressEstimation) el.matchingProgressEstimation.textContent = 'Calcul de l\'estimation...';
    }
    
    let processedTracks = 0;
    const totalTracks = tracksToMatch.length;
    const matchingStartTime = Date.now();
    let activeSearches = 0;
    
    const executeSearch = async (item) => {
        const track = item.track;
        const cell = document.getElementById(`match-cell-${track.id}`);
        cell.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
        
        // Mark as searching in state
        appState.matches[track.id] = {
            searching: true
        };
        
        activeSearches++;
        try {
            const res = await fetch('/api/ytmusic/search-track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ track })
            });
            const data = await res.json();
            
            if (data.success) {
                appState.matches[track.id] = {
                    bestMatch: data.bestMatch,
                    candidates: data.candidates,
                    manual: false,
                    searching: false
                };
                
                // Update table cell and row styling
                const row = document.getElementById(`row-${track.id}`);
                if (row) {
                    const btnEdit = row.querySelector('.btn-edit-match');
                    if (btnEdit) btnEdit.removeAttribute('disabled');
                    
                    // Reset row confidence class
                    row.className = '';
                    
                    if (data.bestMatch) {
                        const score = Math.round(data.bestMatch.matchScore * 100);
                        let badgeClass = 'low';
                        if (score >= 80) badgeClass = 'high';
                        else if (score >= 50) badgeClass = 'medium';
                        
                        if (score < 50) {
                            row.className = 'low-confidence-row';
                        }
                        
                        cell.innerHTML = `
                            <div class="track-cell">
                                <img class="track-artwork" src="${data.bestMatch.thumbnail || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 style=%22background:%23334155%22></svg>'">
                                <div class="track-details">
                                    <span class="track-name">${data.bestMatch.title}</span>
                                    <span class="track-artist">${data.bestMatch.artist}</span>
                                </div>
                                <span class="match-badge ${badgeClass}">${score}% Match</span>
                            </div>
                        `;
                    } else {
                        row.className = 'no-match-row';
                        cell.innerHTML = '<span class="match-badge none">Aucun résultat</span>';
                    }
                }
            } else {
                appState.matches[track.id] = {
                    bestMatch: null,
                    candidates: [],
                    manual: false,
                    searching: false,
                    error: true
                };
                const row = document.getElementById(`row-${track.id}`);
                if (row) row.className = 'no-match-row';
                cell.innerHTML = `<span class="match-badge low">Erreur</span>`;
            }
        } catch (e) {
            appState.matches[track.id] = {
                bestMatch: null,
                candidates: [],
                manual: false,
                searching: false,
                error: true
            };
            const row = document.getElementById(`row-${track.id}`);
            if (row) row.className = 'no-match-row';
            cell.innerHTML = `<span class="match-badge low">Erreur Réseau</span>`;
        } finally {
            activeSearches--;
            processedTracks++;
            
            // Update matching progress bar and counter
            const percent = Math.round((processedTracks / totalTracks) * 100);
            if (el.matchingProgressBarFill) el.matchingProgressBarFill.style.width = `${percent}%`;
            if (el.matchingProgressCounter) el.matchingProgressCounter.textContent = `${processedTracks} / ${totalTracks}`;
            
            // Dynamic time estimation
            const elapsedTime = Date.now() - matchingStartTime;
            const avgTimePerTrack = elapsedTime / processedTracks;
            const remainingTracks = totalTracks - processedTracks;
            const estimatedTimeRemainingMs = remainingTracks * avgTimePerTrack;
            
            let timeString = '';
            if (remainingTracks === 0) {
                timeString = 'Recherche terminée !';
            } else {
                const totalSeconds = Math.round(estimatedTimeRemainingMs / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                if (minutes > 0) {
                    timeString = `Temps estimé restant : ${minutes} min ${seconds.toString().padStart(2, '0')} s`;
                } else {
                    timeString = `Temps estimé restant : ${seconds} s`;
                }
            }
            if (el.matchingProgressEstimation) el.matchingProgressEstimation.textContent = timeString;
            
            updateStats();
            filterTracksTable(); // Apply current score and text filters dynamically
        }
    };
    
    // Process tracks with a strict delay between search starts (e.g. 400ms)
    // This provides a smooth, constant rate of 2.5 requests per second
    const DELAY_BETWEEN_REQUESTS = 400; 
    for (let i = 0; i < tracksToMatch.length; i++) {
        // Launch search asynchronously (no await here)
        executeSearch(tracksToMatch[i]);
        
        // Wait 400ms before starting the next search
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_REQUESTS));
    }
    
    // Wait for all remaining active searches to finish
    while (activeSearches > 0) {
        await new Promise(r => setTimeout(r, 100));
    }
    
    el.btnStartMatching.removeAttribute('disabled');
    el.btnStartMatching.textContent = '1. Relancer la recherche';
    if (el.btnLoadSpotifySongs) el.btnLoadSpotifySongs.removeAttribute('disabled');
    
    // Hide matching progress card after a short delay
    setTimeout(() => {
        if (el.matchingProgressCard) {
            el.matchingProgressCard.style.display = 'none';
        }
    }, 4000);
    
    validateReadyToTransfer();
}

// Validate if transfer is ready to run
function validateReadyToTransfer() {
    const playlistSelected = el.playlistSelect.value !== '';
    const hasMatches = Object.keys(appState.matches).length > 0;
    
    const selectors = document.querySelectorAll('input.track-selector');
    let hasSelected = false;
    selectors.forEach(s => { if (s.checked) hasSelected = true; });
    
    if (playlistSelected && hasMatches && hasSelected) {
        el.btnExecuteTransfer.removeAttribute('disabled');
    } else {
        el.btnExecuteTransfer.setAttribute('disabled', 'true');
    }
}

// Modal Open for Manual Overriding
window.openOverrideModal = function(index) {
    currentOverrideTrackIndex = index;
    currentOverrideSelectedCandidate = null;
    el.btnConfirmModal.setAttribute('disabled', 'true');
    
    const track = appState.tracks[index];
    const match = appState.matches[track.id];
    
    // Spotify Track details reference
    const minutes = Math.floor(track.duration_ms / 60000);
    const seconds = Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0');
    el.modalSpotifyInfo.innerHTML = `
        <img class="track-artwork" src="${track.thumbnail}" style="width: 50px; height: 50px;">
        <div class="track-details">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--spotify-green); text-transform: uppercase; letter-spacing: 0.05em;">Référence Spotify</span>
            <span class="track-name" style="font-size: 1rem;">${track.title}</span>
            <span class="track-artist" style="font-size: 0.85rem;">${track.artist} • ${minutes}:${seconds}</span>
        </div>
    `;
    
    // Pre-populate search input and trigger search
    el.modalSearchInput.value = `${track.title} ${track.artist}`;
    el.overrideModal.classList.add('active');
    
    triggerModalSearchGlobal();
};

// Modal Search
async function triggerModalSearchGlobal() {
    const query = el.modalSearchInput.value.trim();
    if (!query) return;
    
    el.modalCandidatesList.innerHTML = '<div class="spinner" style="margin: 1.5rem auto; width: 30px; height: 30px; border-width: 2px;"></div>';
    
    try {
        if (activeTab === 'spotify-to-yt') {
            const track = appState.tracks[currentOverrideTrackIndex];
            const res = await fetch('/api/ytmusic/search-track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    track: {
                        title: track.title,
                        artist: track.artist,
                        duration_ms: track.duration_ms
                    }
                })
            });
            const data = await res.json();
            
            if (data.success && data.candidates) {
                renderModalCandidates(data.candidates);
            } else {
                el.modalCandidatesList.innerHTML = '<p style="text-align: center; font-size: 0.85rem; color: var(--danger);">Aucun résultat trouvé.</p>';
            }
        } else {
            const track = ytState.tracks[currentOverrideTrackIndex];
            const res = await fetch('/api/spotify/search-track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    track: {
                        title: track.title,
                        artist: track.artist,
                        duration_seconds: track.duration_seconds
                    }
                })
            });
            const data = await res.json();
            
            if (data.success && data.candidates) {
                renderModalCandidates(data.candidates);
            } else {
                const msg = data.isExpiredToken ? "Jeton d'accès expiré. Veuillez renouveler le jeton." : "Aucun résultat trouvé.";
                el.modalCandidatesList.innerHTML = `<p style="text-align: center; font-size: 0.85rem; color: var(--danger);">${msg}</p>`;
            }
        }
    } catch (e) {
        el.modalCandidatesList.innerHTML = '<p style="text-align: center; font-size: 0.85rem; color: var(--danger);">Erreur lors de la recherche.</p>';
    }
}

// Render Modal Candidate Results
function renderModalCandidates(candidates) {
    if (candidates.length === 0) {
        el.modalCandidatesList.innerHTML = '<p style="text-align: center; font-size: 0.85rem; color: var(--text-secondary);">Aucun résultat.</p>';
        return;
    }
    
    let html = '';
    candidates.forEach((c, index) => {
        const min = Math.floor(c.duration_seconds / 60);
        const sec = (c.duration_seconds % 60).toString().padStart(2, '0');
        const durationStr = `${min}:${sec}`;
        const score = Math.round(c.matchScore * 100);
        
        let scoreBadge = '';
        if (score >= 80) scoreBadge = `<span class="match-badge high">${score}% Match</span>`;
        else if (score >= 50) scoreBadge = `<span class="match-badge warning">${score}% Match</span>`;
        else scoreBadge = `<span class="match-badge low">${score}% Match</span>`;
        
        html += `
            <div class="candidate-item" data-id="${c.videoId}" onclick="selectCandidate(this, ${index})">
                <div class="track-cell">
                    <img class="track-artwork" src="${c.thumbnail}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 style=%22background:%23334155%22></svg>'">
                    <div class="track-details">
                        <span class="track-name">${c.title}</span>
                        <span class="track-artist">${c.artist} • <span class="text-secondary">${durationStr}</span></span>
                        <span class="track-album" style="font-size: 0.7rem; color: var(--text-muted);">${c.album || ''}</span>
                    </div>
                </div>
                <div>
                    ${scoreBadge}
                </div>
            </div>
        `;
    });
    
    el.modalCandidatesList.innerHTML = html;
    
    // Bind candidates data to window so selectCandidate can read it
    window.modalCandidatesData = candidates;
}

// Candidate item selection click
window.selectCandidate = function(element, index) {
    // Clear other selected styles
    const items = el.modalCandidatesList.querySelectorAll('.candidate-item');
    items.forEach(i => i.classList.remove('selected'));
    
    element.classList.add('selected');
    currentOverrideSelectedCandidate = window.modalCandidatesData[index];
    el.btnConfirmModal.removeAttribute('disabled');
};

// Confirm manual override selection
function confirmOverride() {
    if (!currentOverrideSelectedCandidate || currentOverrideTrackIndex === null) return;
    
    const track = appState.tracks[currentOverrideTrackIndex];
    
    // Update local state match with override details
    appState.matches[track.id] = {
        bestMatch: null,
        candidates: appState.matches[track.id]?.candidates || [],
        manual: true,
        videoId: currentOverrideSelectedCandidate.videoId,
        title: currentOverrideSelectedCandidate.title,
        artist: currentOverrideSelectedCandidate.artist,
        thumbnail: currentOverrideSelectedCandidate.thumbnail
    };
    
    // Hide transfer progress if visible
    if (el.progressCard) el.progressCard.style.display = 'none';
    
    // Rerender table and stats
    renderTracksTable();
    updateStats();
    
    closeModal();
    validateReadyToTransfer();
}

// Close Modal
function closeModal() {
    el.overrideModal.classList.remove('active');
    currentOverrideTrackIndex = null;
    currentOverrideSelectedCandidate = null;
}

// Log message to the console panel
function logToConsole(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    el.consoleLog.appendChild(entry);
    el.consoleLog.scrollTop = el.consoleLog.scrollHeight;
}

// Execute playlist creation and track additions
async function executeTransfer() {
    // Lock controls
    el.btnExecuteTransfer.setAttribute('disabled', 'true');
    el.btnStartMatching.setAttribute('disabled', 'true');
    if (el.btnLoadSpotifySongs) el.btnLoadSpotifySongs.setAttribute('disabled', 'true');
    
    el.progressCard.style.display = 'block';
    el.consoleLog.innerHTML = '';
    el.progressBarFill.style.width = '0%';
    el.progressCounter.textContent = '0 / 0';
    
    logToConsole('Préparation du transfert...', 'info');
    
    let playlistId = el.playlistSelect.value;
    
    // 1. Create Playlist if new is selected
    if (playlistId === '__new__') {
        const title = el.newPlaylistName.value.trim() || 'Spotify Liked Songs';
        logToConsole(`Création de la nouvelle playlist YT Music : "${title}"...`, 'info');
        
        try {
            const res = await fetch('/api/ytmusic/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title,
                    description: 'Transfere depuis Spotify avec SpotifyToYTMusic App'
                })
            });
            const data = await res.json();
            if (data.success && data.playlistId) {
                playlistId = data.playlistId;
                logToConsole(`Playlist créée avec succès ! ID: ${playlistId}`, 'success');
            } else {
                throw new Error(data.error || 'Erreur inconnue de création de playlist');
            }
        } catch (e) {
            logToConsole(`Échec de création de la playlist : ${e.message}`, 'error');
            unlockControls();
            return;
        }
    }
    
    // 2. Fetch tracks currently in target playlist (to skip duplicates if checked)
    let existingVideoIds = new Set();
    if (el.settingSkipDuplicates.checked) {
        logToConsole('Récupération des titres existants dans la playlist de destination pour éviter les doublons...', 'info');
        try {
            const res = await fetch(`/api/ytmusic/playlists/${playlistId}/tracks`);
            const data = await res.json();
            if (data.success && data.tracks) {
                data.tracks.forEach(t => {
                    if (t.videoId) existingVideoIds.add(t.videoId);
                });
                logToConsole(`${existingVideoIds.size} titres déjà présents trouvés.`, 'info');
            } else {
                logToConsole('Impossible de lire les titres existants, aucun doublon ne sera évité.', 'warning');
            }
        } catch (e) {
            logToConsole('Erreur lors de la récupération des titres existants, pas de déduplication.', 'warning');
        }
    }
    
    // 3. Collect videoIds of matched tracks (in order: newest to oldest)
    const selectors = document.querySelectorAll('input.track-selector');
    const finalVideoIds = [];
    const skippedTracks = [];
    const addedVideoIdsInTransfer = new Set();
    const skipDuplicates = el.settingSkipDuplicates.checked;
    
    selectors.forEach((s) => {
        const row = s.closest('tr');
        const index = parseInt(row.getAttribute('data-index'));
        if (s.checked) {
            const track = appState.tracks[index];
            const match = appState.matches[track.id];
            
            if (match) {
                const videoId = match.manual ? match.videoId : match.bestMatch?.videoId;
                if (videoId) {
                    const isDuplicate = skipDuplicates && (existingVideoIds.has(videoId) || addedVideoIdsInTransfer.has(videoId));
                    if (isDuplicate) {
                        skippedTracks.push(track.title);
                    } else {
                        finalVideoIds.push(videoId);
                        addedVideoIdsInTransfer.add(videoId);
                    }
                }
            }
        }
    });
    
    if (skippedTracks.length > 0) {
        logToConsole(`${skippedTracks.length} titres déjà présents ignorés pour éviter les doublons.`, 'info');
    }
    
    if (finalVideoIds.length === 0) {
        logToConsole('Aucun titre à transférer (tous ont été ignorés ou aucun n\'a de correspondance).', 'warning');
        alert('Aucun titre à transférer.');
        unlockControls();
        return;
    }
    
    logToConsole(`Lancement du transfert de ${finalVideoIds.length} titres...`, 'info');
    
    // 4. Start Server-Sent Events (SSE) Stream
    const eventSourceUrl = `/api/ytmusic/transfer-stream?playlistId=${playlistId}&skipDuplicates=${skipDuplicates}&trackData=${encodeURIComponent(JSON.stringify(finalVideoIds))}`;
    const source = new EventSource(eventSourceUrl);
    
    source.addEventListener('info', (event) => {
        const data = JSON.parse(event.data);
        logToConsole(data.message, 'info');
    });
    
    source.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        el.progressBarFill.style.width = `${data.percent}%`;
        el.progressCounter.textContent = `${data.added} / ${data.total}`;
        logToConsole(data.message, 'success');
    });
    
    source.addEventListener('success', (event) => {
        const data = JSON.parse(event.data);
        logToConsole(data.message, 'success');
        el.progressBarFill.style.width = '100%';
        source.close();
        
        alert('Transfert terminé avec succès !');
        loadPlaylists(); // Refresh playlist dropdown
        unlockControls();
    });
    
    source.addEventListener('error', (event) => {
        const data = event.data ? JSON.parse(event.data) : { error: 'Erreur de connexion SSE' };
        logToConsole(`Erreur durant le transfert : ${data.error}`, 'error');
        source.close();
        unlockControls();
    });
}

async function clearLikedSongs() {
    if (!confirm("⚠️ ATTENTION : Voulez-vous vraiment supprimer TOUS les titres likés de votre compte YouTube Music ?\n\nCette action est irréversible et retirera le \"J'aime\" de tous les morceaux de votre bibliothèque.")) {
        return;
    }
    
    const confirmation = prompt("Pour confirmer cette action destructrice, veuillez saisir le mot 'SUPPRIMER' en toutes lettres :");
    if (confirmation !== 'SUPPRIMER') {
        alert("Action annulée : confirmation incorrecte.");
        return;
    }
    
    // Lock controls
    if (el.btnExecuteTransfer) el.btnExecuteTransfer.setAttribute('disabled', 'true');
    if (el.btnStartMatching) el.btnStartMatching.setAttribute('disabled', 'true');
    if (el.btnLoadSpotifySongs) el.btnLoadSpotifySongs.setAttribute('disabled', 'true');
    if (el.btnClearLiked) el.btnClearLiked.setAttribute('disabled', 'true');
    
    el.progressCard.style.display = 'block';
    el.consoleLog.innerHTML = '';
    el.progressBarFill.style.width = '0%';
    el.progressCounter.textContent = '0 / 0';
    el.progressTitle.textContent = 'Suppression des titres likés...';
    
    logToConsole('Préparation de la suppression des titres likés...', 'info');
    
    const eventSourceUrl = '/api/ytmusic/clear-liked-stream';
    const source = new EventSource(eventSourceUrl);
    
    source.addEventListener('info', (event) => {
        const data = JSON.parse(event.data);
        logToConsole(data.message, 'info');
    });
    
    source.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        el.progressBarFill.style.width = `${data.percent}%`;
        el.progressCounter.textContent = `${data.added} / ${data.total}`;
        logToConsole(data.message, 'success');
    });
    
    source.addEventListener('success', (event) => {
        const data = JSON.parse(event.data);
        logToConsole(data.message, 'success');
        el.progressBarFill.style.width = '100%';
        source.close();
        
        alert('Suppression terminée avec succès !');
        el.progressTitle.textContent = 'Transfert en cours...'; // Reset title for next transfers
        unlockControls();
    });
    
    source.addEventListener('error', (event) => {
        const data = event.data ? JSON.parse(event.data) : { error: 'Erreur de connexion SSE' };
        logToConsole(`Erreur durant la suppression : ${data.error}`, 'error');
        source.close();
        el.progressTitle.textContent = 'Transfert en cours...'; // Reset title
        unlockControls();
    });
}

// Enable controls back
function unlockControls() {
    el.btnExecuteTransfer.removeAttribute('disabled');
    el.btnStartMatching.removeAttribute('disabled');
    if (el.btnLoadSpotifySongs) el.btnLoadSpotifySongs.removeAttribute('disabled');
    if (el.btnClearLiked) el.btnClearLiked.removeAttribute('disabled');
}

// Alternative Import Functions (No-Premium)
function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const importedData = JSON.parse(evt.target.result);
            if (!Array.isArray(importedData)) {
                throw new Error("Le format du fichier n'est pas un tableau de titres.");
            }
            
            let tracks = [];
            let matches = {};
            
            // Check if it is the exported match results format or raw list
            if (importedData.length > 0 && importedData[0].spotify) {
                // Exported matches format
                importedData.forEach(item => {
                    if (item.spotify) {
                        tracks.push(item.spotify);
                        if (item.ytmusic) {
                            // Reconstruct the match details from import
                            if (item.ytmusic.manual) {
                                matches[item.spotify.id] = {
                                    bestMatch: null,
                                    candidates: [],
                                    manual: true,
                                    videoId: item.ytmusic.videoId,
                                    title: item.ytmusic.title,
                                    artist: item.ytmusic.artist,
                                    thumbnail: item.ytmusic.thumbnail
                                };
                            } else if (item.ytmusic.videoId) {
                                matches[item.spotify.id] = {
                                    bestMatch: {
                                        videoId: item.ytmusic.videoId,
                                        title: item.ytmusic.title,
                                        artist: item.ytmusic.artist,
                                        thumbnail: item.ytmusic.thumbnail,
                                        matchScore: item.ytmusic.matchScore || 1.0
                                    },
                                    candidates: [],
                                    manual: false
                                };
                            }
                        }
                    }
                });
            } else {
                // Raw extractor format
                tracks = importedData;
                matches = {};
            }
            
            appState.tracks = tracks;
            appState.matches = matches;
            
            // Hide transfer progress card
            if (el.progressCard) el.progressCard.style.display = 'none';
            
            renderTracksTable();
            updateStats();
            validateReadyToTransfer();
            
            el.btnStartMatching.removeAttribute('disabled');
            alert(`${tracks.length} titres chargés avec succès !`);
        } catch (err) {
            alert("Erreur lors de la lecture du fichier : " + err.message);
        }
    };
    reader.readAsText(file);
}

function exportMatchesJSON() {
    if (appState.tracks.length === 0) {
        alert("Aucun titre chargé à exporter.");
        return;
    }
    
    // Build array of tracks with their match information
    const exportData = appState.tracks.map(t => {
        const match = appState.matches[t.id];
        return {
            spotify: {
                id: t.id,
                title: t.title,
                artist: t.artist,
                album: t.album,
                duration_ms: t.duration_ms,
                thumbnail: t.thumbnail
            },
            ytmusic: match ? {
                videoId: match.manual ? match.videoId : match.bestMatch?.videoId,
                title: match.manual ? match.title : match.bestMatch?.title,
                artist: match.manual ? match.artist : match.bestMatch?.artist,
                thumbnail: match.thumbnail || match.bestMatch?.thumbnail,
                matchScore: match.manual ? 1.0 : match.bestMatch?.matchScore,
                manual: match.manual,
                error: match.error || false
            } : null
        };
    });
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "spotify_ytmusic_matches.json";
    a.click();
}

function copyScraperScript() {
    const scraperScriptArea = document.getElementById('scraper-script-area');
    if (!scraperScriptArea) return;
    
    scraperScriptArea.style.display = 'block';
    scraperScriptArea.select();
    document.execCommand('copy');
    scraperScriptArea.style.display = 'none';
    
    alert('Le script d\'extraction a été copié dans votre presse-papiers !\n\nCollez-le dans la console de votre navigateur (F12 -> onglet Console) sur open.spotify.com/collection/tracks pour générer votre fichier.');
}

function copyTransferScript() {
    const transferScriptArea = document.getElementById('transfer-script-area');
    if (!transferScriptArea) return;
    
    transferScriptArea.style.display = 'block';
    transferScriptArea.select();
    document.execCommand('copy');
    transferScriptArea.style.display = 'none';
    
    alert('Le script de transfert a été copié dans votre presse-papiers !\n\nCollez-le dans la console de votre navigateur (F12 -> onglet Console) sur open.spotify.com pour importer vos musiques.');
}

// ==========================================
// YOUTUBE MUSIC ➔ SPOTIFY CONTROLLER LOGIC
// ==========================================

// Switch between tabs
function switchTab(tab) {
    activeTab = tab;
    
    const btnTabSpotifyToYt = document.getElementById('btn-tab-spotify-to-yt');
    const btnTabYtToSpotify = document.getElementById('btn-tab-yt-to-spotify');
    const panelSpotify = document.getElementById('panel-spotify-to-yt');
    const panelYt = document.getElementById('panel-yt-to-spotify');
    
    if (tab === 'spotify-to-yt') {
        if (btnTabSpotifyToYt) btnTabSpotifyToYt.classList.add('active');
        if (btnTabYtToSpotify) btnTabYtToSpotify.classList.remove('active');
        if (panelSpotify) panelSpotify.classList.add('active');
        if (panelYt) panelYt.classList.remove('active');
    } else {
        if (btnTabSpotifyToYt) btnTabSpotifyToYt.classList.remove('active');
        if (btnTabYtToSpotify) btnTabYtToSpotify.classList.add('active');
        if (panelSpotify) panelSpotify.classList.remove('active');
        if (panelYt) panelYt.classList.add('active');
        
        // Dynamic fetch of Spotify playlists if not loaded yet
        if (ytState.playlists.length === 0 && appState.spotifyAuthorized) {
            loadSpotifyPlaylists();
        }
    }
}

// Load Spotify playlists for the destination dropdown
async function loadSpotifyPlaylists() {
    const select = document.getElementById('spotify-dest-playlist-select');
    const warningBanner = document.getElementById('yt-premium-warning-banner');
    if (!select) return;
    select.innerHTML = '<option value="">Chargement des playlists...</option>';
    try {
        const res = await fetch('/api/spotify/playlists');
        const data = await res.json();
        
        if (data.success) {
            if (warningBanner) warningBanner.style.display = 'none';
            ytState.playlists = data.playlists;
            
            let html = '<option value="LM">🟢 Titres Likés (Liked Songs)</option>';
            html += '<option value="__new__">➕ [Créer une nouvelle playlist]</option>';
            data.playlists.forEach(p => {
                html += `<option value="${p.id}">${p.title}</option>`;
            });
            
            select.innerHTML = html;
            handleSpotifyDestPlaylistSelectChange();
        } else {
            const isExpired = data.isExpiredToken;
            select.innerHTML = isExpired 
                ? '<option value="">⚠️ Jeton expiré (à renouveler)</option>'
                : '<option value="">⚠️ API Bloquée (Spotify Premium requis)</option>';
            if (warningBanner) {
                const p = warningBanner.querySelector('p');
                if (isExpired && p) {
                    p.innerHTML = "Votre jeton d'accès temporaire a expiré. Veuillez suivre les instructions pour en récupérer un nouveau.";
                }
                warningBanner.style.display = 'block';
            }
        }
    } catch (e) {
        select.innerHTML = '<option value="">⚠️ Erreur de connexion API</option>';
        if (warningBanner) warningBanner.style.display = 'block';
    }
}

// Handle change in Spotify destination playlist selection
function handleSpotifyDestPlaylistSelectChange() {
    const select = document.getElementById('spotify-dest-playlist-select');
    const inputNew = document.getElementById('yt-new-spotify-playlist-name');
    if (!select || !inputNew) return;
    
    if (select.value === '__new__') {
        inputNew.style.display = 'inline-block';
        inputNew.value = 'YTM Liked Songs';
    } else {
        inputNew.style.display = 'none';
    }
    validateReadyToTransferYt();
}

// Load YouTube Music Tracks
async function loadYtSongs() {
    const btnLoad = document.getElementById('btn-load-yt-songs');
    const sourcePlaylist = document.getElementById('yt-source-playlist-select').value || 'LM';
    
    if (btnLoad) {
        btnLoad.setAttribute('disabled', 'true');
        btnLoad.textContent = 'Chargement...';
    }
    
    const tbody = document.getElementById('yt-tracks-table-body');
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="table-loading-overlay">
                <div class="spinner"></div>
                <p>Récupération de vos titres YouTube Music en cours...</p>
            </td>
        </tr>
    `;
    
    try {
        const res = await fetch(`/api/ytmusic/playlists/${sourcePlaylist}/tracks`);
        const data = await res.json();
        
        if (data.success) {
            ytState.tracks = data.tracks;
            ytState.matches = {};
            
            renderYtTracksTable();
            updateStatsYt();
            
            document.getElementById('btn-yt-start-matching').removeAttribute('disabled');
        } else {
            alert('Erreur: ' + data.error);
        }
    } catch (e) {
        alert('Erreur: ' + e.message);
    } finally {
        if (btnLoad) {
            btnLoad.removeAttribute('disabled');
            btnLoad.textContent = '1. Recharger YTM';
        }
    }
}

// Render YTM Tracks Table
function renderYtTracksTable() {
    const tbody = document.getElementById('yt-tracks-table-body');
    if (!tbody) return;
    
    if (ytState.tracks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="table-loading-overlay">
                    <p>Aucun titre trouvé.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    ytState.tracks.forEach((t, index) => {
        const match = ytState.matches[t.videoId];
        let matchHtml = '<span class="text-muted">Non recherché</span>';
        let actionDisabled = 'disabled';
        
        if (match) {
            if (match.manual) {
                matchHtml = `
                    <div class="track-cell">
                        <img class="track-artwork" src="${match.thumbnail || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 style=%22background:%23334155%22></svg>'">
                        <div class="track-details">
                            <span class="track-name">${match.title}</span>
                            <span class="track-artist">${match.artist}</span>
                        </div>
                        <span class="match-badge high">Manuel 100%</span>
                    </div>
                `;
            } else if (match.bestMatch) {
                const score = Math.round(match.bestMatch.matchScore * 100);
                let badgeClass = 'low';
                if (score >= 80) badgeClass = 'high';
                else if (score >= 50) badgeClass = 'medium';
                
                matchHtml = `
                    <div class="track-cell">
                        <img class="track-artwork" src="${match.bestMatch.thumbnail || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 style=%22background:%23334155%22></svg>'">
                        <div class="track-details">
                            <span class="track-name">${match.bestMatch.title}</span>
                            <span class="track-artist">${match.bestMatch.artist}</span>
                        </div>
                        <span class="match-badge ${badgeClass}">${score}% Match</span>
                    </div>
                `;
            } else {
                matchHtml = '<span class="match-badge none">Aucun résultat</span>';
            }
            actionDisabled = '';
        }
        
        let rowClass = '';
        if (match) {
            if (match.manual) {
                // manual override is high confidence
            } else if (match.bestMatch) {
                const score = Math.round(match.bestMatch.matchScore * 100);
                if (score < 50) {
                    rowClass = 'low-confidence-row';
                }
            } else {
                rowClass = 'no-match-row';
            }
        }
        
        const minutes = Math.floor(t.duration_seconds / 60);
        const seconds = Math.floor(t.duration_seconds % 60).toString().padStart(2, '0');
        const durationStr = `${minutes}:${seconds}`;
        
        // Display artwork if available or default
        const artworkHtml = t.thumbnail 
            ? `<img class="track-artwork" src="${t.thumbnail}">`
            : `<div class="track-artwork-placeholder" style="width: 44px; height: 44px; border-radius: 0.5rem; background: rgba(17, 24, 39, 0.6); display: inline-flex; align-items: center; justify-content: center; font-size: 1.2rem; border: 1px solid rgba(255, 255, 255, 0.04); flex-shrink: 0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">🎵</div>`;
        
        html += `
            <tr data-index="${index}" id="yt-row-${t.videoId}" class="${rowClass}">
                <td class="col-cb">
                    <input type="checkbox" class="yt-track-selector" checked onchange="updateSelectedCountYt()">
                </td>
                <td class="col-spotify">
                    <div class="track-cell">
                        ${artworkHtml}
                        <div class="track-details">
                            <span class="track-name">${t.title}</span>
                            <span class="track-artist">${t.artist} • <span class="text-muted">${durationStr}</span></span>
                            <span class="track-album">${t.album || ''}</span>
                        </div>
                    </div>
                </td>
                <td class="col-match" id="yt-match-cell-${t.videoId}">
                    ${matchHtml}
                </td>
                <td class="col-action">
                    <div style="display: flex; gap: 0.4rem; justify-content: center;">
                        <button class="btn btn-secondary btn-edit-match" style="padding: 0.35rem 0.6rem; font-size: 0.75rem; width: auto; flex-grow: 1;" ${actionDisabled} onclick="openOverrideModalYt(${index})">Corriger</button>
                        <button class="btn btn-secondary btn-delete-track" style="padding: 0.35rem 0.6rem; font-size: 0.75rem; background-color: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: var(--danger); width: auto; flex-grow: 1;" onclick="deleteTrackYt(${index})">Supprimer</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    filterYtTracksTable();
}

window.updateSelectedCountYt = function() {
    updateStatsYt();
    validateReadyToTransferYt();
};

function updateStatsYt() {
    const summaryBar = document.getElementById('yt-summary-bar');
    if (!summaryBar) return;
    summaryBar.style.display = 'grid';
    
    document.getElementById('stat-yt-count').textContent = ytState.tracks.length;
    
    const selectors = document.querySelectorAll('input.yt-track-selector');
    let selectedCount = 0;
    selectors.forEach(s => { if (s.checked) selectedCount++; });
    document.getElementById('stat-yt-selected-count').textContent = selectedCount;
    
    let matchedCount = 0;
    let totalScore = 0;
    
    Object.keys(ytState.matches).forEach(id => {
        const m = ytState.matches[id];
        if (m && (m.bestMatch || m.manual)) {
            matchedCount++;
            if (m.manual) {
                totalScore += 1.0;
            } else {
                totalScore += m.bestMatch.matchScore;
            }
        }
    });
    
    document.getElementById('stat-yt-matched-count').textContent = matchedCount;
    
    const avgConfidence = matchedCount > 0 ? Math.round((totalScore / matchedCount) * 100) : 0;
    const avgConfidenceEl = document.getElementById('stat-yt-avg-confidence');
    avgConfidenceEl.textContent = `${avgConfidence}%`;
    
    if (avgConfidence >= 80) {
        avgConfidenceEl.className = 'stat-value success';
    } else if (avgConfidence >= 50) {
        avgConfidenceEl.className = 'stat-value warning';
    } else {
        avgConfidenceEl.className = 'stat-value danger';
    }
}

function validateReadyToTransferYt() {
    const select = document.getElementById('spotify-dest-playlist-select');
    const btnExecute = document.getElementById('btn-yt-execute-transfer');
    if (!select || !btnExecute) return;
    
    const playlistSelected = select.value !== '';
    const hasMatches = Object.keys(ytState.matches).length > 0;
    
    const selectors = document.querySelectorAll('input.yt-track-selector');
    let hasSelected = false;
    selectors.forEach(s => { if (s.checked) hasSelected = true; });
    
    if (playlistSelected && hasMatches && hasSelected) {
        btnExecute.removeAttribute('disabled');
    } else {
        btnExecute.setAttribute('disabled', 'true');
    }
}

function handleSelectAllChangeYt() {
    const selectAllCheckbox = document.getElementById('yt-select-all-tracks');
    if (!selectAllCheckbox) return;
    const checked = selectAllCheckbox.checked;
    const selectors = document.querySelectorAll('input.yt-track-selector');
    selectors.forEach(s => {
        const row = s.closest('tr');
        if (row && row.style.display !== 'none') {
            s.checked = checked;
        }
    });
    updateSelectedCountYt();
}

function handleReverseOrderChangeYt() {
    ytState.tracks.reverse();
    renderYtTracksTable();
    updateStatsYt();
}

window.deleteTrackYt = function(index) {
    const track = ytState.tracks[index];
    if (!track) return;
    
    if (confirm(`Voulez-vous retirer "${track.title}" de la liste de transfert ?`)) {
        ytState.tracks.splice(index, 1);
        if (ytState.matches[track.videoId]) {
            delete ytState.matches[track.videoId];
        }
        
        const ytTransferProgressCard = document.getElementById('yt-transfer-progress-card');
        if (ytTransferProgressCard) ytTransferProgressCard.style.display = 'none';
        
        renderYtTracksTable();
        updateStatsYt();
        validateReadyToTransferYt();
    }
};

function filterYtTracksTable() {
    const queryEl = document.getElementById('yt-table-search');
    const minScoreInput = document.getElementById('yt-filter-score-min');
    const maxScoreInput = document.getElementById('yt-filter-score-max');
    const onlyRedInput = document.getElementById('yt-filter-only-red');
    const tbody = document.getElementById('yt-tracks-table-body');
    
    if (!queryEl || !tbody) return;
    
    const query = queryEl.value.toLowerCase().trim();
    const minScore = minScoreInput ? (parseInt(minScoreInput.value) || 0) : 0;
    const maxScore = maxScoreInput ? (parseInt(maxScoreInput.value) || 100) : 100;
    const onlyRed = onlyRedInput ? onlyRedInput.checked : false;
    
    const rows = tbody.getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.querySelector('.table-loading-overlay')) continue;
        
        const index = parseInt(row.getAttribute('data-index'));
        const track = ytState.tracks[index];
        if (!track) continue;
        
        const trackText = row.querySelector('.col-spotify').innerText.toLowerCase();
        const matchesText = trackText.includes(query);
        
        const match = ytState.matches[track.videoId];
        const isSearching = match && match.searching;
        
        let score = -1;
        if (match && !isSearching) {
            if (match.manual) {
                score = 100;
            } else if (match.bestMatch) {
                score = Math.round(match.bestMatch.matchScore * 100);
            } else {
                score = 0;
            }
        }
        
        const hasScoreOrColorFilter = (minScore > 0) || (maxScore < 100) || onlyRed;
        
        let matchesScore = false;
        if (isSearching || score === -1) {
            matchesScore = !hasScoreOrColorFilter;
        } else {
            matchesScore = (score >= minScore && score <= maxScore);
        }
        
        let matchesRed = true;
        if (onlyRed) {
            if (isSearching || score === -1) {
                matchesRed = false;
            } else {
                matchesRed = (score >= 0 && score < 50);
            }
        }
        
        if (matchesText && matchesScore && matchesRed) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
}

// Start matching from YTM to Spotify
async function startYtMatching() {
    const btnLoadYtSongs = document.getElementById('btn-load-yt-songs');
    const btnYtStartMatching = document.getElementById('btn-yt-start-matching');
    
    const ytTransferProgressCard = document.getElementById('yt-transfer-progress-card');
    if (ytTransferProgressCard) ytTransferProgressCard.style.display = 'none';
    
    if (btnLoadYtSongs) btnLoadYtSongs.setAttribute('disabled', 'true');
    btnYtStartMatching.setAttribute('disabled', 'true');
    btnYtStartMatching.textContent = 'Matching en cours...';
    
    const selectors = document.querySelectorAll('input.yt-track-selector');
    const tracksToMatch = [];
    
    selectors.forEach((s) => {
        const row = s.closest('tr');
        const index = parseInt(row.getAttribute('data-index'));
        if (s.checked) {
            tracksToMatch.push({
                track: ytState.tracks[index],
                index
            });
        }
    });
    
    if (tracksToMatch.length === 0) {
        alert('Veuillez cocher au moins un titre à matcher.');
        btnYtStartMatching.removeAttribute('disabled');
        btnYtStartMatching.textContent = '2. Matcher';
        if (btnLoadYtSongs) btnLoadYtSongs.removeAttribute('disabled');
        return;
    }
    
    const ytMatchingProgressCard = document.getElementById('yt-matching-progress-card');
    const ytMatchingProgressBarFill = document.getElementById('yt-matching-progress-bar-fill');
    const ytMatchingProgressCounter = document.getElementById('yt-matching-progress-counter');
    const ytMatchingProgressEstimation = document.getElementById('yt-matching-progress-estimation');
    
    if (ytMatchingProgressCard) {
        ytMatchingProgressCard.style.display = 'block';
        if (ytMatchingProgressBarFill) ytMatchingProgressBarFill.style.width = '0%';
        if (ytMatchingProgressCounter) ytMatchingProgressCounter.textContent = `0 / ${tracksToMatch.length}`;
        if (ytMatchingProgressEstimation) ytMatchingProgressEstimation.textContent = 'Calcul de l\'estimation...';
    }
    
    let processedTracks = 0;
    const totalTracks = tracksToMatch.length;
    const matchingStartTime = Date.now();
    let activeSearches = 0;
    
    const executeSearch = async (item) => {
        const track = item.track;
        const cell = document.getElementById(`yt-match-cell-${track.videoId}`);
        cell.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
        
        ytState.matches[track.videoId] = {
            searching: true
        };
        
        activeSearches++;
        try {
            const res = await fetch('/api/spotify/search-track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ track })
            });
            const data = await res.json();
            
            if (data.success) {
                ytState.matches[track.videoId] = {
                    bestMatch: data.bestMatch,
                    candidates: data.candidates,
                    manual: false,
                    searching: false
                };
                
                const row = document.getElementById(`yt-row-${track.videoId}`);
                if (row) {
                    const btnEdit = row.querySelector('.btn-edit-match');
                    if (btnEdit) btnEdit.removeAttribute('disabled');
                    
                    row.className = '';
                    
                    if (data.bestMatch) {
                        const score = Math.round(data.bestMatch.matchScore * 100);
                        let badgeClass = 'low';
                        if (score >= 80) badgeClass = 'high';
                        else if (score >= 50) badgeClass = 'medium';
                        
                        if (score < 50) {
                            row.className = 'low-confidence-row';
                        }
                        
                        cell.innerHTML = `
                            <div class="track-cell">
                                <img class="track-artwork" src="${data.bestMatch.thumbnail || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 style=%22background:%23334155%22></svg>'">
                                <div class="track-details">
                                    <span class="track-name">${data.bestMatch.title}</span>
                                    <span class="track-artist">${data.bestMatch.artist}</span>
                                </div>
                                <span class="match-badge ${badgeClass}">${score}% Match</span>
                            </div>
                        `;
                    } else {
                        row.className = 'no-match-row';
                        cell.innerHTML = '<span class="match-badge none">Aucun résultat</span>';
                    }
                }
            } else {
                ytState.matches[track.videoId] = {
                    bestMatch: null,
                    candidates: [],
                    manual: false,
                    searching: false,
                    error: true
                };
                const row = document.getElementById(`yt-row-${track.videoId}`);
                if (row) row.className = 'no-match-row';
                cell.innerHTML = `<span class="match-badge low">Erreur</span>`;
            }
        } catch (e) {
            ytState.matches[track.videoId] = {
                bestMatch: null,
                candidates: [],
                manual: false,
                searching: false,
                error: true
            };
            const row = document.getElementById(`yt-row-${track.videoId}`);
            if (row) row.className = 'no-match-row';
            cell.innerHTML = `<span class="match-badge low">Erreur Réseau</span>`;
        } finally {
            activeSearches--;
            processedTracks++;
            
            const percent = Math.round((processedTracks / totalTracks) * 100);
            if (ytMatchingProgressBarFill) ytMatchingProgressBarFill.style.width = `${percent}%`;
            if (ytMatchingProgressCounter) ytMatchingProgressCounter.textContent = `${processedTracks} / ${totalTracks}`;
            
            const elapsedTime = Date.now() - matchingStartTime;
            const avgTimePerTrack = elapsedTime / processedTracks;
            const remainingTracks = totalTracks - processedTracks;
            const estimatedTimeRemainingMs = remainingTracks * avgTimePerTrack;
            
            let timeString = '';
            if (remainingTracks === 0) {
                timeString = 'Recherche terminée !';
            } else {
                const totalSeconds = Math.round(estimatedTimeRemainingMs / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                if (minutes > 0) {
                    timeString = `Temps estimé restant : ${minutes} min ${seconds.toString().padStart(2, '0')} s`;
                } else {
                    timeString = `Temps estimé restant : ${seconds} s`;
                }
            }
            if (ytMatchingProgressEstimation) ytMatchingProgressEstimation.textContent = timeString;
            
            updateStatsYt();
            filterYtTracksTable();
        }
    };
    
    const DELAY_BETWEEN_REQUESTS = 400; 
    for (let i = 0; i < tracksToMatch.length; i++) {
        executeSearch(tracksToMatch[i]);
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_REQUESTS));
    }
    
    while (activeSearches > 0) {
        await new Promise(r => setTimeout(r, 100));
    }
    
    btnYtStartMatching.removeAttribute('disabled');
    btnYtStartMatching.textContent = '2. Matcher';
    if (btnLoadYtSongs) btnLoadYtSongs.removeAttribute('disabled');
    
    setTimeout(() => {
        if (ytMatchingProgressCard) {
            ytMatchingProgressCard.style.display = 'none';
        }
    }, 4000);
    
    validateReadyToTransferYt();
}

// Execute transfer from YTM to Spotify
async function executeTransferToSpotify() {
    const btnExecute = document.getElementById('btn-yt-execute-transfer');
    const btnLoadYtSongs = document.getElementById('btn-load-yt-songs');
    const btnYtStartMatching = document.getElementById('btn-yt-start-matching');
    
    btnExecute.setAttribute('disabled', 'true');
    if (btnYtStartMatching) btnYtStartMatching.setAttribute('disabled', 'true');
    if (btnLoadYtSongs) btnLoadYtSongs.setAttribute('disabled', 'true');
    
    const ytTransferProgressCard = document.getElementById('yt-transfer-progress-card');
    const ytProgressBarFill = document.getElementById('yt-transfer-progress-bar-fill');
    const ytProgressCounter = document.getElementById('yt-transfer-progress-counter');
    const ytConsoleLog = document.getElementById('yt-transfer-console-log');
    
    ytTransferProgressCard.style.display = 'block';
    ytConsoleLog.innerHTML = '';
    ytProgressBarFill.style.width = '0%';
    ytProgressCounter.textContent = '0 / 0';
    
    const logToConsoleYt = (message, type = 'info') => {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        ytConsoleLog.appendChild(entry);
        ytConsoleLog.scrollTop = ytConsoleLog.scrollHeight;
    };
    
    logToConsoleYt('Préparation du transfert...', 'info');
    
    let playlistId = document.getElementById('spotify-dest-playlist-select').value;
    
    // 1. Create Playlist if new is selected
    if (playlistId === '__new__') {
        const title = document.getElementById('yt-new-spotify-playlist-name').value.trim() || 'YTM Liked Songs';
        logToConsoleYt(`Création de la nouvelle playlist Spotify : "${title}"...`, 'info');
        
        try {
            const res = await fetch('/api/spotify/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title,
                    description: 'Transfert depuis YouTube Music avec SpotifyToYTMusic App'
                })
            });
            const data = await res.json();
            if (data.success && data.playlistId) {
                playlistId = data.playlistId;
                logToConsoleYt(`Playlist Spotify créée avec succès ! ID: ${playlistId}`, 'success');
            } else {
                throw new Error(data.error || 'Erreur inconnue de création de playlist');
            }
        } catch (e) {
            logToConsoleYt(`Échec de création de la playlist Spotify : ${e.message}`, 'error');
            unlockControlsYt();
            return;
        }
    }
    
    // 2. Fetch tracks currently in target playlist (to skip duplicates if checked)
    let existingSpotifyIds = new Set();
    const skipDuplicates = document.getElementById('yt-setting-skip-duplicates').checked;
    
    if (skipDuplicates) {
        logToConsoleYt('Récupération des titres existants dans la playlist Spotify de destination pour éviter les doublons...', 'info');
        try {
            const res = await fetch(`/api/spotify/playlists/${playlistId}/tracks`);
            const data = await res.json();
            if (data.success && data.tracks) {
                data.tracks.forEach(t => {
                    if (t.videoId) existingSpotifyIds.add(t.videoId);
                });
                logToConsoleYt(`${existingSpotifyIds.size} titres déjà présents trouvés.`, 'info');
            } else {
                logToConsoleYt('Impossible de lire les titres existants, aucun doublon ne sera évité.', 'warning');
            }
        } catch (e) {
            logToConsoleYt('Erreur lors de la récupération des titres existants, pas de déduplication.', 'warning');
        }
    }
    
    // 3. Collect Spotify IDs of matched tracks
    const selectors = document.querySelectorAll('input.yt-track-selector');
    const finalSpotifyIds = [];
    const skippedTracks = [];
    const addedIdsInTransfer = new Set();
    
    selectors.forEach((s) => {
        const row = s.closest('tr');
        const index = parseInt(row.getAttribute('data-index'));
        if (s.checked) {
            const track = ytState.tracks[index];
            const match = ytState.matches[track.videoId];
            
            if (match) {
                const spotifyId = match.manual ? match.videoId : match.bestMatch?.videoId;
                if (spotifyId) {
                    const isDuplicate = skipDuplicates && (existingSpotifyIds.has(spotifyId) || addedIdsInTransfer.has(spotifyId));
                    if (isDuplicate) {
                        skippedTracks.push(track.title);
                    } else {
                        finalSpotifyIds.push(spotifyId);
                        addedIdsInTransfer.add(spotifyId);
                    }
                }
            }
        }
    });
    
    if (skippedTracks.length > 0) {
        logToConsoleYt(`${skippedTracks.length} titres déjà présents ignorés pour éviter les doublons.`, 'info');
    }
    
    if (finalSpotifyIds.length === 0) {
        logToConsoleYt('Aucun titre à transférer (tous ont été ignorés ou aucun n\'a de correspondance).', 'warning');
        alert('Aucun titre à transférer.');
        unlockControlsYt();
        return;
    }
    
    logToConsoleYt(`Lancement du transfert de ${finalSpotifyIds.length} titres vers Spotify...`, 'info');
    
    // 4. Start Server-Sent Events (SSE) Stream
    const eventSourceUrl = `/api/spotify/transfer-stream?playlistId=${playlistId}&skipDuplicates=${skipDuplicates}&trackData=${encodeURIComponent(JSON.stringify(finalSpotifyIds))}`;
    const source = new EventSource(eventSourceUrl);
    
    source.addEventListener('info', (event) => {
        const data = JSON.parse(event.data);
        logToConsoleYt(data.message, 'info');
    });
    
    source.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        ytProgressBarFill.style.width = `${data.percent}%`;
        ytProgressCounter.textContent = `${data.added} / ${data.total}`;
        logToConsoleYt(data.message, 'success');
    });
    
    source.addEventListener('success', (event) => {
        const data = JSON.parse(event.data);
        logToConsoleYt(data.message, 'success');
        ytProgressBarFill.style.width = '100%';
        source.close();
        
        alert('Transfert terminé avec succès !');
        loadSpotifyPlaylists();
        unlockControlsYt();
    });
    
    source.addEventListener('error', (event) => {
        const data = event.data ? JSON.parse(event.data) : { error: 'Erreur de connexion SSE' };
        logToConsoleYt(`Erreur durant le transfert : ${data.error}`, 'error');
        source.close();
        unlockControlsYt();
    });
}

function unlockControlsYt() {
    const btnExecute = document.getElementById('btn-yt-execute-transfer');
    const btnLoadYtSongs = document.getElementById('btn-load-yt-songs');
    const btnYtStartMatching = document.getElementById('btn-yt-start-matching');
    if (btnExecute) btnExecute.removeAttribute('disabled');
    if (btnYtStartMatching) btnYtStartMatching.removeAttribute('disabled');
    if (btnLoadYtSongs) btnLoadYtSongs.removeAttribute('disabled');
}

window.openOverrideModalYt = function(index) {
    currentOverrideTrackIndex = index;
    currentOverrideSelectedCandidate = null;
    el.btnConfirmModal.setAttribute('disabled', 'true');
    
    const track = ytState.tracks[index];
    
    const minutes = Math.floor(track.duration_seconds / 60);
    const seconds = Math.floor(track.duration_seconds % 60).toString().padStart(2, '0');
    el.modalSpotifyInfo.innerHTML = `
        <img class="track-artwork" src="${track.thumbnail || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 style=%22background:%23334155%22></svg>'" style="width: 50px; height: 50px;">
        <div class="track-details">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--youtube-red); text-transform: uppercase; letter-spacing: 0.05em;">Référence YouTube Music</span>
            <span class="track-name" style="font-size: 1rem;">${track.title}</span>
            <span class="track-artist" style="font-size: 0.85rem;">${track.artist} • ${minutes}:${seconds}</span>
        </div>
    `;
    
    el.modalSearchInput.value = `${track.title} ${track.artist}`;
    el.overrideModal.classList.add('active');
    
    triggerModalSearchGlobal();
};

function confirmOverrideYt() {
    if (!currentOverrideSelectedCandidate || currentOverrideTrackIndex === null) return;
    
    const track = ytState.tracks[currentOverrideTrackIndex];
    
    ytState.matches[track.videoId] = {
        bestMatch: null,
        candidates: ytState.matches[track.videoId]?.candidates || [],
        manual: true,
        videoId: currentOverrideSelectedCandidate.videoId,
        title: currentOverrideSelectedCandidate.title,
        artist: currentOverrideSelectedCandidate.artist,
        thumbnail: currentOverrideSelectedCandidate.thumbnail
    };
    
    const ytTransferProgressCard = document.getElementById('yt-transfer-progress-card');
    if (ytTransferProgressCard) ytTransferProgressCard.style.display = 'none';
    
    renderYtTracksTable();
    updateStatsYt();
    
    closeModal();
    validateReadyToTransferYt();
}

function exportYtMatchesJSON() {
    if (ytState.tracks.length === 0) {
        alert("Aucun titre chargé à exporter.");
        return;
    }
    
    const exportData = ytState.tracks.map(t => {
        const match = ytState.matches[t.videoId];
        return {
            ytmusic: {
                videoId: t.videoId,
                title: t.title,
                artist: t.artist,
                album: t.album,
                duration_seconds: t.duration_seconds,
                thumbnail: t.thumbnail
            },
            spotify: match ? {
                id: match.manual ? match.videoId : match.bestMatch?.videoId,
                title: match.manual ? match.title : match.bestMatch?.title,
                artist: match.manual ? match.artist : match.bestMatch?.artist,
                thumbnail: match.thumbnail || match.bestMatch?.thumbnail,
                matchScore: match.manual ? 1.0 : match.bestMatch?.matchScore,
                manual: match.manual,
                error: match.error || false
            } : null
        };
    });
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ytmusic_spotify_matches.json";
    a.click();
}

function handleYtFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const importedData = JSON.parse(evt.target.result);
            if (!Array.isArray(importedData)) {
                throw new Error("Le format du fichier n'est pas un tableau de titres.");
            }
            
            let tracks = [];
            let matches = {};
            
            if (importedData.length > 0 && importedData[0].ytmusic) {
                importedData.forEach(item => {
                    if (item.ytmusic) {
                        tracks.push(item.ytmusic);
                        if (item.spotify) {
                            if (item.spotify.manual) {
                                matches[item.ytmusic.videoId] = {
                                    bestMatch: null,
                                    candidates: [],
                                    manual: true,
                                    videoId: item.spotify.id,
                                    title: item.spotify.title,
                                    artist: item.spotify.artist,
                                    thumbnail: item.spotify.thumbnail
                                };
                            } else if (item.spotify.id) {
                                matches[item.ytmusic.videoId] = {
                                    bestMatch: {
                                        videoId: item.spotify.id,
                                        title: item.spotify.title,
                                        artist: item.spotify.artist,
                                        thumbnail: item.spotify.thumbnail,
                                        matchScore: item.spotify.matchScore || 1.0
                                    },
                                    candidates: [],
                                    manual: false
                                };
                            }
                        }
                    }
                });
            } else {
                tracks = importedData;
                matches = {};
            }
            
            ytState.tracks = tracks;
            ytState.matches = matches;
            
            const ytTransferProgressCard = document.getElementById('yt-transfer-progress-card');
            if (ytTransferProgressCard) ytTransferProgressCard.style.display = 'none';
            
            renderYtTracksTable();
            updateStatsYt();
            validateReadyToTransferYt();
            
            document.getElementById('btn-yt-start-matching').removeAttribute('disabled');
            alert(`${tracks.length} titres chargés avec succès !`);
        } catch (err) {
            alert("Erreur lors de la lecture du fichier : " + err.message);
        }
    };
    reader.readAsText(file);
}

// Copy robust script to clipboard helper
window.copySpotifyExtractionScript = function() {
    const script = `copy((()=>{const t=s=>typeof s=='string'&&/^BQ[a-zA-Z0-9_\\\\-]{100,450}$/.test(s);let tok='';try{tok=JSON.parse(document.getElementById('session').textContent).accessToken}catch(e){}if(!t(tok)){try{for(let i=0;i<localStorage.length;i++){let v=localStorage.getItem(localStorage.key(i));if(t(v)){tok=v;break}try{let o=JSON.parse(v);for(let k in o){if(t(o[k])){tok=o[k];break}}}catch(e){}if(tok)break}}catch(e){}}if(!t(tok)){try{for(let i=0;i<sessionStorage.length;i++){let v=sessionStorage.getItem(sessionStorage.key(i));if(t(v)){tok=v;break}try{let o=JSON.parse(v);for(let k in o){if(t(o[k])){tok=o[k];break}}}catch(e){}if(tok)break}}catch(e){}}if(!t(tok)){try{const sc=(o,seen=new Set())=>{if(!o||typeof o!='object'||seen.has(o))return null;seen.add(o);for(let k in o){try{let v=o[k];if(t(v))return v;if(v&&typeof v=='object'){let r=sc(v,seen);if(r)return r}}catch(e){}}return null};for(let el of document.querySelectorAll('*')){for(let k of Object.keys(el)){if(k.startsWith('__react')){let tk=sc(el[k]);if(t(tk)){tok=tk;break}}}if(tok)break}}catch(e){}}if(t(tok)){console.log('Jeton Spotify Web Player :',tok);return tok;}else{console.error('Jeton introuvable.');return 'Jeton introuvable';}})())`;
    navigator.clipboard.writeText(script).then(() => {
        alert('Le script d\'extraction robuste a été copié dans votre presse-papiers !');
    }).catch(err => {
        alert('Échec de la copie automatique. Veuillez copier le texte du script manuellement.');
    });
};

