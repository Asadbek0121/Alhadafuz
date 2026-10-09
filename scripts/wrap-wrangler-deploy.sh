#!/bin/bash
set -e

echo "🔧 Patching brace-expansion for ESM compatibility..."
bash scripts/patch-brace-expansion.sh

echo "🚀 Running wrangler deploy..."
npx wrangler deploy "$@"
