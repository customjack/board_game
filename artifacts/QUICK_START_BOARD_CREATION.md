# Quick Start: Creating Your First Board Game

This guide will walk you through creating your first custom board game in 15 minutes.

## What You'll Create

A simple 3-space board game where:
1. Players start at a village
2. They travel through a forest (take a drink)
3. They reach the castle (win the game)

## Step 1: Create the JSON File

Create a new file called `my-first-board.json`:

```json
{
  "metadata": {
    "name": "My First Board Game",
    "author": "Your Name",
    "description": "A simple board game I created"
  },
  "spaces": []
}
```

## Step 2: Add the Start Space

Add the first space to the `spaces` array:

```json
{
  "metadata": {
    "name": "My First Board Game",
    "author": "Your Name",
    "description": "A simple board game I created"
  },
  "spaces": [
    {
      "id": "village",
      "name": "Village",
      "visualDetails": {
        "x": 100,
        "y": 300,
        "size": 50,
        "color": "#95a5a6"
      },
      "connections": [],
      "events": [
        {
          "trigger": {
            "type": "ON_LAND",
            "data": {}
          },
          "action": {
            "type": "PROMPT",
            "payload": {
              "message": "Welcome to the village! Your adventure begins here."
            }
          },
          "priority": "MID"
        }
      ]
    }
  ]
}
```

**What this does:**
- Creates a gray space at position (100, 300)
- Shows a welcome message when players land on it
- Named "Village" with ID "village"

## Step 3: Add the Forest Space

Add a second space:

```json
{
  "id": "forest",
  "name": "Forest",
  "visualDetails": {
    "x": 300,
    "y": 300,
    "size": 50,
    "color": "#27ae60"
  },
  "connections": [],
  "events": [
    {
      "trigger": {
        "type": "ON_LAND",
        "data": {}
      },
      "action": {
        "type": "PROMPT",
        "payload": {
          "message": "You're in the forest. Watch out for wild animals!"
        }
      },
      "priority": "MID"
    },
    {
      "trigger": {
        "type": "ON_LAND",
        "data": {}
      },
      "action": {
        "type": "MODIFY_STAT",
        "payload": {
          "statName": "drinks",
          "delta": 1
        }
      },
      "priority": "HIGH"
    }
  ]
}
```

**What this does:**
- Creates a green space 200 pixels to the right
- Shows a message about the forest
- Makes the player take 1 drink

## Step 4: Add the Castle (Finish) Space

Add the final space:

```json
{
  "id": "castle",
  "name": "Castle",
  "visualDetails": {
    "x": 500,
    "y": 300,
    "size": 50,
    "color": "#e74c3c"
  },
  "connections": [],
  "events": [
    {
      "trigger": {
        "type": "ON_LAND",
        "data": {}
      },
      "action": {
        "type": "PROMPT",
        "payload": {
          "message": "You've reached the castle! You win!"
        }
      },
      "priority": "CRITICAL"
    },
    {
      "trigger": {
        "type": "ON_LAND",
        "data": {}
      },
      "action": {
        "type": "SET_STATE",
        "payload": {
          "state": "COMPLETED_GAME"
        }
      },
      "priority": "CRITICAL"
    }
  ]
}
```

**What this does:**
- Creates a red space at the end
- Shows a victory message
- Marks the player as having completed the game

## Step 5: Connect the Spaces

Now update the `connections` in each space:

**Village:**
```json
"connections": [
  {
    "targetId": "forest",
    "bidirectional": false
  }
]
```

**Forest:**
```json
"connections": [
  {
    "targetId": "castle",
    "bidirectional": false
  }
]
```

**Castle:**
```json
"connections": []
```

## Complete File

Here's your complete `my-first-board.json`:

```json
{
  "metadata": {
    "name": "My First Board Game",
    "author": "Your Name",
    "description": "A simple board game I created"
  },
  "spaces": [
    {
      "id": "village",
      "name": "Village",
      "visualDetails": {
        "x": 100,
        "y": 300,
        "size": 50,
        "color": "#95a5a6"
      },
      "connections": [
        {
          "targetId": "forest",
          "bidirectional": false
        }
      ],
      "events": [
        {
          "trigger": {
            "type": "ON_LAND",
            "data": {}
          },
          "action": {
            "type": "PROMPT",
            "payload": {
              "message": "Welcome to the village! Your adventure begins here."
            }
          },
          "priority": "MID"
        }
      ]
    },
    {
      "id": "forest",
      "name": "Forest",
      "visualDetails": {
        "x": 300,
        "y": 300,
        "size": 50,
        "color": "#27ae60"
      },
      "connections": [
        {
          "targetId": "castle",
          "bidirectional": false
        }
      ],
      "events": [
        {
          "trigger": {
            "type": "ON_LAND",
            "data": {}
          },
          "action": {
            "type": "PROMPT",
            "payload": {
              "message": "You're in the forest. Watch out for wild animals!"
            }
          },
          "priority": "MID"
        },
        {
          "trigger": {
            "type": "ON_LAND",
            "data": {}
          },
          "action": {
            "type": "MODIFY_STAT",
            "payload": {
              "statName": "drinks",
              "delta": 1
            }
          },
          "priority": "HIGH"
        }
      ]
    },
    {
      "id": "castle",
      "name": "Castle",
      "visualDetails": {
        "x": 500,
        "y": 300,
        "size": 50,
        "color": "#e74c3c"
      },
      "connections": [],
      "events": [
        {
          "trigger": {
            "type": "ON_LAND",
            "data": {}
          },
          "action": {
            "type": "PROMPT",
            "payload": {
              "message": "You've reached the castle! You win!"
            }
          },
          "priority": "CRITICAL"
        },
        {
          "trigger": {
            "type": "ON_LAND",
            "data": {}
          },
          "action": {
            "type": "SET_STATE",
            "payload": {
              "state": "COMPLETED_GAME"
            }
          },
          "priority": "CRITICAL"
        }
      ]
    }
  ]
}
```

