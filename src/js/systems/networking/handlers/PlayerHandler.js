/**
 * PlayerHandler - Handles all player management messages
 *
 * Responsibilities:
 * - Handle player addition proposals
 * - Handle player removal
 * - Handle player name changes
 * - Handle player rejections
 */

import MessageHandlerPlugin from './MessageHandlerPlugin.js';
import { MessageTypes } from '../protocol/MessageTypes.js';
import InputValidator from '../utils/InputValidator.js';
import ModalUtil from '../utils/ModalUtil.js';

export default class PlayerHandler extends MessageHandlerPlugin {
    register() {
        this.registerHandler(
            MessageTypes.PROPOSE_ADD_PLAYER,
            this.handleProposeAddPlayer,
            { description: 'Handle player addition proposal (host only)' }
        );

        this.registerHandler(
            MessageTypes.ADD_PLAYER_REJECTED,
            this.handleAddPlayerRejected,
            { description: 'Handle player addition rejection (client only)' }
        );

        this.registerHandler(
            MessageTypes.NAME_CHANGE,
            this.handleNameChange,
            { description: 'Handle player name change (host only)' }
        );

        this.registerHandler(
            MessageTypes.COLOR_CHANGE,
            this.handleColorChange,
            { description: 'Handle player color change (host only)' }
        );

        this.registerHandler(
            MessageTypes.PEER_COLOR_CHANGE,
            this.handlePeerColorChange,
            { description: 'Handle peer color change (host only)' }
        );

        this.registerHandler(
            MessageTypes.REMOVE_PLAYER,
            this.handleRemovePlayer,
            { description: 'Handle player removal (host only)' }
        );
    }

    /**
     * Handle player addition proposal (Host)
     */
    handleProposeAddPlayer(message, context) {
        const peer = this.getPeer();
        const conn = context.connection;
        const peerId = conn.peer;
        const newPlayerData = message.player;

        // Validate player data
        const validation = InputValidator.validatePlayerData(newPlayerData);
        if (!validation.isValid) {
            conn.send({
                type: MessageTypes.ADD_PLAYER_REJECTED,
                reason: `Invalid player data: ${validation.errors.join(', ')}`,
                player: newPlayerData
            });
            console.log('Add player rejected due to invalid data:', validation.errors);
            return;
        }

        // Check rate limiting
        if (!InputValidator.checkRateLimit(`addPlayer:${peerId}`, 5, 60000)) {
            conn.send({
                type: MessageTypes.ADD_PLAYER_REJECTED,
                reason: 'Too many player addition requests. Please wait a moment.',
                player: newPlayerData
            });
            console.log(`Player addition rate limited for peerId ${peerId}`);
            return;
        }

        const clientPlayersCount = peer.gameState.players.filter(p => p.peerId === peerId).length;
        const totalPlayersCount = peer.gameState.players.length;

        if (clientPlayersCount >= peer.gameState.settings.playerLimitPerPeer) {
            conn.send({
                type: MessageTypes.ADD_PLAYER_REJECTED,
                reason: `Local player limit reached. You can only create up to ${peer.gameState.settings.playerLimitPerPeer} players.`,
                player: newPlayerData
            });
            console.log(`Player addition rejected for peerId ${peerId} due to player limit.`);
            return;
        }

        if (totalPlayersCount >= peer.gameState.settings.playerLimit) {
            conn.send({
                type: MessageTypes.ADD_PLAYER_REJECTED,
                reason: `Total player limit reached. The game can only have up to ${peer.gameState.settings.playerLimit} players.`,
                player: newPlayerData
            });
            console.log(`Player addition rejected for peerId ${peerId} due to total player limit.`);
            return;
        }

        // Sanitize nickname before adding
        const nicknameValidation = InputValidator.validateNickname(newPlayerData.nickname);
        const newPlayer = peer.addPlayer(newPlayerData.peerId, nicknameValidation.sanitized);
        peer.broadcastGameState();
        console.log(`Player added successfully for peerId ${peerId}. Player ID: ${newPlayer.playerId}`);
    }

    /**
     * Handle player addition rejection (Client)
     */
    async handleAddPlayerRejected(message, context) {
        await ModalUtil.alert(message.reason);
    }

    /**
     * Handle player name change (Host)
     */
    handleNameChange(message, context) {
        const peer = this.getPeer();

        // Validate player ID
        if (!InputValidator.validatePlayerId(message.playerId)) {
            console.warn('Invalid player ID format in name change request');
            return;
        }

        // Validate and sanitize new name
        const nicknameValidation = InputValidator.validateNickname(message.newName);
        if (!nicknameValidation.isValid) {
            console.warn('Invalid nickname in name change request:', nicknameValidation.error);
            return;
        }

        const player = peer.gameState.players.find(p => p.playerId === message.playerId);
        if (player) {
            player.nickname = nicknameValidation.sanitized;
            peer.updateAndBroadcastGameState(peer.gameState);
        }
    }

    /**
     * Handle player color change (Host)
     */
    handleColorChange(message, context) {
        const peer = this.getPeer();

        // Validate player ID
        if (!InputValidator.validatePlayerId(message.playerId)) {
            console.warn('Invalid player ID format in color change request');
            return;
        }

        // Validate color format (hex color code)
        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
        if (!colorRegex.test(message.newColor)) {
            console.warn('Invalid color format in color change request:', message.newColor);
            return;
        }

        const player = peer.gameState.players.find(p => p.playerId === message.playerId);
        if (player) {
            const settings = peer.gameState?.settings;
            if (settings && settings.allowPlayerColorChange === false) {
                console.warn('Ignoring player color change - host disabled this option');
                return;
            }
            player.playerColor = message.newColor;
            peer.updateAndBroadcastGameState(peer.gameState);
        }
    }

    /**
     * Handle peer color change (Host)
     */
    handlePeerColorChange(message, context) {
        const peer = this.getPeer();

        // Validate player ID
        if (!InputValidator.validatePlayerId(message.playerId)) {
            console.warn('Invalid player ID format in peer color change request');
            return;
        }

        // Validate color format (hex color code)
        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
        if (!colorRegex.test(message.newPeerColor)) {
            console.warn('Invalid color format in peer color change request:', message.newPeerColor);
            return;
        }

        const player = peer.gameState.players.find(p => p.playerId === message.playerId);
        if (player) {
            const { peerId } = player;
            const settings = peer.gameState?.settings;
            if (settings && settings.allowPeerColorChange === false) {
                console.warn('Ignoring peer color change - host disabled this option');
                return;
            }
            peer.gameState.players.forEach(p => {
                if (p.peerId === peerId) {
                    p.peerColor = message.newPeerColor;
                }
            });
            peer.updateAndBroadcastGameState(peer.gameState);
        }
    }

    /**
     * Handle player removal (Host)
     */
    handleRemovePlayer(message, context) {
        const peer = this.getPeer();

        peer.removePlayer(message.playerId);
        peer.broadcastGameState();
    }
}
