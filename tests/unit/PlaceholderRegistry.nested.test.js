import PlaceholderRegistry from '../../src/js/infrastructure/registries/PlaceholderRegistry.js';

describe('PlaceholderRegistry nested placeholders', () => {
    test('handles nested placeholders with context', () => {
        const registry = new PlaceholderRegistry();

        registry.register('WORD', () => 'banana');
        registry.register('COLOR', (text, ctx) => `<span style="color:${ctx.color};">${text}</span>`);

        const context = { color: '#ff00ff' };
        const input = 'Say {{COLOR({{WORD}})}} now';

        const result = registry.replacePlaceholders(input, context);
        expect(result).toBe('Say <span style="color:#ff00ff;">banana</span> now');
    });

    test('stops at depth limit', () => {
        const registry = new PlaceholderRegistry();
        registry.register('LOOP', (text, ctx) => `{{LOOP}}`);

        const output = registry.replacePlaceholders('{{LOOP}}', {});
        // After hitting the limit, it should leave the unresolved placeholder intact
        expect(output.includes('{{LOOP}}')).toBe(true);
    });
});
