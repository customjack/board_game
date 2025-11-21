import BaseGameEngine from '../../core/base/BaseGameEngine.js';
import { TurnFlowMixin } from './abstractions/TurnFlowMixin.js';
import { EventProcessingMixin } from './abstractions/EventProcessingMixin.js';
import { PromptRenderingMixin } from './abstractions/PromptRenderingMixin.js';

/**
 * AbstractTurnEngine - composable base for turn-based engines.
 * Concrete engines should extend this and implement movement/phase specifics.
 */
export default class AbstractTurnEngine extends PromptRenderingMixin(EventProcessingMixin(TurnFlowMixin(BaseGameEngine))) {
    constructor(dependencies, config = {}) {
        super(dependencies, config);
    }
}
