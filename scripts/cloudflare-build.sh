#!/bin/bash
set -e

echo "🔧 Patching dependencies for Cloudflare compatibility..."
bash scripts/patch-opentelemetry.sh
bash scripts/patch-brace-expansion.sh

echo "🚀 Building for Cloudflare Workers..."
npx opennextjs-cloudflare build

echo "✅ Build complete! Deploying to Cloudflare..."
# Use opennextjs-cloudflare deploy which doesn't run wrangler migrate
npx opennextjs-cloudflare deploy
