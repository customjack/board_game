/**
 * UI Element Bindings Configuration
 *
 * Single source of truth for all UI element IDs and their configurations.
 * This eliminates hardcoded element IDs scattered throughout the codebase.
 */

/**
 * Host UI Bindings
 */
export const HOST_UI_BINDINGS = {
    // Button elements
    buttons: {
        startHost: 'startHostButton',
        copyInvite: 'copyInviteCodeButton',
        closeGame: 'closeGameButton',
        startGame: 'startGameButton',
        addPlayer: 'addPlayerButton',
        uploadPlugin: 'uploadPluginButton'
    },

    // Input elements with validation
    inputs: {
        playerLimitPerPeer: {
            elementId: 'playerLimitPerPeerHost',
            type: 'number',
            events: ['change', 'blur'],
            validator: (value) => {
                const num = parseInt(value);
                return !isNaN(num) && num >= 1 && num <= 10;
            },
            sanitizer: (value) => Math.max(1, Math.min(10, parseInt(value) || 1))
        },
        totalPlayerLimit: {
            elementId: 'totalPlayerLimitHost',
            type: 'number',
            events: ['change', 'blur'],
            validator: (value) => {
                const num = parseInt(value);
                return !isNaN(num) && num >= 1 && num <= 100;
            },
            sanitizer: (value) => Math.max(1, Math.min(100, parseInt(value) || 1))
        },
        turnTimer: {
            elementId: 'turnTimerHost',
            type: 'number',
            events: ['change', 'blur'],
            validator: (value) => {
                const num = parseInt(value);
                return !isNaN(num) && num >= 0;
            },
            sanitizer: (value) => Math.max(0, parseInt(value) || 0)
        },
        moveDelay: {
            elementId: 'moveDelayHost',
            type: 'number',
            events: ['change', 'blur'],
            validator: (value) => {
                const num = parseInt(value);
                return !isNaN(num) && num >= 0;
            },
            sanitizer: (value) => Math.max(0, parseInt(value) || 0)
        },
        modalTimeout: {
            elementId: 'modalTimeoutHost',
            type: 'number',
            events: ['change', 'blur'],
            validator: (value) => {
                const num = parseInt(value);
                return !isNaN(num) && num >= 0 && num <= 300;
            },
            sanitizer: (value) => Math.max(0, Math.min(300, parseInt(value) || 0))
        },
        turnTimerEnabled: {
            elementId: 'turnTimerEnabledHost',
            type: 'checkbox',
            events: ['change']
        },
        pluginFileInput: {
            elementId: 'pluginFileInput',
            type: 'file',
            events: ['change']
        }
    },

    // Display/container elements
    containers: {
        inviteCode: 'inviteCode',
        lobbyPlayerList: 'lobbyPlayerList',
        gamePlayerList: 'gamePlayerList',
        settingsSection: 'settingsSectionHost'
    },

    // Pages
    pages: {
        home: 'homePage',
        lobby: 'lobbyPage',
        game: 'gamePage'
    }
};

/**
 * Client UI Bindings
 */
export const CLIENT_UI_BINDINGS = {
    // Button elements
    buttons: {
        joinGame: 'joinGameButton',
        leaveGame: 'leaveGameButton',
        addPlayer: 'addPlayerButton'
    },

    // Input elements
    inputs: {
        inviteCode: {
            elementId: 'inviteCodeInput',
            type: 'text',
            events: ['input']
        },
        playerName: {
            elementId: 'playerNameInput',
            type: 'text',
            events: ['input']
        }
    },

    // Display/container elements
    containers: {
        inviteCode: 'inviteCode',
        lobbyPlayerList: 'lobbyPlayerList',
        gamePlayerList: 'gamePlayerList',
        settingsSection: 'settingsSectionClient'
    },

    // Pages
    pages: {
        home: 'homePage',
        lobby: 'lobbyPage',
        game: 'gamePage'
    }
};

/**
 * Common UI Bindings (shared between host and client)
 */
export const COMMON_UI_BINDINGS = {
    buttons: {
        openGameLog: 'openGameLogButton'
    },

    containers: {
        gameLog: 'gameLogContainer'
    }
};

/**
 * Get bindings for a specific role
 */
export function getBindingsForRole(isHost) {
    return isHost ? HOST_UI_BINDINGS : CLIENT_UI_BINDINGS;
}

/**
 * Get all element IDs from bindings (for validation)
 */
export function getAllElementIds(bindings) {
    const ids = [];

    // Extract from buttons
    if (bindings.buttons) {
        Object.values(bindings.buttons).forEach(id => ids.push(id));
    }

    // Extract from inputs
    if (bindings.inputs) {
        Object.values(bindings.inputs).forEach(config => {
            if (typeof config === 'string') {
                ids.push(config);
            } else if (config.elementId) {
                ids.push(config.elementId);
            }
        });
    }

    // Extract from containers
    if (bindings.containers) {
        Object.values(bindings.containers).forEach(id => ids.push(id));
    }

    // Extract from pages
    if (bindings.pages) {
        Object.values(bindings.pages).forEach(id => ids.push(id));
    }

    return ids;
}
