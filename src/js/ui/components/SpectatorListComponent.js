/**
 * SpectatorListComponent - Displays spectators and claimable player slots in the lobby.
 */
import BaseUIComponent from '../BaseUIComponent.js';
import GameStateFactory from '../../infrastructure/factories/GameStateFactory.js';
import { createIconButton, createInfoIcon, createCloseIcon } from '../../infrastructure/utils/IconUtils.js';

export default class SpectatorListComponent extends BaseUIComponent {
    constructor(config = {}) {
        super({
            id: 'spectatorList',
            containerId: config.spectatorListElementId || 'lobbySpectatorList',
            ...config
        });

        this.spectatorListElementId = config.spectatorListElementId || 'lobbySpectatorList';
        this.unclaimedListElementId = config.unclaimedListElementId || 'lobbyUnclaimedList';
        this.unclaimedWrapperId = config.unclaimedWrapperId || 'lobbyUnclaimedContainer';
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
        this.unclaimedWrapper = this.getElement(this.unclaimedWrapperId, false);
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

        const settings = gameState.settings || {};
        const spectatorLimit = settings.spectatorLimit ?? 'none';
        const perPeerLimit = settings.playerLimitPerPeer ?? 'none';
        const totalLimit = settings.playerLimit ?? 'none';

        return [
            spectatorsSig,
            unclaimedSig,
            playersSig,
            `limit:${spectatorLimit}`,
            `perPeer:${perPeerLimit}`,
            `total:${totalLimit}`
        ].join('||');
    }

    render() {
        if (!this.spectatorContainer || !this.unclaimedContainer) return;

        this.spectatorContainer.innerHTML = '';
        this.unclaimedContainer.innerHTML = '';

        if (!this.gameState) return;

        const players = Array.isArray(this.gameState.players) ? this.gameState.players : [];
        const { activeSpectators, isSelfSpectator } = this.buildSpectatorData(players);
        const spectatorSummary = document.createElement('li');
        spectatorSummary.className = 'spectator-container spectator-summary spectator-footnote';
        const limit = this.gameState.settings?.spectatorLimit;
        const derivedCount = activeSpectators.length;
        const totalText = Number.isFinite(limit) && limit > 0
            ? `${derivedCount} / ${limit}`
            : `${derivedCount}`;

        const label = document.createElement('span');
        label.className = 'spectator-footnote-label';
        label.textContent = 'Spectators';

        const count = document.createElement('span');
        count.className = 'spectator-footnote-count';
        count.textContent = totalText;

        spectatorSummary.appendChild(label);
        spectatorSummary.appendChild(count);

        if (isSelfSpectator) {
            const you = document.createElement('span');
            you.className = 'spectator-footnote-you you-badge';
            you.textContent = 'You';
            spectatorSummary.appendChild(you);
        }

        this.spectatorContainer.appendChild(spectatorSummary);

        const rawUnclaimed = Array.isArray(this.gameState.unclaimedPeerIds)
            ? this.gameState.unclaimedPeerIds
            : [];
        const fallbackUnclaimed = (this.gameState.players || [])
            .filter(p => p.isUnclaimed)
            .map(p => p.playerId);
        const unclaimed = rawUnclaimed.length > 0 ? rawUnclaimed : fallbackUnclaimed;

        if (this.unclaimedWrapper) {
            this.unclaimedWrapper.style.display = unclaimed.length > 0 ? '' : 'none';
        }

        if (unclaimed.length === 0) {
            return;
        }

        unclaimed.forEach((peerId, index) => {
            const item = this.createUnclaimedItem(peerId, index);
            this.unclaimedContainer.appendChild(item);
        });
    }

    createUnclaimedItem(peerId, index) {
        const li = document.createElement('li');
        li.className = 'spectator-container spectator-unclaimed';

        const name = document.createElement('div');
        name.className = 'spectator-name';
        const shortId = peerId ? peerId.slice(-6) : 'slot';
        const nickname = this.lookupUnclaimedNickname(peerId);
        const label = nickname ? `${nickname} (${shortId})` : `Unclaimed Slot ${index + 1} (${shortId})`;
        name.textContent = label;

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

        // Info button for host and clients
        const infoBtn = createIconButton(createInfoIcon(18), 'View info', () => {
            this.emit('viewUnclaimedInfo', { peerSlotId: peerId });
        });
        actions.appendChild(infoBtn);

        // Delete button host-only
        if (this.isHost) {
            const deleteBtn = createIconButton(createCloseIcon(18), 'Delete slot', () => {
                this.emit('removeUnclaimedSlot', { peerSlotId: peerId });
            });
            actions.appendChild(deleteBtn);
        }

        li.appendChild(name);
        li.appendChild(actions);
        return li;
    }

    lookupUnclaimedNickname(peerSlotId) {
        if (!peerSlotId || !Array.isArray(this.gameState?.players)) return null;
        const player = this.gameState.players.find(p => p.playerId === peerSlotId || p.peerId === peerSlotId);
        return player?.nickname || null;
    }

    buildSpectatorData(players = []) {
        const ownedByPeer = new Map();
        players.forEach(player => {
            const pid = player?.peerId;
            if (!pid || player.isUnclaimed) return;
            ownedByPeer.set(pid, (ownedByPeer.get(pid) || 0) + 1);
        });

        const spectators = Array.isArray(this.gameState.spectators) ? this.gameState.spectators.slice() : [];

        if (this.hostPeerId && !spectators.some(s => s.peerId === this.hostPeerId)) {
            spectators.push({ peerId: this.hostPeerId, label: 'Host' });
        }

        const currentOwned = this.currentPeerId ? ownedByPeer.get(this.currentPeerId) || 0 : 0;
        const isSelfSpectator = this.currentPeerId ? currentOwned === 0 : false;

        if (isSelfSpectator && this.currentPeerId && !spectators.some(s => s.peerId === this.currentPeerId)) {
            spectators.push({ peerId: this.currentPeerId });
        }

        const activeSpectators = spectators.filter(s => {
            if (!s?.peerId) return false;
            const owned = ownedByPeer.get(s.peerId) || 0;
            return owned === 0;
        });

        return { activeSpectators, isSelfSpectator };
    }

    canClaimSlot(peerSlotId) {
        if (!peerSlotId || !this.gameState) return false;

        const settings = this.gameState.settings;
        const playerLimitPerPeer = settings?.playerLimitPerPeer ?? 0;
        const totalPlayerLimit = settings?.playerLimit ?? 0;
        const currentOwnedCount = (this.gameState.players || []).filter(
            player => player.peerId === this.currentPeerId && !player.isUnclaimed
        ).length;
        const totalPlayers = Array.isArray(this.gameState.players) ? this.gameState.players.length : 0;

        if (playerLimitPerPeer > 0 && currentOwnedCount >= playerLimitPerPeer) {
            return false;
        }

        if (totalPlayerLimit > 0 && totalPlayers > totalPlayerLimit) {
            return false;
        }

        // Allow host and any peer within limits
        return true;
    }

    createBadge(text, className = 'host-badge') {
        const badge = document.createElement('span');
        badge.className = className;
        badge.textContent = text;
        return badge;
    }
}
