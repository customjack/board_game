import BaseEffectScheduler from './BaseEffectScheduler.js';

/**
 * DefaultEffectScheduler - enact and cleanup player effects
 */
export default class DefaultEffectScheduler extends BaseEffectScheduler {
    enactAll(gameState, engine) {
        if (!gameState?.players) return;

        gameState.players.forEach(player => {
            // Remove effects marked for removal before enacting
            const initialEffectCount = player.effects.length;
            player.effects = player.effects.filter(effect => !effect.toRemove);
            const removedBeforeCount = initialEffectCount - player.effects.length;

            if (removedBeforeCount > 0) {
                console.log(`Removed ${removedBeforeCount} effects before enacting for player ${player.nickname}`);
            }

            // Enact remaining effects
            player.effects.forEach(effect => effect.enact(engine));

            // Remove effects marked for removal after enacting
            const effectCountAfterEnact = player.effects.length;
            player.effects = player.effects.filter(effect => !effect.toRemove);
            const removedAfterCount = effectCountAfterEnact - player.effects.length;

            if (removedAfterCount > 0) {
                console.log(`Removed ${removedAfterCount} effects after enacting for player ${player.nickname}`);
            }
        });
    }
}
