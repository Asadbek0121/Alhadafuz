#!/bin/bash
set -e

echo "🔧 Step 1: Patching brace-expansion for ESM compatibility..."
bash scripts/patch-brace-expansion.sh

echo "🚀 Step 2: Deploying to Cloudflare..."
npx wrangler deploy "$@"
