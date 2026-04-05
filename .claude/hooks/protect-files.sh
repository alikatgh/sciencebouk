#!/bin/bash
# Prevent Claude from editing sensitive or generated files
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE" ]; then
  exit 0
fi

# Block editing lock files, env files, and generated output
PROTECTED_PATTERNS=(
  "\.env$"
  "\.env\.local$"
  "\.env\.production$"
  "package-lock\.json$"
  "node_modules/"
  "\.venv/"
  "__pycache__/"
  "frontend/dist/"
  "db\.sqlite3$"
  "staticfiles/"
)

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE" =~ $pattern ]]; then
    echo "BLOCKED: Cannot edit protected file: $FILE" >&2
    echo "This file is auto-generated or contains secrets." >&2
    exit 2
  fi
done

exit 0
