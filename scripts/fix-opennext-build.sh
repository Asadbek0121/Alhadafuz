#!/bin/bash
# Fix @opentelemetry/api ESM exports in open-next build
if [ -d ".open-next/middleware/node_modules/@opentelemetry/api" ]; then
    mkdir -p .open-next/middleware/node_modules/@opentelemetry/api/build/esm
    cp -r node_modules/@opentelemetry/api/build/src/* .open-next/middleware/node_modules/@opentelemetry/api/build/esm/ 2>/dev/null || true
    echo "Fixed @opentelemetry/api ESM exports"
fi
