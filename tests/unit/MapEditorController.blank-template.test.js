import MapEditorController from '../../src/js/editor/MapEditorController.js';

describe('MapEditorController default template', () => {
    test('starts with a blank map instead of exposing a bundled debug map', async () => {
        const controller = new MapEditorController({});
        controller.setState = jest.fn();

        await controller.loadDefaultTemplate();

        const state = controller.setState.mock.calls[0][0];
        expect(state.metadata.name).toBe('Untitled Map');
        expect(state.topology.spaces).toEqual([]);
        expect(state.preview).toBeNull();
        expect(state.background).toBeNull();
        expect(controller.selectedSpaceId).toBeNull();
    });
});
