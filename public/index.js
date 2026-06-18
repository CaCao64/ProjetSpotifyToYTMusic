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
let tabTransitionTimeout = null;
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
    initCustomSelects();
    
    // Restore saved tab
    const savedTab = localStorage.getItem('activeYtTab') || 'spotify-to-yt';
    activeTab = null; // force selection
    switchTab(savedTab, true);
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
    const btnYtCopyScriptDirect = document.getElementById('btn-yt-copy-script-direct');
    if (btnYtCopyScriptDirect) {
        btnYtCopyScriptDirect.addEventListener('click', copyTransferScript);
    }
    
    const btnCopyCleanScript = document.getElementById('btn-copy-clean-script');
    if (btnCopyCleanScript) {
        btnCopyCleanScript.addEventListener('click', copyYtCleanScript);
    }
    
    // Tabs Navigation (Merge & Copy)
    const btnTabYtMerge = document.getElementById('btn-tab-yt-merge');
    const btnTabYtCopy = document.getElementById('btn-tab-yt-copy');
    if (btnTabYtMerge) btnTabYtMerge.addEventListener('click', () => switchTab('yt-merge'));
    if (btnTabYtCopy) btnTabYtCopy.addEventListener('click', () => switchTab('yt-copy'));
    
    // YTM Merge & Copy events
    const btnSaveYtSecondary = document.getElementById('btn-save-yt-secondary');
    if (btnSaveYtSecondary) btnSaveYtSecondary.addEventListener('click', saveYtSecondaryConfig);
    
    const btnExecuteYtMerge = document.getElementById('btn-execute-yt-merge');
    if (btnExecuteYtMerge) btnExecuteYtMerge.addEventListener('click', executeYtMerge);
    
    const btnExecuteYtCopy = document.getElementById('btn-execute-yt-copy');
    if (btnExecuteYtCopy) btnExecuteYtCopy.addEventListener('click', executeYtCopy);
    
    const checkboxOtherAccount = document.getElementById('yt-copy-use-other-account');
    if (checkboxOtherAccount) {
        checkboxOtherAccount.addEventListener('change', async () => {
            const setupSection = document.getElementById('yt-copy-secondary-setup-section');
            if (checkboxOtherAccount.checked) {
                if (setupSection) setupSection.style.display = 'block';
                await populateCopyPlaylistsDropdownDestSecondary();
            } else {
                if (setupSection) setupSection.style.display = 'none';
                populateCopyPlaylistsDropdownDestPrimary();
            }
        });
    }
    
    const copyDestSelect = document.getElementById('yt-copy-dest-select');
    if (copyDestSelect) {
        copyDestSelect.addEventListener('change', () => {
            updateDestInputVisibility(copyDestSelect.value);
        });
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
    
    const btnYtCopyUris = document.getElementById('btn-yt-copy-uris');
    if (btnYtCopyUris) {
        btnYtCopyUris.addEventListener('click', copyYtMatchedUris);
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
    
    // YTM Profiles events
    const primaryProfileSelect = document.getElementById('yt-primary-profile-select');
    const secondaryProfileSelect = document.getElementById('yt-secondary-profile-select');
    const btnDeletePrimaryProfile = document.getElementById('btn-delete-primary-profile');
    const btnDeleteSecondaryProfile = document.getElementById('btn-delete-secondary-profile');
    
    if (primaryProfileSelect) {
        primaryProfileSelect.addEventListener('change', () => {
            selectYtProfile(primaryProfileSelect.value, 'primary');
        });
    }
    if (secondaryProfileSelect) {
        secondaryProfileSelect.addEventListener('change', () => {
            selectYtProfile(secondaryProfileSelect.value, 'secondary');
        });
    }
    if (btnDeletePrimaryProfile && primaryProfileSelect) {
        btnDeletePrimaryProfile.addEventListener('click', () => {
            deleteYtProfile(primaryProfileSelect.value);
        });
    }
    if (btnDeleteSecondaryProfile && secondaryProfileSelect) {
        btnDeleteSecondaryProfile.addEventListener('click', () => {
            deleteYtProfile(secondaryProfileSelect.value);
        });
    }
}

// Check configuration status
async function checkStatus() {
    try {
        console.log(`[checkStatus] Fetching /api/status...`);
        const res = await fetch(`/api/status?t=${Date.now()}`);
        const data = await res.json();
        console.log(`[checkStatus] Spotify configured: ${data.spotifyConfigured}, Spotify authorized: ${data.spotifyAuthorized}, YTM configured: ${data.ytMusicConfigured}`);
        
        appState.spotifyConfigured = data.spotifyConfigured;
        appState.spotifyAuthorized = data.spotifyAuthorized;
        appState.ytMusicConfigured = data.ytMusicConfigured;
        
        // Update Spotify elements
        const spotifyStatusText = document.getElementById('spotify-account-info-text');
        const spotifyStatusPhoto = document.getElementById('spotify-account-photo');
        const spotifyStatusBox = document.getElementById('spotify-account-status-msg');
        
        if (data.spotifyAuthorized) {
            el.spotifyStatus.classList.add('active');
            el.spotifyStatus.classList.remove('warning');
            el.spotifyClientId.value = data.spotifyClientId || '';
            el.btnAuthSpotify.removeAttribute('disabled');
            
            let spotifyNameStr = '';
            if (data.spotifyAccount) {
                const displayName = data.spotifyAccount.displayName || '';
                const email = data.spotifyAccount.email || '';
                if (displayName && email) {
                    spotifyNameStr = `${displayName} (${email})`;
                } else if (displayName) {
                    spotifyNameStr = displayName;
                }
                
                if (spotifyStatusBox) {
                    spotifyStatusBox.style.display = 'flex';
                    spotifyStatusBox.style.background = 'rgba(29, 185, 84, 0.08)';
                    spotifyStatusBox.style.borderColor = 'rgba(29, 185, 84, 0.2)';
                    if (spotifyStatusText) {
                        spotifyStatusText.textContent = `Compte connecté : ${displayName} ${email ? '(' + email + ')' : ''}`;
                        spotifyStatusText.style.color = 'var(--text-primary)';
                    }
                    if (spotifyStatusPhoto) {
                        if (data.spotifyAccount.photoUrl) {
                            spotifyStatusPhoto.src = data.spotifyAccount.photoUrl;
                            spotifyStatusPhoto.style.display = 'inline-block';
                        } else {
                            spotifyStatusPhoto.style.display = 'none';
                        }
                    }
                }
            } else {
                if (data.usingWebPlayerToken) {
                    spotifyNameStr = 'Spotify Connecté (Jeton Web)';
                } else {
                    spotifyNameStr = 'Spotify Connecté (Premium requis)';
                }
                
                if (spotifyStatusBox) {
                    spotifyStatusBox.style.display = 'flex';
                    spotifyStatusBox.style.background = 'rgba(234, 179, 8, 0.08)';
                    spotifyStatusBox.style.borderColor = 'rgba(234, 179, 8, 0.2)';
                    if (spotifyStatusText) {
                        spotifyStatusText.innerHTML = `Compte connecté. <span style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-top: 0.15rem;">⚠️ Spotify Premium requis pour afficher le nom du profil.</span>`;
                    }
                    if (spotifyStatusPhoto) {
                        spotifyStatusPhoto.style.display = 'none';
                    }
                }
            }
            el.spotifyStatus.innerHTML = `<span class="dot"></span> ${spotifyNameStr}`;
            
            if (data.usingWebPlayerToken) {
                const tokenInput = document.getElementById('spotify-web-token');
                if (tokenInput && !tokenInput.value) {
                    tokenInput.value = data.spotifyWebPlayerToken || '';
                }
            }
        } else if (data.spotifyConfigured) {
            el.spotifyStatus.classList.remove('active');
            el.spotifyStatus.classList.add('warning');
            el.spotifyStatus.innerHTML = '<span class="dot"></span> Spotify Non Connecté';
            el.spotifyClientId.value = data.spotifyClientId || '';
            el.btnAuthSpotify.removeAttribute('disabled');
            
            if (spotifyStatusBox) {
                spotifyStatusBox.style.display = 'flex';
                spotifyStatusBox.style.background = 'rgba(234, 179, 8, 0.08)';
                spotifyStatusBox.style.borderColor = 'rgba(234, 179, 8, 0.2)';
                if (spotifyStatusText) {
                    spotifyStatusText.innerHTML = `⚠️ Configuré, mais non connecté.<br><span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">Veuillez cliquer sur <strong>SE CONNECTER À SPOTIFY</strong> ci-dessous.</span>`;
                }
                if (spotifyStatusPhoto) {
                    spotifyStatusPhoto.style.display = 'none';
                }
            }
        } else {
            el.spotifyStatus.classList.remove('active');
            el.spotifyStatus.classList.remove('warning');
            el.spotifyStatus.innerHTML = '<span class="dot"></span> Spotify Non Connecté';
            el.btnAuthSpotify.setAttribute('disabled', 'true');
            if (spotifyStatusBox) {
                spotifyStatusBox.style.display = 'none';
            }
        }
        
        // Update YT Music badge
        const ytStatusText = document.getElementById('yt-account-info-text');
        const ytStatusPhoto = document.getElementById('yt-account-photo');
        const ytStatusBox = document.getElementById('yt-primary-status-msg');
        
        if (data.ytMusicConfigured) {
            el.ytStatus.classList.add('active');
            let ytNameStr = 'YouTube Music Connecté';
            if (data.ytAccount) {
                const name = data.ytAccount.accountName || '';
                const handle = data.ytAccount.channelHandle || '';
                if (name && handle) {
                    ytNameStr = `${name} (${handle})`;
                } else if (name) {
                    ytNameStr = name;
                }
                
                if (ytStatusBox) {
                    ytStatusBox.style.display = 'flex';
                    if (ytStatusText) {
                        ytStatusText.textContent = `Compte connecté : ${name} ${handle ? '(' + handle + ')' : ''}`;
                    }
                    if (ytStatusPhoto) {
                        if (data.ytAccount.accountPhotoUrl) {
                            ytStatusPhoto.src = data.ytAccount.accountPhotoUrl;
                            ytStatusPhoto.style.display = 'inline-block';
                        } else {
                            ytStatusPhoto.style.display = 'none';
                        }
                    }
                }
            } else {
                if (ytStatusBox) {
                    ytStatusBox.style.display = 'none';
                }
            }
            
            el.ytStatus.innerHTML = `<span class="dot"></span> ${ytNameStr}`;
            if (el.ytToolsSection) el.ytToolsSection.style.display = 'block';
        } else {
            el.ytStatus.classList.remove('active');
            el.ytStatus.innerHTML = '<span class="dot"></span> YouTube Music Non Connecté';
            if (el.ytToolsSection) el.ytToolsSection.style.display = 'none';
            if (ytStatusBox) {
                ytStatusBox.style.display = 'none';
            }
        }
        
        // Show dashboard if everything is configured
        if (data.spotifyAuthorized && data.ytMusicConfigured) {
            el.transferDashboard.style.display = 'block';
            loadPlaylists();
        } else {
            el.transferDashboard.style.display = 'none';
        }
        
        loadYtProfiles().catch(e => console.error("Error loading profiles:", e));
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
    console.log(`[loadPlaylists] Starting loadPlaylists...`);
    el.playlistSelect.innerHTML = '<option value="">Chargement des playlists...</option>';
    const ytSourceSelect = document.getElementById('yt-source-playlist-select');
    if (ytSourceSelect) ytSourceSelect.innerHTML = '<option value="LM">Titres Likés (Liked Music)</option>';
    try {
        const res = await fetch(`/api/ytmusic/playlists?t=${Date.now()}`);
        const data = await res.json();
        
        if (data.success) {
            console.log(`[loadPlaylists] Successfully loaded ${data.playlists.length} playlists.`);
            appState.playlists = data.playlists;
            
            let html = '<option value="__new__">➕ [Créer une nouvelle playlist]</option>';
            let htmlYtSource = '<option value="LM">Titres Likés (Liked Music)</option>';
            data.playlists.forEach(p => {
                html += `<option value="${p.id}">${p.title}</option>`;
                htmlYtSource += `<option value="${p.id}">${p.title}</option>`;
            });
            
            el.playlistSelect.innerHTML = html;
            if (ytSourceSelect) ytSourceSelect.innerHTML = htmlYtSource;
            refreshCustomSelect(el.playlistSelect);
            if (ytSourceSelect) refreshCustomSelect(ytSourceSelect);
            
            // Refresh Merge & Copy controls dynamically
            populateMergePlaylistsList();
            populateCopyPlaylistsDropdown();
            
            handlePlaylistSelectChange();
        } else {
            el.playlistSelect.innerHTML = '<option value="">Erreur de chargement</option>';
            refreshCustomSelect(el.playlistSelect);
        }
    } catch (e) {
        el.playlistSelect.innerHTML = '<option value="">Erreur de communication</option>';
        refreshCustomSelect(el.playlistSelect);
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
        const res = await fetch(`/api/spotify/tracks?t=${Date.now()}`);
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
    const btn = el.btnClearLiked;
    let originalText = 'Supprimer les titres likés';
    if (btn) {
        originalText = btn.textContent;
        btn.setAttribute('disabled', 'true');
        btn.textContent = 'Calcul en cours...';
    }
    
    try {
        logToConsole('Interrogation du nombre de titres likés sur votre compte...', 'info');
        const res = await fetch(`/api/ytmusic/liked-metadata?t=${Date.now()}`);
        const data = await res.json();
        
        if (btn) {
            btn.removeAttribute('disabled');
            btn.textContent = originalText;
        }
        
        if (!data.success) {
            alert(`Impossible de calculer le nombre de titres : ${data.error}`);
            return;
        }
        
        const count = data.count;
        if (count === 0) {
            alert("Aucun titre liké trouvé sur votre compte YouTube Music.");
            return;
        }
        
        // Estimation formula: ~0.25s per track + 1s per batch of 100 + 3s between passes
        const estimatedSeconds = Math.round((count * 0.25) + (Math.ceil(count / 100) * 1) + 3);
        const minutes = Math.floor(estimatedSeconds / 60);
        const seconds = estimatedSeconds % 60;
        const timeStr = minutes > 0 ? `${minutes} min et ${seconds} sec` : `${seconds} sec`;
        
        if (!confirm(`⚠️ ATTENTION : Vous allez supprimer TOUS les titres likés de votre bibliothèque YouTube Music.\n\n• Nombre de titres détectés : ${count}\n• Temps de suppression estimé : environ ${timeStr}\n\nCette action est irréversible et retirera le \"J'aime\" de tous les morceaux de votre bibliothèque. Voulez-vous continuer ?`)) {
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
        
        const clearCard = document.getElementById('yt-clear-progress-card');
        const clearTitle = document.getElementById('yt-clear-progress-title');
        const clearCounter = document.getElementById('yt-clear-progress-counter');
        const clearBarFill = document.getElementById('yt-clear-progress-bar-fill');
        const clearEta = document.getElementById('yt-clear-progress-eta');
        const clearPercent = document.getElementById('yt-clear-progress-percent');
        const clearConsole = document.getElementById('yt-clear-console-log');
        
        clearCard.style.display = 'block';
        clearConsole.innerHTML = '';
        clearBarFill.style.width = '0%';
        clearCounter.textContent = `0 / ${count}`;
        clearPercent.textContent = '0%';
        clearEta.textContent = 'Calcul du temps restant...';
        clearTitle.textContent = 'Suppression des titres likés...';
        
        const log = (message, type = 'info') => {
            const entry = document.createElement('div');
            entry.className = `log-entry ${type}`;
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            clearConsole.appendChild(entry);
            clearConsole.scrollTop = clearConsole.scrollHeight;
        };
        
        log(`Lancement de la suppression de ${count} titres likés (Temps estimé : ${timeStr})...`, 'info');
        const startTime = Date.now();
        
        const eventSourceUrl = '/api/ytmusic/clear-liked-stream';
        const source = new EventSource(eventSourceUrl);
        
        source.addEventListener('info', (event) => {
            const data = JSON.parse(event.data);
            log(data.message, 'info');
        });
        
        source.addEventListener('progress', (event) => {
            const data = JSON.parse(event.data);
            clearBarFill.style.width = `${data.percent}%`;
            clearPercent.textContent = `${data.percent}%`;
            clearCounter.textContent = `${data.added} / ${data.total}`;
            log(data.message, 'success');
            
            // Calculate dynamic ETA
            const processed = data.added;
            if (processed > 0) {
                const elapsedMs = Date.now() - startTime;
                const tracksPerMs = processed / elapsedMs;
                const remainingTracks = data.total - data.added;
                const remainingMs = remainingTracks / tracksPerMs;
                
                if (remainingTracks <= 0) {
                    clearEta.textContent = 'Terminé';
                } else {
                    const totalSeconds = Math.round(remainingMs / 1000);
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    let etaText = 'Temps restant estimé : ';
                    if (minutes > 0) {
                        etaText += `${minutes} min ${seconds} s`;
                    } else {
                        etaText += `${seconds} s`;
                    }
                    clearEta.textContent = etaText;
                }
            }
        });
        
        source.addEventListener('success', (event) => {
            const data = JSON.parse(event.data);
            log(data.message, 'success');
            clearBarFill.style.width = '100%';
            clearPercent.textContent = '100%';
            clearEta.textContent = 'Terminé';
            source.close();
            
            alert('Suppression terminée avec succès !');
            unlockControls();
        });
        
        source.addEventListener('error', (event) => {
            const data = event.data ? JSON.parse(event.data) : { error: 'Erreur de connexion SSE' };
            log(`Erreur durant la suppression : ${data.error}`, 'error');
            clearEta.textContent = 'Erreur';
            source.close();
            unlockControls();
        });
    } catch (err) {
        if (btn) {
            btn.removeAttribute('disabled');
            btn.textContent = originalText;
        }
        alert(`Erreur de communication avec le serveur : ${err.message}`);
    }
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

function getDirectTransferScript(tracks, playlistName) {
    const escapedTracksJson = JSON.stringify(tracks).replace(/`/g, '\\`').replace(/\${/g, '\\${');
    const escapedPlaylistName = playlistName.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${').replace(/"/g, '\\"');
    
    return `(async () => {
    console.log("🚀 Démarrage du transfert YouTube Music vers Spotify (Sans Premium)...");
    
    // 1. Get access token
    let token;
    const captureToken = async () => {
        const isSpotifyToken = (str) => typeof str === 'string' && /^BQ[a-zA-Z0-9_\\-]{100,450}$/.test(str);
        
        // 1. Try internal fetch
        try {
            const res = await fetch("https://open.spotify.com/get_access_token?reason=transport&productType=web_player");
            const data = await res.json();
            if (isSpotifyToken(data.accessToken)) {
                console.log("✅ Jeton d'accès extrait de get_access_token.");
                return data.accessToken;
            }
        } catch (e) {}
        
        // 2. Try to extract from #session script element
        try {
            const sessionEl = document.getElementById('session') || document.querySelector('#session');
            if (sessionEl) {
                const sessionData = JSON.parse(sessionEl.textContent || sessionEl.innerText);
                if (isSpotifyToken(sessionData.accessToken)) {
                    console.log("✅ Jeton d'accès extrait de la balise #session.");
                    return sessionData.accessToken;
                }
            }
        } catch (e) {}
        
        // 3. Scan all script tags on the page for accessToken
        try {
            for (const script of document.querySelectorAll('script')) {
                const content = script.textContent || script.innerText || '';
                if (content.includes('accessToken')) {
                    const match = content.match(/"accessToken"\\s*:\\s*"([^"]+)"/);
                    if (match && isSpotifyToken(match[1])) {
                        console.log("✅ Jeton d'accès extrait des scripts de la page.");
                        return match[1];
                    }
                }
            }
        } catch (e) {}
        
        // 4. Scan LocalStorage & SessionStorage
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const val = localStorage.getItem(key);
                if (isSpotifyToken(val)) {
                    console.log("✅ Jeton d'accès extrait de localStorage.");
                    return val;
                }
                try {
                    const parsed = JSON.parse(val);
                    if (parsed && typeof parsed === 'object') {
                        for (const k in parsed) {
                            if (isSpotifyToken(parsed[k])) {
                                console.log("✅ Jeton d'accès extrait de localStorage (JSON: " + key + "." + k + ").");
                                return parsed[k];
                            }
                        }
                    }
                } catch (e) {}
            }
        } catch (e) {}
        
        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                const val = sessionStorage.getItem(key);
                if (isSpotifyToken(val)) {
                    console.log("✅ Jeton d'accès extrait de sessionStorage.");
                    return val;
                }
                try {
                    const parsed = JSON.parse(val);
                    if (parsed && typeof parsed === 'object') {
                        for (const k in parsed) {
                            if (isSpotifyToken(parsed[k])) {
                                console.log("✅ Jeton d'accès extrait de sessionStorage (JSON: " + key + "." + k + ").");
                                return parsed[k];
                            }
                        }
                    }
                } catch (e) {}
            }
        } catch (e) {}
        
        // 5. Scan React Fiber tree on DOM nodes for accessToken (Spotify is a React app)
        try {
            const evaluator = (obj, visited = new Set()) => {
                if (!obj || typeof obj !== 'object' || visited.has(obj)) return null;
                visited.add(obj);
                
                for (const key in obj) {
                    try {
                        const val = obj[key];
                        if (isSpotifyToken(val)) {
                            return val;
                        }
                        if (val && typeof val === 'object') {
                            const res = evaluator(val, visited);
                            if (res) return res;
                        }
                    } catch (e) {}
                }
                return null;
            };
            
            const allElements = document.getElementsByTagName('*');
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i];
                for (const key of Object.keys(el)) {
                    if (key.startsWith('__react') || key.startsWith('__reactFiber') || key.startsWith('__reactProps') || key.startsWith('__reactContainer')) {
                        const token = evaluator(el[key]);
                        if (token) {
                            console.log("✅ Jeton d'accès extrait de l'arbre React DOM.");
                            return token;
                        }
                    }
                }
            }
        } catch (e) {}
        
        // 6. Intercept background/user fetch and XMLHttpRequest calls to spotify.com (fallback)
        return new Promise((resolve) => {
            console.log("⏳ En attente de détection automatique du jeton d'accès (patientez 2-3 secondes)...");
            const originalFetch = window.fetch;
            const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
            let resolved = false;
            
            const cleanup = () => {
                window.fetch = originalFetch;
                XMLHttpRequest.prototype.setRequestHeader = originalSetRequestHeader;
            };
            
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    cleanup();
                    resolve(null);
                }
            }, 5000); // 5s timeout
            
            XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
                try {
                    if (header && header.toLowerCase() === 'authorization' && value && value.startsWith('Bearer ')) {
                        const t = value.substring(7).trim();
                        if (isSpotifyToken(t) && !resolved) {
                            resolved = true;
                            clearTimeout(timeoutId);
                            cleanup();
                            console.log("✅ Jeton d'accès détecté et intercepté via XMLHttpRequest !");
                            resolve(t);
                        }
                    }
                } catch (err) {
                    console.error("Erreur d'interception XHR :", err);
                }
                return originalSetRequestHeader.apply(this, arguments);
            };
            
            window.fetch = function(url, options) {
                try {
                    let urlStr = '';
                    if (typeof url === 'string') {
                        urlStr = url;
                    } else if (url && typeof url === 'object' && url.url) {
                        urlStr = url.url;
                    }
                    
                    if (urlStr.includes('spotify.com')) {
                        let auth = null;
                        if (options && options.headers) {
                            if (options.headers instanceof Headers) {
                                auth = options.headers.get('Authorization');
                            } else if (typeof options.headers === 'object') {
                                auth = options.headers['Authorization'] || options.headers['authorization'];
                            }
                        }
                        if (!auth && url && typeof url === 'object' && url.headers) {
                            if (url.headers instanceof Headers) {
                                auth = url.headers.get('Authorization');
                            } else if (typeof url.headers === 'object') {
                                auth = url.headers['Authorization'] || url.headers['authorization'];
                            }
                        }
                        
                        if (auth && auth.startsWith('Bearer ')) {
                            const t = auth.substring(7).trim();
                            if (isSpotifyToken(t) && !resolved) {
                                resolved = true;
                                clearTimeout(timeoutId);
                                cleanup();
                                console.log("✅ Jeton d'accès détecté et intercepté via Fetch !");
                                resolve(t);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Erreur d'interception Fetch :", err);
                }
                return originalFetch.apply(this, arguments);
            };
        });
    };
    
    token = await captureToken();
    
    if (!token) {
        token = prompt("Jeton d'accès automatique introuvable (Bloqué par Spotify).\\n\\nPour le récupérer manuellement :\\n1. Ouvrez l'onglet Réseau (Network) de la console (F12).\\n2. Cherchez ou lancez une action (ex: recherche, clic play) pour voir des requêtes vers 'api.spotify.com'.\\n3. Cliquez sur une requête (ex: 'search' ou 'me'), allez dans l'onglet 'Headers' et faites défiler jusqu'à 'Request Headers'.\\n4. Copiez la valeur de l'en-tête 'Authorization' en retirant le mot 'Bearer ' (ex: BQB...).\\n\\nCollez votre jeton d'accès Spotify ci-dessous :");
        if (!token) {
            console.log("❌ Transfert annulé.");
            return;
        }
        token = token.trim();
    }
    
    // 2. Embedded tracks data
    const tracks = ${escapedTracksJson};
    const totalTracks = tracks.length;
    console.log("🎵 " + totalTracks + " titres chargés pour le transfert.");
    
    // Helper function for fetch retries on 429
    const fetchWithRetry = async (url, options = {}, retries = 5) => {
        let delay = 2000;
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const res = await fetch(url, options);
                if (res.status === 429) {
                    const retryAfter = res.headers.get('Retry-After') || res.headers.get('retry-after');
                    const waitTime = retryAfter ? (parseInt(retryAfter) + 1) * 1000 : delay;
                    console.warn("⏳ [Rate Limit] Pause de " + Math.round(waitTime/1000) + "s...");
                    await new Promise(r => setTimeout(r, waitTime));
                    delay *= 2;
                    continue;
                }
                return res;
            } catch (err) {
                if (attempt === retries - 1) throw err;
                await new Promise(r => setTimeout(r, delay));
                delay *= 2;
            }
        }
        return fetch(url, options);
    };

    // 3. Choice of destination
    const destChoice = prompt(
        "Où voulez-vous importer ces titres ?\\n" +
        "1 - Titres Likés (Liked Songs)\\n" +
        "2 - Une nouvelle playlist\\n" +
        "3 - Une playlist existante (Saisir le lien ou l'ID)\\n" +
        "4 - Copier uniquement les URIs Spotify (pour collage direct Ctrl+V sur l'application Desktop)", 
        "2"
    );
    if (destChoice !== '1' && destChoice !== '2' && destChoice !== '3' && destChoice !== '4') {
        console.log("❌ Choix invalide. Transfert annulé.");
        return;
    }
    
    let playlistId = 'LM';
    if (destChoice === '3') {
        const input = prompt("Entrez le lien ou l'ID de votre playlist Spotify existante :");
        if (!input) {
            console.log("❌ Transfert annulé.");
            return;
        }
        const match = input.match(/playlist\\/([a-zA-Z0-9]{22})/);
        playlistId = match ? match[1] : input.trim();
        console.log("📂 Utilisation de la playlist existante : ID " + playlistId);
    } else if (destChoice === '2') {
        const playlistName = prompt("Entrez le nom de la nouvelle playlist Spotify :", "${escapedPlaylistName}");
        if (!playlistName) {
            console.log("❌ Nom de playlist invalide. Transfert annulé.");
            return;
        }
        
        console.log("🆕 Création de la playlist \\"" + playlistName + "\\"...");
        const createRes = await fetchWithRetry("https://api.spotify.com/v1/me/playlists", {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: playlistName,
                description: 'Transféré depuis YouTube Music via ProjetSpotifyToYTMusic',
                public: false
            })
        });
        
        if (!createRes.ok) {
            if (createRes.status === 401) {
                alert("❌ Votre jeton d'accès Spotify a expiré ou est invalide. Veuillez rafraîchir la page Spotify Web Player et relancer le script.");
                return;
            }
            const errText = await createRes.text();
            alert("Impossible de créer la playlist : " + createRes.status + " " + errText);
            return;
        }
        const createData = await createRes.json();
        playlistId = createData.id;
        console.log("✅ Playlist créée avec succès ! ID: " + playlistId);
    }
    
    const cleanString = (str) => {
        if (!str) return '';
        return str.toLowerCase()
            .normalize("NFD")
            .replace(/[\\u0300-\\u036f]/g, "")
            .replace(/\\((feat|featuring|with|ft)\\.?\\s+.*?\\)/gi, '')
            .replace(/\\[(feat|featuring|with|ft)\\.?\\s+.*?\\]/gi, '')
            .replace(/\\b(feat|featuring|with|ft)\\.?\\s+.*/gi, '')
            .replace(/\\((official video|official audio|music video|lyrics?\\s*video|lyrics?|clip officiel|video clip|clip|hq|hd|4k)\\)/gi, '')
            .replace(/\\[(official video|official audio|music video|lyrics?\\s*video|lyrics?|clip officiel|video clip|clip|hq|hd|4k)\\]/gi, '')
            .replace(/-\\s+(official video|official audio|music video|lyrics?\\s*video|lyrics?|clip officiel|video clip|clip|hq|hd|4k)$/gi, '')
            .replace(/\\((.*?remaster.*?|re-recorded|live|radio edit|deluxe|bonus|.*?revisited.*?)\\)/gi, '')
            .replace(/\\[(.*?remaster.*?|re-recorded|live|radio edit|deluxe|bonus|.*?revisited.*?)\\]/gi, '')
            .replace(/-\\s+(.*?remaster.*?|re-recorded|live|radio edit|deluxe|bonus|.*?revisited.*?)$/gi, '')
            .replace(/\\s+remaster(ed)?(\\s+\\d+)?/gi, '')
            .replace(/[^\\w\\s]/g, '')
            .replace(/\\s+/g, ' ')
            .trim();
    };
    
    const stringSimilarity = (s1, s2) => {
        if (!s1 || !s2) return 0;
        const words1 = new Set(s1.split(' '));
        const words2 = new Set(s2.split(' '));
        let intersection = 0;
        for (const w of words1) {
            if (words2.has(w)) intersection++;
        }
        const union = words1.size + words2.size - intersection;
        return union === 0 ? 0 : intersection / union;
    };
    
    const calculateMatchScore = (ytTrack, spotifyCandidate) => {
        const titleScore = stringSimilarity(cleanString(ytTrack.title), cleanString(spotifyCandidate.name));
        const artistScore = stringSimilarity(cleanString(ytTrack.artist), cleanString(spotifyCandidate.artists.map(a => a.name).join(', ')));
        const ytDuration = ytTrack.duration_seconds || 0;
        const spotifyDuration = spotifyCandidate.duration_ms / 1000;
        const durationDiff = Math.abs(ytDuration - spotifyDuration);
        let durationScore = 1;
        if (durationDiff > 15) {
            durationScore = Math.max(0, 1 - (durationDiff - 15) / 30);
        }
        return (titleScore * 0.45) + (artistScore * 0.45) + (durationScore * 0.1);
    };
    
    console.log("🔍 Recherche des correspondances sur Spotify...");
    const matchedSpotifyIds = [];
    let successCount = 0;
    
    for (let i = 0; i < totalTracks; i++) {
        const t = tracks[i];
        console.log("[" + (i+1) + "/" + totalTracks + "] Recherche de \\"" + t.title + " - " + t.artist + "\\"...");
        try {
            const query = encodeURIComponent(t.title + " " + t.artist);
            const searchRes = await fetchWithRetry("https://api.spotify.com/v1/search?q=" + query + "&type=track&limit=5&cb=" + Date.now(), {
                headers: { 'Authorization': 'Bearer ' + token },
                cache: 'no-store'
            });
            if (searchRes.status === 401) {
                alert("❌ Votre jeton d'accès Spotify a expiré ou est invalide. Veuillez rafraîchir la page Spotify Web Player et relancer le script.");
                return;
            }
            const searchData = await searchRes.json();
            const candidates = searchData.tracks?.items || [];
            
            if (candidates.length > 0) {
                const scoredCandidates = candidates.map(c => ({
                    candidate: c,
                    score: calculateMatchScore(t, c)
                }));
                scoredCandidates.sort((a, b) => b.score - a.score);
                const best = scoredCandidates[0];
                if (best.score >= 0.45) {
                    matchedSpotifyIds.push(best.candidate.id);
                    console.log("   ✅ Match trouvé : \\"" + best.candidate.name + "\\" par " + best.candidate.artists.map(a=>a.name).join(', ') + " (" + Math.round(best.score*100) + "% match)");
                    successCount++;
                } else {
                    console.warn("   ⚠️ Score de correspondance trop faible (" + Math.round(best.score*100) + "%)");
                }
            } else {
                console.warn("   ❌ Aucun candidat trouvé sur Spotify.");
            }
        } catch (err) {
            console.error("   ❌ Erreur lors de la recherche :", err);
        }
        await new Promise(r => setTimeout(r, 200));
    }
    
    if (matchedSpotifyIds.length === 0) {
        alert("❌ Aucun titre n'a pu être matché sur Spotify.");
        return;
    }
    
    console.log("📊 Recherche terminée. " + matchedSpotifyIds.length + "/" + totalTracks + " correspondances trouvées.");
    
    if (destChoice === '4') {
        const uris = matchedSpotifyIds.map(id => 'spotify:track:' + id).join('\\n');
        console.log("========================================");
        console.log("📋 LISTE DES URIs SPOTIFY :");
        console.log(uris);
        console.log("========================================");
        
        const robustConsoleCopy = async (val) => {
            let ok = false;
            try { copy(val); ok = true; } catch (e) {}
            if (!ok) {
                try { await navigator.clipboard.writeText(val); ok = true; } catch (e) {}
            }
            if (!ok) {
                try {
                    const textarea = document.createElement('textarea');
                    textarea.value = val;
                    textarea.style.position = 'fixed';
                    textarea.style.top = '0';
                    textarea.style.left = '0';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    ok = true;
                } catch (e) {}
            }
            return ok;
        };
        
        const copied = await robustConsoleCopy(uris);
        if (copied) {
            alert("🎉 " + matchedSpotifyIds.length + " URIs Spotify ont été copiées dans le presse-papiers !\\n\\nOuvrez votre application Spotify Desktop, allez sur votre playlist, et appuyez sur Ctrl+V (ou Cmd+V) pour ajouter les titres d'un coup sans passer par l'API.\\n\\nSi la copie a échoué, vous pouvez copier la liste depuis la console (F12).");
        } else {
            prompt("🎉 " + matchedSpotifyIds.length + " URIs Spotify trouvées !\\nLa copie automatique a été bloquée par le navigateur.\\n\\nFaites Ctrl+C pour copier la liste ci-dessous, puis Ctrl+V dans votre application Spotify Desktop :", uris);
        }
        return;
    }
    
    console.log("📥 Ajout des titres sur Spotify...");
    
    const batchSize = playlistId === 'LM' ? 50 : 100;
    const batches = [];
    for (let i = 0; i < matchedSpotifyIds.length; i += batchSize) {
        batches.push(matchedSpotifyIds.slice(i, i + batchSize));
    }
    
    let addedCount = 0;
    for (let b = 0; b < batches.length; b++) {
        const batch = batches[b];
        console.log("📤 Ajout du lot " + (b+1) + "/" + batches.length + " (" + batch.length + " titres)...");
        try {
            if (playlistId === 'LM') {
                const addRes = await fetchWithRetry('https://api.spotify.com/v1/me/tracks', {
                    method: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ids: batch })
                });
                if (!addRes.ok) {
                    if (addRes.status === 401) {
                        alert("❌ Votre jeton d'accès Spotify a expiré ou est invalide. Veuillez rafraîchir la page Spotify Web Player et relancer le script.");
                        return;
                    }
                    throw new Error(await addRes.text());
                }
            } else {
                const uris = batch.map(id => 'spotify:track:' + id);
                const addRes = await fetchWithRetry("https://api.spotify.com/v1/playlists/" + playlistId + "/tracks", {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ uris: uris })
                });
                if (!addRes.ok) {
                    if (addRes.status === 401) {
                        alert("❌ Votre jeton d'accès Spotify a expiré ou est invalide. Veuillez rafraîchir la page Spotify Web Player et relancer le script.");
                        return;
                    }
                    throw new Error(await addRes.text());
                }
            }
            addedCount += batch.length;
            console.log("   ✅ Lot " + (b+1) + " ajouté.");
        } catch (err) {
            console.error("   ❌ Erreur lors de l'ajout du lot " + (b+1) + " :", err);
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    
    alert("🎉 Transfert terminé avec succès !\\n\\n" + addedCount + " titres sur " + totalTracks + " ont été ajoutés à votre compte Spotify.");
})();`;
}

function copyTransferScript() {
    let script = '';
    const tracks = ytState.tracks;
    
    if (tracks.length === 0) {
        const transferScriptArea = document.getElementById('transfer-script-area');
        if (transferScriptArea) {
            script = transferScriptArea.value;
        }
    } else {
        const playlistSelect = document.getElementById('yt-source-playlist-select');
        let playlistName = "YTM Import";
        if (playlistSelect) {
            const selectedOpt = playlistSelect.options[playlistSelect.selectedIndex];
            if (selectedOpt && selectedOpt.text) {
                playlistName = selectedOpt.text.replace(/🟢|🔴|⚡|🔑|🌐/g, '').trim();
            }
        }
        
        const simplifiedTracks = tracks.map(t => ({
            title: t.title,
            artist: t.artist,
            duration_seconds: t.duration_seconds
        }));
        
        script = getDirectTransferScript(simplifiedTracks, playlistName);
    }
    
    if (!script) return;
    
    window.robustCopyText(script).then((copied) => {
        if (copied) {
            if (tracks.length === 0) {
                alert('Le script de transfert générique a été copié dans votre presse-papiers !\n\nCollez-le dans la console de votre navigateur sur open.spotify.com pour importer vos musiques.');
            } else {
                alert('Le script de transfert direct contenant vos ' + tracks.length + ' titres YTM a été copié !\n\nCollez-le directement dans la console de votre navigateur (F12 -> onglet Console) sur open.spotify.com pour démarrer le transfert automatique sans aucune autre manipulation !');
            }
        } else {
            prompt("Échec de la copie automatique.\nFaites Ctrl+C pour copier le script de transfert ci-dessous :", script);
        }
    });
}

function copyYtCleanScript() {
    const cleanScriptArea = document.getElementById('clean-script-area');
    if (!cleanScriptArea) return;
    
    const script = cleanScriptArea.value;
    window.robustCopyText(script).then((copied) => {
        if (copied) {
            alert("Le script de nettoyage de bibliothèque a été copié dans votre presse-papiers !\n\nCollez-le dans la console de votre navigateur sur music.youtube.com (page Titres Likés) pour retirer le \"J'aime\" de vos morceaux.");
        } else {
            prompt("Échec de la copie automatique.\nFaites Ctrl+C pour copier le script de nettoyage ci-dessous :", script);
        }
    });
}

// ==========================================
// YOUTUBE MUSIC ➔ SPOTIFY CONTROLLER LOGIC
// ==========================================

// Switch between tabs
function switchTab(tab, isInitial = false) {
    if (tab === activeTab) return;
    
    // Clear any pending transition timeout to prevent race conditions
    if (tabTransitionTimeout) {
        clearTimeout(tabTransitionTimeout);
        tabTransitionTimeout = null;
    }
    
    const wrapper = document.getElementById('tab-panels-wrapper');
    
    // Only scroll if the tab bar is above the viewport (user scrolled past it)
    const tabBar = document.querySelector('.tabs');
    if (tabBar && !isInitial) {
        const tabBarRect = tabBar.getBoundingClientRect();
        if (tabBarRect.top < 0) {
            // Tab bar is above viewport, scroll it back into view instantly
            tabBar.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }
    
    const runSwitch = () => {
        activeTab = tab;
        localStorage.setItem('activeYtTab', tab);
        
        const btnTabSpotifyToYt = document.getElementById('btn-tab-spotify-to-yt');
        const btnTabYtToSpotify = document.getElementById('btn-tab-yt-to-spotify');
        const btnTabYtMerge = document.getElementById('btn-tab-yt-merge');
        const btnTabYtCopy = document.getElementById('btn-tab-yt-copy');
        
        const panelSpotify = document.getElementById('panel-spotify-to-yt');
        const panelYt = document.getElementById('panel-yt-to-spotify');
        const panelMerge = document.getElementById('panel-yt-merge');
        const panelCopy = document.getElementById('panel-yt-copy');
        
        // Deactivate all buttons
        if (btnTabSpotifyToYt) btnTabSpotifyToYt.classList.remove('active');
        if (btnTabYtToSpotify) btnTabYtToSpotify.classList.remove('active');
        if (btnTabYtMerge) btnTabYtMerge.classList.remove('active');
        if (btnTabYtCopy) btnTabYtCopy.classList.remove('active');
        
        // Deactivate all panels
        if (panelSpotify) panelSpotify.classList.remove('active');
        if (panelYt) panelYt.classList.remove('active');
        if (panelMerge) panelMerge.classList.remove('active');
        if (panelCopy) panelCopy.classList.remove('active');
        
        if (tab === 'spotify-to-yt') {
            if (btnTabSpotifyToYt) btnTabSpotifyToYt.classList.add('active');
            if (panelSpotify) panelSpotify.classList.add('active');
        } else if (tab === 'yt-to-spotify') {
            if (btnTabYtToSpotify) btnTabYtToSpotify.classList.add('active');
            if (panelYt) panelYt.classList.add('active');
            
            // Dynamic fetch of Spotify playlists if not loaded yet
            if (ytState.playlists.length === 0 && appState.spotifyAuthorized) {
                loadSpotifyPlaylists();
            }
        } else if (tab === 'yt-merge') {
            if (btnTabYtMerge) btnTabYtMerge.classList.add('active');
            if (panelMerge) panelMerge.classList.add('active');
            populateMergePlaylistsList();
        } else if (tab === 'yt-copy') {
            if (btnTabYtCopy) btnTabYtCopy.classList.add('active');
            if (panelCopy) panelCopy.classList.add('active');
            populateCopyPlaylistsDropdown();
            checkSecondaryAccountStatus();
        }
    };
    
    if (isInitial || !wrapper) {
        runSwitch();
        return;
    }
    
    if (wrapper) {
        // Reset wrapper to clean state before measuring (cancel any in-progress transition)
        wrapper.style.transition = 'none';
        wrapper.style.height = 'auto';
        wrapper.style.overflow = 'visible';
        
        // Measure the current height before switching
        const startHeight = wrapper.offsetHeight;
        
        runSwitch();
        
        // Measure the new target height
        const endHeight = wrapper.offsetHeight;
        
        if (endHeight < startHeight) {
            // Panel is SHRINKING: animate the height reduction quickly
            wrapper.style.height = startHeight + 'px';
            wrapper.style.overflow = 'hidden';
            
            // Force reflow
            wrapper.offsetHeight;
            
            // Fast shrink transition (0.5s) — the slow 2.5s panelFadeIn handles content appearance
            wrapper.style.transition = 'height 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            wrapper.style.height = endHeight + 'px';
            
            // After transition, clear inline styling to let options overflow naturally
            tabTransitionTimeout = setTimeout(() => {
                wrapper.style.height = 'auto';
                wrapper.style.transition = 'none';
                wrapper.style.overflow = 'visible';
                tabTransitionTimeout = null;
            }, 500);
        }
        // Panel is GROWING or same size: no height transition needed,
        // panelFadeIn CSS animation handles the visual effect
    } else {
        runSwitch();
    }
}

// Load Spotify playlists for the destination dropdown
function toggleYtSpotifyBlockedState(blocked) {
    const select = document.getElementById('spotify-dest-playlist-select');
    const btnMatch = document.getElementById('btn-yt-start-matching');
    const btnCopyDirect = document.getElementById('btn-yt-copy-script-direct');
    const transferSettings = document.querySelector('.transfer-settings');
    const warningBanner = document.getElementById('yt-premium-warning-banner');
    
    // Always keep the dashboard matcher button visible
    if (btnMatch) btnMatch.style.display = 'inline-block';
    
    if (blocked) {
        if (select) select.style.display = 'none';
        if (btnCopyDirect) btnCopyDirect.style.display = 'inline-block';
        if (transferSettings) transferSettings.style.display = 'none';
        if (warningBanner) warningBanner.style.display = 'block';
    } else {
        if (select) select.style.display = 'inline-block';
        if (btnCopyDirect) btnCopyDirect.style.display = 'none';
        if (transferSettings) transferSettings.style.display = 'flex';
        if (warningBanner) warningBanner.style.display = 'none';
    }
}

async function loadSpotifyPlaylists() {
    const select = document.getElementById('spotify-dest-playlist-select');
    const warningBanner = document.getElementById('yt-premium-warning-banner');
    if (!select) return;
    select.innerHTML = '<option value="">Chargement des playlists...</option>';
    refreshCustomSelect(select);
    try {
        const res = await fetch(`/api/spotify/playlists?t=${Date.now()}`);
        const data = await res.json();
        
        if (data.success) {
            toggleYtSpotifyBlockedState(false);
            ytState.playlists = data.playlists;
            
            let html = '<option value="LM">🟢 Titres Likés (Liked Songs)</option>';
            html += '<option value="__new__">➕ [Créer une nouvelle playlist]</option>';
            data.playlists.forEach(p => {
                html += `<option value="${p.id}">${p.title}</option>`;
            });
            
            select.innerHTML = html;
            refreshCustomSelect(select);
            handleSpotifyDestPlaylistSelectChange();
        } else {
            toggleYtSpotifyBlockedState(true);
            const isExpired = data.isExpiredToken;
            select.innerHTML = isExpired 
                ? '<option value="">⚠️ Jeton expiré (à renouveler)</option>'
                : '<option value="">⚠️ API Bloquée (Spotify Premium requis)</option>';
            refreshCustomSelect(select);
            if (warningBanner) {
                const p = warningBanner.querySelector('p');
                if (isExpired && p) {
                    p.innerHTML = "Votre jeton d'accès temporaire a expiré. Veuillez suivre les instructions pour en récupérer un nouveau.";
                }
            }
        }
    } catch (e) {
        toggleYtSpotifyBlockedState(true);
        select.innerHTML = '<option value="">⚠️ Erreur de connexion API</option>';
        refreshCustomSelect(select);
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
            const copyBtn = document.getElementById('btn-yt-copy-script-direct');
            if (copyBtn) copyBtn.removeAttribute('disabled');
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
    let configErrorOccurred = null;
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
                    error: true,
                    errorMessage: data.error
                };
                if (data.isPremiumError || data.isExpiredToken || (data.error && (data.error.includes('credentials') || data.error.includes('authorized') || data.error.includes('Premium') || data.error.includes('exceeded')))) {
                    configErrorOccurred = data.error;
                }
                const row = document.getElementById(`yt-row-${track.videoId}`);
                if (row) row.className = 'no-match-row';
                cell.innerHTML = `<span class="match-badge low" title="${data.error || 'Erreur'}">Erreur</span>`;
            }
        } catch (e) {
            ytState.matches[track.videoId] = {
                bestMatch: null,
                candidates: [],
                manual: false,
                searching: false,
                error: true,
                errorMessage: e.message
            };
            const row = document.getElementById(`yt-row-${track.videoId}`);
            if (row) row.className = 'no-match-row';
            cell.innerHTML = `<span class="match-badge low" title="${e.message || 'Erreur Réseau'}">Erreur Réseau</span>`;
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
    
    if (configErrorOccurred) {
        alert(`⚠️ Une erreur est survenue lors du matching Spotify :\n\n"${configErrorOccurred}"\n\nSi vous n'avez pas de compte Spotify Premium, veuillez obtenir et coller un "Jeton Web Player" dans le panneau de configuration Spotify en haut de page.`);
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

function copyYtMatchedUris() {
    if (ytState.tracks.length === 0) {
        alert("Aucun titre chargé.");
        return;
    }
    
    const matchedUris = [];
    ytState.tracks.forEach(t => {
        const match = ytState.matches[t.videoId];
        if (match) {
            const id = match.manual ? match.videoId : match.bestMatch?.videoId;
            if (id) {
                matchedUris.push(`spotify:track:${id}`);
            }
        }
    });
    
    if (matchedUris.length === 0) {
        alert("Aucun titre n'a été matché avec succès pour le moment. Veuillez lancer la recherche (Matcher) d'abord.");
        return;
    }
    
    const text = matchedUris.join('\n');
    window.robustCopyText(text).then((copied) => {
        if (copied) {
            alert(`🎉 ${matchedUris.length} URIs Spotify ont été copiées dans le presse-papiers !\n\nOuvrez votre application Spotify Desktop, allez sur votre playlist, et appuyez sur Ctrl+V (ou Cmd+V) pour ajouter les titres d'un coup sans aucune API !`);
        } else {
            prompt(`🎉 ${matchedUris.length} URIs Spotify trouvées !\nLa copie automatique a échoué.\n\nFaites Ctrl+C pour copier les URIs ci-dessous, puis Ctrl+V dans Spotify Desktop :`, text);
        }
    });
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
            const copyBtn = document.getElementById('btn-yt-copy-script-direct');
            if (copyBtn) copyBtn.removeAttribute('disabled');
            alert(`${tracks.length} titres chargés avec succès !`);
        } catch (err) {
            alert("Erreur lors de la lecture du fichier : " + err.message);
        }
    };
    reader.readAsText(file);
}

window.copySpotifyExtractionScript = function() {
    const script = `(async () => {
    console.log("🚀 Démarrage du script d'extraction rapide du jeton Spotify...");
    const isSpotifyToken = (str) => typeof str === 'string' && /^BQ[a-zA-Z0-9_\\-]{100,450}$/.test(str);
    
    const captureToken = async () => {
        // 1. Try internal fetch
        try {
            const res = await fetch("https://open.spotify.com/get_access_token?reason=transport&productType=web_player");
            const data = await res.json();
            if (isSpotifyToken(data.accessToken)) return data.accessToken;
        } catch (e) {}
        
        // 2. Try #session element
        try {
            const sessionEl = document.getElementById('session') || document.querySelector('#session');
            if (sessionEl) {
                const sessionData = JSON.parse(sessionEl.textContent || sessionEl.innerText);
                if (isSpotifyToken(sessionData.accessToken)) return sessionData.accessToken;
            }
        } catch (e) {}
        
        // 3. Scan scripts
        try {
            for (const script of document.querySelectorAll('script')) {
                const content = script.textContent || script.innerText || '';
                if (content.includes('accessToken')) {
                    const match = content.match(/"accessToken"\\s*:\\s*"([^"]+)"/);
                    if (match && isSpotifyToken(match[1])) return match[1];
                }
            }
        } catch (e) {}
        
        // 4. Scan storage
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const val = localStorage.getItem(key);
                if (isSpotifyToken(val)) return val;
                try {
                    const parsed = JSON.parse(val);
                    if (parsed && typeof parsed === 'object') {
                        for (const k in parsed) {
                            if (isSpotifyToken(parsed[k])) return parsed[k];
                        }
                    }
                } catch (e) {}
            }
        } catch (e) {}
        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                const val = sessionStorage.getItem(key);
                if (isSpotifyToken(val)) return val;
                try {
                    const parsed = JSON.parse(val);
                    if (parsed && typeof parsed === 'object') {
                        for (const k in parsed) {
                            if (isSpotifyToken(parsed[k])) return parsed[k];
                        }
                    }
                } catch (e) {}
            }
        } catch (e) {}
        
        // 5. Scan React DOM
        try {
            const evaluator = (obj, visited = new Set()) => {
                if (!obj || typeof obj !== 'object' || visited.has(obj)) return null;
                visited.add(obj);
                for (const key in obj) {
                    try {
                        const val = obj[key];
                        if (isSpotifyToken(val)) return val;
                        if (val && typeof val === 'object') {
                            const res = evaluator(val, visited);
                            if (res) return res;
                        }
                    } catch (e) {}
                }
                return null;
            };
            const allElements = document.getElementsByTagName('*');
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i];
                for (const key of Object.keys(el)) {
                    if (key.startsWith('__react') || key.startsWith('__reactFiber') || key.startsWith('__reactProps') || key.startsWith('__reactContainer')) {
                        const token = evaluator(el[key]);
                        if (token) return token;
                    }
                }
            }
        } catch (e) {}
        
        // 6. Network Interception
        return new Promise((resolve) => {
            console.log("⏳ En attente de détection réseau (veuillez patienter ou faire une action)...");
            const originalFetch = window.fetch;
            const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
            let resolved = false;
            const cleanup = () => {
                window.fetch = originalFetch;
                XMLHttpRequest.prototype.setRequestHeader = originalSetRequestHeader;
            };
            const timeoutId = setTimeout(() => {
                if (!resolved) { cleanup(); resolve(null); }
            }, 5000);
            
            XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
                try {
                    if (header && header.toLowerCase() === 'authorization' && value && value.startsWith('Bearer ')) {
                        const t = value.substring(7).trim();
                        if (isSpotifyToken(t) && !resolved) {
                            resolved = true;
                            clearTimeout(timeoutId);
                            cleanup();
                            resolve(t);
                        }
                    }
                } catch (err) {}
                return originalSetRequestHeader.apply(this, arguments);
            };
            
            window.fetch = function(url, options) {
                try {
                    let urlStr = '';
                    if (typeof url === 'string') urlStr = url;
                    else if (url && typeof url === 'object' && url.url) urlStr = url.url;
                    
                    if (urlStr.includes('spotify.com')) {
                        let auth = null;
                        if (options && options.headers) {
                            if (options.headers instanceof Headers) auth = options.headers.get('Authorization');
                            else if (typeof options.headers === 'object') auth = options.headers['Authorization'] || options.headers['authorization'];
                        }
                        if (!auth && url && typeof url === 'object' && url.headers) {
                            if (url.headers instanceof Headers) auth = url.headers.get('Authorization');
                            else if (typeof url.headers === 'object') auth = url.headers['Authorization'] || url.headers['authorization'];
                        }
                        if (auth && auth.startsWith('Bearer ')) {
                            const t = auth.substring(7).trim();
                            if (isSpotifyToken(t) && !resolved) {
                                resolved = true;
                                clearTimeout(timeoutId);
                                cleanup();
                                resolve(t);
                            }
                        }
                    }
                } catch (err) {}
                return originalFetch.apply(this, arguments);
            };
        });
    };
    
    const token = await captureToken();
    
    const robustConsoleCopy = async (val) => {
        let ok = false;
        try { copy(val); ok = true; } catch (e) {}
        if (!ok) {
            try { await navigator.clipboard.writeText(val); ok = true; } catch (e) {}
        }
        if (!ok) {
            try {
                const textarea = document.createElement('textarea');
                textarea.value = val;
                textarea.style.position = 'fixed';
                textarea.style.top = '0';
                textarea.style.left = '0';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                ok = true;
            } catch (e) {}
        }
        return ok;
    };

    if (token) {
        console.log("========================================");
        console.log("✅ JETON EXTRACTED SPOTIFY :");
        console.log(token);
        console.log("========================================");
        
        const copied = await robustConsoleCopy(token);
        if (copied) {
            alert("🎉 Jeton d'accès copié dans votre presse-papiers !\\n\\nSi le collage ne fonctionne pas, vous pouvez le copier manuellement depuis la console de développement (F12).");
        } else {
            prompt("🎉 Jeton d'accès extrait avec succès !\\nLa copie automatique a été bloquée par le navigateur.\\n\\nFaites Ctrl+C (ou Cmd+C) pour copier le jeton ci-dessous :", token);
        }
    } else {
        const manual = prompt("Jeton d'accès automatique introuvable (Bloqué par Spotify).\\n\\nPour le récupérer manuellement :\\n1. Ouvrez l'onglet Réseau (Network) de la console (F12).\\n2. Cherchez ou lancez une action (ex: recherche, clic play) pour voir des requêtes vers 'api.spotify.com'.\\n3. Cliquez sur une requête, allez dans l'onglet 'Headers' et faites défiler jusqu'à 'Request Headers'.\\n4. Copiez la valeur de l'en-tête 'Authorization' en retirant le mot 'Bearer '.\\n\\nCollez votre jeton d'accès Spotify ci-dessous :");
        if (manual) {
            const trimmed = manual.trim();
            console.log("========================================");
            console.log("✅ JETON MANUAL SPOTIFY :");
            console.log(trimmed);
            console.log("========================================");
            
            const copied = await robustConsoleCopy(trimmed);
            if (copied) {
                alert("✅ Jeton copié dans le presse-papiers !");
            } else {
                prompt("Jeton copié ! Faites Ctrl+C pour copier le jeton ci-dessous :", trimmed);
            }
        }
    }
})();`;
    window.robustCopyText(script).then((copied) => {
        if (copied) {
            alert('Le script d\'extraction rapide a été copié dans votre presse-papiers !');
        } else {
            prompt("Échec de la copie automatique.\nFaites Ctrl+C pour copier le script d'extraction ci-dessous :", script);
        }
    });
};

window.robustCopyText = async function(text) {
    let copied = false;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            copied = true;
        }
    } catch (e) {}
    if (!copied) {
        try {
            const el = document.createElement('textarea');
            el.value = text;
            el.style.position = 'fixed';
            el.style.top = '0';
            el.style.left = '0';
            el.style.opacity = '0';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            copied = true;
        } catch (e) {}
    }
    return copied;
};

// ==========================================
// YOUTUBE MUSIC MERGE & COPY LOGIC
// ==========================================

async function checkSecondaryAccountStatus() {
    const statusMsg = document.getElementById('yt-secondary-status-msg');
    if (!statusMsg) return;
    
    const secondaryPhoto = document.getElementById('yt-secondary-account-photo');
    const secondaryText = document.getElementById('yt-secondary-account-info-text');
    
    try {
        const res = await fetch(`/api/status?t=${Date.now()}`);
        const data = await res.json();
        if (data.ytMusicSecondaryConfigured) {
            if (data.ytSecondaryAccount) {
                const name = data.ytSecondaryAccount.accountName || '';
                const handle = data.ytSecondaryAccount.channelHandle || '';
                
                if (secondaryText) {
                    secondaryText.textContent = `Statut : Connecté à ${name} ${handle ? '(' + handle + ')' : ''} ✅`;
                } else {
                    statusMsg.innerHTML = `Statut : Connecté à ${name} ${handle ? '(' + handle + ')' : ''} ✅`;
                }
                
                if (secondaryPhoto) {
                    if (data.ytSecondaryAccount.accountPhotoUrl) {
                        secondaryPhoto.src = data.ytSecondaryAccount.accountPhotoUrl;
                        secondaryPhoto.style.display = 'inline-block';
                    } else {
                        secondaryPhoto.style.display = 'none';
                    }
                }
            } else {
                if (secondaryText) {
                    secondaryText.textContent = 'Statut : Compte connecté ✅';
                } else {
                    statusMsg.innerHTML = 'Statut : Compte connecté ✅';
                }
                if (secondaryPhoto) secondaryPhoto.style.display = 'none';
            }
        } else {
            if (secondaryText) {
                secondaryText.textContent = 'Statut : Compte non configuré ❌';
            } else {
                statusMsg.innerHTML = 'Statut : Compte non configuré ❌';
            }
            if (secondaryPhoto) secondaryPhoto.style.display = 'none';
        }
    } catch (e) {
        if (secondaryText) {
            secondaryText.textContent = 'Statut : Erreur de communication ❌';
        } else {
            statusMsg.innerHTML = 'Statut : Erreur de communication ❌';
        }
        if (secondaryPhoto) secondaryPhoto.style.display = 'none';
    }
}

async function saveYtSecondaryConfig() {
    const btn = document.getElementById('btn-save-yt-secondary');
    const headersArea = document.getElementById('yt-headers-secondary');
    if (!btn || !headersArea) return;
    
    const ytHeadersSecondary = headersArea.value.trim();
    if (!ytHeadersSecondary) {
        alert('Veuillez coller des en-têtes valides pour le compte de destination.');
        return;
    }
    
    btn.setAttribute('disabled', 'true');
    btn.textContent = 'Sauvegarde...';
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ytHeadersSecondary })
        });
        const data = await res.json();
        if (data.success) {
            alert('Authentification du deuxième compte YTM sauvegardée avec succès !');
            headersArea.value = '';
            await checkSecondaryAccountStatus();
            const checkboxOtherAccount = document.getElementById('yt-copy-use-other-account');
            if (checkboxOtherAccount && checkboxOtherAccount.checked) {
                await populateCopyPlaylistsDropdownDestSecondary();
            }
        } else {
            alert('Erreur lors de la configuration : ' + (data.error || 'Erreur inconnue'));
        }
    } catch (e) {
        alert('Erreur de communication : ' + e.message);
    } finally {
        btn.removeAttribute('disabled');
        btn.textContent = 'Sauvegarde Compte Destination';
    }
}

function populateMergePlaylistsList() {
    const container = document.getElementById('yt-merge-playlists-list');
    if (!container) return;
    
    if (appState.playlists.length === 0) {
        container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-secondary);">Aucune playlist trouvée. Veuillez d\'abord charger votre bibliothèque dans l\'onglet YT Music.</p>';
        return;
    }
    
    let html = '';
    appState.playlists.forEach((p, idx) => {
        html += `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" class="yt-merge-playlist-cb" id="merge-cb-${p.id}" value="${p.id}" style="width: 1.1rem; height: 1.1rem; cursor: pointer;">
                <label for="merge-cb-${p.id}" style="font-size: 0.85rem; cursor: pointer; color: var(--text-primary); font-weight: 500;">${p.title}</label>
            </div>
        `;
    });
    container.innerHTML = html;
}

