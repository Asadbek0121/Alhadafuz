#!/bin/bash
set -e

echo "🔧 Patching dependencies..."
bash scripts/patch-opentelemetry.sh
bash scripts/patch-brace-expansion.sh

echo "🚀 Building for Cloudflare..."
npx opennextjs-cloudflare build

echo "📤 Deploying to Cloudflare..."
npx opennextjs-cloudflare deploy
