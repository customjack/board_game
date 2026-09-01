import SpaceRenderer from '../../src/js/rendering/SpaceRenderer.js';

describe('SpaceRenderer shape dimensions', () => {
    test('global div margins cannot shorten the internal shape layer', () => {
        document.createElement.mockImplementation((tagName) =>
            document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
        );
        const config = {
            getSpaceStyle: () => ({
                width: '60px',
                height: '60px',
                zIndex: '2',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0',
                backgroundColor: '#123456',
                color: '#ffffff',
                showLabel: true
            })
        };
        const space = {
            id: 'square-1',
            name: 'Square',
            visualDetails: {
                x: 100,
                y: 100,
                size: 60,
                shape: 'square',
                color: '#123456'
            }
        };
        const container = document.createElement('div');

        const element = new SpaceRenderer(config).render(space, container);
        const background = element.querySelector('.board-space-background');
        const highlight = element.querySelector('.board-space-highlight');
        const label = element.querySelector('.board-space-label');

        expect(element.style.width).toBe('60px');
        expect(element.style.height).toBe('60px');
        expect(background.style.inset).toBe('0');
        expect(background.style.margin).toBe('0px');
        expect(highlight.style.margin).toBe('0px');
        expect(label.style.margin).toBe('0px');
    });

    test('copies the space shape onto a separate highlight overlay', () => {
        document.createElement.mockImplementation((tagName) =>
            document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
        );
        const hexagon = 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)';
        const config = {
            getSpaceStyle: () => ({
                width: '60px',
                height: '60px',
                zIndex: '2',
                borderRadius: '0',
                clipPath: hexagon,
                backgroundColor: '#123456',
                color: '#ffffff',
                showLabel: false
            })
        };
        const container = document.createElement('div');
        const element = new SpaceRenderer(config).render({
            id: 'hex-1',
            name: 'Hexagon',
            visualDetails: { x: 100, y: 100, size: 60, shape: 'hexagon' }
        }, container);

        expect(element.querySelector('.board-space-highlight').style.clipPath).toBe(hexagon);
        expect(element.style.transform).toBe('');
    });
});