function populateCopyPlaylistsDropdown() {
    console.log(`[populateCopyPlaylistsDropdown] Populating with ${appState.playlists.length} playlists.`);
    const sourceSelect = document.getElementById('yt-copy-source-select');
    if (!sourceSelect) return;
    
    if (appState.playlists.length === 0) {
        sourceSelect.innerHTML = '<option value="">Aucune playlist chargée</option>';
        refreshCustomSelect(sourceSelect);
        return;
    }
    
    let html = '';
    appState.playlists.forEach(p => {
        html += `<option value="${p.id}">${p.title}</option>`;
    });
    sourceSelect.innerHTML = html;
    refreshCustomSelect(sourceSelect);
    
    const checkboxOtherAccount = document.getElementById('yt-copy-use-other-account');
    if (checkboxOtherAccount && checkboxOtherAccount.checked) {
        populateCopyPlaylistsDropdownDestSecondary();
    } else {
        populateCopyPlaylistsDropdownDestPrimary();
    }
}

function updateDestInputVisibility(value) {
    const nameGroup = document.getElementById('yt-copy-new-playlist-name-group');
    const label = document.getElementById('yt-copy-dest-input-label');
    const input = document.getElementById('yt-copy-new-name');
    if (!nameGroup || !label || !input) return;
    
    if (value === '__new__') {
        nameGroup.style.display = 'block';
        label.textContent = 'Nom de la nouvelle playlist destination';
        input.placeholder = 'Ex: Copie de ma playlist';
    } else if (value === '__manual__') {
        nameGroup.style.display = 'block';
        label.textContent = 'ID de la playlist destination existante';
        input.placeholder = 'Collez l\'ID de la playlist (ex: PL... ou LM)';
    } else {
        nameGroup.style.display = 'none';
    }
}

