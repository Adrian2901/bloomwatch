#!/usr/bin/env bash
# Super-simple script: install, build, and start the frontend
set -euo pipefail

# Use the frontend folder if present
if [ -d "bloomwatch-frontend" ]; then
  cd bloomwatch-frontend
fi

if [ ! -f package.json ]; then
  echo "Error: package.json not found in $(pwd)" >&2
  exit 2
fi

# Default port (can be overridden by setting PORT in the environment)
export PORT="${PORT:-4000}"

echo "Running: npm install"
npm install

echo "Running: npm run build"
npm run build

echo "Running: npm run start"
npm run start

