#!/bin/bash
# Patch all brace-expansion packages to support both default and named ESM imports.
# v2.x (CJS) only has `module.exports = { expand }` which becomes a default export.
# v5.x (ESM) only has named exports like `export function expand()`.
# Some packages import as `import expand from 'brace-expansion'` (default),
# others as `import { expand } from 'brace-expansion'` (named).
# This script patches all instances to support both import styles.

set -e
echo "🔧 Patching brace-expansion for ESM compatibility..."

find node_modules -name "package.json" -path "*/brace-expansion/package.json" 2>/dev/null | while read -r pkg; do
    dir=$(dirname "$pkg")
    version=$(node -e "console.log(require('$pkg').version)" 2>/dev/null || echo "unknown")
    
    # Check if already patched
    if grep -q '"exports"' "$pkg" 2>/dev/null; then
        continue
    fi
    
    # It's a CJS or ESM package. Create/update wrapper files.
    
    # Create ESM wrapper that supports both default and named imports
    cat > "$dir/index.mjs" << 'ESM'
// Auto-generated ESM wrapper for brace-expansion
// Supports both default and named imports for compatibility
import _mod from './index.js';
export const { expand, balanced, concatMap } = _mod;
export default _mod;
ESM
    
    # Update package.json to add exports field
    node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$pkg', 'utf8'));
if (!pkg.exports) {
  pkg.exports = {
    '.': {
      import: './index.mjs',
      require: './index.js',
      default: './index.js'
    }
  };
  fs.writeFileSync('$pkg', JSON.stringify(pkg, null, 2) + '\n');
}
"
    echo "  Patched: $dir (v${version})"
done

echo "✅ brace-expansion patching complete"