function populateCopyPlaylistsDropdownDestPrimary() {
    const destSelect = document.getElementById('yt-copy-dest-select');
    if (!destSelect) return;
    
    let html = '<option value="__new__">➕ [Créer une nouvelle playlist]</option>';
    html += '<option value="LM">👍 [Titres Likés (Liked Music)]</option>';
    html += '<option value="__manual__">✏️ [Entrer l\'ID d\'une playlist existante...]</option>';
    appState.playlists.forEach(p => {
        html += `<option value="${p.id}">${p.title}</option>`;
    });
    destSelect.innerHTML = html;
    refreshCustomSelect(destSelect);
    
    updateDestInputVisibility(destSelect.value);
}

async function populateCopyPlaylistsDropdownDestSecondary() {
    const destSelect = document.getElementById('yt-copy-dest-select');
    if (!destSelect) return;
    
    destSelect.innerHTML = '<option value="">Chargement des playlists...</option>';
    refreshCustomSelect(destSelect);
    
    try {
        const res = await fetch(`/api/ytmusic/secondary/playlists?t=${Date.now()}`);
        const data = await res.json();
        if (data.success && data.playlists) {
            let html = '<option value="__new__">➕ [Créer une nouvelle playlist]</option>';
            html += '<option value="LM">👍 [Titres Likés (Liked Music)]</option>';
            html += '<option value="__manual__">✏️ [Entrer l\'ID d\'une playlist existante...]</option>';
            data.playlists.forEach(p => {
                html += `<option value="${p.id}">${p.title}</option>`;
            });
            destSelect.innerHTML = html;
            refreshCustomSelect(destSelect);
        } else {
            destSelect.innerHTML = '<option value="__new__">➕ [Créer une nouvelle playlist] (Erreur chargement playlists)</option>';
            refreshCustomSelect(destSelect);
        }
    } catch (e) {
        destSelect.innerHTML = '<option value="__new__">➕ [Créer une nouvelle playlist] (Erreur communication)</option>';
        refreshCustomSelect(destSelect);
    }
    
    updateDestInputVisibility(destSelect.value);
}

