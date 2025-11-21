/**
 * PlayerControlModal - Modal for player self-management
 *
 * Allows players to:
 * - Change their nickname (if allowed)
 * - Change their player color (if allowed)
 * - Change their border color (if allowed)
 * - Leave the game
 */
import BaseModal from './BaseModal.js';
import { normalizeToHexColor, DEFAULT_HEX_COLOR } from '../../infrastructure/utils/ColorUtils.js';

export default class PlayerControlModal extends BaseModal {
    constructor(id, player, onNicknameChange, onColorChange, onPeerColorChange, onLeaveGame) {
        super({
            id: id || 'playerControlModal',
            title: 'Player Settings'
        });

        this.player = player;
        this.onNicknameChange = onNicknameChange;
        this.onColorChange = onColorChange;
        this.onPeerColorChange = onPeerColorChange;
        this.onLeaveGame = onLeaveGame;

        this.permissions = {
            nameChange: true,
            playerColor: true,
            peerColor: true
        };
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

    /**
     * Override createModalStructure to add specific class
     */
    createModalStructure() {
        const modal = super.createModalStructure();
        modal.querySelector('.modal-content').classList.add('settings-modal-content');
        return modal;
    }

    onOpen() {
        this.renderContent();
    }

    renderContent() {
        if (!this.content) return;

        this.content.innerHTML = `
            <div class="modal-layout">
                <div class="modal-sidebar">
                    <div class="modal-header-simple">
                        <h3>Settings</h3>
                    </div>
                    <div class="settings-nav">
                        <button class="settings-nav-item ${this.selectedTab === 'general' ? 'active' : ''}" data-tab="general">General</button>
                        <button class="settings-nav-item ${this.selectedTab === 'danger' ? 'active' : ''}" data-tab="danger">Danger Zone</button>
                    </div>
                </div>
                <div class="modal-main">
                    <div class="modal-main-header">
                        <h2>${this.selectedTab === 'general' ? 'General Settings' : 'Danger Zone'}</h2>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-main-content">
                        ${this.getTabContent()}
                    </div>
                    <div class="modal-footer">
                        <button id="applyPlayerSettings" class="button button-primary">Apply Changes</button>
                    </div>
                </div>
            </div>
        `;

        this.attachListeners();
        this.populateInputs();
    }

    getTabContent() {
        if (this.selectedTab === 'danger') {
            return `
                <div class="settings-section">
                    <h3>Leave Game</h3>
                    <p class="help-text">This will remove you from the current game session.</p>
                    <button id="leaveGameBtn" class="button button-danger">Leave Game</button>
                </div>
            `;
        }

        // General Tab
        const canChangeName = this.permissions.nameChange;
        const canChangePlayerColor = this.permissions.playerColor;
        const canChangePeerColor = this.permissions.peerColor;

        return `
            <div class="settings-section">
                <div class="settings-row">
                    <label class="settings-label">Nickname:</label>
                    <input
                        type="text"
                        id="playerNicknameInput"
                        class="input settings-input"
                        placeholder="Enter nickname"
                        maxlength="12"
                        ${canChangeName ? '' : 'disabled'}
                    />
                </div>
                ${!canChangeName ? '<p class="help-text warning">Host has disabled name changes.</p>' : ''}
            </div>

            <div class="settings-section">
                <div class="settings-row">
                    <label class="settings-label">Player Color:</label>
                    <input
                        type="color"
                        id="playerColorInput"
                        class="settings-input color-input"
                        ${canChangePlayerColor ? '' : 'disabled'}
                    />
                </div>
                <p class="help-text">${canChangePlayerColor ? 'Color of your game pieces.' : 'Host has disabled color changes.'}</p>
            </div>

            <div class="settings-section">
                <div class="settings-row">
                    <label class="settings-label">Border Color:</label>
                    <input
                        type="color"
                        id="peerColorInput"
                        class="settings-input color-input"
                        ${canChangePeerColor ? '' : 'disabled'}
                    />
                </div>
                <p class="help-text">${canChangePeerColor ? 'Color of your border in the player list.' : 'Host has disabled border color changes.'}</p>
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
        // Tab navigation
        const navItems = this.modal.querySelectorAll('.settings-nav-item');
        navItems.forEach(item => {
            this.addEventListener(item, 'click', () => {
                this.selectedTab = item.dataset.tab;
                this.renderContent();
            });
        });

        // Close button
        const closeBtn = this.modal.querySelector('.close-btn');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.close());
        }

        // Apply button
        const applyBtn = this.modal.querySelector('#applyPlayerSettings');
        if (applyBtn) {
            this.addEventListener(applyBtn, 'click', () => this.applyChanges());
        }

        // Leave game button
        const leaveBtn = this.modal.querySelector('#leaveGameBtn');
        if (leaveBtn) {
            this.addEventListener(leaveBtn, 'click', () => {
                if (this.onLeaveGame) this.onLeaveGame();
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
