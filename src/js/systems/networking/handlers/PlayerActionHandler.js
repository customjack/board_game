import MessageHandlerPlugin from './MessageHandlerPlugin.js';
import { MessageTypes } from '../protocol/MessageTypes.js';

export default class PlayerActionHandler extends MessageHandlerPlugin {
    register() {
        this.registerHandler(
            MessageTypes.PLAYER_ACTION,
            this.handlePlayerAction,
            { description: 'Handle player action forwarded from clients (host only)' }
        );
    }

    handlePlayerAction(message, context) {
        const peer = this.getPeer();
        if (!peer?.isHost) {
            return;
        }

        const { playerId, actionType, actionData = {} } = message;
        if (!playerId || !actionType) {
            console.warn('Invalid player action payload:', message);
            return;
        }

        const player = peer.gameState?.getPlayerByPlayerId?.(playerId);
        if (!player) {
            console.warn(`Player ${playerId} not found for action ${actionType}`);
            return;
        }

        // Ensure the connection owns the player
        if (player.peerId && context.connection?.peer !== player.peerId) {
            console.warn(`Peer ${context.connection?.peer} attempted to control player ${playerId}`);
            return;
        }

        const engine = peer.eventHandler?.gameEngine;
        if (!engine || typeof engine.onPlayerAction !== 'function') {
            console.warn('Game engine cannot process player actions at this time.');
            return;
        }

        engine.onPlayerAction(playerId, actionType, actionData);
    }
}
