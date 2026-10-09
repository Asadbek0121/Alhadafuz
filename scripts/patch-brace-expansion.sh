#!/bin/bash
# Patch all brace-expansion packages to add named ESM exports.
# v2.x (CJS) has `module.exports = { expand }` which becomes a default export.
# v10.x minimatch does `import { expand } from 'brace-expansion'` (named import).
# This script adds named exports to every installed brace-expansion instance.

set -e
echo "🔧 Patching brace-expansion for ESM compatibility..."

found=0
find node_modules -name "package.json" -path "*/brace-expansion/package.json" 2>/dev/null | while read -r pkg; do
    dir=$(dirname "$pkg")
    # Only patch if it doesn't already have ESM exports (v2.x and below)
    if ! grep -q '"exports"' "$pkg" 2>/dev/null; then
        # It's a CJS package (v2.x). Check if it has an index.js with module.exports
        if [ -f "$dir/index.js" ]; then
            # Create ESM wrapper that re-exports both default and named
            cat > "$dir/index.mjs" << 'ESM'
// Auto-generated ESM wrapper for CJS brace-expansion
import _mod from './index.js';
export const { expand, balanced, concatMap } = _mod;
export default _mod;
ESM
            # Update package.json to add module field
            node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$pkg', 'utf8'));
if (!pkg.exports && !pkg.module) {
  pkg.module = './index.mjs';
  fs.writeFileSync('$pkg', JSON.stringify(pkg, null, 2) + '\n');
}
"
            echo "  Patched: $dir"
            found=$((found + 1))
        fi
    fi
done

echo "✅ brace-expansion patching complete"
