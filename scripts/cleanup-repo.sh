#!/usr/bin/env bash

set -euo pipefail

DRY_RUN=1
if [[ "${1:-}" == "--apply" ]]; then
  DRY_RUN=0
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Repository root: $ROOT_DIR"
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Mode: DRY-RUN (nothing will be deleted)"
else
  echo "Mode: APPLY (matched paths will be deleted)"
fi

DIR_NAMES=(
  "node_modules"
  "target"
  "build"
  "dist"
  ".venv"
  "__pycache__"
  "pycache"
  ".idea"
  ".vscode"
)

FILE_PATTERNS=(
  "*.zip"
  "*.pt"
  "*.mp4"
  "*.avi"
  "*.mkv"
  "*.log"
)

declare -a TARGETS=()

for dir_name in "${DIR_NAMES[@]}"; do
  while IFS= read -r -d '' match; do
    TARGETS+=("$match")
  done < <(find . -type d -name "$dir_name" -not -path "./.git/*" -print0)
done

for file_pattern in "${FILE_PATTERNS[@]}"; do
  while IFS= read -r -d '' match; do
    TARGETS+=("$match")
  done < <(find . -type f -iname "$file_pattern" -not -path "./.git/*" -print0)
done

if [[ ${#TARGETS[@]} -eq 0 ]]; then
  echo "No matches found."
  exit 0
fi

echo "Matched paths:"
for path in "${TARGETS[@]}"; do
  echo "  $path"
done

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry-run complete. Run with --apply to delete."
  exit 0
fi

for path in "${TARGETS[@]}"; do
  chmod u+w "$(dirname "$path")" 2>/dev/null || true
  chmod -R u+w "$path" 2>/dev/null || true
  rm -rf "$path"
done

echo "Cleanup complete."
