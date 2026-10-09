#!/bin/bash
# Preinstall script - runs BEFORE npm install in CI
# Patches all brace-expansion packages to support named ESM exports

echo "🔧 Preinstall: Patching brace-expansion for ESM compatibility..."

# Find and patch all brace-expansion packages that lack ESM exports
find node_modules -name "package.json" -path "*/brace-expansion/package.json" 2>/dev/null | while read -r pkg; do
    dir=$(dirname "$pkg")
    # Only patch CJS packages (v2.x and below) without exports field
    if ! grep -q '"exports"' "$pkg" 2>/dev/null && [ -f "$dir/index.js" ]; then
        # Create ESM wrapper
        cat > "$dir/index.mjs" << 'ESM'
// Auto-generated ESM wrapper for CJS brace-expansion
import _mod from './index.js';
export const { expand, balanced, concatMap } = _mod;
export default _mod;
ESM
        # Add module field to package.json
        node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$pkg', 'utf8'));
if (!pkg.exports && !pkg.module) {
  pkg.module = './index.mjs';
  fs.writeFileSync('$pkg', JSON.stringify(pkg, null, 2) + '\n');
}
"
        echo "  Patched: $dir"
    fi
done

echo "✅ Preinstall patching complete"
