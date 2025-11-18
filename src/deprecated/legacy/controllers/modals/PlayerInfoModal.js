/**
 * PlayerInfoModal - Displays player information (stats and inventory)
 *
 * Shows a modal with:
 * - Player name and color
 * - Stats (with appropriate visibility - display value for others, true value for self)
 * - Inventory (future feature)
 */
export default class PlayerInfoModal {
    /**
     * @param {string} modalId - DOM ID for the modal container
     * @param {GameState} gameState - Game state instance to access player data
     */
    constructor(modalId, gameState) {
        this.modalId = modalId;
        this.gameState = gameState;
        this.currentPlayer = null; // The player being viewed
        this.viewerPlayer = null; // The player viewing (self)

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
            <div class="modal-content player-info-modal-content">
                <div class="player-info-sidebar">
                    <div class="player-info-header">
                        <h2 id="playerInfoName">Player Info</h2>
                        <button class="close-btn" id="closePlayerInfo">&times;</button>
                    </div>
                    <div class="player-info-tabs">
                        <button class="tab-btn active" data-tab="stats">Stats</button>
                        <button class="tab-btn" data-tab="inventory">Inventory</button>
                    </div>
                </div>
                <div class="player-info-main">
                    <div id="statsTab" class="tab-content active">
                        <div class="player-info-display">
                            <div class="player-badge-large" id="playerBadgeLarge"></div>
                            <h3 id="playerInfoTitle">Player Name</h3>
                        </div>
                        <div class="stats-list" id="statsList">
                            <p class="empty-message">No stats to display</p>
                        </div>
                    </div>
                    <div id="inventoryTab" class="tab-content">
                        <div class="inventory-grid" id="inventoryGrid">
                            <p class="empty-message">Inventory system coming soon!</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    attachEventListeners() {
        // Close button
        const closeBtn = document.getElementById('closePlayerInfo');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Tab switching
        const tabBtns = this.modal.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        const tabBtns = this.modal.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update tab content
        const statsTab = document.getElementById('statsTab');
        const inventoryTab = document.getElementById('inventoryTab');

        if (tabName === 'stats') {
            statsTab.classList.add('active');
            inventoryTab.classList.remove('active');
        } else if (tabName === 'inventory') {
            statsTab.classList.remove('active');
            inventoryTab.classList.add('active');
        }
    }

    /**
     * Open the modal to view a specific player's info
     * @param {Player} player - The player to view
     * @param {Player} viewer - The player viewing (to determine visibility)
     */
    open(player, viewer) {
        this.currentPlayer = player;
        this.viewerPlayer = viewer;

        this.updateContent();
        this.modal.style.display = 'flex';
    }

    updateContent() {
        if (!this.currentPlayer) return;

        const isViewingSelf = this.viewerPlayer && this.currentPlayer.playerId === this.viewerPlayer.playerId;

        // Update header
        const playerInfoName = document.getElementById('playerInfoName');
        const playerInfoTitle = document.getElementById('playerInfoTitle');
        const playerBadge = document.getElementById('playerBadgeLarge');

        if (playerInfoName) {
            playerInfoName.textContent = `${this.currentPlayer.nickname}'s Info`;
        }

        if (playerInfoTitle) {
            playerInfoTitle.textContent = this.currentPlayer.nickname;
        }

        if (playerBadge) {
            playerBadge.style.backgroundColor = this.currentPlayer.playerColor;
            playerBadge.textContent = this.currentPlayer.nickname.charAt(0).toUpperCase();
        }

        // Update stats
        this.updateStats(isViewingSelf);
    }

    updateStats(isViewingSelf) {
        const statsList = document.getElementById('statsList');
        if (!statsList) return;

        const stats = this.currentPlayer.stats || [];

        if (stats.length === 0) {
            statsList.innerHTML = '<p class="empty-message">No stats available</p>';
            return;
        }

        statsList.innerHTML = '';

        stats.forEach(stat => {
            const statRow = document.createElement('div');
            statRow.className = 'stat-row';

            const statName = document.createElement('div');
            statName.className = 'stat-name';
            statName.textContent = this.formatStatName(stat.id);

            const statValue = document.createElement('div');
            statValue.className = 'stat-value';

            // Show true value if viewing self, otherwise show display value
            const displayedValue = isViewingSelf ? stat.getTrueValue() : stat.getDisplayValue();
            statValue.textContent = displayedValue;

            // Add indicator if values differ and viewing self
            if (isViewingSelf && stat.getTrueValue() !== stat.getDisplayValue()) {
                const indicator = document.createElement('span');
                indicator.className = 'stat-visibility-indicator';
                indicator.textContent = ` (others see: ${stat.getDisplayValue()})`;
                indicator.title = 'This stat has a different display value';
                statValue.appendChild(indicator);
            }

            statRow.appendChild(statName);
            statRow.appendChild(statValue);
            statsList.appendChild(statRow);
        });
    }

    formatStatName(statId) {
        // Convert stat ID to display name (e.g., "score" -> "Score", "health_points" -> "Health Points")
        return statId
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    close() {
        this.modal.style.display = 'none';
        this.currentPlayer = null;
        this.viewerPlayer = null;
    }
}
