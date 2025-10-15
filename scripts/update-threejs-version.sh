#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="${SCRIPT_DIR}/apply-threejs-version.mjs"

if [[ ! -f "${SCRIPT_PATH}" ]]; then
  echo "Unable to locate apply-threejs-version.mjs" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run this script. Please install Node 18+." >&2
  exit 1
fi

ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      ARGS+=("--tag" "$2")
      shift 2
      ;;
    --npm)
      ARGS+=("--npm" "$2")
      shift 2
      ;;
    --clear)
      ARGS+=("--clear")
      shift 1
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

node "${SCRIPT_PATH}" "${ARGS[@]}"
