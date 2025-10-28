# Example Board JSON Files

This directory contains example board JSON files that demonstrate various features of the board game system.

## Available Examples

### 1. Simple Linear Board (`simple-linear-board.json`)
**Difficulty:** Beginner
**Features:**
- 5 spaces in a straight line
- Basic events (PROMPT, MODIFY_STAT, SET_STATE)
- Simple one-way connections
- Good starting point for learning the schema

**Use Case:** Perfect for understanding the basics of board creation.

### 2. Branching Paths Adventure (`branching-paths-board.json`)
**Difficulty:** Intermediate
**Features:**
- Multiple paths with player choices
- 7 spaces with branching structure
- Three different paths (Dark Forest, Sunny Meadow, Mountain Pass)
- Custom render configuration (blue theme)
- All paths converge at the end

**Use Case:** Learn how to create boards with player choices and multiple paths.

### 3. Speed Challenge (`custom-engine-config-board.json`)
**Difficulty:** Advanced
**Features:**
- Custom game engine configuration
- Maximum turn limit (15 turns)
- Custom UI settings (faster modals)
- Custom render configuration (red/danger theme)
- Demonstrates all configuration options

**Use Case:** Learn how to customize the game engine behavior for different game modes.

## How to Use These Examples

### Loading in Game

1. Start the game as host
2. Click "Upload Board"
3. Select one of the example JSON files
4. The board will be loaded and displayed

### Modifying Examples

1. Copy one of the example files
2. Edit the JSON in your favorite text editor
3. Modify spaces, events, or configuration
4. Load your modified version in the game

### Creating Your Own

Use these examples as templates:
- Start with `simple-linear-board.json` for basic boards
- Use `branching-paths-board.json` for more complex layouts
- Reference `custom-engine-config-board.json` for advanced customization

## Quick Reference

### Adding a Space

```json
{
  "id": "mySpace",
  "name": "My Space",
  "visualDetails": {
    "x": 100,
    "y": 200,
    "size": 50,
    "color": "#3498db"
  },
  "connections": [
    { "targetId": "nextSpace", "bidirectional": false }
  ],
  "events": []
}
```

### Adding an Event

```json
{
  "trigger": {
    "type": "ON_LAND",
    "data": {}
  },
  "action": {
    "type": "PROMPT",
    "payload": {
      "message": "Your message here"
    }
  },
  "priority": "MID"
}
```

### Common Action Types

- `PROMPT`: Show a message
- `MODIFY_STAT`: Change player stats (e.g., drinks)
- `MOVE`: Teleport to another space
- `SET_STATE`: Change player state (e.g., complete game)
- `ADD_EFFECT`: Add temporary effects

### Priority Levels

- `LOW`: Minor events, flavor text
- `MID`: Standard events (default)
- `HIGH`: Important gameplay events
- `CRITICAL`: Game-ending events, critical state changes

## Tips for Board Design

1. **Start Simple:** Begin with a linear path, then add branches
2. **Test Frequently:** Load your board often to check positioning
3. **Use Consistent Spacing:** Keep spaces at least 60-80 pixels apart
4. **Balance Difficulty:** Mix easy and challenging spaces
5. **Clear Finish:** Always have a clear end condition
6. **Descriptive Names:** Use short, clear space names
7. **Theme Consistency:** Pick a color scheme and stick to it

## Validation

Before uploading a board, you can validate it using the BoardSchemaValidator:

```javascript
import BoardSchemaValidator from './src/js/utils/BoardSchemaValidator.js';

const result = BoardSchemaValidator.validate(yourBoardJSON);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## Further Reading

- See [BOARD_SCHEMA.md](../../../../docs/BOARD_SCHEMA.md) for complete schema documentation
- See [GAME_ENGINE_ARCHITECTURE.md](../../../../docs/GAME_ENGINE_ARCHITECTURE.md) for engine details

## Contributing Examples

Have a great board design? Consider contributing it:

1. Ensure it follows the schema
2. Test it thoroughly
3. Add it to this directory with a descriptive name
4. Update this README with details about your board

## Troubleshooting

**Board doesn't load:**
- Check JSON syntax (use a JSON validator)
- Ensure all required fields are present
- Verify all `targetId` references exist

**Spaces overlap:**
- Adjust `x` and `y` coordinates
- Increase spacing between spaces

**Events don't trigger:**
- Check trigger type spelling
- Verify event priority
- Ensure action payload is correct

**Colors don't work:**
- Use hex format: `#RRGGBB`
- Check CSS color name spelling
- Ensure alpha values are in range 0-1
