import MapEditorController from '../../src/js/editor/MapEditorController.js';

describe('MapEditorController event payload persistence', () => {
    test('collects configured trigger and action payloads when saving an event', () => {
        const controller = new MapEditorController({});
        controller.selectedSpaceId = 'space-1';
        controller.currentEventIndex = 0;
        controller.stateManager.state = {
            topology: {
                spaces: [{
                    id: 'space-1',
                    triggers: [{
                        when: { type: 'TEST_TRIGGER' },
                        action: { type: 'TEST_ACTION' },
                        priority: 'MID'
                    }]
                }]
            }
        };
        controller.triggerMetadataByType = {
            TEST_TRIGGER: {
                payloadSchema: { type: 'object', properties: { count: { type: 'number' } } }
            }
        };
        controller.actionMetadataByType = {
            TEST_ACTION: {
                payloadSchema: { type: 'object', properties: { message: { type: 'string' } } }
            }
        };
        controller.elements = {
            eventTriggerType: Object.assign(document.createElement('input'), { value: 'TEST_TRIGGER' }),
            eventActionType: Object.assign(document.createElement('input'), { value: 'TEST_ACTION' }),
            eventPriority: Object.assign(document.createElement('input'), { value: 'HIGH' }),
            triggerPayloadForm: document.createElement('div'),
            actionPayloadForm: document.createElement('div')
        };
        controller.renderTriggerPayloadForm('TEST_TRIGGER', {});
        controller.renderActionPayloadForm('TEST_ACTION', {});
        controller.elements.triggerPayloadForm.querySelector('[data-field-input="true"]').value = '3';
        controller.elements.actionPayloadForm.querySelector('[data-field-input="true"]').value = 'Saved payload';
        controller.replaceSpace = jest.fn();
        controller.populateEventSelect = jest.fn();

        controller.applyEventEdits();

        const savedSpace = controller.replaceSpace.mock.calls[0][0];
        expect(savedSpace.triggers[0]).toMatchObject({
            when: { type: 'TEST_TRIGGER', payload: { count: 3 } },
            action: { type: 'TEST_ACTION', payload: { message: 'Saved payload' } },
            priority: 'HIGH'
        });
    });
});
