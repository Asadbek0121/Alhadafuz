#!/bin/bash
set -e

echo "🔧 Patching @opentelemetry/api for Cloudflare compatibility..."
bash scripts/patch-opentelemetry.sh

echo "🚀 Building for Cloudflare Workers..."
npx opennextjs-cloudflare build

echo "✅ Build complete! Worker saved to .open-next/worker.js"