async function executeYtMerge() {
    const btn = document.getElementById('btn-execute-yt-merge');
    const newNameInput = document.getElementById('yt-merge-new-name');
    const skipDuplicates = document.getElementById('yt-merge-skip-duplicates').checked;
    const progressCard = document.getElementById('yt-merge-progress-card');
    const consoleLog = document.getElementById('yt-merge-console-log');
    const statusAlert = document.getElementById('yt-merge-status-alert');
    
    if (!btn || !newNameInput || !progressCard || !consoleLog || !statusAlert) return;
    
    const newPlaylistName = newNameInput.value.trim();
    if (!newPlaylistName) {
        alert('Veuillez spécifier le nom de la nouvelle playlist.');
        return;
    }
    
    const checkedPlaylists = [];
    document.querySelectorAll('.yt-merge-playlist-cb:checked').forEach(cb => {
        checkedPlaylists.push(cb.value);
    });
    
    if (checkedPlaylists.length < 1) {
        alert('Veuillez sélectionner au moins une playlist source à fusionner.');
        return;
    }
    
    // Reset indicators
    btn.setAttribute('disabled', 'true');
    btn.textContent = 'Fusion en cours...';
    progressCard.style.display = 'block';
    consoleLog.innerHTML = '';
    statusAlert.style.display = 'none';
    
    document.getElementById('yt-merge-progress-counter').textContent = '0 / 0';
    document.getElementById('yt-merge-progress-bar-fill').style.width = '0%';
    document.getElementById('yt-merge-progress-percent').textContent = '0%';
    document.getElementById('yt-merge-progress-eta').textContent = 'Calcul du temps restant...';
    document.getElementById('yt-merge-stat-added').textContent = '0';
    document.getElementById('yt-merge-stat-total').textContent = '0';
    document.getElementById('yt-merge-stat-skipped').textContent = '0';
    
    const log = (msg, type = 'info') => {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        let prefix = 'ℹ️ ';
        let color = '#ffffff';
        if (type === 'success') {
            prefix = '✅ ';
            color = '#1db954';
        } else if (type === 'error') {
            prefix = '❌ ';
            color = '#ef4444';
        } else if (type === 'warning') {
            prefix = '⚠️ ';
            color = '#eab308';
        }
        
        entry.style.color = color;
        entry.style.marginBottom = '0.35rem';
        entry.style.lineHeight = '1.4';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${prefix}${msg}`;
        consoleLog.appendChild(entry);
        consoleLog.scrollTop = consoleLog.scrollHeight;
    };
    
    log(`Lancement de la fusion de ${checkedPlaylists.length} playlists...`, 'info');
    
    const startTime = Date.now();
    
    // Start EventSource
    const eventSourceUrl = `/api/ytmusic/merge-playlists-stream?sourcePlaylistIds=${checkedPlaylists.join(',')}&newPlaylistName=${encodeURIComponent(newPlaylistName)}&skipDuplicates=${skipDuplicates}`;
    const source = new EventSource(eventSourceUrl);
    
    source.addEventListener('info', (event) => {
        const data = JSON.parse(event.data);
        log(data.message, 'info');
    });
    
    source.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        document.getElementById('yt-merge-progress-counter').textContent = `${data.added} / ${data.total}`;
        document.getElementById('yt-merge-progress-bar-fill').style.width = `${data.percent}%`;
        document.getElementById('yt-merge-progress-percent').textContent = `${data.percent}%`;
        document.getElementById('yt-merge-stat-added').textContent = data.added;
        document.getElementById('yt-merge-stat-total').textContent = data.total;
        
        log(data.message, 'info');
        
        // Calculate ETA
        if (data.added > 0) {
            const elapsedMs = Date.now() - startTime;
            const tracksPerMs = data.added / elapsedMs;
            const remainingTracks = data.total - data.added;
            const remainingMs = remainingTracks / tracksPerMs;
            
            if (remainingTracks <= 0) {
                document.getElementById('yt-merge-progress-eta').textContent = 'Terminé';
            } else {
                const totalSeconds = Math.round(remainingMs / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                let etaText = 'Temps restant estimé : ';
                if (minutes > 0) {
                    etaText += `${minutes} min ${seconds} s`;
                } else {
                    etaText += `${seconds} s`;
                }
                document.getElementById('yt-merge-progress-eta').textContent = etaText;
            }
        }
    });
    
    source.addEventListener('success', async (event) => {
        const data = JSON.parse(event.data);
        source.close();
        
        document.getElementById('yt-merge-progress-counter').textContent = `${data.total} / ${data.total}`;
        document.getElementById('yt-merge-progress-bar-fill').style.width = '100%';
        document.getElementById('yt-merge-progress-percent').textContent = '100%';
        document.getElementById('yt-merge-progress-eta').textContent = 'Terminé';
        document.getElementById('yt-merge-stat-added').textContent = data.total;
        document.getElementById('yt-merge-stat-total').textContent = data.total;
        
        // Show success alert
        statusAlert.style.display = 'flex';
        statusAlert.style.background = 'rgba(29, 185, 84, 0.15)';
        statusAlert.style.border = '1px solid #1db954';
        statusAlert.style.color = '#1db954';
        statusAlert.innerHTML = `<span>🎉 <strong>Opération terminée avec succès !</strong> La fusion des playlists est complétée. Nouvelle playlist créée avec ${data.total} titres.</span>`;
        
        log(`Fusion réussie ! Nouvelle playlist créée avec succès. ID: ${data.playlistId}`, 'success');
        log(`${data.total} titres ont été insérés dans la playlist.`, 'success');
        
        newNameInput.value = '';
        document.querySelectorAll('.yt-merge-playlist-cb').forEach(cb => cb.checked = false);
        
        // Unlock
        btn.removeAttribute('disabled');
        btn.textContent = '🔗 Lancer la fusion';
        
        // Reload library playlists dropdowns
        await loadPlaylists();
        populateMergePlaylistsList();
    });
    
    source.addEventListener('error', (event) => {
        const data = event.data ? JSON.parse(event.data) : { error: 'Erreur de connexion SSE' };
        source.close();
        
        statusAlert.style.display = 'flex';
        statusAlert.style.background = 'rgba(239, 68, 68, 0.15)';
        statusAlert.style.border = '1px solid #ef4444';
        statusAlert.style.color = '#ef4444';
        statusAlert.innerHTML = `<span>❌ <strong>Erreur :</strong> ${data.error}</span>`;
        
        log(`Échec de la fusion : ${data.error}`, 'error');
        
        btn.removeAttribute('disabled');
        btn.textContent = '🔗 Lancer la fusion';
    });
}

async function executeYtCopy() {
    const btn = document.getElementById('btn-execute-yt-copy');
    const sourceSelect = document.getElementById('yt-copy-source-select');
    const destSelect = document.getElementById('yt-copy-dest-select');
    const newNameInput = document.getElementById('yt-copy-new-name');
    const useSecondary = document.getElementById('yt-copy-use-other-account').checked;
    const skipDuplicates = document.getElementById('yt-copy-skip-duplicates').checked;
    const optimizeAudio = document.getElementById('yt-copy-optimize-audio')?.checked || false;
    const reverseOrder = document.getElementById('yt-copy-reverse-order')?.checked || false;
    const progressCard = document.getElementById('yt-copy-progress-card');
    const consoleLog = document.getElementById('yt-copy-console-log');
    const statusAlert = document.getElementById('yt-copy-status-alert');
    
    if (!btn || !sourceSelect || !destSelect || !newNameInput || !progressCard || !consoleLog || !statusAlert) return;
    
    const sourcePlaylistId = sourceSelect.value;
    if (!sourcePlaylistId) {
        alert('Veuillez sélectionner une playlist source.');
        return;
    }
    
    let destPlaylistId = destSelect.value;
    const destPlaylistName = newNameInput.value.trim();
    if (destPlaylistId === '__new__' && !destPlaylistName) {
        alert('Veuillez entrer le nom de la nouvelle playlist destination.');
        return;
    }
    if (destPlaylistId === '__manual__') {
        if (!destPlaylistName) {
            alert('Veuillez entrer l\'ID de la playlist de destination.');
            return;
        }
        destPlaylistId = destPlaylistName;
    }
    
    // Reset indicators
    btn.setAttribute('disabled', 'true');
    btn.textContent = 'Copie en cours...';
    progressCard.style.display = 'block';
    consoleLog.innerHTML = '';
    statusAlert.style.display = 'none';
    
    document.getElementById('yt-copy-progress-counter').textContent = '0 / 0';
    document.getElementById('yt-copy-progress-bar-fill').style.width = '0%';
    document.getElementById('yt-copy-progress-percent').textContent = '0%';
    document.getElementById('yt-copy-progress-eta').textContent = 'Calcul du temps restant...';
    document.getElementById('yt-copy-stat-added').textContent = '0';
    document.getElementById('yt-copy-stat-total').textContent = '0';
    document.getElementById('yt-copy-stat-skipped').textContent = '0';
    
    const log = (msg, type = 'info') => {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        let prefix = 'ℹ️ ';
        let color = '#ffffff';
        if (type === 'success') {
            prefix = '✅ ';
            color = '#1db954';
        } else if (type === 'error') {
            prefix = '❌ ';
            color = '#ef4444';
        } else if (type === 'warning') {
            prefix = '⚠️ ';
            color = '#eab308';
        }
        
        entry.style.color = color;
        entry.style.marginBottom = '0.35rem';
        entry.style.lineHeight = '1.4';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${prefix}${msg}`;
        consoleLog.appendChild(entry);
        consoleLog.scrollTop = consoleLog.scrollHeight;
    };
    
    log(`Lancement de la copie de la playlist source (ID: ${sourcePlaylistId})...`, 'info');
    if (useSecondary) {
        log(`Destination : Autre compte YouTube Music.`, 'info');
    } else {
        log(`Destination : Même compte YouTube Music.`, 'info');
    }
    
    const startTime = Date.now();
    
    // Start EventSource
    const eventSourceUrl = `/api/ytmusic/copy-playlist-stream?sourcePlaylistId=${sourcePlaylistId}&destPlaylistId=${destPlaylistId}&destPlaylistName=${encodeURIComponent(destPlaylistName)}&useSecondaryAccount=${useSecondary}&skipDuplicates=${skipDuplicates}&optimizeAudio=${optimizeAudio}&reverseOrder=${reverseOrder}`;
    const source = new EventSource(eventSourceUrl);
    
    source.addEventListener('info', (event) => {
        const data = JSON.parse(event.data);
        log(data.message, 'info');
    });
    
    source.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        document.getElementById('yt-copy-progress-counter').textContent = `${data.added} / ${data.total}`;
        document.getElementById('yt-copy-progress-bar-fill').style.width = `${data.percent}%`;
        document.getElementById('yt-copy-progress-percent').textContent = `${data.percent}%`;
        document.getElementById('yt-copy-stat-added').textContent = data.added;
        document.getElementById('yt-copy-stat-total').textContent = data.total;
        document.getElementById('yt-copy-stat-skipped').textContent = data.duplicatesSkipped || 0;
        
        log(data.message, 'info');
        
        // Calculate ETA
        const processed = data.added + (data.failed || 0);
        if (processed > 0) {
            const elapsedMs = Date.now() - startTime;
            const tracksPerMs = processed / elapsedMs;
            const remainingTracks = data.total - data.added - (data.failed || 0);
            const remainingMs = remainingTracks / tracksPerMs;
            
            if (remainingTracks <= 0) {
                document.getElementById('yt-copy-progress-eta').textContent = 'Terminé';
            } else {
                const totalSeconds = Math.round(remainingMs / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                let etaText = 'Temps restant estimé : ';
                if (minutes > 0) {
                    etaText += `${minutes} min ${seconds} s`;
                } else {
                    etaText += `${seconds} s`;
                }
                document.getElementById('yt-copy-progress-eta').textContent = etaText;
            }
        }
    });
    
    source.addEventListener('success', async (event) => {
        const data = JSON.parse(event.data);
        source.close();
        
        const displayTotal = data.total + (data.failed || 0);
        document.getElementById('yt-copy-progress-counter').textContent = `${displayTotal} / ${displayTotal}`;
        document.getElementById('yt-copy-progress-bar-fill').style.width = '100%';
        document.getElementById('yt-copy-progress-percent').textContent = '100%';
        document.getElementById('yt-copy-progress-eta').textContent = 'Terminé';
        document.getElementById('yt-copy-stat-added').textContent = data.total;
        document.getElementById('yt-copy-stat-total').textContent = displayTotal;
        document.getElementById('yt-copy-stat-skipped').textContent = data.duplicatesSkipped || 0;
        
        // Show success alert
        statusAlert.style.display = 'flex';
        statusAlert.style.background = 'rgba(29, 185, 84, 0.15)';
        statusAlert.style.border = '1px solid #1db954';
        statusAlert.style.color = '#1db954';
        
        let alertMsg = `🎉 <strong>Opération terminée !</strong> ${data.total} titre(s) copié(s)`;
        if (data.failed > 0) {
            alertMsg += ` (${data.failed} échec(s))`;
        }
        if (data.duplicatesSkipped > 0) {
            alertMsg += ` et ${data.duplicatesSkipped} doublon(s) ignoré(s)`;
        }
        alertMsg += '.';
        statusAlert.innerHTML = `<span>${alertMsg}</span>`;
        
        log(`Copie réussie ! ID Playlist destination : ${data.playlistId}`, 'success');
        log(`${data.total} titres copiés dans l'ordre original.`, 'success');
        
        newNameInput.value = '';
        
        // Unlock
        btn.removeAttribute('disabled');
        btn.textContent = '📋 Lancer la copie dans l\'ordre';
        
        // Reload playlists dropdowns
        await loadPlaylists();
        populateCopyPlaylistsDropdown();
    });
    
    source.addEventListener('error', (event) => {
        const data = event.data ? JSON.parse(event.data) : { error: 'Erreur de connexion SSE' };
        source.close();
        
        statusAlert.style.display = 'flex';
        statusAlert.style.background = 'rgba(239, 68, 68, 0.15)';
        statusAlert.style.border = '1px solid #ef4444';
        statusAlert.style.color = '#ef4444';
        statusAlert.innerHTML = `<span>❌ <strong>Erreur :</strong> ${data.error}</span>`;
        
        log(`Échec de la copie : ${data.error}`, 'error');
        
        btn.removeAttribute('disabled');
        btn.textContent = '📋 Lancer la copie dans l\'ordre';
    });
}