## Step 6: Load Your Board

1. Open the game
2. Click "Host Game"
3. Enter your name and start
4. Click "Upload Board"
5. Select your `my-first-board.json` file
6. Your board will load!

## Step 7: Play Test

1. Add a player or two
2. Start the game
3. Roll the dice
4. Watch players move through your board
5. Note any issues or improvements

## What's Next?

### Add More Spaces
Add more spaces between village and castle:
- Tavern (take 2 drinks)
- Marketplace (skip ahead)
- Dark cave (go back)

### Add Branching Paths
Give players choices:
```json
"connections": [
  { "targetId": "leftPath", "bidirectional": false },
  { "targetId": "rightPath", "bidirectional": false }
]
```

### Add Custom Colors
Make your board themed:
```json
"metadata": {
  "renderConfig": {
    "connectionColor": "#3498db",
    "arrowColor": "#3498db"
  }
}
```

### Add More Event Types
Try different actions:
- `MOVE`: Teleport to another space
- `CHOICE`: Give players options
- `ADD_EFFECT`: Add temporary effects

## Common Mistakes

### 1. Missing Connections
**Problem:** Spaces aren't connected
```json
"connections": []  ❌
```

**Fix:** Add connections
```json
"connections": [
  { "targetId": "nextSpace", "bidirectional": false }
]  ✓
```

### 2. Wrong targetId
**Problem:** References non-existent space
```json
{ "targetId": "spce1" }  ❌ (typo)
```

**Fix:** Match exact space ID
```json
{ "targetId": "space1" }  ✓
```

### 3. Overlapping Spaces
**Problem:** Spaces on top of each other
```json
{ "x": 100, "y": 100 }
{ "x": 100, "y": 100 }  ❌
```

**Fix:** Space them out (60+ pixels)
```json
{ "x": 100, "y": 100 }
{ "x": 200, "y": 100 }  ✓
```

### 4. No Finish Condition
**Problem:** Game never ends

**Fix:** Add SET_STATE to last space
```json
{
  "action": {
    "type": "SET_STATE",
    "payload": {
      "state": "COMPLETED_GAME"
    }
  }
}
```

## Tips

1. **Start Simple**: 3-5 spaces is enough for your first board
2. **Test Often**: Load and play test frequently
3. **Use Colors**: Make spaces visually distinct
4. **Clear Names**: Short names fit better
5. **Balance Difficulty**: Mix easy and hard spaces
6. **Plan Layout**: Sketch on paper first
7. **Copy Examples**: Use provided examples as templates
8. **Read Docs**: Check BOARD_SCHEMA.md for all options

## Resources

- **Complete Schema**: [BOARD_SCHEMA.md](./BOARD_SCHEMA.md)
- **Examples**: [src/assets/maps/examples/](../src/assets/maps/examples/)
- **Architecture**: [GAME_ENGINE_ARCHITECTURE.md](./GAME_ENGINE_ARCHITECTURE.md)
- **Validator**: Use BoardSchemaValidator to check your JSON

## Need Help?

### Validation Errors
If you get validation errors:
1. Check the error message (tells you exactly what's wrong)
2. Look at the line number
3. Compare with example boards
4. Check for typos in field names

### Board Won't Load
1. Validate JSON syntax (use jsonlint.com)
2. Check all `targetId` values exist
3. Ensure all required fields present
4. Look at browser console for errors

### Visual Issues
1. Adjust `x` and `y` coordinates
2. Change `size` if spaces too big/small
3. Pick contrasting `color` values
4. Add `borderWidth` for visibility

## Congratulations!

You've created your first board game! 🎉

Now try:
- Adding more spaces
- Creating branching paths
- Experimenting with different events
- Sharing your board with others

Remember: The only limit is your creativity!
