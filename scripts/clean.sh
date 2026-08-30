#!/bin/bash
# Hadaf Market — tozalash skripti
# .next keshi buzilganda, ESLint osilganda yoki tsc xatolarida ishga tushiriladi.
# npm run clean

set -e

echo "🧹 Hadaf Market — tozalash..."

# 1. Next.js build kesh
if [ -d ".next" ]; then
    rm -rf .next
    echo "   ✅ .next o'chirildi"
fi

# 2. ESLint cache
if [ -f ".eslintcache" ]; then
    rm -f .eslintcache
    echo "   ✅ .eslintcache o'chirildi"
fi

# 3. TypeScript build info
find . -name "*.tsbuildinfo" -delete 2>/dev/null
echo "   ✅ tsbuildinfo fayllar o'chirildi"

# 4. Node 22 tekshiruvi
NODE_VER=$(node -v 2>/dev/null | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VER" != "22" ]; then
    echo "   ⚠️ Node versiyasi: $(node -v) — Node 22 tavsiya qilinadi (nvm use 22)"
fi

echo "✅ Tozalash tugadi. Endi 'npm run dev' yoki 'npm run build' qilishingiz mumkin."