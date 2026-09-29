#!/bin/sh
# Launches the inspo MCP server, installing dependencies on first run
# (so the plugin works straight from a git checkout, no npm publish needed).
DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -d "$DIR/node_modules/@modelcontextprotocol/sdk" ] || [ ! -d "$DIR/node_modules/playwright" ]; then
  echo "inspo: installing dependencies (first run)…" >&2
  (cd "$DIR" && npm install --omit=dev --no-audit --no-fund --loglevel=error 1>&2) || exit 1
fi
exec node "$DIR/src/server.js" "$@"
