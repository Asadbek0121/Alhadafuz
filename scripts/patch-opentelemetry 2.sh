#!/bin/bash
# Patch @opentelemetry/api package.json to remove ESM reference
# This fixes the "module not found" error during opennextjs build
if [ -f "node_modules/@opentelemetry/api/package.json" ]; then
    # Back up original
    cp node_modules/@opentelemetry/api/package.json node_modules/@opentelemetry/api/package.json.bak
    
    # Remove module field from exports
    node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('node_modules/@opentelemetry/api/package.json', 'utf8'));
if (pkg.exports && pkg.exports['.'] && pkg.exports['.'].module) {
    delete pkg.exports['.'].module;
}
if (pkg.exports && pkg.exports['./experimental'] && pkg.exports['./experimental'].module) {
    delete pkg.exports['./experimental'].module;
}
fs.writeFileSync('node_modules/@opentelemetry/api/package.json', JSON.stringify(pkg, null, 2));
console.log('Patched @opentelemetry/api package.json');
"
fi
