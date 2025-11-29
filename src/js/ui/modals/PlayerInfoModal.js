/**
 * PlayerInfoModal - Displays player information (stats and inventory)
 */
import SettingsBaseModal from './SettingsBaseModal.js';

export default class PlayerInfoModal extends SettingsBaseModal {
    constructor(id, gameState) {
        super({
            id: id || 'playerInfoModal',
            title: 'Player Info'
        });

        this.gameState = gameState;
        this.currentPlayer = null;
        this.viewerPlayer = null;
    }

    /**
     * Open modal for a specific player
     * @param {Player} player - The player to view
     * @param {Player} viewer - The player viewing (self)
     */
    open(player, viewer) {
        this.currentPlayer = player;
        this.viewerPlayer = viewer;
        super.open();
    }

    onOpen() {
        this.renderTabs([
            { id: 'general', label: 'Stats' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'identity', label: 'IDs' },
            { id: 'activity', label: 'Activity' }
        ]);
        this.renderContent();
    }

    renderContent() {
        const contentContainer = this.content;
        if (!contentContainer || !this.currentPlayer) return;

        contentContainer.innerHTML = `
            <div class="settings-content-title">
                <div class="player-profile-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div class="player-badge-large" style="background-color: ${this.currentPlayer.playerColor}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                        ${this.currentPlayer.nickname.charAt(0).toUpperCase()}
                    </div>
                    <h3>${this.currentPlayer.nickname}</h3>
                </div>
                <h4>${this.getTabHeading()}</h4>
            </div>
            ${this.getTabContent()}
        `;

        this.attachListeners();
    }

    getTabContent() {
        if (this.selectedTab === 'inventory') {
            return `
                <div class="inventory-grid">
                    <p class="empty-message">Inventory system coming soon!</p>
                </div>
            `;
        }

        if (this.selectedTab === 'identity') {
            return this.renderIdentityTab();
        }

        if (this.selectedTab === 'activity') {
            return this.renderActivityTab();
        }

        // Stats Tab
        const stats = this.currentPlayer.stats || [];
        const isViewingSelf = this.viewerPlayer && this.currentPlayer.playerId === this.viewerPlayer.playerId;

        if (stats.length === 0) {
            return '<p class="empty-message">No stats available</p>';
        }

        return `
            <div class="stats-list">
                ${stats.map(stat => this.renderStatRow(stat, isViewingSelf)).join('')}
            </div>
        `;
    }

    renderIdentityTab() {
        const { playerId, peerId, isHost } = this.currentPlayer;
        return `
            <div class="settings-row">
                <div class="settings-label">Player ID</div>
                <div class="settings-display mono">${playerId}</div>
            </div>
            <div class="settings-row">
                <div class="settings-label">Peer ID</div>
                <div class="settings-display mono">${peerId}</div>
            </div>
            <div class="settings-row">
                <div class="settings-label">Role</div>
                <div class="settings-display">${isHost ? 'Host' : 'Client'}</div>
            </div>
        `;
    }

    renderActivityTab() {
        const turnsTaken = this.currentPlayer?.turnsTaken ?? 0;
        const effects = this.currentPlayer?.effects || [];
        const movement = this.currentPlayer?.movementHistory?.flattenHistory?.() || [];

        return `
            <div class="settings-row">
                <div class="settings-label">Turns Taken</div>
                <div class="settings-display">${turnsTaken}</div>
            </div>
            <div class="settings-row">
                <div class="settings-label">Effects</div>
                <div class="settings-display" style="max-height: 120px; overflow-y: auto;">
                    ${effects.length === 0 ? '<span class="empty-message">No active effects</span>' : `
                        <ul class="compact-list">
                            ${effects.map(effect => `<li>${this.describeEffect(effect)}</li>`).join('')}
                        </ul>
                    `}
                </div>
            </div>
            <div class="settings-row">
                <div class="settings-label">Movement History</div>
                <div class="settings-display" style="max-height: 120px; overflow-y: auto;">
                    ${movement.length === 0 ? '<span class="empty-message">No moves recorded</span>' : `
                        <ul class="compact-list">
                            ${movement.slice(-50).reverse().map(move => `<li>${this.describeMove(move)}</li>`).join('')}
                        </ul>
                    `}
                </div>
            </div>
        `;
    }

    getTabHeading() {
        switch (this.selectedTab) {
            case 'inventory':
                return 'Inventory';
            case 'identity':
                return 'Identifiers';
            case 'activity':
                return 'Activity';
            default:
                return 'Stats';
        }
    }

    describeEffect(effect) {
        const name = effect?.id || effect?.constructor?.name || 'Effect';
        const duration = effect?.duration !== undefined ? ` (duration: ${effect.duration})` : '';
        return `${name}${duration}`;
    }

    describeMove(move) {
        const space = move?.spaceId ?? '?';
        const remaining = move?.remainingMoves ?? '?';
        const turn = move?.turn ?? '?';
        return `Turn ${turn}: moved to space ${space} (remaining: ${remaining})`;
    }

    renderStatRow(stat, isViewingSelf) {
        const displayValue = isViewingSelf ? stat.getTrueValue() : stat.getDisplayValue();
        const showTrueValue = isViewingSelf && stat.getTrueValue() !== stat.getDisplayValue();

        return `
            <div class="settings-row">
                <div class="settings-label">${this.formatStatName(stat.id)}</div>
                <div class="settings-display">
                    ${displayValue}
                    ${showTrueValue ? `<span class="stat-visibility-indicator" title="Others see: ${stat.getDisplayValue()}">(hidden)</span>` : ''}
                </div>
            </div>
        `;
    }

    formatStatName(statId) {
        return statId
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    attachListeners() {
        // No specific listeners beyond tab handling
    }
}
