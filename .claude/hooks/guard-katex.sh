#!/bin/bash
# Block any Write/Edit that introduces forbidden formula-to-text imports
# Only checks source code files (.ts, .tsx, .js, .jsx), not docs, config, or scripts
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

if [ -z "$FILE" ]; then
  exit 0
fi

# Only guard source code files
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

# Block recreating the deleted formatter file
case "$FILE" in
  *formatFormula*) 
    echo "BLOCKED: That formula formatter is DELETED and must never be recreated." >&2
    echo "All formula rendering MUST use InlineMath or BlockMath from react-katex." >&2
    exit 2 ;;
esac

# Block adding imports of the deleted formatter in any source file
if echo "$CONTENT" | grep -qiF "formatformulapreview"; then
  echo "BLOCKED: Cannot import or reference the deleted formula formatter." >&2
  echo "Use InlineMath or BlockMath from react-katex instead." >&2
  exit 2
fi

# Block plain-text formula converters (common patterns that strip LaTeX)
if echo "$CONTENT" | grep -qE '\.replace\(.*\\\\frac|\.replace\(.*\\\\partial|\.replace\(.*\\\\nabla'; then
  echo "BLOCKED: Do not strip LaTeX commands from formula strings." >&2
  echo "Formulas are immutable LaTeX -- render with react-katex, never convert to text." >&2
  exit 2
fi

exit 0
