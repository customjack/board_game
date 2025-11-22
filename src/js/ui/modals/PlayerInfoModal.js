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
            { id: 'inventory', label: 'Inventory' }
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
                <h4>${this.selectedTab === 'general' ? 'Stats' : 'Inventory'}</h4>
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
        // No specific listeners for now besides tabs which are handled by BaseModal
    }
}
