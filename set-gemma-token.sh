#!/usr/bin/env bash
#
# set-gemma-token.sh
#
# Fetches a fresh GCP access token via gcloud and writes it into the
# "vertex-gemma" provider's apiKey field inside opencode.json.
#
# Usage:
#   ./set-gemma-token.sh                # looks for ./opencode.json
#   ./set-gemma-token.sh /path/to/opencode.json
#
# Requirements: gcloud (authenticated), jq

set -euo pipefail

CONFIG_PATH="${1:-opencode.json}"
PROVIDER_KEY="vertex-gemma"

# --- sanity checks -----------------------------------------------------

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI not found. Install/auth gcloud first." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq not found. Install it first:" >&2
  echo "  macOS:   brew install jq" >&2
  echo "  Ubuntu:  sudo apt install jq" >&2
  exit 1
fi

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Error: config file not found at '$CONFIG_PATH'" >&2
  exit 1
fi

# --- fetch a fresh access token -----------------------------------------

echo "Fetching fresh access token from gcloud..."
ACCESS_TOKEN="$(gcloud auth print-access-token)"

if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "Error: got an empty access token. Are you logged in? Try:" >&2
  echo "  gcloud auth login" >&2
  echo "  gcloud auth application-default login" >&2
  exit 1
fi

# --- update the JSON safely (via jq, then atomic replace) --------------

TMP_FILE="$(mktemp)"

jq --arg token "$ACCESS_TOKEN" \
   --arg key "$PROVIDER_KEY" \
   '.provider[$key].apiKey = $token' \
   "$CONFIG_PATH" > "$TMP_FILE"

mv "$TMP_FILE" "$CONFIG_PATH"

echo "Updated '$PROVIDER_KEY.apiKey' in $CONFIG_PATH"
echo "Note: this token expires in ~1 hour. Re-run this script when it stops working."