/**
 * SpectatorListComponent - Displays spectators and claimable player slots in the lobby.
 */
import BaseUIComponent from '../BaseUIComponent.js';
import GameStateFactory from '../../infrastructure/factories/GameStateFactory.js';

export default class SpectatorListComponent extends BaseUIComponent {
    constructor(config = {}) {
        super({
            id: 'spectatorList',
            containerId: config.spectatorListElementId || 'lobbySpectatorList',
            ...config
        });

        this.spectatorListElementId = config.spectatorListElementId || 'lobbySpectatorList';
        this.unclaimedListElementId = config.unclaimedListElementId || 'lobbyUnclaimedList';
        this.currentPeerId = config.currentPeerId || null;
        this.hostPeerId = config.hostPeerId || null;
        this.isHost = config.isHost || false;
        this.gameState = null;
        this.lastRenderSignature = null;
    }

    init() {
        super.init();
        this.spectatorContainer = this.getElement(this.spectatorListElementId, false);
        this.unclaimedContainer = this.getElement(this.unclaimedListElementId, false);
    }

    update(gameState) {
        if (!this.initialized) return;

        const renderSignature = this.computeRenderSignature(gameState);
        if (this.lastRenderSignature === renderSignature) {
            return;
        }
        this.lastRenderSignature = renderSignature;

        this.gameState = GameStateFactory.fromJSON(gameState.toJSON(), gameState.factoryManager);
        this.render();
    }

    computeRenderSignature(gameState) {
        if (!gameState) return 'no-state';

        const spectatorsSig = (gameState.spectators || [])
            .map(s => `${s.peerId}:${s.joinedAt || 0}`)
            .sort()
            .join('|');
        const unclaimedSig = (gameState.unclaimedPeerIds || [])
            .slice()
            .sort()
            .join('|');
        const playersSig = (gameState.players || [])
            .map(p => `${p.playerId}:${p.peerId}:${p.isUnclaimed ? 'u' : 'c'}`)
            .sort()
            .join('|');

        const spectatorLimit = gameState.settings?.spectatorLimit ?? 'none';

        return [spectatorsSig, unclaimedSig, playersSig, `limit:${spectatorLimit}`].join('||');
    }

    render() {
        if (!this.spectatorContainer || !this.unclaimedContainer) return;

        this.spectatorContainer.innerHTML = '';
        this.unclaimedContainer.innerHTML = '';

        if (!this.gameState) return;

        const spectators = Array.isArray(this.gameState.spectators) ? this.gameState.spectators : [];
        const spectatorSummary = document.createElement('li');
        spectatorSummary.className = 'spectator-container spectator-summary';
        const limit = this.gameState.settings?.spectatorLimit;
        const derivedCount = this.getActiveSpectatorCount(spectators);
        const totalText = Number.isFinite(limit) && limit > 0
            ? `${derivedCount} / ${limit}`
            : `${derivedCount}`;
        spectatorSummary.textContent = `Spectators: ${totalText}`;
        this.spectatorContainer.appendChild(spectatorSummary);

        const unclaimed = Array.isArray(this.gameState.unclaimedPeerIds)
            ? this.gameState.unclaimedPeerIds
            : [];

        if (unclaimed.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'spectator-empty';
            empty.textContent = 'No unclaimed player slots.';
            this.unclaimedContainer.appendChild(empty);
        } else {
            unclaimed.forEach((peerId, index) => {
                const item = this.createUnclaimedItem(peerId, index);
                this.unclaimedContainer.appendChild(item);
            });
        }
    }

    createUnclaimedItem(peerId, index) {
        const li = document.createElement('li');
        li.className = 'spectator-container';

        const name = document.createElement('div');
        name.className = 'spectator-name';
        const shortId = peerId ? peerId.slice(-6) : 'slot';
        name.textContent = `Unclaimed Slot ${index + 1} (${shortId})`;

        const actions = document.createElement('div');
        actions.className = 'spectator-actions';

        if (this.canClaimSlot(peerId)) {
            const claimButton = document.createElement('button');
            claimButton.className = 'button button-secondary spectator-claim';
            claimButton.textContent = 'Claim';
            claimButton.addEventListener('click', () => {
                this.emit('claimPeerSlot', { peerSlotId: peerId });
            });
            actions.appendChild(claimButton);
        }

        li.appendChild(name);
        li.appendChild(actions);
        return li;
    }

    getActiveSpectatorCount(spectators = []) {
        const players = Array.isArray(this.gameState?.players) ? this.gameState.players : [];
        const ownedByPeer = new Map();
        players.forEach(player => {
            const pid = player?.peerId;
            if (!pid || player.isUnclaimed) return;
            ownedByPeer.set(pid, (ownedByPeer.get(pid) || 0) + 1);
        });

        return spectators.filter(s => {
            if (!s?.peerId) return false;
            return (ownedByPeer.get(s.peerId) || 0) === 0;
        }).length;
    }

    canClaimSlot(peerSlotId) {
        if (!peerSlotId || !this.gameState) return false;

        const settings = this.gameState.settings;
        const playerLimitPerPeer = settings?.playerLimitPerPeer ?? 0;
        const currentOwnedCount = (this.gameState.players || []).filter(
            player => player.peerId === this.currentPeerId
        ).length;

        const isSpectator = this.gameState.isSpectator?.(this.currentPeerId);
        if (!isSpectator && currentOwnedCount === 0 && !this.isHost) {
            return false;
        }

        if (playerLimitPerPeer > 0 && currentOwnedCount >= playerLimitPerPeer) {
            return false;
        }

        return true;
    }

    createBadge(text, className = 'host-badge') {
        const badge = document.createElement('span');
        badge.className = className;
        badge.textContent = text;
        return badge;
    }
}
