#!/bin/bash
set -e

echo "🔧 Patching brace-expansion for ESM compatibility..."
bash scripts/patch-brace-expansion.sh

echo "🚀 Deploying to Cloudflare Workers..."
exec npx wrangler deploy "$@"
