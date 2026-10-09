#!/bin/bash
set -e

echo "🔧 Step 1: Patching dependencies..."
bash scripts/patch-opentelemetry.sh
bash scripts/patch-brace-expansion.sh

echo "🚀 Step 2: Building for Cloudflare (without migrating)..."
# Use opennextjs-cloudflare build directly, not wrangler deploy
npx opennextjs-cloudflare build

echo "✅ Step 3: Deploying to Cloudflare..."
npx opennextjs-cloudflare deploy
