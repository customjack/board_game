/**
 * GameStartValidator - Determines whether the host can start the game.
 *
 * Checks:
 * - Plugin readiness (all players have required plugins)
 * - Player count within map requirements (min/max)
 *
 * Returns structured results so UI can render detailed blockers or warnings.
 */
export default class GameStartValidator {
    constructor(gameState) {
        this.gameState = gameState;
    }

    validate() {
        const pluginCheck = this.checkPluginReadiness();
        const playerCountCheck = this.checkPlayerCount();

        const blockers = [];
        const warnings = [];

        if (!pluginCheck.valid) {
            blockers.push(this.formatPluginBlocker(pluginCheck));
        }

        if (!playerCountCheck.valid) {
            blockers.push(this.formatPlayerCountBlocker(playerCountCheck));
        } else if (playerCountCheck.status === 'warning') {
            warnings.push(...playerCountCheck.messages);
        }

        return {
            canStart: blockers.length === 0,
            blockers,
            warnings,
            details: {
                pluginCheck,
                playerCountCheck
            }
        };
    }

    checkPluginReadiness() {
        const result = {
            valid: true,
            missing: []
        };

        const players = this.gameState?.players || [];
        if (!players.length) {
            return result;
        }

        for (const player of players) {
            const readiness = this.gameState.getPluginReadiness(player.peerId);
            const notReady = !readiness || !readiness.ready;
            if (notReady) {
                result.valid = false;
                result.missing.push({
                    playerId: player.playerId,
                    peerId: player.peerId,
                    nickname: player.nickname,
                    missingPlugins: readiness?.missingPlugins || []
                });
            }
        }

        return result;
    }

    checkPlayerCount() {
        const gameRules = this.gameState?.board?.gameRules;
        const playerCount = this.gameState?.players?.length || 0;

        if (!gameRules || typeof gameRules.validatePlayerCount !== 'function') {
            return {
                valid: true,
                status: 'valid',
                messages: []
            };
        }

        return gameRules.validatePlayerCount(playerCount);
    }

    formatPluginBlocker(pluginCheck) {
        if (pluginCheck.missing.length === 0) {
            return 'Plugin readiness unknown for connected players.';
        }

        const lines = pluginCheck.missing.map((player) => {
            if (player.missingPlugins.length > 0) {
                return `• ${player.nickname}: missing ${player.missingPlugins.join(', ')}`;
            }
            return `• ${player.nickname}: still loading required game data`;
        });

        return `Plugins not ready:\n${lines.join('\n')}`;
    }

    formatPlayerCountBlocker(playerCountCheck) {
        if (playerCountCheck?.messages?.length) {
            return playerCountCheck.messages.join('\n');
        }
        return 'Player count does not meet map requirements.';
    }
}
