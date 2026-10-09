#!/bin/bash
set -e

echo "🔧 Patching brace-expansion for ESM compatibility..."
bash scripts/patch-brace-expansion.sh

echo "🚀 Deploying to Cloudflare Workers..."
# Use opennextjs-cloudflare deploy to avoid wrangler's auto-migration
# which triggers npm install and removes our patches
npx opennextjs-cloudflare deploy
