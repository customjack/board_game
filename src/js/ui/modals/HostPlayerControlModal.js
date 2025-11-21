/**
 * HostPlayerControlModal - Modal for host management of players
 *
 * Allows host to:
 * - Change any player's nickname
 * - Change any player's color
 * - Kick players
 */
import BaseModal from './BaseModal.js';
import { normalizeToHexColor, DEFAULT_HEX_COLOR } from '../../infrastructure/utils/ColorUtils.js';

export default class HostPlayerControlModal extends BaseModal {
    constructor(id, player, onNicknameChange, onKickPlayer, onColorChange, onPeerColorChange) {
        super({
            id: id || 'hostPlayerControlModal',
            title: 'Manage Player'
        });

        this.targetPlayer = player;
        this.onNicknameChange = onNicknameChange;
        this.onKickPlayer = onKickPlayer;
        this.onColorChange = onColorChange;
        this.onPeerColorChange = onPeerColorChange;
    }

    /**
     * Open modal for a specific player
     * @param {Player} player - The player to manage
     */
    open(player) {
        this.targetPlayer = player;
        super.open();
    }

    onOpen() {
        this.renderContent();
    }

    renderContent() {
        if (!this.content || !this.targetPlayer) return;

        this.content.innerHTML = `
            <div class="modal-layout">
                <div class="modal-sidebar">
                    <div class="modal-header-simple">
                        <h3>Manage</h3>
                    </div>
                    <div class="settings-nav">
                        <button class="settings-nav-item ${this.selectedTab === 'general' ? 'active' : ''}" data-tab="general">General</button>
                        <button class="settings-nav-item ${this.selectedTab === 'kick' ? 'active' : ''}" data-tab="kick">Kick Player</button>
                    </div>
                </div>
                <div class="modal-main">
                    <div class="modal-main-header">
                        <h2>${this.selectedTab === 'general' ? 'Edit Player' : 'Kick Player'}</h2>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-main-content">
                        ${this.getTabContent()}
                    </div>
                    <div class="modal-footer">
                        <button id="applyHostPlayerSettings" class="button button-primary">Apply Changes</button>
                    </div>
                </div>
            </div>
        `;

        this.attachListeners();
        this.populateInputs();
    }

    getTabContent() {
        if (this.selectedTab === 'kick') {
            return `
                <div class="settings-section">
                    <h3>Kick ${this.targetPlayer.nickname}</h3>
                    <p class="help-text">Are you sure you want to kick this player from the game?</p>
                    <button id="hostKickPlayerBtn" class="button button-danger">Kick Player</button>
                </div>
            `;
        }

        return `
            <div class="settings-section">
                <div class="settings-row">
                    <label class="settings-label">Nickname:</label>
                    <input
                        type="text"
                        id="hostPlayerNicknameInput"
                        class="input settings-input"
                        placeholder="Enter nickname"
                        maxlength="12"
                    />
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-row">
                    <label class="settings-label">Player Color:</label>
                    <input
                        type="color"
                        id="hostPlayerColorInput"
                        class="settings-input color-input"
                    />
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-row">
                    <label class="settings-label">Border Color:</label>
                    <input
                        type="color"
                        id="hostPeerColorInput"
                        class="settings-input color-input"
                    />
                </div>
            </div>
        `;
    }

    populateInputs() {
        if (!this.targetPlayer) return;

        const nicknameInput = this.modal.querySelector('#hostPlayerNicknameInput');
        const colorInput = this.modal.querySelector('#hostPlayerColorInput');
        const peerColorInput = this.modal.querySelector('#hostPeerColorInput');

        if (nicknameInput) nicknameInput.value = this.targetPlayer.nickname || '';

        if (colorInput) {
            colorInput.value = normalizeToHexColor(this.targetPlayer.playerColor, DEFAULT_HEX_COLOR);
        }

        if (peerColorInput) {
            peerColorInput.value = normalizeToHexColor(this.targetPlayer.peerColor, DEFAULT_HEX_COLOR);
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
        const applyBtn = this.modal.querySelector('#applyHostPlayerSettings');
        if (applyBtn) {
            this.addEventListener(applyBtn, 'click', () => this.applyChanges());
        }

        // Kick button
        const kickBtn = this.modal.querySelector('#hostKickPlayerBtn');
        if (kickBtn) {
            this.addEventListener(kickBtn, 'click', () => {
                if (this.onKickPlayer) this.onKickPlayer(this.targetPlayer.playerId);
                this.close();
            });
        }
    }

    applyChanges() {
        if (!this.targetPlayer) return;

        const nicknameInput = this.modal.querySelector('#hostPlayerNicknameInput');
        const colorInput = this.modal.querySelector('#hostPlayerColorInput');
        const peerColorInput = this.modal.querySelector('#hostPeerColorInput');

        // Nickname
        if (nicknameInput) {
            const newName = nicknameInput.value.trim();
            if (newName && newName !== this.targetPlayer.nickname && this.onNicknameChange) {
                this.onNicknameChange(this.targetPlayer.playerId, newName);
            }
        }

        // Player Color
        if (colorInput) {
            const newColor = colorInput.value;
            if (newColor !== this.targetPlayer.playerColor && this.onColorChange) {
                this.onColorChange(this.targetPlayer.playerId, newColor);
            }
        }

        // Peer Color
        if (peerColorInput) {
            const newColor = peerColorInput.value;
            if (newColor !== this.targetPlayer.peerColor && this.onPeerColorChange) {
                this.onPeerColorChange(this.targetPlayer.playerId, newColor);
            }
        }

        this.close();
    }
}