// ==========================================
// YOUTUBE MUSIC PROFILES MANAGEMENT
// ==========================================

async function loadYtProfiles() {
    const primarySelect = document.getElementById('yt-primary-profile-select');
    const secondarySelect = document.getElementById('yt-secondary-profile-select');
    const primaryContainer = document.getElementById('yt-primary-profile-container');
    const secondaryContainer = document.getElementById('yt-secondary-profile-container');
    
    if (!primarySelect || !secondarySelect || !primaryContainer || !secondaryContainer) return;
    
    try {
        const res = await fetch(`/api/ytmusic/profiles?t=${Date.now()}`);
        const data = await res.json();
        if (data.success && data.profiles) {
            const profiles = data.profiles;
            
            if (profiles.length > 0) {
                primaryContainer.style.display = 'flex';
                secondaryContainer.style.display = 'flex';
                
                let html = '<option value="">-- Sélectionner un profil --</option>';
                profiles.forEach(p => {
                    const label = `${p.accountName} (${p.channelHandle || 'Compte'})`;
                    html += `<option value="${p.id}">${label}</option>`;
                });
                
                primarySelect.innerHTML = html;
                secondarySelect.innerHTML = html;
                
                primarySelect.value = data.activePrimaryId || '';
                secondarySelect.value = data.activeSecondaryId || '';
                
                refreshCustomSelect(primarySelect);
                refreshCustomSelect(secondarySelect);
            } else {
                primaryContainer.style.display = 'none';
                secondaryContainer.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Failed to load YTM profiles:', e);
    }
}

async function selectYtProfile(profileId, target) {
    if (!profileId) return;
    console.log(`[selectYtProfile] Selected profile ID: ${profileId} for target: ${target}`);
    try {
        const res = await fetch('/api/ytmusic/profiles/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId, target })
        });
        const data = await res.json();
        if (data.success) {
            console.log(`[selectYtProfile] Success. Target: ${target}`);
            if (target === 'primary') {
                await checkStatus();
                await loadYtProfiles();
            } else {
                await checkSecondaryAccountStatus();
                await loadYtProfiles();
                const checkboxOtherAccount = document.getElementById('yt-copy-use-other-account');
                if (checkboxOtherAccount && checkboxOtherAccount.checked) {
                    await populateCopyPlaylistsDropdownDestSecondary();
                }
            }
        } else {
            alert('Erreur lors de la sélection du profil : ' + (data.error || 'Erreur inconnue'));
        }
    } catch (e) {
        alert('Erreur de communication : ' + e.message);
    }
}

async function deleteYtProfile(profileId) {
    if (!profileId) return;
    if (!confirm('Voulez-vous vraiment supprimer ce profil YouTube Music ? Ses en-têtes de connexion seront définitivement effacés.')) return;
    try {
        const res = await fetch(`/api/ytmusic/profiles/${profileId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            alert('Profil supprimé avec succès !');
            await loadYtProfiles();
            await checkStatus();
            await checkSecondaryAccountStatus();
        } else {
            alert('Erreur lors de la suppression : ' + (data.error || 'Erreur inconnue'));
        }
    } catch (e) {
        alert('Erreur de communication : ' + e.message);
    }
}

// ==========================================
// CUSTOM PREMIUM DROPDOWN SELECTS
// ==========================================

function initCustomSelects() {
    const selectElements = document.querySelectorAll('select');
    selectElements.forEach(select => {
        if (select.dataset.customSelectInit) return;
        select.dataset.customSelectInit = 'true';
        
        // Add class to hide native select via CSS
        select.classList.add('custom-select-hidden');
        
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        if (select.id) wrapper.id = 'wrapper-' + select.id;
        
        // Propagate layout classes safely
        if (select.className) {
            const classes = select.className.split(/\s+/).filter(c => c.trim() !== '' && c !== 'custom-select' && c !== 'custom-select-hidden');
            if (classes.length > 0) {
                wrapper.classList.add(...classes);
            }
        }
        
        // Sync wrapper visibility to match native select's inline style
        function syncWrapperVisibility() {
            if (select.style.display === 'none') {
                wrapper.style.display = 'none';
            } else {
                wrapper.style.display = '';
            }
        }
        
        syncWrapperVisibility();
        
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        wrapper.appendChild(trigger);
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-select-options';
        wrapper.appendChild(optionsContainer);
        
        // Build option items dynamically
        function rebuildOptions() {
            optionsContainer.innerHTML = '';
            
            Array.from(select.options).forEach(opt => {
                const optEl = document.createElement('div');
                optEl.className = 'custom-option';
                optEl.dataset.value = opt.value;
                
                // Colorize special setup action items to stand out beautifully
                if (opt.textContent.includes('➕') || opt.textContent.includes('✏️')) {
                    optEl.style.color = 'var(--accent-purple)';
                    optEl.style.fontWeight = '700';
                    optEl.style.borderTop = '1px solid rgba(255,255,255,0.03)';
                } else if (opt.textContent.includes('👍') || opt.textContent.includes('Titres Likés') || opt.textContent.includes('Liked Music') || opt.textContent.includes('Titres likés')) {
                    optEl.style.color = 'var(--youtube-red)';
                    optEl.style.fontWeight = '600';
                }
                
                optEl.textContent = opt.textContent;
                
                if (opt.selected) {
                    optEl.classList.add('selected');
                    trigger.textContent = opt.textContent;
                }
                
                optEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    select.value = opt.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    wrapper.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
                    optEl.classList.add('selected');
                    trigger.textContent = opt.textContent;
                    wrapper.classList.remove('open');
                });
                
                optionsContainer.appendChild(optEl);
            });
            
            if (select.selectedIndex !== -1 && select.options[select.selectedIndex]) {
                trigger.textContent = select.options[select.selectedIndex].textContent;
            } else {
                trigger.textContent = select.placeholder || '-- Sélectionner --';
            }
        }
        
        rebuildOptions();
        select.rebuildCustomOptions = rebuildOptions;
        
        // Click to open/close
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wrapper.classList.contains('open');
            document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
            if (!isOpen) wrapper.classList.add('open');
        });
        
        // Watch for raw DOM option changes AND inline style attribute changes
        const observer = new MutationObserver((mutations) => {
            let optionsChanged = false;
            let visibilityChanged = false;
            
            mutations.forEach(m => {
                if (m.type === 'childList' || m.type === 'characterData') {
                    optionsChanged = true;
                } else if (m.type === 'attributes' && m.attributeName === 'style') {
                    visibilityChanged = true;
                }
            });
            
            if (optionsChanged) rebuildOptions();
            if (visibilityChanged) syncWrapperVisibility();
        });
        observer.observe(select, { 
            childList: true, 
            characterData: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['style']
        });
        
        // Monitor manual script select.value adjustments (e.g. setting selectedIndex/value programmatically)
        setInterval(() => {
            let currentText = '';
            if (select.selectedIndex !== -1 && select.options[select.selectedIndex]) {
                currentText = select.options[select.selectedIndex].textContent;
            } else {
                currentText = select.placeholder || '-- Sélectionner --';
            }
            
            if (trigger.textContent !== currentText) {
                trigger.textContent = currentText;
                wrapper.querySelectorAll('.custom-option').forEach(el => {
                    if (el.dataset.value === select.value) {
                        el.classList.add('selected');
                    } else {
                        el.classList.remove('selected');
                    }
                });
            }
        }, 150);
    });
}

// Global click handler to close open dropdowns
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
});

// Helper to explicitly refresh custom select representation when underlying native select is programmatically changed
function refreshCustomSelect(select) {
    const target = typeof select === 'string' ? document.getElementById(select) : select;
    if (target && typeof target.rebuildCustomOptions === 'function') {
        target.rebuildCustomOptions();
    }
}




