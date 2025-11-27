/**
 * PluginReadinessHandler - Handles plugin readiness status messages
 * 
 * When clients check their plugins, they send readiness status to the host.
 * The host updates the game state with this information.
 */
import MessageHandlerPlugin from './MessageHandlerPlugin.js';
import { MessageTypes } from '../protocol/MessageTypes.js';

export default class PluginReadinessHandler extends MessageHandlerPlugin {
    register() {
        this.registerHandler(
            MessageTypes.PLUGIN_READINESS,
            this.handlePluginReadiness,
            { description: 'Handle plugin readiness status from clients (host only)' }
        );
        
        this.registerHandler(
            MessageTypes.REQUEST_PLUGIN_READINESS,
            this.handleRequestPluginReadiness,
            { description: 'Handle plugin readiness request from host (client only)' }
        );
    }

    /**
     * Handle plugin readiness message from client (Host)
     * @param {Object} message - Message object
     * @param {Object} context - Context with connection info
     */
    handlePluginReadiness(message, context) {
        const peer = this.getPeer();
        const conn = context.connection;
        
        if (!peer || !conn) {
            console.error('[PluginReadinessHandler] Missing peer or connection');
            return;
        }
        
        // Only host should handle this
        if (!peer.isHost) {
            console.warn('[PluginReadinessHandler] Client received plugin readiness message, ignoring');
            return;
        }
        
        const { ready, missingPlugins } = message;
        const peerId = conn.peer;
        
        // Update game state with plugin readiness
        if (peer.gameState) {
            peer.gameState.setPluginReadiness(peerId, ready, missingPlugins || []);
            
            // Broadcast updated game state so all clients see readiness status
            peer.broadcastGameState();
            
            // Force update to ensure UI components see the change
            // Use setTimeout to ensure gameState is fully updated before UI update
            setTimeout(() => {
                peer.eventHandler.updateGameState(true); // Force update
            }, 0);
            
            console.log(`[PluginReadinessHandler] Updated plugin readiness for peer ${peerId}: ready=${ready}, missing=${missingPlugins?.length || 0}`);
        }
    }
    
    /**
     * Handle plugin readiness request from host (Client)
     * @param {Object} message - Message object
     * @param {Object} context - Context with connection info
     */
    handleRequestPluginReadiness(message, context) {
        const peer = this.getPeer();
        
        if (!peer) {
            console.error('[PluginReadinessHandler] Missing peer');
            return;
        }
        
        // Only client should handle this
        if (peer.isHost) {
            console.warn('[PluginReadinessHandler] Host received plugin readiness request, ignoring');
            return;
        }
        
        // Check plugins and send readiness status
        if (peer.eventHandler && peer.eventHandler.checkAndLoadPlugins && peer.gameState) {
            console.log('[PluginReadinessHandler] Host requested plugin readiness, checking...');
            // This will check plugins and send readiness via sendPluginReadiness
            peer.eventHandler.checkAndLoadPlugins(peer.gameState);
        } else {
            // No plugins required or no map selected
            if (peer.eventHandler && peer.eventHandler.sendPluginReadiness) {
                const requiredPlugins = peer.gameState?.pluginRequirements || [];
                if (requiredPlugins.length === 0) {
                    peer.eventHandler.sendPluginReadiness(true, []);
                }
            }
        }
    }
}

