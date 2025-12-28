/**
 * HostPlayerControlModal - Modal for host management of players
 *
 * Allows host to:
 * - Change any player's nickname
 * - Change any player's color
 * - Kick players
 */
import SettingsBaseModal from './SettingsBaseModal.js';
import { normalizeToHexColor, DEFAULT_HEX_COLOR } from '../../../infrastructure/utils/colorUtils.js';

export default class HostPlayerControlModal extends SettingsBaseModal {
    constructor(id, player, onNicknameChange, onKickPlayer, onMakeSpectator, onColorChange, onPeerColorChange) {
        super({
            id: id || 'hostPlayerControlModal',
            title: 'Manage Player'
        });

        this.targetPlayer = player;
        this.onNicknameChange = onNicknameChange;
        this.onKickPlayer = onKickPlayer;
        this.onMakeSpectator = onMakeSpectator;
        this.onColorChange = onColorChange;
        this.onPeerColorChange = onPeerColorChange;

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
        if (headerButtons.querySelector('#applyHostPlayerSettings')) return;

        const applyButton = document.createElement('button');
        applyButton.className = 'button settings-modal-apply';
        applyButton.textContent = 'Apply Changes';
        applyButton.id = 'applyHostPlayerSettings';
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
     * Open modal for a specific player
     * @param {Player} player - The player to manage
     */
    open(player) {
        this.targetPlayer = player;
        super.open();
    }

    onOpen() {
        this.renderTabs([
            { id: 'general', label: 'General' },
            { id: 'kick', label: 'Kick Player' }
        ]);
        this.renderContent();
    }

    renderContent() {
        const contentContainer = this.content;
        if (!contentContainer || !this.targetPlayer) return;

        contentContainer.innerHTML = `
            <div class="settings-content-title">
                <h3>${this.selectedTab === 'general' ? 'Edit Player' : 'Kick Player'}</h3>
            </div>
            ${this.getTabContent()}
        `;

        this.attachListeners();
        this.populateInputs();
    }

    getTabContent() {
        if (this.selectedTab === 'kick') {
            return `
                <div class="settings-row">
                    <div class="settings-label">Kick ${this.targetPlayer.nickname}</div>
                    <div class="settings-input-wrapper">
                        <p class="help-text" style="margin-bottom: 10px;">Are you sure you want to kick this player from the game?</p>
                        <button id="hostKickPlayerBtn" class="button button-danger">Kick Player</button>
                        <button id="hostMakeSpectatorBtn" class="button button-secondary" style="margin-top: 10px;">Make Spectator</button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="settings-row">
                <label class="settings-label">Nickname:</label>
                <div class="settings-input-wrapper">
                    <input
                        type="text"
                        id="hostPlayerNicknameInput"
                        class="input settings-input"
                        placeholder="Enter nickname"
                        maxlength="12"
                    />
                </div>
            </div>

            <div class="settings-row">
                <label class="settings-label">Player Color:</label>
                <div class="settings-input-wrapper">
                    <input
                        type="color"
                        id="hostPlayerColorInput"
                        class="settings-input color-input"
                    />
                </div>
            </div>

            <div class="settings-row">
                <label class="settings-label">Border Color:</label>
                <div class="settings-input-wrapper">
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
        // Kick button
        const kickBtn = this.modal.querySelector('#hostKickPlayerBtn');
        if (kickBtn) {
            this.addEventListener(kickBtn, 'click', () => {
                if (this.onKickPlayer) this.onKickPlayer(this.targetPlayer.playerId);
                this.close();
            });
        }

        const makeSpectatorBtn = this.modal.querySelector('#hostMakeSpectatorBtn');
        if (makeSpectatorBtn) {
            this.addEventListener(makeSpectatorBtn, 'click', () => {
                if (this.onMakeSpectator) this.onMakeSpectator(this.targetPlayer.playerId);
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
