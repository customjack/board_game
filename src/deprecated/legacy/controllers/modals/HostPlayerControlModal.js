import { DEFAULT_HEX_COLOR, normalizeToHexColor } from '../../utils/colorUtils.js';

/**
 * HostPlayerControlModal - Host management of other players
 *
 * Allows host to:
 * - Change any player's nickname
 * - Change any player's colors
 * - Kick players from the game
 */
export default class HostPlayerControlModal {
    /**
     * @param {string} modalId - DOM ID for the modal container
     * @param {Player} targetPlayer - The player being managed
     * @param {Function} onNicknameChange - Callback when nickname changes (playerId, newName)
     * @param {Function} onKickPlayer - Callback when player is kicked (playerId)
     * @param {Function} onColorChange - Callback when player color changes (playerId, newColor)
     * @param {Function} onPeerColorChange - Callback when peer color changes (playerId, newColor)
     */
    constructor(modalId, targetPlayer, onNicknameChange, onKickPlayer, onColorChange, onPeerColorChange) {
        this.modalId = modalId;
        this.targetPlayer = targetPlayer;
        this.onNicknameChange = onNicknameChange;
        this.onKickPlayer = onKickPlayer;
        this.onColorChange = onColorChange;
        this.onPeerColorChange = onPeerColorChange;

        this.selectedTab = 'general';

        this.init();
    }

    init() {
        // Create modal structure if it doesn't exist
        let modal = document.getElementById(this.modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = this.modalId;
            modal.className = 'modal';
            modal.style.display = 'none';
            document.body.appendChild(modal);
        }

        this.modal = modal;
        this.render();
    }

