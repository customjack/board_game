import BaseMovementPolicy from './BaseMovementPolicy.js';

/**
 * DiceMovementPolicy - standard dice rolling with optional dev override
 */
export default class DiceMovementPolicy extends BaseMovementPolicy {
    rollForPlayer(player) {
        if (!player) {
            throw new Error('Cannot roll dice without a player');
        }

        let rollResult = null;

        // Dev helper: allow manual rolls when enabled via env flag
        const manualRollEnabled =
            (typeof DEV_CHOOSE_ROLL !== 'undefined' && DEV_CHOOSE_ROLL === true) ||
            (typeof process !== 'undefined' && process?.env?.DEV_CHOOSE_ROLL === 'true') ||
            (typeof window !== 'undefined' && window.DEV_CHOOSE_ROLL === true) ||
            (typeof localStorage !== 'undefined' && localStorage.getItem('DEV_CHOOSE_ROLL') === 'true');

        if (manualRollEnabled) {
            console.debug('[DEV] Manual roll enabled');
            const input = window.prompt('Enter roll (1-6) or leave blank for random:', '');
            const parsed = parseInt(input, 10);
            if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 6) {
                rollResult = parsed;
                console.log(`[DEV] Manual roll selected: ${rollResult}`);
            }
        }

        if (rollResult === null) {
            rollResult = player.rollDice();
        }

        return rollResult;
    }
}
