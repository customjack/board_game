#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_PAGES_DIR="$(cd "$PROJECT_DIR/.." && pwd)/board_game_pages"
PAGES_DIR="${1:-${BOARD_GAME_PAGES_DIR:-$DEFAULT_PAGES_DIR}}"
DOCS_DIR="$PAGES_DIR/docs"

if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
    echo "Could not find the board-game project at: $PROJECT_DIR" >&2
    exit 1
fi

if [[ ! -d "$PAGES_DIR/.git" ]]; then
    echo "Could not find the Pages checkout at: $PAGES_DIR" >&2
    echo "Pass its path as the first argument or set BOARD_GAME_PAGES_DIR." >&2
    exit 1
fi

PAGES_BRANCH="$(git -C "$PAGES_DIR" branch --show-current)"
if [[ "$PAGES_BRANCH" != "gh-pages" ]]; then
    echo "The Pages checkout must be on gh-pages; currently on: $PAGES_BRANCH" >&2
    exit 1
fi

echo "Building the game from $PROJECT_DIR using .env.example"
npm --prefix "$PROJECT_DIR" run build:example

echo "Synchronizing dist/ to $DOCS_DIR"
mkdir -p "$DOCS_DIR"
rsync -a --delete "$PROJECT_DIR/dist/" "$DOCS_DIR/"

echo
echo "Pages files updated successfully. Review with:"
echo "  git -C \"$PAGES_DIR\" status --short"
echo "  git -C \"$PAGES_DIR\" diff --stat"
