import {
    applyBoardSurfaceSize,
    calculateBoardSurfaceSize,
    createBoardBackground,
    createBoardDecoration,
    normalizeBackgroundConfig
} from '../../src/js/rendering/BoardVisualRenderer.js';

describe('BoardVisualRenderer', () => {
    beforeEach(() => {
        document.createElement.mockImplementation((tagName) =>
            document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
        );
    });

    test('defaults backgrounds to contain so the full image remains visible', () => {
        expect(normalizeBackgroundConfig({})).toEqual({
            fit: 'contain',
            scale: 100,
            positionX: 50,
            positionY: 50
        });

        const background = createBoardBackground('data:image/png;base64,test');
        const image = background.querySelector('img');
        expect(background.style.overflow).toBe('hidden');
        expect(image.style.objectFit).toBe('contain');
        expect(image.style.objectPosition).toBe('50% 50%');
        expect(image.style.transform).toBe('scale(1)');
    });

    test('applies background fit, scale, and position settings', () => {
        const background = createBoardBackground('image.png', {
            backgroundFit: 'cover',
            backgroundScale: 125,
            backgroundPositionX: 25,
            backgroundPositionY: 80
        });
        const image = background.querySelector('img');
        expect(image.style.objectFit).toBe('cover');
        expect(image.style.objectPosition).toBe('25% 80%');
        expect(image.style.transform).toBe('scale(1.25)');
        expect(image.style.transformOrigin).toBe('25% 80%');
    });

    test('positions decorations by their center without creating playable spaces', () => {
        const decoration = createBoardDecoration({
            id: 'art-1',
            name: 'Logo',
            image: 'logo.png',
            x: 200,
            y: 150,
            width: 120,
            height: 80,
            rotation: 15,
            opacity: 0.5
        }, 'data:image/png;base64,logo');

        expect(decoration.dataset.decorationId).toBe('art-1');
        expect(decoration.style.left).toBe('140px');
        expect(decoration.style.top).toBe('110px');
        expect(decoration.style.width).toBe('120px');
        expect(decoration.style.height).toBe('80px');
        expect(decoration.style.transform).toBe('rotate(15deg)');
        expect(decoration.style.opacity).toBe('0.5');
    });

    test('calculates stable viewport-independent board dimensions', () => {
        expect(calculateBoardSurfaceSize([
            { position: { x: 700, y: 500 }, visual: { size: 50 } }
        ], [])).toEqual({ width: 950, height: 750 });

        expect(calculateBoardSurfaceSize([
            { visualDetails: { x: 700, y: 500, size: 50 } }
        ], [])).toEqual({ width: 950, height: 750 });
    });

    test('locks both renderers to the same containing-block dimensions', () => {
        const surface = document.createElement('div');
        applyBoardSurfaceSize(surface, 800, 600);

        expect(surface.style.width).toBe('800px');
        expect(surface.style.minWidth).toBe('800px');
        expect(surface.style.maxWidth).toBe('800px');
        expect(surface.style.height).toBe('600px');
        expect(surface.style.minHeight).toBe('600px');
        expect(surface.style.maxHeight).toBe('600px');
        expect(surface.style.margin).toBe('0px');
        expect(surface.style.padding).toBe('0px');
    });
});
