#!/usr/bin/env bash
set -e

source "$(dirname "$0")/node-check.sh" || exit 1

echo "Building project..."
npm run build

echo ""
echo "Running integration tests..."
npx tsx test/integration/run-integration.ts "$@"
