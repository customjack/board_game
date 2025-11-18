import { DEFAULT_HEX_COLOR, normalizeToHexColor } from '../../../../js/infrastructure/utils/colorUtils.js';

/**
 * PlayerControlModal - Player self-management modal
 *
 * Allows players to:
 * - Change their own nickname
 * - Change player color
 * - Change peer/border color
 * - Leave the game
 */
export default class PlayerControlModal {
    /**
     * @param {string} modalId - DOM ID for the modal container
     * @param {Player} player - The player being controlled
     * @param {Function} onNicknameChange - Callback when nickname changes (playerId, newName)
     * @param {Function} onColorChange - Callback when color changes (playerId, newColor)
     * @param {Function} onPeerColorChange - Callback when peer color changes (playerId, newColor)
     * @param {Function} onLeaveGame - Callback when player wants to leave
     */
    constructor(modalId, player, onNicknameChange, onColorChange, onPeerColorChange, onLeaveGame) {
        this.modalId = modalId;
        this.player = player;
        this.onNicknameChange = onNicknameChange;
        this.onColorChange = onColorChange;
        this.onPeerColorChange = onPeerColorChange;
        this.onLeaveGame = onLeaveGame;

        this.colorPermissions = {
            playerColor: true,
            peerColor: true
        };

        // Track pending changes
        this.pendingChanges = {
            nickname: null,
            playerColor: null,
            peerColor: null
        };

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
                    <h2>Player Settings</h2>
                    <div class="settings-modal-header-buttons">
                        <button class="settings-modal-apply" id="applyPlayerSettings" disabled>Apply</button>
                        <button class="settings-modal-close" id="closePlayerControl">&times;</button>
                    </div>
                </div>

                <!-- Body with sidebar and content -->
                <div class="settings-modal-body">
                    <!-- Sidebar navigation -->
                    <div class="settings-modal-sidebar" id="playerControlSidebar">
                        <div class="settings-nav-item active" data-tab="general">General</div>
                        <div class="settings-nav-item" data-tab="appearance">Appearance</div>
                        <div class="settings-nav-item" data-tab="danger">Leave Game</div>
                    </div>

                    <!-- Content area -->
                    <div class="settings-modal-content" id="playerControlContent">
                        <!-- Will be populated based on selected tab -->
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.renderTabContent();
    }