    render() {
        this.modal.innerHTML = `
            <div class="modal-content settings-modal-container">
                <!-- Header with Apply and Close buttons -->
                <div class="settings-modal-header">
                    <h2>Manage Player</h2>
                    <div class="settings-modal-header-buttons">
                        <button class="settings-modal-apply" id="applyHostPlayerSettings" disabled>Apply</button>
                        <button class="settings-modal-close" id="closeHostPlayerControl">&times;</button>
                    </div>
                </div>

                <!-- Body with sidebar and content -->
                <div class="settings-modal-body">
                    <!-- Sidebar navigation -->
                    <div class="settings-modal-sidebar" id="hostPlayerControlSidebar">
                        <div class="settings-nav-item active" data-tab="general">General</div>
                        <div class="settings-nav-item" data-tab="appearance">Appearance</div>
                        <div class="settings-nav-item" data-tab="kick">Kick Player</div>
                    </div>

                    <!-- Content area -->
                    <div class="settings-modal-content" id="hostPlayerControlContent">
                        <!-- Will be populated based on selected tab -->
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.renderTabContent();
    }

    attachEventListeners() {
        // Close button
        const closeBtn = document.getElementById('closeHostPlayerControl');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close();
            });
        }

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Apply button
        const applyBtn = document.getElementById('applyHostPlayerSettings');
        if (applyBtn) {
            applyBtn.addEventListener('click', (e) => {
                this.applyChanges();
            });
        } else {
            console.error('[HostPlayerControlModal] Apply button NOT FOUND!');
        }

        // Tab navigation
        const navItems = this.modal.querySelectorAll('.settings-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.getAttribute('data-tab');
                this.selectTab(tab);
            });
        });
    }

    selectTab(tab) {
        this.selectedTab = tab;

        // Update active nav item
        const navItems = this.modal.querySelectorAll('.settings-nav-item');
        navItems.forEach(item => {
            if (item.getAttribute('data-tab') === tab) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Render tab content
        this.renderTabContent();
    }

    renderTabContent() {
        const content = document.getElementById('hostPlayerControlContent');
        if (!content) return;

        if (this.selectedTab === 'general') {
            this.renderGeneralTab(content);
        } else if (this.selectedTab === 'appearance') {
            this.renderAppearanceTab(content);
        } else if (this.selectedTab === 'kick') {
            this.renderKickTab(content);
        }

        // Attach input listeners after rendering
        this.attachInputListeners();
        this.populateInputsWithPlayerData();
    }

    renderGeneralTab(content) {
        const playerName = this.targetPlayer ? this.targetPlayer._nickname : 'Unknown';

        content.innerHTML = `
            <h3 class="settings-content-title">Player Settings</h3>
            <div class="settings-row">
                <label class="settings-label">Player Name:</label>
                <div class="settings-display">${playerName}</div>
            </div>
            <div class="settings-row">
                <label class="settings-label">Nickname:</label>
                <input
                    type="text"
                    id="hostPlayerNicknameInput"
                    class="input settings-input"
                    placeholder="Enter new nickname"
                    maxlength="32"
                    style="min-width: 200px;"
                />
            </div>
            <p class="help-text" style="margin-top: 8px; font-size: 0.85em; color: var(--text-secondary);">Maximum 32 characters</p>
        `;
    }

    renderAppearanceTab(content) {
        content.innerHTML = `
            <h3 class="settings-content-title">Appearance Settings</h3>
            <div class="settings-row">
                <label class="settings-label">Player Color:</label>
                <input
                    type="color"
                    id="hostPlayerColorInput"
                    class="settings-input"
                    style="width: 60px; height: 40px; cursor: pointer;"
                />
            </div>
            <p class="help-text" style="margin-top: 8px; font-size: 0.85em; color: var(--text-secondary);">Controls the player's piece color.</p>

            <div class="settings-row" style="margin-top: 24px;">
                <label class="settings-label">Border Color:</label>
                <input
                    type="color"
                    id="hostPeerColorInput"
                    class="settings-input"
                    style="width: 60px; height: 40px; cursor: pointer;"
                />
            </div>
            <p class="help-text" style="margin-top: 8px; font-size: 0.85em; color: var(--text-secondary);">Controls the player's border color in the lobby.</p>
        `;
    }

    renderKickTab(content) {
        const playerName = this.targetPlayer ? this.targetPlayer._nickname : 'Unknown';

        content.innerHTML = `
            <h3 class="settings-content-title">Kick Player</h3>
            <p class="help-text" style="margin-bottom: 16px; color: var(--text-secondary);">
                This will remove ${playerName} from the current game session.
            </p>
            <button id="hostKickPlayerBtn" class="button button-danger" style="width: 100%; padding: 12px;">Kick ${playerName}</button>
        `;
    }

    attachInputListeners() {
        // Nickname input
        const nicknameInput = document.getElementById('hostPlayerNicknameInput');
        if (nicknameInput) {
            nicknameInput.addEventListener('input', () => {
                this.markChanged();
            });
        }

        const colorInput = document.getElementById('hostPlayerColorInput');
        if (colorInput) {
            colorInput.addEventListener('change', () => this.markChanged());
        }

        const peerColorInput = document.getElementById('hostPeerColorInput');
        if (peerColorInput) {
            peerColorInput.addEventListener('change', () => this.markChanged());
        }

        // Kick player button
        const kickPlayerBtn = document.getElementById('hostKickPlayerBtn');
        if (kickPlayerBtn) {
            kickPlayerBtn.addEventListener('click', () => {
                if (this.onKickPlayer && this.targetPlayer) {
                    this.onKickPlayer(this.targetPlayer.playerId);
                }
                this.close();
            });
        }
    }

    markChanged() {
        const applyBtn = document.getElementById('applyHostPlayerSettings');
        if (applyBtn) {
            applyBtn.disabled = false;
        } else {
            console.warn('[HostPlayerControlModal] Apply button not found in markChanged');
        }
    }

    applyChanges() {
        if (!this.targetPlayer) return;

        // Get current values from inputs
        const nicknameInput = document.getElementById('hostPlayerNicknameInput');

        let hasChanges = false;

        // Check nickname change
        if (nicknameInput) {
            const newNickname = nicknameInput.value.trim();
            const currentNickname = this.targetPlayer._nickname || '';
            if (newNickname && newNickname !== currentNickname) {
                if (this.onNicknameChange) {
                    this.onNicknameChange(this.targetPlayer.playerId, newNickname);
                    hasChanges = true;
                }
            }
        }

        const colorInput = document.getElementById('hostPlayerColorInput');
        const peerColorInput = document.getElementById('hostPeerColorInput');
        const currentPlayerColor = this.targetPlayer ? normalizeToHexColor(this.targetPlayer.playerColor, DEFAULT_HEX_COLOR) : DEFAULT_HEX_COLOR;
        const currentPeerColor = this.targetPlayer ? normalizeToHexColor(this.targetPlayer.peerColor, DEFAULT_HEX_COLOR) : DEFAULT_HEX_COLOR;

        if (colorInput && this.onColorChange) {
            const newColor = normalizeToHexColor(colorInput.value, null);
            if (newColor && newColor !== currentPlayerColor) {
                this.onColorChange(this.targetPlayer.playerId, newColor);
                hasChanges = true;
            }
        }

        if (peerColorInput && this.onPeerColorChange) {
            const newPeerColor = normalizeToHexColor(peerColorInput.value, null);
            if (newPeerColor && newPeerColor !== currentPeerColor) {
                this.onPeerColorChange(this.targetPlayer.playerId, newPeerColor);
                hasChanges = true;
            }
        }

        // Close the modal after applying changes (whether there were changes or not)
        this.close();
    }

    open(targetPlayer) {
        this.targetPlayer = targetPlayer;

        // Reset to general tab when opening
        this.selectedTab = 'general';

        // Update sidebar to show general as active
        const navItems = this.modal.querySelectorAll('.settings-nav-item');
        navItems.forEach(item => {
            if (item.getAttribute('data-tab') === 'general') {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        this.updateContent();

        this.modal.style.display = 'flex';

        // Verify Apply button exists after modal is displayed
        setTimeout(() => {
            const applyBtn = document.getElementById('applyHostPlayerSettings');
        }, 50);

        // Focus nickname input if on general tab
        setTimeout(() => {
            const nicknameInput = document.getElementById('hostPlayerNicknameInput');
            if (nicknameInput) {
                nicknameInput.select();
            }
        }, 100);
    }

    updateContent() {
        if (!this.targetPlayer) return;

        // Re-render current tab content to populate with player data
        this.renderTabContent();

        this.populateInputsWithPlayerData();

        // Disable apply button initially
        const applyBtn = document.getElementById('applyHostPlayerSettings');
        if (applyBtn) {
            applyBtn.disabled = true;
        }
    }

    close() {
        this.modal.style.display = 'none';
        // Reset to general tab for next open
        this.selectedTab = 'general';
    }

    populateInputsWithPlayerData() {
        if (!this.targetPlayer) return;

        const nicknameInput = document.getElementById('hostPlayerNicknameInput');
        if (nicknameInput) {
            nicknameInput.value = this.targetPlayer._nickname || '';
        }

        const colorInput = document.getElementById('hostPlayerColorInput');
        if (colorInput) {
            const playerColor = this.targetPlayer
                ? normalizeToHexColor(this.targetPlayer.playerColor, DEFAULT_HEX_COLOR)
                : DEFAULT_HEX_COLOR;
            colorInput.value = playerColor;
        }

        const peerColorInput = document.getElementById('hostPeerColorInput');
        if (peerColorInput) {
            const peerColor = this.targetPlayer
                ? normalizeToHexColor(this.targetPlayer.peerColor, DEFAULT_HEX_COLOR)
                : DEFAULT_HEX_COLOR;
            peerColorInput.value = peerColor;
        }
    }
}
