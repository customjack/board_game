/**
 * PluginStateHandler - Handles plugin state synchronization messages
 *
 * Responsibilities:
 * - Handle plugin state updates from host (client only)
 * - Apply plugin states to local PluginManager
 * - Refresh plugin UI when states change
 */

import MessageHandlerPlugin from './MessageHandlerPlugin.js';
import { MessageTypes } from '../protocol/MessageTypes.js';

export default class PluginStateHandler extends MessageHandlerPlugin {
    register() {
        this.registerHandler(
            MessageTypes.PLUGIN_STATE_UPDATE,
            this.handlePluginStateUpdate,
            { description: 'Handle plugin state update from host (client only)' }
        );
    }

    /**
     * Handle plugin state update (Client)
     */
    handlePluginStateUpdate(message, context) {
        const peer = this.getPeer();
        const pluginStates = message.pluginStates;

        console.log('[Client] Received plugin state update:', pluginStates);

        // Apply plugin states to local PluginManager
        if (peer.eventHandler && peer.eventHandler.pluginManager) {
            peer.eventHandler.pluginManager.applyPluginStates(pluginStates);

            // Emit event to refresh any open plugin UI
            if (peer.eventHandler.eventBus) {
                peer.eventHandler.eventBus.emit('pluginStatesReceived', { pluginStates });
            }
        }
    }
}
