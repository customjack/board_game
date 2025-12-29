/**
 * PlayerControlModal - Modal for player self-management
 *
 * Allows players to:
 * - Change their nickname (if allowed)
 * - Change their player color (if allowed)
 * - Change their border color (if allowed)
 * - Leave the game
 */
import SettingsBaseModal from './SettingsBaseModal.js';
import { normalizeToHexColor, DEFAULT_HEX_COLOR } from '../../../infrastructure/utils/colorUtils.js';

export default class PlayerControlModal extends SettingsBaseModal {
    constructor(id, player, onNicknameChange, onColorChange, onPeerColorChange, onLeaveGame, onRemovePlayer) {
        super({
            id: id || 'playerControlModal',
            title: 'Player Settings'
        });

        this.player = player;
        this.onNicknameChange = onNicknameChange;
        this.onColorChange = onColorChange;
        this.onPeerColorChange = onPeerColorChange;
        this.onLeaveGame = onLeaveGame;
        this.onRemovePlayer = onRemovePlayer;
        this.onRemovePlayer = onRemovePlayer;

        this.permissions = {
            nameChange: true,
            playerColor: true,
            peerColor: true
        };

        this.applyButton = null;
    }

    /**
     * Initialize the modal
     */
    init() {
        super.init();
        this.createApplyButton();
    }

    /**
     * Create and attach the Apply button
     */
    createApplyButton() {
        const headerButtons = this.modal.querySelector('.settings-modal-header-buttons');
        if (!headerButtons) return;

        // Check if already exists
        if (headerButtons.querySelector('#applyPlayerSettings')) return;

        const applyButton = document.createElement('button');
        applyButton.className = 'button settings-modal-apply';
        applyButton.textContent = 'Apply Changes';
        applyButton.id = 'applyPlayerSettings';
        applyButton.addEventListener('click', () => this.applyChanges());

        // Insert before close button
        const closeButton = headerButtons.querySelector('.settings-modal-close');
        if (closeButton) {
            headerButtons.insertBefore(applyButton, closeButton);
        } else {
            headerButtons.appendChild(applyButton);
        }

        this.applyButton = applyButton;
    }

    /**
     * Set permissions for what the player can edit
     * @param {Object} permissions - Permissions object
     */
    setPermissions(permissions = {}) {
        this.permissions = {
            ...this.permissions,
            ...permissions
        };

        if (this.visible) {
            this.renderContent();
        }
    }

    onOpen() {
        this.renderTabs([
            { id: 'general', label: 'General' },
            { id: 'danger', label: 'Danger Zone' }
        ]);
        this.renderContent();
    }

    renderContent() {
        const contentContainer = this.content;
        if (!contentContainer) return;

        contentContainer.innerHTML = `
            <div class="settings-content-title">
                <h3>${this.selectedTab === 'general' ? 'General Settings' : 'Danger Zone'}</h3>
            </div>
            ${this.getTabContent()}
        `;

        this.attachListeners();
        this.populateInputs();
    }

    getTabContent() {
        if (this.selectedTab === 'danger') {
            return `
                <div class="settings-row">
                    <div class="settings-label">Leave Game</div>
                    <div class="settings-input-wrapper">
                        <p class="help-text" style="margin-bottom: 10px;">This will remove you from the current game session.</p>
                        <button id="leaveGameBtn" class="button button-danger">Leave Game</button>
                    </div>
                </div>
                <div class="settings-row">
                    <div class="settings-label">Remove Player</div>
                    <div class="settings-input-wrapper">
                        <p class="help-text" style="margin-bottom: 10px;">Delete this player from the lobby. If the peer has no other players, they become a spectator (or disconnected if over limit).</p>
                        <button id="removePlayerBtn" class="button button-danger">Remove Player</button>
                    </div>
                </div>
            `;
        }

        // General Tab
        const canChangeName = this.permissions.nameChange;
        const canChangePlayerColor = this.permissions.playerColor;
        const canChangePeerColor = this.permissions.peerColor;

        return `
            <div class="settings-row">
                <label class="settings-label">Nickname:</label>
                <div class="settings-input-wrapper">
                    <input
                        type="text"
                        id="playerNicknameInput"
                        class="input settings-input"
                        placeholder="Enter nickname"
                        maxlength="12"
                        ${canChangeName ? '' : 'disabled'}
                    />
                    ${!canChangeName ? '<p class="help-text warning">Host has disabled name changes.</p>' : ''}
                </div>
            </div>

            <div class="settings-row">
                <label class="settings-label">Player Color:</label>
                <div class="settings-input-wrapper">
                    <input
                        type="color"
                        id="playerColorInput"
                        class="settings-input color-input"
                        ${canChangePlayerColor ? '' : 'disabled'}
                    />
                    ${!canChangePlayerColor ? '<p class="help-text warning">Host has disabled color changes.</p>' : ''}
                </div>
            </div>

            <div class="settings-row">
                <label class="settings-label">Border Color:</label>
                <div class="settings-input-wrapper">
                    <input
                        type="color"
                        id="peerColorInput"
                        class="settings-input color-input"
                        ${canChangePeerColor ? '' : 'disabled'}
                    />
                    ${!canChangePeerColor ? '<p class="help-text warning">Host has disabled border color changes.</p>' : ''}
                </div>
            </div>
        `;
    }

    populateInputs() {
        if (!this.player) return;

        const nicknameInput = this.modal.querySelector('#playerNicknameInput');
        const colorInput = this.modal.querySelector('#playerColorInput');
        const peerColorInput = this.modal.querySelector('#peerColorInput');

        if (nicknameInput) nicknameInput.value = this.player.nickname || '';

        if (colorInput) {
            colorInput.value = normalizeToHexColor(this.player.playerColor, DEFAULT_HEX_COLOR);
        }

        if (peerColorInput) {
            peerColorInput.value = normalizeToHexColor(this.player.peerColor, DEFAULT_HEX_COLOR);
        }
    }

    attachListeners() {
        // Leave game button
        const leaveBtn = this.modal.querySelector('#leaveGameBtn');
        if (leaveBtn) {
            this.addEventListener(leaveBtn, 'click', () => {
                if (this.onLeaveGame) this.onLeaveGame();
                this.close();
            });
        }

        // Remove player button (host only)
        const removePlayerBtn = this.modal.querySelector('#removePlayerBtn');
        if (removePlayerBtn) {
            this.addEventListener(removePlayerBtn, 'click', () => {
                if (this.onRemovePlayer) this.onRemovePlayer(this.player?.playerId);
                this.close();
            });
        }
    }

    applyChanges() {
        if (!this.player) return;

        const nicknameInput = this.modal.querySelector('#playerNicknameInput');
        const colorInput = this.modal.querySelector('#playerColorInput');
        const peerColorInput = this.modal.querySelector('#peerColorInput');

        // Nickname
        if (nicknameInput && !nicknameInput.disabled) {
            const newName = nicknameInput.value.trim();
            if (newName && newName !== this.player.nickname && this.onNicknameChange) {
                this.onNicknameChange(this.player.playerId, newName);
            }
        }

        // Player Color
        if (colorInput && !colorInput.disabled) {
            const newColor = colorInput.value;
            if (newColor !== this.player.playerColor && this.onColorChange) {
                this.onColorChange(this.player.playerId, newColor);
            }
        }

        // Peer Color
        if (peerColorInput && !peerColorInput.disabled) {
            const newColor = peerColorInput.value;
            if (newColor !== this.player.peerColor && this.onPeerColorChange) {
                this.onPeerColorChange(this.player.playerId, newColor);
            }
        }

        this.close();
    }
}
