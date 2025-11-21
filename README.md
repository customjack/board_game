# Drinking Board Game 🎲

Lightweight, web-based party board game. The GitHub Pages build ships with the `demo_drinking_board` so everyone hits the same board by default, but you can still upload your own JSON map in the UI.

## Play Now
[Start a game](https://customjack.github.io/drinking_board_game/)

## Host Locally
```bash
npm install
npm run dev:full   # starts local PeerJS server + webpack dev server at http://localhost:9000
```
Prefer a quick build instead? `npm run build` (dist/) or `npm run build:gh-pages` (docs/).

## Map Notes
- Default map: `demo_drinking_board.json` (bundled in assets).
- Upload your own map via the UI; custom maps are validated before loading.
- Placeholders: supports nested placeholders like `{{RANDOM_COLOR({{RANDOM_WORD}})}}`.

## Contributing
Fork, branch, open a PR—issues and feature ideas welcome.

## License
[MIT](LICENSE)
