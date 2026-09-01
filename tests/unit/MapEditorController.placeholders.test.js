import MapEditorController from '../../src/js/editor/MapEditorController.js';

describe('MapEditorController placeholder picker', () => {
    test('keeps the selected placeholder without triggering payload autosave', () => {
        const controller = new MapEditorController({});
        controller.placeholderMetadata = {
            RANDOM_CATEGORY: {
                type: 'RANDOM_CATEGORY',
                displayName: 'Random Category',
                description: 'Insert a category for a round-robin naming challenge.',
                template: '{{RANDOM_CATEGORY}}'
            },
            RANDOM_FAMOUS_PERSON: {
                type: 'RANDOM_FAMOUS_PERSON',
                displayName: 'Random Famous Person',
                description: 'Insert one random famous person.',
                template: '{{RANDOM_FAMOUS_PERSON}}'
            }
        };

        const payloadForm = document.createElement('div');
        const autosave = jest.fn();
        payloadForm.addEventListener('change', autosave);

        controller.renderSchemaForm(payloadForm, {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    description: 'The message to display.',
                    ui: { placeholders: true }
                }
            }
        }, {});

        const select = payloadForm.querySelector('.map-editor-placeholder-select');
        select.value = 'RANDOM_FAMOUS_PERSON';
        select.dispatchEvent(new Event('change', { bubbles: true }));

        expect(select.value).toBe('RANDOM_FAMOUS_PERSON');
        expect(autosave).not.toHaveBeenCalled();
        expect(payloadForm.textContent).not.toContain('Insert one random famous person.');
        expect(payloadForm.textContent).not.toContain('The message to display.');
    });

    test('inserts the currently selected placeholder', () => {
        const controller = new MapEditorController({});
        controller.placeholderMetadata = {
            RANDOM_CATEGORY: {
                type: 'RANDOM_CATEGORY',
                displayName: 'Random Category',
                template: '{{RANDOM_CATEGORY}}'
            },
            RANDOM_FAMOUS_PERSON: {
                type: 'RANDOM_FAMOUS_PERSON',
                displayName: 'Random Famous Person',
                template: '{{RANDOM_FAMOUS_PERSON}}'
            }
        };

        const input = document.createElement('textarea');
        const wrapper = controller.wrapInputWithPlaceholders(input, {
            type: 'string',
            ui: { placeholders: true }
        });
        document.body.appendChild(wrapper);

        const select = wrapper.querySelector('.map-editor-placeholder-select');
        select.value = 'RANDOM_FAMOUS_PERSON';
        wrapper.querySelector('button').click();

        expect(input.value).toBe('{{RANDOM_FAMOUS_PERSON}}');
    });
});
