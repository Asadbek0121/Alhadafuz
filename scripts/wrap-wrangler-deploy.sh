#!/bin/bash
set -e

echo "🔧 Patching brace-expansion for ESM compatibility..."
bash scripts/patch-brace-expansion.sh

echo "🚀 Building for Cloudflare..."
npx opennextjs-cloudflare build

echo "📦 Deploying to Cloudflare Workers..."
npx opennextjs-cloudflare deploy
