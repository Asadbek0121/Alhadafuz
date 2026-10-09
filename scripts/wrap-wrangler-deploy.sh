#!/bin/bash
set -e

echo "🔧 Patching brace-expansion for ESM compatibility..."
bash scripts/patch-brace-expansion.sh

echo "🚀 Deploying to Cloudflare Workers..."
# Use opennextjs-cloudflare deploy directly to avoid wrangler auto-migration
npx opennextjs-cloudflare deploy
