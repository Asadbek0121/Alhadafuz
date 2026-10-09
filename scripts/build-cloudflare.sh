#!/bin/bash
set -e

echo "🔧 Patching dependencies..."
bash scripts/patch-opentelemetry.sh
bash scripts/patch-brace-expansion.sh

echo "🚀 Building for Cloudflare Workers..."
npx opennextjs-cloudflare build

echo "✅ Build complete! Worker saved to .open-next/worker.js"
