import BaseGameState from '../../src/js/game/state/BaseGameState.js';
import { GameEventState } from '../../src/js/elements/models/GameEvent.js';

describe('BaseGameState resetEvents', () => {
    let gameState;
    let mockEvents;

    beforeEach(() => {
        // Create mock events with different states
        mockEvents = [
            { id: 1, state: GameEventState.READY },
            { id: 2, state: GameEventState.CHECKING_TRIGGER },
            { id: 3, state: GameEventState.TRIGGERED },
            { id: 4, state: GameEventState.PROCESSING_ACTION },
            { id: 5, state: GameEventState.COMPLETED_ACTION },
            { id: 6, state: GameEventState.INACTIVE }
        ];

        // Mock board with spaces
        const mockBoard = {
            spaces: [
                { id: 'space1', events: [mockEvents[0], mockEvents[1]] },
                { id: 'space2', events: [mockEvents[2], mockEvents[3]] },
                { id: 'space3', events: [mockEvents[4], mockEvents[5]] }
            ]
        };

        gameState = new BaseGameState({ board: mockBoard, factoryManager: {} });
    });

    test('should reset all non-INACTIVE events to READY', () => {
        gameState.resetEvents();

        // READY stays READY
        expect(mockEvents[0].state).toBe(GameEventState.READY);
        
        // CHECKING_TRIGGER, TRIGGERED, PROCESSING_ACTION, COMPLETED_ACTION all become READY
        expect(mockEvents[1].state).toBe(GameEventState.READY);
        expect(mockEvents[2].state).toBe(GameEventState.READY);
        expect(mockEvents[3].state).toBe(GameEventState.READY);
        expect(mockEvents[4].state).toBe(GameEventState.READY);

        // INACTIVE stays INACTIVE
        expect(mockEvents[5].state).toBe(GameEventState.INACTIVE);
    });
});
