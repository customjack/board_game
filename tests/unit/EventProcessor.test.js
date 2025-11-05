import EventProcessor from '../../src/js/engines/components/EventProcessor.js';

describe('EventProcessor', () => {
  let gameState;
  let eventBus;
  let eventProcessor;

  beforeEach(() => {
    // Mock EventBus
    eventBus = {
      emit: jest.fn(),
    };

    // Mock GameState with events
    gameState = {
      board: {
        spaces: [
          {
            id: 'space1',
            name: 'Space 1',
            events: [
              {
                priority: { value: 100, name: 'HIGH' },
                getState: jest.fn(() => 'READY'),
                setState: jest.fn(),
                checkTrigger: jest.fn(() => true),
              },
              {
                priority: { value: 50, name: 'MID' },
                getState: jest.fn(() => 'READY'),
                setState: jest.fn(),
                checkTrigger: jest.fn(() => true),
              },
            ],
          },
          {
            id: 'space2',
            name: 'Space 2',
            events: [
              {
                priority: { value: 10, name: 'LOW' },
                getState: jest.fn(() => 'READY'),
                setState: jest.fn(),
                checkTrigger: jest.fn(() => false),
              },
            ],
          },
        ],
      },
      triggeredEvents: [],
      getTurnNumber: jest.fn(() => 1),
    };

    eventProcessor = new EventProcessor(gameState, eventBus);
  });

  describe('determineTriggeredEvents', () => {
    test('should find all triggered events', () => {
      const events = eventProcessor.determineTriggeredEvents('testPeer');

      expect(events).toHaveLength(2);
      expect(events[0].space.id).toBe('space1');
    });

    test('should sort events by priority (high to low)', () => {
      const events = eventProcessor.determineTriggeredEvents('testPeer');

      expect(events[0].event.priority.value).toBe(100); // HIGH first
      expect(events[1].event.priority.value).toBe(50);  // MID second
    });

    test('should exclude non-triggered events', () => {
      const events = eventProcessor.determineTriggeredEvents('testPeer');

      // LOW priority event should not be included (checkTrigger returns false)
      expect(events.every(e => e.event.priority.value !== 10)).toBe(true);
    });

    test('should update gameState.triggeredEvents', () => {
      eventProcessor.determineTriggeredEvents('testPeer');
      expect(gameState.triggeredEvents).toHaveLength(2);
    });
  });

  describe('sortEventsByPriority', () => {
    test('should sort by priority descending', () => {
      const events = [
        { event: { priority: { value: 10 } } },
        { event: { priority: { value: 100 } } },
        { event: { priority: { value: 50 } } },
      ];

      eventProcessor.sortEventsByPriority(events);

      expect(events[0].event.priority.value).toBe(100);
      expect(events[1].event.priority.value).toBe(50);
      expect(events[2].event.priority.value).toBe(10);
    });
  });

  describe('event processing queue', () => {
    test('startProcessing should initialize queue', () => {
      const events = [
        { event: {}, space: {} },
        { event: {}, space: {} },
      ];

      const result = eventProcessor.startProcessing(events);

      expect(result).toBe(true);
      expect(eventProcessor.isProcessing).toBe(true);
      expect(eventProcessor.hasEventsToProcess()).toBe(true);
    });

    test('should not start if already processing', () => {
      const events = [{ event: {}, space: {} }];

      eventProcessor.startProcessing(events);
      const result = eventProcessor.startProcessing(events);

      expect(result).toBe(false);
    });

    test('getNextEvent should return events in order', () => {
      const events = [
        { event: { id: 1 }, space: {} },
        { event: { id: 2 }, space: {} },
      ];

      eventProcessor.startProcessing(events);

      const first = eventProcessor.getNextEvent();
      expect(first.event.id).toBe(1);

      eventProcessor.advanceToNextEvent();

      const second = eventProcessor.getNextEvent();
      expect(second.event.id).toBe(2);
    });

    test('advanceToNextEvent should move queue forward', () => {
      const events = [
        { event: {}, space: {} },
        { event: {}, space: {} },
      ];

      eventProcessor.startProcessing(events);
      expect(eventProcessor.getRemainingEventCount()).toBe(2);

      eventProcessor.advanceToNextEvent();
      expect(eventProcessor.getRemainingEventCount()).toBe(1);

      eventProcessor.advanceToNextEvent();
      expect(eventProcessor.getRemainingEventCount()).toBe(0);
    });

    test('finishProcessing should reset state', () => {
      const events = [{ event: {}, space: {} }];

      eventProcessor.startProcessing(events);
      expect(eventProcessor.isProcessing).toBe(true);

      eventProcessor.finishProcessing();

      expect(eventProcessor.isProcessing).toBe(false);
      expect(eventProcessor.hasEventsToProcess()).toBe(false);
    });
  });

  describe('resetAllEvents', () => {
    test('should reset COMPLETED events to READY', () => {
      gameState.board.spaces[0].events[0].getState = jest.fn(() => 'COMPLETED_ACTION');

      eventProcessor.resetAllEvents();

      expect(gameState.board.spaces[0].events[0].setState).toHaveBeenCalledWith('READY');
    });

    test('should clear triggeredEvents array', () => {
      gameState.triggeredEvents = [1, 2, 3];

      eventProcessor.resetAllEvents();

      expect(gameState.triggeredEvents).toEqual([]);
    });
  });

  describe('getEventsByState', () => {
    test('should filter events by state', () => {
      gameState.board.spaces[0].events[0].getState = jest.fn(() => 'TRIGGERED');
      gameState.board.spaces[0].events[1].getState = jest.fn(() => 'READY');

      const triggered = eventProcessor.getEventsByState('TRIGGERED');

      expect(triggered).toHaveLength(1);
      expect(triggered[0].event.getState()).toBe('TRIGGERED');
    });
  });

  describe('getStats', () => {
    test('should return comprehensive statistics', () => {
      gameState.board.spaces[0].events[0].getState = jest.fn(() => 'TRIGGERED');
      gameState.board.spaces[0].events[1].getState = jest.fn(() => 'READY');
      gameState.triggeredEvents = [1, 2];

      const stats = eventProcessor.getStats();

      expect(stats.totalEvents).toBe(3);
      expect(stats.triggeredCount).toBe(2);
      expect(stats.eventsByState.TRIGGERED).toBe(1);
      expect(stats.eventsByState.READY).toBe(2);
    });
  });

  describe('event history tracking', () => {
    test('should record events when trackHistory is true', () => {
      const config = { trackHistory: true };
      eventProcessor = new EventProcessor(gameState, eventBus, config);

      const events = [{ event: {}, space: { id: 's1', name: 'Space' } }];
      eventProcessor.startProcessing(events);
      eventProcessor.advanceToNextEvent({ result: 'success' });

      const history = eventProcessor.getEventHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    test('should limit history to 100 entries', () => {
      const config = { trackHistory: true };
      eventProcessor = new EventProcessor(gameState, eventBus, config);

      // Add 150 events to history
      for (let i = 0; i < 150; i++) {
        eventProcessor.recordEventExecution(
          { event: {}, space: { id: 's1', name: 'Space' } },
          {}
        );
      }

      expect(eventProcessor.eventHistory.length).toBe(100);
    });
  });

  describe('progress tracking', () => {
    test('getProgress should return completion percentage', () => {
      const events = [
        { event: {}, space: {} },
        { event: {}, space: {} },
        { event: {}, space: {} },
      ];

      eventProcessor.startProcessing(events);
      expect(eventProcessor.getProgress()).toBe(0);

      eventProcessor.advanceToNextEvent();
      expect(eventProcessor.getProgress()).toBeCloseTo(0.33, 2);

      eventProcessor.advanceToNextEvent();
      expect(eventProcessor.getProgress()).toBeCloseTo(0.67, 2);

      eventProcessor.advanceToNextEvent();
      expect(eventProcessor.getProgress()).toBe(1);
    });
  });
});
