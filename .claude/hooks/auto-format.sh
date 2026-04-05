#!/bin/bash
# Auto-format files after Claude edits them
# NOTE: Does NOT run organize-imports — that was re-adding deleted imports
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE" ]; then
  exit 0
fi

PROJECT_ROOT="/Users/s_avelova/Documents/projects/formulas"

# Format TypeScript/JavaScript/CSS with Prettier (if available)
# --no-plugin flag prevents organize-imports from re-adding deleted imports
if [[ "$FILE" =~ \.(ts|tsx|js|jsx|css|json)$ ]]; then
  if command -v npx &>/dev/null && [ -f "$PROJECT_ROOT/frontend/node_modules/.bin/prettier" ]; then
    npx --prefix "$PROJECT_ROOT/frontend" prettier --write --no-plugin-search "$FILE" 2>/dev/null
  fi
fi

# Format Python with black (if available)
if [[ "$FILE" =~ \.py$ ]]; then
  if command -v black &>/dev/null; then
    black --quiet "$FILE" 2>/dev/null
  fi
fi

exit 0
