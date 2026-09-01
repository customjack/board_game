import BoardRenderConfig, { applyColorAlpha } from '../../src/js/rendering/BoardRenderConfig.js';
import BoardSchemaValidator from '../../src/js/infrastructure/utils/BoardSchemaValidator.js';

describe('BoardRenderConfig color alpha', () => {
    test('combines hex colors with per-space alpha values', () => {
        expect(applyColorAlpha('#336699', 0.5)).toBe('rgba(51, 102, 153, 0.5)');
        expect(applyColorAlpha('#f80', 0)).toBe('rgba(255, 136, 0, 0)');
    });

    test('uses independent fill and text alpha values', () => {
        const config = new BoardRenderConfig();
        const style = config.getSpaceStyle({
            size: 50,
            color: '#ff0000',
            colorAlpha: 0.25,
            textColor: '#ffffff',
            textColorAlpha: 0.75
        });

        expect(style.backgroundColor).toBe('rgba(255, 0, 0, 0.25)');
        expect(style.color).toBe('rgba(255, 255, 255, 0.75)');
    });

    test('preserves legacy colors when alpha is not specified', () => {
        expect(applyColorAlpha('rgba(10, 20, 30, 0.4)')).toBe('rgba(10, 20, 30, 0.4)');
    });

    test('validates alpha values as normalized numbers', () => {
        expect(BoardSchemaValidator.validateVisual({ colorAlpha: 0, textColorAlpha: 1 }, 'space')).toEqual([]);
        expect(BoardSchemaValidator.validateVisual({ colorAlpha: 1.2 }, 'space')).toContain(
            'space.visual.colorAlpha must be a number between 0 and 1'
        );
    });
});
