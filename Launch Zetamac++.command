#!/bin/bash
# ============================================================
#  Zetamac++ launcher
#  Double-click this file to open the trainer.
#
#  It serves the app at a fixed local URL (http://localhost:8765)
#  so your saved stats always live at the SAME origin — no matter
#  when or how often you launch it. Keep the Terminal window that
#  opens running while you play; close it (or press Ctrl-C) to stop.
# ============================================================

PORT=8765
URL="http://localhost:$PORT/index.html"

# Work from the folder this script lives in, so we serve the right files.
cd "$(dirname "$0")" || exit 1

# If the server is already running, just open the browser and quit.
if curl -sf -o /dev/null "$URL"; then
  open "$URL"
  exit 0
fi

# Pick a Python to serve with (macOS dev machines normally have python3).
if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "Python isn't installed, so I'll open the file directly instead."
  echo "Heads up: stats saved this way live in a separate bucket from the"
  echo "localhost version, so try to always launch the same way."
  open index.html
  exit 0
fi

echo "Zetamac++  ->  $URL"
echo "Keep this window open while you play. Close it (or press Ctrl-C) to stop."
echo

# Start a simple static file server in the background.
"$PY" -m http.server "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!

# Stop the server when this window/script exits.
trap 'kill "$SERVER_PID" 2>/dev/null' EXIT

# Give it a moment to come up, then open the app.
sleep 1
open "$URL"

# Stay alive so the server keeps serving until you close the window.
wait "$SERVER_PID"
