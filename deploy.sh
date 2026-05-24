#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env.local ]; then
  echo "Error: .env.local not found. Create it with REACT_APP_SPORT80_API_TOKEN and REACT_APP_GOOGLE_API_KEY set."
  exit 1
fi

source .env.local

if [ -z "${REACT_APP_SPORT80_API_TOKEN:-}" ] || [ -z "${REACT_APP_GOOGLE_API_KEY:-}" ]; then
  echo "Error: REACT_APP_SPORT80_API_TOKEN and REACT_APP_GOOGLE_API_KEY must be set in .env.local"
  exit 1
fi

fly deploy \
  --build-secret REACT_APP_SPORT80_API_TOKEN="$REACT_APP_SPORT80_API_TOKEN" \
  --build-secret REACT_APP_GOOGLE_API_KEY="$REACT_APP_GOOGLE_API_KEY"