    attachEventListeners() {
        const closeBtn = document.getElementById('closePlayerControl');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        const applyBtn = document.getElementById('applyPlayerSettings');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyChanges());
        } else {
            console.error('[PlayerControlModal] Apply button NOT FOUND!');
        }

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
        const content = document.getElementById('playerControlContent');
        if (!content) return;

        if (this.selectedTab === 'general') {
            this.renderGeneralTab(content);
        } else if (this.selectedTab === 'appearance') {
            this.renderAppearanceTab(content);
        } else if (this.selectedTab === 'danger') {
            this.renderDangerTab(content);
        }

        // Attach input listeners after rendering
        this.attachInputListeners();
        this.populateInputsWithPlayerData();
    }

    renderGeneralTab(content) {
        content.innerHTML = `
            <h3 class="settings-content-title">General Settings</h3>
            <div class="settings-row">
                <label class="settings-label">Nickname:</label>
                <input
                    type="text"
                    id="playerNicknameInput"
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
        const canChangePlayerColor = this.colorPermissions.playerColor !== false;
        const canChangePeerColor = this.colorPermissions.peerColor !== false;

        content.innerHTML = `
            <h3 class="settings-content-title">Appearance Settings</h3>
            <div class="settings-row">
                <label class="settings-label">Player Color:</label>
                <input
                    type="color"
                    id="playerColorInput"
                    class="settings-input"
                    style="width: 60px; height: 40px; cursor: ${canChangePlayerColor ? 'pointer' : 'not-allowed'};"
                    ${canChangePlayerColor ? '' : 'disabled'}
                />
            </div>
            <p class="help-text" style="margin-top: 8px; font-size: 0.85em; color: var(--text-secondary);">
                ${canChangePlayerColor
                    ? 'Choose your player color (shown on game pieces)'
                    : 'The host has disabled player color changes.'}
            </p>

            <div class="settings-row" style="margin-top: 24px;">
                <label class="settings-label">Border Color:</label>
                <input
                    type="color"
                    id="peerColorInput"
                    class="settings-input"
                    style="width: 60px; height: 40px; cursor: ${canChangePeerColor ? 'pointer' : 'not-allowed'};"
                    ${canChangePeerColor ? '' : 'disabled'}
                />
            </div>
            <p class="help-text" style="margin-top: 8px; font-size: 0.85em; color: var(--text-secondary);">
                ${canChangePeerColor
                    ? 'Choose your border color (shown in player list)'
                    : 'The host has disabled border color changes.'}
            </p>
        `;
    }

    setColorPermissions(permissions = {}) {
        const nextPermissions = {
            playerColor: permissions.playerColor !== undefined ? permissions.playerColor : this.colorPermissions.playerColor,
            peerColor: permissions.peerColor !== undefined ? permissions.peerColor : this.colorPermissions.peerColor
        };

        const changed =
            nextPermissions.playerColor !== this.colorPermissions.playerColor ||
            nextPermissions.peerColor !== this.colorPermissions.peerColor;

        this.colorPermissions = nextPermissions;

        if (changed && this.modal && this.modal.style.display === 'flex') {
            this.updateContent();
        }
    }

    renderDangerTab(content) {
        content.innerHTML = `
            <h3 class="settings-content-title">Leave Game</h3>
            <p class="help-text" style="margin-bottom: 16px; color: var(--text-secondary);">This will remove you from the current game session.</p>
            <button id="leaveGameBtn" class="button button-danger" style="width: 100%; padding: 12px;">Leave Game</button>
        `;
    }

    populateInputsWithPlayerData() {
        const nicknameInput = document.getElementById('playerNicknameInput');
        const colorInput = document.getElementById('playerColorInput');
        const peerColorInput = document.getElementById('peerColorInput');

        if (nicknameInput) {
            nicknameInput.value = this.player?._nickname || '';
        }

        if (colorInput) {
            const playerColor = this.player
                ? normalizeToHexColor(this.player.playerColor, DEFAULT_HEX_COLOR)
                : DEFAULT_HEX_COLOR;
            colorInput.value = playerColor;
        }

        if (peerColorInput) {
            const peerColor = this.player
                ? normalizeToHexColor(this.player.peerColor, DEFAULT_HEX_COLOR)
                : DEFAULT_HEX_COLOR;
            peerColorInput.value = peerColor;
        }
    }

    attachInputListeners() {
        const nicknameInput = document.getElementById('playerNicknameInput');
        if (nicknameInput) {
            nicknameInput.addEventListener('input', () => this.markChanged());
        }

        const colorInput = document.getElementById('playerColorInput');
        if (colorInput && !colorInput.disabled) {
            colorInput.addEventListener('change', () => this.markChanged());
        }

        const peerColorInput = document.getElementById('peerColorInput');
        if (peerColorInput && !peerColorInput.disabled) {
            peerColorInput.addEventListener('change', () => this.markChanged());
        }

        const leaveGameBtn = document.getElementById('leaveGameBtn');
        if (leaveGameBtn) {
            leaveGameBtn.addEventListener('click', () => {
                if (this.onLeaveGame) {
                    this.onLeaveGame();
                }
                this.close();
            });
        }
    }

    markChanged() {
        const applyBtn = document.getElementById('applyPlayerSettings');
        if (applyBtn) {
            applyBtn.disabled = false;
        }
    }

    applyChanges() {
        if (!this.player) {
            console.error('[PlayerControlModal] No player set! Cannot apply changes.');
            return;
        }

        // Get current values from inputs
        const nicknameInput = document.getElementById('playerNicknameInput');
        const colorInput = document.getElementById('playerColorInput');
        const peerColorInput = document.getElementById('peerColorInput');

        let hasChanges = false;
        const playerId = this.player?.playerId;
        const currentNickname = this.player?._nickname || '';
        const currentPlayerColor = this.player ? normalizeToHexColor(this.player.playerColor, null) : null;
        const currentPeerColor = this.player ? normalizeToHexColor(this.player.peerColor, null) : null;

        // Check nickname change
        if (nicknameInput) {
            const newNickname = nicknameInput.value.trim();
            if (newNickname && newNickname !== currentNickname && this.onNicknameChange) {
                this.onNicknameChange(playerId, newNickname);
                hasChanges = true;
            }
        }

        // Check color change
        if (colorInput && this.colorPermissions.playerColor !== false && !colorInput.disabled) {
            const newColor = normalizeToHexColor(colorInput.value, null);
            if (newColor && newColor !== currentPlayerColor && this.onColorChange) {
                this.onColorChange(playerId, newColor);
                hasChanges = true;
            }
        }

        // Check peer color change
        if (peerColorInput && this.colorPermissions.peerColor !== false && !peerColorInput.disabled) {
            const newPeerColor = normalizeToHexColor(peerColorInput.value, null);
            if (newPeerColor && newPeerColor !== currentPeerColor && this.onPeerColorChange) {
                this.onPeerColorChange(playerId, newPeerColor);
                hasChanges = true;
            }
        }

        // Close the modal after applying changes (whether there were changes or not)
        this.close();
    }

    open() {
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

        // Focus nickname input
        setTimeout(() => {
            const nicknameInput = document.getElementById('playerNicknameInput');
            if (nicknameInput) {
                nicknameInput.select();
            }
        }, 100);
    }

    updateContent() {
        if (!this.player) {
            console.error('[PlayerControlModal] Cannot update player control modal without a player');
            return;
        }

        // Re-render current tab content to populate with player data
        this.renderTabContent();

        this.populateInputsWithPlayerData();

        // Disable apply button initially
        const applyBtn = document.getElementById('applyPlayerSettings');
        if (applyBtn) {
            applyBtn.disabled = true;
        }
    }

    close() {
        this.modal.style.display = 'none';
        // Reset to general tab for next open
        this.selectedTab = 'general';
        // DON'T clear player - keep it for next open
    }

    updatePlayer(player) {
        this.player = player;
        if (this.modal && this.modal.style.display === 'flex') {
            this.updateContent();
        }
    }
}
