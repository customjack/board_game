import MapEditorRenderer from '../../src/js/editor/MapEditorRenderer.js';

describe('MapEditorRenderer connection selection mode', () => {
    let renderer;

    beforeEach(() => {
        document.createElement.mockImplementation((tagName) =>
            document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
        );
        renderer = new MapEditorRenderer();
        renderer.renderConfig = {
            connectionColor: '#333333',
            arrowColor: '#333333',
            connectionThickness: 2,
            arrowSize: 10,
            arrowPositionSingle: 0.5,
            arrowPositionBidirectional: 0.55
        };
    });

    test('trims a raised connection hitbox away from space centers', () => {
        const connection = renderer.createConnectionElement(0, 0, 100, 0, {
            fromId: 'a',
            toId: 'b',
            fromSize: 50,
            toSize: 50,
            interactiveOnTop: true
        });
        const hitbox = connection.querySelector('.map-editor-connection-hitbox');

        expect(hitbox.style.left).toBe('17.5px');
        expect(hitbox.style.width).toBe('65px');
    });

    test('keeps the full hitbox outside drawing mode', () => {
        const connection = renderer.createConnectionElement(0, 0, 100, 0, {
            fromId: 'a',
            toId: 'b'
        });
        const hitbox = connection.querySelector('.map-editor-connection-hitbox');

        expect(hitbox.style.left).toBe('0px');
        expect(hitbox.style.width).toBe('100px');
    });
});
