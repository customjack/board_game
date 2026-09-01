import PlaceholderRegistry from '../../src/js/infrastructure/registries/PlaceholderRegistry.js';
import { registerBuiltInPlaceholders } from '../../src/js/elements/placeholders/BuiltInPlaceholders.js';
import famousPeople from '../../src/assets/random_samples/random_famous_people.json';
import categories from '../../src/assets/random_samples/random_categories.json';
import thisOrThatOptions from '../../src/assets/random_samples/random_this_or_that.json';

function makeContext(randomValues) {
    const getNextRandomNumber = jest.fn();
    randomValues.forEach((value) => getNextRandomNumber.mockReturnValueOnce(value));
    return {
        gameState: {
            randomGenerator: { getNextRandomNumber }
        }
    };
}

describe('random sample placeholders', () => {
    let registry;

    beforeEach(() => {
        registry = new PlaceholderRegistry();
        registerBuiltInPlaceholders(registry);
    });

    test('rolls every famous-person occurrence independently', () => {
        const context = makeContext([0, 0.25, 0.75]);
        const result = registry.replacePlaceholders(
            '{{RANDOM_FAMOUS_PERSON}} / {{RANDOM_FAMOUS_PERSON}} / {{RANDOM_FAMOUS_PERSON}}',
            context
        );

        expect(result).toBe([
            famousPeople[0],
            famousPeople[Math.floor(famousPeople.length * 0.25)],
            famousPeople[Math.floor(famousPeople.length * 0.75)]
        ].join(' / '));
        expect(context.gameState.randomGenerator.getNextRandomNumber).toHaveBeenCalledTimes(3);
    });

    test('returns values from the this-or-that and category datasets', () => {
        const context = makeContext([0.5, 0.5]);
        const thisOrThat = registry.replacePlaceholders('{{RANDOM_THIS_OR_THAT}}', context);
        const category = registry.replacePlaceholders('{{RANDOM_CATEGORY}}', context);

        expect(thisOrThatOptions).toContain(thisOrThat);
        expect(categories).toContain(category);
    });

    test('exposes all new placeholders to editor metadata', () => {
        const metadata = registry.getAllMetadata();

        expect(metadata.RANDOM_THIS_OR_THAT.template).toBe('{{RANDOM_THIS_OR_THAT}}');
        expect(metadata.RANDOM_FAMOUS_PERSON.template).toBe('{{RANDOM_FAMOUS_PERSON}}');
        expect(metadata.RANDOM_CATEGORY.template).toBe('{{RANDOM_CATEGORY}}');
        expect(metadata.RANDOM_NUMBER.template).toBe('{{RANDOM_NUMBER(1, 6)}}');
        expect(metadata.CURRENT_PLAYER_NAME.template).toBe('{{CURRENT_PLAYER_NAME}}');
    });

    test('resolves the permanently registered current-player placeholder', () => {
        const context = makeContext([]);
        context.gameState.getCurrentPlayer = () => ({ nickname: 'Jack' });

        expect(
            registry.replacePlaceholders('{{CURRENT_PLAYER_NAME}} takes a drink.', context)
        ).toBe('Jack takes a drink.');
    });

    test('gives plugin-style function registrations fallback picker metadata', () => {
        registry.register('PLUGIN_PLACEHOLDER', () => 'Plugin value');

        expect(registry.getAllMetadata().PLUGIN_PLACEHOLDER).toMatchObject({
            type: 'PLUGIN_PLACEHOLDER',
            displayName: 'Plugin Placeholder',
            template: '{{PLUGIN_PLACEHOLDER}}'
        });
    });
});
