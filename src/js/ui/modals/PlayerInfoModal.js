/**
 * PlayerInfoModal - Displays player information (stats and inventory)
 */
import BaseModal from './BaseModal.js';

export default class PlayerInfoModal extends BaseModal {
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
        this.renderContent();
    }

    renderContent() {
        if (!this.content || !this.currentPlayer) return;

        this.content.innerHTML = `
            <div class="modal-layout">
                <div class="modal-sidebar">
                    <div class="player-profile-header">
                        <div class="player-badge-large" style="background-color: ${this.currentPlayer.playerColor}">
                            ${this.currentPlayer.nickname.charAt(0).toUpperCase()}
                        </div>
                        <h3>${this.currentPlayer.nickname}</h3>
                    </div>
                    <div class="settings-nav">
                        <button class="settings-nav-item ${this.selectedTab === 'general' ? 'active' : ''}" data-tab="general">Stats</button>
                        <button class="settings-nav-item ${this.selectedTab === 'inventory' ? 'active' : ''}" data-tab="inventory">Inventory</button>
                    </div>
                </div>
                <div class="modal-main">
                    <div class="modal-main-header">
                        <h2>${this.selectedTab === 'general' ? 'Stats' : 'Inventory'}</h2>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-main-content">
                        ${this.getTabContent()}
                    </div>
                </div>
            </div>
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
            <div class="stat-row">
                <div class="stat-name">${this.formatStatName(stat.id)}</div>
                <div class="stat-value">
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
    }
}
