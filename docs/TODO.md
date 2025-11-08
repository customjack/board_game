# TODO - Features to Implement

## BUG:
  - Displace Player failing sometimes (after multiple applications?); Issue seems to occur when the same event (other than prompts(?)) are triggered in the same game.

## Remaining moves dislayed on UI
- Need a "game info bar" above the board

## Log of what happened displayed on UI
- Need a "game log" to the right of the board
- Gamelog would have to be a new serializable class attached to the gamestate
- much like player list, board, etc it would need it's own update logic.


## Force Stop at Space
- **Thwamp**: Make the player stop their turn at a specific space (circle) and do an action.  
  - Action type: `FORCE_STOP`

## Move Player Backward
- **Haunter**: Ability to choose another player and move them backward by X spaces.  
  - Action type: `MOVE_PLAYER_BACK` or `MOVE_PLAYER_FORWARD`
  - **Consideration**: Need a way to select the target player (prompt or UI selection)

## Other Actions
- **Swap Places**: Swap positions of two players on the board.  
  - Action type: `SWAP_PLACES`

- **Change Direction**: A curse that makes the player go backwards along the board until the curse is lifted.  
  - Action type: `CHANGE_DIRECTION`
  - **Consideration**: Need a way to lift the curse

- **Mini Game**: Add a mini-game feature that challenges all players (e.g., reaction time test, clicking challenge).  
  - Action type: `MINI_GAME`
  - **Consideration**: Whoever wins, the loser drinks.

- **Teleport**: Ability to teleport a player to a specific space ID.  
  - Action type: `TELEPORT`
  - **Consideration**: Specify destination ID

- **Double Turn**: The player gets an additional immediate turn.  
  - Action type: `DOUBLE_TURN`
  - **Consideration**: Better to just make it so they get to roll again, a double turn would mess with turn history and the turns taken tracking. Makes dynamically joining a in progress game much more confusing to have players have indepdent number of turns. Alternatively, more logic could be added to track the total number of turns for the game, and players could have an independent number of turns. 

- **Set Stat**

- **Incriment Stat**

- **Randomize positions**


## Effects
- **Skip Turn**:
- **Dice Roll changes**
- **Stat modifiers**
- **Reverse direction**
- **Random movement (cannot choose direction)**
- **Lay traps**



## End conditions
- Add ability to specify end conditions in the board json file (ex. all players in COMPLETED_GAME state, all but one player in ELIMINATED state, a custom option that acts as a placeholder for plugins to put in their own end conditions)

## Robust handling of stats and stat displays
