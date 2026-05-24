#!/usr/bin/env bash
set -euo pipefail

# Runtime secrets must be set in Fly.io beforehand (one-time setup):
#   fly secrets set REACT_APP_GOOGLE_API_KEY=<value> REACT_APP_SPORT80_API_TOKEN=<value>
fly deploy
