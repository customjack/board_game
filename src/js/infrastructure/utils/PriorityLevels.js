// enums/PriorityLevels.js

const PriorityLevels = Object.freeze({
    VERY_LOW: { name: 'VERY_LOW', value: 1 },
    LOW: { name: 'LOW', value: 2 },
    MID: { name: 'MID', value: 3 },
    HIGH: { name: 'HIGH', value: 4 },
    VERY_HIGH: { name: 'VERY_HIGH', value: 5 },
    CRITICAL: { name: 'CRITICAL', value: 6 },
});

// Create a lookup map for quick access
const PriorityLevelMap = Object.freeze(
    Object.entries(PriorityLevels).reduce((map, [key, level]) => {
        map[level.name] = level.value;
        return map;
    }, {})
);

export { PriorityLevels, PriorityLevelMap };
