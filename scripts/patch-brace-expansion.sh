#!/bin/bash
# Patch all brace-expansion packages to support both default and named ESM imports.
# Some packages use `import expand from 'brace-expansion'` (default)
# Others use `import { expand } from 'brace-expansion'` (named)
# This script patches ALL installed brace-expansion instances.

set -e
echo "🔧 Patching brace-expansion for ESM compatibility..."

count=0
find node_modules -name "package.json" -path "*/brace-expansion/package.json" 2>/dev/null | while read -r pkg; do
    dir=$(dirname "$pkg")
    
    # Check if already patched
    if grep -q '"exports"' "$pkg" 2>/dev/null; then
        continue
    fi
    
    # It's a CJS package (v2.x or below). Create ESM wrapper.
    cat > "$dir/index.mjs" << 'ESM'
// Auto-generated ESM wrapper for CJS brace-expansion
import _mod from './index.js';
export const { expand, balanced } = _mod;
export default _mod;
ESM
    
    # Add exports field to package.json
    node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$pkg', 'utf8'));
pkg.exports = {
  '.': {
    import: './index.mjs',
    require: './index.js',
    default: './index.js'
  }
};
fs.writeFileSync('$pkg', JSON.stringify(pkg, null, 2) + '\n');
"
    echo "  Patched: $dir"
    count=$((count + 1))
done

# Also patch root brace-expansion v5.x to add default export
if [ -f "node_modules/brace-expansion/dist/esm/index.js" ]; then
    # Remove any existing bad patch first
    sed -i '' '/^export default { expand };$/d' node_modules/brace-expansion/dist/esm/index.js 2>/dev/null || true
    # Check if default export already exists
    if ! grep -q "export default { expand }" "node_modules/brace-expansion/dist/esm/index.js"; then
        # Add default export at the end with proper newline
        echo "" >> node_modules/brace-expansion/dist/esm/index.js
        echo 'export default { expand };' >> node_modules/brace-expansion/dist/esm/index.js
        echo "  Patched: node_modules/brace-expansion (v5.x)"
        count=$((count + 1))
    fi
fi

echo "✅ brace-expansion patching complete ($count packages)"
