import MapEditorController from '../../src/js/editor/MapEditorController.js';
import ApplyEffectAction from '../../src/js/elements/actions/ApplyEffectAction.js';
import SkipTurnsEffect from '../../src/js/elements/effects/SkipTurnsEffect.js';
import RepeatTurnsEffect from '../../src/js/elements/effects/RepeatTurnsEffect.js';
import EffectFactory from '../../src/js/infrastructure/factories/EffectFactory.js';

describe('MapEditorController effect editor', () => {
    function makeController() {
        const effectFactory = new EffectFactory();
        effectFactory.register('SkipTurnsEffect', SkipTurnsEffect);
        effectFactory.register('RepeatTurnsEffect', RepeatTurnsEffect);

        const controller = new MapEditorController({
            factoryManager: {
                getFactory: (name) => name === 'EffectFactory' ? effectFactory : null
            }
        });
        controller.actionMetadataByType = {
            APPLY_EFFECT: ApplyEffectAction.getMetadata()
        };
        controller.elements = {
            actionPayloadForm: document.createElement('div')
        };
        return controller;
    }

    test('renders registered effects as a dropdown with their editable arguments', () => {
        const controller = makeController();

        controller.renderActionPayloadForm('APPLY_EFFECT', {});

        const select = controller.effectTypeSelect;
        expect(Array.from(select.options).map((option) => option.value)).toEqual([
            'RepeatTurnsEffect',
            'SkipTurnsEffect'
        ]);

        select.value = 'SkipTurnsEffect';
        select.dispatchEvent(new Event('change', { bubbles: false }));

        const turnsField = controller.effectPayloadContainer.querySelector('[data-field-key="turnsToSkip"]');
        const idField = controller.effectPayloadContainer.querySelector('[data-field-key="id"]');
        expect(turnsField.hidden).toBe(false);
        expect(idField.hidden).toBe(true);

        turnsField.querySelector('[data-field-input="true"]').value = '2';
        const payload = controller.collectEffectPayload();

        expect(payload.effect.type).toBe('SkipTurnsEffect');
        expect(payload.effect.args).toEqual(expect.arrayContaining([
            { turnsToSkip: 2 },
            { toRemove: false },
            { playerIdToSkip: null },
            { turnsSkipped: 0 }
        ]));
        expect(payload.effect.args[0].id).toMatch(/^SkipTurnsEffect_/);
    });

    test('loads saved effect arguments back into the generated fields', () => {
        const controller = makeController();

        controller.renderActionPayloadForm('APPLY_EFFECT', {
            effect: {
                type: 'SkipTurnsEffect',
                args: [
                    { id: 'saved_skip' },
                    { turnsToSkip: 3 },
                    { toRemove: false },
                    { playerIdToSkip: null },
                    { turnsSkipped: 0 }
                ]
            }
        });

        const turnsInput = controller.effectPayloadContainer
            .querySelector('[data-field-key="turnsToSkip"] [data-field-input="true"]');
        expect(turnsInput.value).toBe('3');
        expect(controller.collectEffectPayload().effect.args[0]).toEqual({ id: 'saved_skip' });
    });
});
